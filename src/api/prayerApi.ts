import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "../lib/supabaseClient";
import { getSlot } from "../utils/prayer";
import {
  getCurrentPrayerWindow
} from "../utils/prayer";


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
  const now = new Date().toISOString();

  // Check if session already exists for this user + slot
  const { data: existing, error: fetchError } = await supabase
    .from("PrayerSessions")
    .select("*")
    .eq("UserId", userId)
    .eq("Slot", slot)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existing) {
    return {
      sessionId: existing.SessionId,
      prayerTypeId: existing.PrayerTypeId ?? 1,
      scheduledTime: existing.ScheduledTime,
      slot: existing.Slot,
    };
  }

  // Create new session with generated UUID
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
  sessionId: string
): Promise<void> => {

  const window =
    getCurrentPrayerWindow();

  if (!window) {

    throw new Error(
      "Prayer window expired"
    );
  }

  const { error } =
    await supabase
      .from("PrayerSessions")
      .update({
        Completed: true,
        CompletedAt:
          new Date().toISOString(),
      })
      .eq("SessionId", sessionId)
      .eq("UserId", userId);

  if (error) throw error;
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