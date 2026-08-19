import React, { useEffect, useRef } from "react";
import {
  TouchableOpacity,
  Text,
  View,
  ImageBackground,
  StyleSheet,
  Animated,
} from "react-native";
import { FadeIn } from "../../shared/FadeIn";
import { sharedStyles, width, height } from "../styles/sharedStyles";
import { BLUE, GOLD, IVORY } from "../../../lib/constants/colors";
import {
  FONT_BODY,
  FONT_BODY_SEMIBOLD,
  FONT_TITLE_BOLD,
  FONT_TITLE_ITALIC,
} from "../../../lib/constants/fonts";
import { SectionHeader } from "../../sectionHeader";
import { OnboardingCard } from "./SectionCard";

const NAVY = "#1F3A6E";
const NAVY_DARK = "#16264A";
const CARD_BG = "rgba(246, 243, 232, 0.88)"; // #F6F3E8 transparent

// ← ADDED: local fade-up animation (opacity + translateY), used only for the
// scripture title/subtitle block below. Doesn't touch the shared FadeIn component.
function FadeInUp({
  delay = 0,
  isVisible,
  distance = 20,
  duration = 650,
  style,
  children,
}: {
  delay?: number;
  isVisible: boolean;
  distance?: number;
  duration?: number;
  style?: any;
  children: React.ReactNode;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      opacity.setValue(0);
      translateY.setValue(distance);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

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
  dotCount = 5,
  activeDotIndex = 0,
  isActive,
  onPress,
}: Props) {
  const cardTranslateY = useRef(new Animated.Value(300)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      cardTranslateY.setValue(300);
      cardOpacity.setValue(0);

      Animated.parallel([
        Animated.timing(cardTranslateY, {
          toValue: 0,
          duration: 1200,
          delay: 2700,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 700,
          delay: 2700,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      cardTranslateY.setValue(300);
      cardOpacity.setValue(0);
    }
  }, [isActive, cardTranslateY, cardOpacity]);

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
          {/* ← CHANGED: FadeIn -> FadeInUp for upward fade-in */}
          <FadeInUp delay={1000} isVisible={isActive} distance={24}>
            <Text style={styles.scriptureMain}>{title}</Text>
          </FadeInUp>
          <FadeInUp delay={1900} isVisible={isActive} distance={24}>
            <Text style={styles.scriptureItalic}>{subtitle}</Text>
          </FadeInUp>
        </View>
        <Animated.View
          style={[
            styles.cardAnimation,
            {
              opacity: cardOpacity,
              transform: [{ translateY: cardTranslateY }],
            },
          ]}
        >
          <OnboardingCard
            title={"Welcome to\nAngelus Domini"}
            description={
              "Join Catholics around the world\npraying the Angelus each day."
            }
            isActive={isActive}
            onNext={onPress}
            activeDotIndex={0}
          />
        </Animated.View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scriptureMain: {
    fontFamily: FONT_BODY_SEMIBOLD,
    fontSize: 40,
    color: BLUE,
    textAlign: "center",
    letterSpacing: 0.3,
    marginTop: -270,
    lineHeight: 46,
    fontWeight: "400",
  },

  scriptureItalic: {
    fontFamily: FONT_TITLE_ITALIC,
    fontSize: 34,
    fontStyle: "italic",
    color: GOLD,
    textAlign: "center",
    marginTop: -175,
    letterSpacing: 0.2,
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
  ornamentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
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
    fontSize: 20,
    color: "#6F8FAF",
    textAlign: "center",
    lineHeight: 24,
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
  cardAnimation: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
});
