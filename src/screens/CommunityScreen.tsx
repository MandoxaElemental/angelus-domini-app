import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { useState, useMemo, useEffect } from "react";
import Svg, {
  Circle,
  Ellipse,
  Line,
  Path,
  Defs,
  Pattern,
} from "react-native-svg";
import { supabase } from "../lib/supabaseClient";

const C = {
  cream:      "#F5F0E8",
  card:       "#FDFAF3",
  border:     "#E2D9C0",
  navy:       "#1A2A4A",
  gold:       "#C49A22",
  goldLight:  "#EAE0C8",
  brown:      "#5A4E35",
  muted:      "#9A8A6A",
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

function getFlagEmoji(country: string): string {
  const flags: Record<string, string> = {
    "Philippines":    "🇵🇭",
    "United States":  "🇺🇸",
    "Italy":          "🇮🇹",
    "Brazil":         "🇧🇷",
    "Mexico":         "🇲🇽",
    "Spain":          "🇪🇸",
    "France":         "🇫🇷",
    "India":          "🇮🇳",
    "United Kingdom": "🇬🇧",
    "Germany":        "🇩🇪",
    "Canada":         "🇨🇦",
    "Australia":      "🇦🇺",
    "Japan":          "🇯🇵",
    "South Korea":    "🇰🇷",
    "Indonesia":      "🇮🇩",
    "Portugal":       "🇵🇹",
    "Poland":         "🇵🇱",
    "Argentina":      "🇦🇷",
    "Colombia":       "🇨🇴",
    "Nigeria":        "🇳🇬",
  };
  return flags[country] ?? "🌐";
}

function WorldMapSVG({ w, h }: { w: number; h: number }) {
  return (
    <Svg width={w} height={h} viewBox="0 0 220 120">
      <Defs>
        <Pattern id="dots" x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse">
          <Circle cx="2.5" cy="2.5" r="1.2" fill="#C0B07A" opacity="0.7" />
        </Pattern>
      </Defs>
      <Path
        d="M15 35 L22 28 L35 26 L45 22 L58 20 L70 22 L80 18 L90 20
           L100 15 L110 17 L120 14 L130 18 L140 15 L148 20 L155 18
           L162 22 L168 25 L162 35 L168 42 L165 50 L155 52 L148 58
           L140 60 L130 62 L120 60 L110 62 L100 58 L90 55 L80 58
           L70 55 L60 58 L50 55 L40 58 L30 55 L22 50 L15 45 Z"
        fill="url(#dots)"
      />
      <Path d="M60 55 L75 58 L85 62 L90 70 L88 80 L80 85 L72 82 L65 78 L60 70 L58 62 Z" fill="url(#dots)" />
      <Path d="M90 55 L100 58 L105 65 L103 72 L98 75 L92 72 L88 65 Z" fill="url(#dots)" />
      <Path d="M125 55 L138 52 L148 55 L152 62 L150 72 L145 78 L138 80 L130 78 L125 70 L122 62 Z" fill="url(#dots)" />
      <Path d="M155 35 L165 32 L180 30 L195 32 L205 38 L210 48 L205 55 L195 58 L180 55 L168 52 L162 45 Z" fill="url(#dots)" />
      {([
        [78, 25], [108, 30], [138, 38],
        [68, 65], [170, 42], [48, 32], [185, 40],
      ] as [number, number][]).map(([cx, cy], i) => (
        <Circle key={i} cx={cx} cy={cy} r={3.5} fill={C.gold} opacity={0.9} />
      ))}
    </Svg>
  );
}

function GlobeIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36">
      <Circle cx="18" cy="18" r="17" stroke={C.gold} strokeWidth="2" fill="none" />
      <Ellipse cx="18" cy="18" rx="8" ry="17" stroke={C.gold} strokeWidth="1.5" fill="none" />
      <Line x1="1" y1="18" x2="35" y2="18" stroke={C.gold} strokeWidth="1.5" />
      <Path d="M4 10 Q18 13 32 10" stroke={C.gold} strokeWidth="1" fill="none" />
      <Path d="M4 26 Q18 23 32 26" stroke={C.gold} strokeWidth="1" fill="none" />
    </Svg>
  );
}

type CountryRow = { country: string; count: number };

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState<"country" | "region">("country");
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const { s, fs, hp, width } = useScale();

  const sizes = useMemo(() => ({
    mapW:       Math.round(width * 0.56),
    mapH:       Math.round(width * 0.56 * 0.545),
    globeSize:  s(36),
    barH:       s(7),
    rowGap:     s(12),
    cardRadius: s(18),
    rankW:      s(18),
    countW:     s(42),
  }), [s, width]);

  const fetchCounts = async () => {
    try {
      const { data, error } = await supabase.from("users").select("Country");
      if (error) throw error;

      const countMap: Record<string, number> = {};
      let total = 0;
      for (const row of data ?? []) {
        const c = row.Country ?? "Unknown";
        countMap[c] = (countMap[c] ?? 0) + 1;
        total++;
      }

      const sorted = Object.entries(countMap)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count);

      setCountries(sorted);
      setTotalUsers(total);
    } catch (err) {
      console.error("Error fetching country counts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("users-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
        fetchCounts();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const maxCount = useMemo(
    () => Math.max(...countries.map((c) => c.count), 1),
    [countries]
  );

  const today = new Date().toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: s(40) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            paddingHorizontal: hp,
            paddingTop: s(28),
            marginBottom: s(12),
          }}
        >
          <Text
            style={{
              fontFamily: "PlayfairDisplay_400Bold",
              fontSize: fs(30),
              color: C.navy,
              lineHeight: fs(36),
            }}
          >
            {"Global\nPrayer"}
          </Text>
          <View
            style={{
              width: s(54), height: s(62),
              backgroundColor: "#EDE4CC",
              borderRadius: s(10),
              borderWidth: 1, borderColor: "#C9B87A",
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: fs(26) }}>🔔</Text>
          </View>
        </View>

        {/* Map Card */}
        <View
          style={{
            marginHorizontal: hp,
            backgroundColor: C.card,
            borderRadius: sizes.cardRadius,
            borderWidth: 1, borderColor: C.border,
            padding: s(16),
            minHeight: s(130),
            overflow: "hidden",
          }}
        >
          <View style={{ flexDirection: "row", gap: s(12) }}>
            <GlobeIcon size={sizes.globeSize} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fs(11), color: C.muted, marginBottom: 1 }}>Today</Text>
              <Text style={{ fontSize: fs(11), color: C.muted, marginBottom: s(4) }}>{today}</Text>
              <Text
                style={{
                  fontFamily: "PlayfairDisplay_400Bold",
                  fontSize: fs(34), color: C.gold,
                  lineHeight: fs(38), letterSpacing: -0.5,
                }}
              >
                {totalUsers.toLocaleString()}
              </Text>
              <Text
                style={{
                  fontSize: fs(9), fontWeight: "700",
                  letterSpacing: 1.3, color: C.brown,
                  textTransform: "uppercase", marginTop: 2,
                }}
              >
                PEOPLE HAVE PRAYED
              </Text>
              <Text style={{ fontSize: fs(10), color: C.muted, marginTop: 2 }}>
                around the world
              </Text>
            </View>
          </View>
          <View
            style={{ position: "absolute", right: -s(8), top: s(4), opacity: 0.45 }}
            pointerEvents="none"
          >
            <WorldMapSVG w={sizes.mapW} h={sizes.mapH} />
          </View>
        </View>

        {/* Tabs */}
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

        {/* Section label */}
        <Text
          style={{
            fontSize: fs(12), fontWeight: "700",
            color: C.brown, paddingHorizontal: hp,
            paddingTop: s(12), paddingBottom: s(8),
            letterSpacing: 0.2,
          }}
        >
          Top Countries
        </Text>

        {/* Country rows */}
        {loading ? (
          <ActivityIndicator size="large" color={C.gold} style={{ marginTop: s(40) }} />
        ) : countries.length === 0 ? (
          <Text style={{ textAlign: "center", color: C.muted, fontSize: fs(13), marginTop: s(20) }}>
            No data yet
          </Text>
        ) : (
          <View style={{ paddingHorizontal: hp, gap: sizes.rowGap }}>
            {countries.map(({ country, count }, index) => {
              const pct = count / maxCount;
              return (
                <View
                  key={country}
                  style={{ flexDirection: "row", alignItems: "center", gap: s(10) }}
                >
                  {/* Rank */}
                  <Text style={{ width: sizes.rankW, fontSize: fs(12), color: C.mutedLight, textAlign: "right" }}>
                    {index + 1}
                  </Text>

                  {/* Flag */}
                  <Text style={{ fontSize: fs(18), width: s(28) }}>
                    {getFlagEmoji(country)}
                  </Text>

                  {/* Name + bar */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: fs(11), color: C.brown, marginBottom: s(3), fontWeight: "600" }}>
                      {country}
                    </Text>
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
                          backgroundColor: C.gold,
                          borderRadius: sizes.barH / 2,
                        }}
                      />
                    </View>
                  </View>

                  {/* Count */}
                  <Text style={{ fontSize: fs(11), color: C.mutedLight, width: sizes.countW, textAlign: "right" }}>
                    {count.toLocaleString()}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}