import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ImageBackground,
  StyleSheet,
} from "react-native";
import { FadeIn } from "../../shared/FadeIn";
import { sharedStyles } from "../styles/sharedStyles";
import { GOLD, IVORY } from "../../../lib/constants/colors";
import {
  FONT_BODY,
  FONT_TITLE_BOLD,
} from "../../../lib/constants/fonts";

const NAVY_DARK = "#16264A";
const CARD_BG = "rgba(246, 243, 232, 0.92)"; // #F6F3E8 transparent

type Props = {
  title: string;
  tagline: string;
  isActive: boolean;
  onGetStarted: () => void;
  dotCount?: number;
  activeDotIndex?: number;
};

export function BeginSlide({
  title,
  tagline,
  isActive,
  onGetStarted,
  dotCount = 6,
  activeDotIndex = 5,
}: Props) {
  return (
    <ImageBackground
      source={require("../../../../assets/bgchurch.png")}
      style={sharedStyles.slide}
      resizeMode="cover"
    >
      <FadeIn delay={200} isVisible={isActive} style={styles.cardWrap}>
        {/* Shadow layer — elevation/shadow live here, NOT combined with
            borderRadius+backgroundColor, so Android doesn't render a
            square shadow box behind the rounded card */}
        <View style={styles.cardShadow}>
          {/* Rounded, clipped background layer — content goes here */}
          <View style={styles.card}>
            {/* Bell icon — no circle background, just the asset */}
            <Image
              // ← replace with your gold bell icon asset
              source={require("../../../../assets/bell.png")}
              style={styles.bellIcon}
              resizeMode="contain"
            />

            {/* Title */}
            <Text style={styles.title}>{title}</Text>

            {/* Ornament divider */}
            <View style={styles.ornamentRow}>
              <View style={styles.ornamentLine} />
              <Text style={styles.ornamentMark}>✦</Text>
              <View style={styles.ornamentLine} />
            </View>

            {/* Tagline */}
            <Text style={styles.tagline}>{tagline}</Text>

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

            {/* Get Started button */}
            <TouchableOpacity
              onPress={onGetStarted}
              activeOpacity={0.85}
              style={styles.ctaBtn}
            >
              <Text style={styles.ctaText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>
      </FadeIn>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  // Shadow only — no backgroundColor, no borderRadius clipping content.
  // On iOS this drives shadowColor/shadowOffset/shadowOpacity/shadowRadius.
  // On Android only `elevation` renders, and because this View has no
  // opaque background of its own, Android won't draw a filled rectangle.
  cardShadow: {
    borderRadius: 28,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  // Actual rounded card — backgroundColor + borderRadius + overflow:hidden
  // so corners clip cleanly and this layer never has to cast its own shadow.
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 28,
    overflow: "hidden",
    paddingTop: 10,
    paddingBottom: 32,
    paddingHorizontal: 28,
    alignItems: "center",
  },
  bellIcon: {
    width: 80,
    height: 80,
    marginBottom: 0,
  },
  title: {
    fontFamily: FONT_TITLE_BOLD,
    fontSize: 34,
    color: NAVY_DARK,
    textAlign: "center",
    lineHeight: 40,
    fontWeight: "600",
  },
  ornamentRow: {
    flexDirection: "row",
    alignItems: "center",
    width: 120,
    marginTop: 0,
    marginBottom: 0,
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
  tagline: {
    fontFamily: FONT_BODY,
    fontSize: 17,
    color: "#6B7280",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
    marginBottom: 24,
  },
  dot: {
    borderRadius: 5,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 9,
    height: 9,
    backgroundColor: NAVY_DARK,
  },
  dotInactive: {
    width: 7,
    height: 7,
    backgroundColor: "#D9DCE3",
  },
  ctaBtn: {
    width: "100%",
    backgroundColor: NAVY_DARK,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  ctaText: {
    color: IVORY,
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});