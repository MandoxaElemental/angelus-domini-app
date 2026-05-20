import React from "react";
import { View, Text, TouchableOpacity, ImageBackground, StyleSheet } from "react-native";
import { FadeIn } from "../../shared/FadeIn";
import { sharedStyles } from "../styles/sharedStyles";
import { GOLD, IVORY, BLUE } from "../../../lib/constants/colors";
import { FONT_TITLE_BOLD } from "../../../lib/constants/fonts";

type Props = {
  title: string;
  tagline: string;
  isActive: boolean;
  onGetStarted: () => void;
};

export function BeginSlide({ title, tagline, isActive, onGetStarted }: Props) {
  return (
    <ImageBackground
      source={require("../../../../assets/onboardchurch.png")}
      style={sharedStyles.slide}
      resizeMode="cover"
    >
      <View style={styles.topSection}>
        <FadeIn delay={180} isVisible={isActive}>
          <Text style={styles.title}>{title}</Text>
        </FadeIn>
        <FadeIn delay={800} isVisible={isActive}>
          <Text style={styles.tagline}>{tagline}</Text>
        </FadeIn>
      </View>
      <View style={sharedStyles.navArea}>
        <FadeIn delay={1100} isVisible={isActive} style={sharedStyles.ctaWrap}>
          <TouchableOpacity
            onPress={onGetStarted}
            style={[sharedStyles.primaryBtn, { backgroundColor: GOLD }]}
          >
            <Text style={[sharedStyles.primaryText, { color: IVORY }]}>Get Started</Text>
          </TouchableOpacity>
        </FadeIn>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  topSection: {
    width: "100%",
    alignItems: "center",
    paddingTop: 72,
    paddingHorizontal: 32,
  },
title: {
  fontFamily: "PlayfairDisplay_400Regular",  // hardcoded to test
  fontSize: 36,
  color: "#1F3A6E",
  paddingTop: 70,
  textAlign: "center",
  letterSpacing: 0.3,
  lineHeight: 48,
},
  tagline: {
    fontSize: 30,
    fontStyle: "italic",
    color: "#FFE6A7",
    textAlign: "center",
    marginTop: 10,
    letterSpacing: 0.3,
  },
});