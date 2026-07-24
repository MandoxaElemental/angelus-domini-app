import { Alert, Linking, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as IntentLauncher from "expo-intent-launcher";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CHANNEL_ID = "angelus_bells_v17";
const ANGELUS_TAG = "angelus_prayer";
const BATTERY_ASKED_KEY = "battery_optimization_asked";
const MODE_KEY = "angelus_mode";
const SCHEDULED_THIS_LAUNCH_KEY = "angelus_scheduled_this_launch";

// ← ADDED: persisted per-slot toggle preference. This is the single source
// of truth for "did the user turn this slot off in Settings" — independent
// of whether the OS notification actually got scheduled (permission may not
// be granted yet, etc). MainApp / MenuScreen read this (via getAllSlotStates)
// to decide whether to show "Disabled" in Daily Prayer Progress / Light
// Through the Day, the same way they already do for angelusMode.
const SLOT_TOGGLES_KEY = "angelus_slot_toggles";

// ── FIX: module-level in-memory locks ────────────────────────────────────────
// AsyncStorage is async — two concurrent callers can both read "not scheduled"
// before either writes "scheduled", stacking duplicate notification sets.
// These flags are set synchronously, closing that race window instantly.
let _schedulingInProgress = false;
let _scheduledThisProcess = false;
// ─────────────────────────────────────────────────────────────────────────────

export type AngelusMode = "all_three" | "noon_only";

// ← ADDED
export type SlotToggles = { morning: boolean; noon: boolean; evening: boolean };
const DEFAULT_TOGGLES: SlotToggles = { morning: true, noon: true, evening: true };

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

// ───────────────────────────────────────────────────────────────
// Angelus Mode
// ───────────────────────────────────────────────────────────────

export async function getAngelusMode(): Promise<AngelusMode> {
  try {
    const value = await AsyncStorage.getItem(MODE_KEY);
    if (value === "noon_only") return "noon_only";
    return "all_three";
  } catch {
    return "all_three";
  }
}

export async function setAngelusMode(mode: AngelusMode): Promise<void> {
  await AsyncStorage.setItem(MODE_KEY, mode);
}

// ───────────────────────────────────────────────────────────────
// ← ADDED: Per-slot toggle preference (persisted, independent of mode)
// ───────────────────────────────────────────────────────────────

export async function getSlotToggles(): Promise<SlotToggles> {
  try {
    const raw = await AsyncStorage.getItem(SLOT_TOGGLES_KEY);
    if (!raw) return { ...DEFAULT_TOGGLES };
    const parsed = JSON.parse(raw);
    return {
      morning: parsed.morning ?? true,
      noon: parsed.noon ?? true,
      evening: parsed.evening ?? true,
    };
  } catch {
    return { ...DEFAULT_TOGGLES };
  }
}

export async function setSlotToggles(toggles: SlotToggles): Promise<void> {
  try {
    await AsyncStorage.setItem(SLOT_TOGGLES_KEY, JSON.stringify(toggles));
  } catch {}
}

// ← ADDED: The single call MainApp / MenuScreen use to decide "disabled".
// Combines angelusMode (noon_only forces morning/evening off) with the
// user's individual per-slot toggle preference, so both mechanisms that can
// disable a slot are reflected consistently everywhere in the app.
export async function getAllSlotStates(): Promise<SlotToggles> {
  const mode = await getAngelusMode();
  const toggles = await getSlotToggles();
  return {
    morning: mode === "noon_only" ? false : toggles.morning,
    noon: toggles.noon,
    evening: mode === "noon_only" ? false : toggles.evening,
  };
}

// ───────────────────────────────────────────────────────────────
// Per-launch flag — call once from App.tsx on mount
// ───────────────────────────────────────────────────────────────

export async function resetLaunchScheduleFlag(): Promise<void> {
  _scheduledThisProcess = false; // FIX: also reset the in-memory flag
  try {
    await AsyncStorage.removeItem(SCHEDULED_THIS_LAUNCH_KEY);
  } catch {}
}

// ───────────────────────────────────────────────────────────────
// Ask battery optimization exemption only once
// ───────────────────────────────────────────────────────────────

async function requestBatteryOptimizationExemption(): Promise<void> {
  if (Platform.OS !== "android") return;

  const alreadyAsked = await AsyncStorage.getItem(BATTERY_ASKED_KEY);
  if (alreadyAsked === "true") return;

  await AsyncStorage.setItem(BATTERY_ASKED_KEY, "true");

  try {
    const pkg =
      Constants.expoConfig?.android?.package ?? "com.annieann.angelusapp";

    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
      { data: `package:${pkg}` },
    );
  } catch (err) {
    console.warn(
      "[Angelus] Battery optimization intent failed. Opening settings...",
      err,
    );
    try {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS,
      );
    } catch {
      Linking.openSettings();
    }
  }
}

// ───────────────────────────────────────────────────────────────
// Android Channel
// ───────────────────────────────────────────────────────────────

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

// ───────────────────────────────────────────────────────────────
// Permissions
// ───────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) {
    Alert.alert(
      "Simulator Detected",
      "Push notifications only work on a real physical device.",
    );
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus === "granted") {
    const mode = await getAngelusMode();
    await scheduleAngelusNotifications(mode);
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
      ],
    );
    return false;
  }

  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });

  if (status === "granted") {
    const mode = await getAngelusMode();
    await scheduleAngelusNotifications(mode);
    await requestBatteryOptimizationExemption();
    return true;
  }

  return false;
}

// ───────────────────────────────────────────────────────────────
// Schedule Notifications
// ───────────────────────────────────────────────────────────────

export async function scheduleAngelusNotifications(
  mode?: AngelusMode,
  force = false,
): Promise<void> {
  if (!force) {
    // FIX: synchronous check closes the race window AsyncStorage alone cannot
    if (_scheduledThisProcess || _schedulingInProgress) {
      console.log("[Angelus] Already scheduled this process — skipped.");
      return;
    }
  }

  // FIX: claim the lock synchronously before any await
  _schedulingInProgress = true;

  try {
    if (!force) {
      try {
        const alreadyScheduled = await AsyncStorage.getItem(SCHEDULED_THIS_LAUNCH_KEY);
        if (alreadyScheduled === "true") {
          console.log("[Angelus] Already scheduled this launch — skipped.");
          return;
        }
      } catch {}
    }

    try {
      await AsyncStorage.setItem(SCHEDULED_THIS_LAUNCH_KEY, "true");
    } catch {}

    await ensureAndroidChannel();

    const currentMode = mode ?? (await getAngelusMode());

    await Notifications.cancelAllScheduledNotificationsAsync();

    console.log("[Angelus] Cleared all scheduled notifications.");

    // ← CHANGED: also respect individual slot toggles when (re)scheduling
    // the full set, not just the mode. Previously calling this with
    // force=true (e.g. "Enable All") would re-schedule every hour allowed
    // by mode regardless of any slot the user had individually turned off.
    const toggles = await getSlotToggles();

    const prayers = PRAYER_TIMES.filter((p) => {
      if (currentMode === "noon_only" && p.hour !== 12) return false;
      if (p.hour === 6) return toggles.morning;
      if (p.hour === 12) return toggles.noon;
      return toggles.evening;
    });

    for (const { hour, minute, label, body } of prayers) {
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

      console.log(
        `[Angelus] Scheduled: ${label} at ${hour}:${String(minute).padStart(2, "0")}`,
      );
    }

    _scheduledThisProcess = true; // FIX: mark success in memory

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();

    console.log(`[Angelus] ✅ Total scheduled after setup: ${scheduled.length}`);

    scheduled.forEach((n, i) => {
      console.log(`[${i + 1}]`, n.content.title, JSON.stringify(n.trigger));
    });

  } finally {
    _schedulingInProgress = false; // FIX: always release the lock
  }
}

// ───────────────────────────────────────────────────────────────
// Cancel Angelus Notifications
// ───────────────────────────────────────────────────────────────

export async function cancelAngelusNotifications(): Promise<void> {
  const existing = await Notifications.getAllScheduledNotificationsAsync();

  const ours = existing.filter(
    (n) => n.content.data?.angelusTag === ANGELUS_TAG,
  );

  for (const notification of ours) {
    await Notifications.cancelScheduledNotificationAsync(
      notification.identifier,
    );
  }

  console.log(`[Angelus] Cancelled ${ours.length} Angelus notification(s).`);
}

// ───────────────────────────────────────────────────────────────
// Test Notification
// ───────────────────────────────────────────────────────────────

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