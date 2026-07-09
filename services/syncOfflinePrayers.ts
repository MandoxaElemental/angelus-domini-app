import { supabase } from "../src/lib/supabaseClient";
import {
  loadOfflineSessions,
  saveOfflineSessions,
  upsertOfflineSession,
} from "../src/storage/offlineStorage";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

export async function syncOfflinePrayers(userId: string) {
  const state = await NetInfo.fetch();

  if (!state.isConnected || state.isInternetReachable === false) {
    return;
  }

  const sessions = await loadOfflineSessions();

  let changed = false;

  for (const session of sessions) {
    if (session.synced) continue;

    const { error } = await supabase.from("PrayerSessions").upsert(
      {
        SessionId: session.sessionId,
        UserId: userId,
        Slot: session.slot,
        PrayerTypeId: session.prayerTypeId,
        ScheduledTime: session.scheduledTime,
        Completed: session.completed,
        CompletedAt: session.completed ? session.completedAt : null,
      },
      {
        onConflict: "SessionId",
      },
    );

    if (error) {
      console.error("Sync failed:", error);
      continue;
    }

    await upsertOfflineSession({
      ...session,
      synced: true,
    });
    changed = true;
  }

  if (changed) {
    await saveOfflineSessions(sessions);
  }
}
