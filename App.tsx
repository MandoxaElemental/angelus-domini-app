import { useEffect, useMemo, useRef, useState } from "react";
import "react-native-get-random-values";
import * as SplashScreen from "expo-splash-screen";
import { ActivityIndicator, Platform, View, Alert } from "react-native";
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

import LoginScreen      from "./src/screens/LoginScreen";
import RegisterScreen   from "./src/screens/RegisterScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import TabLayout        from "./src/navigation/TabLayout";
import { supabase, isJwtExpiredError } from "./src/lib/supabaseClient";
import { requestNotificationPermission } from "./src/services/notificationService";
import { startPrayer, completePrayer }   from "./src/api/prayerApi";
import {
  isWithinPrayerWindow,
  PRAYER_WINDOW_MINUTES,
  getCurrentPrayerWindow,
} from "./src/utils/prayer";

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  true,
    shouldSetBadge:   false,
  }),
});

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME:  Rect       = { x: 0, y: 0, width: 0, height: 0 };

const GRACE_MS = PRAYER_WINDOW_MINUTES * 60 * 1000;

type Screen = "onboarding" | "register" | "login" | "main";

export default function App() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame  = initialWindowMetrics?.frame  ?? DEFAULT_WEB_FRAME;

  const [insets] = useState<EdgeInsets>(initialInsets);
  const [frame]  = useState<Rect>(initialFrame);

  const navigationRef          = useRef<any>(null);
  const notificationResponseId = useRef<string | null>(null);

  // ── Store pending cold-launch notification so we can replay it once
  //    navigationRef is ready and screen === "main"
  const pendingNotificationResponse = useRef<Notifications.NotificationResponse | null>(null);
  const navigationReadyRef          = useRef(false);

  // ── Track which prayer hour we already auto-navigated for this session ─────
  const autoNavigatedHour = useRef<number>(-1);

  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_600SemiBold,
    "Cormorant-Regular":  require("./assets/fonts/Cormorant.ttf"),
    "Cormorant-SemiBold": require("./assets/fonts/CormorantGaramond-SemiBold.ttf"),
    "Cormorant-Bold":     require("./assets/fonts/CormorantGaramond-Bold.ttf"),
    "Inter-Medium":       require("./assets/fonts/Inter_18pt-Medium.ttf"),
    "EBGaramond-Regular": require("./assets/fonts/EBGaramond-Regular.ttf"),
    "EBGaramond-Medium":  require("./assets/fonts/EBGaramond-Medium.ttf"),
    "EBGaramond-Bold":    require("./assets/fonts/EBGaramond-Bold.ttf"),
  });

  const [isReady, setIsReady] = useState(false);
  const [screen,  setScreen]  = useState<Screen>("onboarding");

  // ── Shared sign-out helper ─────────────────────────────────────────────────
  const handleExpiredSession = async () => {
    try { await supabase.auth.signOut(); } catch {}
    const onboarded = await AsyncStorage.getItem("onboarded");
    setScreen(onboarded === "true" ? "login" : "onboarding");
  };

  // ── Build onComplete for notification taps ─────────────────────────────────
  const buildNotificationOnComplete = () => async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) return;
      const sess = await startPrayer(uid);
      await completePrayer(uid, sess.sessionId);
      console.log("[Angelus] Prayer completed via notification tap.");
    } catch (err: any) {
      if (isJwtExpiredError(err)) {
        console.warn("[Angelus] JWT expired in notification onComplete — signing out.");
        await handleExpiredSession();
        return;
      }
      console.error("[Angelus] onComplete (notification) error:", err);
    }
  };

  // ── Core navigate-to-Prayer logic (used by both tap cases) ────────────────
  const navigateToPrayer = (response: Notifications.NotificationResponse) => {
    const id = response.notification.request.identifier;
    if (notificationResponseId.current === id) return;
    notificationResponseId.current = id;

    const prayerHour = response.notification.request.content.data
      ?.prayerHour as number | undefined;

    if (prayerHour === undefined || !isWithinPrayerWindow(prayerHour)) {
      Alert.alert(
        "Prayer Window Closed",
        "This Angelus prayer has already ended."
      );
      return;
    }

    const onComplete = buildNotificationOnComplete();

    const tryNavigate = (attempts = 0) => {
      if (navigationRef.current && navigationReadyRef.current) {
        navigationRef.current.navigate("Prayer", { autoPlay: true, onComplete });
      } else if (attempts < 30) {
        setTimeout(() => tryNavigate(attempts + 1), 200);
      }
    };
    tryNavigate();
  };

  // ── Shared in-app auto-navigate logic ─────────────────────────────────────
  // Uses getCurrentPrayerWindow() — covers the full 5-minute grace window,
  // not just the exact top-of-hour second.
  // autoNavigatedHour ref ensures we only navigate once per prayer slot.
  const tryAutoNavigatePrayerWindow = () => {
    const window = getCurrentPrayerWindow();
    if (!window) return;

    const hour = window.prayer.hour;
    if (autoNavigatedHour.current === hour) return; // already navigated this slot
    if (!navigationRef.current || !navigationReadyRef.current) return;

    autoNavigatedHour.current = hour;
    const onComplete = buildNotificationOnComplete();
    navigationRef.current.navigate("Prayer", { autoPlay: true, onComplete });
    console.log(`[Angelus] In-app auto-navigate to PrayerScreen for ${window.prayer.title}`);
  };

  // ── Auth + initial screen ──────────────────────────────────────────────────
  useEffect(() => {
    async function prepareApp() {
      try {
        const result = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Supabase timeout")), 5000)
          ),
        ]) as any;

        const session   = result?.data?.session ?? null;
        const onboarded = await AsyncStorage.getItem("onboarded");

        if (session && (!session.access_token || !session.refresh_token)) {
          console.warn("[Auth] Invalid session tokens — signing out.");
          await handleExpiredSession();
          return;
        }

        if (session?.access_token) {
          const expiresAt = session.expires_at ?? 0;
          const nowSec = Math.floor(Date.now() / 1000);
          if (expiresAt < nowSec) {
            console.warn("[Auth] Token expired at startup — attempting refresh.");
            const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
            if (refreshErr || !refreshed.session) {
              console.warn("[Auth] Refresh failed at startup — signing out.");
              await handleExpiredSession();
              return;
            }
            setScreen("main");
            return;
          }
        }

        if (session?.user) {
          setScreen("main");
        } else if (onboarded === "true") {
          setScreen("login");
        } else {
          setScreen("onboarding");
        }
      } catch (e: any) {
        console.warn("prepareApp error:", e);
        await handleExpiredSession();
      } finally {
        setIsReady(true);
      }
    }

    prepareApp();

    // ── Check for cold-launch notification tap (app was killed) ─────────────
    // Store it — do NOT try to navigate yet; nav isn't mounted.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const prayerHour = response.notification.request.content.data
        ?.prayerHour as number | undefined;
      if (prayerHour === undefined || !isWithinPrayerWindow(prayerHour)) {
        console.log("[Angelus] Ignoring stale cold-launch notification.");
        return;
      }
      console.log("[Angelus] Cold-launch notification stored — will navigate when ready.");
      pendingNotificationResponse.current = response;
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (_event === "TOKEN_REFRESHED" && !session) {
          console.warn("[Auth] Token refresh failed — signing out.");
          await handleExpiredSession();
          return;
        }
        if (_event === "SIGNED_OUT") {
          const onboarded = await AsyncStorage.getItem("onboarded");
          setScreen(onboarded === "true" ? "login" : "onboarding");
          return;
        }
        if (session?.user) {
          setScreen("main");
        } else {
          const onboarded = await AsyncStorage.getItem("onboarded");
          setScreen(onboarded === "true" ? "login" : "onboarding");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Schedule notifications when user reaches main screen ──────────────────
  useEffect(() => {
    if (screen !== "main") return;
    const setupNotifications = async () => {
      console.log("[App] Scheduling notifications");
      try {
        await requestNotificationPermission();
      } catch (err) {
        console.warn("[Angelus] Notification setup error:", err);
      }
    };
    setupNotifications();
  }, [screen]);

  // ── Live notification tap listener (app is open/backgrounded) ─────────────
  useEffect(() => {
    const tapSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        if (screen !== "main") return;
        navigateToPrayer(response);
      }
    );
    return () => tapSub.remove();
  }, [screen]);

  // ── Auto-navigate to PrayerScreen within the 5-min grace window ───────────
  //  Case 1 — App opened mid-window (e.g. user opens at 6:02, grace still on):
  //            500ms mount timer fires, getCurrentPrayerWindow() returns the
  //            active slot, navigates immediately.
  //  Case 2 — App already open when time hits (e.g. sitting on MainApp at 6:00):
  //            setInterval fires every second, catches the window the moment
  //            it opens, navigates once.
  //  autoNavigatedHour ref prevents double-navigation in both cases.
  useEffect(() => {
    if (screen !== "main") return;

    // Case 1: already mid-window when screen becomes "main"
    const mountTimer = setTimeout(() => {
      tryAutoNavigatePrayerWindow();
    }, 500);

    // Case 2: app is open when the prayer time hits
    const id = setInterval(() => {
      tryAutoNavigatePrayerWindow();
    }, 1000);

    return () => {
      clearTimeout(mountTimer);
      clearInterval(id);
    };
  }, [screen]);

  // ── Replay cold-launch notification once navigation is ready ──────────────
  //    Called from NavigationContainer's onReady callback (see below).
  const onNavigationReady = () => {
    navigationReadyRef.current = true;
    if (pendingNotificationResponse.current) {
      console.log("[Angelus] Navigation ready — replaying cold-launch notification.");
      const response = pendingNotificationResponse.current;
      pendingNotificationResponse.current = null;
      // Small delay so TabLayout finishes mounting
      setTimeout(() => navigateToPrayer(response), 400);
    }
  };

  // ── Hide splash ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isReady && (fontsLoaded || fontError)) {
      SplashScreen.hideAsync();
    }
  }, [isReady, fontsLoaded, fontError]);

  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
    })
  );

  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top:    Math.max(metrics.insets.top,    16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  if (!isReady || (!fontsLoaded && !fontError)) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const handleOnboardingDone = async () => {
    await AsyncStorage.setItem("onboarded", "true");
    setScreen("register");
  };

  const screenContent = () => {
    switch (screen) {
      case "onboarding":
        return <OnboardingScreen onDone={handleOnboardingDone} />;

      case "register":
        return (
          <RegisterScreen
            goToLogin={async () => {
              await AsyncStorage.setItem("onboarded", "true");
              setScreen("login");
            }}
            goToHome={async () => {
              await AsyncStorage.setItem("onboarded", "true");
              setScreen("main");
            }}
          />
        );

      case "login":
        return (
          <LoginScreen
            onLogin={() => setScreen("main")}
            goToRegister={() => setScreen("register")}
          />
        );

      case "main":
        return (
          <NavigationContainer ref={navigationRef} onReady={onNavigationReady}>
            <TabLayout onLogout={() => setScreen("login")} />
          </NavigationContainer>
        );

      default:
        return null;
    }
  };

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <View style={{ flex: 1 }}>
          {screenContent()}
        </View>
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