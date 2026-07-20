import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Video, ResizeMode } from "expo-av";
import { FadeIn } from "../../shared/FadeIn";
import { sharedStyles, width, height } from "../styles/sharedStyles";
import {
  BLUE,
  GOLD,
  IVORY,
  TEXT_SECONDARY,
} from "../../../lib/constants/colors";
import {
  FONT_BODY,
  FONT_BODY_SEMIBOLD,
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

export function CommunitySlide({
  title,
  description,
  isActive,
  onNext,
  dotCount = 6,
  activeDotIndex = 4,
}: Props) {
  const mapHeight = height < 700 ? height * 0.3 : height * 0.34; // ← CHANGED (was 0.24 / 0.27)

  return (
    <View style={sharedStyles.slide}>
      <View style={styles.content}>
        {/* Globe illustration */}
        <FadeIn delay={80} isVisible={isActive} style={{ width: "100%", alignItems: "center" }}>
          <View style={styles.artworkWrap}>
            <Video
              source={require("../../../../assets/globe.mp4")}
              style={[styles.worldMap, { height: mapHeight }]}
              resizeMode={ResizeMode.CONTAIN}
              isLooping
              shouldPlay={isActive}
              isMuted
              useNativeControls={false} 
            />

            {/* Floating stat card, overlapping bottom of the globe */}
            <View style={styles.counterCard}>
              <Text style={styles.counterNumber}>12,468</Text>
              <Text style={styles.counterLabel}>prayed today.</Text>
            </View>
          </View>
        </FadeIn>

        {/* Title */}
        <FadeIn delay={480} isVisible={isActive}>
          <Text style={styles.title}>{title}</Text>
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
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingTop: 20,
    gap: 12,
  },
  artworkWrap: {
    width: "100%",
    alignItems: "center",
    marginBottom: 8,
  },
  worldMap: {
    width: width * 0.95, // ← CHANGED (was width * 0.78)
    maxWidth: 360, // ← CHANGED (was 280)
     marginTop: 24,
  },
  counterCard: {
    marginTop: -24,
    backgroundColor: "#F5F2E7",
    borderRadius: 18,
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  counterNumber: {
    fontFamily: FONT_TITLE_BOLD,
    fontSize: 30,
    color: GOLD,
    letterSpacing: 0.5,
    fontWeight: "700",
  },
  counterLabel: {
    fontFamily: FONT_BODY_SEMIBOLD,
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginTop: 2,
    fontWeight: "500",
  },
  title: {
    fontFamily: FONT_TITLE_BOLD,
    fontSize: width < 375 ? 28 : 32,
    color: BLUE,
    textAlign: "center",
    letterSpacing: 0.3,
    lineHeight: 38,
    fontWeight: "600",
  },
  ornamentRow: {
    flexDirection: "row",
    alignItems: "center",
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
  desc: {
    fontFamily: FONT_BODY,
    color: TEXT_SECONDARY,
    textAlign: "center",
    fontSize: 15,
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
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#D9DCE3",
  },
});