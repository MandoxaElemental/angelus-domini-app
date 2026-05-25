import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Platform, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCallback } from "react";

import MainApp from "../screens/MainApp";
import MenuScreen from "../screens/MenuScreen";
import CommunityScreen from "../screens/CommunityScreen";
import SettingsScreen from "../screens/SettingsScreen";

const Tab = createBottomTabNavigator();

type Props = {
  onLogout: () => void;
};

export default function TabLayout({ onLogout }: Props) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#C8922A",
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
      {/* Pass onLogout as an initialParam to MainApp */}
      <Tab.Screen
        name="Home"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      >
        {() => <MainApp onLogout={onLogout} />}
      </Tab.Screen>

      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="menu" size={size} color={color} />
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
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}