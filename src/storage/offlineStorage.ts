import AsyncStorage from "@react-native-async-storage/async-storage";
import { PrayerSession } from "../api/prayerApi";
import { getSlot } from "../utils/prayer";
import { getUserTimezone } from "../utils/timezone";

const CURRENT_SESSION_KEY = "current_prayer_session";
const OFFLINE_SESSIONS_KEY = "offline_prayer_sessions";

export type OfflinePrayerSession = PrayerSession & {
  userId: string;
  completed: boolean;
  completedAt?: string;
  synced: boolean;
  createdAt: string;
};

export async function saveCurrentSession(session: OfflinePrayerSession) {
  await AsyncStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
}

export async function loadCurrentSession(): Promise<OfflinePrayerSession | null> {
  const value = await AsyncStorage.getItem(CURRENT_SESSION_KEY);

  try {
    return value ? JSON.parse(value) : null;
  } catch (err) {
    console.warn("Failed to load current prayer session:", err);
    return null;
  }
}

export async function clearCurrentSession() {
  await AsyncStorage.removeItem(CURRENT_SESSION_KEY);
}

export async function loadOfflineSessions(): Promise<OfflinePrayerSession[]> {
  const value = await AsyncStorage.getItem(OFFLINE_SESSIONS_KEY);

  try {
    return value ? JSON.parse(value) : [];
  } catch (err) {
    console.warn("Failed to load offline prayer sessions:", err);
    return [];
  }
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

  // Keep current session synchronized
  const current = await loadCurrentSession();

  if (!current || current.sessionId === session.sessionId) {
    await saveCurrentSession(session);
  }
}

export async function pruneOfflineSessions(currentSlot: string) {
  const sessions = await loadOfflineSessions();

  const currentDate = currentSlot.split("_")[0];

  const todaysSessions = sessions.filter((session) => {
    return session.synced || session.slot.split("_")[0] === currentDate;
  });

  await saveOfflineSessions(todaysSessions);
}

export async function initializeOfflineStorage() {
  const timezone = await getUserTimezone();
  const slot = getSlot(timezone);

  const currentSession = await loadCurrentSession();

  if (currentSession && currentSession.slot !== slot) {
    await clearCurrentSession();
  }

  await pruneOfflineSessions(slot);
}

export async function getOfflineSessionBySessionId(sessionId: string) {
  const sessions = await loadOfflineSessions();

  return sessions.find((s) => s.sessionId === sessionId) ?? null;
}
