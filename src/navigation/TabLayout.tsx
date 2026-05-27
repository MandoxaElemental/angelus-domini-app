import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Platform, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import MainApp from "../screens/MainApp";
import MenuScreen from "../screens/MenuScreen";
import CommunityScreen from "../screens/CommunityScreen";
import SettingsScreen from "../screens/SettingsScreen";
import PrayerScreen from "../screens/PrayerScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

type Props = {
  onLogout: () => void;
};

function TabNavigator({ onLogout }: Props) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1F3A6E",
        tabBarInactiveTintColor: "#888",
        tabBarLabel: ({ color, children }) => (
          <Text
            style={{
              fontFamily: "PlayfairDisplay_400Regular",
              fontSize: 11,
              color,
              marginBottom: 2,
            }}
          >
            {children}
          </Text>
        ),
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: 56 + bottomPadding,
          backgroundColor: "#fff",
          borderTopColor: "#E8D9C0",
          borderTopWidth: 0.5,
        },
      }}
    >
  <Tab.Screen
  name="Home"
  component={MainApp}
  options={{
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="home" size={size} color={color} />
    ),
  }}
/>

      <Tab.Screen
  name="History"
  component={MenuScreen}
  options={{
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="time" size={size} color={color} />
    ),
  }}
/>
      <Tab.Screen
        name="Community"
        component={CommunityScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
   <Tab.Screen
  name="Settings"
  options={{
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="settings" size={size} color={color} />
    ),
  }}
>
  {() => <SettingsScreen onLogout={onLogout} />}
</Tab.Screen>
    </Tab.Navigator>
  );
}

export default function TabLayout({ onLogout }: Props) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs">
        {() => <TabNavigator onLogout={onLogout} />}
      </Stack.Screen>
      <Stack.Screen
        name="Prayer"
        component={PrayerScreen}
        options={{ animation: "slide_from_bottom" }}
      />
    </Stack.Navigator>
  );
}