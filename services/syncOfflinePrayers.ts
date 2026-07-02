import { supabase } from "../src/lib/supabaseClient";
import {
  loadOfflineSessions,
  saveOfflineSessions,
} from "../src/storage/offlineStorage";

export async function syncOfflinePrayers(userId: string) {
  console.log("sync start");

  const sessions = await loadOfflineSessions();
  console.log("loaded offline sessions");

  let changed = false;

  for (const session of sessions) {
    if (session.synced) continue;

    const { error } = await supabase.from("PrayerSessions").upsert({
      SessionId: session.sessionId,
      UserId: userId,
      Slot: session.slot,
      PrayerTypeId: session.prayerTypeId,
      ScheduledTime: session.scheduledTime,
      Completed: session.completed,
      CompletedAt: session.completed ? new Date().toISOString() : null,
    });

    if (!error) {
      session.synced = true;
      changed = true;
    }
  }

  if (changed) {
    await saveOfflineSessions(sessions);
  }
}
