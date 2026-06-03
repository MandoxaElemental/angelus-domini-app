import React, { useEffect, useMemo, useRef, useState } from "react";
import "react-native-get-random-values";
import * as SplashScreen from "expo-splash-screen";
import {
  ActivityIndicator,
  AppState,
  Platform,
  View,
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
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_600SemiBold,
  useFonts,
} from "@expo-google-fonts/playfair-display";
import { NavigationContainer } from "@react-navigation/native";
import * as Notifications from "expo-notifications";

import type { RootStackParamList } from "./src/navigation/types";
import { supabase } from "./src/lib/supabaseClient";
import { scheduleAngelusNotifications } from "./src/services/notificationService";
import TabLayout from "./src/navigation/TabLayout";

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

type Screen = "onboarding" | "register" | "login" | "main";

export default function App() {
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const timeSlot = response.notification.request.content.data
          ?.timeSlot as RootStackParamList["Prayer"]["timeSlot"] | undefined;

        if (!timeSlot) return;

        if (navigationRef.current?.isReady?.()) {
          navigationRef.current.navigate("Prayer", { timeSlot });
        }
      },
    );

    return () => sub.remove();
  }, []);

  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets] = useState<EdgeInsets>(initialInsets);
  const [frame] = useState<Rect>(initialFrame);
  const notificationResponseId = useRef<string | null>(null);

  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_600SemiBold,
    "Cormorant-Regular": require("./assets/fonts/Cormorant.ttf"),
    "Cormorant-SemiBold": require("./assets/fonts/CormorantGaramond-SemiBold.ttf"),
    "Cormorant-Bold": require("./assets/fonts/CormorantGaramond-Bold.ttf"),
    "Inter-Medium": require("./assets/fonts/Inter_18pt-Medium.ttf"),
    "EBGaramond-Regular": require("./assets/fonts/EBGaramond-Regular.ttf"),
    "EBGaramond-Medium": require("./assets/fonts/EBGaramond-Medium.ttf"),
    "EBGaramond-Bold": require("./assets/fonts/EBGaramond-Bold.ttf"),
  });

  const [isReady, setIsReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("onboarding");

  // ── Auth + initial screen ─────────────────────────────────────────────────
  useEffect(() => {
    async function prepareApp() {
      try {
        const result = (await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Supabase timeout")), 5000),
          ),
        ])) as any;

        const session = result?.data?.session ?? null;
        const onboarded = await AsyncStorage.getItem("onboarded");

        if (session?.user) {
          setScreen("main");
        } else if (onboarded === "true") {
          setScreen("login");
        } else {
          setScreen("onboarding");
        }
      } catch (e) {
        console.warn("prepareApp error:", e);
        const onboarded = await AsyncStorage.getItem("onboarded");
        setScreen(onboarded === "true" ? "login" : "onboarding");
      } finally {
        setIsReady(true);
      }
    }

    prepareApp();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setScreen("main");
      } else {
        const onboarded = await AsyncStorage.getItem("onboarded");
        setScreen(onboarded === "true" ? "login" : "onboarding");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Reschedule notifications on every app foreground ──────────────────────
  useEffect(() => {
    const ensureNotificationsScheduled = async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status === "granted") {
          await scheduleAngelusNotifications();
        }
      } catch (err) {
        console.warn("Notification reschedule error:", err);
      }
    };

    ensureNotificationsScheduled();

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        ensureNotificationsScheduled();
      }
    });

    return () => appStateSub.remove();
  }, []);

  // ── Notification tap → navigate to Prayer ────────────────────────────────
  useEffect(() => {
    const navigateToPrayer = () => {
      if (screen !== "main") return;
      const tryNavigate = (attempts = 0) => {
        if (navigationRef.current) {
          navigationRef.current.navigate("Prayer", { autoPlay: true });
        } else if (attempts < 20) {
          setTimeout(() => tryNavigate(attempts + 1), 150);
        }
      };
      tryNavigate();
    };

    // Case 1: App is open, user taps notification banner
    const tapSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const id = response.notification.request.identifier;
        if (notificationResponseId.current === id) return;
        notificationResponseId.current = id;
        navigateToPrayer();
      },
    );

    // Case 2: App was killed, user tapped notification to open it
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;

      const id = response.notification.request.identifier;

      const notificationDate = new Date(response.notification.date * 1000);
      const ageMs = Date.now() - notificationDate.getTime();
      if (ageMs > 30_000) return;

      notificationResponseId.current = id;
      navigateToPrayer();
    });

    return () => tapSub.remove();
  }, [screen]);

  // ── Hide splash ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (isReady && (fontsLoaded || fontError)) {
      SplashScreen.hideAsync();
    }
  }, [isReady, fontsLoaded, fontError]);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
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

  const handleOnboardingDone = async () => {
    await AsyncStorage.setItem("onboarded", "true");
    setScreen("register");
  };

  // const screenContent = () => {
  //   switch (screen) {
  //     case "onboarding":
  //       return <OnboardingScreen onDone={handleOnboardingDone} />;

  //     case "register":
  //       return (
  //         <RegisterScreen
  //           goToLogin={async () => {
  //             await AsyncStorage.setItem("onboarded", "true");
  //             setScreen("login");
  //           }}
  //           goToHome={async () => {
  //             await AsyncStorage.setItem("onboarded", "true");
  //             setScreen("main");
  //           }}
  //         />
  //       );

  //     case "login":
  //       return (
  //         <LoginScreen
  //           onLogin={() => setScreen("main")}
  //           goToRegister={() => setScreen("register")}
  //         />
  //       );

  //     case "main":
  //       return (
  //         <NavigationContainer ref={navigationRef}>
  //           <TabLayout onLogout={() => setScreen("login")} />
  //         </NavigationContainer>
  //       );

  //     default:
  //       return null;
  //   }
  // };

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer ref={navigationRef}>
          <TabLayout onLogout={() => setScreen("login")} />
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
