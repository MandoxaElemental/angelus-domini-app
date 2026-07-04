import AsyncStorage from "@react-native-async-storage/async-storage";
import { PrayerSession } from "../api/prayerApi";
import { getSlot } from "../utils/prayer";

const CURRENT_SESSION_KEY = "current_prayer_session";
const OFFLINE_SESSIONS_KEY = "offline_prayer_sessions";

export type OfflinePrayerSession = PrayerSession & {
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

export async function loadOfflineSessions(): Promise<OfflinePrayerSession[]> {
  const value = await AsyncStorage.getItem(OFFLINE_SESSIONS_KEY);
  return value ? JSON.parse(value) : [];
}
export async function saveOfflineSessions(sessions: OfflinePrayerSession[]) {
  await AsyncStorage.setItem(OFFLINE_SESSIONS_KEY, JSON.stringify(sessions));
}

export async function upsertOfflineSession(session: OfflinePrayerSession) {
  const sessions = await loadOfflineSessions();

  const index = sessions.findIndex((s) => s.sessionId === session.sessionId);

  if (index >= 0) {
    sessions[index] = session;
  } else {
    sessions.push(session);
  }

  await saveOfflineSessions(sessions);
}

export async function pruneOfflineSessions(currentSlot: string) {
  const sessions = await loadOfflineSessions();

  const currentDate = currentSlot.split("_")[0];

  const todaysSessions = sessions.filter((session) => {
    const sessionDate = session.slot.split("_")[0];
    return sessionDate === currentDate;
  });

  await saveOfflineSessions(todaysSessions);
}

export async function initializeOfflineStorage() {
  const slot = getSlot();

  const currentSession = await loadCurrentSession();

  if (currentSession && currentSession.slot !== slot) {
    await clearCurrentSession();
  }

  await pruneOfflineSessions(slot);
}
