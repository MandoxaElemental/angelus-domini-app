import React from "react";
import { SlideItemProps } from "../../../lib/types/onboarding";
import { ScriptureSlide } from "./ScriptureSlide";
import { WelcomeSlide } from "./WelcomeSlide";
import { RhythmSlide } from "./RhythmSlide";
import { CommunitySlide } from "./CommunitySlide";
import { MeditationSlide } from "./MeditationSlide";
import { BeginSlide } from "./BeginSlide";

export function SlideItem({
  s,
  index,
  currentScreen,
  onNext,
  onSkip,
  onGetStarted,
  onEnableNotifications,
}: SlideItemProps) {
  const isActive = currentScreen === index;

  switch (s.type) {
    case "scripture":
      return (
        <ScriptureSlide
          title={s.title}
          subtitle={s.subtitle}
          isActive={isActive}
          onPress={onNext}
        />
      );

    case "welcome":
      return (
        <WelcomeSlide
          title={s.title}
          description={s.description}
          prayerTimes={s.prayerTimes}
          isActive={isActive}
          onNext={onNext}
          onSkip={onSkip}
        />
      );

    case "rhythm":
      return (
        <RhythmSlide
          title={s.title}
          description={s.description}
          isActive={isActive}
          onNext={onNext}
        />
      );

    case "community":
      return (
        <CommunitySlide
          title={s.title}
          description={s.description}
          isActive={isActive}
          onNext={onNext}
        />
      );

    case "meditation":
      return (
        <MeditationSlide
          title={s.title}
          description={s.description}
          isActive={isActive}
          onNext={onNext}
        />
      );

    case "begin":
      return (
        <BeginSlide
          title={s.title}
          tagline={s.tagline}
          isActive={isActive}
          onGetStarted={onGetStarted}
        />
      );

    default:
      return null;
  }
}
