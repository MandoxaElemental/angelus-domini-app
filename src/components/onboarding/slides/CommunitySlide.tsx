import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { FadeIn } from "../../shared/FadeIn";
import { sharedStyles, width, height } from "../styles/sharedStyles";
import {
  BLUE,
  GOLD,
  IVORY,
  TEXT_SECONDARY,
} from "../../../lib/constants/colors";
import {
  FONT_BODY,
  FONT_BODY_SEMIBOLD,
  FONT_TITLE_BOLD,
  FONT_TITLE_ITALIC,
} from "../../../lib/constants/fonts";
import { supabase } from "../../../lib/supabaseClient";
import { SectionHeader } from "../../sectionHeader";

type Props = {
  title: string;
  description: string;
  isActive: boolean;
  onNext: () => void;
};

export function CommunitySlide({
  title,
  description,
  isActive,
  onNext,
}: Props) {
  function getPrayerDay() {
    const now = new Date();

    if (now.getHours() < 6) {
      now.setDate(now.getDate() - 1);
    }

    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  async function getGlobalPrayerTotal() {
    const prayerDay = getPrayerDay();

    const { count, error } = await supabase
      .from("PrayerSessions")
      .select("*", { count: "exact", head: true })
      .eq("Completed", true)
      .like("Slot", `${prayerDay}_%`);

    if (error) throw error;

    return count ?? 0;
  }
  const mapHeight = height < 700 ? height * 0.28 : height * 0.32;

  const [totalPrayers, setTotalPrayers] = useState(0);

  useEffect(() => {
    const loadTotal = async () => {
      try {
        setTotalPrayers(await getGlobalPrayerTotal());
      } catch (err) {
        console.error(err);
      }
    };

    loadTotal();

    const channel = supabase
      .channel("global-prayer-total")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "PrayerSessions",
        },
        loadTotal,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <View style={sharedStyles.slide}>
      <View style={styles.content}>
        <FadeIn delay={80} isVisible={isActive}>
          <Image
            source={require("../../../../assets/globe_prayer.png")}
            style={[styles.worldMap, { height: mapHeight }]}
            resizeMode="contain"
          />
        </FadeIn>
        <FadeIn delay={400} isVisible={isActive}>
          <Text style={styles.title}>{title}</Text>
        </FadeIn>
        <FadeIn delay={500} isVisible={isActive}>
          <SectionHeader />
        </FadeIn>
        <FadeIn delay={600} isVisible={isActive}>
          <Text style={styles.desc}>{description}</Text>
        </FadeIn>
        <FadeIn delay={800} isVisible={isActive} style={{ width: "100%" }}>
          <View style={styles.counterCard}>
            <Text style={styles.counterNumber}>
              {totalPrayers.toLocaleString()}
            </Text>
            <Text style={styles.counterLabel}>prayers said today.</Text>
            <Text style={styles.counterTagline}>One prayer. One Church.</Text>
          </View>
        </FadeIn>
      </View>
      <View style={sharedStyles.navArea}>
        <FadeIn delay={1000} isVisible={isActive} style={sharedStyles.ctaWrap}>
          <TouchableOpacity
            onPress={onNext}
            style={[sharedStyles.primaryBtn, { backgroundColor: BLUE }]}
          >
            <Text style={[sharedStyles.primaryText, { color: IVORY }]}>
              Continue
            </Text>
          </TouchableOpacity>
        </FadeIn>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingTop: 30,
    gap: 14,
  },
  worldMap: {
    width: width * 0.78,
    maxWidth: 230,
    marginBottom: -50,
  },
  title: {
    fontFamily: FONT_BODY_SEMIBOLD,
    fontSize: width < 375 ? 30 : 40,
    color: BLUE,
    textAlign: "center",
    letterSpacing: 0.3,
    lineHeight: 40,
    fontWeight: "400",
  },
  desc: {
    fontFamily: FONT_BODY,
    color: "#6F8FAF",
    textAlign: "center",
    fontSize: 20,
    lineHeight: 23,
    paddingHorizontal: 4,
  },
  counterCard: {
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 28,
    alignItems: "center",
    width: "100%",
    backgroundColor: "#FFFAF2",
    borderColor: "#E7DCCB",
    borderWidth: 1,
    shadowColor: "#3B2E22",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  counterNumber: {
    fontFamily: FONT_TITLE_BOLD,
    fontSize: width < 375 ? 36 : 42,
    color: GOLD,
    letterSpacing: 0.5,
    marginBottom: 2,
    fontWeight: "600",
  },
  counterLabel: {
    fontFamily: FONT_BODY_SEMIBOLD,
    fontSize: 20,
    color: TEXT_SECONDARY,
    marginBottom: 4,
    fontWeight: "500",
  },
  counterTagline: {
    fontFamily: FONT_TITLE_ITALIC,
    fontSize: 13,
    color: "#6F8FAF",
    letterSpacing: 0.3,
  },
});
