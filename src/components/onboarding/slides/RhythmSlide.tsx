import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { FadeIn } from "../../shared/FadeIn";
import { sharedStyles } from "../styles/sharedStyles";
import { BLUE, GOLD, IVORY } from "../../../lib/constants/colors";
import { FONT_BODY, FONT_BODY_SEMIBOLD } from "../../../lib/constants/fonts";
import { SectionHeader } from "../../sectionHeader";
import { OnboardingCard } from "./SectionCard";

const NAVY_DARK = "#16264A";
const CARD_BG = "rgba(246, 243, 232, 0.92)";

type Props = {
  title: string;
  description: string;
  isActive: boolean;
  onNext: () => void;
  dotCount?: number;
  activeDotIndex?: number;
};

export function RhythmSlide({
  title,
  description,
  isActive,
  onNext,
  dotCount = 5,
  activeDotIndex = 2,
}: Props) {
  const cardTranslateY = useRef(new Animated.Value(80)).current;

  useEffect(() => {
    if (isActive) {
      Animated.spring(cardTranslateY, {
        toValue: 0,
        tension: 65,
        friction: 9,
        useNativeDriver: true,
      }).start();
    } else {
      cardTranslateY.setValue(80);
    }
  }, [isActive, cardTranslateY]);

  return (
    <View style={sharedStyles.slide}>
      {/* Illustration */}
      <View style={styles.artwork}>
        <FadeIn delay={100} isVisible={isActive}>
          <Image
            source={require("../../../../assets/notificationsbg.png")}
            style={styles.image}
            resizeMode="contain"
          />
        </FadeIn>
      </View>

      <OnboardingCard
        title={title}
        description={description}
        isActive={isActive}
        onNext={onNext}
        dotCount={dotCount}
        activeDotIndex={activeDotIndex}
        delay={500}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  artwork: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 240,
  },

  image: {
    width: 300,
    height: 300,
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
    paddingTop: 20,
    paddingBottom: 28,
    paddingHorizontal: 28,
    alignItems: "center",
  },

  heading: {
    fontFamily: FONT_BODY_SEMIBOLD,
    fontSize: 40,
    color: BLUE,
    textAlign: "center",
    letterSpacing: 0.3,
    lineHeight: 46,
    fontWeight: "400",
    marginBottom: 10,
  },

  subheading: {
    fontFamily: FONT_BODY,
    fontSize: 20,
    color: "#6F8FAF",
    textAlign: "center",
    lineHeight: 24,
    marginTop: 4,
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
    backgroundColor: BLUE,
  },

  dotInactive: {
    width: 7,
    height: 7,
    backgroundColor: "#D9DCE3",
  },

  continueBtn: {
    width: "100%",
    backgroundColor: NAVY_DARK,
    borderRadius: 100,
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
