import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function registerForPushNotificationsAsync() {
  const { status } = await Notifications.getPermissionsAsync();

  let finalStatus = status;

  if (status !== "granted") {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    finalStatus = newStatus;
  }

  if (finalStatus !== "granted") {
    alert("Notifications permission not granted");
    return false;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("angelus", {
      name: "Angelus",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "triple-bell.mp3",
    });
  }

  return true;
}
export async function scheduleAngelus(
  hour: number,
  minute: number,
  timeSlot: "6am" | "12pm" | "6pm",
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Angelus Prayer",
      body: "Tap to begin prayer",
      sound: "triple-bell.mp3",
      data: { timeSlot },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute,
      repeats: true,
    },
  });
}
