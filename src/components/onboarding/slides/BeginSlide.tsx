import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ImageBackground,
  StyleSheet,
  Animated,
} from "react-native";
import { sharedStyles } from "../styles/sharedStyles";
import { GOLD, IVORY } from "../../../lib/constants/colors";
import {
  FONT_BODY,
  FONT_BODY_SEMIBOLD,
  FONT_TITLE_ITALIC,
} from "../../../lib/constants/fonts";
import { SectionHeader } from "../../sectionHeader";

const NAVY_DARK = "#16264A";
const CARD_BG = "rgba(246, 243, 232, 0.92)";

function SequentialTagline({
  tagline,
  isActive,
}: {
  tagline: string;
  isActive: boolean;
}) {
  const words = tagline
    .split(".")
    .map((word) => word.trim())
    .filter(Boolean);

  const opacities = useRef(words.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!isActive) {
      opacities.forEach((opacity) => opacity.setValue(0));
      return;
    }

    const animations = opacities.map((opacity, index) =>
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay: 1000 + index * 600,
        useNativeDriver: true,
      }),
    );

    Animated.parallel(animations).start();
  }, [isActive, opacities]);

  return (
    <View style={styles.tagline}>
      {words.map((word, index) => (
        <Animated.Text
          key={`${word}-${index}`}
          style={[
            styles.taglineWord,
            {
              opacity: opacities[index],
            },
          ]}
        >
          {word}
          {index < words.length - 1 ? ". " : "."}
        </Animated.Text>
      ))}
    </View>
  );
}

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
  dotCount = 5,
  activeDotIndex = 5,
}: Props) {
  const cardTranslateY = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (isActive) {
      cardTranslateY.setValue(300);

      Animated.timing(cardTranslateY, {
        toValue: 0,
        duration: 1200,
        delay: 200,
        useNativeDriver: true,
      }).start();
    } else {
      cardTranslateY.setValue(300);
    }
  }, [isActive, cardTranslateY]);

  return (
    <ImageBackground
      source={require("../../../../assets/bgchurch.png")}
      style={sharedStyles.church}
      resizeMode="cover"
    >
      <Animated.View
        style={[
          styles.cardWrap,
          {
            transform: [{ translateY: cardTranslateY }],
          },
        ]}
      >
        {" "}
        {/* Shadow layer */}
        <View style={styles.cardShadow}>
          {/* Rounded card */}
          <View style={styles.card}>
            {/* Bell icon */}
            <Image
              source={require("../../../../assets/bell.png")}
              style={styles.bellIcon}
              resizeMode="contain"
            />

            {/* Title */}
            <Text style={styles.title}>{title}</Text>

            {/* Ornament divider */}
            <SectionHeader />

            {/* Tagline */}
            <SequentialTagline tagline={tagline} isActive={isActive} />
            {/* Dots */}
            <View style={styles.dotsRow}>
              {Array.from({ length: dotCount }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === activeDotIndex
                      ? styles.dotActive
                      : styles.dotInactive,
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
      </Animated.View>
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

  cardShadow: {
    borderRadius: 28,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },

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

  /*
   * OLD TYPOGRAPHY
   */
  title: {
    fontFamily: FONT_BODY_SEMIBOLD,
    fontSize: 40,
    color: "#1F3A6E",
    textAlign: "center",
    letterSpacing: 0.3,
    lineHeight: 46,
    fontWeight: "400",
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

  /*
   * OLD TYPOGRAPHY
   */

  tagline: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },

  taglineWord: {
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
    borderRadius: 100,
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
