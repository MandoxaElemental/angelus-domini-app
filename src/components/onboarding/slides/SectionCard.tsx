import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { GOLD, IVORY, BLUE } from "../../../lib/constants/colors";
import { FONT_BODY, FONT_BODY_SEMIBOLD } from "../../../lib/constants/fonts";
import { SectionHeader } from "../../sectionHeader";

const NAVY = "#1F3A6E";
const NAVY_DARK = "#16264A";
const CARD_BG = "rgba(246, 243, 232, 0.88)";

type Props = {
  title: string;
  description?: string;
  isActive: boolean;
  onNext: () => void;
  dotCount?: number;
  activeDotIndex?: number;
  delay?: number;
  children?: React.ReactNode;
};

export function OnboardingCard({
  title,
  description,
  isActive,
  onNext,
  dotCount = 5,
  activeDotIndex = 0,
  delay = 500,
  children,
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(80)).current;

  useEffect(() => {
    if (isActive) {
      opacity.setValue(0);
      translateY.setValue(80);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          delay,
          useNativeDriver: true,
        }),

        Animated.spring(translateY, {
          toValue: 0,
          delay,
          tension: 70,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      opacity.setValue(0);
      translateY.setValue(80);
    }
  }, [isActive, delay, opacity, translateY]);

  return (
    <Animated.View
      style={[
        styles.cardWrap,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.card}>
        {children}

        <Text style={styles.cardTitle}>{title}</Text>

        <SectionHeader />

        {description ? (
          <Text style={styles.cardSubtitle}>{description}</Text>
        ) : null}

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
          onPress={onNext}
          activeOpacity={0.85}
          style={styles.continueBtn}
        >
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
    paddingBottom: 32,
    paddingHorizontal: 28,
    alignItems: "center",
  },

  cardTitle: {
    fontFamily: FONT_BODY_SEMIBOLD,
    fontSize: 40,
    color: BLUE,
    textAlign: "center",
    letterSpacing: 0.2,
    lineHeight: 42,
    fontWeight: "400",
    marginBottom: 10,
  },

  cardSubtitle: {
    fontFamily: FONT_BODY,
    fontSize: 20,
    color: "#6F8FAF",
    textAlign: "center",
    lineHeight: 24,
  },

  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
