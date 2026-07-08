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
  IVORY,
  TEXT_MUTED,
  TEXT_SECONDARY,
} from "../../../lib/constants/colors";
import { FONT_BODY, FONT_BODY_SEMIBOLD } from "../../../lib/constants/fonts";
import { SectionHeader } from "../../sectionHeader";

type Props = {
  title: string;
  description: string;
  illustration: ImageSourcePropType;
  buttonText: string;
  isActive: boolean;
  onNext: () => void;
};

export function BellsSlide({
  title,
  description,
  illustration,
  buttonText,
  isActive,
  onNext,
}: Props) {
  return (
    <View style={sharedStyles.slide}>
      <View style={sharedStyles.centerContent}>
        <FadeIn delay={120} isVisible={isActive}>
          <Text style={styles.title}>{title}</Text>
        </FadeIn>
        <FadeIn delay={200} isVisible={isActive}>
          <SectionHeader />
        </FadeIn>
        <FadeIn delay={300} isVisible={isActive}>
          <Text style={styles.desc}>{description}</Text>
        </FadeIn>
        <FadeIn delay={500} isVisible={isActive}>
          <Image
            source={illustration}
            style={styles.illustration}
            resizeMode="contain"
          />
        </FadeIn>
      </View>
      <View style={sharedStyles.navArea}>
        <FadeIn delay={700} isVisible={isActive} style={sharedStyles.ctaWrap}>
          <TouchableOpacity
            onPress={onNext}
            style={[sharedStyles.primaryBtn, { backgroundColor: BLUE }]}
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
  title: {
    fontFamily: FONT_BODY_SEMIBOLD,
    fontSize: 40,
    fontWeight: "400",
    color: BLUE,
    textAlign: "center",
    letterSpacing: 0.3,
    lineHeight: 46,
    marginBottom: 20,
  },
  desc: {
    fontFamily: FONT_BODY,
    fontSize: 20,
    color: "#6F8FAF",
    textAlign: "center",
    lineHeight: 24,
    marginTop: 15,
  },
  illustration: {
    width: width * 0.85,
    height: height * 0.38,
    marginTop: 24,
  },
});
