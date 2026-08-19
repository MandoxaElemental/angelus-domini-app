import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Animated,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { FadeIn } from "../../shared/FadeIn";
import { sharedStyles, height } from "../styles/sharedStyles";
import { BLUE, GOLD, IVORY } from "../../../lib/constants/colors";
import {
  FONT_BODY,
  FONT_BODY_SEMIBOLD,
  FONT_TITLE_BOLD,
} from "../../../lib/constants/fonts";
import { SectionHeader } from "../../sectionHeader";
import { OnboardingCard } from "./SectionCard";

const NAVY = "#1F3A6E";
const NAVY_DARK = "#16264A";
const CARD_BG = "rgba(246, 243, 232, 0.92)";

const TIMELINE = [
  {
    roman: "VI",
    icons: [
      require("../../../../assets/Morning_Clear.png"),
      require("../../../../assets/Morning_Solid.png"),
    ],
  },
  {
    roman: "XII",
    icons: [
      require("../../../../assets/Noon_Clear.png"),
      require("../../../../assets/Noon_Solid.png"),
    ],
  },
  {
    roman: "VI",
    icons: [
      require("../../../../assets/Evening_Clear.png"),
      require("../../../../assets/Evening_Solid.png"),
    ],
  },
];

const CYCLE_INTERVAL_MS = 1700;
const FADE_DURATION_MS = 400;

type Props = {
  title: string;
  description: string;
  prayerTimes: string[];
  isActive: boolean;
  onNext: () => void;
  onSkip: () => void;
  dotCount?: number;
  activeDotIndex?: number;
};

export function WelcomeSlide({
  title,
  description,
  prayerTimes,
  isActive,
  onNext,
  dotCount = 5,
  activeDotIndex = 1,
}: Props) {
  const labels =
    prayerTimes && prayerTimes.length === 3
      ? prayerTimes
      : ["Morning\nAngelus", "Noon\nAngelus", "Evening\nAngelus"];

  const [iconIndices, setIconIndices] = useState([0, 0, 0]);

  const fadeAnims = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  const activeSlot = useRef(0);

  // Card slide-up animation
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

  useEffect(() => {
    if (!isActive) return;

    const intervalId = setInterval(() => {
      const slot = activeSlot.current;
      const anim = fadeAnims[slot];

      Animated.timing(anim, {
        toValue: 0,
        duration: FADE_DURATION_MS,
        useNativeDriver: true,
      }).start(() => {
        setIconIndices((prev) => {
          const next = [...prev];
          next[slot] = (next[slot] + 1) % TIMELINE[slot].icons.length;
          return next;
        });

        Animated.timing(anim, {
          toValue: 1,
          duration: FADE_DURATION_MS,
          useNativeDriver: true,
        }).start();
      });

      activeSlot.current = (activeSlot.current + 1) % TIMELINE.length;
    }, CYCLE_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [isActive, fadeAnims]);

  return (
    <View style={sharedStyles.slide}>
      {/* Timeline artwork */}
      <View style={styles.artwork}>
        <FadeIn delay={100} isVisible={isActive}>
          <View style={styles.timeline}>
            {TIMELINE.map((item, i) => (
              <View key={i}>
                <View style={styles.timelineRow}>
                  <Text style={styles.roman}>{item.roman}</Text>

                  <View style={styles.iconCircle}>
                    <Animated.Image
                      source={item.icons[iconIndices[i] % item.icons.length]}
                      style={[styles.iconImage, { opacity: fadeAnims[i] }]}
                      resizeMode="contain"
                    />
                  </View>

                  <Text style={styles.timelineLabel}>{labels[i]}</Text>
                </View>

                {i < TIMELINE.length - 1 && (
                  <View style={styles.connectorWrap}>
                    <View style={styles.connectorLine} />
                    <View style={styles.connectorDot} />
                    <View style={styles.connectorLine} />
                  </View>
                )}
              </View>
            ))}
          </View>
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
    paddingBottom: height * 0.28,
  },

  timeline: {
    alignItems: "center",
  },

  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: 250,
  },

  roman: {
    fontFamily: FONT_TITLE_BOLD,
    fontSize: 32,
    color: "#7C8AA8",
    width: 66,
    textAlign: "right",
    marginRight: 18,
  },

  iconCircle: {
    width: 84,
    height: 84,
    justifyContent: "center",
    alignItems: "center",
  },

  iconImage: {
    width: 120,
    height: 120,
  },

  timelineLabel: {
    fontFamily: FONT_BODY_SEMIBOLD,
    fontSize: 18,
    color: NAVY,
    marginLeft: 18,
    flex: 1,
    lineHeight: 100,
  },

  connectorWrap: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
  },

  connectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: GOLD,
    opacity: 0.5,
  },

  connectorDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: GOLD,
    marginVertical: 2,
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

  title: {
    fontFamily: FONT_BODY_SEMIBOLD,
    fontSize: 40,
    color: BLUE,
    textAlign: "center",
    letterSpacing: 0.2,
    lineHeight: 42,
    fontWeight: "400",
    marginBottom: 10,
  },

  desc: {
    fontFamily: FONT_BODY,
    color: "#6F8FAF",
    textAlign: "center",
    lineHeight: 24,
    fontSize: 20,
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
