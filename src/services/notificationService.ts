/**
 * src/services/notificationService.ts
 *
 * ✅ THIS IS THE ONLY NOTIFICATION FILE IN YOUR PROJECT.
 *    - Delete `services/notificationService.ts` (the one outside src/)
 *    - Delete `src/services/notificationServices.ts` if it exists separately
 *    - Keep only THIS file at: src/services/notificationService.ts
 */

import { Alert, Linking, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

// ─── Single channel ID used everywhere ───────────────────────────────────────
const CHANNEL_ID = "angelus_bells_v2";

// ─── Prayer schedule ──────────────────────────────────────────────────────────
const PRAYER_TIMES = [
  {
    hour: 6,
    minute: 0,
    label: "Morning Angelus",
    body: "The Angel of the Lord declared unto Mary.",
  },
  {
    hour: 12,
    minute: 0,
    label: "Noon Angelus",
    body: "Pause and pray the Angelus.",
  },
  {
    hour: 18,
    minute: 0,
    label: "Evening Angelus",
    body: "Pray the Angelus at sunset.",
  },
] as const;

// ─── Android channel ──────────────────────────────────────────────────────────
// Safe to call multiple times — Android ignores it if channel already exists.
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Angelus Bells",
    importance: Notifications.AndroidImportance.MAX, // heads-up banner even when screen is on
    sound: "triple_bell.mp3",
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#C9A24A",
    enableVibrate: true,
    showBadge: false,
  });
}

// ─── Request permission ───────────────────────────────────────────────────────
// Call this once when the user first opens the app or from a settings screen.
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) {
    Alert.alert(
      "Simulator Detected",
      "Push notifications only work on a real physical device.",
    );
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  // Already granted
  if (existingStatus === "granted") {
    await ensureAndroidChannel();
    await scheduleAngelusNotifications();
    return true;
  }

  // Previously denied — OS won't prompt again, send user to Settings
  if (existingStatus === "denied") {
    Alert.alert(
      "Notifications Disabled",
      "To hear the Angelus bells, please enable notifications in your device Settings.",
      [
        { text: "Not Now", style: "cancel" },
        { text: "Open Settings", onPress: () => Linking.openSettings() },
      ],
    );
    return false;
  }

  // First time — show the system prompt
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });

  if (status === "granted") {
    await ensureAndroidChannel();
    await scheduleAngelusNotifications();
    return true;
  }

  return false;
}

// ─── Schedule notifications ───────────────────────────────────────────────────
//
// ✅ KEY FIX: Checks if all 3 are already scheduled before doing anything.
//    If they are → returns immediately, touches nothing.
//    This prevents the cancel-and-reschedule bug that caused minute-long delays.
//
export async function scheduleAngelusNotifications(): Promise<void> {
  const existing = await Notifications.getAllScheduledNotificationsAsync();

  // Count how many of our repeating daily triggers are already live
  const angelusCount = existing.filter((n) => {
    const trigger = n.trigger as any;
    // At runtime expo returns type as "daily" for DAILY triggers
    return (
      (trigger?.type === "daily" || trigger?.type === "calendar") &&
      trigger?.repeats !== false
    );
  }).length;

  if (angelusCount === PRAYER_TIMES.length) {
    // ✅ All 3 already scheduled — do NOT cancel, do NOT reschedule
    console.log("[Angelus] Notifications already scheduled. Skipping.");
    return;
  }

  // Something missing (first install or corruption) — rebuild from scratch
  console.log(`[Angelus] Found ${angelusCount}/${PRAYER_TIMES.length} — rescheduling.`);
  await Notifications.cancelAllScheduledNotificationsAsync();
  await ensureAndroidChannel();

  for (const { hour, minute, label, body } of PRAYER_TIMES) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🔔 ${label}`,
        body,
        sound: "triple_bell.mp3",
        data: { screen: "Prayer", autoPlay: true },
        // Android must reference the channel for sound + importance to work
        ...(Platform.OS === "android" && { channelId: CHANNEL_ID }),
      },
      trigger: {
        // DAILY fires at HH:MM:00 local time, repeats every 24 hours exactly
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  }

  console.log(`[Angelus] ✅ Scheduled ${PRAYER_TIMES.length} daily notifications.`);
}

// ─── Cancel all (use on logout or if user disables notifications) ─────────────
export async function cancelAngelusNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log("[Angelus] All notifications cancelled.");
}

// ─── Test helper (dev/QA only) ────────────────────────────────────────────────
export async function testNotificationNow(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🔔 Angelus Test",
      body: "If you see this, notifications are working correctly.",
      sound: "triple_bell.mp3",
      data: { screen: "Prayer", autoPlay: true },
      ...(Platform.OS === "android" && { channelId: CHANNEL_ID }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      repeats: false,
    },
  });
  console.log("[Angelus] Test notification fires in 5 seconds.");
}