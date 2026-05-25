import { Alert, Linking, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) {
    Alert.alert("Simulator Detected", "Push notifications only work on a real device.");
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus === "granted") return true;

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
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("angelus-bells", {
        name: "Angelus Bells",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    return true;
  }

  return false;
}