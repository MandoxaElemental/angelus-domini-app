import React, { useEffect, useMemo, useRef, useState } from "react";
import "react-native-get-random-values";
import {
  ActivityIndicator,
  AppState,
  Platform,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { StatusBar } from "expo-status-bar";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";

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
import NetInfo from "@react-native-community/netinfo";

import { supabase } from "./src/lib/supabaseClient";
import {
  getAngelusMode,
  scheduleAngelusNotifications,
  resetLaunchScheduleFlag,
} from "./src/services/notificationService";
import { startAutoSync, isOnline } from "./src/services/offlineSync";
import TabLayout from "./src/navigation/TabLayout";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import LoginScreen from "./src/screens/LoginScreen";

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

// Breadcrumb — set the moment the app successfully lands on "main" while
// online with a real session. Used as a trust signal any time a session
// read comes back empty (timeout, flaky network, refresh hiccup — NOT
// necessarily an actual logout). Only cleared on an explicit logout.
// Without this, being offline OR having a slow/failed session check at
// launch would look identical to "actually signed out."
const LAST_LOGGED_IN_KEY = "angelus_last_logged_in";

type Screen = "onboarding" | "register" | "login" | "main";

// ── Offline popup card ──────────────────────────────────────────────────────
// Renders as a centered dismissible card overlay, above whatever is
// currently showing (onboarding/login/main — doesn't matter). Purely
// presentational; App.tsx owns the connectivity state below. Manages its
// own "dismissed" state internally so the X button can close it without
// touching any other app logic — it resets whenever `visible` flips back
// to true (i.e. the device goes offline again after being online).
function OfflineBanner({ visible, topInset }: { visible: boolean; topInset: number }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (visible) {
      setDismissed(false);
    }
  }, [visible]);

  if (!visible || dismissed) return null;

  return (
    <View
      style={[offlineBannerStyles.overlay, { paddingTop: topInset }]}
      pointerEvents="box-none"
    >
      <View style={offlineBannerStyles.card}>
        <View style={offlineBannerStyles.iconWrap}>
          <Ionicons name="cloud-offline-outline" size={15} color="#D4AF6A" />
        </View>

        <Text style={offlineBannerStyles.text} numberOfLines={2}>
          You're offline. Your prayer progress will update when you're back online.
        </Text>

        <TouchableOpacity
          onPress={() => setDismissed(true)}
          style={offlineBannerStyles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={14} color="rgba(245,240,230,0.75)" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const offlineBannerStyles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 999,
    elevation: 999,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginHorizontal: 40,
    backgroundColor: "#1B2A4A",
    borderRadius: 10,
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: 8,
    borderWidth: 1,
    borderColor: "rgba(212,175,106,0.35)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  iconWrap: {
    marginRight: 7,
  },
  closeButton: {
    marginLeft: 8,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flex: 1,
    color: "#F5F0E6",
    fontSize: 12.5,
    lineHeight: 16,
    fontFamily: "CormorantGaramond_600SemiBold",
  },
});
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const navigationRef = useRef<any>(null);

  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets] = useState<EdgeInsets>(initialInsets);
  const [frame] = useState<Rect>(initialFrame);
  const notificationResponseId = useRef<string | null>(null);

  const [isReady, setIsReady] = useState(false);

  // ── Offline banner state ────────────────────────────────────────────────
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let mounted = true;

    NetInfo.fetch().then((state) => {
      if (!mounted) return;
      setIsOffline(!(state.isConnected && state.isInternetReachable !== false));
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!(state.isConnected && state.isInternetReachable !== false));
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

  // Set during prepareApp() (before splash hides) if the app was cold-
  // started by tapping an Angelus notification. Read once at mount to
  // decide TabLayout's initial route.
  const [launchNotificationRoute, setLaunchNotificationRoute] = useState<{
    screen: "Prayer";
    params?: any;
  } | null>(null);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  const [screen, setScreen] = useState<Screen>("onboarding");

  // ── Reset the per-launch schedule flag on every fresh app open, and
  // start the offline sync loop (immediate sync attempt + connectivity
  // listener + interval fallback — see offlineSync.ts) ─────────────────────
  useEffect(() => {
    resetLaunchScheduleFlag();
    startAutoSync();
  }, []);

  // FIX: remember "we were genuinely logged in" so a later launch can
  // trust that instead of being forced to Login just because a session
  // read came back empty/timed out (offline OR flaky network while
  // online — both are treated the same way now).
  useEffect(() => {
    if (screen === "main") {
      AsyncStorage.setItem(LAST_LOGGED_IN_KEY, "true").catch(() => {});
    }
  }, [screen]);

  // FIX: launchNotificationRoute must only ever apply to the ONE TabLayout
  // mount that immediately follows the cold-start check in prepareApp().
  // Without this, it stays in state forever — so logging in after a
  // required-login flow (or logging out and back in later) would keep
  // re-applying a stale notification route and dump you on Prayer instead
  // of Home, with no notification involved at all.
  useEffect(() => {
    if (screen === "main" && launchNotificationRoute) {
      setLaunchNotificationRoute(null);
    }
  }, [screen]);

  // ── Auth + initial screen ─────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function prepareApp() {
      try {
        // Check whether this cold start was caused by tapping an Angelus
        // notification, BEFORE the splash hides and BEFORE any tab
        // mounts. This lets TabLayout mount straight onto "Prayer"
        // instead of flashing "Tabs" -> Home first.
        try {
          const lastResponse = await Notifications.getLastNotificationResponseAsync();
          if (lastResponse) {
            notificationResponseId.current =
              lastResponse.notification.request.identifier;
            if (mounted) {
              setLaunchNotificationRoute({
                screen: "Prayer",
                params: { autoPlay: true },
              });
            }
            await Notifications.clearLastNotificationResponseAsync();
          }
        } catch (e) {
          console.log("notification launch check error:", e);
        }

        const onboarded = await AsyncStorage.getItem("onboarded");
        console.log("onboarded:", onboarded);

        // getSession() can silently try to refresh an expired/near-expired
        // access token over the network — offline, that either errors or
        // hangs until the timeout below. We shorten the timeout when
        // offline (no point waiting the full 5s for something that can't
        // succeed).
        const online = await isOnline();

        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), online ? 5000 : 1500),
        );

        const result = await Promise.race([sessionPromise, timeoutPromise]);

        const session =
          result && typeof result === "object" && "data" in result
            ? (result as any).data?.session
            : null;

        if (!mounted) return;

        if (session?.user) {
          setScreen("main");
        } else {
          // FIX: a null/empty session read here is NOT the same thing as
          // an explicit logout — it can just as easily be a timeout, a
          // race with the timer above, or a flaky network blip while
          // still online. Trust the LAST_LOGGED_IN_KEY breadcrumb in
          // every case (online or offline) instead of only offline.
          // MainApp's own auth effect (refreshSession -> getSession ->
          // wait for INITIAL_SESSION) will reconcile the real session
          // once it lands.
          const wasLoggedIn = await AsyncStorage.getItem(LAST_LOGGED_IN_KEY);
          if (wasLoggedIn === "true") {
            setScreen("main");
          } else if (onboarded === "true") {
            setScreen("login");
          } else {
            setScreen("onboarding");
          }
        }
      } catch (e) {
        console.log("startup error:", e);

        const onboarded = await AsyncStorage.getItem("onboarded");
        const wasLoggedIn = await AsyncStorage.getItem(LAST_LOGGED_IN_KEY);

        if (!mounted) return;

        if (wasLoggedIn === "true") {
          setScreen("main");
        } else {
          setScreen(onboarded === "true" ? "login" : "onboarding");
        }
      } finally {
        if (mounted) setIsReady(true);
      }
    }

    prepareApp();

    return () => {
      mounted = false;
    };
  }, []);

  // ── Reschedule notifications when app returns to foreground ──────────────
  useEffect(() => {
    const hasMounted = { current: false };

    const appStateSub = AppState.addEventListener("change", async (state) => {
      if (state === "active" && hasMounted.current) {
        try {
          const { status } = await Notifications.getPermissionsAsync();
          if (status === "granted") {
            await resetLaunchScheduleFlag();
            const mode = await getAngelusMode();
            await scheduleAngelusNotifications(mode);
          }
        } catch (err) {
          console.warn("Notification reschedule error:", err);
        }
      }
      if (state === "active") {
        hasMounted.current = true;
      }
    });

    return () => appStateSub.remove();
  }, []);

  // ── Notification tap → navigate to Prayer (warm/background app only) ────
  useEffect(() => {
    const navigateToPrayer = () => {
      if (screen !== "main") return;
      const tryNavigate = (attempts = 0) => {
        if (navigationRef.current) {
          navigationRef.current.reset({
            index: 0,
            routes: [{ name: "Prayer", params: { autoPlay: true } }],
          });
        } else if (attempts < 20) {
          setTimeout(() => tryNavigate(attempts + 1), 150);
        }
      };
      tryNavigate();
    };

    const tapSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const id = response.notification.request.identifier;
        if (notificationResponseId.current === id) return;
        notificationResponseId.current = id;
        navigateToPrayer();
      },
    );

    return () => tapSub.remove();
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
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const handleOnboardingDone = async () => {
    await AsyncStorage.setItem("onboarded", "true");
    setScreen("register");
  };

  // FIX: this is the ONLY place a real logout happens, so it's the only
  // place LAST_LOGGED_IN_KEY should be cleared. Without this, the
  // breadcrumb fallback above would just silently bounce a genuinely
  // logged-out user straight back to "main" on the next cold start.
  const handleLogout = async () => {
    await AsyncStorage.removeItem(LAST_LOGGED_IN_KEY).catch(() => {});
    setScreen("login");
  };

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        {screen === "main" ? (
          <NavigationContainer ref={navigationRef}>
            <TabLayout
              onLogout={handleLogout}
              initialNotificationRoute={launchNotificationRoute}
            />
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

      <OfflineBanner visible={isOffline} topInset={insets.top} />
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