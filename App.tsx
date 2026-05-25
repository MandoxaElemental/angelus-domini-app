import { useEffect, useMemo, useState } from "react";
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
import type { EdgeInsets, Rect } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Bold,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_600SemiBold,
  useFonts,
} from "@expo-google-fonts/playfair-display";
import { NavigationContainer } from "@react-navigation/native";

import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import TabLayout from "./src/navigation/TabLayout";
import { getToken } from "./src/store/auth";

SplashScreen.preventAutoHideAsync();

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

type Screen = "onboarding" | "register" | "login" | "main";

export default function App() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Bold,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_600SemiBold,
  });

  const [isReady, setIsReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("onboarding");

  useEffect(() => {
    async function prepareApp() {
      try {
        await AsyncStorage.removeItem("onboarded"); // remove when done testing

        const token = await getToken();
        const onboarded = await AsyncStorage.getItem("onboarded");

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
      })
  );

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

  if (!isReady || (!fontsLoaded && !fontError)) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const screenContent = () => {
    switch (screen) {
      case "onboarding":
        return <OnboardingScreen onDone={() => setScreen("register")} />;

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

      // ✅ NavigationContainer only mounts here — tabs never show on other screens
      case "main":
        return (
          <NavigationContainer>
            <TabLayout onLogout={() => setScreen("login")} />
          </NavigationContainer>
        );

      default:
        return null;
    }
  };

  // ✅ No NavigationContainer here — only plain View wrapping
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