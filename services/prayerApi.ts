import { supabase } from "../src/lib/supabaseClient";
import { getSlot } from "../src/utils/prayer";
// ─── Types ────────────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────

export type PrayerSession = {
  sessionId: string;
  prayerTypeId: number;
  scheduledTime: string;
  slot: string;
};

// ─── Start Prayer ─────────────────────────────────────────────────────────────

export const startPrayer = async (userId: string): Promise<PrayerSession> => {
  const slot = getSlot();
  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const { data: existing, error: fetchError } = await supabase
    .from("PrayerSessions")
    .select("*")
    .eq("UserId", userId)
    .eq("Slot", slot)
    .maybeSingle();

  if (fetchError) {
    console.error("startPrayer fetch error:", fetchError);
    throw fetchError;
  }

  if (existing) {
    return {
      sessionId: existing.SessionId,
      prayerTypeId: existing.PrayerTypeId ?? 1,
      scheduledTime: existing.ScheduledTime,
      slot: existing.Slot,
    };
  }

  // Create new session
  const { data, error } = await supabase
    .from("PrayerSessions")
    .insert({
      UserId: userId,
      Slot: slot,
      PrayerTypeId: 1,
      ScheduledTime: now,
      CreatedAt: now,
      Completed: false,
    })
    .select()
    .single();

  if (error) {
    console.error("startPrayer insert error:", error);
    throw error;
  }

  return {
    sessionId: data.SessionId,
    prayerTypeId: data.PrayerTypeId ?? 1,
    scheduledTime: data.ScheduledTime,
    slot: data.Slot,
  };
};

// ─── Complete Prayer ──────────────────────────────────────────────────────────

export const completePrayer = async (
  userId: string,
  sessionId: string,
): Promise<void> => {
  const { error } = await supabase
    .from("PrayerSessions")
    .update({
      Completed: true,
      CompletedAt: new Date().toISOString(),
    })
    .eq("SessionId", sessionId)
    .eq("UserId", userId);

  if (error) {
    console.error("completePrayer error:", error);
    throw error;
  }
};

// ─── Get Global Count ─────────────────────────────────────────────────────────

export const getGlobalCount = async (slot: string): Promise<number> => {
  const { count, error } = await supabase
    .from("PrayerSessions")
    .select("*", { count: "exact", head: true })
    .eq("Slot", slot)
    .eq("Completed", true);

  if (error) {
    console.error("getGlobalCount error:", error);
    throw error;
  }

  return count ?? 0;
};

// ─── Get History ──────────────────────────────────────────────────────────────

export const getHistory = async (userId: string) => {
  const { data, error } = await supabase
    .from("PrayerSessions")
    .select("*")
    .eq("UserId", userId)
    .order("CreatedAt", { ascending: false });

  if (error) {
    console.error("getHistory error:", error);
    throw error;
  }

  return data;
};
