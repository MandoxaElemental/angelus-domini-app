import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

import { NavigationContainer, useNavigation } from "@react-navigation/native";

import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import MainApp from "./src/screens/MainApp";
import PrayerScreen from "./src/screens/PrayerScreen";

import { testNotificationNow } from "./services/notifications";

const Stack = createNativeStackNavigator();

function DevNavbar() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.nav}>
      <TouchableOpacity onPress={() => navigation.navigate("login")}>
        <Text style={styles.link}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("register")}>
        <Text style={styles.link}>Register</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("main")}>
        <Text style={styles.link}>Main</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Prayer")}>
        <Text style={styles.link}>Prayer</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={testNotificationNow}>
        <Text style={styles.link}>Test Notification</Text>
      </TouchableOpacity>
    </View>
  );
}

function AppNavigator() {
  return (
    <View style={{ flex: 1 }}>
      {/* DEV NAVBAR */}
      <DevNavbar />

      {/* SCREENS */}
      <View style={{ flex: 1 }}>
        <Stack.Navigator
          initialRouteName="login"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="login" component={LoginScreen} />

          <Stack.Screen name="register" component={RegisterScreen} />

          <Stack.Screen name="main" component={MainApp} />

          <Stack.Screen name="Prayer" component={PrayerScreen} />
        </Stack.Navigator>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "#eee",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },

  link: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2F4A7A",
  },
});
