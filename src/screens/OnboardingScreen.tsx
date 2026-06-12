import React, { useEffect } from "react";
import { StatusBar, ScrollView, Dimensions } from "react-native";
import { ONBOARDING_SLIDES } from "../lib/config/onboardingData";
import { useOnboarding } from "../lib/hooks/useOnboarding";
import { SlideItem } from "../components/onboarding/slides/SlideItem";
import { useFonts } from "expo-font";

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
    PlayfairDisplay: require("../../assets/fonts/PlayfairDisplay.ttf"),
    PlayfairDisplay_Italic: require("../../assets/fonts/PlayfairDisplay-Italic.ttf"),
    Inter: require("../../assets/fonts/Inter.ttf"),
  });

  // useEffect(() => {
  //   if (fontsLoaded) SplashScreen.hideAsync();
  // }, [fontsLoaded]);

  if (!fontsLoaded) return null;

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
