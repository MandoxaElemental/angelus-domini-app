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
import { useKeepAwake } from "expo-keep-awake";
import { createAudioPlayer } from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabaseClient";
import { startPrayer, completePrayer } from "../api/prayerApi";

// Same key MainApp.tsx caches on successful auth and falls back to when
// offline — reused here so the notification-tap fallback path below can
// resolve a userId without needing a live network session.
const CACHED_USER_ID_KEY = "angelus_cached_user_id";

// Races a promise against a timeout so a slow/hanging network call can
// never block this fallback indefinitely — resolves to null if the
// timeout wins (mirrors the same pattern used in MainApp.tsx).
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

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
const VERBUM = `And the Word was
made flesh,`;
const CLOSING_CALL = {
  versicle: "Pray for us, O Holy Mother of God.",
  response: "That we may be made worthy of the promises of Christ.",
};

const CLOSING_PRAYER = `Let us pray:

Pour forth, we beseech Thee, O Lord, Thy grace into our hearts; that we, to whom the incarnation of Christ, Thy Son, was made known by the message of an angel, may by His Passion and Cross be brought to the glory of His Resurrection, through the same Christ Our Lord.
Amen.

`;

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
    text: "The Angel of the Lord declared unto Mary,",
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
    duration: 6900,
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
    duration: 6900,
    audio: require("../../assets/audio/HolyMaryV2.mp3"),
  },
  { type: "bell", text: "", count: 3, duration: 9900 },
  {
    type: "versicle",
    text: VERBUM,
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
    duration: 6900,
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
    duration: 20000,
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
  useKeepAwake();
  const { width } = useWindowDimensions();

  const isSmallScreen = width <= 360;
  const isTinyScreen = width <= 340;

  const sizes = {
    headerHeight: isTinyScreen ? 82 : isSmallScreen ? 90 : 100,
    titleFont: isTinyScreen ? 24 : isSmallScreen ? 27 : 30,
    bodyLineHeight: isTinyScreen ? 34 : isSmallScreen ? 38 : 42,
    imageHeight: isTinyScreen ? 160 : isSmallScreen ? 185 : 220,
    cardHeight: isTinyScreen ? 240 : isSmallScreen ? 280 : 300,
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
  const isHailMary =
    item.text === HAIL_MARY_PART_1 || item.text === HAIL_MARY_PART_2;
  const nextItem = PRAYER_SEQUENCE[currentStep + 1];

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.4)).current;
  const bellRotate = useRef(new Animated.Value(0)).current;

  // Single persistent audio player ref — NEVER destroyed for mute/unmute
  const audioRef = useRef<any>(null);
  // Tracks whichever bell strike is currently sounding, so Pause/Restart
  // can kill it instantly instead of waiting for the ring to finish.
  const bellAudioRef = useRef<any>(null);

  const [autoPlay, setAutoPlay] = useState(false);
  // Tracks whether playback has ever started, so the button reads
  // "Resume" after a pause instead of reverting to "Auto Pray".
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Ref mirrors audioEnabled so effects always read the latest value
  // without being listed as a dependency (avoids restarts on toggle).
  // This is also what the audio-creation effect below reads from, so a
  // newly created player on step change always honours the current
  // mute state instead of resetting back to "on".
  const audioEnabledRef = useRef(true);

  const isTransitioning = useRef(false);

  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const onComplete = route.params?.onComplete;

  // ─── FALLBACK SELF-COMPLETION (fixes "Missed" after tapping a push
  // notification) ─────────────────────────────────────────────────────────
  // MainApp.tsx and the auto-trigger effect both navigate here WITH a real
  // onComplete closure, because they already have userId/session in scope.
  // But when this screen is opened by tapping the OS push notification
  // (cold start via launchNotificationRoute, or warm/background via
  // navigationRef.reset in App.tsx), the code that navigates here has no
  // access to userId or a live session — it can only pass { autoPlay: true }.
  // That left onComplete undefined, so completePrayer() never ran and the
  // session stayed Completed: false, showing as "Missed" back on MainApp.
  //
  // This effect only engages when onComplete is missing. startPrayer() is
  // idempotent per user+slot (it looks up an existing row before creating
  // one — see prayerApi.ts), so calling it again here is always safe, even
  // if MainApp already created the session for this slot.
  //
  // FIX: this previously ONLY tried supabase.auth.getSession() — with no
  // offline fallback. Tapping the notification while offline meant
  // getSession() could come back with no confirmed session (it may try to
  // refresh an expiring token, which needs network), leaving `uid`
  // undefined, fallbackUserIdRef never getting set, and the prayer
  // silently never marked complete ("prayer will not be marked complete"
  // warning below). This is exactly why offline notification-tap
  // completions weren't counting even though the same flow worked fine
  // online. Now, if getSession() doesn't yield a uid, we fall back to the
  // same cached userId (angelus_cached_user_id) that MainApp.tsx already
  // relies on for its own offline path — startPrayer()/completePrayer()
  // are already offline-safe once they have a uid, so this is the only
  // piece that was missing here.
  const fallbackUserIdRef = useRef<string | null>(null);
  const fallbackSessionIdRef = useRef<string | null>(null);
  const fallbackSlotRef = useRef<string | null>(null);

  useEffect(() => {
    if (onComplete) return; // real callback already supplied — nothing to do
    let cancelled = false;

    (async () => {
      try {
        let uid: string | undefined;

        try {
          const sessionResult = await withTimeout(supabase.auth.getSession(), 4000);
          uid = sessionResult?.data?.session?.user?.id;
        } catch (err) {
          console.warn("[PrayerScreen] getSession failed (offline?):", err);
        }

        // Offline, or the network session check didn't confirm one —
        // fall back to the cached userId from the last successful login,
        // same as MainApp.tsx's initOfflineFallback.
        if (!uid) {
          try {
            uid = (await AsyncStorage.getItem(CACHED_USER_ID_KEY)) ?? undefined;
          } catch (err) {
            console.warn("[PrayerScreen] cached userId read failed:", err);
          }
        }

        if (!uid || cancelled) return;

        const prayerSession = await startPrayer(uid);
        if (cancelled) return;

        fallbackUserIdRef.current = uid;
        fallbackSessionIdRef.current = prayerSession.sessionId;
        fallbackSlotRef.current = prayerSession.slot;
      } catch (err) {
        console.error("[PrayerScreen] fallback session init error:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const fromNotification = route.params?.autoPlay === true;
    setAutoPlay(fromNotification);
    if (fromNotification) {
      setHasPlayedOnce(true);
      navigation.setParams({ autoPlay: undefined });
    }
  }, []);

  const [selectedTime, setSelectedTime] = useState(getCurrentPrayerTime());

  useEffect(() => {
    const update = () => setSelectedTime(getCurrentPrayerTime());
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  // Instantly kills whatever is currently making sound — voice clip or a
  // mid-ring bell strike. Used by Pause and Restart so both act with zero
  // delay instead of waiting for the current clip/ring to finish.
  const stopAllAudio = () => {
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch (_) {}
      try { audioRef.current.remove(); } catch (_) {}
      audioRef.current = null;
    }
    if (bellAudioRef.current) {
      try { bellAudioRef.current.pause(); } catch (_) {}
      try { bellAudioRef.current.remove(); } catch (_) {}
      bellAudioRef.current = null;
    }
  };

  // Instantly halts the bell ring/swing visuals (the glow pulse and bell
  // swing triggered by each strike) and resets them to their resting
  // pose, so Pause doesn't leave a ring animation finishing on its own.
  const stopAllAnimations = () => {
    ringScale.stopAnimation(() => ringScale.setValue(1));
    ringOpacity.stopAnimation(() => ringOpacity.setValue(0.4));
    bellRotate.stopAnimation(() => bellRotate.setValue(0));
  };

  const transitionToNext = () => {
    if (isTransitioning.current) return;
    if (currentStep >= PRAYER_SEQUENCE.length - 1) return;

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

  // ─── CORE AUDIO EFFECT ───────────────────────────────────────────────────
  // Fires only when the step or autoPlay changes — NOT when audioEnabled
  // changes. Mute/unmute while a clip is playing is still handled by
  // directly setting player.volume = 0/1 on the live instance (instant,
  // zero echo). The fix here: whenever a NEW player is created (i.e. every
  // time we advance to the next step), it must be created with whatever
  // mute state the user last chose — read from audioEnabledRef — instead
  // of always starting at volume 1. That's what was causing voice to
  // come back on automatically after being turned off.
  useEffect(() => {
    if (item.type === "bell") return;
    if (!autoPlay) return;

    // Kill any previous player cleanly before creating a new one.
    // This is the ONLY place we create/destroy players.
    if (audioRef.current) {
      try { audioRef.current.remove(); } catch (_) {}
      audioRef.current = null;
    }

    const player = createAudioPlayer(item.audio);
    audioRef.current = player;

    // Respect the user's last mute choice instead of forcing volume on.
    player.volume = audioEnabledRef.current ? 1 : 0;

    player.play();

    return () => {
      try { player.remove(); } catch (_) {}
      audioRef.current = null;
    };
  }, [currentStep, autoPlay]); // audioEnabled intentionally EXCLUDED
  // ─────────────────────────────────────────────────────────────────────────

  const animateBellSwing = () => {
    bellRotate.setValue(0);
    Animated.sequence([
      Animated.timing(bellRotate, {
        toValue: -1,
        duration: 300,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(bellRotate, {
        toValue: 1,
        duration: 600,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(bellRotate, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const playBellSequence = async (count: number, shouldContinue: () => boolean) => {
    for (let i = 0; i < count; i++) {
      if (!shouldContinue()) return;

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
      ]).start();

      const player = createAudioPlayer(require("../../assets/audio/bell.mp3"));
      // Bells are NEVER affected by the voice mute toggle — always full volume.
      player.volume = 1;
      bellAudioRef.current = player;
      animateBellSwing();
      player.play();

      await new Promise((resolve) => setTimeout(resolve, 2500));

      // Only clear/remove if Pause/Restart hasn't already done it via
      // stopAllAudio() — avoids double-removing the same player.
      if (bellAudioRef.current === player) {
        try { player.remove(); } catch (_) {}
        bellAudioRef.current = null;
      }

      if (!shouldContinue()) return;
    }
  };

  useEffect(() => {
    if (item.type !== "bell") return;
    let cancelled = false;
    const shouldContinue = () => !cancelled;

    const runBell = async () => {
      await new Promise((r) => setTimeout(r, 500));
      if (cancelled) return;

      await playBellSequence(item.count, shouldContinue);
      if (cancelled) return;

      await new Promise((r) => setTimeout(r, 900));
      if (cancelled) return;

      transitionToNext();
    };

    runBell();
    return () => { cancelled = true; };
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
        ]),
        Animated.parallel([
          Animated.timing(ringScale, { toValue: 1, duration: 0, useNativeDriver: false }),
          Animated.timing(ringOpacity, { toValue: 0.4, duration: 0, useNativeDriver: false }),
        ]),
      ]),
    );
    pulse.start();
    return () => { pulse.stop(); };
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

  // Auto-advance timer — audioEnabled intentionally excluded from deps
  useEffect(() => {
    if (!autoPlay) return;
    if (item.type === "bell") return;

    const timeout = setTimeout(() => {
      transitionToNext();
    }, item.duration);

    return () => clearTimeout(timeout);
  }, [currentStep, autoPlay]);

  // Auto-scroll for closing prayer
  useEffect(() => {
    let interval: any;
    if (item.type === "prayer") {
      interval = setInterval(() => {
        scrollY.current += 1.1;
        scrollRef.current?.scrollTo({ y: scrollY.current, animated: false });
      }, 25);
    }
    return () => {
      clearInterval(interval);
      scrollY.current = 0;
    };
  }, [currentStep]);

  // Completion handler
  // FIX: falls back to a self-contained completePrayer() call when this
  // screen was launched without an onComplete param (i.e. via a tapped
  // push notification) — see the fallback effect above for why that
  // happens and why calling startPrayer()/completePrayer() here is safe.
  useEffect(() => {
    if (currentStep !== PRAYER_SEQUENCE.length - 1) return;
    const timeout = setTimeout(async () => {
      if (onComplete) {
        await onComplete();
      } else if (fallbackUserIdRef.current && fallbackSessionIdRef.current) {
        try {
          await completePrayer(fallbackUserIdRef.current, fallbackSessionIdRef.current);
        } catch (err) {
          console.error("[PrayerScreen] fallback completePrayer error:", err);
        }
      } else {
        console.warn(
          "[PrayerScreen] No onComplete and no fallback session available — prayer will not be marked complete.",
        );
      }
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
    stopAllAudio();
    stopAllAnimations();
    isTransitioning.current = false;
    scrollY.current = 0;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    fadeAnim.setValue(0);
    setCurrentStep(0);
    setHasPlayedOnce(true);
    // Start playing immediately — no need to tap "Auto Pray" again.
    setAutoPlay(true);
  };

  // Pause now kills any currently-sounding audio (voice clip or a
  // mid-ring bell strike) AND the bell's ring/swing animation the instant
  // it's pressed, instead of letting the current clip/ring finish first.
  const handlePauseToggle = () => {
    const next = !autoPlay;
    if (next) {
      setHasPlayedOnce(true);
    } else {
      stopAllAudio();
      stopAllAnimations();
    }
    setAutoPlay(next);
  };

  // ─── VOICE TOGGLE ─────────────────────────────────────────────────────────
  // KEY INSIGHT: we do NOT create or destroy the player here.
  // We simply flip the volume on the already-playing instance.
  // This is instantaneous, causes zero echo, and doesn't touch the rhythm.
  // The ref update is what makes the mute state "stick" across step
  // changes — the audio-creation effect above reads it for every new clip.
  const handleVoiceToggle = () => {
    const next = !audioEnabled;

    // Update ref first — synchronous, no re-render race. This is the
    // source of truth the audio-creation effect reads from.
    audioEnabledRef.current = next;

    // Apply to the live player immediately — zero delay
    if (audioRef.current) {
      try {
        audioRef.current.volume = next ? 1 : 0;
      } catch (_) {}
    }

    // Update state last (only drives the button label)
    setAudioEnabled(next);
  };
  // ─────────────────────────────────────────────────────────────────────────

  const renderPrayer = () => {
    if (item.type === "versicle")
      return (
        <Animated.Text
          style={[
            styles.versicle,
            isHailMary && styles.hailMaryText,
            { opacity: fadeAnim },
          ]}
        >
          {item.text}
        </Animated.Text>
      );
    if (item.type === "response")
      return (
        <Animated.Text
          style={[
            styles.responseItalic,
            isHailMary && styles.hailMaryTextItalic,
            { opacity: fadeAnim },
          ]}
        >
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

  const [fontsLoaded] = useFonts({
    Cormorant: require("../../assets/fonts/CormorantGaramond.ttf"),
    Cormorant_Italic: require("../../assets/fonts/CormorantGaramond-Italic.ttf"),
    EBGaramond: require("../../assets/fonts/EBGaramond-Medium.ttf"),
  });

  if (!fontsLoaded) return null;

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
                      outputRange: ["-18deg", "18deg"],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>
      </View>

      <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
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
              <View key={t.value}>
                <LinearGradient
                  colors={active ? ["#3D5C97", "#2F4A7A"] : ["#FDF6EA", "#EEDFC4"]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={[
                    [styles.timeButton, !active && { opacity: 0.45 }],
                    active && styles.timeButtonActive,
                  ]}
                >
                  <Text style={[styles.timeText, active && styles.timeTextActive]}>
                    {t.label}
                  </Text>
                </LinearGradient>
              </View>
            );
          })}
        </View>

        {/* IMAGE */}
        <View style={[styles.imageContainer, { height: Math.min(Math.max(width * 0.5, 160), 220) }]}>
          <Image source={require("../../assets/angelus.png")} style={styles.image} />
        </View>

        {/* PRAYER CARD */}
        <View style={[styles.card, { minHeight: sizes.cardHeight, maxHeight: sizes.cardHeight }]}>
          {item.type === "prayer" ? (
            <View style={styles.prayerScrollWindow}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                ref={scrollRef}
                contentContainerStyle={[styles.cardContent, styles.prayerContent]}
              >
                {renderPrayer()}
              </ScrollView>
              <LinearGradient
                colors={["#FFFAF2", "rgba(255,250,242,0)"]}
                style={styles.topFade}
                pointerEvents="none"
              />
              <LinearGradient
                colors={["rgba(255,250,242,0)", "#FFFAF2"]}
                style={styles.bottomFade}
                pointerEvents="none"
              />
            </View>
          ) : item.type === "bell" ? (
            <View style={styles.bellCardContent}>
              <Animated.View
                style={[
                  StyleSheet.absoluteFillObject,
                  styles.nextPrayerLayer,
                  {
                    opacity: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 0.08],
                    }),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.upcomingPrayer,
                    { fontSize: sizes.titleFont, lineHeight: sizes.bodyLineHeight },
                  ]}
                >
                  {nextItem?.text || ""}
                </Text>
              </Animated.View>
              <BlurView intensity={50} tint="light" style={styles.fullCardBlur}>
                <View style={styles.blurInner} />
              </BlurView>
            </View>
          ) : (
            <View style={styles.normalContent}>{renderPrayer()}</View>
          )}
        </View>

        {/* DOTS */}
        <View
          style={[
            styles.dots,
            isTinyScreen && { flexWrap: "wrap", width: dotsWidth, rowGap: 8 },
          ]}
        >
          {PRAYER_SEQUENCE.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                isTinyScreen && { width: 6, height: 6, borderRadius: 3 },
                i === currentStep && styles.activeDot,
              ]}
            />
          ))}
        </View>

        {/* CONTROLS */}
        <View style={styles.footerControls}>
          <TouchableOpacity onPress={handlePauseToggle}>
            <Text style={[styles.footerAction, { fontSize: isTinyScreen ? 15 : 18 }]}>
              {autoPlay ? "Pause" : hasPlayedOnce ? "Resume" : "Pray"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.footerDivider}>•</Text>

          <TouchableOpacity onPress={handleRestart}>
            <Text style={styles.footerAction}>Restart</Text>
          </TouchableOpacity>

          <Text style={styles.footerDivider}>•</Text>

          {/* Volume is set directly on the live player — instant, no echo.
              Label shows the ACTION the tap performs, not the current
              state: sound currently playing -> "Voice Off" (tap mutes),
              currently muted -> "Voice On" (tap unmutes). */}
          <TouchableOpacity onPress={handleVoiceToggle}>
            <Text style={styles.footerAction}>
              {audioEnabled ? "Voice Off" : "Voice On"}
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
                // Use reset() when there's no screen to go back to
                // (e.g. cold-started directly onto Prayer via a tapped
                // notification — see TabLayout's initialNotificationRoute).
                // goBack() alone would silently no-op in that case.
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.reset({ index: 0, routes: [{ name: "Tabs" }] });
                }
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
    fontFamily: "Cormorant",
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
    borderColor: "#C9A24A",
    borderWidth: 1,
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
    fontSize: 32,
    color: "#3F2E24",
    marginBottom: 6,
    textAlign: "center",
    lineHeight: 45,
    fontFamily: "Cormorant",
    fontWeight: "500",
  },
  responseItalic: {
    fontSize: 32,
  color: "#3F2E24",
  marginBottom: 6,
  textAlign: "center",
  lineHeight: 45,
  fontFamily: "Cormorant",
  fontWeight: "500",
  },
  hailMaryText: { fontSize: 28, lineHeight: 38 },
  hailMaryTextItalic: { fontSize: 28, lineHeight: 38 },
  prayer: {
    fontSize: 32,
    lineHeight: 45,
    textAlign: "center",
    color: "#3F2E24",
    fontFamily: "Cormorant",
    fontWeight: "500",
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
    fontFamily: "Cormorant",
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
    fontFamily: "EBGaramond",
    fontWeight: "400",
  },
  timeTextActive: {
    color: "#FFFFFF",
    fontFamily: "EBGaramond",
    fontWeight: "400",
  },
  footerControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 26,
    marginTop: 10,
  },
  footerAction: {
    color: "#6B5E52",
    fontSize: 18,
    fontWeight: "400",
    paddingHorizontal: 6,
    fontFamily: "Cormorant",
  },
  footerDivider: {
    color: "#B8AA96",
    fontSize: 14,
    marginHorizontal: 2,
    fontFamily: "Cormorant",
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
    fontFamily: "Cormorant",
    fontWeight: "400",
  },
  modalText: {
    marginTop: 12,
    textAlign: "center",
    color: "#6B5E52",
    fontSize: 18,
    lineHeight: 28,
    fontFamily: "Cormorant",
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
    fontFamily: "Cormorant",
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
    fontSize: 32,
    lineHeight: 45,
    textAlign: "center",
    color: "#3F2E24",
    fontFamily: "Cormorant",
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