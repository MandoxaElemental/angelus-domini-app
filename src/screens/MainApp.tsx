import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  Animated,
  StatusBar,
  Dimensions,
} from "react-native";

import { useNavigation } from "@react-navigation/native";
import { createAudioPlayer } from "expo-audio";
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";

import { getNextPrayer, getPrayerStatus, PrayerStatus } from "../utils/prayer";

import { completePrayer, getGlobalCount, startPrayer } from "../api/prayerApi";

import { supabase } from "../lib/supabaseClient";
import AppHeader from "../../components/Header";
import { getAngelusMode, AngelusMode } from "../services/notificationService";

type Props = { onLogout: () => void };

const { width } = Dimensions.get("window");
const isSmallScreen = width < 390;

const IMAGE_WIDTH = Math.min(width * 0.3, 140);

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

function format12Hour(date: Date): string {
  let h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function getNextPrayerForMode(mode: AngelusMode) {
  if (mode !== "noon_only") {
    return getNextPrayer();
  }

  const now = new Date();

  const nextNoon = new Date(now);
  nextNoon.setHours(12, 0, 0, 0);

  // If we've already passed noon today,
  // schedule tomorrow's noon.
  if (now >= nextNoon) {
    nextNoon.setDate(nextNoon.getDate() + 1);
  }

  return {
    title: "Noon Angelus",
    icon: "Noon",
    time: nextNoon,
  };
}

const DAILY_VERSES = [
  { quote: "Be it done unto me according to your word.", ref: "Luke 1:38" },
  { quote: "The Lord is my shepherd; I shall not want.", ref: "Psalm 23:1" },
  {
    quote: "I can do all things through Christ who strengthens me.",
    ref: "Phil 4:13",
  },
  { quote: "Trust in the Lord with all your heart.", ref: "Prov 3:5" },
  {
    quote: "For God so loved the world that He gave His only Son.",
    ref: "John 3:16",
  },
  { quote: "Be still, and know that I am God.", ref: "Psalm 46:10" },
  { quote: "Love one another as I have loved you.", ref: "John 15:12" },
  { quote: "The Lord is near to the brokenhearted.", ref: "Psalm 34:18" },
  {
    quote: "Ask and it will be given to you; seek and you will find.",
    ref: "Matt 7:7",
  },
  { quote: "I am the way, the truth, and the life.", ref: "John 14:6" },
  {
    quote: "Come to me, all who are weary, and I will give you rest.",
    ref: "Matt 11:28",
  },
  {
    quote: "Your word is a lamp to my feet and a light to my path.",
    ref: "Psalm 119:105",
  },
  {
    quote: "Do not be anxious about anything, but in everything pray.",
    ref: "Phil 4:6",
  },
  { quote: "The Lord bless you and keep you.", ref: "Num 6:24" },
  { quote: "With God all things are possible.", ref: "Matt 19:26" },
  { quote: "Fear not, for I am with you.", ref: "Isaiah 41:10" },
  {
    quote: "Blessed are the pure in heart, for they shall see God.",
    ref: "Matt 5:8",
  },
  {
    quote: "He who began a good work in you will complete it.",
    ref: "Phil 1:6",
  },
  {
    quote: "Cast all your anxieties on Him, for He cares for you.",
    ref: "1 Pet 5:7",
  },
  { quote: "The peace of God surpasses all understanding.", ref: "Phil 4:7" },
  { quote: "Rejoice always, pray without ceasing.", ref: "1 Thess 5:16–17" },
  { quote: "Create in me a clean heart, O God.", ref: "Psalm 51:10" },
  {
    quote: "Blessed is she who believed the Lord's promise would be fulfilled.",
    ref: "Luke 1:45",
  },
  {
    quote: "This is the day the Lord has made; let us rejoice.",
    ref: "Psalm 118:24",
  },
  { quote: "Nothing is impossible with God.", ref: "Luke 1:37" },
  {
    quote: "Seek first the kingdom of God and His righteousness.",
    ref: "Matt 6:33",
  },
  { quote: "My grace is sufficient for you.", ref: "2 Cor 12:9" },
  { quote: "The Lord is my light and my salvation.", ref: "Psalm 27:1" },
  { quote: "He who abides in love abides in God.", ref: "1 John 4:16" },
  { quote: "I am with you always, to the end of the age.", ref: "Matt 28:20" },
];

function getDailyVerse() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const day = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return DAILY_VERSES[day % DAILY_VERSES.length];
}

function slotToKey(slot: string): "morning" | "noon" | "evening" | null {
  if (!slot) return null;
  if (slot.endsWith("_6")) return "morning";
  if (slot.endsWith("_12")) return "noon";
  if (slot.endsWith("_18")) return "evening";
  return null;
}

function hourToSlotKey(h: number): "morning" | "noon" | "evening" {
  if (h === 6) return "morning";
  if (h === 12) return "noon";
  return "evening";
}

export default function MainApp({ onLogout }: Props) {
  const [angelusMode, setAngelusMode] = useState<AngelusMode>("all_three");

  useEffect(() => {
    getAngelusMode().then(setAngelusMode);
  }, []);

  const navigation = useNavigation<any>();

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
  const [currentPrayer, setCurrentPrayer] = useState(() =>
    getNextPrayerForMode(angelusMode),
  );
  useEffect(() => {
    setCurrentPrayer(getNextPrayerForMode(angelusMode));
  }, [angelusMode]);
  const triggeredToday = useRef<Map<number, string>>(new Map());
  // const lastTriggeredPrayer = useRef<string | null>(null);
  const dailyVerse = useMemo(() => getDailyVerse(), []);

  const currentHour = new Date().getHours();

  const greeting =
    currentHour < 12 ? "Morning" : currentHour < 18 ? "Afternoon" : "Evening";

  // const currentPrayer = useMemo(() => {
  //   const next = getNextPrayer();

  //   return {
  //     title: next.title,
  //     icon: next.icon,
  //     time: next.time,
  //   };
  // }, []);

  // ── Fetch today's completed prayers from DB ───────────────────────────────
  const fetchTodayPrayers = useCallback(async (uid: string) => {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("PrayerSessions")
        .select("Slot, Completed")
        .eq("UserId", uid)
        .gte("ScheduledTime", `${todayStr}T00:00:00+00:00`)
        .lte("ScheduledTime", `${todayStr}T23:59:59+00:00`);

      if (data) {
        const updated: Record<"morning" | "noon" | "evening", boolean> = {
          morning: false,
          noon: false,
          evening: false,
        };
        data.forEach((s: any) => {
          if (!s.Completed) return;
          const key = slotToKey(s.Slot);
          if (key) updated[key] = true;
        });
        setCompletedPrayers(updated);
      }
    } catch (err) {
      console.error("fetchTodayPrayers error:", err);
    }
  }, []);

  const finishPrayer = async () => {
    if (!session || !userId) return;

    await completePrayer(userId, session.sessionId);

    const newCount = await getGlobalCount(session.slot);

    setCount(newCount);
  };

  useEffect(() => {
    let channel: any = null;

    (async () => {
      try {
        let {
          data: { session: auth },
        } = await supabase.auth.getSession();

        if (!auth?.user?.id) {
          await new Promise<void>((resolve) => {
            const {
              data: { subscription },
            } = supabase.auth.onAuthStateChange((_e, s) => {
              if (s) {
                auth = s;
                subscription.unsubscribe();
                resolve();
              }
            });
            setTimeout(resolve, 5000);
          });
        }

        if (!auth?.user?.id) return;
        const uid = auth.user.id;
        setUserId(uid);

        const meta =
          auth.user.user_metadata?.username || auth.user.user_metadata?.name;
        if (meta) {
          setUsername(meta);
        } else {
          const { data: u } = await supabase
            .from("users")
            .select("username")
            .eq("id", uid)
            .single();
          if (u?.username) setUsername(u.username);
        }

        const sess = await startPrayer(uid);
        setSession(sess);
        setCount(await getGlobalCount(sess.slot));
        await fetchTodayPrayers(uid);

        channel = supabase
          .channel(`prayers-${uid}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "PrayerSessions",
              filter: `UserId=eq.${uid}`,
            },
            async () => {
              await fetchTodayPrayers(uid);
              try {
                setCount(await getGlobalCount(sess.slot));
              } catch {}
            },
          )
          .subscribe();
      } catch (err) {
        console.error("Mount error:", err);
      }
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchTodayPrayers]);

  // ─────────────────────────────────────────────────────────────
  // COUNTDOWN TIMER
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const tick = () => {
      const next = getNextPrayerForMode(angelusMode);
      setCurrentPrayer((prev) => {
        if (prev.time.getTime() !== next.time.getTime()) {
          return { title: next.title, icon: next.icon, time: next.time };
        }
        return prev;
      });
      const diff = next.time.getTime() - Date.now();
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(
        `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`,
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [angelusMode]);

  const currentDayImage = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) return "Morning";
    if (hour < 18) return "Noon";
    return "Evening";
  }, [currentHour]);

  useEffect(() => {
    const check = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const date = now.toDateString();

      const isPrayerHour = h === 6 || h === 12 || h === 18;
      if (!isPrayerHour || m !== 0) return;

      const alreadyFired = triggeredToday.current.get(h);
      if (alreadyFired === date) return;
      triggeredToday.current.set(h, date);

      const slotKey = hourToSlotKey(h);

      setTimeout(async () => {
        let freshSession = session;
        if (userId) {
          try {
            freshSession = await startPrayer(userId);
            setSession(freshSession);
          } catch {}
        }

        navigation.navigate("Prayer", {
          autoPlay: true,
          onComplete: async () => {
            try {
              if (!freshSession || !userId) return;
              await completePrayer(userId, freshSession.sessionId);
              setCount(await getGlobalCount(freshSession.slot));
              setCompletedPrayers((prev) => ({ ...prev, [slotKey]: true }));
            } catch (err) {
              console.error("Auto-trigger complete error:", err);
            }
          },
        });
      }, 7000);
    };

    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [session, userId, navigation]);

  const playTripleBell = async () => {
    for (let i = 0; i < 3; i++) {
      try {
        const player = createAudioPlayer(
          require("../../assets/audio/bell.mp3"),
        );
        player.play();
        await new Promise((r) => setTimeout(r, 2200));
        player.remove();
      } catch {}
    }
  };

  // ─────────────────────────────────────────────────────────────
  // COMPLETE PRAYER
  // ─────────────────────────────────────────────────────────────

  const handleComplete = async () => {
    if (!session || !userId) return;
    navigation.navigate("Prayer", {
      autoPlay: false,
      onComplete: async () => {
        try {
          await completePrayer(userId, session.sessionId);
          setCount(await getGlobalCount(session.slot));
          const key = slotToKey(session.slot);
          if (key) setCompletedPrayers((prev) => ({ ...prev, [key]: true }));
        } catch (err) {
          console.error("onComplete error:", err);
        }
      },
    });
  };

  // ─────────────────────────────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────────────────────────────

  const morningStatus =
    angelusMode === "noon_only"
      ? "disabled"
      : getPrayerStatus("morning", completedPrayers.morning);

  const noonStatus = getPrayerStatus("noon", completedPrayers.noon);

  const eveningStatus =
    angelusMode === "noon_only"
      ? "disabled"
      : getPrayerStatus("evening", completedPrayers.evening);

  const [fontsLoaded] = useFonts({
    CormorantGaramond: require("../../assets/fonts/CormorantGaramond.ttf"),
    EBGaramond: require("../../assets/fonts/EBGaramond.ttf"),
    Cormorant: require("../../assets/fonts/Cormorant.ttf"),
    Inter: require("../../assets/fonts/Inter.ttf"),
    CormorantGaramondItalic: require("../../assets/fonts/CormorantGaramond-Italic.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }
  return (
    <>
      <StatusBar hidden />
      <SafeAreaView style={styles.container}>
        {/* HEADER */}
        <AppHeader />
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* GREETING */}

          <View style={styles.greetingRow}>
            <View style={styles.sunIcon}>
              <Image
                source={require("../../assets/usericons1.png")}
                style={styles.progressImage}
                resizeMode="contain"
              />
            </View>

            <View>
              <Text style={styles.greetingTitle}>Good {greeting}</Text>
              <Text style={styles.greetingSubtitle}>
                {username ? `${username}` : ""}
              </Text>
            </View>
          </View>

          {/* NEXT PRAYER */}

          <View style={styles.mainCard}>
            <View style={styles.cardImage}>
              <Image
                source={prayerImages[currentDayImage] ?? prayerImages.Morning}
                style={{
                  width: IMAGE_WIDTH,
                  height: IMAGE_WIDTH * 1.3,
                }}
                resizeMode="contain"
              />
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>NEXT PRAYER</Text>
              <Text style={styles.cardTitle}>
                {format12Hour(currentPrayer.time)}
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
                  <Text style={styles.nowPrayingFlag}></Text>
                  <Text style={styles.nowPrayingCountry}> </Text>
                  <Text style={styles.nowPrayingCount}></Text>
                </View>
                <Text style={styles.nowPrayingDot}> </Text>
                <View style={styles.nowPrayingItem}>
                  <Text style={styles.nowPrayingFlag}></Text>
                  <Text style={styles.nowPrayingCountry}> </Text>
                  <Text style={styles.nowPrayingCount}> </Text>
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
              <Text
                style={styles.scriptureQuote}
              >{`"${dailyVerse.quote}"`}</Text>
              <Text style={styles.scriptureRef}>— {dailyVerse.ref}</Text>
            </View>
          </View>

          {/* PRAY NOW BUTTON */}
          {/* <TouchableOpacity activeOpacity={0.9} onPress={handleComplete} disabled={isPraying} style={styles.buttonWrapper}>
            <LinearGradient colors={[COLORS.goldBright, COLORS.gold]} style={[styles.button, isPraying && { opacity: 0.7 }]}>
              <View style={styles.buttonInner}>
                <View style={styles.prayIcon}>
                  <Ionicons name="heart" size={18} color="#fff" />
                </View>
                <Text style={styles.buttonText}>{isPraying ? "Praying..." : "Pray Now"}</Text>
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

// ─── ProgressCard ─────────────────────────────────────────────────────────────
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
  const isDisabled = status === "disabled";

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
        : isDisabled
          ? {
              text: "Disabled",
              icon: "remove-circle-outline",
              iconColor: "#AAA",
              bg: "#F5F5F5",
              border: "#DDD",
              textColor: "#AAA",
            }
          : {
              text: "Upcoming",
              icon: "time",
              iconColor: COLORS.navy,
              bg: "#F3F5FA",
              border: "#D4DBEA",
              textColor: COLORS.navy,
            };

  // Pulse animation
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
      disabled={!isActive || isDisabled}
      onPress={onPress}
      style={{ flex: 1, marginHorizontal: 4 }}
    >
      <Animated.View
        style={[
          styles.progressCard,
          isActive && styles.progressCardActive,
          isMissed && styles.progressCardMissed,
          isActive && {
            transform: [{ scale: pulse }],
          },
          isDisabled && {
            backgroundColor: "#F7F7F7",
            borderColor: "#E0E0E0",
            opacity: 0.6,
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
            isMissed && {
              backgroundColor: "#F5D6D6",
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
          {!isSmallScreen && (
            <Ionicons
              name={statusConfig.icon as any}
              size={18}
              color={statusConfig.iconColor}
              style={{ marginRight: 5 }}
            />
          )}

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
// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },

  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    marginTop: 10,
  },
  greetingTitle: {
    fontSize: 28,
    color: COLORS.textPrimary,
    fontWeight: "600",
    lineHeight: 20,
    fontFamily: "Cormorant",
  },
  greetingSubtitle: {
    marginTop: 3,
    fontSize: 25,
    color: COLORS.navy,
    fontFamily: "Cormorant",
  },
  mainCard: {
    marginHorizontal: 24,
    marginTop: 10,
    backgroundColor: COLORS.card,
    borderRadius: 28,
    borderWidth: 1,
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
    width: IMAGE_WIDTH,
    height: IMAGE_WIDTH * 1.3,
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
    fontFamily: "Inter",
    fontWeight: "500",
  },
  cardTitle: {
    fontSize: 40,
    color: COLORS.navy,
    fontWeight: "400",
    fontFamily: "EBGaramond",
  },
  cardDivider: {
    width: "100%",
    height: 14,
    marginVertical: 5,
  },
  timeRow: { flexDirection: "row", alignItems: "center" },
  timeText: {
    marginLeft: 6,
    fontSize: 18,
    fontWeight: "500",
    color: COLORS.navy,
    fontFamily: "EBGaramond",
  },
  cardTime: {
    marginTop: 6,
    color: "#6F440A",
    fontSize: 20,
    lineHeight: 20,
    fontWeight: "700",
    fontFamily: "Cormorant",
  },
  dividerHalf: {
    flex: 1,
    height: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    marginTop: 10,
    marginBottom: 18,
  },
  sectionHeaderText: {
    textAlign: "center",
    color: COLORS.navy,
    fontSize: 15,
    marginHorizontal: 12,
    lineHeight: 20,
    fontFamily: "Cormorant",
    fontWeight: "600",
  },
  line: { flex: 1, height: 1, backgroundColor: COLORS.border },
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
    paddingVertical: 18,
    paddingHorizontal: 10,
    position: "relative",
    shadowColor: "#3B2E22",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  progressCardCompleted: { borderColor: "#B8CFB5", backgroundColor: "#F6FBF5" },
  progressCardActive: { borderColor: COLORS.gold, backgroundColor: "#FFF9EC" },
  progressCardMissed: {
    borderColor: COLORS.border,
    backgroundColor: "#FFF3F2",
  },
  statusDot: {
    position: "absolute",
    top: 6,
    right: 10,
    width: 15,
    height: 15,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  statusDotCompleted: { backgroundColor: "#7BA87A", borderColor: "#7BA87A" },
  statusDotActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  statusDotMissed: { backgroundColor: "transparent", borderColor: "#D8A3A0" },
  statusDotUpcoming: {
    backgroundColor: "transparent",
    borderColor: COLORS.muted,
  },
  statusDotInner: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  progressIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#F3EFE7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 17,
    color: COLORS.textPrimary,
    fontWeight: "600",
    fontFamily: "Cormorant",
  },
  progressTitleUnder: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: "500",
    fontFamily: "Cormorant",
  },

  progressAngelus: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: "CormorantGaramond",
    marginTop: 1,
    marginBottom: 10,
  },
  progressBox: {
    textAlign: "center",
    minWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "transparent",
  },
  progressBoxCompleted: { borderColor: "#7BA87A", backgroundColor: "#F2FAF1" },
  progressBoxActive: { borderColor: COLORS.gold, backgroundColor: "#FFF6E0" },
  progressBoxMissed: { borderColor: "#D8A3A0", backgroundColor: "#FFF0EF" },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gold,
    marginRight: 5,
  },
  progressSubtitle: {
    fontSize: width < 390 ? 11 : 12,
    color: COLORS.textSecondary,
    fontFamily: "Cormorant",
  },
  progressImage: { width: 75, height: 75 },
  progressImageU: { width: 60, height: 75 },
  globalCard: {
    marginHorizontal: 24,
    marginTop: 10,
    backgroundColor: COLORS.card,
    borderRadius: 28,
    borderWidth: 1,
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
  globalRight: { flex: 1, justifyContent: "center" },
  globalLabel: {
    color: COLORS.navy,
    fontSize: 12,
    letterSpacing: 1.5,
    fontFamily: "Inter",
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
    fontFamily: "EBGaramond",
  },
  globalPrayedToday: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: "Cormorant",
    marginLeft: 4,
  },
  globalText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: "Cormorant",
    marginTop: 2,
  },
  globalDivider: {
    width: "100%",
    height: 20,
    marginVertical: 5,
  },
  nowPrayingRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  nowPrayingLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: "Cormorant",
    marginRight: 4,
  },
  nowPrayingItem: { flexDirection: "row", alignItems: "center" },
  nowPrayingFlag: { fontSize: 14 },
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
  nowPrayingDot: { fontSize: 13, color: COLORS.muted },
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
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  scriptureImage: { width: 190, height: 120 },
  scriptureContent: { flex: 1, padding: 16, justifyContent: "center" },
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
  buttonText: { color: "#fff", fontSize: 24, fontWeight: "600" },
  sunIcon: { marginRight: 12 },
  logoutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D4A017",
  },
  logoutText: { fontSize: 13, fontWeight: "600", color: "#C8922A" },
});
