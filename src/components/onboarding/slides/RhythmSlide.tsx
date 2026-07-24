import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { FadeIn } from "../../shared/FadeIn";
import { sharedStyles } from "../styles/sharedStyles";
import { BLUE, GOLD, IVORY, TEXT_SECONDARY } from "../../../lib/constants/colors";
import {
  FONT_BODY,
  FONT_TITLE_BOLD,
} from "../../../lib/constants/fonts";

const NAVY_DARK = "#16264A";

type Props = {
  title: string;
  description: string;
  isActive: boolean;
  onNext: () => void;
  dotCount?: number;
  activeDotIndex?: number;
};

export function RhythmSlide({
  title,
  description,
  isActive,
  onNext,
  dotCount = 6,
  activeDotIndex = 2,
}: Props) {
  return (
    <View style={sharedStyles.slide}>
      <View style={sharedStyles.centerContent}>
        {/* Illustration */}
        <FadeIn delay={100} isVisible={isActive}>
          <Image
            // ← REPLACE this path with your own phone + bell-tower image asset
            source={require("../../../../assets/notificationsbg.png")}
            style={styles.image}
            resizeMode="contain"
          />
        </FadeIn>

        {/* Title */}
        <FadeIn delay={480} isVisible={isActive}>
          <Text style={styles.heading}>{title}</Text>
        </FadeIn>

        {/* Ornament divider */}
        <FadeIn delay={620} isVisible={isActive}>
          <View style={styles.ornamentRow}>
            <View style={styles.ornamentLine} />
            <Text style={styles.ornamentMark}>✦</Text>
            <View style={styles.ornamentLine} />
          </View>
        </FadeIn>

        {/* Description */}
        <FadeIn delay={740} isVisible={isActive}>
          <Text style={styles.subheading}>{description}</Text>
        </FadeIn>
      </View>

      <View style={sharedStyles.navArea}>
        {/* Dots */}
        <View style={styles.dotsRow}>
          {Array.from({ length: dotCount }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeDotIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Continue button */}
        <FadeIn delay={940} isVisible={isActive} style={sharedStyles.ctaWrap}>
          <TouchableOpacity
            onPress={onNext}
            style={[sharedStyles.primaryBtn, { backgroundColor: NAVY_DARK }]}
          >
            <Text style={[sharedStyles.primaryText, { color: IVORY }]}>
              Continue
            </Text>
          </TouchableOpacity>
        </FadeIn>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: 300,
    height: 300,
    marginBottom: 18,
  },
  heading: {
    fontFamily: FONT_TITLE_BOLD,
    fontSize: 32,
    color: BLUE,
    textAlign: "center",
    letterSpacing: 0.2,
    lineHeight: 38,
    fontWeight: "600",
  },
  ornamentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 14,
    width: 130,
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
  subheading: {
    fontFamily: FONT_BODY,
    fontSize: 15,
    color: "#6F8FAF",
    textAlign: "center",
    lineHeight: 22,
  },
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