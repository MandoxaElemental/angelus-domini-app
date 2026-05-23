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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { createAudioPlayer } from "expo-audio";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  getNextPrayer,
  getPrayerStatus,
  formatPrayerTime,
  PrayerStatus,
} from "../utils/prayer";
import { getUserId } from "../utils/user";
import { completePrayer, getGlobalCount, startPrayer } from "../api/prayerApi";

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

export default function MainApp() {
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.4)).current;
  const bellRotate = useRef(new Animated.Value(0)).current;
  const [timeLeft, setTimeLeft] = useState("00:00:00");
  const [session, setSession] = useState<any>(null);
  const [count, setCount] = useState(0);
  const [userId, setUserId] = useState("");
  const [completedPrayers, setCompletedPrayers] = useState({
    morning: false,
    noon: false,
    evening: false,
  });
  const prayerImages: Record<string, any> = {
    Morning: require("../../assets/Morning.png"),
    Noon: require("../../assets/Noon.png"),
    Evening: require("../../assets/Evening.png"),
  };

  const currentHour = new Date().getHours();

  const greeting =
    currentHour < 12 ? "Morning" : currentHour < 18 ? "Afternoon" : "Evening";

  const navigation = useNavigation<any>();

  const [showPrayerPopup, setShowPrayerPopup] = useState(false);

  const lastTriggeredPrayer = useRef<string | null>(null);

  const playTripleBell = async () => {
    for (let i = 0; i < 3; i++) {
      const player = createAudioPlayer(require("../../assets/audio/bell.mp3"));

      player.play();

      await new Promise((resolve) => setTimeout(resolve, 2200));

      player.remove();
    }
  };

  const currentPrayer = useMemo(() => {
    const next = getNextPrayer();

    return {
      title: next.title,
      icon: next.icon,
      time: next.time,
    };
  }, []);

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

  useEffect(() => {
    const checkPrayerTime = () => {
      const nextPrayer = getNextPrayer();
      const now = new Date();

      const diff = nextPrayer.time.getTime() - now.getTime();

      // Trigger when within first second
      if (diff <= 1000 && diff >= 0) {
        const prayerKey = `${nextPrayer.title}-${now.toDateString()}`;

        // Prevent duplicate popups
        if (lastTriggeredPrayer.current === prayerKey) return;

        lastTriggeredPrayer.current = prayerKey;

        setShowPrayerPopup(true);

        playTripleBell();

        setTimeout(() => {
          setShowPrayerPopup(false);

          navigation.navigate("Prayer", {
            onComplete: (slot: string) => {
              setCompletedPrayers((prev) => ({
                ...prev,
                [slot]: true,
              }));
            },
          });
        }, 7000);
      }
    };

    const interval = setInterval(checkPrayerTime, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    (async () => {
      const uid = await getUserId();

      setUserId(uid);

      const prayerSession = await startPrayer(uid);

      setSession(prayerSession);

      const globalCount = await getGlobalCount(prayerSession.slot);

      setCount(globalCount);
    })();
  }, []);

  const handleComplete = async () => {
    if (!session) return;

    await completePrayer(userId, session.sessionId);

    const newCount = await getGlobalCount(session.slot);

    setCount(newCount);
  };

  const morningStatus = getPrayerStatus("morning", completedPrayers.morning);

  const noonStatus = getPrayerStatus("noon", completedPrayers.noon);

  const eveningStatus = getPrayerStatus("evening", completedPrayers.evening);

  return (
    <>
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
                navigation.navigate("Prayer");
              }}
            >
              <Text style={styles.modalButtonText}>Pray Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* HEADER */}
          <View style={styles.header}>
            <Image
              source={require("../../assets/Logo.png")}
              style={styles.logo}
            />

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
          {/* GREETING */}
          <View style={styles.greetingRow}>
            <View style={styles.sunIcon}>
              <Image
                source={progressImages[greeting]}
                style={styles.progressImage}
                resizeMode="contain"
              />
            </View>

            <View>
              <Text style={styles.greetingTitle}>Good {greeting}</Text>

              <Text style={styles.greetingSubtitle}>
                Pause with the Church for the Angelus.
              </Text>
            </View>
          </View>

          {/* NEXT PRAYER CARD */}
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
              <View style={styles.cardDivider} />
              <View style={styles.timeRow}>
                <Ionicons name="time-outline" size={30} color={COLORS.gold} />

                <Text style={styles.timeText}>in {timeLeft}</Text>
              </View>
              {/* <Text style={styles.cardTitle}>{currentPrayer.title}</Text> */}{" "}
            </View>
          </View>

          {/* PROGRESS */}
          <View style={styles.sectionHeader}>
            <View style={styles.line} />

            <Text style={styles.sectionHeaderText}>DAILY PRAYER PROGRESS</Text>

            <View style={styles.line} />
          </View>

          <View style={styles.progressRow}>
            <ProgressCard title="Morning" status={morningStatus} />

            <ProgressCard title="Noon" status={noonStatus} />

            <ProgressCard title="Evening" status={eveningStatus} />
          </View>

          {/* GLOBAL CARD */}
          <View style={styles.globalCard}>
            <View style={styles.globe}>
              <Image
                source={require("../../assets/Globe.png")}
                style={styles.globeIcon}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.globalLabel}>GLOBAL PRAYER TODAY</Text>

              <Text style={styles.globalCount}>{count.toLocaleString()}</Text>

              <Text style={styles.globalText}>
                United in prayer around the world.
              </Text>
            </View>
          </View>

          {/* BUTTON */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleComplete}
            style={styles.buttonWrapper}
          >
            <LinearGradient
              colors={[COLORS.goldBright, COLORS.gold]}
              style={styles.button}
            >
              <View style={styles.buttonInner}>
                <View style={styles.prayIcon}>
                  <Ionicons name="heart" size={18} color="#fff" />
                </View>

                <Text style={styles.buttonText}>Pray Now</Text>

                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* BOTTOM SPACE */}
          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const progressImages: Record<string, any> = {
  Morning: require("../../assets/Morning_Clear.svg"),
  Noon: require("../../assets/Noon_Clear.svg"),
  Evening: require("../../assets/Evening_Clear.svg"),
};

function ProgressCard({
  title,
  status,
}: {
  title: string;
  status: PrayerStatus;
}) {
  const isCompleted = status === "completed";
  const isActive = status === "active";
  const isMissed = status === "missed";

  return (
    <View
      style={[
        styles.progressCard,
        isActive && styles.progressCardActive,
        isMissed && styles.progressCardMissed,
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
          isMissed && {
            backgroundColor: "#F5D6D6",
          },
        ]}
      >
        <Image
          source={progressImages[title]}
          style={styles.progressImage}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.progressTitle}>{title}</Text>
      <View style={styles.progressBox}>
        <Text style={styles.progressSubtitle}>
          {isCompleted
            ? "Completed"
            : isActive
              ? "Praying"
              : isMissed
                ? "Missed"
                : "Upcoming"}
        </Text>
      </View>
    </View>
  );
}

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
  logo: {
    width: 140,
    height: 40,
    resizeMode: "contain",
  },

  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    marginTop: 26,
  },

  sunIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFF7E5",
    borderWidth: 3,
    borderColor: "#F1D28B",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  greetingTitle: {
    fontSize: 30,
    color: COLORS.textPrimary,
    fontWeight: "600",
    fontFamily: "CormorantGaramond",
  },

  greetingSubtitle: {
    marginTop: 2,
    fontSize: 15,
    color: COLORS.navy,
    fontFamily: "CormorantGaramond",
  },

  mainCard: {
    marginHorizontal: 24,
    marginTop: 18,
    backgroundColor: COLORS.card,
    borderRadius: 28,
    borderWidth: 3,
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
    fontFamily: "CormorantGaramond",
  },

  cardTitle: {
    fontSize: 34,
    color: COLORS.navy,
    fontWeight: "300",
    fontFamily: "CormorantGaramond",
  },

  cardDivider: {
    height: 1,
    backgroundColor: COLORS.border,
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
    fontWeight: "semibold",
    fontFamily: "CormorantGaramond",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    marginTop: 28,
    marginBottom: 18,
  },

  sectionHeaderText: {
    color: COLORS.navy,
    fontSize: 13,
    letterSpacing: 1.5,
    marginHorizontal: 12,
    fontFamily: "CormorantGaramond",
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },

  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },

  progressCard: {
    width: "31%",
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: COLORS.border,
    alignItems: "center",
    paddingVertical: 18,
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
    marginBottom: 12,
  },

  progressTitle: {
    fontSize: 17,
    color: COLORS.textPrimary,
    fontWeight: "500",
    fontFamily: "CormorantGaramond",
  },

  progressBox: {
    marginTop: 4,
    padding: 2,
    width: 100,
    borderRadius: 999,
    borderColor: COLORS.border,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },

  progressSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: "CormorantGaramond",
  },

  globalCard: {
    marginHorizontal: 24,
    marginTop: 18,
    backgroundColor: COLORS.card,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: COLORS.border,
    padding: 5,
    flexDirection: "row",
    alignItems: "center",

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
    width: 120,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  globeIcon: {
    width: 120,
    height: 120,
  },

  globalLabel: {
    color: COLORS.navy,
    fontSize: 12,
    letterSpacing: 1.5,
    fontFamily: "CormorantGaramond",
  },

  globalCount: {
    fontSize: 42,
    color: COLORS.navy,
    fontWeight: "700",
    fontFamily: "CormorantGaramond",
  },

  globalText: {
    color: COLORS.textSecondary,
    marginTop: 2,
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
    borderWidth: 3,
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
  progressImage: {
    width: 75,
    height: 75,
  },
});
