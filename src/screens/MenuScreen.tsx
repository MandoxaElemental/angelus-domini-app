import { useEffect, useRef, useState } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { logout } from "../store/auth";
import { getPrayerStatus, PrayerStatus } from "../utils/prayer";
import { getGlobalCount, startPrayer } from "../api/prayerApi";
import { supabase } from "../lib/supabaseClient";

type Props = {
  onLogout: () => void;
};

const COLORS = {
  navy: "#2F4A7A",
  gold: "#C9A24A",
  cream: "#F7F2EA",
  card: "#FFFAF2",
  textPrimary: "#53433B",
  textSecondary: "#6B5E52",
  border: "#E7DCCB",
  muted: "#B8AA96",
};

const progressImages: Record<string, any> = {
  Morning: require("../../assets/Morning_Clear.svg"),
  Noon: require("../../assets/Noon_Clear.svg"),
  Evening: require("../../assets/Evening_Clear.svg"),
};

// Slot string → prayer key
const slotToKey = (slot: string): "morning" | "noon" | "evening" | null => {
  if (slot.includes("_6") && !slot.includes("_18")) return "morning";
  if (slot.includes("_12")) return "noon";
  if (slot.includes("_18") || slot.includes("_6p")) return "evening";
  return null;
};

export default function MenuScreen({ onLogout }: Props) {
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.4)).current;
  const bellRotate = useRef(new Animated.Value(0)).current;

  const [count, setCount] = useState(0);
  const [userId, setUserId] = useState("");
  const [completedPrayers, setCompletedPrayers] = useState({
    morning: false,
    noon: false,
    evening: false,
  });

  // Weekly counts: how many days this week each slot was completed
  const [weeklyData, setWeeklyData] = useState({
    morning: 0,
    noon: 0,
    evening: 0,
    total: 7,
  });

  // Total completed prayers all-time and this month
  const [totalMonth, setTotalMonth] = useState(0);
  const [totalYear, setTotalYear] = useState(0);

  // ── Fetch all real data ───────────────────────────────────────────────────
  const fetchData = async (uid: string) => {
    try {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10); // "2026-05-26"

      // ── 1. Today's completed prayers ──────────────────────────────────────
      const { data: todaySessions } = await supabase
        .from("PrayerSessions")
        .select("Slot, Completed")
        .eq("UserId", uid)
        .gte("ScheduledTime", `${todayStr}T00:00:00+00:00`)
        .lte("ScheduledTime", `${todayStr}T23:59:59+00:00`);

      if (todaySessions) {
        const updated = { morning: false, noon: false, evening: false };
        todaySessions.forEach((s: any) => {
          if (!s.Completed) return;
          const key = slotToKey(s.Slot);
          if (key) updated[key] = true;
        });
        setCompletedPrayers(updated);
      }

      // ── 2. This week's data (Mon–Sun) ─────────────────────────────────────
      const dayOfWeek = now.getDay(); // 0=Sun
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      const { data: weekSessions } = await supabase
        .from("PrayerSessions")
        .select("Slot, Completed, ScheduledTime")
        .eq("UserId", uid)
        .eq("Completed", true)
        .gte("ScheduledTime", monday.toISOString())
        .lte("ScheduledTime", sunday.toISOString());

      if (weekSessions) {
        // Count unique days per slot
        const morningDays = new Set<string>();
        const noonDays = new Set<string>();
        const eveningDays = new Set<string>();

        weekSessions.forEach((s: any) => {
          const day = s.ScheduledTime?.slice(0, 10);
          const key = slotToKey(s.Slot);
          if (!day || !key) return;
          if (key === "morning") morningDays.add(day);
          if (key === "noon") noonDays.add(day);
          if (key === "evening") eveningDays.add(day);
        });

        setWeeklyData({
          morning: morningDays.size,
          noon: noonDays.size,
          evening: eveningDays.size,
          total: 7,
        });
      }

      // ── 3. This month total ───────────────────────────────────────────────
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count: monthCount } = await supabase
        .from("PrayerSessions")
        .select("*", { count: "exact", head: true })
        .eq("UserId", uid)
        .eq("Completed", true)
        .gte("ScheduledTime", firstOfMonth);

      setTotalMonth(monthCount ?? 0);

      // ── 4. This year total ────────────────────────────────────────────────
      const firstOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
      const { count: yearCount } = await supabase
        .from("PrayerSessions")
        .select("*", { count: "exact", head: true })
        .eq("UserId", uid)
        .eq("Completed", true)
        .gte("ScheduledTime", firstOfYear);

      setTotalYear(yearCount ?? 0);

    } catch (err) {
      console.error("❌ MenuScreen fetchData error:", err);
    }
  };

  // ── On mount ──────────────────────────────────────────────────────────────
  useEffect(() => {
  let channel: any = null;

  const setupRealtime = async () => {
    try {
      let {
        data: { session: authSession },
      } = await supabase.auth.getSession();

      // Wait for auth session if not immediately available
      if (!authSession?.user?.id) {
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

      // Stop if still no session
      if (!authSession?.user?.id) return;

      const uid = authSession.user.id;

      setUserId(uid);

      // ── Global count ───────────────────────────────
      const sess = await startPrayer(uid);

      const globalCount = await getGlobalCount(sess.slot);

      setCount(globalCount);

      // ── Fetch all data ─────────────────────────────
      await fetchData(uid);

      // ── Remove old duplicate channels ─────────────
      const existingChannels = supabase.getChannels();

      existingChannels.forEach((c) => {
        if (c.topic.includes("prayer-sessions-menu")) {
          supabase.removeChannel(c);
        }
      });

      // ── Create fresh realtime subscription ────────
      channel = supabase
        .channel(`prayer-sessions-menu-${uid}-${Date.now()}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "PrayerSessions",
            filter: `UserId=eq.${uid}`,
          },
          async () => {
            try {
              // Refresh prayer data
              await fetchData(uid);

              // Refresh global count
              const newCount = await getGlobalCount(sess.slot);

              setCount(newCount);
            } catch (err) {
              console.error("Realtime refresh error:", err);
            }
          }
        )
        .subscribe((status) => {
          console.log("Realtime status:", status);
        });

    } catch (err) {
      console.error("❌ MenuScreen mount error:", err);
    }
  };

  setupRealtime();

  // ── Cleanup on unmount ───────────────────────────
  return () => {
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
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

  const getSubtitle = (status: PrayerStatus) =>
    status === "completed" ? "Prayed" :
    status === "active" ? "Active" :
    status === "missed" ? "Missed" : "Awaiting";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── HEADER ── */}
        <View style={styles.header}>
          <Image source={require("../../assets/Logo.png")} style={styles.logo} />

          <View style={styles.bellContainer}>
            <Animated.Image
              source={require("../../assets/ring.png")}
              style={[styles.bellEffect, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
              resizeMode="contain"
            />
            <Animated.Image
              source={require("../../assets/bell.png")}
              resizeMode="contain"
              style={[styles.bellImage, {
                transform: [{
                  rotate: bellRotate.interpolate({ inputRange: [-1, 1], outputRange: ["-12deg", "12deg"] }),
                }],
              }]}
            />
          </View>
        </View>

        {/* ── HERO TITLE ── */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Your Prayer Rhythm</Text>
          <Text style={styles.heroSubtitle}>Returning in Prayer at 6 · 12 · 6.</Text>
          <Text style={styles.heroSubtitle}>The 6-12-6 Rhythm of the Angelus.</Text>
        </View>

        {/* ── LIGHT THROUGH THE DAY ── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardTitle}>Light Through the Day</Text>
          <View style={styles.sectionDividerRow}>
            <View style={styles.sectionDividerLine} />
            <Ionicons name="flower-outline" size={14} color={COLORS.gold} />
            <View style={styles.sectionDividerLine} />
          </View>

          <AngelusRow title="Morning Angelus" subtitle={getSubtitle(morningStatus)} status={morningStatus} imageSource={progressImages["Morning"]} />
          <View style={styles.rowDivider} />
          <AngelusRow title="Noon Angelus"    subtitle={getSubtitle(noonStatus)}    status={noonStatus}    imageSource={progressImages["Noon"]} />
          <View style={styles.rowDivider} />
          <AngelusRow title="Evening Angelus" subtitle={getSubtitle(eveningStatus)} status={eveningStatus} imageSource={progressImages["Evening"]} />
        </View>

        {/* ── THIS WEEK IN PRAYER ── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardTitle}>This Week in Prayer</Text>
          <View style={styles.sectionDividerRow}>
            <View style={styles.sectionDividerLine} />
            <Ionicons name="flower-outline" size={14} color={COLORS.gold} />
            <View style={styles.sectionDividerLine} />
          </View>
          <WeekRow label="Morning" imageSource={progressImages["Morning"]} filled={weeklyData.morning} total={weeklyData.total} />
          <WeekRow label="Noon"    imageSource={progressImages["Noon"]}    filled={weeklyData.noon}    total={weeklyData.total} />
          <WeekRow label="Evening" imageSource={progressImages["Evening"]} filled={weeklyData.evening} total={weeklyData.total} />
        </View>

        {/* ── TOTAL PRAYERS OFFERED ── */}
        <View style={styles.statsCard}>
          <Text style={styles.statsLabel}>Total Prayers Offered</Text>
          <View style={styles.statsDividerH} />
          <View style={styles.statsRow}>
            <View style={styles.statsHalf}>
              <Text style={styles.statsValue}>{totalMonth.toLocaleString()}</Text>
              <Text style={styles.statsCaption}>This Month</Text>
            </View>
            <View style={styles.statsDividerV} />
            <View style={styles.statsHalf}>
              <Text style={styles.statsValue}>{totalYear.toLocaleString()}</Text>
              <Text style={styles.statsCaption}>This Year</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── AngelusRow ───────────────────────────────────────────────────────────────
function AngelusRow({ title, subtitle, status, imageSource }: {
  title: string; subtitle: string; status: PrayerStatus; imageSource: any;
}) {
  const isCompleted = status === "completed";
  const isActive = status === "active";
  return (
    <View style={styles.angelusRow}>
      <View style={[styles.angelusIconWrap, isCompleted && { backgroundColor: "#F0EAD8" }, isActive && { backgroundColor: "#FFF3D0" }]}>
        <Image source={imageSource} style={styles.angelusIcon} resizeMode="contain" />
      </View>
      <View style={styles.angelusTextWrap}>
        <Text style={styles.angelusTitle}>{title}</Text>
        <Text style={styles.angelusSubtitle}>{subtitle}</Text>
      </View>
      {isCompleted && <Ionicons name="checkmark" size={22} color={COLORS.gold} />}
    </View>
  );
}

// ─── WeekRow ─────────────────────────────────────────────────────────────────
function WeekRow({ label, imageSource, filled, total }: {
  label: string; imageSource: any; filled: number; total: number;
}) {
  return (
    <View style={styles.weekRow}>
      <Image source={imageSource} style={styles.weekIcon} resizeMode="contain" />
      <Text style={styles.weekLabel}>{label}</Text>
      <View style={styles.dotsRow}>
        {Array.from({ length: total }).map((_, i) => (
          <View key={i} style={[styles.dot, i < filled ? styles.dotFilled : styles.dotEmpty]} />
        ))}
      </View>
      <Text style={styles.weekCount}>{filled}/{total}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  scroll: { paddingBottom: 20 },

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
  logoutBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: "#D4A017" },
  logoutText: { fontSize: 13, fontWeight: "600", color: "#C8922A" },
  bellContainer: { width: 85, height: 85, justifyContent: "center", alignItems: "center" },
  bellImage: { width: 85, height: 85, position: "absolute", zIndex: 2 },
  bellEffect: { width: 85, height: 85, position: "absolute", zIndex: 1 },

  heroSection: { alignItems: "center", paddingHorizontal: 24, marginTop: 28, marginBottom: 8 },
  heroTitle: { fontSize: 32, color: COLORS.navy, fontFamily: "CormorantGaramond", fontWeight: "600", textAlign: "center" },
  heroSubtitle: { fontSize: 15, color: COLORS.gold, fontFamily: "CormorantGaramond", textAlign: "center", marginTop: 4, textDecorationLine: "underline" },

  sectionCard: {
    marginHorizontal: 20, marginTop: 18, backgroundColor: COLORS.card,
    borderRadius: 24, borderWidth: 2, borderColor: COLORS.border,
    paddingVertical: 18, paddingHorizontal: 20,
    shadowColor: "#3B2E22", shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  sectionCardTitle: { fontSize: 22, color: COLORS.gold, fontFamily: "CormorantGaramond", fontWeight: "600", textAlign: "center", marginBottom: 8 },
  sectionDividerRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  sectionDividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },

  angelusRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  angelusIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#F0EAD8", justifyContent: "center", alignItems: "center", marginRight: 14 },
  angelusIcon: { width: 36, height: 36 },
  angelusTextWrap: { flex: 1 },
  angelusTitle: { fontSize: 18, color: COLORS.textPrimary, fontFamily: "CormorantGaramond", fontWeight: "600" },
  angelusSubtitle: { fontSize: 13, color: COLORS.textSecondary, fontFamily: "CormorantGaramond", marginTop: 2 },
  rowDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 2 },

  weekRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  weekIcon: { width: 28, height: 28, marginRight: 10 },
  weekLabel: { width: 64, fontSize: 16, color: COLORS.textPrimary, fontFamily: "CormorantGaramond" },
  dotsRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotFilled: { backgroundColor: COLORS.gold },
  dotEmpty: { backgroundColor: "#E0D4BE" },
  weekCount: { fontSize: 15, color: COLORS.textSecondary, fontFamily: "CormorantGaramond", marginLeft: 8, width: 30, textAlign: "right" },

  statsCard: {
    marginHorizontal: 20, marginTop: 18, backgroundColor: COLORS.card,
    borderRadius: 24, borderWidth: 2, borderColor: COLORS.border,
    paddingTop: 14, paddingBottom: 18,
    shadowColor: "#3B2E22", shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  statsLabel: { fontSize: 13, color: COLORS.gold, letterSpacing: 1, textAlign: "center", fontFamily: "CormorantGaramond" },
  statsDividerH: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  statsRow: { flexDirection: "row" },
  statsHalf: { flex: 1, alignItems: "center" },
  statsDividerV: { width: 1, backgroundColor: COLORS.border },
  statsValue: { fontSize: 28, color: COLORS.navy, fontFamily: "CormorantGaramond", fontWeight: "700" },
  statsCaption: { fontSize: 13, color: COLORS.textSecondary, fontFamily: "CormorantGaramond", marginTop: 4 },
});