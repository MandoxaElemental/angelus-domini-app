import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";

import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import MainApp from "./src/screens/MainApp";
import PrayerScreen from "./src/screens/PrayerScreen";

import {
  registerForPushNotificationsAsync,
  setupAngelusNotifications,
} from "./services/notifications";

type Screen = "login" | "register" | "main" | "prayer";

export default function App() {
  const [screen, setScreen] = useState<Screen>("prayer");

  useEffect(() => {
    async function initNotifications() {
      const granted = await registerForPushNotificationsAsync();

      if (granted) {
        await setupAngelusNotifications();
      }
    }

    initNotifications();
  }, []);

  const renderScreen = () => {
    switch (screen) {
      case "login":
        return (
          <LoginScreen
            onLogin={() => setScreen("main")}
            goToRegister={() => setScreen("register")}
          />
        );

      case "register":
        return <RegisterScreen goToLogin={() => setScreen("login")} />;

      case "main":
        return <MainApp />;

      case "prayer":
        return <PrayerScreen />;

      default:
        return <PrayerScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* TEST NAV BAR */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => setScreen("login")}>
          <Text style={styles.link}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setScreen("register")}>
          <Text style={styles.link}>Register</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setScreen("main")}>
          <Text style={styles.link}>Main</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setScreen("prayer")}>
          <Text style={styles.link}>Prayer</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>{renderScreen()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  nav: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    backgroundColor: "#eee",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },

  link: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2F4A7A",
  },

  content: {
    flex: 1,
  },
});
