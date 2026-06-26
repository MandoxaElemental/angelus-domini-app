import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { FadeIn } from "../../shared/FadeIn";
import { sharedStyles, width } from "../styles/sharedStyles";
import { BLUE, IVORY, TEXT_SECONDARY } from "../../../lib/constants/colors";
import { FONT_BODY, FONT_TITLE_BOLD } from "../../../lib/constants/fonts";

type Props = {
  title: string;
  description: string;
  isActive: boolean;
  onNext: () => void;
};

export function MeditationSlide({
  title,
  description,
  isActive,
  onNext,
}: Props) {
  const titleFontSize = width < 375 ? 30 : 34;

  return (
    <View style={sharedStyles.slide}>
      <View style={styles.topSection}>
        <FadeIn delay={120} isVisible={isActive}>
          <Text style={[styles.title, { fontSize: titleFontSize }]}>
            {title}
          </Text>
        </FadeIn>
      </View>
      <View style={{ alignItems: "center" }}>
        <FadeIn delay={300} isVisible={isActive}>
          <Image
            source={require("../../../../assets/threeicons.png")}
            style={{ width, height: 240 }}
            resizeMode="contain"
          />
        </FadeIn>
        <FadeIn delay={420} isVisible={isActive} style={{ marginTop: -140 }}>
          <Image
            source={require("../../../../assets/mary-icon.png")}
            style={{ width: 350, height: 350 }}
            resizeMode="contain"
          />
        </FadeIn>
      </View>
      <FadeIn delay={560} isVisible={isActive} style={{ marginTop: -100 }}>
        <Text style={styles.desc}>{description}</Text>
      </FadeIn>
      <View style={sharedStyles.navArea}>
        <FadeIn delay={740} isVisible={isActive} style={sharedStyles.ctaWrap}>
          <TouchableOpacity
            onPress={onNext}
            style={[sharedStyles.primaryBtn, { backgroundColor: BLUE }]}
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
  topSection: {
    width: "100%",
    alignItems: "center",
    paddingTop: 90,
    paddingHorizontal: 32,
  },
  title: {
    fontFamily: FONT_TITLE_BOLD,
    fontSize: 40,
    color: BLUE,
    textAlign: "center",
    letterSpacing: 0.3,
    lineHeight: 44,
    fontWeight: "600",
  },
  desc: {
    fontFamily: FONT_BODY,
    fontSize: 15,
    color: TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 24,
  },
});
