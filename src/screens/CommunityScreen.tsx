import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  Image,
  SafeAreaView,
} from "react-native";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Svg, { Circle, Ellipse, Line, Path } from "react-native-svg";
import { supabase } from "../lib/supabaseClient";
import AppHeader from "../../components/Header";

const C = {
  cream: "#F5F0E8",
  card: "#FDFAF3",
  border: "#E2D9C0",
  navy: "#1A2A4A",
  gold: "#C49A22",
  goldLight: "#EAE0C8",
  brown: "#5A4E35",
  muted: "#9A8A6A",
  mutedLight: "#8A7A5A",
};

const BASE_WIDTH = 390;
function useScale() {
  const { width } = useWindowDimensions();
  return useMemo(() => {
    const scale = Math.min(width / BASE_WIDTH, 1.35);
    const s = (dp: number) => Math.round(dp * scale);
    const fs = (dp: number) => Math.round(dp * Math.min(scale, 1.2));
    const hp = Math.max(s(14), 12);
    return { s, fs, hp, width };
  }, [width]);
}

const FLAGS: Record<string, string> = {
  Philippines: "🇵🇭",
  "United States": "🇺🇸",
  Italy: "🇮🇹",
  Brazil: "🇧🇷",
  Mexico: "🇲🇽",
  Spain: "🇪🇸",
  France: "🇫🇷",
  India: "🇮🇳",
  "United Kingdom": "🇬🇧",
  Germany: "🇩🇪",
  Canada: "🇨🇦",
  Australia: "🇦🇺",
  Japan: "🇯🇵",
  "South Korea": "🇰🇷",
  Indonesia: "🇮🇩",
  Portugal: "🇵🇹",
  Poland: "🇵🇱",
  Argentina: "🇦🇷",
  Colombia: "🇨🇴",
  Nigeria: "🇳🇬",
};

function getFlagEmoji(country: string) {
  return FLAGS[country] ?? "🌐";
}

function GlobeIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36">
      <Circle
        cx="18"
        cy="18"
        r="17"
        stroke={C.gold}
        strokeWidth="2"
        fill="none"
      />
      <Ellipse
        cx="18"
        cy="18"
        rx="8"
        ry="17"
        stroke={C.gold}
        strokeWidth="1.5"
        fill="none"
      />
      <Line x1="1" y1="18" x2="35" y2="18" stroke={C.gold} strokeWidth="1.5" />
      <Path
        d="M4 10 Q18 13 32 10"
        stroke={C.gold}
        strokeWidth="1"
        fill="none"
      />
      <Path
        d="M4 26 Q18 23 32 26"
        stroke={C.gold}
        strokeWidth="1"
        fill="none"
      />
    </Svg>
  );
}

type CountryRow = { country: string; count: number };

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState<"country" | "region">("country");
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [totalPrayedToday, setTotalPrayedToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const { s, fs, hp, width } = useScale();

  const sizes = useMemo(
    () => ({
      mapW: Math.round(width * 0.56),
      mapH: Math.round(width * 0.56 * 0.545),
      globeSize: s(36),
      barH: s(7),
      rowGap: s(12),
      cardRadius: s(18),
      rankW: s(18),
      countW: s(42),
    }),
    [s, width],
  );

  // ── Fetch: unique users who prayed today, grouped by country ─────────────
  const isFetchingRef = useRef(false);
  const fetchCounts = useCallback(async () => {
    if (isFetchingRef.current) return;
    setLoading(true);
    isFetchingRef.current = true;
    try {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: sessions, error: sessErr } = await supabase
        .from("PrayerSessions")
        .select("UserId")
        .eq("Completed", true)
        .gte("ScheduledTime", startOfDay.toISOString())
        .lte("ScheduledTime", endOfDay.toISOString());
      if (sessErr) throw sessErr;

      if (!sessions || sessions.length === 0) {
        setTotalPrayedToday(0);
        setCountries([]);
        return;
      }

      // Unique user IDs who prayed today
      const uniqueUserIds = [...new Set(sessions.map((s: any) => s.UserId))];
      setTotalPrayedToday(uniqueUserIds.length);

      // ✅ FIXED: use "Id" (capital I) to match the users table column
      const { data: userData, error: userErr } = await supabase
        .from("users")
        .select("Id, Country")
        .in("Id", uniqueUserIds);

      if (userErr) throw userErr;

      // Count unique prayers per country
      const countMap: Record<string, number> = {};
      for (const user of userData ?? []) {
        const country = user.Country ?? "Unknown";
        countMap[country] = (countMap[country] ?? 0) + 1;
      }

      const sorted = Object.entries(countMap)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count);

      setCountries(sorted);
    } catch (err) {
      console.error("❌ CommunityScreen fetchCounts error:", err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      fetchCounts();
    }, 60000);

    return () => clearInterval(id);
  }, [fetchCounts]);

  // ── On mount ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // ── Real-time: refresh on any PrayerSession change ────────────────────────
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel("community-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "PrayerSessions",
        },
        () => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = setTimeout(() => {
            fetchCounts();
          }, 1000);
        },
      )
      .subscribe();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [fetchCounts]);

  const maxCount = useMemo(() => {
    let max = 1;

    for (const c of countries) {
      if (c.count > max) max = c.count;
    }

    return max;
  }, [countries]);

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      {/* ── HEADER ── */}
      <AppHeader />

      <ScrollView
        contentContainerStyle={{ paddingBottom: s(40) }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── TITLE ROW ── */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: hp,
            paddingTop: s(28),
            marginBottom: s(12),
            marginHorizontal: 10,
          }}
        >
          <View>
            <Text
              style={{
                fontFamily: "EBGaramond-Medium",
                fontSize: fs(30),
                color: C.navy,
                lineHeight: fs(36),
              }}
            >
              Global Prayer
            </Text>
            <Text
              style={{
                fontSize: fs(10),
                color: C.muted,
                letterSpacing: 0.8,
                marginTop: s(4),
                textTransform: "uppercase",
              }}
            >
              We pray together. We are one Church
            </Text>
          </View>
          <Image
            source={require("../../assets/combell.png")}
            style={{ width: s(90), height: s(110), opacity: 0.85 }}
            resizeMode="contain"
          />
        </View>

        {/* ── MAP CARD ── */}
        <View
          style={{
            marginHorizontal: hp,
            backgroundColor: C.card,
            borderRadius: sizes.cardRadius,
            borderWidth: 1,
            borderColor: C.border,
            padding: s(16),
            minHeight: s(130),
            overflow: "hidden",
          }}
        >
          <View style={{ flexDirection: "row", gap: s(12) }}>
            <GlobeIcon size={sizes.globeSize} />
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: fs(11), color: C.muted, marginBottom: 1 }}
              >
                Today
              </Text>
              <Text
                style={{ fontSize: fs(11), color: C.muted, marginBottom: s(4) }}
              >
                {today}
              </Text>
              <Text
                style={{
                  fontFamily: "PlayfairDisplay_400Bold",
                  fontSize: fs(34),
                  color: C.gold,
                  lineHeight: fs(38),
                  letterSpacing: -0.5,
                }}
              >
                {totalPrayedToday.toLocaleString()}
              </Text>
              <Text
                style={{
                  fontSize: fs(9),
                  fontWeight: "700",
                  letterSpacing: 1.3,
                  color: C.brown,
                  textTransform: "uppercase",
                  marginTop: 2,
                }}
              >
                PEOPLE HAVE PRAYED
              </Text>
              <Text style={{ fontSize: fs(10), color: C.muted, marginTop: 2 }}>
                around the world today
              </Text>
            </View>
          </View>
          <View
            style={{
              position: "absolute",
              right: -s(8),
              top: s(4),
              opacity: 0.45,
            }}
            pointerEvents="none"
          >
            <Image
              source={require("../../assets/mapsglobal.png")}
              style={{ width: sizes.mapW, height: sizes.mapH }}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* ── TABS ── */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: hp,
            paddingTop: s(14),
            paddingBottom: s(6),
            borderBottomWidth: 1.5,
            borderBottomColor: C.border,
            marginTop: s(4),
          }}
        >
          {(["country", "region"] as const).map((tab) => {
            const active = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
                style={{
                  paddingHorizontal: s(14),
                  paddingBottom: s(8),
                  borderBottomWidth: active ? 2.5 : 0,
                  borderBottomColor: active ? C.gold : "transparent",
                  marginBottom: -1.5,
                }}
              >
                <Text
                  style={{
                    fontSize: fs(13),
                    color: active ? C.gold : C.muted,
                    fontWeight: active ? "700" : "400",
                  }}
                >
                  {tab === "country" ? "By Country" : "By Region"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── SECTION LABEL ── */}
        <Text
          style={{
            fontSize: fs(12),
            fontWeight: "700",
            color: C.brown,
            paddingHorizontal: hp,
            paddingTop: s(12),
            paddingBottom: s(8),
            letterSpacing: 0.2,
          }}
        >
          {activeTab === "country"
            ? `Top Countries · ${today}`
            : "By Region · Coming Soon"}
        </Text>

        {/* ── COUNTRY ROWS ── */}
        {loading ? (
          <ActivityIndicator
            size="large"
            color={C.gold}
            style={{ marginTop: s(40) }}
          />
        ) : activeTab === "region" ? (
          <Text
            style={{
              textAlign: "center",
              color: C.muted,
              fontSize: fs(13),
              marginTop: s(20),
            }}
          >
            Region breakdown coming soon.
          </Text>
        ) : countries.length === 0 ? (
          <Text
            style={{
              textAlign: "center",
              color: C.muted,
              fontSize: fs(13),
              marginTop: s(20),
            }}
          >
            No prayers recorded yet today.
          </Text>
        ) : (
          <View style={{ paddingHorizontal: hp, gap: sizes.rowGap }}>
            {countries.map(({ country, count }, index) => {
              const pct = count / maxCount;
              return (
                <View
                  key={country}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: s(10),
                  }}
                >
                  {/* Rank */}
                  <Text
                    style={{
                      width: sizes.rankW,
                      fontSize: fs(12),
                      color: index === 0 ? C.gold : C.mutedLight,
                      textAlign: "right",
                      fontWeight: index === 0 ? "700" : "400",
                    }}
                  >
                    {index + 1}
                  </Text>

                  {/* Flag */}
                  <Text style={{ fontSize: fs(18), width: s(28) }}>
                    {getFlagEmoji(country)}
                  </Text>

                  {/* Bar + name */}
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: s(3),
                      }}
                    >
                      <Text
                        style={{
                          fontSize: fs(11),
                          color: C.brown,
                          fontWeight: "600",
                        }}
                      >
                        {country}
                      </Text>
                      <Text style={{ fontSize: fs(11), color: C.mutedLight }}>
                        {count} {count === 1 ? "person" : "people"}
                      </Text>
                    </View>
                    <View
                      style={{
                        height: sizes.barH,
                        backgroundColor: C.goldLight,
                        borderRadius: sizes.barH / 2,
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          height: "100%",
                          width: `${pct * 100}%`,
                          backgroundColor: index === 0 ? C.gold : "#C49A2299",
                          borderRadius: sizes.barH / 2,
                        }}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: s(20) }} />
      </ScrollView>
    </SafeAreaView>
  );
}
