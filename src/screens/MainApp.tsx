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
  Easing,
  Modal,
  StatusBar,
  Platform,
} from "react-native";

import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Audio } from "expo-av";
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
  Morning: require("../../assets/Morning.png"),
  Noon: require("../../assets/Noon.png"),
  Evening: require("../../assets/Evening.png"),
};

const progressImages: Record<string, any> = {
  Morning: require("../../assets/Morning3.png"),
  Noon: require("../../assets/Noon2.png"),
  Evening: require("../../assets/Evening1.png"),
};

// ─── Daily Scripture Verses ───────────────────────────────────────────────────
// Rotates by day-of-year so every day shows a different verse
const DAILY_VERSES = [
  { quote: "Be it done unto me according to your word.", ref: "Luke 1:38" },
  { quote: "The Lord is my shepherd; I shall not want.", ref: "Psalm 23:1" },
  { quote: "I can do all things through Christ who strengthens me.", ref: "Phil 4:13" },
  { quote: "Trust in the Lord with all your heart.", ref: "Prov 3:5" },
  { quote: "For God so loved the world that He gave His only Son.", ref: "John 3:16" },
  { quote: "Be still, and know that I am God.", ref: "Psalm 46:10" },
  { quote: "Love one another as I have loved you.", ref: "John 15:12" },
  { quote: "The Lord is near to the brokenhearted.", ref: "Psalm 34:18" },
  { quote: "Ask and it will be given to you; seek and you will find.", ref: "Matt 7:7" },
  { quote: "I am the way, the truth, and the life.", ref: "John 14:6" },
  { quote: "Come to me, all who are weary, and I will give you rest.", ref: "Matt 11:28" },
  { quote: "Your word is a lamp to my feet and a light to my path.", ref: "Psalm 119:105" },
  { quote: "Do not be anxious about anything, but in everything pray.", ref: "Phil 4:6" },
  { quote: "The Lord bless you and keep you.", ref: "Num 6:24" },
  { quote: "With God all things are possible.", ref: "Matt 19:26" },
  { quote: "Fear not, for I am with you.", ref: "Isaiah 41:10" },
  { quote: "Blessed are the pure in heart, for they shall see God.", ref: "Matt 5:8" },
  { quote: "He who began a good work in you will complete it.", ref: "Phil 1:6" },
  { quote: "Cast all your anxieties on Him, for He cares for you.", ref: "1 Pet 5:7" },
  { quote: "The peace of God surpasses all understanding.", ref: "Phil 4:7" },
  { quote: "Rejoice always, pray without ceasing.", ref: "1 Thess 5:16–17" },
  { quote: "Create in me a clean heart, O God.", ref: "Psalm 51:10" },
  { quote: "Blessed is she who believed the Lord's promise would be fulfilled.", ref: "Luke 1:45" },
  { quote: "This is the day the Lord has made; let us rejoice.", ref: "Psalm 118:24" },
  { quote: "Nothing is impossible with God.", ref: "Luke 1:37" },
  { quote: "Seek first the kingdom of God and His righteousness.", ref: "Matt 6:33" },
  { quote: "My grace is sufficient for you.", ref: "2 Cor 12:9" },
  { quote: "The Lord is my light and my salvation.", ref: "Psalm 27:1" },
  { quote: "He who abides in love abides in God.", ref: "1 John 4:16" },
  { quote: "I am with you always, to the end of the age.", ref: "Matt 28:20" },
  { quote: "Pray for one another, that you may be healed.", ref: "James 5:16" },
  { quote: "Give thanks to the Lord, for He is good.", ref: "Psalm 107:1" },
  { quote: "God is love.", ref: "1 John 4:8" },
  { quote: "The Word became flesh and dwelt among us.", ref: "John 1:14" },
  { quote: "Blessed are the merciful, for they shall receive mercy.", ref: "Matt 5:7" },
  { quote: "Hail, full of grace, the Lord is with you.", ref: "Luke 1:28" },
  { quote: "Hope does not put us to shame.", ref: "Rom 5:5" },
  { quote: "Whatever you do, do it for the glory of God.", ref: "1 Cor 10:31" },
  { quote: "Draw near to God and He will draw near to you.", ref: "James 4:8" },
  { quote: "Light shines in the darkness, and the darkness did not overcome it.", ref: "John 1:5" },
  { quote: "Lord, teach us to pray.", ref: "Luke 11:1" },
  { quote: "My soul magnifies the Lord.", ref: "Luke 1:46" },
  { quote: "The fruit of the Spirit is love, joy, peace.", ref: "Gal 5:22" },
  { quote: "Blessed are those who hunger for righteousness.", ref: "Matt 5:6" },
  { quote: "You are the light of the world.", ref: "Matt 5:14" },
  { quote: "Lord, to whom shall we go? You have the words of eternal life.", ref: "John 6:68" },
  { quote: "I have come that they may have life, and have it abundantly.", ref: "John 10:10" },
  { quote: "We love because He first loved us.", ref: "1 John 4:19" },
  { quote: "Do not let your hearts be troubled; trust in God.", ref: "John 14:1" },
  { quote: "Blessed are the peacemakers, for they shall be called children of God.", ref: "Matt 5:9" },
  { quote: "His mercy endures forever.", ref: "Psalm 136:1" },
  { quote: "In the beginning was the Word.", ref: "John 1:1" },
  { quote: "You shall love the Lord your God with all your heart.", ref: "Matt 22:37" },
  { quote: "Thy will be done on earth as it is in heaven.", ref: "Matt 6:10" },
  { quote: "He is risen!", ref: "Luke 24:6" },
  { quote: "For where two or three gather in my name, I am there.", ref: "Matt 18:20" },
  { quote: "Blessed are those who have not seen and yet believed.", ref: "John 20:29" },
  { quote: "The Lord upholds all who fall.", ref: "Psalm 145:14" },
  { quote: "Return to me, and I will return to you.", ref: "Mal 3:7" },
  { quote: "Be merciful, just as your Father is merciful.", ref: "Luke 6:36" },
  { quote: "I am the resurrection and the life.", ref: "John 11:25" },
  { quote: "All shall be well, and all manner of things shall be well.", ref: "Julian of Norwich" },
  { quote: "Have I not commanded you? Be strong and courageous.", ref: "Josh 1:9" },
  { quote: "Hallowed be your name.", ref: "Matt 6:9" },
  { quote: "She kept all these things, pondering them in her heart.", ref: "Luke 2:19" },
  { quote: "Whoever humbles himself will be exalted.", ref: "Matt 23:12" },
];

function getDailyVerse() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return DAILY_VERSES[dayOfYear % DAILY_VERSES.length];
}

export default function MainApp({ onLogout }: Props) {
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.4)).current;
  const bellRotate = useRef(new Animated.Value(0)).current;

  const [timeLeft, setTimeLeft] = useState("00:00:00");
  const [session, setSession] = useState<any>(null);
  const [count, setCount] = useState(0);
  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");
  const [completedPrayers, setCompletedPrayers] = useState({
    morning: false,
    noon: false,
    evening: false,
  });
  const [showPrayerPopup, setShowPrayerPopup] = useState(false);
  const [isPraying, setIsPraying] = useState(false);

  const lastTriggeredPrayer = useRef<string | null>(null);
  const navigation = useNavigation<any>();

  const dailyVerse = useMemo(() => getDailyVerse(), []);

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? "Morning" : currentHour < 18 ? "Afternoon" : "Evening";

  const currentPrayer = useMemo(() => {
    const next = getNextPrayer();
    return { title: next.title, icon: next.icon, time: next.time };
  }, []);

  // ── On mount ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        let { data: { session: authSession } } = await supabase.auth.getSession();

        if (!authSession?.user?.id) {
          console.log("⏳ Waiting for session to restore...");
          await new Promise<void>((resolve) => {
            const { data: { subscription } } = supabase.auth.onAuthStateChange(
              (_event, s) => {
                if (s) {
                  authSession = s;
                  subscription.unsubscribe();
                  resolve();
                }
              }
            );
            setTimeout(resolve, 5000);
          });
        }

        if (!authSession?.user?.id) {
          console.error("❌ No authenticated user after waiting");
          return;
        }

        const uid = authSession.user.id;
        console.log("✅ userId:", uid);
        setUserId(uid);

        const metaUsername =
          authSession.user.user_metadata?.username ||
          authSession.user.user_metadata?.name;

        if (metaUsername) {
          console.log("✅ username from metadata:", metaUsername);
          setUsername(metaUsername);
        } else {
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("username")
            .eq("id", uid)
            .single();
          console.log("👤 userData:", userData, "error:", userError);
          if (userData?.username) {
            setUsername(userData.username);
          }
        }

        const sess = await startPrayer(uid);
        console.log("✅ session:", sess);
        setSession(sess);

        const globalCount = await getGlobalCount(sess.slot);
        console.log("✅ globalCount:", globalCount);
        setCount(globalCount);
      } catch (err) {
        console.error("❌ mount error:", err);
      }
    })();
  }, []);

  // ── Bell pulse loop ───────────────────────────────────────────────────────
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale, { toValue: 1.25, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: false }),
          Animated.timing(ringOpacity, { toValue: 0, duration: 900, useNativeDriver: false }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale, { toValue: 1, duration: 0, useNativeDriver: false }),
          Animated.timing(ringOpacity, { toValue: 0.4, duration: 0, useNativeDriver: false }),
        ]),
      ])
    );
    pulse.start();
    return () => { pulse.stop(); };
  }, []);

  // ── Bell swing loop ───────────────────────────────────────────────────────
  useEffect(() => {
    const swing = () => {
      Animated.sequence([
        Animated.timing(bellRotate, { toValue: 1, duration: 180, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(bellRotate, { toValue: -1, duration: 180, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(bellRotate, { toValue: 0.5, duration: 140, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(bellRotate, { toValue: -0.4, duration: 140, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(bellRotate, { toValue: 0, duration: 120, easing: Easing.out(Easing.ease), useNativeDriver: false }),
      ]).start(() => setTimeout(swing, 3000));
    };
    const timer = setTimeout(swing, 1000);
    return () => clearTimeout(timer);
  }, []);

  // ── Countdown timer ───────────────────────────────────────────────────────
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
          .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
      );
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Prayer-time auto trigger ──────────────────────────────────────────────
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
                setCompletedPrayers((prev) => ({ ...prev, [slotKey]: true }));
              } catch (err) {
                console.error("❌ auto-trigger complete error:", err);
              }
            },
          });
        }, 7000);
      }
    };
    const interval = setInterval(checkPrayerTime, 1000);
    return () => clearInterval(interval);
  }, [session, userId]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const playTripleBell = async () => {
    for (let i = 0; i < 3; i++) {
      const { sound } = await Audio.Sound.createAsync(
        require("../../assets/audio/bell.mp3")
      );
      await sound.playAsync();
      await new Promise((resolve) => setTimeout(resolve, 2200));
      await sound.unloadAsync();
    }
  };

  const handleComplete = async () => {
    console.log("=== Pray Now pressed ===");
    console.log("session:", session);
    console.log("userId:", userId);

    if (!session || !userId) {
      console.error("❌ No session or userId found");
      return;
    }

    navigation.navigate("Prayer", {
      onComplete: async () => {
        try {
          await completePrayer(userId, session.sessionId);
          console.log("✅ Prayer completed in DB");

          const newCount = await getGlobalCount(session.slot);
          console.log("✅ New global count:", newCount);
          setCount(newCount);

          const slotKey = session.slot.includes("_6")
            ? "morning"
            : session.slot.includes("_12")
            ? "noon"
            : "evening";
          setCompletedPrayers((prev) => ({ ...prev, [slotKey]: true }));
        } catch (err) {
          console.error("❌ onComplete error:", err);
        }
      },
    });
  };

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
      <StatusBar hidden={true} />

      {/* Prayer-time modal */}
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
                      setCompletedPrayers((prev) => ({ ...prev, [slotKey]: true }));
                    } catch (err) {
                      console.error("❌ modal onComplete error:", err);
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
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* HEADER */}
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

          {/* GREETING */}
          <View style={styles.greetingRow}>
            <View style={styles.sunIcon}>
              <Image
               source={require("../../assets/usericons1.png")}
                style={styles.progressImageU}
                resizeMode="contain"
              />
            </View>
            <View>
              <Text style={styles.greetingTitle}>
                Good {greeting}{username ? `, ${username}` : ""}
              </Text>
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
            </View>
          </View>

          {/* DAILY PROGRESS */}
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

          {/* GLOBAL COUNT */}
          <View style={styles.globalCard}>
            <View style={styles.globe}>
              <Image
                source={require("../../assets/globe.png")}
                style={styles.globeIcon}
              />
            </View>

            <View style={styles.globalRight}>
              <Text style={styles.globalLabel}>GLOBAL PRAYER TODAY</Text>

              <View style={styles.globalCountRow}>
                <Text style={styles.globalCount}>{count.toLocaleString()}</Text>
                <Text style={styles.globalPrayedToday}> prayed today</Text>
              </View>

              <Text style={styles.globalText}>
                United in prayer around the world.
              </Text>

              <View style={styles.globalDivider} />

              <View style={styles.nowPrayingRow}>
                <Text style={styles.nowPrayingLabel}>Now praying:</Text>
                <View style={styles.nowPrayingItem}>
                  <Text style={styles.nowPrayingFlag}>🇵🇭</Text>
                  <Text style={styles.nowPrayingCountry}> Philippines</Text>
                  <Text style={styles.nowPrayingCount}> 8,420</Text>
                </View>
                <Text style={styles.nowPrayingDot}> • </Text>
                <View style={styles.nowPrayingItem}>
                  <Text style={styles.nowPrayingFlag}>🇺🇸</Text>
                  <Text style={styles.nowPrayingCountry}> USA</Text>
                  <Text style={styles.nowPrayingCount}> 3,210</Text>
                </View>
              </View>
            </View>
          </View>

          {/* SCRIPTURE QUOTE CARD — daily rotating verse */}
          <View style={styles.scriptureCard}>
            <Image
              source={require("../../assets/bgquote.png")}
              style={styles.scriptureImage}
              resizeMode="cover"
            />
            <View style={styles.scriptureContent}>
              <Text style={styles.scriptureQuote}>
                {`"${dailyVerse.quote}"`}
              </Text>
              <Text style={styles.scriptureRef}>— {dailyVerse.ref}</Text>
            </View>
          </View>

          {/* PRAY NOW BUTTON */}
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
          </TouchableOpacity>

          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// ─── ProgressCard ─────────────────────────────────────────────────────────────

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
          isCompleted && { backgroundColor: "#DCE8D9" },
          isActive && { backgroundColor: "#F7E6B8" },
          isMissed && { backgroundColor: "#F5D6D6" },
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
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
  logo: { width: 140, height: 40, resizeMode: "contain" },
  logoutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D4A017",
  },
  logoutText: { fontSize: 13, fontWeight: "600", color: "#C8922A" },
  bellContainer: { width: 85, height: 85, justifyContent: "center", alignItems: "center" },
  bellImage: { width: 85, height: 85, position: "absolute", zIndex: 2 },
  bellEffect: { width: 85, height: 85, position: "absolute", zIndex: 1 },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    marginTop: 26,
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
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  cardImage: {
    width: 140,
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  cardContent: { flex: 1, justifyContent: "center" },
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
  cardDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  timeRow: { flexDirection: "row", alignItems: "center" },
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
  line: { flex: 1, height: 1, backgroundColor: COLORS.border },
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
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  progressCardActive: { borderColor: COLORS.gold, backgroundColor: "#FFF9EC" },
  progressCardMissed: { borderColor: "#D8A3A0", backgroundColor: "#FFF3F2" },
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
  progressImage: { width: 75, height: 75 },
  progressImageU: { width: 60, height: 75 },

  // ── GLOBAL CARD ────────────────────────────────────────────────────────────
  globalCard: {
    marginHorizontal: 24,
    marginTop: 18,
    backgroundColor: COLORS.card,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: COLORS.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    shadowColor: "#3B2E22",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  globe: {
    width: 110,
    height: 110,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    alignSelf: "center",
  },
  globeIcon: { width: 110, height: 110 },
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
    height: 1,
    backgroundColor: COLORS.border,
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
  },
  nowPrayingDot: {
    fontSize: 13,
    color: COLORS.muted,
  },

  // ── SCRIPTURE QUOTE CARD ───────────────────────────────────────────────────
  scriptureCard: {
    marginHorizontal: 24,
    marginTop: 14,
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: COLORS.border,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#3B2E22",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
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
    lineHeight: 12,
    fontFamily: "CormorantGaramond",
  },
  scriptureRef: {
    marginTop: 7,
    fontSize: 13,
    color: COLORS.navy,
    fontFamily: "CormorantGaramond",
    fontWeight: "600",
  },

  // ── BUTTON ─────────────────────────────────────────────────────────────────
  buttonWrapper: { marginHorizontal: 24, marginTop: 28 },
  button: {
    borderRadius: 36,
    paddingVertical: 18,
    paddingHorizontal: 24,
    shadowColor: "#D4AF57",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  buttonInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  prayIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 24, fontWeight: "600" },
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
  modalTitle: { marginTop: 16, fontSize: 32, color: COLORS.navy, fontFamily: "CormorantGaramond" },
  modalText: { marginTop: 10, textAlign: "center", color: COLORS.textSecondary, fontSize: 18, lineHeight: 26 },
  modalButton: { marginTop: 18, backgroundColor: COLORS.gold, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 30 },
  modalButtonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});