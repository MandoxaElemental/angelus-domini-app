import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { supabase, safeRefreshSession } from "../lib/supabaseClient";

const LOCAL_SESSIONS_KEY = "angelus_local_prayer_sessions_v1";

export type LocalPrayerSession = {
  sessionId: string;
  userId: string;
  slot: string;
  prayerTypeId: number;
  scheduledTime: string;
  createdAt: string;
  completed: boolean;
  completedAt: string | null;
  synced: boolean;
};

type LocalSessionsMap = Record<string, LocalPrayerSession>;

function localKey(userId: string, slot: string) {
  return `${userId}_${slot}`;
}

async function readLocalSessions(): Promise<LocalSessionsMap> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_SESSIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function writeLocalSessions(map: LocalSessionsMap): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(map));
  } catch (err) {
    console.error("[offlineSync] failed to persist local sessions:", err);
  }
}

export async function getLocalSession(
  userId: string,
  slot: string,
): Promise<LocalPrayerSession | null> {
  const map = await readLocalSessions();
  return map[localKey(userId, slot)] ?? null;
}

export async function getLocalSessionBySessionId(
  sessionId: string,
): Promise<LocalPrayerSession | null> {
  const map = await readLocalSessions();
  return Object.values(map).find((s) => s.sessionId === sessionId) ?? null;
}

export async function saveLocalSession(session: LocalPrayerSession): Promise<void> {
  const map = await readLocalSessions();
  map[localKey(session.userId, session.slot)] = session;
  await writeLocalSessions(map);
}

export async function isOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return !!state.isConnected && state.isInternetReachable !== false;
  } catch {
    return true;
  }
}

export async function getLocalCompletedSlotsForUser(
  userId: string,
  prayerDayPrefix: string,
): Promise<Record<string, boolean>> {
  const map = await readLocalSessions();
  const result: Record<string, boolean> = {};
  Object.values(map).forEach((s) => {
    if (s.userId === userId && s.slot.startsWith(prayerDayPrefix) && s.completed) {
      result[s.slot] = true;
    }
  });
  return result;
}

// Like getLocalCompletedSlotsForUser, but returns the SYNCED state per slot
// instead of just "completed or not" — { [slot]: true } means completed AND
// already confirmed on Supabase, { [slot]: false } means completed locally
// but still waiting on the background sync. Lets the UI distinguish "really
// done" from "pending" instead of treating every local completion the same.
export async function getLocalSlotSyncStatusForUser(
  userId: string,
  prayerDayPrefix: string,
): Promise<Record<string, boolean>> {
  const map = await readLocalSessions();
  const result: Record<string, boolean> = {};
  Object.values(map).forEach((s) => {
    if (s.userId === userId && s.slot.startsWith(prayerDayPrefix) && s.completed) {
      result[s.slot] = s.synced;
    }
  });
  return result;
}

// How many local sessions are still waiting to reach Supabase.
// Optionally scoped to a single user.
export async function getPendingSyncCount(userId?: string): Promise<number> {
  const map = await readLocalSessions();
  return Object.values(map).filter(
    (s) => !s.synced && (!userId || s.userId === userId),
  ).length;
}

// ─── Sync ───────────────────────────────────────────────────────────────────

export type SyncReport = {
  pendingCount: number;
  succeeded: string[];
  failed: { sessionId: string; slot: string; error: string }[];
};

// Does the actual sync work and RETURNS a detailed report instead of just
// logging — this is what both the background auto-sync and the manual
// "Sync Now" debug button (see MainApp.tsx) call under the hood, so you
// can see the exact Supabase error on-screen instead of digging through
// Metro logs.
async function runSync(): Promise<SyncReport> {
  const map = await readLocalSessions();
  const allPending = Object.values(map).filter((s) => !s.synced);

  // FIX: this device may be shared by multiple users (logging in/out on
  // the same phone). Local storage holds pending sessions for ANY user
  // who's ever completed a prayer offline on this device, not just the
  // one currently signed in. Syncing everything regardless of owner would
  // push a PREVIOUS user's leftover pending records using whichever
  // account happens to be authenticated right now — wrong user's data
  // written under the wrong session. Only sync records belonging to the
  // CURRENTLY authenticated user; everything else stays queued untouched
  // until that user is actually the one signed in again.
  const { data: { session: authSession } } = await supabase.auth.getSession();
  const currentUserId = authSession?.user?.id;

  const pending = currentUserId
    ? allPending.filter((s) => s.userId === currentUserId)
    : [];

  const report: SyncReport = { pendingCount: pending.length, succeeded: [], failed: [] };

  if (pending.length === 0) return report;

  // FIX: if the device was offline long enough for the access token to
  // expire (Supabase tokens typically last ~1hr), the upsert below would
  // silently fail with an auth error every time. Refresh first so we
  // always sync with a valid token. Uses safeRefreshSession() (shared,
  // deduped across the app) instead of calling supabase.auth.refreshSession()
  // directly — refresh tokens rotate on use, so an uncoordinated call here
  // racing against another one elsewhere (e.g. MainApp's mount-time
  // refresh) could get rejected as "Already Used" and force a real
  // sign-out.
  try {
    const { error: refreshError } = await safeRefreshSession();
    if (refreshError) throw refreshError;
  } catch (err: any) {
    const message = err?.message ?? JSON.stringify(err);
    report.failed = pending.map((s) => ({
      sessionId: s.sessionId,
      slot: s.slot,
      error: `Session refresh failed: ${message}`,
    }));
    return report;
  }

  for (const session of pending) {
    try {
      const { error } = await supabase.from("PrayerSessions").upsert(
        {
          SessionId: session.sessionId,
          UserId: session.userId,
          Slot: session.slot,
          PrayerTypeId: session.prayerTypeId,
          ScheduledTime: session.scheduledTime,
          CreatedAt: session.createdAt,
          Completed: session.completed,
          CompletedAt: session.completedAt,
        },
        { onConflict: "SessionId" },
      );

      if (error) throw error;

      // FIX: previously this only mutated the in-memory `map` object read
      // at the top of this function, and the actual write to storage
      // happened ONCE at the very end of the whole loop. If the user
      // completed a prayer (completePrayer -> saveLocalSession) at any
      // point while this loop was running, that write would land on
      // storage first — and then this function's single end-of-loop
      // write would overwrite it with the stale snapshot from before the
      // completion, silently erasing it. Using saveLocalSession() here
      // instead re-reads the freshest map immediately before writing,
      // shrinking the unsafe window from "the whole sync loop" down to a
      // single record, matching how completePrayer/startPrayer already
      // persist safely elsewhere.
      session.synced = true;
      await saveLocalSession(session);
      report.succeeded.push(session.sessionId);
      console.log(`[offlineSync] Synced session for slot ${session.slot}`);
    } catch (err: any) {
      const message = err?.message ?? JSON.stringify(err);
      report.failed.push({ sessionId: session.sessionId, slot: session.slot, error: message });
      console.warn(
        `[offlineSync] Failed to sync session ${session.sessionId}:`,
        message,
      );
    }
  }

  return report;
}

let syncInProgress = false;

// Background version — used by the auto-sync loop. Silent (just logs),
// same as before.
export async function syncPendingPrayers(): Promise<void> {
  if (syncInProgress) return;
  syncInProgress = true;
  try {
    const online = await isOnline();
    if (!online) return;
    await runSync();
  } finally {
    syncInProgress = false;
  }
}

// Manual/debug version — used by the "Sync Now" button. Always runs (even
// bypassing the isOnline() pre-check, so if isOnline() is wrong about
// connectivity we still attempt it and get a real error back) and returns
// the full report so the UI can show exactly what happened.
export async function debugSyncNow(): Promise<SyncReport> {
  if (syncInProgress) {
    return { pendingCount: 0, succeeded: [], failed: [{ sessionId: "-", slot: "-", error: "A sync is already in progress, try again in a moment." }] };
  }
  syncInProgress = true;
  try {
    return await runSync();
  } finally {
    syncInProgress = false;
  }
}

// ─── Auto-sync wiring ───────────────────────────────────────────────────────

let autoSyncStarted = false;

export function startAutoSync(): void {
  if (autoSyncStarted) return;
  autoSyncStarted = true;

  syncPendingPrayers();

  NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      syncPendingPrayers();
    }
  });

  setInterval(() => {
    syncPendingPrayers();
  }, 20000);
}