import { Alert, Linking, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type AngelusMode = "all_three" | "noon_only" | "custom";

export type AngelusTime = "morning" | "noon" | "evening";

const MODE_KEY = "angelus_mode";
const CUSTOM_TIMES_KEY = "angelus_custom_notification_times";

const DEFAULT_CUSTOM_TIMES: Record<AngelusTime, boolean> = {
  morning: true,
  noon: true,
  evening: true,
};

export async function getAngelusMode(): Promise<AngelusMode> {
  try {
    const value = await AsyncStorage.getItem(MODE_KEY);

    if (value === "noon_only") {
      return "noon_only";
    }

    if (value === "custom") {
      return "custom";
    }

    return "all_three";
  } catch {
    return "all_three";
  }
}

export async function setAngelusMode(mode: AngelusMode) {
  await AsyncStorage.setItem(MODE_KEY, mode);
}

export async function getCustomNotificationTimes(): Promise<
  Record<AngelusTime, boolean>
> {
  try {
    const stored = await AsyncStorage.getItem(CUSTOM_TIMES_KEY);

    if (!stored) {
      return DEFAULT_CUSTOM_TIMES;
    }

    const parsed = JSON.parse(stored);

    return {
      morning: Boolean(parsed.morning),
      noon: Boolean(parsed.noon),
      evening: Boolean(parsed.evening),
    };
  } catch {
    return DEFAULT_CUSTOM_TIMES;
  }
}

export async function setCustomNotificationTimes(
  times: Record<AngelusTime, boolean>,
) {
  await AsyncStorage.setItem(CUSTOM_TIMES_KEY, JSON.stringify(times));
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) {
    Alert.alert(
      "Simulator Detected",
      "Push notifications only work on a real device.",
    );
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus === "granted") {
    return true;
  }

  if (existingStatus === "denied") {
    Alert.alert(
      "Notifications Disabled",
      "To hear the Angelus bells, please enable notifications in your device Settings.",
      [
        { text: "Not Now", style: "cancel" },
        {
          text: "Open Settings",
          onPress: () => Linking.openSettings(),
        },
      ],
    );

    return false;
  }

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  if (status === "granted") {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("angelus-bells", {
        name: "Angelus Bells",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "triple-bell.wav",
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    return true;
  }

  return false;
}

export async function scheduleAngelusNotifications(
  mode: AngelusMode,
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  let times: { hour: number; minute: number; label: string }[] = [];

  if (mode === "all_three") {
    times = [
      {
        hour: 6,
        minute: 0,
        label: "Morning Angelus",
      },
      {
        hour: 12,
        minute: 0,
        label: "Noon Angelus",
      },
      {
        hour: 18,
        minute: 0,
        label: "Evening Angelus",
      },
    ];
  }

  if (mode === "noon_only") {
    times = [
      {
        hour: 12,
        minute: 0,
        label: "Noon Angelus",
      },
    ];
  }

  if (mode === "custom") {
    const customTimes = await getCustomNotificationTimes();

    if (customTimes.morning) {
      times.push({
        hour: 6,
        minute: 0,
        label: "Morning Angelus",
      });
    }

    if (customTimes.noon) {
      times.push({
        hour: 12,
        minute: 0,
        label: "Noon Angelus",
      });
    }

    if (customTimes.evening) {
      times.push({
        hour: 18,
        minute: 0,
        label: "Evening Angelus",
      });
    }
  }

  for (const { hour, minute, label } of times) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔔 " + label,
        body: "It's time to pray the Angelus.",
        sound: "triple-bell.wav",
        data: {
          timeSlot: label,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: Platform.OS === "android" ? "angelus-bells" : undefined,
      } as any,
    });
  }
}

export async function cancelAngelusNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
