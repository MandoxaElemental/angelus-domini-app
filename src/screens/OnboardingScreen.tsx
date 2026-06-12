import React, { useEffect } from "react";
import { StatusBar, ScrollView, Dimensions } from "react-native";
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_700Bold_Italic,
} from "@expo-google-fonts/playfair-display";

import { ONBOARDING_SLIDES } from "../lib/config/onboardingData";
import { useOnboarding } from "../lib/hooks/useOnboarding";
import { SlideItem } from "../components/onboarding/slides/SlideItem";

const { width } = Dimensions.get("window");

type Props = {
  onDone: () => void;
};

export default function OnboardingScreen({ onDone }: Props) {
  const {
    currentScreen,
    scrollRef,
    setCurrentScreen,
    handleNext,
    handleEnableNotifications,
  } = useOnboarding(onDone);

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_700Bold_Italic,
  });

  // useEffect(() => {
  //   if (fontsLoaded) SplashScreen.hideAsync();
  // }, [fontsLoaded]);

  // if (!fontsLoaded) return null;

  return (
    <>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setCurrentScreen(Math.round(e.nativeEvent.contentOffset.x / width))
        }
      >
        {ONBOARDING_SLIDES.map((s, i) => (
          <SlideItem
            key={s.id}
            s={s}
            index={i}
            currentScreen={currentScreen}
            onNext={handleNext}
            onSkip={onDone}
            onGetStarted={onDone}
            onEnableNotifications={handleEnableNotifications}
          />
        ))}
      </ScrollView>
    </>
  );
}
