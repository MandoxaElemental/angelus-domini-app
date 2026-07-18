import { supabase } from "../src/lib/supabaseClient";
import {
  loadOfflineSessions,
  upsertOfflineSession,
} from "../src/storage/offlineStorage";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

let syncing = false;

export async function syncOfflinePrayers(userId: string) {
  if (syncing) return;

  syncing = true;

  try {
    const state = await NetInfo.fetch();

    if (!state.isConnected || state.isInternetReachable === false) {
      return;
    }

    const sessions = await loadOfflineSessions();

    for (const session of sessions) {
      if (session.synced && session.completed) continue;
      const { error } = await supabase.from("PrayerSessions").upsert(
        {
          SessionId: session.sessionId,
          UserId: session.userId,
          Slot: session.slot,
          PrayerTypeId: session.prayerTypeId,
          ScheduledTime: session.scheduledTime,
          Completed: session.completed,
          CompletedAt: session.completed ? session.completedAt : null,
          CreatedAt: session.createdAt,
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
    }
  } finally {
    syncing = false;
  }
}
