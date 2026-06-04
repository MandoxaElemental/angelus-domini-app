import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
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
  FONT_TITLE_ITALIC,
} from "../../../lib/constants/fonts";

type Props = {
  title: string;
  description: string;
  isActive: boolean;
  onNext: () => void;
};

export function CommunitySlide({
  title,
  description,
  isActive,
  onNext,
}: Props) {
  const mapHeight = height < 700 ? height * 0.28 : height * 0.32;

  return (
    <View style={sharedStyles.slide}>
      <View style={styles.content}>
        <FadeIn delay={80} isVisible={isActive}>
          <Image
            source={require("../../../../assets/globe_prayer.png")}
            style={[styles.worldMap, { height: mapHeight }]}
            resizeMode="contain"
          />
        </FadeIn>
        <FadeIn delay={400} isVisible={isActive}>
          <Text style={styles.title}>{title}</Text>
        </FadeIn>
        <FadeIn delay={600} isVisible={isActive}>
          <Text style={styles.desc}>{description}</Text>
        </FadeIn>
        <FadeIn delay={800} isVisible={isActive} style={{ width: "100%" }}>
          <View style={styles.counterCard}>
            <Text style={styles.counterNumber}>12,468</Text>
            <Text style={styles.counterLabel}>prayed today.</Text>
            <Text style={styles.counterTagline}>One prayer. One Church.</Text>
          </View>
        </FadeIn>
      </View>
      <View style={sharedStyles.navArea}>
        <FadeIn delay={1000} isVisible={isActive} style={sharedStyles.ctaWrap}>
          <TouchableOpacity
            onPress={onNext}
            style={[sharedStyles.primaryBtn, { backgroundColor: GOLD }]}
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
    paddingTop: 30,
    gap: 14,
  },
  worldMap: {
    width: width * 0.78,
    maxWidth: 230,
    marginBottom: -50,
  },
  title: {
    fontFamily: FONT_TITLE_BOLD,
    fontSize: width < 375 ? 30 : 34,
    color: BLUE,
    textAlign: "center",
    letterSpacing: 0.3,
    lineHeight: 40,
  },
  desc: {
    fontFamily: FONT_BODY,
    color: TEXT_SECONDARY,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 23,
    paddingHorizontal: 4,
  },
  counterCard: {
    backgroundColor: BLUE,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 28,
    alignItems: "center",
    width: "100%",
  },
  counterNumber: {
    fontFamily: FONT_TITLE_BOLD,
    fontSize: width < 375 ? 36 : 42,
    color: GOLD,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  counterLabel: {
    fontFamily: FONT_BODY_SEMIBOLD,
    fontSize: 15,
    color: IVORY,
    marginBottom: 4,
  },
  counterTagline: {
    fontFamily: FONT_TITLE_ITALIC,
    fontSize: 13,
    color: "rgba(253,250,240,0.65)",
    letterSpacing: 0.3,
  },
});
