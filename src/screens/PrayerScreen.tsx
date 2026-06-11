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
  Modal,
  useWindowDimensions,
} from "react-native";
import { createAudioPlayer } from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { SafeAreaView } from "react-native-safe-area-context";
type PrayerItem =
  | {
      type: "versicle" | "response" | "prayer";
      text: string;
      duration: number;
      audio?: any;
    }
  | { type: "bell"; text: string; count: number; duration: number };

const SIGN_OF_THE_CROSS = `In the name of the Father, and of the Son, and of the Holy Spirit. Amen.`;
const HAIL_MARY_PART_1 = `Hail Mary, full of grace, the Lord is with thee. Blessed art thou amongst women, and blessed is the fruit of thy womb, Jesus.`;
const HAIL_MARY_PART_2 = `Holy Mary, Mother of God, pray for us sinners now and at the hour of our death. Amen.`;
const CLOSING_CALL = {
  versicle: "Pray for us, O Holy Mother of God.",
  response: "That we may be made worthy of the promises of Christ.",
};

const CLOSING_PRAYER = `Let us pray:

Pour forth, we beseech Thee, O Lord, Thy grace into our hearts; that we, to whom the incarnation of Christ, Thy Son, was made known by the message of an angel, may by His Passion and Cross be brought to the glory of His Resurrection, through the same Christ Our Lord.

Amen.`;

const PRAYER_SEQUENCE: PrayerItem[] = [
  {
    type: "versicle",
    text: SIGN_OF_THE_CROSS,
    duration: 4000,
    audio: require("../../assets/audio/SignOfTheCross1.mp3"),
  },
  { type: "bell", text: "", count: 3, duration: 9900 },
  {
    type: "versicle",
    text: "The Angel of the Lord declared unto Mary",
    duration: 3500,
    audio: require("../../assets/audio/Versicle1.mp3"),
  },
  {
    type: "response",
    text: "And she conceived of the Holy Spirit.",
    duration: 3500,
    audio: require("../../assets/audio/Response1.mp3"),
  },
  {
    type: "versicle",
    text: HAIL_MARY_PART_1,
    duration: 7500,
    audio: require("../../assets/audio/HailMaryV1.mp3"),
  },
  {
    type: "response",
    text: HAIL_MARY_PART_2,
    duration: 6500,
    audio: require("../../assets/audio/HolyMaryV1.mp3"),
  },
  { type: "bell", text: "", count: 3, duration: 9900 },
  {
    type: "versicle",
    text: "Behold the handmaid of the Lord",
    duration: 3500,
    audio: require("../../assets/audio/Versicle2.mp3"),
  },
  {
    type: "response",
    text: "Be it done unto me according to thy word.",
    duration: 3500,
    audio: require("../../assets/audio/Response2.mp3"),
  },
  {
    type: "versicle",
    text: HAIL_MARY_PART_1,
    duration: 7500,
    audio: require("../../assets/audio/HailMaryV2.mp3"),
  },
  {
    type: "response",
    text: HAIL_MARY_PART_2,
    duration: 6500,
    audio: require("../../assets/audio/HolyMaryV2.mp3"),
  },
  { type: "bell", text: "", count: 3, duration: 9900 },
  {
    type: "versicle",
    text: "And the Word was made flesh",
    duration: 3500,
    audio: require("../../assets/audio/Versicle3.mp3"),
  },
  {
    type: "response",
    text: "And dwelt amongst us.",
    duration: 3500,
    audio: require("../../assets/audio/Response3.mp3"),
  },
  {
    type: "versicle",
    text: HAIL_MARY_PART_1,
    duration: 7500,
    audio: require("../../assets/audio/HailMaryV3.mp3"),
  },
  {
    type: "response",
    text: HAIL_MARY_PART_2,
    duration: 6500,
    audio: require("../../assets/audio/HolyMaryV3.mp3"),
  },
  {
    type: "versicle",
    text: CLOSING_CALL.versicle,
    duration: 3500,
    audio: require("../../assets/audio/Versicle4.mp3"),
  },
  {
    type: "response",
    text: CLOSING_CALL.response,
    duration: 3500,
    audio: require("../../assets/audio/Response4.mp3"),
  },
  {
    type: "prayer",
    text: CLOSING_PRAYER,
    duration: 19000,
    audio: require("../../assets/audio/Prayer.mp3"),
  },
  { type: "bell", text: "", count: 3, duration: 9900 },
  {
    type: "versicle",
    text: SIGN_OF_THE_CROSS,
    duration: 4000,
    audio: require("../../assets/audio/SignOfTheCross2.mp3"),
  },
];

export default function PrayerScreen() {
  const { width, height } = useWindowDimensions();

  const isSmallScreen = width <= 360;
  const isTinyScreen = width <= 340;

  const scale = Math.min(width / 430, 1);

  const sizes = {
    headerHeight: isTinyScreen ? 82 : isSmallScreen ? 90 : 100,

    titleFont: isTinyScreen ? 24 : isSmallScreen ? 27 : 30,

    bodyLineHeight: isTinyScreen ? 34 : isSmallScreen ? 38 : 42,

    imageHeight: isTinyScreen ? 160 : isSmallScreen ? 185 : 220,

    cardHeight: isTinyScreen ? 220 : isSmallScreen ? 240 : 260,

    horizontalPadding: isTinyScreen ? 14 : 24,

    buttonHeight: isTinyScreen ? 50 : 58,
  };

  const dotsPerRow = isTinyScreen ? 10 : PRAYER_SEQUENCE.length;

  const dotsWidth = dotsPerRow * 16;

  const [currentStep, setCurrentStep] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);

  const getCurrentPrayerTime = () => {
    const now = new Date();
    const m = now.getHours() * 60 + now.getMinutes();
    if (m >= 6 * 60 && m < 12 * 60) return "6am";
    if (m >= 12 * 60 && m < 18 * 60) return "12pm";
    return "6pm";
  };
  const item = PRAYER_SEQUENCE[currentStep];

  const nextItem = PRAYER_SEQUENCE[currentStep + 1];

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.4)).current;
  const bellRotate = useRef(new Animated.Value(0)).current;
  const audioRef = useRef<any>(null);

  // ✅ FIX: Always start as false — only set true when route params say so
  const [autoPlay, setAutoPlay] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const isTransitioning = useRef(false);

  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialSlot = route.params?.timeSlot;
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const onComplete = route.params?.onComplete;

  useEffect(() => {
    const fromNotification = route.params?.autoPlay === true;
    setAutoPlay(fromNotification);

    if (fromNotification) {
      navigation.setParams({ autoPlay: undefined });
    }
  }, []); // ← empty deps: intentionally runs only on mount
  const [selectedTime, setSelectedTime] = useState(
    initialSlot ?? getCurrentPrayerTime(),
  );
  const transitionToNext = () => {
    if (isTransitioning.current) return;

    if (currentStep >= PRAYER_SEQUENCE.length - 1) {
      return;
    }

    isTransitioning.current = true;

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 600,
      useNativeDriver: false,
    }).start(() => {
      setCurrentStep((p) => p + 1);

      setTimeout(() => {
        isTransitioning.current = false;
      }, 50);
    });
  };

  // Audio: only plays when autoPlay AND audioEnabled are both true
  useEffect(() => {
    if (item.type === "bell") return;
    if (!autoPlay) {
      audioRef.current?.remove?.();
      return;
    }
    if (!audioEnabled) {
      audioRef.current?.remove?.();
      return;
    }

    const run = async () => {
      audioRef.current?.remove?.();

      if (item.audio) {
        const player = createAudioPlayer(item.audio);

        audioRef.current = player;

        player.play();
      }
    };

    run();
    return () => {
      audioRef.current?.remove?.();
    };
  }, [currentStep, audioEnabled, autoPlay]);

  const animateBellSwing = () => {
    bellRotate.setValue(0);

    Animated.sequence([
      Animated.timing(bellRotate, {
        toValue: 1,
        duration: 180,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(bellRotate, {
        toValue: -1,
        duration: 180,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(bellRotate, {
        toValue: 0.5,
        duration: 140,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(bellRotate, {
        toValue: -0.4,
        duration: 140,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(bellRotate, {
        toValue: 0,
        duration: 120,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(bellRotate, {
        toValue: 1,
        duration: 180,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(bellRotate, {
        toValue: -1,
        duration: 180,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(bellRotate, {
        toValue: 0.5,
        duration: 140,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(bellRotate, {
        toValue: -0.4,
        duration: 140,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(bellRotate, {
        toValue: 0,
        duration: 120,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
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
          useNativeDriver: false,
        }),
        Animated.timing(ringOpacity, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: false,
        }),
        Animated.timing(ringScale, {
          toValue: 1.35,
          duration: 1400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(ringOpacity, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: false,
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
    const update = () => setSelectedTime(getCurrentPrayerTime());
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  // Bell sequence: only runs when autoPlay is true
  useEffect(() => {
    if (item.type !== "bell") return;
    if (!autoPlay) return; // ← bells don't fire on manual open

    let cancelled = false;

    const runBell = async () => {
      await new Promise((r) => setTimeout(r, 500));

      if (cancelled) return;

      await playBellSequence(item.count);

      if (cancelled) return;

      await new Promise((r) => setTimeout(r, 900));

      if (cancelled) return;

      transitionToNext();
    };

    runBell();
    return () => {
      cancelled = true;
    };
  }, [currentStep, autoPlay]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1.25,
            duration: 900,
            easing: Easing.out(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 900,
            useNativeDriver: false,
          }),
          Animated.timing(ringScale, {
            toValue: 1.25,
            duration: 900,
            easing: Easing.out(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 900,
            useNativeDriver: false,
          }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: false,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.4,
            duration: 0,
            useNativeDriver: false,
          }),
          Animated.timing(ringScale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: false,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.4,
            duration: 0,
            useNativeDriver: false,
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
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  // Auto-advance timer: only when autoPlay is true
  useEffect(() => {
    if (!autoPlay) return;

    if (item.type === "bell") return;
    if (currentStep >= PRAYER_SEQUENCE.length - 1) {
      setAutoPlay(false);
      return;
    }
    const timeout = setTimeout(() => {
      transitionToNext();
    }, item.duration);
    return () => clearTimeout(timeout);
  }, [currentStep, autoPlay, item]);

  // Auto-scroll for closing prayer
  useEffect(() => {
    let interval: any;

    if (item.type === "prayer") {
      interval = setInterval(() => {
        scrollY.current += 0.9;
        scrollRef.current?.scrollTo({ y: scrollY.current, animated: false });
      }, 30);
    }
    return () => {
      clearInterval(interval);
      scrollY.current = 0;
    };
  }, [currentStep]);

  // Completion handler
  useEffect(() => {
    if (currentStep !== PRAYER_SEQUENCE.length - 1) return;
    const timeout = setTimeout(async () => {
      if (onComplete) await onComplete();
      setShowCompletionModal(true);
    }, item.duration);
    return () => clearTimeout(timeout);
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < PRAYER_SEQUENCE.length - 1) {
      setCurrentStep((p) => p + 1);
    }
  };

  const handleRestart = () => {
    // Stop any currently playing voice audio
    audioRef.current?.remove?.();
    audioRef.current = null;
    setAutoPlay(false); // ← restart goes to idle; user taps "Auto Pray" to start
    scrollY.current = 0;

    scrollRef.current?.scrollTo({
      y: 0,
      animated: false,
    });

    // Reset animations
    fadeAnim.setValue(0);

    // Go back to beginning
    setCurrentStep(0);
  };

  const renderPrayer = () => {
    if (item.type === "versicle")
      return (
        <Animated.Text style={[styles.versicle, { opacity: fadeAnim }]}>
          {item.text}
        </Animated.Text>
      );
    if (item.type === "response")
      return (
        <Animated.Text style={[styles.responseItalic, { opacity: fadeAnim }]}>
          {item.text}
        </Animated.Text>
      );
    if (item.type === "prayer")
      return (
        <Animated.Text style={[styles.prayer, { opacity: fadeAnim }]}>
          {item.text}
        </Animated.Text>
      );
  };

  return (
    <>
      {/* HEADER */}
      <View style={styles.header}>
        <Image source={require("../../assets/Logo.png")} style={styles.logo} />
        <View style={styles.bellContainer}>
          <Animated.Image
            source={require("../../assets/ring.png")}
            style={[
              styles.bellEffect,
              { opacity: ringOpacity, transform: [{ scale: ringScale }] },
            ]}
            resizeMode="contain"
          />
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
      <SafeAreaView style={styles.container}>
        <Text style={styles.subtitle}>
          Meditating on the mystery of the Incarnation
        </Text>
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
        <View
          style={[
            styles.imageContainer,
            { height: Math.min(Math.max(width * 0.5, 160), 220) },
          ]}
        >
          <Image
            source={require("../../assets/angelus.png")}
            style={styles.image}
          />

          {/* Top fade */}
          {/* <LinearGradient
          colors={["#F8F1E7", "transparent"]}
          style={styles.topGradient}
          pointerEvents="none"
        /> */}

          {/* Bottom fade */}
          {/* <LinearGradient
          colors={["transparent", "#F8F1E7"]}
          style={styles.bottomGradient}
          pointerEvents="none"
        /> */}
        </View>
        {/* 📜 PRAYER CARD */}

        <View
          style={[
            styles.card,
            {
              minHeight: sizes.cardHeight,
              maxHeight: sizes.cardHeight,
            },
          ]}
        >
          {item.type === "prayer" ? (
            <View style={styles.prayerScrollWindow}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                ref={scrollRef}
                contentContainerStyle={[
                  styles.cardContent,
                  item.type === "prayer" && styles.prayerContent,
                ]}
              >
                {renderPrayer()}
              </ScrollView>
              <LinearGradient
                colors={["#FFFAF2", "transparent"]}
                style={styles.topFade}
                pointerEvents="none"
              />
              <LinearGradient
                colors={["transparent", "#FFFAF2"]}
                style={styles.bottomFade}
                pointerEvents="none"
              />
            </View>
          ) : item.type === "bell" ? (
            <View style={styles.bellCardContent}>
              {/* The NEXT prayer underneath */}
              <Animated.View
                style={[
                  StyleSheet.absoluteFillObject,
                  styles.nextPrayerLayer,
                  {
                    opacity: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.25, 1],
                    }),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.upcomingPrayer,
                    {
                      fontSize: sizes.titleFont,
                      lineHeight: sizes.bodyLineHeight,
                    },
                  ]}
                >
                  {nextItem?.text || ""}
                </Text>
              </Animated.View>

              {/* Full frosted overlay */}
              <BlurView intensity={50} tint="light" style={styles.fullCardBlur}>
                <View style={styles.blurInner}></View>
              </BlurView>
            </View>
          ) : (
            <View style={styles.normalContent}>{renderPrayer()}</View>
          )}
        </View>

        {/* ⚪ DOTS */}
        <View
          style={[
            styles.dots,
            isTinyScreen && {
              flexWrap: "wrap",
              width: dotsWidth,
              rowGap: 8,
            },
          ]}
        >
          {PRAYER_SEQUENCE.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                isTinyScreen && {
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                },
                i === currentStep && styles.activeDot,
              ]}
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
        <View style={styles.footerControls}>
          <TouchableOpacity
            onPress={() => {
              const next = !autoPlay;

              setAutoPlay(next);

              if (
                next &&
                audioEnabled &&
                currentStep === 0 &&
                item.type !== "bell"
              ) {
                audioRef.current?.remove?.();

                if (item.audio) {
                  const player = createAudioPlayer(item.audio);

                  audioRef.current = player;

                  player.play();
                }
              }
            }}
          >
            <Text
              style={[
                styles.footerAction,
                { fontSize: isTinyScreen ? 15 : 18 },
              ]}
            >
              {autoPlay ? "Pause" : "Auto Pray"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.footerDivider}>•</Text>

          <TouchableOpacity onPress={handleRestart}>
            <Text style={styles.footerAction}>Restart</Text>
          </TouchableOpacity>

          <Text style={styles.footerDivider}>•</Text>

          <TouchableOpacity
            onPress={() => {
              const next = !audioEnabled;

              setAudioEnabled(next);

              if (!next) {
                audioRef.current?.remove?.();
              }
            }}
          >
            <Text style={styles.footerAction}>
              {audioEnabled ? "Voice On" : "Voice Off"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      <Modal visible={showCompletionModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Ionicons name="checkmark-circle" size={64} color="#8FAF8B" />

            <Text style={styles.modalTitle}>Prayer Complete</Text>
            <Text style={styles.modalText}>
              You have completed the Angelus for this hour.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowCompletionModal(false);
                navigation.goBack();
              }}
            >
              <Text style={styles.modalButtonText}>Return Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F2EA" },
  header: {
    height: 100,
    backgroundColor: "#2F4A7A",
    paddingRight: 24,
    paddingLeft: 12,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bellContainer: {
    width: 85,
    height: 85,
    justifyContent: "center",
    alignItems: "center",
  },
  bellImage: { width: 85, height: 85, position: "absolute", zIndex: 2 },
  bellEffect: { width: 85, height: 85, position: "absolute", zIndex: 1 },
  subtitle: {
    marginTop: 18,
    marginBottom: 6,
    textAlign: "center",
    color: "#2F4A7A",
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "Cormorant-SemiBold",
    fontWeight: "400",
  },
  imageContainer: { width: "100%", height: 220 },
  image: { width: "100%", height: "100%" },
  prayerScrollWindow: {
    height: 150,
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
  },
  normalContent: { flex: 1, justifyContent: "center", alignItems: "center" },
  topFade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 40,
    zIndex: 2,
  },
  bottomFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    zIndex: 2,
  },
  card: {
    margin: 24,
    padding: 24,
    backgroundColor: "#FFFAF2",
    borderRadius: 24,
    maxHeight: 260,
    minHeight: 260,
    justifyContent: "center",
    shadowColor: "#4a392f",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
  },
  cardContent: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
  prayerContent: { paddingTop: 50, paddingBottom: 60 },
  versicle: {
    fontSize: 28,
    color: "#6F440A",
    marginBottom: 6,
    textAlign: "center",
    lineHeight: 42,
    fontFamily: "Cormorant-SemiBold",
    fontWeight: "400",
  },
  responseItalic: {
    fontSize: 28,
    color: "#6F440A",
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 42,
    fontFamily: "Cormorant-SemiBold",
    fontWeight: "400",
  },
  prayer: {
    fontSize: 28,
    lineHeight: 42,
    textAlign: "center",
    color: "#6F440A",
    fontFamily: "Cormorant-SemiBold",
    fontWeight: "400",
  },
  logo: { width: 140, height: 40, resizeMode: "contain" },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#E7DCCB" },
  activeDot: { backgroundColor: "#C9A24A" },
  button: {
    margin: 24,
    borderRadius: 32,
    overflow: "hidden",
    shadowColor: "#F5D27A",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  buttonGradient: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 32,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Cormorant-SemiBold",
    fontWeight: "400",
  },
  buttonDisabled: { opacity: 0.5 },
  timeSelector: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 24,
    marginTop: 8,
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
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  timeText: {
    color: "#C9A24A",
    fontSize: 14,
    fontFamily: "Cormorant-SemiBold",
    fontWeight: "400",
  },
  timeTextActive: {
    color: "#FFFFFF",
    fontFamily: "Cormorant-SemiBold",
    fontWeight: "400",
  },
  footerControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 26,
    marginTop: -4,
  },
  footerAction: {
    color: "#6B5E52",
    fontSize: 18,
    fontWeight: "400",
    paddingHorizontal: 6,
    fontFamily: "Cormorant-SemiBold",
  },
  footerDivider: {
    color: "#B8AA96",
    fontSize: 14,
    marginHorizontal: 2,
    fontFamily: "Cormorant-SemiBold",
    fontWeight: "400",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFAF2",
    borderRadius: 28,
    padding: 30,
    alignItems: "center",
  },
  modalTitle: {
    marginTop: 18,
    fontSize: 34,
    color: "#2F4A7A",
    fontFamily: "Cormorant-SemiBold",
    fontWeight: "400",
  },
  modalText: {
    marginTop: 12,
    textAlign: "center",
    color: "#6B5E52",
    fontSize: 18,
    lineHeight: 28,
    fontFamily: "Cormorant-SemiBold",
    fontWeight: "400",
  },
  modalButton: {
    marginTop: 26,
    backgroundColor: "#C9A24A",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 30,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "400",
    fontFamily: "Cormorant-SemiBold",
  },
  bellCardContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  nextPrayerLayer: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  upcomingPrayer: {
    fontSize: 28,
    lineHeight: 42,
    textAlign: "center",
    color: "#6F440A",
    fontFamily: "Cormorant-SemiBold",
    fontWeight: "400",
  },
  fullCardBlur: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  blurInner: { alignItems: "center", paddingHorizontal: 30 },
});
