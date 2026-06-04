import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getPrayerStatus, PrayerStatus } from "../utils/prayer";
import { getGlobalCount, startPrayer } from "../api/prayerApi";
import { supabase } from "../lib/supabaseClient";
import AppHeader from "../../components/Header";

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
  missed: "#D8A3A0",
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

const weekImages: Record<string, any> = {
  Morning: require("../../assets/11.png"),
  Noon: require("../../assets/22.png"),
  Evening: require("../../assets/33.png"),
};

const slotToKey = (slot: string): "morning" | "noon" | "evening" | null => {
  if (!slot) return null;
  if (slot.includes("_6") && !slot.includes("_18")) return "morning";
  if (slot.includes("_12")) return "noon";
  if (slot.includes("_18") || slot.includes("_6p")) return "evening";
  return null;
};

function getWeekMonday(now: Date): Date {
  const d = new Date(now);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

type DotStatus = "completed" | "missed" | "upcoming";

function getDotStatus(
  dayIndex: number,
  prayerHour: number,
  monday: Date,
  now: Date,
  completedDays: Set<string>,
): DotStatus {
  const slotDate = new Date(monday);
  slotDate.setDate(monday.getDate() + dayIndex);
  const dateStr = `${slotDate.getFullYear()}-${String(
    slotDate.getMonth() + 1,
  ).padStart(2, "0")}-${String(slotDate.getDate()).padStart(2, "0")}`;

  if (completedDays.has(dateStr)) return "completed";

  const slotEnd = new Date(slotDate);
  if (prayerHour === 6) slotEnd.setHours(12, 0, 0, 0);
  else if (prayerHour === 12) slotEnd.setHours(18, 0, 0, 0);
  else slotEnd.setHours(23, 59, 59, 999);

  if (now > slotEnd) return "missed";
  return "upcoming";
}

// ── Format helpers ─────────────────────────────────────────────────────────────
const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatDate(d: Date): string {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatTime(d: Date): string {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function formatDayOfWeek(d: Date): string {
  return DAY_NAMES[d.getDay()];
}
// ──────────────────────────────────────────────────────────────────────────────

export default function MenuScreen({ onLogout }: Props) {
  const [count, setCount] = useState(0);
  const [userId, setUserId] = useState("");
  const [completedPrayers, setCompletedPrayers] = useState({
    morning: false,
    noon: false,
    evening: false,
  });

  const [weekMorning, setWeekMorning] = useState<Set<string>>(new Set());
  const [weekNoon, setWeekNoon] = useState<Set<string>>(new Set());
  const [weekEvening, setWeekEvening] = useState<Set<string>>(new Set());

  const [totalMonth, setTotalMonth] = useState(0);
  const [totalYear, setTotalYear] = useState(0);

  // ── Live clock ────────────────────────────────────────────────────────────
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  // ──────────────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async (uid: string) => {
    try {
      const nowSnap = new Date();
      const todayStr = nowSnap.toISOString().slice(0, 10);

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

      const monday = getWeekMonday(nowSnap);
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

        setWeekMorning(morningDays);
        setWeekNoon(noonDays);
        setWeekEvening(eveningDays);
      }

      const firstOfMonth = new Date(
        nowSnap.getFullYear(),
        nowSnap.getMonth(),
        1,
      ).toISOString();
      const { count: monthCount } = await supabase
        .from("PrayerSessions")
        .select("*", { count: "exact", head: true })
        .eq("UserId", uid)
        .eq("Completed", true)
        .gte("ScheduledTime", firstOfMonth);
      setTotalMonth(monthCount ?? 0);

      const firstOfYear = new Date(nowSnap.getFullYear(), 0, 1).toISOString();
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
  }, []);

  useEffect(() => {
    let channel: any = null;

    const setup = async () => {
      try {
        let {
          data: { session: authSession },
        } = await supabase.auth.getSession();

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

        if (!authSession?.user?.id) return;

        const uid = authSession.user.id;
        setUserId(uid);

        const sess = await startPrayer(uid);
        const globalCount = await getGlobalCount(sess.slot);
        setCount(globalCount);

        await fetchData(uid);

        supabase.getChannels().forEach((c) => {
          if (c.topic.includes("menu-prayer-sessions"))
            supabase.removeChannel(c);
        });

        channel = supabase
          .channel(`menu-prayer-sessions-${uid}-${Date.now()}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "PrayerSessions",
              filter: `UserId=eq.${uid}`,
            },
            async () => {
              await fetchData(uid);
              try {
                const newCount = await getGlobalCount(sess.slot);
                setCount(newCount);
              } catch {}
            },
          )
          .subscribe();
      } catch (err) {
        console.error("❌ MenuScreen mount error:", err);
      }
    };

    setup();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const morningStatus = getPrayerStatus("morning", completedPrayers.morning);
  const noonStatus = getPrayerStatus("noon", completedPrayers.noon);
  const eveningStatus = getPrayerStatus("evening", completedPrayers.evening);

  const getSubtitle = (status: PrayerStatus) =>
    status === "completed"
      ? "Prayed"
      : status === "active"
        ? "Active"
        : status === "missed"
          ? "Missed"
          : "Awaiting";

  const monday = getWeekMonday(now);

  const morningDots: DotStatus[] = Array.from({ length: 7 }, (_, i) =>
    getDotStatus(i, 6, monday, now, weekMorning),
  );
  const noonDots: DotStatus[] = Array.from({ length: 7 }, (_, i) =>
    getDotStatus(i, 12, monday, now, weekNoon),
  );
  const eveningDots: DotStatus[] = Array.from({ length: 7 }, (_, i) =>
    getDotStatus(i, 18, monday, now, weekEvening),
  );

  const morningCount = morningDots.filter((d) => d === "completed").length;
  const noonCount = noonDots.filter((d) => d === "completed").length;
  const eveningCount = eveningDots.filter((d) => d === "completed").length;

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── HERO TITLE ── */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Your Prayer Rhythm</Text>
          <Text style={styles.heroSubtitle}>
            Returning in Prayer at 6 · 12 · 6.
          </Text>
          <Text style={styles.heroSubtitle}>
            The 6-12-6 Rhythm of the Angelus.
          </Text>
        </View>

        {/* ── DATE & TIME BAR ── */}
        <View style={styles.dateTimeBar}>
          <Ionicons name="calendar" size={22} color={COLORS.gold} />
          <Text style={styles.dateTimeDate} numberOfLines={1}>
            {formatDate(now)}
          </Text>
          <View style={styles.dateTimeBarDivider} />
          <Text style={styles.dateTimeDay} numberOfLines={1}>
            {formatDayOfWeek(now)}
          </Text>
          <View style={styles.dateTimeBarDivider} />
          <Ionicons name="time-outline" size={16} color={COLORS.gold} />
          <Text style={styles.dateTimeTime} numberOfLines={1}>
            {formatTime(now)}
          </Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color={COLORS.textSecondary}
          />
        </View>

        {/* ── LIGHT THROUGH THE DAY ── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardTitle}>Light Through the Day</Text>
          <View style={styles.sectionDividerRow}>
            <View style={styles.sectionDividerLine} />
            <Ionicons name="flower-outline" size={14} color={COLORS.gold} />
            <View style={styles.sectionDividerLine} />
          </View>
          <AngelusRow
            title="Morning Angelus"
            subtitle={getSubtitle(morningStatus)}
            status={morningStatus}
            imageSource={
              morningStatus === "completed"
                ? completeImages["Morning"]
                : progressImages["Morning"]
            }
          />
          <View style={styles.rowDivider} />
          <AngelusRow
            title="Noon Angelus"
            subtitle={getSubtitle(noonStatus)}
            status={noonStatus}
            imageSource={
              noonStatus === "completed"
                ? completeImages["Noon"]
                : progressImages["Noon"]
            }
          />
          <View style={styles.rowDivider} />
          <AngelusRow
            title="Evening Angelus"
            subtitle={getSubtitle(eveningStatus)}
            status={eveningStatus}
            imageSource={
              eveningStatus === "completed"
                ? completeImages["Evening"]
                : progressImages["Evening"]
            }
          />
        </View>

        {/* ── THIS WEEK IN PRAYER ── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardTitle}>This Week in Prayer</Text>
          <View style={styles.sectionDividerRow}>
            <View style={styles.sectionDividerLine} />
            <Ionicons name="flower-outline" size={14} color={COLORS.gold} />
            <View style={styles.sectionDividerLine} />
          </View>

          <View style={styles.weekDayHeader}>
            <View style={styles.weekIconPlaceholder} />
            <View style={styles.weekLabelPlaceholder} />
            <View style={styles.weekDayLabels}>
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <Text key={i} style={styles.weekDayLabel}>
                  {d}
                </Text>
              ))}
            </View>
            <View style={styles.weekCountPlaceholder} />
          </View>

          <WeekRow
            label="Morning"
            imageSource={weekImages["Morning"]}
            dots={morningDots}
            count={morningCount}
          />
          <WeekRow
            label="Noon"
            imageSource={weekImages["Noon"]}
            dots={noonDots}
            count={noonCount}
          />
          <WeekRow
            label="Evening"
            imageSource={weekImages["Evening"]}
            dots={eveningDots}
            count={eveningCount}
          />
        </View>

        {/* ── TOTAL PRAYERS OFFERED ── */}
        <View style={styles.statsCard}>
          <Text style={styles.statsLabel}>Total Prayers Offered</Text>
          <View style={styles.statsDividerH} />
          <View style={styles.statsRow}>
            <View style={styles.statsHalf}>
              <Text style={styles.statsValue}>
                {totalMonth.toLocaleString()}
              </Text>
              <Text style={styles.statsCaption}>This Month</Text>
            </View>
            <View style={styles.statsDividerV} />
            <View style={styles.statsHalf}>
              <Text style={styles.statsValue}>
                {totalYear.toLocaleString()}
              </Text>
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
function AngelusRow({
  title,
  subtitle,
  status,
  imageSource,
}: {
  title: string;
  subtitle: string;
  status: PrayerStatus;
  imageSource: any;
}) {
  const isCompleted = status === "completed";
  const isActive = status === "active";
  const isMissed = status === "missed";

  return (
    <View style={styles.angelusRow}>
      <View
        style={[
          styles.angelusIconWrap,
          isCompleted && { backgroundColor: "#F0EAD8" },
          isActive && { backgroundColor: "#FFF3D0" },
          isMissed && { backgroundColor: "#FFEDED" },
        ]}
      >
        <Image
          source={imageSource}
          style={styles.angelusIcon}
          resizeMode="contain"
        />
      </View>
      <View style={styles.angelusTextWrap}>
        <Text style={styles.angelusTitle}>{title}</Text>
        <Text
          style={[
            styles.angelusSubtitle,
            isMissed && { color: "#C0605A" },
            isCompleted && { color: "#5A8A57" },
          ]}
        >
          {subtitle}
        </Text>
      </View>
      {isCompleted && (
        <Ionicons name="checkmark" size={22} color={COLORS.gold} />
      )}
      {isMissed && (
        <Ionicons name="close-circle-outline" size={22} color="#C0605A" />
      )}
    </View>
  );
}

// ─── WeekRow ─────────────────────────────────────────────────────────────────
function WeekRow({
  label,
  imageSource,
  dots,
  count,
}: {
  label: string;
  imageSource: any;
  dots: DotStatus[];
  count: number;
}) {
  return (
    <View style={styles.weekRow}>
      <Image
        source={imageSource}
        style={styles.weekIcon}
        resizeMode="contain"
      />
      <Text style={styles.weekLabel}>{label}</Text>
      <View style={styles.dotsRow}>
        {dots.map((status, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              status === "completed" && styles.dotFilled,
              status === "missed" && styles.dotMissed,
              status === "upcoming" && styles.dotEmpty,
            ]}
          />
        ))}
      </View>
      <Text style={styles.weekCount}>{count}/7</Text>
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
  bellContainer: {
    width: 85,
    height: 85,
    justifyContent: "center",
    alignItems: "center",
  },
  bellImage: { width: 85, height: 85, position: "absolute", zIndex: 2 },
  bellEffect: { width: 85, height: 85, position: "absolute", zIndex: 1 },

  // ── Date & Time Bar ────────────────────────────────────────────────────────
  dateTimeBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center", // ← add this
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: COLORS.card,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: "#3B2E22",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    gap: 7,
  },
  dateTimeDate: {
    fontSize: 13,
    color: COLORS.navy,
    fontFamily: "EBGaramond-Medium",
    fontWeight: "600",
    flexShrink: 1,
  },
  dateTimeBarDivider: {
    width: 1,
    height: 18,
    backgroundColor: COLORS.border,
  },
  dateTimeDay: {
    fontSize: 13,
    color: COLORS.navy,
    fontFamily: "EBGaramond-Medium",
    fontWeight: "500",
    flexShrink: 0,
  },
  dateTimeTime: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: "CormorantGaramond",
    fontWeight: "600",
    flexShrink: 0,
  },
  // ──────────────────────────────────────────────────────────────────────────

  heroSection: {
    alignItems: "center",
    paddingHorizontal: 24,
    marginTop: 20,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 32,
    color: COLORS.navy,
    fontFamily: "EBGaramond-Medium",
    fontWeight: "600",
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 15,
    color: COLORS.navy,
    fontFamily: "CormorantGaramond",
    textAlign: "center",
    marginTop: 4,
  },

  sectionCard: {
    marginHorizontal: 20,
    marginTop: 18,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingVertical: 18,
    paddingHorizontal: 20,
    shadowColor: "#3B2E22",
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  sectionCardTitle: {
    fontSize: 22,
    color: COLORS.gold,
    fontFamily: "EBGaramond-Medium",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  sectionDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionDividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },

  angelusRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  angelusIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F0EAD8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  angelusIcon: { width: 59, height: 59 },
  angelusTextWrap: { flex: 1 },
  angelusTitle: {
    fontSize: 18,
    color: COLORS.textPrimary,
    fontFamily: "EBGaramond-Medium",
    fontWeight: "600",
  },
  angelusSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: "CormorantGaramond",
    marginTop: 2,
  },
  rowDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 2 },

  weekDayHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  weekIconPlaceholder: { width: 40, marginRight: 10 },
  weekLabelPlaceholder: { width: 64 },
  weekDayLabels: {
    marginLeft: 10,
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  weekDayLabel: {
    width: 10,
    fontSize: 10,
    color: COLORS.muted,
    fontFamily: "CormorantGaramond",
    textAlign: "center",
  },
  weekCountPlaceholder: { width: 30, marginLeft: 8 },

  weekRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  weekIcon: { width: 40, height: 40, marginRight: 10 },
  weekLabel: {
    width: 64,
    fontSize: 16,
    color: COLORS.textPrimary,
    fontFamily: "EBGaramond-Medium",
  },
  dotsRow: {
    marginLeft: 10,
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotFilled: { backgroundColor: COLORS.gold },
  dotMissed: { backgroundColor: "#D8A3A0" },
  dotEmpty: { backgroundColor: "#E0D4BE" },
  weekCount: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontFamily: "CormorantGaramond",
    marginLeft: 8,
    width: 30,
    textAlign: "right",
  },

  statsCard: {
    marginHorizontal: 20,
    marginTop: 18,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingTop: 14,
    paddingBottom: 18,
    shadowColor: "#3B2E22",
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  statsLabel: {
    fontSize: 13,
    color: COLORS.gold,
    letterSpacing: 1,
    textAlign: "center",
    fontFamily: "CormorantGaramond",
  },
  statsDividerH: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  statsRow: { flexDirection: "row" },
  statsHalf: { flex: 1, alignItems: "center" },
  statsDividerV: { width: 1, backgroundColor: COLORS.border },
  statsValue: {
    fontSize: 28,
    color: COLORS.navy,
    fontFamily: "CormorantGaramond",
    fontWeight: "700",
  },
  statsCaption: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: "EBGaramond-Medium",
    marginTop: 4,
  },

  logoutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D4A017",
  },
  logoutText: { fontSize: 13, fontWeight: "600", color: "#C8922A" },
});
