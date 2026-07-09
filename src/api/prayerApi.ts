import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../lib/supabaseClient";
import { getSlot } from "../utils/prayer";

import {
  clearCurrentSession,
  loadCurrentSession,
  pruneOfflineSessions,
  saveCurrentSession,
  upsertOfflineSession,
} from "../storage/offlineStorage";

import { OfflinePrayerSession } from "../storage/offlineStorage";
import { syncOfflinePrayers } from "../../services/syncOfflinePrayers";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PrayerSession = {
  sessionId: string;
  prayerTypeId: number;
  scheduledTime: string;
  slot: string;
};

export const getScheduledTime = () => {
  const now = new Date();

  if (now.getHours() < 12) {
    now.setHours(6, 0, 0, 0);
  } else if (now.getHours() < 18) {
    now.setHours(12, 0, 0, 0);
  } else {
    now.setHours(18, 0, 0, 0);
  }

  return now.toISOString();
};

// ─── Start Prayer ─────────────────────────────────────────────────────────────

export const startPrayer = async (userId: string): Promise<PrayerSession> => {
  const slot = getSlot();
  const scheduledTime = getScheduledTime();
  const now = new Date().toISOString();

  let localSession = await loadCurrentSession();

  if (localSession && localSession.slot !== slot) {
    await clearCurrentSession();
    localSession = null;
  }

  await pruneOfflineSessions(slot);

  if (localSession) {
    return localSession;
  }

  try {
    const { data: existing, error: fetchError } = await supabase
      .from("PrayerSessions")
      .select("*")
      .eq("UserId", userId)
      .eq("Slot", slot)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existing) {
      const session: OfflinePrayerSession = {
        sessionId: existing.SessionId,
        prayerTypeId: existing.PrayerTypeId ?? 1,
        scheduledTime: existing.ScheduledTime,
        slot: existing.Slot,
        completed: existing.Completed ?? false,
        synced: true,
      };

      await saveCurrentSession(session);
      await upsertOfflineSession(session);

      return session;
    }

    // 3. Create new online session

    const sessionId = uuidv4();

    const { data, error } = await supabase
      .from("PrayerSessions")
      .insert({
        SessionId: sessionId,
        UserId: userId,
        Slot: slot,
        PrayerTypeId: 1,
        ScheduledTime: scheduledTime,
        CreatedAt: now,
        Completed: false,
      })
      .select()
      .single();

    if (error) throw error;

    const session: OfflinePrayerSession = {
      sessionId: data.SessionId,
      prayerTypeId: data.PrayerTypeId,
      scheduledTime: data.ScheduledTime,
      slot: data.Slot,
      completed: data.Completed,
      synced: true,
    };

    await saveCurrentSession(session);
    await upsertOfflineSession(session);
    return session;
  } catch {
    // 4. Offline fallback

    const session: OfflinePrayerSession = {
      sessionId: uuidv4(),
      prayerTypeId: 1,
      scheduledTime: scheduledTime,
      slot: slot,
      completed: false,
      synced: false,
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
  const session = await loadCurrentSession();

  if (session) {
    session.completed = true;
    session.completedAt = new Date().toISOString();
    await saveCurrentSession(session);
    await upsertOfflineSession(session);
  }

  try {
    const { error } = await supabase
      .from("PrayerSessions")
      .update({
        Completed: true,
        CompletedAt: new Date().toISOString(),
      })
      .eq("SessionId", sessionId)
      .eq("UserId", userId);

    if (error) throw error;

    if (session) {
      session.synced = true;
      await saveCurrentSession(session);
      await upsertOfflineSession(session);
    }
  } catch {
    // Still offline
    // We'll sync later
  }

  syncOfflinePrayers(userId);
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

export async function initializeOfflineStorage() {
  const slot = getSlot();

  const currentSession = await loadCurrentSession();

  if (currentSession && currentSession.slot !== slot) {
    await clearCurrentSession();
  }

  await pruneOfflineSessions(slot);
}
