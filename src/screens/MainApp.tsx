import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  StatusBar,
  Dimensions,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import NetInfo from "@react-native-community/netinfo";

import { getPrayerStatus, PrayerStatus } from "../utils/prayer";

import { completePrayer, getGlobalCount, startPrayer } from "../api/prayerApi";

import { supabase } from "../lib/supabaseClient";
import AppHeader from "../../components/Header";
import { getAngelusMode, AngelusMode } from "../services/notificationService";
import {
  loadOfflineSessions,
  saveOfflineSessions,
} from "../storage/offlineStorage";
import React from "react";
import {
  format12Hour,
  getDailyVerse,
  getNextPrayerForMode,
  getPrayerDay,
  hourToSlotKey,
  slotToKey,
} from "../utils/prayerHelpers";
import { isOnline } from "../storage/offlineSync";
import OfflineBanner from "../../components/OfflineBanner";
import SyncBanner from "../../components/SyncBanner";
import { syncOfflinePrayers } from "../../services/syncOfflinePrayers";
import { getUserTimezone } from "../utils/timezone";

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
  Morning: require("../../assets/Morning.png"),
  Noon: require("../../assets/Noon.png"),
  Evening: require("../../assets/Evening.png"),
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

export default function MainApp() {
  const timezone = useMemo(() => getUserTimezone(), []);
  const [isOffline, setIsOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const [angelusMode, setAngelusMode] = useState<AngelusMode>("all_three");
  const [fontsLoaded] = useFonts({
    CormorantGaramond: require("../../assets/fonts/CormorantGaramond.ttf"),
    EBGaramond: require("../../assets/fonts/EBGaramond.ttf"),
    Cormorant: require("../../assets/fonts/Cormorant.ttf"),
    Inter: require("../../assets/fonts/Inter.ttf"),
    CormorantGaramondItalic: require("../../assets/fonts/CormorantGaramond-Italic.ttf"),
  });

  const [todayKey, setTodayKey] = useState(new Date().toDateString());

  const navigation = useNavigation<any>();

  const [timeLeft, setTimeLeft] = useState("00:00:00");

  const [session, setSession] = useState<any>(null);

  const [userId, setUserId] = useState("");

  const [username, setUsername] = useState("");
  const [prayersLoading, setPrayersLoading] = useState(true);
  const hasLoadedPrayers = useRef(false);
  const [prayerLoadError, setPrayerLoadError] = useState(false);

  const [completedPrayers, setCompletedPrayers] = useState({
    morning: false,
    noon: false,
    evening: false,
  });
  const [currentPrayer, setCurrentPrayer] = useState(() =>
    getNextPrayerForMode(angelusMode),
  );

  const refreshPendingSyncCount = useCallback(async () => {
    const sessions = await loadOfflineSessions();

    setPendingSyncCount(
      sessions.filter((s) => s.completed && !s.synced).length,
    );
  }, []);

  useEffect(() => {
    refreshPendingSyncCount();
  }, [refreshPendingSyncCount]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && state.isInternetReachable !== false;

      setIsOffline(!online);

      refreshPendingSyncCount();

      if (online && userId) {
        setIsSyncing(true);

        setTimeout(async () => {
          try {
            await syncOfflinePrayers(userId);

            await fetchTodayPrayers(userId);
            await refreshGlobalStats();
            await refreshPendingSyncCount();

            setTimeout(async () => {
              await fetchTodayPrayers(userId);
              await refreshGlobalStats();
            }, 1500);
          } finally {
            setIsSyncing(false);
          }
        }, 1000);
      }
    });

    return () => unsubscribe();
  }, [userId, refreshPendingSyncCount]);
  useEffect(() => {
    setCurrentPrayer(getNextPrayerForMode(angelusMode));
  }, [angelusMode]);
  const triggeredToday = useRef<Map<number, string>>(new Map());
  const dailyVerse = useMemo(() => getDailyVerse(), [todayKey]);
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchingRef = useRef(false);
  useEffect(() => {
    const id = setInterval(() => {
      const hour = new Date().getHours();

      setCurrentHour((prev) => (prev === hour ? prev : hour));
    }, 60000);

    return () => clearInterval(id);
  }, []);

  const [globalStats, setGlobalStats] = useState({
    total: 0,
    morning: 0,
    noon: 0,
    evening: 0,
  });
  const greeting = useMemo(() => {
    if (currentHour < 12) return "Morning";
    if (currentHour < 18) return "Afternoon";
    return "Evening";
  }, [currentHour]);
  // ── Fetch today's completed prayers from DB ───────────────────────────────
  const fetchTodayPrayers = useCallback(async (uid: string) => {
    if (fetchingRef.current) {
      console.log("Skipped duplicate fetch");
      return;
    }

    fetchingRef.current = true;

    try {
      setPrayerLoadError(false);

      const sessions = await loadOfflineSessions();

      const prayerDay = getPrayerDay();

      const updated = {
        morning: false,
        noon: false,
        evening: false,
      };

      // Load local offline completions first
      sessions.forEach((session) => {
        if (!session.completed) return;
        if (!session.slot.startsWith(prayerDay)) return;

        const key = slotToKey(session.slot);

        if (key) {
          updated[key] = true;
        }
      });

      // If offline, stop here
      if (!(await isOnline())) {
        setCompletedPrayers(updated);
        setPrayerLoadError(true);
        return;
      }

      // Online: merge Supabase results
      const { data } = await supabase
        .from("PrayerSessions")
        .select("Slot,Completed")
        .eq("UserId", uid)
        .like("Slot", `${prayerDay}_%`);

      data?.forEach((s) => {
        if (!s.Completed) return;

        const key = slotToKey(s.Slot);

        if (key) {
          updated[key] = true;
        }
      });

      setCompletedPrayers(updated);
    } catch (err) {
      console.error("fetchTodayPrayers error:", err);
      setPrayerLoadError(true);
    } finally {
      fetchingRef.current = false;

      if (!hasLoadedPrayers.current) {
        hasLoadedPrayers.current = true;
        setPrayersLoading(false);
      }
    }
  }, []);
  async function getGlobalPrayerStats() {
    const prayerDay = getPrayerDay();

    const { data, error } = await supabase
      .from("PrayerSessions")
      .select("Slot")
      .eq("Completed", true)
      .like("Slot", `${prayerDay}_%`);

    if (error) throw error;

    const stats = {
      total: 0,
      morning: 0,
      noon: 0,
      evening: 0,
    };

    data?.forEach((row) => {
      stats.total++;

      if (row.Slot.endsWith("_6")) stats.morning++;
      else if (row.Slot.endsWith("_12")) stats.noon++;
      else if (row.Slot.endsWith("_18")) stats.evening++;
    });

    return stats;
  }

  useEffect(() => {
    const channel = supabase
      .channel("global-prayer-stats")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "PrayerSessions",
        },
        async () => {
          queueRefresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const refreshGlobalStats = useCallback(async () => {
    try {
      const stats = await getGlobalPrayerStats();
      setGlobalStats(stats);
    } catch {
      // Keep previous stats while offline
    }
  }, []);

  const refreshTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (refreshTimeout.current) {
        clearTimeout(refreshTimeout.current);
      }
    };
  }, []);

  const queueRefresh = useCallback(() => {
    if (refreshTimeout.current) {
      clearTimeout(refreshTimeout.current);
    }

    refreshTimeout.current = setTimeout(() => {
      refreshGlobalStats();
    }, 500);
  }, [refreshGlobalStats]);

  useEffect(() => {
    const id = setInterval(async () => {
      const newKey = new Date().toDateString();

      if (newKey !== todayKey) {
        setTodayKey(newKey);

        if (newKey !== todayKey) {
          setTodayKey(newKey);

          setCompletedPrayers({
            morning: false,
            noon: false,
            evening: false,
          });

          await saveOfflineSessions([]);

          if (userId) {
            await fetchTodayPrayers(userId);
          }
        }

        queueRefresh();
      }
    }, 60000);

    return () => clearInterval(id);
  }, [todayKey, userId, fetchTodayPrayers, queueRefresh]);

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

        // Show offline data immediately.
        await fetchTodayPrayers(uid);

        // Refresh global stats.
        await refreshGlobalStats();
        queueRefresh();

        // Sync in the background.
        syncOfflinePrayers(uid).then(async () => {
          await fetchTodayPrayers(uid);
          await refreshGlobalStats();
        });

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

        const sess = await startPrayer(uid, timezone);
        setSession(sess);
        await queueRefresh();
        try {
          await getGlobalCount(sess.slot);
        } catch {
          // offline
        }
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
                await getGlobalCount(sess.slot);
              } catch {
              } finally {
              }
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

    if (hour < 12) return "Noon";
    if (hour < 18) return "Evening";
    return "Morning";
  }, [currentHour]);

  const globalPrayerSlides = useMemo(
    () => [
      {
        label: "Morning Angelus",
        count: globalStats.morning,
      },
      {
        label: "Noon Angelus",
        count: globalStats.noon,
      },
      {
        label: "Evening Angelus",
        count: globalStats.evening,
      },
    ],
    [globalStats],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setGlobalSlide((prev) => (prev + 1) % globalPrayerSlides.length);

        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [globalPrayerSlides.length]);

  const [globalSlide, setGlobalSlide] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const check = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const date = now.toDateString();

      const allowedHours = angelusMode === "noon_only" ? [12] : [6, 12, 18];

      const isPrayerHour = allowedHours.includes(h);
      if (!isPrayerHour || m !== 0) return;

      const alreadyFired = triggeredToday.current.get(h);
      if (alreadyFired === date) return;
      triggeredToday.current.set(h, date);

      const slotKey = hourToSlotKey(h);

      timeoutRef.current = setTimeout(async () => {
        let freshSession = session;
        if (userId) {
          try {
            freshSession = await startPrayer(userId, timezone);
            setSession(freshSession);
          } catch {}
        }

        navigation.navigate("Prayer", {
          autoPlay: true,
          onComplete: async () => {
            try {
              if (!freshSession || !userId) return;
              await completePrayer(userId, freshSession.sessionId);
              await refreshPendingSyncCount();
              await queueRefresh();
              try {
                await getGlobalCount(freshSession.slot);
              } catch {
                // offline
              }
              setCompletedPrayers((prev) => ({ ...prev, [slotKey]: true }));
            } catch (err) {
              console.error("Auto-trigger complete error:", err);
            }
          },
        });
      }, 7000);
    };

    const id = setInterval(check, 15000);
    return () => {
      clearInterval(id);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [
    session,
    userId,
    navigation,
    angelusMode,
    timezone,
    refreshPendingSyncCount,
    queueRefresh,
  ]);

  // ─────────────────────────────────────────────────────────────
  // COMPLETE PRAYER
  // ─────────────────────────────────────────────────────────────

  const handleComplete = useCallback(async () => {
    if (!session || !userId) return;

    navigation.navigate("Prayer", {
      autoPlay: true,
      onComplete: async () => {
        try {
          await completePrayer(userId, session.sessionId);
          await refreshPendingSyncCount();
          queueRefresh();

          try {
            await getGlobalCount(session.slot);
          } catch {}

          const key = slotToKey(session.slot);

          if (key) {
            setCompletedPrayers((prev) => ({
              ...prev,
              [key]: true,
            }));
          }
        } catch (err) {
          console.error(err);
        }
      },
    });
  }, [session, userId, navigation, queueRefresh]);

  // ─────────────────────────────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────────────────────────────

  const morningStatus = prayersLoading
    ? "loading"
    : angelusMode === "noon_only"
      ? "disabled"
      : getPrayerStatus("morning", completedPrayers.morning);

  const noonStatus = prayersLoading
    ? "loading"
    : getPrayerStatus("noon", completedPrayers.noon);

  const eveningStatus = prayersLoading
    ? "loading"
    : angelusMode === "noon_only"
      ? "disabled"
      : getPrayerStatus("evening", completedPrayers.evening);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      const refresh = async () => {
        const newKey = new Date().toDateString();

        if (newKey !== todayKey) {
          setTodayKey(newKey);

          await saveOfflineSessions([]);

          setCompletedPrayers({
            morning: false,
            noon: false,
            evening: false,
          });
        }

        const mode = await getAngelusMode();

        if (mounted) {
          setAngelusMode(mode);
        }

        if (userId) {
          await fetchTodayPrayers(userId);
          await refreshGlobalStats();
          await refreshPendingSyncCount();
        }

        queueRefresh();
      };

      refresh();

      return () => {
        mounted = false;
      };
    }, [
      todayKey,
      userId,
      fetchTodayPrayers,
      refreshGlobalStats,
      refreshPendingSyncCount,
      queueRefresh,
    ]),
  );

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <StatusBar hidden />
      <View style={styles.container}>
        {/* HEADER */}
        <AppHeader />
        <OfflineBanner
          visible={isOffline}
          message="You're offline. Your prayer will be saved and synced when you're back online."
        />
        <SyncBanner visible={isSyncing} pendingCount={pendingSyncCount} />
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
                source={require("../../assets/Divider.png")}
                style={styles.cardDivider}
                resizeMode="contain"
              />
              <View style={styles.timeRow}>
                <Ionicons name="time-outline" size={25} color={COLORS.gold} />

                <Text style={styles.timeText}>in {timeLeft}</Text>
              </View>
            </View>
          </View>

          {/* DAILY PROGRESS */}

          <View style={styles.sectionHeader}>
            <Image
              source={require("../../assets/DividerLeft.png")}
              style={styles.dividerHalf}
              resizeMode="stretch"
            />

            <Text
              style={styles.sectionHeaderText}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              DAILY PRAYER RHYTHM
            </Text>
            <Image
              source={require("../../assets/DividerRight.png")}
              style={styles.dividerHalf}
              resizeMode="stretch"
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
                source={require("../../assets/Global.png")}
                style={styles.globeIcon}
              />
            </View>
            <View style={[styles.globalRight]}>
              <View>
                <Text style={styles.globalLabel}>GLOBAL PRAYER TODAY</Text>

                <Animated.View style={{ opacity: fadeAnim }}>
                  <View style={styles.globalCountRow}>
                    <Text style={styles.hourCount}>
                      {globalPrayerSlides[globalSlide].count.toLocaleString()}
                    </Text>

                    <View style={styles.globalTextContainer}>
                      <Text style={styles.globalPrayedToday}>
                        {globalPrayerSlides[globalSlide].count === 1
                          ? "person prayed the"
                          : "people prayed the"}
                      </Text>

                      <Text style={styles.globalPrayedToday}>
                        {globalPrayerSlides[globalSlide].label}
                      </Text>
                    </View>
                  </View>
                </Animated.View>
                <View style={styles.carouselDots}>
                  {globalPrayerSlides.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.dot,
                        index === globalSlide && styles.activeDot,
                      ]}
                    />
                  ))}
                </View>
                <View style={styles.barDivider} />

                <View style={styles.globalCountRow}>
                  <Text style={styles.globalCount}>
                    {globalStats.total.toLocaleString()}
                  </Text>
                  <View style={styles.globalTextContainer}>
                    <Text style={styles.globalText}>prayers offered</Text>
                    <Text style={styles.globalText}>Worldwide</Text>
                  </View>
                </View>
                <Text style={styles.globalText}>
                  United in Prayer around the World
                </Text>
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
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </>
  );
}
// ─── ProgressCard ─────────────────────────────────────────────────────────────
const ProgressCard = React.memo(function ProgressCard({
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
  const isLoading = status === "loading";

  const prayerImage = useMemo(() => {
    if (isLoading) {
      return progressImages[title];
    }

    return isCompleted ? completeImages[title] : progressImages[title];
  }, [isLoading, isCompleted, title]);

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
          : isLoading
            ? {
                text: "Loading...",
                icon: "ellipsis-horizontal-circle",
                iconColor: COLORS.muted,
                bg: "#F8F6F2",
                border: "#E7DCCB",
                textColor: COLORS.muted,
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
    let animation: Animated.CompositeAnimation | undefined;

    if (isActive) {
      animation = Animated.loop(
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
      );

      animation.start();
    } else {
      pulse.stopAnimation();
      pulse.setValue(1);
    }

    return () => {
      animation?.stop();
    };
  }, [isActive, pulse]);

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
            source={prayerImage}
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
});
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
    paddingTop: 5,
  },
  greetingTitle: {
    fontSize: 24,
    color: COLORS.textPrimary,
    fontWeight: "600",
    fontFamily: "Cormorant",
  },
  greetingSubtitle: {
    fontSize: 20,
    color: COLORS.navy,
    fontFamily: "Cormorant",
  },
  mainCard: {
    minHeight: 154,
    marginHorizontal: 24,
    marginTop: 5,
    backgroundColor: COLORS.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 2,
    flexDirection: "row",
    shadowColor: "#3B2E22",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  cardImage: {
    width: IMAGE_WIDTH,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  cardContent: { flex: 1, justifyContent: "center" },
  cardLabel: {
    color: COLORS.gold,
    letterSpacing: 2,
    fontSize: 11,
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
    width: "95%",
    marginVertical: 5,
    marginRight: 5,
  },
  timeRow: { flexDirection: "row", alignItems: "center" },
  timeText: {
    marginLeft: 6,
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.navy,
    fontFamily: "EBGaramond",
  },
  cardTime: {
    marginTop: 5,
    color: "#6F440A",
    fontSize: 20,
    fontWeight: "600",
    fontFamily: "Cormorant",
  },
  dividerHalf: {
    flex: 1,
    height: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 10,
  },

  sectionHeaderText: {
    flexShrink: 0,
    marginHorizontal: 10,
    color: COLORS.navy,
    fontSize: 12,
    fontFamily: "Inter",
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 2,
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
    paddingVertical: 8,
    paddingHorizontal: 8,
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
  progressIcon: {
    width: 55,
    height: 55,
    borderRadius: 29,
    backgroundColor: "#F3EFE7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
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
  progressSubtitle: {
    fontSize: width < 390 ? 11 : 12,
    color: COLORS.textSecondary,
    fontFamily: "Cormorant",
  },
  progressImage: {
    width: 68,
    height: 68,
  },
  globalCard: {
    marginHorizontal: 24,
    marginTop: 5,
    backgroundColor: COLORS.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    shadowColor: "#3B2E22",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  globe: {
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
    alignSelf: "center",
  },
  globeIcon: { width: 130, height: 130 },
  globalRight: { flex: 1, justifyContent: "center" },
  globalLabel: {
    color: COLORS.navy,
    fontSize: 12,
    fontFamily: "Inter",
    fontWeight: 500,
    marginBottom: 2,
    letterSpacing: 2,
  },
  globalCountRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  hourCount: {
    fontSize: 30,
    color: COLORS.navy,
    fontWeight: "600",
    fontFamily: "EBGaramond",
  },
  globalCount: {
    fontSize: 36,
    color: COLORS.gold,
    fontWeight: "700",
    fontFamily: "EBGaramond",
  },
  globalPrayedToday: {
    fontSize: 13,
    lineHeight: 14,
    color: COLORS.textSecondary,
    fontFamily: "Cormorant",
  },
  globalText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: "Cormorant",
  },
  globalTextContainer: {
    marginLeft: 6,
    justifyContent: "center",
  },
  globalDivider: {
    width: "100%",
    height: 20,
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
    marginTop: 5,
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
  prayerBreakdownRow: {
    paddingTop: 8,
    paddingBottom: 2,
  },

  prayerChip: {
    minWidth: 95,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#FFF7E7",
    borderWidth: 1,
    borderColor: "#E7DCCB",
    marginRight: 10,
    alignItems: "center",
  },

  prayerChipTime: {
    fontSize: 11,
    color: COLORS.gold,
    fontFamily: "Inter",
  },

  prayerChipTitle: {
    fontSize: 14,
    color: COLORS.navy,
    fontFamily: "Cormorant",
  },

  prayerChipCount: {
    fontSize: 20,
    color: COLORS.navy,
    fontFamily: "EBGaramond",
  },
  connectionBanner: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFF1F1",
  },

  connectionText: {
    marginLeft: 6,
    fontSize: 12,
    color: "#A44E4E",
  },
  barDivider: {
    alignSelf: "stretch",
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 2,
  },

  carouselDots: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 2,
    marginBottom: 2,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D6CDBF",
    marginHorizontal: 4,
  },

  activeDot: {
    width: 18,
    backgroundColor: COLORS.gold,
  },
});
