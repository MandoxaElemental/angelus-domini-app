import { Alert, Linking, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ANGELUS_MODE_KEY = "angelus_mode";
export type AngelusMode = "noon_only" | "all_three";

export async function getAngelusMode(): Promise<AngelusMode> {
  const value = await AsyncStorage.getItem(ANGELUS_MODE_KEY);
  return (value as AngelusMode) ?? "all_three";
}

export async function setAngelusMode(mode: AngelusMode) {
  await AsyncStorage.setItem(ANGELUS_MODE_KEY, mode);
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
    const mode = await getAngelusMode();
    await scheduleAngelusNotifications(mode);
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
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("angelus-bells", {
        name: "Angelus Bells",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    const mode = await getAngelusMode();
    await scheduleAngelusNotifications(mode);
    return true;
  }

  return false;
}

export async function scheduleAngelusNotifications(
  mode: AngelusMode,
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const times =
    mode === "noon_only"
      ? [{ hour: 12, minute: 0, label: "Noon Angelus" }]
      : [
          { hour: 6, minute: 0, label: "Morning Angelus" },
          { hour: 12, minute: 0, label: "Noon Angelus" },
          { hour: 18, minute: 0, label: "Evening Angelus" },
        ];

  for (const { hour, minute, label } of times) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔔 " + label,
        body: "The bells are calling you to prayer. Tap to pray the Angelus.",
        sound: "default",
        data: { timeSlot: label }, // optional but useful for navigation
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
