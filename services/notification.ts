import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

export async function registerForNotifications(): Promise<void> {
  if (!Device.isDevice) return;

  const { status } = await Notifications.requestPermissionsAsync();

  if (status !== "granted") {
    alert("Notifications are required for Angelus bells.");
  }
}

type AngelusTime = {
  hour: number;
  minute: number;
};

export async function scheduleAngelusNotifications(): Promise<void> {
  const times: AngelusTime[] = [
    { hour: 6, minute: 0 },
    { hour: 12, minute: 0 },
    { hour: 18, minute: 0 },
  ];

  for (const time of times) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔔 The Angelus",
        body: "The bells are ringing. Let us pray.",
        sound: true,
      },
      trigger: {
        hour: time.hour,
        minute: time.minute,
        repeats: true,
      } as unknown as Notifications.DailyTriggerInput
    });
  }
}