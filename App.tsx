import React, { useEffect, useMemo, useRef, useState } from "react";
import "react-native-get-random-values";
// import * as SplashScreen from "expo-splash-screen";
import {
  ActivityIndicator,
  AppState,
  Platform,
  View,
  StyleSheet,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import NetInfo from "@react-native-community/netinfo";

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
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();
import { NavigationContainer } from "@react-navigation/native";
import * as Notifications from "expo-notifications";

import { supabase } from "./src/lib/supabaseClient";
import {
  getAngelusMode,
  scheduleAngelusNotifications,
} from "./src/services/notificationService";
import TabLayout from "./src/navigation/TabLayout";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import LoginScreen from "./src/screens/LoginScreen";
import {
  completePrayer,
  initializeOfflineStorage,
  startPrayer,
} from "./src/api/prayerApi";
import { syncOfflinePrayers } from "./services/syncOfflinePrayers";
import { syncUserTimezone } from "./src/api/userApi";
import { getUserTimezone } from "./src/utils/timezone";

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
  const pendingPrayerNavigation = useRef(false);
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets] = useState<EdgeInsets>(initialInsets);
  const [frame] = useState<Rect>(initialFrame);
  const notificationResponseId = useRef<string | null>(null);

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          syncOfflinePrayers(user.id);
        }
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setScreen("login");
      } else if (session) {
        setScreen("main");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);
  const [screen, setScreen] = useState<Screen>("onboarding");

  // ── Auth + initial screen ─────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function prepareApp() {
      try {
        // Was the app launched by tapping a notification?
        const lastResponse =
          await Notifications.getLastNotificationResponseAsync();

        if (lastResponse) {
          pendingPrayerNavigation.current = true;

          // Prevent handling the same notification again later.
          notificationResponseId.current =
            lastResponse.notification.request.identifier;

          await Notifications.clearLastNotificationResponseAsync();
        }

        const onboarded = await AsyncStorage.getItem("onboarded");

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session) {
          setScreen("main");
        } else if (onboarded === "true") {
          setScreen("login");
        } else {
          setScreen("onboarding");
        }
      } catch (e) {
        const onboarded = await AsyncStorage.getItem("onboarded");

        if (!mounted) return;
        setScreen(onboarded === "true" ? "login" : "onboarding");
      } finally {
        if (mounted) setIsReady(true);
      }
    }

    prepareApp();

    return () => {
      mounted = false;
    };
  }, []);

  // ── Reschedule notifications on every app foreground ──────────────────────
  useEffect(() => {
    const handleActive = async () => {
      try {
        await initializeOfflineStorage();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          await syncUserTimezone();
          await syncOfflinePrayers(user.id);
        }

        const { status } = await Notifications.getPermissionsAsync();

        if (status === "granted") {
          const mode = await getAngelusMode();
          await scheduleAngelusNotifications(mode);
        }
      } catch (err) {
        console.warn("App active initialization error:", err);
      }
    };

    handleActive();

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        handleActive();
      }
    });

    return () => appStateSub.remove();
  }, []);

  // ── Notification tap → navigate to Prayer ────────────────────────────────
  const navigateToPrayer = async () => {
    pendingPrayerNavigation.current = false;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const timezone = getUserTimezone();

      const session = await startPrayer(user.id, timezone);

      navigationRef.current?.navigate("Prayer", {
        autoPlay: true,
        onComplete: async () => {
          await completePrayer(user.id, session.sessionId);
        },
      });
    } catch (error) {
      console.warn("Prayer navigation failed:", error);
    }
  };

  useEffect(() => {
    const tapSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const id = response.notification.request.identifier;

        if (notificationResponseId.current === id) return;

        notificationResponseId.current = id;

        if (navigationRef.current?.isReady?.()) {
          navigateToPrayer();
        } else {
          pendingPrayerNavigation.current = true;
        }
      },
    );

    return () => tapSub.remove();
  }, []);

  useEffect(() => {
    if (screen !== "main") return;

    if (!pendingPrayerNavigation.current) return;

    if (!navigationRef.current?.isReady?.()) return;

    pendingPrayerNavigation.current = false;

    navigateToPrayer();
  }, [screen]);

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

  if (!isReady) {
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

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        {screen === "main" ? (
          <NavigationContainer
            ref={navigationRef}
            onReady={() => {
              if (pendingPrayerNavigation.current) {
                navigateToPrayer();
              }
            }}
          >
            <TabLayout onLogout={() => setScreen("login")} />
          </NavigationContainer>
        ) : screen === "onboarding" ? (
          <OnboardingScreen onDone={handleOnboardingDone} />
        ) : screen === "register" ? (
          <RegisterScreen
            goToLogin={() => setScreen("login")}
            goToHome={() => setScreen("main")}
          />
        ) : (
          <LoginScreen
            onLogin={() => setScreen("main")}
            goToRegister={() => setScreen("register")}
          />
        )}

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
