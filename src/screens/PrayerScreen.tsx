import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  Easing,
} from "react-native";
import { createAudioPlayer } from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";

type PrayerItem =
  | { type: "call"; text: string }
  | { type: "response"; text: string }
  | { type: "prayer"; text: string }
  | { type: "bell"; text: string; count: number };

const SIGN_OF_THE_CROSS = `In the name of the Father, and of the Son, and of the Holy Spirit. Amen.`;

const HAIL_MARY_PART_1 = `Hail Mary, full of grace, the Lord is with thee. Blessed art thou amongst women, and blessed is the fruit of thy womb, Jesus.`;

const HAIL_MARY_PART_2 = `Holy Mary, Mother of God, pray for us sinners now and at the hour of our death. Amen.`;
const CLOSING_CALL = {
  call: "Pray for us, O Holy Mother of God.",
  response: "That we may be made worthy of the promises of Christ.",
};

const CLOSING_PRAYER = `Let us pray:
Pour forth, we beseech Thee, O Lord, Thy grace into our hearts; that we, to whom the incarnation of Christ, Thy Son, was made known by the message of an angel, may by His Passion and Cross be brought to the glory of His Resurrection, through the same Christ Our Lord.
Amen.`;

const PRAYER_SEQUENCE: PrayerItem[] = [
  { type: "prayer", text: SIGN_OF_THE_CROSS },
  { type: "bell", text: "", count: 3 },
  { type: "call", text: "The Angel of the Lord declared unto Mary" },
  { type: "response", text: "And she conceived of the Holy Spirit." },

  { type: "call", text: HAIL_MARY_PART_1 },
  { type: "response", text: HAIL_MARY_PART_2 },

  { type: "call", text: "Behold the handmaid of the Lord" },
  { type: "response", text: "Be it done unto me according to thy word." },

  { type: "call", text: HAIL_MARY_PART_1 },
  { type: "response", text: HAIL_MARY_PART_2 },

  { type: "call", text: "And the Word was made flesh" },
  { type: "response", text: "And dwelt among us." },

  { type: "call", text: HAIL_MARY_PART_1 },
  { type: "response", text: HAIL_MARY_PART_2 },

  { type: "call", text: CLOSING_CALL.call },
  { type: "response", text: CLOSING_CALL.response },

  { type: "prayer", text: CLOSING_PRAYER },
  { type: "bell", text: "", count: 3 },
  { type: "prayer", text: SIGN_OF_THE_CROSS },
];

export default function PrayerScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const [selectedTime, setSelectedTime] = useState("12pm");
  const item = PRAYER_SEQUENCE[currentStep];
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.4)).current;
  const bellRotate = useRef(new Animated.Value(0)).current;
  const transitionToNext = () => {
    if (currentStep >= PRAYER_SEQUENCE.length - 1) {
      return;
    }

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      setCurrentStep((p) => p + 1);
    });
  };
  const getStepDuration = (text: string) => {
    const words = text.trim().split(/\s+/).length;

    const duration =
      words * 550 + // reading pace
      1200; // contemplative pause

    return Math.min(Math.max(duration, 4000), 18000);
  };
  const [autoPlay, setAutoPlay] = useState(false);
  const animateBellSwing = () => {
    bellRotate.setValue(0);

    Animated.sequence([
      Animated.timing(bellRotate, {
        toValue: 1,
        duration: 180,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(bellRotate, {
        toValue: -1,
        duration: 180,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(bellRotate, {
        toValue: 0.6,
        duration: 140,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(bellRotate, {
        toValue: -0.4,
        duration: 140,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(bellRotate, {
        toValue: 0,
        duration: 120,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };
  const playBellSequence = async (count: number) => {
    for (let i = 0; i < count; i++) {
      ringScale.setValue(1);
      ringOpacity.setValue(0.5);

      Animated.parallel([
        Animated.timing(ringScale, {
          toValue: 1.35,
          duration: 1400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacity, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        }),
      ]).start();

      const player = createAudioPlayer(require("../../assets/audio/bell.mp3"));
      animateBellSwing();
      player.play();

      await new Promise((resolve) => setTimeout(resolve, 2200));

      player.remove();
    }
  };

  useEffect(() => {
    if (item.type !== "bell") return;

    const runBell = async () => {
      await new Promise((r) => setTimeout(r, 500));

      await playBellSequence(item.count);

      await new Promise((r) => setTimeout(r, 900));

      transitionToNext();
    };

    runBell();
  }, [currentStep]);
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1.25,
            duration: 900,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.4,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    pulse.start();

    return () => {
      pulse.stop();
    };
  }, []);

  useEffect(() => {
    fadeAnim.setValue(0);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [currentStep]);

  useEffect(() => {
    if (!autoPlay) return;

    if (item.type === "bell") return;

    if (currentStep >= PRAYER_SEQUENCE.length - 1) {
      setAutoPlay(false);
      return;
    }

    const timeout = setTimeout(() => {
      transitionToNext();
    }, getStepDuration(item.text));

    return () => clearTimeout(timeout);
  }, [currentStep, autoPlay, item.type]);

  useEffect(() => {
    let interval: any;

    if (item.type === "prayer") {
      interval = setInterval(() => {
        scrollY.current += 0.5;
        scrollRef.current?.scrollTo({ y: scrollY.current, animated: false });
      }, 30);
    }

    return () => {
      clearInterval(interval);
      scrollY.current = 0;
    };
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < PRAYER_SEQUENCE.length - 1) {
      setCurrentStep((p) => p + 1);
    }
  };

  const handleRestart = () => {
    scrollY.current = 0;

    scrollRef.current?.scrollTo({
      y: 0,
      animated: false,
    });

    setCurrentStep(0);
  };

  const renderPrayer = () => {
    if (item.type === "call") {
      return (
        <Animated.Text style={[styles.call, { opacity: fadeAnim }]}>
          {item.text}
        </Animated.Text>
      );
    }

    if (item.type === "response") {
      return (
        <Animated.Text style={[styles.responseItalic, { opacity: fadeAnim }]}>
          {item.text}
        </Animated.Text>
      );
    }

    if (item.type === "prayer") {
      return (
        <Animated.Text style={[styles.prayer, { opacity: fadeAnim }]}>
          {item.text}
        </Animated.Text>
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* 🔷 HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerMain}>ANGELUS</Text>
          <Text style={styles.headerSub}>DOMINI</Text>
        </View>

        <View style={styles.bellContainer}>
          {/* Ringing effect */}
          <Animated.Image
            source={require("../../assets/ring.png")}
            style={[
              styles.bellEffect,
              {
                opacity: ringOpacity,
                transform: [{ scale: ringScale }],
              },
            ]}
            resizeMode="contain"
          />

          {/* Bell */}
          <Animated.Image
            source={require("../../assets/bell.png")}
            resizeMode="contain"
            style={[
              styles.bellImage,
              {
                transform: [
                  {
                    rotate: bellRotate.interpolate({
                      inputRange: [-1, 1],
                      outputRange: ["-12deg", "12deg"],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>
      </View>
      <View style={styles.timeSelector}>
        {[
          { label: "6:00 AM", value: "6am" },
          { label: "12:00 PM", value: "12pm" },
          { label: "6:00 PM", value: "6pm" },
        ].map((t) => {
          const active = selectedTime === t.value;

          return (
            <TouchableOpacity
              key={t.value}
              onPress={() => setSelectedTime(t.value)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={
                  active ? ["#3D5C97", "#2F4A7A"] : ["#FDF6EA", "#EEDFC4"]
                }
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={[styles.timeButton, active && styles.timeButtonActive]}
              >
                <Text
                  style={[styles.timeText, active && styles.timeTextActive]}
                >
                  {t.label}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </View>
      {/* 🖼 IMAGE */}
      <View style={styles.imageContainer}>
        <Image
          source={require("../../assets/angelus.png")}
          style={styles.image}
        />

        {/* Top fade */}
        <LinearGradient
          colors={["#F8F1E7", "transparent"]}
          style={styles.topGradient}
          pointerEvents="none"
        />

        {/* Bottom fade */}
        <LinearGradient
          colors={["transparent", "#F8F1E7"]}
          style={styles.bottomGradient}
          pointerEvents="none"
        />
      </View>
      {/* 📜 PRAYER CARD */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        ref={scrollRef}
        style={styles.card}
        contentContainerStyle={styles.cardContent}
      >
        {renderPrayer()}
      </ScrollView>
      {/* ⚪ DOTS */}
      <View style={styles.dots}>
        {PRAYER_SEQUENCE.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === currentStep && styles.activeDot]}
          />
        ))}
      </View>
      {/* 🟡 BUTTON */}
      <TouchableOpacity
        style={[
          styles.button,
          (autoPlay || item.type === "bell") && styles.buttonDisabled,
        ]}
        onPress={handleNext}
        disabled={autoPlay || item.type === "bell"}
      >
        <LinearGradient
          colors={["#D4AF57", "#B9923F"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.buttonGradient}
        >
          <Text style={styles.buttonText}>
            {autoPlay
              ? "Praying..."
              : currentStep === PRAYER_SEQUENCE.length - 1
                ? "Finish"
                : "Continue"}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
      {/* ⚙️ CONTROLS */}
      <View style={styles.controlsRow}>
        {/* Auto Pray / Pause */}
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setAutoPlay((p) => !p)}
        >
          <LinearGradient
            colors={["#F6E7C8", "#E8D4AF"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.controlButton}
          >
            <Text style={styles.controlText}>
              {autoPlay ? "⏸ Pause" : "▶ Auto Pray"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Restart */}
        <TouchableOpacity style={styles.controlButton} onPress={handleRestart}>
          <LinearGradient
            colors={["#F6E7C8", "#E8D4AF"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.controlButton}
          >
            <Text style={styles.controlText}>↺ Restart</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>{" "}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F1E7",
  },

  header: {
    height: 120,
    backgroundColor: "#2F4A7A",
    padding: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerMain: {
    color: "white",
    fontSize: 28,
  },
  headerSub: {
    color: "#C9A24A",
    fontSize: 18,
  },
  bellContainer: {
    width: 72,
    height: 72,
    justifyContent: "center",
    alignItems: "center",
  },

  bellImage: {
    width: 72,
    height: 72,
    position: "absolute",
    zIndex: 2,
  },

  bellEffect: {
    width: 72,
    height: 72,
    position: "absolute",
    zIndex: 1,
  },

  imageContainer: {
    width: "100%",
    height: 220,
    position: "relative",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 70,
  },

  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
  },

  card: {
    margin: 24,
    padding: 24,
    backgroundColor: "#FFFAF2",
    borderRadius: 24,
    maxHeight: 260,
    minHeight: 260,
    textAlign: "center",
  },

  cardContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  label: {
    color: "#C9A24A",
    marginTop: 10,
  },
  call: {
    fontSize: 26,
    color: "#3F2E24",
    marginBottom: 6,
    textAlign: "center",
    lineHeight: 40,
    fontFamily: "Montserrat-Regular",
  },
  response: {
    fontSize: 26,
    color: "#3F2E24",
    textAlign: "center",
    lineHeight: 40,
    fontFamily: "Garamond-Regular",
  },
  responseItalic: {
    fontSize: 26,
    color: "#3F2E24",
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 40,
    fontFamily: "Garamond-Regular",
  },
  prayer: {
    fontSize: 26,
    lineHeight: 40,
    textAlign: "center",
    color: "#3F2E24",
    fontFamily: "Garamond-Regular",
  },

  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E7DCCB",
  },
  activeDot: {
    backgroundColor: "#C9A24A",
  },

  button: {
    margin: 24,
    borderRadius: 32,
    overflow: "hidden",
    shadowColor: "#F5D27A",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 20,
  },

  controls: {
    textAlign: "center",
    marginBottom: 20,
    color: "#3F2E24",
    opacity: 0.7,
  },
  timeSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginTop: 12,
    marginBottom: 12,
  },

  timeButton: {
    width: 100,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderColor: "#C9A24A",
    borderWidth: 2,
  },

  timeButtonActive: {
    shadowColor: "#4B6FB0",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 4,
  },

  timeText: {
    color: "#C9A24A",
    fontSize: 14,
  },

  timeTextActive: {
    color: "#FFFFFF",
  },

  controlsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 24,
  },

  controlButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  controlText: {
    color: "#3F2E24",
    fontSize: 16,
  },

  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    width: "100%",
    padding: 20,
    borderRadius: 32,
    alignItems: "center",
  },
});
