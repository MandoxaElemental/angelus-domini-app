import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { FadeIn } from "../../shared/FadeIn";
import { sharedStyles } from "../styles/sharedStyles";
import { BLUE, GOLD, IVORY, TEXT_SECONDARY } from "../../../lib/constants/colors";
import { FONT_BODY, FONT_BODY_SEMIBOLD, FONT_TITLE_BOLD } from "../../../lib/constants/fonts";

type Props = {
  title: string;
  description: string;
  prayerTimes: string[];
  isActive: boolean;
  onNext: () => void;
  onSkip: () => void;
};

export function WelcomeSlide({ title, description, prayerTimes, isActive, onNext, onSkip }: Props) {
  return (
    <View style={sharedStyles.slide}>
      <View style={sharedStyles.centerContent}>
        <FadeIn delay={100} isVisible={isActive}>
          <Image
            source={require("../../../../assets/angelusdominibell.png")}
            style={styles.appIcon}
            resizeMode="contain"
          />
        </FadeIn>
        <FadeIn delay={200} isVisible={isActive}>
          <Text style={styles.title}>{title}</Text>
        </FadeIn>
        <FadeIn delay={400} isVisible={isActive}>
          <Text style={styles.desc}>{description}</Text>
        </FadeIn>
        <FadeIn delay={720} isVisible={isActive}>
          <Text style={styles.goldTimes}>{prayerTimes.join("  ·  ")}</Text>
        </FadeIn>
      </View>
      <View style={sharedStyles.navArea}>
        <FadeIn delay={1060} isVisible={isActive} style={sharedStyles.ctaWrap}>
          <TouchableOpacity
            onPress={onNext}
            style={[sharedStyles.primaryBtn, { backgroundColor: BLUE }]}
          >
            <Text style={[sharedStyles.primaryText, { color: IVORY }]}>Continue</Text>
          </TouchableOpacity>
        </FadeIn>
        <FadeIn delay={1200} isVisible={isActive}>
          <TouchableOpacity onPress={onSkip} style={sharedStyles.skipUnderlineWrap}>
            <Text style={sharedStyles.skipUnderlineText}>Skip</Text>
          </TouchableOpacity>
        </FadeIn>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appIcon: {
    width: 160,
    height: 160,
    marginBottom: -6,
  },
  title: {
    fontFamily: FONT_TITLE_BOLD,
    fontSize: 40,
    color: BLUE,
    textAlign: "center",
    letterSpacing: 0.2,
    lineHeight: 42,
    marginBottom: 10,
  },
  desc: {
    fontFamily: FONT_BODY,
    color: TEXT_SECONDARY,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 4,
    lineHeight: 24,
    fontSize: 15,
  },
  goldTimes: {
    fontFamily: FONT_BODY_SEMIBOLD,
    color: GOLD,
    fontSize: 28,
    fontWeight: "700",
    marginTop: 80,
    textAlign: "center",
  },
});