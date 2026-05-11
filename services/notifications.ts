import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    alert("Permission for notifications not granted!");
    return false;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("angelus-reminders", {
      name: "Angelus Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#C9A24A",
    });
  }

  return true;
}

async function scheduleDailyNotification(
  hour: number,
  minute: number,
  title: string,
  body: string,
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: ".assets/audio/triple-bell.mp3",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function setupAngelusNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  
  await scheduleDailyNotification(
    6,
    0,
    "Angelus Morning Prayer",
    "The Angel of the Lord declared unto Mary."
  );

  await scheduleDailyNotification(
    12,
    0,
    "Angelus Noon Prayer",
    "Pause and pray the Angelus."
  );

  await scheduleDailyNotification(
    18,
    0,
    "Angelus Evening Prayer",
    "Pray the Angelus at sunset."
  );
}