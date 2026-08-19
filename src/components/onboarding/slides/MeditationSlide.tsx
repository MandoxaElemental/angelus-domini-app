import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { FadeIn } from "../../shared/FadeIn";
import { sharedStyles, width } from "../styles/sharedStyles";
import { BLUE, GOLD, IVORY } from "../../../lib/constants/colors";
import { FONT_BODY, FONT_BODY_SEMIBOLD } from "../../../lib/constants/fonts";
import { SectionHeader } from "../../sectionHeader";
import { OnboardingCard } from "./SectionCard";

const NAVY_DARK = "#16264A";

type Props = {
  title: string;
  description: string;
  isActive: boolean;
  onNext: () => void;
  dotCount?: number;
  activeDotIndex?: number;
};

export function MeditationSlide({
  title,
  description,
  isActive,
  onNext,
  dotCount = 5,
  activeDotIndex = 4,
}: Props) {
  // OLD title sizing
  const titleFontSize = width < 375 ? 30 : 34;

  return (
    <View style={sharedStyles.slide}>
      <View style={styles.content}>
        {/* Three prayer-time icons row */}
        <FadeIn delay={100} isVisible={isActive}>
          <Image
            source={require("../../../../assets/threeicons.png")}
            style={styles.icons}
            resizeMode="contain"
          />
        </FadeIn>

        {/* Mary illustration */}
        <FadeIn delay={280} isVisible={isActive} style={{ marginTop: -16 }}>
          <Image
            source={require("../../../../assets/mary-icon.png")}
            style={styles.mary}
            resizeMode="contain"
          />
        </FadeIn>

        <OnboardingCard
          title={title}
          description={description}
          isActive={isActive}
          onNext={onNext}
          activeDotIndex={activeDotIndex}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: "center",
    marginBottom: 30,
  },

  // NEW DESIGN
  icons: {
    width: 300,
    height: 300,
    marginBottom: -130,
  },

  // NEW DESIGN
  mary: {
    width: 400,
    height: 400,
    marginBottom: -70,
  },

  // OLD FONT STYLE
  title: {
    fontFamily: FONT_BODY_SEMIBOLD,
    color: BLUE,
    textAlign: "center",
    letterSpacing: 0.3,
    lineHeight: 44,
    fontWeight: "400",
  },

  // NEW DESIGN ornament
  ornamentRow: {
    flexDirection: "row",
    alignItems: "center",
    width: 130,
    marginTop: 14,
    marginBottom: 14,
  },

  ornamentLine: {
    flex: 1,
    height: 1,
    backgroundColor: GOLD,
    opacity: 0.6,
  },

  ornamentMark: {
    color: GOLD,
    fontSize: 14,
    marginHorizontal: 8,
  },

  // OLD FONT STYLE
  desc: {
    fontFamily: FONT_BODY,
    fontSize: 20,
    color: "#6F8FAF",
    textAlign: "center",
    lineHeight: 24,
  },

  // NEW DESIGN navigation
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  dot: {
    borderRadius: 5,
    marginHorizontal: 4,
  },

  dotActive: {
    width: 9,
    height: 9,
    backgroundColor: BLUE,
  },

  dotInactive: {
    width: 7,
    height: 7,
    backgroundColor: "#D9DCE3",
  },
});
