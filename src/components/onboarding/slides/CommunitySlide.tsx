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
import { OnboardingCard } from "./SectionCard";

const NAVY_DARK = "#16264A";

type Props = {
  title: string;
  description: string;
  isActive: boolean;
  onNext: () => void;
  dotCount?: number;
  activeDotIndex?: number;
};

export function CommunitySlide({
  title,
  description,
  isActive,
  onNext,
  dotCount = 5,
  activeDotIndex = 3,
}: Props) {
  function getPrayerDay() {
    const now = new Date();

    if (now.getHours() < 6) {
      now.setDate(now.getDate() - 1);
    }

    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(now.getDate()).padStart(2, "0")}`;
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

  const mapHeight = height < 700 ? height * 0.3 : height * 0.34;

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
        {/* Globe + live prayer count */}
        <FadeIn delay={80} isVisible={isActive} style={styles.artworkFade}>
          <View style={styles.artworkWrap}>
            <Image
              source={require("../../../../assets/globe_prayer.png")}
              style={[styles.worldMap, { height: mapHeight }]}
              resizeMode="contain"
            />

            <View style={styles.counterCard}>
              <Text style={styles.counterNumber}>
                {totalPrayers.toLocaleString()}
              </Text>

              <Text style={styles.counterLabel}>prayed today.</Text>

              <Text style={styles.counterTagline}>One prayer. One Church.</Text>
            </View>
          </View>
        </FadeIn>

        <OnboardingCard
          title={title}
          description={description}
          isActive={isActive}
          onNext={onNext}
          activeDotIndex={activeDotIndex}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 30,
    gap: 12,
  },

  artworkFade: {
    width: "100%",
    alignItems: "center",
  },

  artworkWrap: {
    width: "100%",
    alignItems: "center",
    marginBottom: 8,
  },

  worldMap: {
    width: width * 0.95,
    maxWidth: 360,
    marginTop: 24,
  },

  counterCard: {
    marginTop: -24,
    width: "100%",
    backgroundColor: "#F5F2E7",
    borderRadius: 18,
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 28,
    alignItems: "center",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
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

  title: {
    fontFamily: FONT_BODY_SEMIBOLD,
    fontSize: width < 375 ? 30 : 40,
    color: BLUE,
    textAlign: "center",
    letterSpacing: 0.3,
    lineHeight: 40,
    fontWeight: "400",
  },

  ornamentRow: {
    flexDirection: "row",
    alignItems: "center",
    width: 130,
  },

  ornamentLine: {
    flex: 1,
    height: 1,
    backgroundColor: GOLD,
    opacity: 0.6,
  },

  ornamentMark: {
    color: GOLD,
    fontSize: 14,
    marginHorizontal: 8,
  },

  desc: {
    fontFamily: FONT_BODY,
    color: "#6F8FAF",
    textAlign: "center",
    fontSize: 20,
    lineHeight: 23,
    paddingHorizontal: 4,
  },

  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  dot: {
    borderRadius: 5,
    marginHorizontal: 4,
  },

  dotActive: {
    width: 9,
    height: 9,
    backgroundColor: BLUE,
  },

  dotInactive: {
    width: 7,
    height: 7,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#D9DCE3",
  },
});
