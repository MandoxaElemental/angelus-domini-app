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
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

import { getNextPrayer, getPrayerStatus, PrayerStatus } from "../utils/prayer";
import { completePrayer, getGlobalCount, startPrayer } from "../api/prayerApi";
import { supabase, safeRefreshSession } from "../lib/supabaseClient";
import AppHeader from "../../components/Header";
import {
  getAngelusMode,
  AngelusMode,
  requestNotificationPermission,
} from "../services/notificationService";
import {
  getLocalSlotSyncStatusForUser,
  getPendingSyncCount,
  isOnline,
} from "../services/offlineSync";

const { width } = Dimensions.get("window");
const isSmallScreen = width < 390;
const IMAGE_WIDTH = Math.min(width * 0.3, 140);

// Cached the moment we successfully authenticate. Lets MainApp render a
// fully working offline experience (correct userId, local prayer cache,
// startPrayer/completePrayer) WITHOUT ever touching Supabase's network
// auth calls when there's no connection — those calls (refreshSession /
// getSession) can hang or fail unpredictably offline, and previously that
// left the whole screen stuck on "Loading..." forever.
const CACHED_USER_ID_KEY = "angelus_cached_user_id";

// Races a promise against a timeout so a slow/hanging network call can
// never block the UI indefinitely — resolves to null if the timeout wins.
function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T | null> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}
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

function format12Hour(date: Date): string {
  let h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function getCurrentPrayerWindow() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) {
    return { key: "morning", label: "Morning Angelus", start: "6:00 AM", end: "11:59 AM" };
  }
  if (hour >= 12 && hour < 18) {
    return { key: "noon", label: "Noon Angelus", start: "12:00 PM", end: "5:59 PM" };
  }
  return { key: "evening", label: "Evening Angelus", start: "6:00 PM", end: "5:59 AM" };
}

function getPrayerDay() {
  const now = new Date();
  if (now.getHours() < 6) {
    now.setDate(now.getDate() - 1);
  }
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getNextPrayerForMode(mode: AngelusMode) {
  if (mode !== "noon_only") {
    return getNextPrayer();
  }
  const now = new Date();
  const nextNoon = new Date(now);
  nextNoon.setHours(12, 0, 0, 0);
  if (now >= nextNoon) {
    nextNoon.setDate(nextNoon.getDate() + 1);
  }
  return { title: "Noon Angelus", icon: "Noon", time: nextNoon };
}

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

const CAROUSEL_SLOTS = [
  { key: "morning" as const, label: "Morning Angelus" },
  { key: "noon" as const, label: "Noon Angelus" },
  { key: "evening" as const, label: "Evening Angelus" },
];

const NOTIF_ASKED_KEY = "notification_permission_asked";

export default function MainApp() {
  const [angelusMode, setAngelusMode] = useState<AngelusMode>("all_three");

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        const mode = await getAngelusMode();
        if (mounted) setAngelusMode(mode);
      })();
      return () => { mounted = false; };
    }, []),
  );

  const [todayKey, setTodayKey] = useState(new Date().toDateString());
  const navigation = useNavigation<any>();
  const [timeLeft, setTimeLeft] = useState("00:00:00");
  const [session, setSession] = useState<any>(null);
  const [count, setCount] = useState(0);
  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");
  const [prayersLoading, setPrayersLoading] = useState(true);
  const [prayerLoadError, setPrayerLoadError] = useState(false);
  const [completedPrayers, setCompletedPrayers] = useState({
    morning: false,
    noon: false,
    evening: false,
  });
  // Completed locally but not yet confirmed on Supabase — shown as
  // "Loading" instead of "Completed" until the background sync clears it.
  const [pendingCompletionSlots, setPendingCompletionSlots] = useState({
    morning: false,
    noon: false,
    evening: false,
  });
  const [currentPrayer, setCurrentPrayer] = useState(() =>
    getNextPrayerForMode(angelusMode),
  );

  // ── Offline sync status (fully automatic — no manual tap needed) ─────────
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const prevPendingSyncCountRef = useRef(0);

  // ── Live connectivity state — masks Daily Prayer Progress with "Loading"
  // while offline, instead of leaving stale statuses on screen. Same
  // NetInfo pattern App.tsx already uses for its offline banner.
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let mounted = true;

    NetInfo.fetch().then((state) => {
      if (!mounted) return;
      setIsOffline(!(state.isConnected && state.isInternetReachable !== false));
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!(state.isConnected && state.isInternetReachable !== false));
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    setCurrentPrayer(getNextPrayerForMode(angelusMode));
  }, [angelusMode]);

  const triggeredToday = useRef<Map<number, string>>(new Map());
  const dailyVerse = useMemo(() => getDailyVerse(), [todayKey]);
  const [currentHour, setCurrentHour] = useState(new Date().getHours());

  useEffect(() => {
    const id = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000);
    return () => clearInterval(id);
  }, []);

  const [globalStats, setGlobalStats] = useState({
    total: 0,
    morning: 0,
    noon: 0,
    evening: 0,
  });

  // Dedup guard for the Global Prayer Today realtime feed — prevents the
  // same completion from being counted twice if Supabase redelivers an
  // event (e.g. after a brief reconnect).
  const countedSessionIds = useRef<Set<string>>(new Set());

  // Carousel state for the Global Prayer Today card (auto-cycles slots)
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const id = setInterval(() => {
      Animated.timing(carouselAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setCarouselIndex((prev) => (prev + 1) % CAROUSEL_SLOTS.length);
        Animated.timing(carouselAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 3000);
    return () => clearInterval(id);
  }, [carouselAnim]);

  // ── Midnight timer ref ────────────────────────────────────────────────────
  const midnightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentWindow = getCurrentPrayerWindow();
  const currentCount = globalStats[currentWindow.key as keyof typeof globalStats];
  const greeting = currentHour < 12 ? "Morning" : currentHour < 18 ? "Afternoon" : "Evening";

  // ── Fetch today's completed prayers ──────────────────────────────────────
  // Offline-first: merges local (possibly unsynced) completions with the
  // Supabase read, so a prayer completed while offline shows "Completed"
  // immediately instead of waiting on network/sync.
  const fetchTodayPrayers = useCallback(async (uid: string) => {
    const prayerDay = getPrayerDay();
    try {
      setPrayerLoadError(false);
      setPrayersLoading(true);

      const localSyncStatus = await getLocalSlotSyncStatusForUser(uid, prayerDay);

      // ← ADDED: wrapped in withTimeout (same pattern as the auth waterfall
      // below) so a hung/slow network read can never block the caller.
      // completePrayer()'s onComplete awaits this whole function, and
      // PrayerScreen awaits onComplete() before showing "Return Home" — so
      // an un-timed-out .select() here was silently delaying/blocking that
      // modal while offline. Online behavior is unchanged: the real call
      // still resolves in well under the timeout, so `result` is identical
      // to what supabase.from(...).select(...) would have returned anyway.
      const result = await withTimeout(
        supabase
          .from("PrayerSessions")
          .select("Slot, Completed")
          .eq("UserId", uid)
          .like("Slot", `${prayerDay}_%`),
        4000,
      );
      const data = result?.data;
      const error = result?.error;

      // Only treat this as a hard error if we ALSO have nothing locally to
      // fall back on — e.g. fully offline (or timed out) with a completed
      // prayer queued should still render something sensible, not an error
      // banner.
      // ← ADDED: `!result` (timeout) is treated the same as a Supabase error.
      if ((error || !result) && Object.keys(localSyncStatus).length === 0) {
        throw error ?? new Error("fetchTodayPrayers timed out (offline?)");
      }

      const updated = { morning: false, noon: false, evening: false };
      const pending = { morning: false, noon: false, evening: false };

      data?.forEach((s: any) => {
        if (!s.Completed) return;
        const key = slotToKey(s.Slot);
        if (key) updated[key] = true;
      });

      // Merge in local completions by their SYNCED state: a synced local
      // completion confirms "Completed". An unsynced one (completed here,
      // not yet reached Supabase — i.e. still offline or waiting on the
      // background sync) is marked "pending" instead, which the UI shows
      // as "Loading" rather than jumping straight to "Completed".
      Object.entries(localSyncStatus).forEach(([slot, synced]) => {
        const key = slotToKey(slot);
        if (!key) return;
        if (synced) {
          updated[key] = true;
        } else {
          pending[key] = true;
        }
      });

      setCompletedPrayers(updated);
      setPendingCompletionSlots(pending);
    } catch (err) {
      console.error("fetchTodayPrayers error:", err);
      try {
        const localSyncStatus = await getLocalSlotSyncStatusForUser(uid, prayerDay);
        if (Object.keys(localSyncStatus).length > 0) {
          setCompletedPrayers((prev) => {
            const merged = { ...prev };
            Object.entries(localSyncStatus).forEach(([slot, synced]) => {
              const key = slotToKey(slot);
              if (key && synced) merged[key] = true;
            });
            return merged;
          });
          setPendingCompletionSlots((prev) => {
            const merged = { ...prev };
            Object.entries(localSyncStatus).forEach(([slot, synced]) => {
              const key = slotToKey(slot);
              if (key) merged[key] = !synced;
            });
            return merged;
          });
          setPrayerLoadError(false);
        } else {
          setPrayerLoadError(true);
        }
      } catch {
        setPrayerLoadError(true);
      }
    } finally {
      // CRITICAL: this MUST always run, online or offline, success or
      // failure — it's the only thing that clears "Loading...". Nothing
      // upstream of this function is allowed to throw past it uncaught.
      setPrayersLoading(false);
    }
  }, []);

  // ── Pending offline-sync count — fully automatic ──────────────────────────
  // Actual syncing happens entirely in the background (startAutoSync() in
  // App.tsx — runs on mount, on every NetInfo reconnect, and every 20s).
  // This effect only WATCHES the pending count to drive the status pill
  // below, and refreshes prayer statuses the moment a background sync
  // finishes (count goes from >0 to 0) — no user tap required.
  useEffect(() => {
    if (!userId) return;
    const check = async () => {
      const c = await getPendingSyncCount(userId);
      if (prevPendingSyncCountRef.current > 0 && c === 0) {
        // Background auto-sync just cleared the queue — refresh so
        // "Completed" reflects the newly-synced state.
        await fetchTodayPrayers(userId);
      }
      prevPendingSyncCountRef.current = c;
      setPendingSyncCount(c);
    };
    check();
    const id = setInterval(check, 5000);

    // FIX: offlineSync.ts already reacts to reconnect instantly and kicks
    // off the actual background sync the moment connectivity returns —
    // but this screen was only finding out about it on the next 5s poll
    // tick, so "back online" felt delayed even though the sync itself
    // wasn't. Watching NetInfo here too means the pending pill / Completed
    // status catch up within ~1s of reconnecting instead of waiting on
    // the poll. Checked twice (800ms, then 2000ms after reconnect) since
    // the sync's own network round-trip needs a brief moment to land —
    // the interval above still runs underneath as a fallback either way.
    const netInfoUnsub = NetInfo.addEventListener((state) => {
      const nowOnline = state.isConnected && state.isInternetReachable !== false;
      if (nowOnline) {
        setTimeout(check, 800);
        setTimeout(check, 2000);
      }
    });

    return () => {
      clearInterval(id);
      netInfoUnsub();
    };
  }, [userId, fetchTodayPrayers]);

  // ── Global (all-users) prayer stats for today ────────────────────────────
  // Preferred path: a Postgres RPC (`get_global_prayer_stats`) that runs with
  // SECURITY DEFINER so it aggregates across every user's rows regardless of
  // RLS on PrayerSessions. Falls back to a direct table query if the RPC
  // hasn't been created yet (only accurate if RLS allows reading all rows).
  // See the accompanying SQL for the RPC definition.
  async function getGlobalPrayerStats() {
    const prayerDay = getPrayerDay();

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "get_global_prayer_stats",
      { prayer_day: prayerDay },
    );

    if (!rpcError) {
      const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      return {
        total: Number(row?.total) || 0,
        morning: Number(row?.morning) || 0,
        noon: Number(row?.noon) || 0,
        evening: Number(row?.evening) || 0,
      };
    }

    // Fallback (only correct if RLS permits selecting all users' rows)
    const { data, error } = await supabase
      .from("PrayerSessions")
      .select("Slot")
      .eq("Completed", true)
      .like("Slot", `${prayerDay}_%`);
    if (error) throw error;
    const stats = { total: 0, morning: 0, noon: 0, evening: 0 };
    data?.forEach((row) => {
      stats.total++;
      if (row.Slot.endsWith("_6")) stats.morning++;
      else if (row.Slot.endsWith("_12")) stats.noon++;
      else if (row.Slot.endsWith("_18")) stats.evening++;
    });
    return stats;
  }

  const refreshGlobalStats = useCallback(async () => {
    try {
      const stats = await getGlobalPrayerStats();
      setGlobalStats(stats);
    } catch (err) {
      console.error("refreshGlobalStats error:", err);
    }
  }, []);

  // Real-time global stats: apply INSTANT deltas from the Realtime feed the
  // moment a prayer is completed anywhere in the world, instead of waiting
  // on a full RPC round-trip. A short poll still runs underneath as a
  // reconciliation safety net (covers dropped events, RLS edge cases, etc.)
  // but the visible counter no longer depends on it for "instant" updates.
  useEffect(() => {
    refreshGlobalStats();

    const channel = supabase
      .channel("global-prayer-stats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "PrayerSessions" },
        (payload) => {
          const row: any = payload.new;
          if (!row?.Completed) return;

          // Only count rows that belong to *today's* prayer day.
          const prayerDay = getPrayerDay();
          if (!row.Slot || !row.Slot.startsWith(`${prayerDay}_`)) return;

          // Skip if this row was already Completed before this event
          // (e.g. an unrelated column update on an already-completed row).
          const old: any = payload.old;
          if (old?.Completed === true) return;

          // Dedup by SessionId in case the same completion event is
          // redelivered (e.g. after a brief socket reconnect).
          const sessionId = row.SessionId;
          if (!sessionId || countedSessionIds.current.has(sessionId)) return;
          countedSessionIds.current.add(sessionId);

          const key = slotToKey(row.Slot);
          setGlobalStats((prev) => ({
            ...prev,
            total: prev.total + 1,
            ...(key ? { [key]: prev[key] + 1 } : {}),
          }));
        },
      )
      .subscribe();

    const pollId = setInterval(() => { refreshGlobalStats(); }, 4000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollId);
    };
  }, [refreshGlobalStats]);

  // ── todayKey safety-net interval ─────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(async () => {
      const newKey = new Date().toDateString();
      if (newKey !== todayKey) {
        setTodayKey(newKey);
        setCompletedPrayers({ morning: false, noon: false, evening: false });
        setPendingCompletionSlots({ morning: false, noon: false, evening: false });
        countedSessionIds.current.clear();
        if (userId) await fetchTodayPrayers(userId);
        await refreshGlobalStats();
      }
    }, 60000);
    return () => clearInterval(id);
  }, [todayKey, userId]);

  // ── Auth + session init ───────────────────────────────────────────────────
  useEffect(() => {
    let channel: any = null;
    let authSubscription: any = null;

    // Full init once we have a confirmed Supabase auth session.
    const initAuth = async (auth: any) => {
      if (!auth?.user?.id) return;
      const uid = auth.user.id;
      setUserId(uid);

      // Cache this so a future launch with no network can skip straight
      // to the offline fallback path below instead of getting stuck.
      AsyncStorage.setItem(CACHED_USER_ID_KEY, uid).catch(() => {});

      const meta = auth.user.user_metadata?.username || auth.user.user_metadata?.name;
      if (meta) {
        setUsername(meta);
      } else {
        try {
          const { data: u } = await supabase
            .from("users")
            .select("username")
            .eq("id", uid)
            .single();
          if (u?.username) setUsername(u.username);
        } catch (err) {
          console.warn("username fetch failed (offline?):", err);
        }
      }

      const sess = await startPrayer(uid);
      setSession(sess);

      await refreshGlobalStats();

      try {
        setCount(await getGlobalCount(sess.slot));
      } catch (err) {
        console.warn("getGlobalCount failed (offline?):", err);
      }

      await fetchTodayPrayers(uid);

      try {
        channel = supabase
          .channel(`prayers-${uid}`)
          .on("postgres_changes", {
            event: "*", schema: "public",
            table: "PrayerSessions",
            filter: `UserId=eq.${uid}`,
          }, async () => {
            await fetchTodayPrayers(uid);
            try { setCount(await getGlobalCount(sess.slot)); } catch {}
          })
          .subscribe();
      } catch (err) {
        console.warn("realtime subscribe failed (offline?):", err);
      }
    };

    // FIX: lightweight path used when offline, or when the network auth
    // calls below time out. Skips Supabase's auth network calls entirely
    // (refreshSession/getSession can hang or fail unpredictably with no
    // connection) and works purely off the cached userId + the local
    // prayer cache — startPrayer/fetchTodayPrayers are already
    // offline-safe, so this renders "Completed"/"Pray Now" correctly
    // without ever touching the network.
    const initOfflineFallback = async () => {
      try {
        const cachedUid = await AsyncStorage.getItem(CACHED_USER_ID_KEY);
        if (!cachedUid) {
          // Never successfully logged in on this device before — nothing
          // safe to show, but we must still clear the loading spinner.
          setPrayersLoading(false);
          return;
        }
        setUserId(cachedUid);
        try {
          const sess = await startPrayer(cachedUid);
          setSession(sess);
        } catch (err) {
          console.warn("offline startPrayer failed:", err);
        }
        await fetchTodayPrayers(cachedUid);
      } catch (err) {
        console.error("initOfflineFallback error:", err);
        setPrayersLoading(false);
      }
    };

    (async () => {
      try {
        const online = await isOnline();

        if (!online) {
          await initOfflineFallback();
          return;
        }

        // ── Step 1: refresh, with a hard timeout. refreshSession() makes
        // a real network request and can hang on some flaky connections
        // instead of failing fast — the timeout guarantees this can never
        // block the UI forever. Uses safeRefreshSession() (shared, deduped
        // across the app) instead of calling supabase.auth.refreshSession()
        // directly — refresh tokens rotate on use, so an uncoordinated call
        // here racing against another one elsewhere (e.g. offlineSync's
        // periodic refresh) could get rejected as "Already Used" and force
        // a real sign-out.
        const refreshResult = await withTimeout(safeRefreshSession(), 4000);
        if (refreshResult?.data?.session?.user?.id) {
          await initAuth(refreshResult.data.session);
          return;
        }

        // ── Step 2: existing session, also timeout-guarded.
        const sessionResult = await withTimeout(supabase.auth.getSession(), 4000);
        if (sessionResult?.data?.session?.user?.id) {
          await initAuth(sessionResult.data.session);
          return;
        }

        // ── Step 3: wait for the INITIAL_SESSION/SIGNED_IN event, capped
        // at 8s as before — but now falls back to the offline path
        // instead of leaving the screen stuck if nothing ever fires.
        const gotSession = await new Promise<boolean>((resolve) => {
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, s) => {
              if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
                subscription.unsubscribe();
                await initAuth(s);
                resolve(true);
              } else if (event === "SIGNED_OUT") {
                subscription.unsubscribe();
                resolve(false);
              }
            },
          );
          authSubscription = subscription;
          setTimeout(() => resolve(false), 8000);
        });

        if (!gotSession) {
          await initOfflineFallback();
        }
      } catch (err) {
        console.error("Mount error:", err);
        await initOfflineFallback();
      }
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, [fetchTodayPrayers]);

  // ── Fill in username if we started via the offline fallback ──────────────
  // initOfflineFallback() only has a cached userId — it never sets
  // username, since that requires a network/session read. If the app
  // launched offline, username stayed blank and nothing else re-fetches
  // it later, so the greeting would silently show no name even after
  // reconnecting. This tries once right away, and again the moment
  // connectivity returns, until username is actually set.
  useEffect(() => {
    if (!userId || username) return;
    let cancelled = false;

    const tryFetchUsername = async () => {
      try {
        const {
          data: { session: authSession },
        } = await supabase.auth.getSession();
        const meta =
          authSession?.user?.user_metadata?.username ||
          authSession?.user?.user_metadata?.name;
        if (meta) {
          if (!cancelled) setUsername(meta);
          return;
        }

        const { data: u } = await supabase
          .from("users")
          .select("username")
          .eq("id", userId)
          .single();
        if (u?.username && !cancelled) setUsername(u.username);
      } catch (err) {
        console.warn("username fetch retry failed (offline?):", err);
      }
    };

    tryFetchUsername();

    const netInfoUnsub = NetInfo.addEventListener((state) => {
      const nowOnline = state.isConnected && state.isInternetReachable !== false;
      if (nowOnline) tryFetchUsername();
    });

    return () => {
      cancelled = true;
      netInfoUnsub();
    };
  }, [userId, username]);

  // ── Ask notification permission once ever ────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    (async () => {
      try {
        const alreadyAsked = await AsyncStorage.getItem(NOTIF_ASKED_KEY);
        if (alreadyAsked === "true") return;
        await AsyncStorage.setItem(NOTIF_ASKED_KEY, "true");
        await requestNotificationPermission();
      } catch (err) {
        console.error("Notification permission prompt error:", err);
      }
    })();
  }, [userId]);

  // ── Countdown timer ───────────────────────────────────────────────────────
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

  // ── Auto-trigger prayer at prayer hours ───────────────────────────────────
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
            if (!freshSession || !userId) return;

            try {
              await completePrayer(userId, freshSession.sessionId);
            } catch (err) {
              console.error("Auto-trigger completePrayer error:", err);
            }

            // Re-derive from local storage instead of forcing "Completed"
            // here — shows "Loading" if this landed offline/unsynced, or
            // "Completed" immediately if it synced right away.
            await fetchTodayPrayers(userId);

            try {
              // ← ADDED: withTimeout so an offline/slow getGlobalCount()
              // can't hang this onComplete() and delay PrayerScreen's
              // "Return Home" modal. Online, resolves well within 4s so
              // behavior is unchanged.
              const c = await withTimeout(getGlobalCount(freshSession.slot), 4000);
              if (c !== null) setCount(c);
            } catch (err) {
              console.warn("getGlobalCount failed (offline?):", err);
            }
          },
        });
      }, 7000);
    };
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [session, userId, navigation, angelusMode, fetchTodayPrayers]);

  // ── Complete prayer ───────────────────────────────────────────────────────
  const handleComplete = async () => {
    if (!session || !userId) return;
    navigation.navigate("Prayer", {
      autoPlay: false,
      onComplete: async () => {
        try {
          await completePrayer(userId, session.sessionId);
        } catch (err) {
          console.error("completePrayer error:", err);
        }

        // Re-derive from local storage instead of forcing "Completed"
        // here — shows "Loading" if this landed offline/unsynced, or
        // "Completed" immediately if it synced right away.
        await fetchTodayPrayers(userId);

        try {
          // ← ADDED: withTimeout so an offline/slow getGlobalCount() can't
          // hang this onComplete() and delay PrayerScreen's "Return Home"
          // modal (PrayerScreen does `await onComplete()` before showing
          // it). Online, resolves well within 4s so behavior is unchanged.
          const c = await withTimeout(getGlobalCount(session.slot), 4000);
          if (c !== null) setCount(c);
        } catch (err) {
          console.warn("getGlobalCount failed (offline?):", err);
        }
      },
    });
  };

  // ── Midnight reset ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const scheduleNextMidnight = () => {
      const now = new Date();
      const tomorrow = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0, 0, 5, 0,
      );
      const msUntilMidnight = tomorrow.getTime() - now.getTime();

      return setTimeout(async () => {
        setCompletedPrayers({ morning: false, noon: false, evening: false });
        setPendingCompletionSlots({ morning: false, noon: false, evening: false });
        countedSessionIds.current.clear();
        await fetchTodayPrayers(userId);
        await refreshGlobalStats();
        midnightTimerRef.current = scheduleNextMidnight();
      }, msUntilMidnight);
    };

    midnightTimerRef.current = scheduleNextMidnight();

    return () => {
      if (midnightTimerRef.current) clearTimeout(midnightTimerRef.current);
    };
  }, [userId, fetchTodayPrayers, refreshGlobalStats]);

  // ── Prayer status ─────────────────────────────────────────────────────────
  const morningStatus = prayersLoading
    ? "loading"
    : angelusMode === "noon_only"
      ? "disabled"
      : isOffline
        ? "loading"
        : pendingCompletionSlots.morning
          ? "loading"
          : getPrayerStatus("morning", completedPrayers.morning);

  const noonStatus = prayersLoading
    ? "loading"
    : isOffline
      ? "loading"
      : pendingCompletionSlots.noon
        ? "loading"
        : getPrayerStatus("noon", completedPrayers.noon);

  const eveningStatus = prayersLoading
    ? "loading"
    : angelusMode === "noon_only"
      ? "disabled"
      : isOffline
        ? "loading"
        : pendingCompletionSlots.evening
          ? "loading"
          : getPrayerStatus("evening", completedPrayers.evening);

  const [fontsLoaded] = useFonts({
    CormorantGaramond: require("../../assets/fonts/CormorantGaramond.ttf"),
    EBGaramond: require("../../assets/fonts/EBGaramond.ttf"),
    Cormorant: require("../../assets/fonts/Cormorant.ttf"),
    Inter: require("../../assets/fonts/Inter.ttf"),
    CormorantGaramondItalic: require("../../assets/fonts/CormorantGaramond-Italic.ttf"),
  });

  if (!fontsLoaded) return null;

  const activeCarouselSlot = CAROUSEL_SLOTS[carouselIndex];
  const activeCarouselCount = globalStats[activeCarouselSlot.key];

  return (
    <>
      <StatusBar hidden />
      <View style={styles.container}>
        <AppHeader />
        <ScrollView showsVerticalScrollIndicator={false}>

          {/* GREETING */}
          <View style={styles.greetingRow}>
            <View style={styles.sunIcon}>
              <Image
                source={require("../../assets/usericons1.png")}
                style={styles.progressImages}
                resizeMode="contain"
              />
            </View>
            <View>
               <Text style={styles.greetingTitle}>
  Good {greeting}
  {username ? `, ${username}!` : "!"}
</Text>
            </View>
          </View>

          {/* NEXT PRAYER */}
          <View style={styles.mainCard}>
            <View style={styles.cardImage}>
              <Image
                source={prayerImages[currentDayImage] ?? prayerImages.Morning}
                style={{ width: IMAGE_WIDTH, height: IMAGE_WIDTH * 1.3 }}
                resizeMode="contain"
              />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>NEXT PRAYER</Text>
              <Text style={styles.cardTitle}>{format12Hour(currentPrayer.time)}</Text>
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
              DAILY PRAYER PROGRESS
            </Text>
            {prayerLoadError && (
              <View style={styles.connectionBanner}>
                <Ionicons name="cloud-offline-outline" size={14} color="#A44E4E" />
                <Text style={styles.connectionText}>Unable to load prayer status</Text>
              </View>
            )}
            <Image
              source={require("../../assets/DividerRight.png")}
              style={styles.dividerHalf}
              resizeMode="stretch"
            />
          </View>

          {/* OFFLINE SYNC STATUS — purely informational. No tap needed:
              startAutoSync() (App.tsx) already syncs in the background on
              reconnect and on a 20s interval. This pill just shows there's
              something pending, and disappears on its own once the
              background sync clears it. */}
          {pendingSyncCount > 0 && (
            <View style={{ paddingHorizontal: 24, marginBottom: 6 }}>
              <View style={[styles.connectionBanner, { alignSelf: "center" }]}>
                <Ionicons name="sync-outline" size={14} color="#8A6412" />
                <Text style={[styles.connectionText, { color: "#8A6412" }]}>
                  {`${pendingSyncCount} prayer(s) waiting to sync — will sync automatically`}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.progressRow}>
            <ProgressCard title="Morning" status={morningStatus} onPress={handleComplete} />
            <ProgressCard title="Noon"    status={noonStatus}    onPress={handleComplete} />
            <ProgressCard title="Evening" status={eveningStatus} onPress={handleComplete} />
          </View>

          {/* GLOBAL CARD — carousel effect, data/logic unchanged from doc1 */}
          <View style={styles.globalCard}>
            <View style={styles.globe}>
              <Image source={require("../../assets/Global.png")} style={styles.globeIcon} />
            </View>
            <View style={styles.globalRight}>
              <Text style={styles.globalLabel}>GLOBAL PRAYER TODAY</Text>

              <Animated.View style={[styles.globalCountRow, { opacity: carouselAnim }]}>
                <Text style={styles.hourCount}>{activeCarouselCount.toLocaleString()}</Text>
                <View style={styles.globalTextContainer}>
                  <Text style={styles.globalPrayedToday}>people prayed the</Text>
                  <Text style={styles.globalPrayedToday}>{activeCarouselSlot.label}</Text>
                </View>
              </Animated.View>

              <View style={styles.carouselDots}>
                {CAROUSEL_SLOTS.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.carouselDot,
                      i === carouselIndex && styles.carouselDotActive,
                    ]}
                  />
                ))}
              </View>

              <Image
                source={require("../../assets/Divider.png")}
                style={styles.cardDivider}
                resizeMode="contain"
              />

              <View style={styles.globalCountRow}>
                <Text style={styles.globalCount}>{globalStats.total.toLocaleString()}</Text>
                <View style={styles.globalTextContainer}>
                  <Text style={styles.globalText}>
  prayers offered{"\n"}Worldwide
</Text>
                </View>
              </View>
              <Text style={styles.globalText}>United in Prayer around the World</Text>
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
              <Text style={styles.scriptureQuote}>{`"${dailyVerse.quote}"`}</Text>
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
  const isActive    = status === "active";
  const isMissed    = status === "missed";
  const isDisabled  = status === "disabled";
  const isLoading   = status === "loading";

  const statusConfig = isCompleted
    ? { text: "Completed", icon: "checkmark-circle",          iconColor: "#5E9B63", bg: "#EEF8EE", border: "#B7D9BB", textColor: "#4D7C52" }
    : isActive
      ? { text: "Pray Now",  icon: "ellipse",                   iconColor: COLORS.gold, bg: "#FFF7E7", border: "#E7C979", textColor: "#8A6412" }
      : isMissed
        ? { text: "Missed",    icon: "close-circle",              iconColor: "#C86B6B", bg: "#FFF1F1", border: "#E4B4B4", textColor: "#A44E4E" }
        : isDisabled
          ? { text: "Disabled",  icon: "remove-circle-outline",    iconColor: "#AAA",    bg: "#F5F5F5", border: "#DDD",    textColor: "#AAA"    }
          : isLoading
            ? { text: "Loading...", icon: "ellipsis-horizontal-circle", iconColor: COLORS.muted, bg: "#F8F6F2", border: "#E7DCCB", textColor: COLORS.muted }
            : { text: "Upcoming",  icon: "time",                  iconColor: COLORS.navy, bg: "#F3F5FA", border: "#D4DBEA", textColor: COLORS.navy };

  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.05, duration: 900, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
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
          isActive  && styles.progressCardActive,
          isMissed  && styles.progressCardMissed,
          isActive  && { transform: [{ scale: pulse }] },
          isDisabled && { backgroundColor: "#F7F7F7", borderColor: "#E0E0E0", opacity: 0.6 },
        ]}
      >
        <View
          style={[
            styles.progressIcon,
            isCompleted && { backgroundColor: "#DCE8D9" },
            isActive    && { backgroundColor: "#F7E6B8" },
            isMissed    && { backgroundColor: "#F5D6D6" },
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
            { backgroundColor: statusConfig.bg, borderColor: statusConfig.border },
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
          <Text style={[styles.progressSubtitle, { color: statusConfig.textColor }]}>
            {statusConfig.text}
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: COLORS.cream },
  greetingRow:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, marginTop: 10, paddingTop: 5 },
  greetingTitle:      { fontSize: 24, color: COLORS.textPrimary, fontWeight: "600", fontFamily: "Cormorant", marginTop: -15, },
  greetingSubtitle:   { fontSize: 20, color: COLORS.navy, fontFamily: "Cormorant" },
  mainCard:           { minHeight: 154, marginHorizontal: 24, marginTop: 0, backgroundColor: COLORS.card, borderRadius: 28, borderWidth: 1, borderColor: COLORS.border, padding: 2, flexDirection: "row", shadowColor: "#3B2E22", shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  cardImage:          { width: IMAGE_WIDTH, justifyContent: "center", alignItems: "center", marginRight: 10 },
  cardContent:        { flex: 1, justifyContent: "center" },
  cardLabel:          { color: COLORS.gold, letterSpacing: 2, fontSize: 11, fontFamily: "Inter", fontWeight: "500" },
  cardTitle:          { fontSize: 40, color: COLORS.navy, fontWeight: "400", fontFamily: "EBGaramond" },
  cardDivider:        { width: "95%", marginVertical: 0, marginRight: 5 },
  timeRow:            { flexDirection: "row", alignItems: "center" },
  timeText:           { marginLeft: 6, fontSize: 16, fontWeight: "500", color: COLORS.navy, fontFamily: "EBGaramond" },
  cardTime:           { marginTop: 5, color: "#6F440A", fontSize: 20, fontWeight: "600", fontFamily: "Cormorant" },
  dividerHalf:        { flex: 1, height: 12 },
  sectionHeader:      { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginTop: 10, marginBottom: 10 },
  sectionHeaderText:  { flexShrink: 0, marginHorizontal: 10, color: COLORS.navy, fontSize: 12, fontFamily: "Inter", fontWeight: "600", textAlign: "center" },
  line:               { flex: 1, height: 1, backgroundColor: COLORS.border },
  progressRow:        { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 24,marginTop: -7 },
  progressCard:       { backgroundColor: COLORS.card, borderRadius: 22, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", paddingVertical: 8, paddingHorizontal: 8, position: "relative", shadowColor: "#3B2E22", shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  progressCardCompleted: { borderColor: "#B8CFB5", backgroundColor: "#F6FBF5" },
  progressCardActive: { borderColor: COLORS.gold, backgroundColor: "#FFF9EC" },
  progressCardMissed: { borderColor: COLORS.border, backgroundColor: "#FFF3F2" },
  progressIcon:       { width: 55, height: 55, borderRadius: 29, backgroundColor: "#F3EFE7", justifyContent: "center", alignItems: "center", marginBottom: 2 },
  progressTitle:      { fontSize: 17, color: COLORS.textPrimary, fontWeight: "600", fontFamily: "Cormorant" },
  progressTitleUnder: { fontSize: 14, color: COLORS.textPrimary, fontWeight: "500", fontFamily: "Cormorant" },
  progressBox:        { textAlign: "center", minWidth: "100%", flexDirection: "row", alignItems: "center", marginTop: 5, paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, backgroundColor: "transparent" },
  progressSubtitle:   { fontSize: width < 390 ? 11 : 12, color: COLORS.textSecondary, fontFamily: "Cormorant" },
  progressImage:      { width: 68, height: 68 },
   progressImages:      { width: 60, height: 68, marginTop: -15  },
  globalCard:         { marginHorizontal: 24, marginTop: 5, backgroundColor: COLORS.card, borderRadius: 28, borderWidth: 1, borderColor: COLORS.border, padding: 7, flexDirection: "row", alignItems: "flex-start", shadowColor: "#3B2E22", shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  globe:              { justifyContent: "center", alignItems: "center", marginRight: 6, alignSelf: "center" },
  globeIcon:          { width: 130, height: 130 },
  globalRight:        { flex: 1, justifyContent: "center" },
  globalLabelRow:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  globalLabel:        { color: COLORS.navy, fontSize: 12, fontFamily: "Inter", fontWeight: "500", marginBottom: 2 },
  liveRow:             { flexDirection: "row", alignItems: "center" },
  liveDot:              { width: 6, height: 6, borderRadius: 3, backgroundColor: "#5E9B63", marginRight: 4 },
  liveText:             { fontSize: 10, color: "#5E9B63", fontFamily: "Inter", fontWeight: "600", letterSpacing: 1 },
  slotStatsRow:         { flexDirection: "row", justifyContent: "space-between", marginTop: 6, marginBottom: 4 },
  slotStatItem:         { alignItems: "center", flex: 1 },
  slotStatCount:        { fontSize: 20, color: COLORS.navy, fontWeight: "700", fontFamily: "EBGaramond" },
  slotStatLabel:         { fontSize: 11, color: COLORS.textSecondary, fontFamily: "Cormorant" },
  globalCountRow:     { flexDirection: "row", alignItems: "center", flexWrap: "wrap", justifyContent: "center",    marginTop: -5,
  marginBottom: -8, },
  hourCount:          { fontSize: 30, color: COLORS.navy, fontWeight: "600", fontFamily: "EBGaramond" },
  globalCount:        { fontSize: 36, color: COLORS.gold, fontWeight: "700", fontFamily: "EBGaramond", marginTop: -10, },
  globalPrayedToday:  { fontSize: 13, lineHeight: 17, color: COLORS.textSecondary, fontFamily: "Cormorant" },
  globalText:         { color: COLORS.textSecondary, fontSize: 12, fontFamily: "Cormorant", marginTop: 5,   lineHeight: 18  },
  globalTextContainer:{ marginLeft: 6, justifyContent: "center" },
  globalDivider:      { width: "100%" },
  scriptureCard:      { marginHorizontal: 24, marginTop: 5, backgroundColor: COLORS.card, borderRadius: 22, borderWidth: 1, borderColor: COLORS.border, flexDirection: "row", overflow: "hidden", shadowColor: "#3B2E22", shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  scriptureImage:     { width: 190, height: 120 },
  scriptureContent:   { flex: 1, padding: 16, justifyContent: "center" },
  scriptureQuote:     { fontSize: 12, color: COLORS.textPrimary, fontStyle: "italic", lineHeight: 12, fontFamily: "CormorantGaramond" },
  scriptureRef:       { marginTop: 7, fontSize: 13, color: COLORS.navy, fontFamily: "CormorantGaramond", fontWeight: "600" },
  buttonWrapper:      { marginHorizontal: 24, marginTop: 28 },
  button:             { borderRadius: 36, paddingVertical: 18, paddingHorizontal: 24, shadowColor: "#D4AF57", shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  buttonInner:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  prayIcon:           { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.18)", justifyContent: "center", alignItems: "center" },
  buttonText:         { color: "#fff", fontSize: 24, fontWeight: "600" },
  sunIcon:            { marginRight: 3 },
  logoutBtn:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: "#D4A017" },
  logoutText:         { fontSize: 13, fontWeight: "600", color: "#C8922A" },
  prayerBreakdownRow: { paddingTop: 8, paddingBottom: 2 },
  prayerChip:         { minWidth: 95, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: "#FFF7E7", borderWidth: 1, borderColor: "#E7DCCB", marginRight: 10, alignItems: "center" },
  prayerChipTime:     { fontSize: 11, color: COLORS.gold, fontFamily: "Inter" },
  prayerChipTitle:    { fontSize: 14, color: COLORS.navy, fontFamily: "Cormorant" },
  prayerChipCount:    { fontSize: 20, color: COLORS.navy, fontFamily: "EBGaramond" },
  connectionBanner:   { flexDirection: "row", alignItems: "center", alignSelf: "center", marginBottom: 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "#FFF1F1" },
  connectionText:     { marginLeft: 6, fontSize: 12, color: "#A44E4E" },
  barDivider:         { alignSelf: "stretch", height: 1, backgroundColor: COLORS.border, marginVertical: 2 },
  nowPrayingRow:      { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  nowPrayingLabel:    { fontSize: 12, color: COLORS.textSecondary, fontFamily: "Cormorant", marginRight: 4 },
  nowPrayingItem:     { flexDirection: "row", alignItems: "center" },
  nowPrayingFlag:     { fontSize: 14 },
  nowPrayingCountry:  { fontSize: 13, color: COLORS.navy, fontWeight: "600", fontFamily: "CormorantGaramond" },
  nowPrayingCount:    { fontSize: 13, color: COLORS.textPrimary, fontFamily: "CormorantGaramond" },
  nowPrayingDot:      { fontSize: 13, color: COLORS.muted },
  carouselDots:       { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 12, marginBottom: 2 },
  carouselDot:        { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.border, marginHorizontal: 3 },
  carouselDotActive:  { backgroundColor: COLORS.gold, width: 14, borderRadius: 3 },
});