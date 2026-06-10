import { Alert, Linking, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as IntentLauncher from "expo-intent-launcher";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CHANNEL_ID = "angelus_bells_v16";
const ANGELUS_TAG = "angelus_prayer";
const BATTERY_ASKED_KEY = "battery_optimization_asked";

const PRAYER_TIMES = [
  { hour: 6,  minute: 0, label: "Morning Angelus", body: "The Angel of the Lord declared unto Mary." },
  { hour: 12, minute: 0, label: "Noon Angelus",    body: "Pause and pray the Angelus."              },
  { hour: 18, minute: 0, label: "Evening Angelus", body: "Pray the Angelus at sunset."              },
] as const;

// ── Ask battery optimization exemption only once ever ─────────────────────
async function requestBatteryOptimizationExemption(): Promise<void> {
  if (Platform.OS !== "android") return;
  const alreadyAsked = await AsyncStorage.getItem(BATTERY_ASKED_KEY);
  if (alreadyAsked === "true") return;
  await AsyncStorage.setItem(BATTERY_ASKED_KEY, "true");
  try {
    const pkg =
      Constants.expoConfig?.android?.package ??
      "com.annieann.angelusapp";
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
      { data: `package:${pkg}` }
    );
  } catch (err) {
    console.warn("[Angelus] Battery optimization intent failed — opening settings:", err);
    try {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS
      );
    } catch {
      Linking.openSettings();
    }
  }
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Angelus Bells",
    importance: Notifications.AndroidImportance.MAX,
    sound: "triple_bell.mp3",
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#C9A24A",
    enableVibrate: true,
    showBadge: false,
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) {
    Alert.alert("Simulator Detected", "Push notifications only work on a real physical device.");
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus === "granted") {
    await scheduleAngelusNotifications();
    await requestBatteryOptimizationExemption();
    return true;
  }

  if (existingStatus === "denied") {
    Alert.alert(
      "Notifications Disabled",
      "To hear the Angelus bells, please enable notifications in your device Settings.",
      [
        { text: "Not Now", style: "cancel" },
        { text: "Open Settings", onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }

  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });

  if (status === "granted") {
    await scheduleAngelusNotifications();
    await requestBatteryOptimizationExemption();
    return true;
  }

  return false;
}

export async function scheduleAngelusNotifications(): Promise<void> {
  await ensureAndroidChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log("[Angelus] Cleared all scheduled notifications.");

  for (const { hour, minute, label, body } of PRAYER_TIMES) {
    const request: Notifications.NotificationRequestInput = {
      content: {
        title: `🔔 ${label}`,
        body,
        sound: "triple_bell.mp3",
        data: {
          screen: "Prayer",
          autoPlay: true,
          angelusTag: ANGELUS_TAG,
          prayerHour: hour,
          prayerKey: hour === 6 ? "morning" : hour === 12 ? "noon" : "evening",
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: Platform.OS === "android" ? CHANNEL_ID : undefined,
      } as Notifications.DailyTriggerInput,
    };

    await Notifications.scheduleNotificationAsync(request);
    console.log(`[Angelus] Scheduled: ${label} at ${hour}:${String(minute).padStart(2, "0")}`);
  }

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  console.log(`[Angelus] ✅ Total scheduled after setup: ${scheduled.length}`);
  scheduled.forEach((n, i) => {
    console.log(`  [${i + 1}]`, n.content.title, JSON.stringify(n.trigger));
  });
}

export async function cancelAngelusNotifications(): Promise<void> {
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  const ours = existing.filter((n) => n.content.data?.angelusTag === ANGELUS_TAG);
  for (const n of ours) {
    await Notifications.cancelScheduledNotificationAsync(n.identifier);
  }
  console.log(`[Angelus] Cancelled ${ours.length} Angelus notification(s).`);
}

export async function testNotificationNow(): Promise<void> {
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🔔 Angelus Test",
      body: "If you see this, notifications are working correctly.",
      sound: "triple_bell.mp3",
      data: { screen: "Prayer", autoPlay: true, angelusTag: ANGELUS_TAG },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      repeats: false,
      channelId: Platform.OS === "android" ? CHANNEL_ID : undefined,
    } as Notifications.TimeIntervalTriggerInput,
  });
  console.log("[Angelus] Test notification fires in 5 seconds.");
}