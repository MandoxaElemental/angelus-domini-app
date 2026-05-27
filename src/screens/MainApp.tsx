import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  Animated,
  Modal,
  Easing,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { createAudioPlayer } from "expo-audio";
import { Ionicons } from "@expo/vector-icons";

import { logout } from "../store/auth";

import {
  getNextPrayer,
  getPrayerStatus,
  formatPrayerTime,
  PrayerStatus,
} from "../utils/prayer";

import { completePrayer, getGlobalCount, startPrayer } from "../api/prayerApi";

import { supabase } from "../lib/supabaseClient";

type Props = {
  onLogout: () => void;
};

const COLORS = {
  navy: "#2F4A7A",
  navyDark: "#243A61",

  gold: "#C9A24A",
  goldBright: "#D4AF57",

  cream: "#F7F2EA",
  card: "#FFFAF2",

  textPrimary: "#53433B",
  textSecondary: "#6B5E52",

  border: "#E7DCCB",

  success: "#8FAF8B",
  muted: "#B8AA96",
};

const prayerImages: Record<string, any> = {
  Morning: require("../../assets/Morning.svg"),
  Noon: require("../../assets/Noon.svg"),
  Evening: require("../../assets/Evening.svg"),
};

const timeImages: Record<string, any> = {
  Morning: require("../../assets/Morning_Clear.svg"),
  Afternoon: require("../../assets/Noon_Clear.svg"),
  Evening: require("../../assets/Evening_Clear.svg"),
};
const progressImages: Record<string, any> = {
  Morning: require("../../assets/Morning_Clear.svg"),
  Noon: require("../../assets/Noon_Clear.svg"),
  Evening: require("../../assets/Evening_Clear.svg"),
};

const completeImages: Record<string, any> = {
  Morning: require("../../assets/1.png"),
  Noon: require("../../assets/2.png"),
  Evening: require("../../assets/3.png"),
};

export default function MainApp({ onLogout }: Props) {
  const navigation = useNavigation<any>();

  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.4)).current;
  const bellRotate = useRef(new Animated.Value(0)).current;

  const [timeLeft, setTimeLeft] = useState("00:00:00");

  const [session, setSession] = useState<any>(null);

  const [count, setCount] = useState(0);

  const [userId, setUserId] = useState("");

  const [username, setUsername] = useState("");

  const [isPraying, setIsPraying] = useState(false);

  const [showPrayerPopup, setShowPrayerPopup] = useState(false);

  const [completedPrayers, setCompletedPrayers] = useState({
    morning: false,
    noon: false,
    evening: false,
  });

  const lastTriggeredPrayer = useRef<string | null>(null);

  const currentHour = new Date().getHours();

  const greeting =
    currentHour < 12 ? "Morning" : currentHour < 18 ? "Afternoon" : "Evening";

  const currentPrayer = useMemo(() => {
    const next = getNextPrayer();

    return {
      title: next.title,
      icon: next.icon,
      time: next.time,
    };
  }, []);

  // ─────────────────────────────────────────────────────────────
  // AUTH + SESSION
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        let {
          data: { session: authSession },
        } = await supabase.auth.getSession();

        if (!authSession?.user?.id) {
          console.log("Waiting for session restore...");

          await new Promise<void>((resolve) => {
            const {
              data: { subscription },
            } = supabase.auth.onAuthStateChange((_event, s) => {
              if (s) {
                authSession = s;

                subscription.unsubscribe();

                resolve();
              }
            });

            setTimeout(resolve, 5000);
          });
        }

        if (!authSession?.user?.id) {
          console.error("No authenticated user");
          return;
        }

        const uid = authSession.user.id;

        setUserId(uid);

        const metaUsername =
          authSession.user.user_metadata?.username ||
          authSession.user.user_metadata?.name;

        if (metaUsername) {
          setUsername(metaUsername);
        } else {
          const { data: userData } = await supabase
            .from("users")
            .select("username")
            .eq("id", uid)
            .single();

          if (userData?.username) {
            setUsername(userData.username);
          }
        }

        const sess = await startPrayer(uid);

        setSession(sess);

        const globalCount = await getGlobalCount(sess.slot);

        setCount(globalCount);
      } catch (err) {
        console.error("Mount error:", err);
      }
    })();
  }, []);

  // ─────────────────────────────────────────────────────────────
  // BELL PULSE
  // ─────────────────────────────────────────────────────────────

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

    return () => pulse.stop();
  }, []);

  // ─────────────────────────────────────────────────────────────
  // BELL SWING
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const swing = () => {
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
      ]).start(() => setTimeout(swing, 3000));
    };

    const timer = setTimeout(swing, 1000);

    return () => clearTimeout(timer);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // COUNTDOWN TIMER
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const updateCountdown = () => {
      const nextPrayer = getNextPrayer();

      const now = new Date();

      const diff = nextPrayer.time.getTime() - now.getTime();

      const hrs = Math.floor(diff / 1000 / 3600);

      const mins = Math.floor((diff % (1000 * 3600)) / (1000 * 60));

      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hrs.toString().padStart(2, "0")}:${mins
          .toString()
          .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`,
      );
    };

    updateCountdown();

    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // AUTO PRAYER TRIGGER
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const checkPrayerTime = () => {
      const nextPrayer = getNextPrayer();

      const now = new Date();

      const diff = nextPrayer.time.getTime() - now.getTime();

      if (diff <= 1000 && diff >= 0) {
        const prayerKey = `${nextPrayer.title}-${now.toDateString()}`;

        if (lastTriggeredPrayer.current === prayerKey) return;

        lastTriggeredPrayer.current = prayerKey;

        setShowPrayerPopup(true);

        playTripleBell();

        setTimeout(() => {
          setShowPrayerPopup(false);

          navigation.navigate("Prayer", {
            onComplete: async () => {
              try {
                if (!session || !userId) return;

                await completePrayer(userId, session.sessionId);

                const newCount = await getGlobalCount(session.slot);

                setCount(newCount);

                const slotKey = session.slot.includes("_6")
                  ? "morning"
                  : session.slot.includes("_12")
                    ? "noon"
                    : "evening";

                setCompletedPrayers((prev) => ({
                  ...prev,
                  [slotKey]: true,
                }));
              } catch (err) {
                console.error("Auto-trigger completion error:", err);
              }
            },
          });
        }, 7000);
      }
    };

    const interval = setInterval(checkPrayerTime, 1000);

    return () => clearInterval(interval);
  }, [session, userId]);

  // ─────────────────────────────────────────────────────────────
  // AUDIO
  // ─────────────────────────────────────────────────────────────

  const playTripleBell = async () => {
    for (let i = 0; i < 3; i++) {
      const player = createAudioPlayer(require("../../assets/audio/bell.mp3"));

      player.play();

      await new Promise((resolve) => setTimeout(resolve, 2200));

      player.remove();
    }
  };

  // ─────────────────────────────────────────────────────────────
  // COMPLETE PRAYER
  // ─────────────────────────────────────────────────────────────

  const handleComplete = async () => {
    if (!session || !userId) return;

    navigation.navigate("Prayer", {
      onComplete: async () => {
        try {
          setIsPraying(true);

          await completePrayer(userId, session.sessionId);

          const newCount = await getGlobalCount(session.slot);

          setCount(newCount);

          const slotKey = session.slot.includes("_6")
            ? "morning"
            : session.slot.includes("_12")
              ? "noon"
              : "evening";

          setCompletedPrayers((prev) => ({
            ...prev,
            [slotKey]: true,
          }));
        } catch (err) {
          console.error("Prayer completion error:", err);
        } finally {
          setIsPraying(false);
        }
      },
    });
  };

  // ─────────────────────────────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();

      await logout();

      onLogout();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const morningStatus = getPrayerStatus("morning", completedPrayers.morning);

  const noonStatus = getPrayerStatus("noon", completedPrayers.noon);

  const eveningStatus = getPrayerStatus("evening", completedPrayers.evening);

  return (
    <>
      {/* PRAYER POPUP */}

      <Modal visible={showPrayerPopup} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Ionicons name="notifications" size={42} color={COLORS.gold} />

            <Text style={styles.modalTitle}>Angelus Time</Text>

            <Text style={styles.modalText}>
              The bells are calling you to prayer.
            </Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowPrayerPopup(false);

                navigation.navigate("Prayer", {
                  onComplete: async () => {
                    try {
                      if (!session || !userId) return;

                      await completePrayer(userId, session.sessionId);

                      const newCount = await getGlobalCount(session.slot);

                      setCount(newCount);

                      const slotKey = session.slot.includes("_6")
                        ? "morning"
                        : session.slot.includes("_12")
                          ? "noon"
                          : "evening";

                      setCompletedPrayers((prev) => ({
                        ...prev,
                        [slotKey]: true,
                      }));
                    } catch (err) {
                      console.error("Modal completion error:", err);
                    }
                  },
                });
              }}
            >
              <Text style={styles.modalButtonText}>Pray Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Image
            source={require("../../assets/Logo.png")}
            style={styles.logo}
          />

          <View style={styles.bellContainer}>
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
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* HEADER */}

          {/* GREETING */}

          <View style={styles.greetingRow}>
            <View style={styles.sunIcon}>
              <Image
                source={timeImages[greeting]}
                style={styles.progressImage}
                resizeMode="contain"
              />
            </View>

            <View>
              <Text style={styles.greetingTitle}>
                Good {greeting}
                {username ? `, ${username}` : ""}
              </Text>
            </View>
          </View>

          {/* NEXT PRAYER */}

          <View style={styles.mainCard}>
            <View style={styles.cardImage}>
              <Image
                source={prayerImages[currentPrayer.icon]}
                style={{ width: 140, height: 180 }}
                resizeMode="contain"
              />
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>NEXT PRAYER</Text>

              <Text style={styles.cardTitle}>
                {formatPrayerTime(currentPrayer.time)}
              </Text>

              <Text style={styles.cardTime}>{currentPrayer.title}</Text>

              <Image
                source={require("../../assets/Divider.svg")}
                style={styles.cardDivider}
                resizeMode="contain"
              />
              <View style={styles.timeRow}>
                <Ionicons name="time-outline" size={30} color={COLORS.gold} />

                <Text style={styles.timeText}>in {timeLeft}</Text>
              </View>
            </View>
          </View>

          {/* DAILY PROGRESS */}

          <View style={styles.sectionHeader}>
            <Image
              source={require("../../assets/DividerLeft.svg")}
              style={styles.dividerHalf}
              resizeMode="contain"
            />

            <Text style={styles.sectionHeaderText}>DAILY PRAYER PROGRESS</Text>

            <Image
              source={require("../../assets/DividerRight.svg")}
              style={styles.dividerHalf}
              resizeMode="contain"
            />
          </View>

          <View style={styles.progressRow}>
            <ProgressCard
              title="Morning"
              status={morningStatus}
              onPress={handleComplete}
            />

            <ProgressCard
              title="Noon"
              status={noonStatus}
              onPress={handleComplete}
            />

            <ProgressCard
              title="Evening"
              status={eveningStatus}
              onPress={handleComplete}
            />
          </View>

          {/* GLOBAL CARD */}

          <View style={styles.globalCard}>
            <View style={styles.globe}>
              <Image
                source={require("../../assets/Global.svg")}
                style={styles.globeIcon}
              />
            </View>

            <View style={styles.globalRight}>
              <Text style={styles.globalLabel}>GLOBAL PRAYER TODAY</Text>

              <View style={styles.globalCountRow}>
                <Text style={styles.globalCount}>{count.toLocaleString()}</Text>

                <Text style={styles.globalPrayedToday}>prayed today</Text>
              </View>

              <Text style={styles.globalText}>
                United in prayer around the world.
              </Text>

              <Image
                source={require("../../assets/Divider.svg")}
                style={styles.globalDivider}
                resizeMode="contain"
              />
              <View style={styles.nowPrayingRow}>
                <Text style={styles.nowPrayingLabel}>Now praying:</Text>

                <View style={styles.nowPrayingItem}>
                  <Text style={styles.nowPrayingFlag}>🇵🇭</Text>

                  <Text style={styles.nowPrayingCountry}>Philippines</Text>

                  <Text style={styles.nowPrayingCount}>8,420</Text>
                </View>

                <Text style={styles.nowPrayingDot}> • </Text>

                <View style={styles.nowPrayingItem}>
                  <Text style={styles.nowPrayingFlag}>🇺🇸</Text>

                  <Text style={styles.nowPrayingCountry}>USA</Text>

                  <Text style={styles.nowPrayingCount}>3,210</Text>
                </View>
              </View>
            </View>
          </View>

          {/* SCRIPTURE */}

          <View style={styles.scriptureCard}>
            <Image
              source={require("../../assets/bgquote.png")}
              style={styles.scriptureImage}
              resizeMode="cover"
            />

            <View style={styles.scriptureContent}>
              <Text style={styles.scriptureQuote}>
                {
                  "Behold, I am the handmaid of the Lord. May it be done to me according to your word."
                }
              </Text>

              <Text style={styles.scriptureRef}>— Luke 1:38</Text>
            </View>
          </View>

          {/* PRAY BUTTON

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleComplete}
            disabled={isPraying}
            style={styles.buttonWrapper}
          >
            <LinearGradient
              colors={[COLORS.goldBright, COLORS.gold]}
              style={[styles.button, isPraying && { opacity: 0.7 }]}
            >
              <View style={styles.buttonInner}>
                <View style={styles.prayIcon}>
                  <Ionicons name="heart" size={18} color="#fff" />
                </View>

                <Text style={styles.buttonText}>
                  {isPraying ? "Praying..." : "Pray Now"}
                </Text>

                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </View>
            </LinearGradient>
          </TouchableOpacity> */}

          {/* LOGOUT */}
          {/* 
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity> */}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// PROGRESS CARD
// ─────────────────────────────────────────────────────────────

function ProgressCard({
  title,
  status,
  onPress,
}: {
  title: string;
  status: PrayerStatus;
  onPress?: () => void;
}) {
  const isCompleted = status === "completed";

  const isActive = status === "active";

  const isMissed = status === "missed";

  const statusConfig = isCompleted
    ? {
        text: "Completed",
        icon: "checkmark-circle",
        iconColor: "#5E9B63",
        bg: "#EEF8EE",
        border: "#B7D9BB",
        textColor: "#4D7C52",
      }
    : isActive
      ? {
          text: "Pray Now",
          icon: "ellipse",
          iconColor: COLORS.gold,
          bg: "#FFF7E7",
          border: "#E7C979",
          textColor: "#8A6412",
        }
      : isMissed
        ? {
            text: "Missed",
            icon: "close-circle",
            iconColor: "#C86B6B",
            bg: "#FFF1F1",
            border: "#E4B4B4",
            textColor: "#A44E4E",
          }
        : {
            text: "Upcoming",
            icon: "time",
            iconColor: COLORS.navy,
            bg: "#F3F5FA",
            border: "#D4DBEA",
            textColor: COLORS.navy,
          };

  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.05,
            duration: 900,
            useNativeDriver: true,
          }),

          Animated.timing(pulse, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [isActive]);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      disabled={!isActive}
      onPress={onPress}
      style={{ width: "31%" }}
    >
      <Animated.View
        style={[
          styles.progressCard,
          isActive && styles.progressCardActive,
          isMissed && styles.progressCardMissed,
          isActive && {
            transform: [{ scale: pulse }],
          },
        ]}
      >
        <View
          style={[
            styles.progressIcon,
            isCompleted && {
              backgroundColor: "#DCE8D9",
            },

            isActive && {
              backgroundColor: "#F7E6B8",
            },
          ]}
        >
          <Image
            source={isCompleted ? completeImages[title] : progressImages[title]}
            style={styles.progressImage}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.progressTitle}>{title}</Text>

        <Text style={styles.progressTitleUnder}>Angelus</Text>

        <View
          style={[
            styles.progressBox,
            {
              backgroundColor: statusConfig.bg,
              borderColor: statusConfig.border,
            },
          ]}
        >
          <Ionicons
            name={statusConfig.icon as any}
            size={18}
            color={statusConfig.iconColor}
            style={{ marginRight: 5 }}
          />

          <Text
            style={[
              styles.progressSubtitle,
              {
                color: statusConfig.textColor,
              },
            ]}
          >
            {statusConfig.text}
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },

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

  logo: {
    width: 180,
    height: 60,
    resizeMode: "contain",
  },

  logoutBtn: {
    marginTop: 20,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },

  logoutText: {
    color: COLORS.gold,
    fontWeight: "600",
  },

  bellContainer: {
    width: 85,
    height: 85,
    justifyContent: "center",
    alignItems: "center",
  },

  bellImage: {
    width: 85,
    height: 85,
    position: "absolute",
    zIndex: 2,
  },

  bellEffect: {
    width: 85,
    height: 85,
    position: "absolute",
    zIndex: 1,
  },

  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    marginTop: 20,
  },

  sunIcon: {
    width: 52,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  greetingTitle: {
    fontSize: 28,
    color: COLORS.textPrimary,
    fontWeight: "400",
    fontFamily: "Cormorant",
  },

  greetingSubtitle: {
    marginTop: 2,
    fontSize: 15,
    color: COLORS.navy,
    fontFamily: "CormorantGaramond",
  },

  mainCard: {
    marginHorizontal: 24,
    marginTop: 20,
    backgroundColor: COLORS.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    flexDirection: "row",

    shadowColor: "#3B2E22",
    shadowOpacity: 0.08,
    shadowRadius: 14,

    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 6,
  },

  cardImage: {
    width: 140,
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  cardContent: {
    flex: 1,
    justifyContent: "center",
  },

  cardLabel: {
    color: COLORS.gold,
    letterSpacing: 2,
    fontSize: 12,
    marginBottom: 4,
    fontFamily: "Inter",
  },

  cardTitle: {
    fontSize: 34,
    color: COLORS.navy,
    fontWeight: "300",
    fontFamily: "CormorantGaramond",
  },

  cardDivider: {
    width: "100%",
    height: 14,
    marginVertical: 12,
  },

  timeRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  timeText: {
    marginLeft: 6,
    fontSize: 22,
    color: COLORS.navy,
    fontFamily: "CormorantGaramond",
  },

  cardTime: {
    marginTop: 6,
    color: "#6F440A",
    fontSize: 20,
    fontFamily: "CormorantGaramond",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 18,
  },

  sectionHeaderText: {
    color: COLORS.navy,
    fontSize: 13,
    letterSpacing: 1.5,
    marginHorizontal: 12,
    fontFamily: "CormorantGaramond",
  },

  dividerHalf: {
    width: "20%",
  },

  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },

  progressCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    paddingVertical: 15,

    shadowColor: "#3B2E22",
    shadowOpacity: 0.08,
    shadowRadius: 14,

    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 6,
  },

  progressCardActive: {
    borderColor: COLORS.gold,
    backgroundColor: "#FFF9EC",
    shadowColor: COLORS.gold,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },

  progressCardMissed: {
    borderColor: "#D8A3A0",
    backgroundColor: "#FFF3F2",
  },

  progressIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#F3EFE7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },

  progressImage: {
    width: 75,
    height: 75,
  },

  progressTitle: {
    fontSize: 17,
    color: COLORS.textPrimary,
    fontWeight: "500",
    fontFamily: "CormorantGaramond",
  },

  progressTitleUnder: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: "400",
    fontFamily: "CormorantGaramond",
  },

  progressBox: {
    marginTop: 5,
    paddingVertical: 2,
    paddingHorizontal: 2,
    minWidth: 100,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  progressSubtitle: {
    fontSize: 12,
    fontFamily: "CormorantGaramond",
  },

  globalCard: {
    marginHorizontal: 24,
    marginTop: 20,
    backgroundColor: COLORS.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    flexDirection: "row",
    alignItems: "flex-start",

    shadowColor: "#3B2E22",
    shadowOpacity: 0.08,
    shadowRadius: 14,

    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 6,
  },

  globe: {
    width: 150,
    height: 150,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 5,
    alignSelf: "center",
  },

  globeIcon: {
    width: 150,
    height: 150,
  },

  globalRight: {
    flex: 1,
    justifyContent: "center",
  },

  globalLabel: {
    color: COLORS.navy,
    fontSize: 12,
    letterSpacing: 1.5,
    fontFamily: "CormorantGaramond",
    marginBottom: 2,
  },

  globalCountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
  },

  globalCount: {
    fontSize: 38,
    color: COLORS.navy,
    fontWeight: "700",
    fontFamily: "CormorantGaramond",
  },

  globalPrayedToday: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: "CormorantGaramond",
    marginLeft: 4,
  },

  globalText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: "CormorantGaramond",
    marginTop: 2,
  },

  globalDivider: {
    width: "100%",
    height: 14,
    marginVertical: 10,
  },

  nowPrayingRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },

  nowPrayingLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: "CormorantGaramond",
    marginRight: 4,
  },

  nowPrayingItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  nowPrayingFlag: {
    fontSize: 14,
  },

  nowPrayingCountry: {
    fontSize: 13,
    color: COLORS.navy,
    fontWeight: "600",
    fontFamily: "CormorantGaramond",
  },

  nowPrayingCount: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontFamily: "CormorantGaramond",
    marginLeft: 3,
  },

  nowPrayingDot: {
    fontSize: 13,
    color: COLORS.muted,
  },

  scriptureCard: {
    marginHorizontal: 24,
    marginTop: 14,
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    overflow: "hidden",

    shadowColor: "#3B2E22",
    shadowOpacity: 0.08,
    shadowRadius: 14,

    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 6,
  },

  scriptureImage: {
    width: 190,
    height: 120,
  },

  scriptureContent: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },

  scriptureQuote: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontStyle: "italic",
    lineHeight: 16,
    fontFamily: "CormorantGaramond",
  },

  scriptureRef: {
    marginTop: 7,
    fontSize: 13,
    color: COLORS.navy,
    fontWeight: "600",
    fontFamily: "CormorantGaramond",
  },

  buttonWrapper: {
    marginHorizontal: 24,
    marginTop: 28,
  },

  button: {
    borderRadius: 36,
    paddingVertical: 18,
    paddingHorizontal: 24,

    shadowColor: "#D4AF57",
    shadowOpacity: 0.3,
    shadowRadius: 12,

    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 6,
  },

  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  prayIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "600",
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
    backgroundColor: COLORS.card,
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  modalTitle: {
    marginTop: 16,
    fontSize: 32,
    color: COLORS.navy,
    fontFamily: "CormorantGaramond",
  },

  modalText: {
    marginTop: 10,
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: 18,
    lineHeight: 26,
  },

  modalButton: {
    marginTop: 18,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 30,
  },

  modalButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
