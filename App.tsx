import { useEffect, useMemo, useState } from "react";
import "react-native-get-random-values";

import * as SplashScreen from "expo-splash-screen";

import {
  ActivityIndicator,
  Platform,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import { StatusBar } from "expo-status-bar";

import { GestureHandlerRootView } from "react-native-gesture-handler";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import {
  SafeAreaProvider,
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  initialWindowMetrics,
} from "react-native-safe-area-context";

import type { EdgeInsets, Rect } from "react-native-safe-area-context";

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_600SemiBold,
  useFonts,
} from "@expo-google-fonts/playfair-display";

import { NavigationContainer, useNavigation } from "@react-navigation/native";

import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import PrayerScreen from "./src/screens/PrayerScreen";

import TabLayout from "./src/navigation/TabLayout";

import { supabase } from "./src/lib/supabaseClient";

SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

const DEFAULT_WEB_INSETS: EdgeInsets = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

const DEFAULT_WEB_FRAME: Rect = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
};

async function testNotificationNow() {
  console.log("Test notification pressed");
}

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

function AppNavigator({
  initialRoute,
}: {
  initialRoute: "onboarding" | "login" | "register" | "main";
}) {
  return (
    <View style={{ flex: 1 }}>
      <DevNavbar />

      <View style={{ flex: 1 }}>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="onboarding">
            {(props) => (
              <OnboardingScreen
                {...props}
                onDone={async () => {
                  await AsyncStorage.setItem("onboarded", "true");
                  props.navigation.replace("register");
                }}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="register">
            {(props) => (
              <RegisterScreen
                {...props}
                goToLogin={() => props.navigation.replace("login")}
                goToHome={() => props.navigation.replace("main")}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="login">
            {(props) => (
              <LoginScreen
                {...props}
                onLogin={() => props.navigation.replace("main")}
                goToRegister={() => props.navigation.navigate("register")}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="main">
            {(props) => (
              <TabLayout
                {...props}
                onLogout={() => props.navigation.replace("login")}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="Prayer" component={PrayerScreen} />
        </Stack.Navigator>
      </View>
    </View>
  );
}

export default function App() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;

  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets] = useState<EdgeInsets>(initialInsets);

  const [frame] = useState<Rect>(initialFrame);

  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_600SemiBold,
  });

  const [isReady, setIsReady] = useState(false);

  const [initialRoute, setInitialRoute] = useState<
    "onboarding" | "login" | "register" | "main"
  >("onboarding");

  useEffect(() => {
    async function prepareApp() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const onboarded = await AsyncStorage.getItem("onboarded");

        if (session?.user) {
          setInitialRoute("main");
        } else if (onboarded === "true") {
          setInitialRoute("login");
        } else {
          setInitialRoute("onboarding");
        }

        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
      }
    }

    prepareApp();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {});

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isReady && (fontsLoaded || fontError)) {
      SplashScreen.hideAsync();
    }
  }, [isReady, fontsLoaded, fontError]);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? {
      insets: initialInsets,
      frame: initialFrame,
    };

    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  if (!isReady || (!fontsLoaded && !fontError)) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <AppNavigator initialRoute={initialRoute} />
        </NavigationContainer>

        <StatusBar style="auto" />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );

  if (Platform.OS === "web") {
    return (
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>
        <SafeAreaFrameContext.Provider value={frame}>
          <SafeAreaInsetsContext.Provider value={insets}>
            {content}
          </SafeAreaInsetsContext.Provider>
        </SafeAreaFrameContext.Provider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider initialMetrics={providerInitialMetrics}>
      {content}
    </SafeAreaProvider>
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
