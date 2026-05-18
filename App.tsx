import { useCallback, useEffect, useMemo, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { ActivityIndicator, Platform, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  SafeAreaProvider,
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Bold,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_600SemiBold,
  useFonts,
} from "@expo-google-fonts/playfair-display";

import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import MainApp from "./src/screens/MainApp";
import { getToken } from "./src/store/auth";

SplashScreen.preventAutoHideAsync();

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

// ✅ Single type controls every screen in the app
type Screen = "onboarding" | "register" | "login" | "main";

export default function App() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  // --- Font loading ---
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Bold,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_600SemiBold,
  });

  // --- App state ---
  const [isReady, setIsReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("onboarding");

  // --- Safe area (web only) ---
  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
  }, [handleSafeAreaUpdate]);

  // --- App preparation ---
  useEffect(() => {
    async function prepareApp() {
      try {
        // RESET ONBOARDING FOR TESTING — remove this line when done testing
        await AsyncStorage.removeItem("onboarded");

        const token = await getToken();
        const onboarded = await AsyncStorage.getItem("onboarded");

        // ✅ Decide starting screen based on stored state
        if (token) {
          setScreen("main");
        } else if (onboarded === "true") {
          setScreen("login");
        } else {
          setScreen("onboarding");
        }

        await new Promise(resolve => setTimeout(resolve, 2500));
      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
      }
    }
    prepareApp();
  }, []);

  // --- Hide splash when fonts AND app are ready ---
  useEffect(() => {
    if (isReady && (fontsLoaded || fontError)) {
      SplashScreen.hideAsync();
    }
  }, [isReady, fontsLoaded, fontError]);

  // --- QueryClient ---
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  // --- Safe area metrics ---
  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  // --- Loading screen ---
  if (!isReady || (!fontsLoaded && !fontError)) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // --- Screen logic ---
  // Flow: onboarding → register → login → main
  const screenContent = () => {
    switch (screen) {

      case "onboarding":
        return (
          // ✅ Skip or Get Started → goes to RegisterScreen
          <OnboardingScreen onDone={() => setScreen("register")} />
        );

      case "register":
        return (
          <RegisterScreen
            // ✅ After successful registration → go to login
            goToLogin={async () => {
              await AsyncStorage.setItem("onboarded", "true");
              setScreen("login");
            }}
            // ✅ "Already have an account?" link → go to login
            goToLoginDirect={() => setScreen("login")}
          />
        );

      case "login":
        return (
          <LoginScreen
            // ✅ After successful login → go to main app
            onLogin={() => setScreen("main")}
            // ✅ "Don't have an account?" link → go to register
            goToRegister={() => setScreen("register")}
          />
        );

      case "main":
        return <MainApp />;

      default:
        return null;
    }
  };

  // --- Content wrapped in providers ---
  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        {screenContent()}
        <StatusBar style="auto" />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );

  // --- Web: manually override safe area context ---
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