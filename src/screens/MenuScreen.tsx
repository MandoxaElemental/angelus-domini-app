import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getPrayerStatus, PrayerStatus } from "../utils/prayer";
import { supabase } from "../lib/supabaseClient";
import AppHeader from "../../components/Header";
import {
  AngelusMode,
  getAngelusMode,
  getCustomNotificationTimes,
} from "../services/notificationService";
import { useFonts } from "expo-font";
import { useFocusEffect } from "@react-navigation/native";
import { slotToKey } from "../utils/prayerHelpers";
import { loadOfflineSessions } from "../storage/offlineStorage";

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
  Morning: require("../../assets/Morning_Clear.png"),
  Noon: require("../../assets/Noon_Clear.png"),
  Evening: require("../../assets/Evening_Clear.png"),
};

const completeImages: Record<string, any> = {
  Morning: require("../../assets/Morning_Solid.png"),
  Noon: require("../../assets/Noon_Solid.png"),
  Evening: require("../../assets/Evening_Solid.png"),
};

const weekImages: Record<string, any> = {
  Morning: require("../../assets/Morning_Clear.png"),
  Noon: require("../../assets/Noon_Clear.png"),
  Evening: require("../../assets/Evening_Clear.png"),
};

function getWeekSunday(now: Date): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function toLocalDateKey(d: Date): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function toDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

type DotStatus = "completed" | "missed" | "upcoming" | "loading";

function getDotStatus(
  dayIndex: number,
  prayerHour: number,
  sunday: Date,
  now: Date,
  completedDays: Set<string>,
): DotStatus {
  const slotDate = new Date(sunday);
  slotDate.setDate(sunday.getDate() + dayIndex);
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

export default function MenuScreen() {
  const [fontsLoaded] = useFonts({
    CormorantGaramond: require("../../assets/fonts/CormorantGaramond.ttf"),
    EBGaramond: require("../../assets/fonts/EBGaramond-Medium.ttf"),
  });

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [completedPrayers, setCompletedPrayers] = useState({
    morning: false,
    noon: false,
    evening: false,
  });

  const fetchData = useCallback(async (uid: string) => {
    setLoading(true);

    try {
      const nowSnap = new Date();

      const todayKey = toLocalDateKey(nowSnap);

      const updated = {
        morning: false,
        noon: false,
        evening: false,
      };

      const offlineSessions = await loadOfflineSessions();

      offlineSessions
        .filter(
          (s: any) =>
            s.userId === uid &&
            s.completed &&
            s.slot.split("_")[0] === todayKey,
        )
        .forEach((s: any) => {
          const key = slotToKey(s.slot);

          if (key) {
            updated[key] = true;
          }
        });

      const { data: todaySessions } = await supabase
        .from("PrayerSessions")
        .select("Slot, Completed")
        .eq("UserId", uid)
        .like("Slot", `${todayKey}%`);

      if (todaySessions) {
        todaySessions.forEach((s: any) => {
          if (!s.Completed) return;
          const key = slotToKey(s.Slot);
          if (key) updated[key] = true;
        });
      }
      setCompletedPrayers(updated);

      const weekStart = getWeekSunday(nowSnap);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const { data: weekSessions } = await supabase
        .from("PrayerSessions")
        .select("Slot, ScheduledTime, Completed")
        .eq("UserId", uid)
        .eq("Completed", true)
        .gte("ScheduledTime", weekStart.toISOString())
        .lt("ScheduledTime", weekEnd.toISOString());

      const offlineWeekSessions = offlineSessions
        .filter(
          (s: any) =>
            s.userId === uid &&
            s.completed &&
            new Date(s.scheduledTime) >= weekStart &&
            new Date(s.scheduledTime) < weekEnd,
        )
        .map((s: any) => ({
          Slot: s.slot,
          ScheduledTime: s.scheduledTime,
        }));

      const combinedWeekSessions = [
        ...(weekSessions ?? []),
        ...offlineWeekSessions,
      ];

      if (combinedWeekSessions.length > 0) {
        const morningDays = new Set<string>();
        const noonDays = new Set<string>();
        const eveningDays = new Set<string>();

        combinedWeekSessions.forEach((s: any) => {
          const key = slotToKey(s.Slot);
          if (!key) return;

          const day = s.Slot.split("_")[0];
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
    } finally {
      setLoading(false);
    }
  }, []);
  const [angelusMode, setAngelusModeState] = useState<AngelusMode>("all_three");
  const [customTimes, setCustomTimes] = useState({
    morning: true,
    noon: true,
    evening: true,
  });
  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      (async () => {
        const mode = await getAngelusMode();

        let times = {
          morning: true,
          noon: true,
          evening: true,
        };

        if (mode === "custom") {
          times = await getCustomNotificationTimes();
        } else if (mode === "noon_only") {
          times = {
            morning: false,
            noon: true,
            evening: false,
          };
        }

        if (mounted) {
          setAngelusModeState(mode);
          setCustomTimes(times);
        }

        if (userId) {
          await fetchData(userId);
        }
      })();

      return () => {
        mounted = false;
      };
    }, [userId, fetchData]),
  );
  type PrayerDayKey = string;

  const [weekMorning, setWeekMorning] = useState<Set<PrayerDayKey>>(new Set());
  const [weekNoon, setWeekNoon] = useState<Set<PrayerDayKey>>(new Set());
  const [weekEvening, setWeekEvening] = useState<Set<PrayerDayKey>>(new Set());

  const [totalMonth, setTotalMonth] = useState(0);
  const [totalYear, setTotalYear] = useState(0);

  // ── Live clock ────────────────────────────────────────────────────────────
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  // ──────────────────────────────────────────────────────────────────────────

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

  const morningEnabled =
    angelusMode === "all_three" ||
    (angelusMode === "custom" && customTimes.morning);

  const noonEnabled =
    angelusMode === "all_three" ||
    angelusMode === "noon_only" ||
    (angelusMode === "custom" && customTimes.noon);

  const eveningEnabled =
    angelusMode === "all_three" ||
    (angelusMode === "custom" && customTimes.evening);

  const morningStatus = loading
    ? "loading"
    : getPrayerStatus("morning", completedPrayers.morning);

  const noonStatus = loading
    ? "loading"
    : getPrayerStatus("noon", completedPrayers.noon);

  const eveningStatus = loading
    ? "loading"
    : getPrayerStatus("evening", completedPrayers.evening);

  const morningDisplayStatus = loading
    ? "loading"
    : !morningEnabled
      ? "disabled"
      : morningStatus;

  const noonDisplayStatus = loading
    ? "loading"
    : !noonEnabled
      ? "disabled"
      : noonStatus;

  const eveningDisplayStatus = loading
    ? "loading"
    : !eveningEnabled
      ? "disabled"
      : eveningStatus;
  const getSubtitle = (status: PrayerStatus) =>
    status === "loading"
      ? "Loading..."
      : status === "completed"
        ? "Prayed"
        : status === "active"
          ? "Active"
          : status === "missed"
            ? "Missed"
            : "Awaiting";

  const weekStart = getWeekSunday(now);

  const morningDots: DotStatus[] = loading
    ? Array(7).fill("loading")
    : Array.from({ length: 7 }, (_, i) =>
        getDotStatus(i, 6, weekStart, now, weekMorning),
      );
  const noonDots: DotStatus[] = loading
    ? Array(7).fill("loading")
    : Array.from({ length: 7 }, (_, i) =>
        getDotStatus(i, 12, weekStart, now, weekNoon),
      );

  const eveningDots: DotStatus[] = loading
    ? Array(7).fill("loading")
    : Array.from({ length: 7 }, (_, i) =>
        getDotStatus(i, 18, weekStart, now, weekEvening),
      );

  const morningCount = morningDots.filter((d) => d === "completed").length;
  const noonCount = noonDots.filter((d) => d === "completed").length;
  const eveningCount = eveningDots.filter((d) => d === "completed").length;
  const todayColIndex = now.getDay();

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <AppHeader />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── HERO TITLE ── */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Your Prayer Rhythm</Text>
          <Text style={styles.heroSubtitle}>
            {angelusMode === "noon_only"
              ? "Returning in Prayer at Noon."
              : "Returning in Prayer at 6 · 12 · 6."}
          </Text>

          <Text style={styles.heroSubtitle}>
            {angelusMode === "noon_only"
              ? "The Daily Angelus."
              : "The 6-12-6 Rhythm of the Angelus."}
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
            subtitle={!morningEnabled ? "Disabled" : getSubtitle(morningStatus)}
            status={morningDisplayStatus}
            imageSource={
              angelusMode === "noon_only"
                ? progressImages["Morning"]
                : morningStatus === "completed"
                  ? completeImages["Morning"]
                  : progressImages["Morning"]
            }
          />
          <View style={styles.rowDivider} />
          <AngelusRow
            title="Noon Angelus"
            subtitle={!noonEnabled ? "Disabled" : getSubtitle(noonStatus)}
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
            subtitle={!eveningEnabled ? "Disabled" : getSubtitle(eveningStatus)}
            status={eveningDisplayStatus}
            imageSource={
              angelusMode === "noon_only"
                ? progressImages["Evening"]
                : eveningStatus === "completed"
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
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <View
                  key={i}
                  style={[
                    styles.weekDayLabelWrap,
                    i === todayColIndex && styles.weekDayLabelWrapToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.weekDayLabel,
                      i === todayColIndex && styles.weekDayLabelToday,
                    ]}
                  >
                    {d}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.weekCountPlaceholder} />
          </View>

          <WeekRow
            label="Morning"
            imageSource={weekImages["Morning"]}
            dots={morningDots}
            count={morningCount}
            disabled={!morningEnabled}
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
            disabled={!eveningEnabled}
          />
        </View>

        {/* ── TOTAL PRAYERS OFFERED ── */}
        <View style={styles.statsCard}>
          <Text style={styles.statsLabel}>Prayers Offered</Text>
          <View style={styles.statsDividerH} />
          <View style={styles.statsRow}>
            <View style={styles.statsHalf}>
              <Text style={styles.statsValue}>
                {loading ? "—" : totalMonth.toLocaleString()}
              </Text>
              <Text style={styles.statsCaption}>This Month</Text>
            </View>
            <View style={styles.statsDividerV} />
            <View style={styles.statsHalf}>
              <Text style={styles.statsValue}>
                {loading ? "—" : totalYear.toLocaleString()}
              </Text>
              <Text style={styles.statsCaption}>This Year</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
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
  const isDisabled = status === "disabled";

  return (
    <View style={[styles.angelusRow, isDisabled && styles.angelusRowDisabled]}>
      <View
        style={[
          styles.angelusIconWrap,
          isCompleted && { backgroundColor: "#F0EAD8" },
          isActive && { backgroundColor: "#FFF3D0" },
          isMissed && { backgroundColor: "#FFEDED" },
          isDisabled && { backgroundColor: "#F2F2F2" },
        ]}
      >
        <Image
          source={imageSource}
          style={[styles.angelusIcon, isDisabled && { opacity: 0.55 }]}
        />
      </View>
      <View style={styles.angelusTextWrap}>
        <Text style={[styles.angelusTitle, isDisabled && { color: "#A8A8A8" }]}>
          {title}
        </Text>
        <Text
          style={[
            styles.angelusSubtitle,
            isMissed && { color: "#C0605A" },
            isCompleted && { color: "#5A8A57" },
            isDisabled && { color: "#A8A8A8" },
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
  disabled = false,
}: {
  label: string;
  imageSource: any;
  dots: DotStatus[];
  count: number;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.weekRow, disabled && { opacity: 0.4 }]}>
      <Image
        source={imageSource}
        style={styles.weekIcon}
        resizeMode="contain"
      />
      <Text style={styles.weekLabel}>{label}</Text>
      <View style={styles.dotsRow}>
        {dots.map((status, i) => (
          <View key={i} style={styles.dotWrap}>
            <View
              style={[
                styles.dot,
                disabled
                  ? { backgroundColor: "#D9D9D9" }
                  : status === "completed"
                    ? styles.dotFilled
                    : status === "missed"
                      ? styles.dotMissed
                      : styles.dotEmpty,
              ]}
            />
          </View>
        ))}
      </View>
      <Text style={styles.weekCount}>{disabled ? "—" : `${count}/7`}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  scroll: { paddingBottom: 20 },

  // ── Date & Time Bar ────────────────────────────────────────────────────────
  dateTimeBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center", // ← add this
    marginHorizontal: 20,
    marginTop: 5,
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
    fontFamily: "EBGaramond",
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
    fontFamily: "EBGaramond",
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
    marginTop: 10,
    marginBottom: 5,
  },
  heroTitle: {
    fontSize: 32,
    color: COLORS.navy,
    fontFamily: "EBGaramond",
    fontWeight: "600",
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 20,
    color: COLORS.navy,
    fontFamily: "CormorantGaramond",
    textAlign: "center",
    marginTop: 2,
  },

  sectionCard: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: "#3B2E22",
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  sectionCardTitle: {
    fontSize: 22,
    color: COLORS.gold,
    fontFamily: "EBGaramond",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  sectionDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
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
    fontFamily: "EBGaramond",
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
    flex: 1,
    flexDirection: "row",
  },

  weekDayLabelWrap: {
    flex: 1,
    alignItems: "center",
  },

  weekDayLabelWrapToday: {
    backgroundColor: COLORS.gold,
    borderRadius: 99,
    width: 14,
    height: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  weekDayLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: "CormorantGaramond",
    textAlign: "center",
  },

  weekDayLabelToday: {
    color: "#FFF",
    fontWeight: "700",
  },
  weekCountPlaceholder: { width: 30, marginLeft: 8 },

  weekRow: { flexDirection: "row", alignItems: "center", paddingVertical: 5 },
  weekIcon: { width: 40, height: 40, marginRight: 10 },
  weekLabel: {
    width: 64,
    fontSize: 16,
    color: COLORS.textPrimary,
    fontFamily: "EBGaramond",
  },
  dotsRow: {
    flex: 1,
    flexDirection: "row",
  },

  dotWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotFilled: { backgroundColor: COLORS.gold },
  dotMissed: {
    backgroundColor: "#00000000",
    borderColor: "#D8A3A0",
    borderWidth: 2,
  },
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
    marginTop: 14,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingTop: 14,
    paddingBottom: 14,
    shadowColor: "#3B2E22",
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  statsLabel: {
    fontSize: 16,
    color: COLORS.gold,
    letterSpacing: 1,
    textAlign: "center",
    fontFamily: "CormorantGaramond",
    fontWeight: "600",
  },
  statsDividerH: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 6,
  },
  statsRow: { flexDirection: "row" },
  statsHalf: { flex: 1, alignItems: "center" },
  statsDividerV: { width: 1, backgroundColor: COLORS.border },
  statsValue: {
    fontSize: 32,
    color: COLORS.navy,
    fontFamily: "EBGaramond",
    fontWeight: "700",
  },
  statsCaption: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: "EBGaramond",
    marginTop: 4,
  },
  angelusRowDisabled: {
    opacity: 0.45,
  },
});
