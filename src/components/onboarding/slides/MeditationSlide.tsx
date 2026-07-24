import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { FadeIn } from "../../shared/FadeIn";
import { sharedStyles, width } from "../styles/sharedStyles";
import { BLUE, GOLD, IVORY, TEXT_SECONDARY } from "../../../lib/constants/colors";
import { FONT_BODY, FONT_TITLE_BOLD } from "../../../lib/constants/fonts";

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
  dotCount = 6,
  activeDotIndex = 5,
}: Props) {
  const titleFontSize = width < 375 ? 26 : 30;

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

        {/* Title */}
        <FadeIn delay={480} isVisible={isActive} style={{ marginTop: -8 }}>
          <Text style={[styles.title, { fontSize: titleFontSize }]}>
            {title}
          </Text>
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
          <Text style={styles.desc}>{description}</Text>
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

        <FadeIn delay={900} isVisible={isActive} style={sharedStyles.ctaWrap}>
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
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
   marginBottom: 30,
  },
  icons: {
     width: 300,
    height: 300,
    marginBottom: -130,
   
  },
  mary: {
     width: 400,
    height: 400,
     marginBottom: -70,
   
  },
  title: {
    fontFamily: FONT_TITLE_BOLD,
    color: BLUE,
    textAlign: "center",
    letterSpacing: 0.3,
    lineHeight: 36,
    fontWeight: "600",
  },
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
  desc: {
    fontFamily: FONT_BODY,
    fontSize: 15,
    color: "#6F8FAF",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 4,
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