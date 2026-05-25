import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { FadeIn } from "../../shared/FadeIn";
import { sharedStyles } from "../styles/sharedStyles";
import { BLUE, GOLD, IVORY, TEXT_SECONDARY } from "../../../lib/constants/colors";
import { FONT_BODY, FONT_BODY_SEMIBOLD, FONT_TITLE_BOLD } from "../../../lib/constants/fonts";
import { SlotItem } from "../../../lib/types/onboarding";

type Props = {
  title: string;
  description: string;
  slots: SlotItem[];
  isActive: boolean;
  onNext: () => void;
};

export function RhythmSlide({ title, description, slots, isActive, onNext }: Props) {
  return (
    <View style={sharedStyles.slide}>
      <View style={sharedStyles.centerContent}>
        <FadeIn delay={100} isVisible={isActive}>
          <Text style={styles.heading}>{title}</Text>
        </FadeIn>
        <FadeIn delay={260} isVisible={isActive}>
          <Text style={styles.subheading}>{description}</Text>
        </FadeIn>
        <View style={styles.rhythmList}>
          {slots.map((slot, i) => (
            <FadeIn
              key={slot.label}
              delay={380 + i * 140}
              isVisible={isActive}
              style={styles.cardWrap}
            >
              <Image source={slot.image} style={styles.image} resizeMode="contain" />
              <View style={styles.textWrap}>
                <Text style={styles.cardLabel}>{slot.label}</Text>
                <Text style={styles.cardTime}>{slot.time}</Text>
              </View>
            </FadeIn>
          ))}
        </View>
      </View>
      <View style={sharedStyles.navArea}>
        <FadeIn delay={840} isVisible={isActive} style={sharedStyles.ctaWrap}>
          <TouchableOpacity
            onPress={onNext}
            style={[sharedStyles.primaryBtn, { backgroundColor: GOLD }]}
          >
            <Text style={[sharedStyles.primaryText, { color: IVORY }]}>Continue</Text>
          </TouchableOpacity>
        </FadeIn>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontFamily: FONT_TITLE_BOLD,
    fontSize: 40,
    color: BLUE,
    textAlign: "center",
    letterSpacing: 0.3,
    lineHeight: 46,
    marginBottom: 12,
  },
  subheading: {
    fontFamily: FONT_BODY,
    fontSize: 15,
    color: TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 22,
  },
  rhythmList: {
    width: "100%",
    marginTop: 28,
  },
  cardWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BLUE,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 14,
    width: "100%",
  },
  image: {
    width: 91,
    height: 91,
    marginRight: 18,
  },
  textWrap: {
    flex: 1,
    flexDirection: "column",
  },
  cardLabel: {
    fontFamily: FONT_TITLE_BOLD,
    fontSize: 20,
    color: IVORY,
    letterSpacing: 0.2,
    marginBottom: 3,
  },
  cardTime: {
    fontFamily: FONT_BODY_SEMIBOLD,
    fontSize: 15,
    color: GOLD,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});