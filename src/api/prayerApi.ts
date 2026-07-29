import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../lib/supabaseClient";
import { getSlot } from "../utils/prayer";
import * as Notifications from "expo-notifications";
import NetInfo from "@react-native-community/netinfo";

import {
  clearCurrentSession,
  loadCurrentSession,
  pruneOfflineSessions,
  saveCurrentSession,
  upsertOfflineSession,
  OfflinePrayerSession,
  getOfflineSessionBySessionId,
} from "../storage/offlineStorage";

import { syncOfflinePrayers } from "../../services/syncOfflinePrayers";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { getUserTimezone } from "../utils/timezone";

export async function isOnline(): Promise<boolean> {
  const net = await NetInfo.fetch();

  return net.isConnected === true && net.isInternetReachable !== false;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type PrayerSession = {
  sessionId: string;
  prayerTypeId: number;
  scheduledTime: string;
  slot: string;
};

export const getScheduledTime = (timezone: string) => {
  const utcNow = new Date();

  const localNow = toZonedTime(utcNow, timezone);

  if (localNow.getHours() < 12) {
    localNow.setHours(6, 0, 0, 0);
  } else if (localNow.getHours() < 18) {
    localNow.setHours(12, 0, 0, 0);
  } else {
    localNow.setHours(18, 0, 0, 0);
  }

  return fromZonedTime(localNow, timezone).toISOString();
};

// ─── Start Prayer ─────────────────────────────────────────────────────────────

export const startPrayer = async (
  userId: string,
  timezone: string,
): Promise<PrayerSession> => {
  const slot = getSlot(timezone);
  const scheduledTime = getScheduledTime(timezone);
  const now = new Date().toISOString();

  let localSession = await loadCurrentSession();

  if (localSession && localSession.slot !== slot) {
    await clearCurrentSession();
    localSession = null;
  }

  await pruneOfflineSessions(slot);

  if (localSession && !localSession.completed) {
    return localSession;
  }

  const online = await isOnline();

  if (!online) {
    const session: OfflinePrayerSession = {
      userId,
      sessionId: uuidv4(),
      prayerTypeId: 1,
      scheduledTime,
      slot,
      completed: false,
      synced: false,
      createdAt: now,
    };

    await saveCurrentSession(session);
    await upsertOfflineSession(session);

    return session;
  }

  try {
    const { data: existing, error: fetchError } = await supabase
      .from("PrayerSessions")
      .select("*")
      .eq("UserId", userId)
      .eq("Slot", slot)
      .limit(1)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existing) {
      const session: OfflinePrayerSession = {
        userId,
        sessionId: existing.SessionId,
        prayerTypeId: existing.PrayerTypeId ?? 1,
        scheduledTime: existing.ScheduledTime,
        slot: existing.Slot,
        completed: existing.Completed ?? false,
        synced: true,
        createdAt: existing.CreatedAt,
      };

      await saveCurrentSession(session);
      await upsertOfflineSession(session);

      return session;
    }

    // 3. Create new online session

    const sessionId = uuidv4();

    const { data, error } = await supabase
      .from("PrayerSessions")
      .upsert(
        {
          SessionId: sessionId,
          UserId: userId,
          Slot: slot,
          PrayerTypeId: 1,
          ScheduledTime: scheduledTime,
          CreatedAt: now,
          Completed: false,
        },
        {
          onConflict: "UserId,Slot",
          ignoreDuplicates: false,
        },
      )
      .select()
      .single();

    if (error) throw error;

    const session: OfflinePrayerSession = {
      userId,
      sessionId: data.SessionId,
      prayerTypeId: data.PrayerTypeId,
      scheduledTime: data.ScheduledTime,
      slot: data.Slot,
      completed: data.Completed,
      synced: true,
      createdAt: data.CreatedAt,
    };

    await saveCurrentSession(session);
    await upsertOfflineSession(session);
    return session;
  } catch {
    // 4. Offline fallback

    const session: OfflinePrayerSession = {
      userId,
      sessionId: uuidv4(),
      prayerTypeId: 1,
      scheduledTime: scheduledTime,
      slot: slot,
      completed: false,
      synced: false,
      createdAt: now,
    };

    await saveCurrentSession(session);
    await upsertOfflineSession(session);

    return session;
  }
};

// ─── Complete Prayer ──────────────────────────────────────────────────────────

export const completePrayer = async (
  userId: string,
  sessionId: string,
): Promise<void> => {
  const completedAt = new Date().toISOString();

  let session = await loadCurrentSession();

  if (!session || session.sessionId !== sessionId) {
    session = await getOfflineSessionBySessionId(sessionId);
  }
  if (!session || session.sessionId !== sessionId) {
    console.warn("Session mismatch during completion", {
      passedSessionId: sessionId,
      storedSessionId: session?.sessionId,
    });

    return;
  }
  session.completed = true;
  session.completedAt = completedAt;
  session.synced = false;

  await saveCurrentSession(session);
  await upsertOfflineSession(session);

  const online = await isOnline();

  if (!online) {
    await Notifications.dismissAllNotificationsAsync();
    return;
  }

  try {
    const { error } = await supabase.from("PrayerSessions").upsert(
      {
        SessionId: sessionId,
        UserId: userId,
        Slot: session.slot,
        PrayerTypeId: session?.prayerTypeId ?? 1,
        ScheduledTime: session?.scheduledTime,
        CreatedAt: session?.createdAt,
        Completed: true,
        CompletedAt: completedAt,
      },
      {
        onConflict: "SessionId",
      },
    );

    if (error) throw error;

    if (session) {
      session.synced = true;
      await saveCurrentSession(session);
      await upsertOfflineSession(session);
    }
  } catch (err) {
    console.warn("Unable to upload completed prayer:", err);

    // Keep offline copy, but don't treat it as synced
    if (session) {
      session.synced = false;
      await saveCurrentSession(session);
      await upsertOfflineSession(session);
    }
  }

  if (await isOnline()) {
    try {
      await syncOfflinePrayers(userId);
    } catch {}
  }
  await Notifications.dismissAllNotificationsAsync();
};

// ─── Get Global Count ─────────────────────────────────────────────────────────

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

export async function canStartCurrentPrayer(): Promise<boolean> {
  const timezone = await getUserTimezone();
  const currentSlot = getSlot(timezone);

  const session = await loadCurrentSession();

  if (!session) {
    return true;
  }

  // Session is from an older prayer.
  if (session.slot !== currentSlot) {
    return true;
  }

  // Already completed today's prayer.
  if (session.completed) {
    return false;
  }

  return true;
}
