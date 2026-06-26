import { ImageSourcePropType } from "react-native";

export type SlotItem = {
  label: string;
  time: string;
  image: ImageSourcePropType;
};

export type OnboardingSlide =
  | { id: number; type: "scripture"; title: string; subtitle: string }
  | { id: number; type: "welcome"; title: string; description: string; prayerTimes: string[] }
  | { id: number; type: "rhythm"; title: string; description: string; slots: SlotItem[] }
  | {
      id: number;
      type: "bells";
      title: string;
      description: string;
      illustration: ImageSourcePropType;
      buttonText: string;
      isNotificationSlide: boolean;
    }
  | { id: number; type: "community"; title: string; description: string; buttonText: string }
  | { id: number; type: "meditation"; title: string; description: string }
  | { id: number; type: "begin"; title: string; tagline: string };

export type SlideItemProps = {
  s: OnboardingSlide;
  index: number;
  currentScreen: number;
  onNext: () => void;
  onSkip: () => void;
  onGetStarted: () => void;
  onEnableNotifications: () => Promise<void>;
};