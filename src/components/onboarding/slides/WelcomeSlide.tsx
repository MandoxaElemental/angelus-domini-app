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
import { sharedStyles } from "../styles/sharedStyles";
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
} from "../../../lib/constants/fonts";
import { SectionHeader } from "../../sectionHeader";

const NAVY = "#1F3A6E";
const NAVY_DARK = "#16264A";

type Props = {
  title: string;
  description: string;
  prayerTimes: string[]; // e.g. ["Morning Angelus", "Noon Angelus", "Evening Angelus"]
  isActive: boolean;
  onNext: () => void;
  onSkip: () => void;
  dotCount?: number;
  activeDotIndex?: number;
};

// ← Each slot now takes an ARRAY of icons. Add as many images as you like per
//    slot — all three slots will crossfade to their next image together every
//    3 seconds. Replace the placeholder require(...) paths with your own files.
const TIMELINE = [
  {
    roman: "VI",
    icons: [
      require("../../../../assets/Morning_Clear.png"), // ← TODO: replace with alt image
      require("../../../../assets/Morning_Solid.png"), // ← your current sunrise icon
    ],
  },
  {
    roman: "XII",
    icons: [
      require("../../../../assets/Noon_Clear.png"), // ← TODO: replace with alt image
      require("../../../../assets/Noon_Solid.png"), // ← your current sun icon
    ],
  },
  {
    roman: "VI",
    icons: [
      require("../../../../assets/Evening_Clear.png"), // ← TODO: replace with alt image
      require("../../../../assets/Evening_Solid.png"), // ← your current moon icon
    ],
  },
];

const CYCLE_INTERVAL_MS = 1700;
const FADE_DURATION_MS = 400;

export function WelcomeSlide({
  title,
  description,
  prayerTimes,
  isActive,
  onNext,
  onSkip,
  dotCount = 6,
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
      <View style={sharedStyles.centerContent}>
        {/* Timeline */}
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

        {/* Title */}
        <FadeIn delay={500} isVisible={isActive}>
          <Text style={styles.title}>{title}</Text>
        </FadeIn>

        {/* Ornament divider */}
        <FadeIn delay={650} isVisible={isActive}>
          <SectionHeader />
        </FadeIn>

        {/* Description */}
        <FadeIn delay={750} isVisible={isActive}>
          <Text style={styles.desc}>{description}</Text>
        </FadeIn>
      </View>

      <View style={sharedStyles.navArea}>
        {/* Dots */}
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

        {/* Continue button */}
        <FadeIn delay={950} isVisible={isActive} style={sharedStyles.ctaWrap}>
          <TouchableOpacity
            onPress={onNext}
            style={[sharedStyles.primaryBtn, { backgroundColor: NAVY_DARK }]}
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
  timeline: {
    alignItems: "center",
    marginBottom: 36,
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
    borderRadius: 42,

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
    marginLeft: 0,
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
  ornamentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 14,
    width: 130,
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
    marginBottom: 16,
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
});
