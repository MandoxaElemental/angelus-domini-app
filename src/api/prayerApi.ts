import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "../lib/supabaseClient";
import { getSlot } from "../utils/prayer";
import {
  getLocalSession,
  getLocalSessionBySessionId,
  saveLocalSession,
  isOnline,
  syncPendingPrayers,
  LocalPrayerSession,
} from "../services/offlineSync";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PrayerSession = {
  sessionId: string;
  prayerTypeId: number;
  scheduledTime: string;
  slot: string;
};

// ─── Start Prayer ─────────────────────────────────────────────────────────────
// Offline-first: the local cache is checked BEFORE any network call, so a
// second call for the same user+slot (online or not) always returns the
// same session instead of creating a duplicate. If nothing is cached and
// we're online, it behaves exactly as before (check existing row, else
// insert) and caches the result. If we're offline, or the online attempt
// fails for any reason, it creates the session entirely locally with a
// client-generated UUID and queues it — the user is never blocked waiting
// on the network.
export const startPrayer = async (userId: string): Promise<PrayerSession> => {
  const slot = getSlot();

  const cached = await getLocalSession(userId, slot);
  if (cached) {
    return {
      sessionId: cached.sessionId,
      prayerTypeId: cached.prayerTypeId,
      scheduledTime: cached.scheduledTime,
      slot: cached.slot,
    };
  }

  const online = await isOnline();
  const now = new Date().toISOString();

  if (online) {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from("PrayerSessions")
        .select("*")
        .eq("UserId", userId)
        .eq("Slot", slot)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        const localCopy: LocalPrayerSession = {
          sessionId: existing.SessionId,
          userId,
          slot: existing.Slot,
          prayerTypeId: existing.PrayerTypeId ?? 1,
          scheduledTime: existing.ScheduledTime,
          createdAt: existing.CreatedAt ?? now,
          completed: !!existing.Completed,
          completedAt: existing.CompletedAt ?? null,
          synced: true,
        };
        await saveLocalSession(localCopy);
        return {
          sessionId: localCopy.sessionId,
          prayerTypeId: localCopy.prayerTypeId,
          scheduledTime: localCopy.scheduledTime,
          slot: localCopy.slot,
        };
      }

      const { data, error } = await supabase
        .from("PrayerSessions")
        .insert({
          SessionId: uuidv4(),
          UserId: userId,
          Slot: slot,
          PrayerTypeId: 1,
          ScheduledTime: now,
          CreatedAt: now,
          Completed: false,
        })
        .select()
        .single();

      if (error) throw error;

      const localCopy: LocalPrayerSession = {
        sessionId: data.SessionId,
        userId,
        slot: data.Slot,
        prayerTypeId: data.PrayerTypeId ?? 1,
        scheduledTime: data.ScheduledTime,
        createdAt: data.CreatedAt ?? now,
        completed: !!data.Completed,
        completedAt: data.CompletedAt ?? null,
        synced: true,
      };
      await saveLocalSession(localCopy);

      return {
        sessionId: localCopy.sessionId,
        prayerTypeId: localCopy.prayerTypeId,
        scheduledTime: localCopy.scheduledTime,
        slot: localCopy.slot,
      };
    } catch (err) {
      console.warn(
        "[prayerApi] startPrayer online path failed, falling back to local:",
        err,
      );
      // fall through to the offline branch below
    }
  }

  // Offline, or the online attempt above failed — create a fully local
  // session and queue it for background sync.
  const localCopy: LocalPrayerSession = {
    sessionId: uuidv4(),
    userId,
    slot,
    prayerTypeId: 1,
    scheduledTime: now,
    createdAt: now,
    completed: false,
    completedAt: null,
    synced: false,
  };
  await saveLocalSession(localCopy);

  return {
    sessionId: localCopy.sessionId,
    prayerTypeId: localCopy.prayerTypeId,
    scheduledTime: localCopy.scheduledTime,
    slot: localCopy.slot,
  };
};

// ─── Complete Prayer ──────────────────────────────────────────────────────────
// Offline-first: writes the completion to the local cache FIRST (so the UI
// can reflect "Completed" the instant this resolves, online or not), then
// tries Supabase immediately. If that fails, the entry stays queued —
// syncPendingPrayers() (reconnect listener / interval / next app launch
// via startAutoSync) will retry it automatically.
//
// FIX: the online branch previously used `.update(...).eq("SessionId", ...)`.
// If the session was created OFFLINE via startPrayer()'s local branch, no
// row for that SessionId exists in Supabase yet. `.update()` matching zero
// rows does NOT return an error — Supabase just reports success with no
// rows affected. That made this code wrongly mark the session `synced: true`
// even though nothing was ever written to Supabase, permanently removing it
// from the sync queue (getPendingSyncCount / runSync only look at
// `!s.synced`). The row would then never exist server-side, so global counts
// and any screen reading directly from Supabase (not merging local cache)
// would show it as never completed / missed.
//
// Switched to `.upsert(...)` with the full row payload (same shape runSync()
// already uses), keyed on SessionId. This creates the row if it doesn't
// exist yet (offline-created session reaching Supabase for the first time)
// or updates it if it does — so completion is never silently dropped.
export const completePrayer = async (
  userId: string,
  sessionId: string
): Promise<void> => {
  const cached = await getLocalSessionBySessionId(sessionId);
  const now = new Date().toISOString();

  if (cached) {
    cached.completed = true;
    cached.completedAt = now;
    cached.synced = false; // force a fresh sync attempt below
    await saveLocalSession(cached);
  }

  const online = await isOnline();
  if (online) {
    try {
      const { error } = await supabase
        .from("PrayerSessions")
        .upsert(
          {
            SessionId: sessionId,
            UserId: userId,
            Slot: cached?.slot ?? getSlot(),
            PrayerTypeId: cached?.prayerTypeId ?? 1,
            ScheduledTime: cached?.scheduledTime ?? now,
            CreatedAt: cached?.createdAt ?? now,
            Completed: true,
            CompletedAt: now,
          },
          { onConflict: "SessionId" },
        );

      if (error) throw error;

      if (cached) {
        cached.synced = true;
        await saveLocalSession(cached);
      }
      return;
    } catch (err) {
      console.warn(
        "[prayerApi] completePrayer online path failed, queued for sync:",
        err,
      );
    }
  }

  // Offline, or the upsert failed — kick a sync attempt anyway (harmless
  // no-op if still offline; the interval/listener in offlineSync will also
  // keep retrying).
  syncPendingPrayers();
};

// ─── Get Global Count ─────────────────────────────────────────────────────────
// Network-only by design — a meaningful "global" count can't be computed
// offline. Callers already wrap this in try/catch.
export const getGlobalCount = async (slot: string): Promise<number> => {
  const { count, error } = await supabase
    .from("PrayerSessions")
    .select("*", { count: "exact", head: true })
    .eq("Slot", slot)
    .eq("Completed", true);

  if (error) throw error;
  return count ?? 0;
};

// ─── Get History ──────────────────────────────────────────────────────────────

export const getHistory = async (userId: string) => {
  const { data, error } = await supabase
    .from("PrayerSessions")
    .select("*")
    .eq("UserId", userId)
    .order("CreatedAt", { ascending: false });

  if (error) throw error;
  return data;
};