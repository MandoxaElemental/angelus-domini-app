import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ImageSourcePropType,
} from "react-native";
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
  illustration: ImageSourcePropType;
  buttonText: string;
  statNumber?: string;
  statLabel?: string;
  isActive: boolean;
  onNext: () => void;
  dotCount?: number;
  activeDotIndex?: number;
};

export function BellsSlide({
  title,
  description,
  illustration,
  buttonText,
  statNumber,
  statLabel,
  isActive,
  onNext,
  dotCount = 6,
  activeDotIndex = 3,
}: Props) {
  const mapHeight = height < 700 ? height * 0.24 : height * 0.27;

  return (
    <View style={sharedStyles.slide}>
      <View style={styles.content}>
        {/* Illustration */}
        <FadeIn delay={80} isVisible={isActive}>
          <Image
            source={illustration}
            style={[styles.illustration, { height: mapHeight }]}
            resizeMode="contain"
          />
        </FadeIn>

        {/* Stat card — only renders when statNumber/statLabel are provided */}
        {statNumber && statLabel && (
          <FadeIn
            delay={280}
            isVisible={isActive}
            style={{ width: "100%", marginTop: 8 }}
          >
            <View style={styles.counterCard}>
              <Text style={styles.counterNumber}>{statNumber}</Text>
              <Text style={styles.counterLabel}>{statLabel}</Text>
            </View>
          </FadeIn>
        )}

        {/* Title */}
        <FadeIn delay={480} isVisible={isActive} style={{ marginTop: 18 }}>
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
              {buttonText}
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
  },
  illustration: {
    width: width * 0.7,
    maxWidth: 210,
  },
  counterCard: {
    backgroundColor: "rgba(246, 243, 232, 0.9)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: "center",
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
    backgroundColor: "#D9DCE3",
  },
});