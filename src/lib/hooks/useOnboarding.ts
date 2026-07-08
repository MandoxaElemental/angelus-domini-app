import { useState, useRef } from "react";
import { ScrollView, Dimensions } from "react-native";
import { ONBOARDING_SLIDES } from "../config/onboardingData";
import { requestNotificationPermission } from "../../services/notificationService";

const { width } = Dimensions.get("window");

export function useOnboarding(onDone: () => void) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const goTo = (i: number) => {
    setCurrentScreen(i);
    scrollRef.current?.scrollTo({ x: i * width, animated: true });
  };

  const handleNext = () => {
    const next = currentScreen + 1;
    if (next < ONBOARDING_SLIDES.length) {
      goTo(next);
    } else {
      onDone();
    }
  };

  const handleEnableNotifications = async () => {
    await requestNotificationPermission();
    handleNext();
  };

  return {
    currentScreen,
    scrollRef,
    setCurrentScreen,
    handleNext,
    handleEnableNotifications,
  };
}
