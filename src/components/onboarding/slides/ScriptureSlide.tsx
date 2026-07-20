import React from "react";
import {
  TouchableOpacity,
  Text,
  View,
  ImageBackground,
  StyleSheet,
} from "react-native";
import { FadeIn } from "../../shared/FadeIn";
import { sharedStyles, width, height } from "../styles/sharedStyles";
import { BLUE, GOLD, IVORY } from "../../../lib/constants/colors";
import {
  FONT_BODY,
  FONT_TITLE_BOLD,
  FONT_TITLE_ITALIC,
} from "../../../lib/constants/fonts";

const NAVY = "#1F3A6E";
const NAVY_DARK = "#16264A";
const CARD_BG = "rgba(246, 243, 232, 0.88)"; // #F6F3E8 transparent

type Props = {
  title: string;
  subtitle: string;
  welcomeTitle?: string;
  welcomeSubtitle?: string;
  dotCount?: number;
  activeDotIndex?: number;
  isActive: boolean;
  onPress: () => void;
};

export function ScriptureSlide({
  title,
  subtitle,
  welcomeTitle = "Welcome to\nAngelus Domini",
  welcomeSubtitle = "Join Catholics around the world\npraying the Angelus each day.",
  dotCount = 6,
  activeDotIndex = 0,
  isActive,
  onPress,
}: Props) {
  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      style={{ width, height }}
    >
      <ImageBackground
        source={require("../../../../assets/bgsone.png")}
        style={sharedStyles.slide}
        resizeMode="cover"
      >
        <View style={sharedStyles.centerContent}>
          <FadeIn delay={180} isVisible={isActive}>
            <Text style={styles.scriptureMain}>{title}</Text>
          </FadeIn>
          <FadeIn delay={180} isVisible={isActive}>
            <Text style={styles.scriptureItalic}>{subtitle}</Text>
          </FadeIn>
        </View>

        <FadeIn delay={1000} isVisible={isActive} style={styles.cardWrap}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{welcomeTitle}</Text>

            <View style={styles.ornamentRow}>
              <View style={styles.ornamentLine} />
              <Text style={styles.ornamentMark}>✦</Text>
              <View style={styles.ornamentLine} />
            </View>

            <Text style={styles.cardSubtitle}>{welcomeSubtitle}</Text>

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

            <TouchableOpacity
              onPress={onPress}
              activeOpacity={0.85}
              style={styles.continueBtn}
            >
              <Text style={styles.continueText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </FadeIn>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scriptureMain: {
    fontFamily: FONT_TITLE_BOLD,
    fontSize: 40,
    color: BLUE,
    textAlign: "center",
    letterSpacing: 0.3,
    marginTop: -270,
    lineHeight: 46,
    fontWeight: "600",
  },
  scriptureItalic: {
    fontFamily: FONT_TITLE_ITALIC,
    fontSize: 34,
    fontStyle: "italic",
    color: "#FFE6A7",
    textAlign: "center",
    marginTop: -175,
    letterSpacing: 0.2,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cardWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 28,
    paddingTop: 20, // ← CHANGED from 32 — shifts text block up
    paddingBottom: 32,
    paddingHorizontal: 28,
    alignItems: "center",
    // ← REMOVED: shadowColor, shadowOffset, shadowOpacity, shadowRadius, elevation
  },
  cardTitle: {
    fontFamily: FONT_TITLE_BOLD,
    fontSize: 32, // ← CHANGED from 28 — bigger
    color: NAVY,
    textAlign: "center",
    lineHeight: 38, // ← CHANGED from 34 to match new font size
  },
  ornamentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10, // ← CHANGED from 14 — tighter spacing, moves subtitle up
    marginBottom: 10, // ← CHANGED from 14
    width: 120,
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
  cardSubtitle: {
    fontSize: 17, // ← CHANGED from 15 — bigger
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24, // ← CHANGED from 22 to match new font size
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 22,
    marginBottom: 26,
  },
  dot: {
    borderRadius: 5,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 9,
    height: 9,
    backgroundColor: NAVY,
  },
  dotInactive: {
    width: 7,
    height: 7,
    backgroundColor: "#D9DCE3",
  },
  continueBtn: {
    width: "100%",
    backgroundColor: NAVY_DARK,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  continueText: {
    color: IVORY,
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});