import AsyncStorage from "@react-native-async-storage/async-storage";
import { PrayerSession } from "../api/prayerApi";

const CURRENT_SESSION_KEY = "current_prayer_session";

export type OfflinePrayerSession = PrayerSession & {
  date: string; // e.g. "2026-06-30"
  completed: boolean;
  synced: boolean;
};

export async function saveCurrentSession(session: OfflinePrayerSession) {
  await AsyncStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
}

export async function loadCurrentSession(): Promise<OfflinePrayerSession | null> {
  const value = await AsyncStorage.getItem(CURRENT_SESSION_KEY);
  return value ? JSON.parse(value) : null;
}

export async function clearCurrentSession() {
  await AsyncStorage.removeItem(CURRENT_SESSION_KEY);
}
