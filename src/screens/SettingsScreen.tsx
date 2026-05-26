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
  Switch,
  Modal,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logout } from "../store/auth";
import { supabase } from "../lib/supabaseClient";

const COLORS = {
  navy: "#2F4A7A",
  gold: "#C9A24A",
  cream: "#F7F2EA",
  card: "#FFFAF2",
  textPrimary: "#53433B",
  textSecondary: "#6B5E52",
  border: "#E7DCCB",
};

// ─── Notification config ───────────────────────────────────────────────────────
const NOTIF_IDS_KEY = "angelus_notif_ids";

type AngelusTime = "morning" | "noon" | "evening";

const ANGELUS_CONFIG: Record<AngelusTime, { label: string; time: string; hour: number; minute: number }> = {
  morning: { label: "Morning Angelus", time: "6:00 AM", hour: 6, minute: 0 },
  noon:    { label: "Noon Angelus",    time: "12:00 PM", hour: 12, minute: 0 },
  evening: { label: "Evening Angelus", time: "6:00 PM", hour: 18, minute: 0 },
};

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ─── Permission helper ─────────────────────────────────────────────────────────
async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("angelus", {
      name: "Angelus Prayers",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// ─── Schedule one daily notification, returns its id ─────────────────────────
async function scheduleAngelus(key: AngelusTime): Promise<string> {
  const cfg = ANGELUS_CONFIG[key];
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `🔔 ${cfg.label}`,
      body: "The Angel of the Lord declared unto Mary…",
      sound: "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: cfg.hour,
      minute: cfg.minute,
    },
  });
  return id;
}

// ─── Cancel a scheduled notification by id ────────────────────────────────────
async function cancelNotif(id: string | null) {
  if (id) await Notifications.cancelScheduledNotificationAsync(id);
}

// ─── Persist ids to AsyncStorage ──────────────────────────────────────────────
type StoredIds = Partial<Record<AngelusTime, string>>;

async function loadStoredIds(): Promise<StoredIds> {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_IDS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveStoredIds(ids: StoredIds) {
  await AsyncStorage.setItem(NOTIF_IDS_KEY, JSON.stringify(ids));
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Props = { onLogout: () => void };
type TogglesState = Record<AngelusTime, boolean>;

export default function SettingsScreen({ onLogout }: Props) {
  const ringScale   = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.4)).current;
  const bellRotate  = useRef(new Animated.Value(0)).current;

  const [toggles, setToggles] = useState<TogglesState>({
    morning: true,
    noon:    true,
    evening: true,
  });
  const [notifIds, setNotifIds] = useState<StoredIds>({});
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");

  // ── On mount: request perms + restore saved toggle state ─────────────────
  useEffect(() => {
    (async () => {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(
          "Notifications Disabled",
          "Please enable notifications in your device settings to receive Angelus reminders.",
          [{ text: "OK" }]
        );
        return;
      }

      // Restore which notifications are active
      const ids = await loadStoredIds();
      setNotifIds(ids);
      setToggles({
        morning: !!ids.morning,
        noon:    !!ids.noon,
        evening: !!ids.evening,
      });
    })();
  }, []);

  // ── Fetch user info ───────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        let { data: { session: authSession } } = await supabase.auth.getSession();

        if (!authSession?.user?.id) {
          await new Promise<void>((resolve) => {
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
              if (s) { authSession = s; subscription.unsubscribe(); resolve(); }
            });
            setTimeout(resolve, 5000);
          });
        }

        if (!authSession?.user) return;
        setEmail(authSession.user.email ?? "");

        const uid = authSession.user.id;
        const metaUsername =
          authSession.user.user_metadata?.username ||
          authSession.user.user_metadata?.name;

        if (metaUsername) {
          setUsername(metaUsername);
        } else {
          const { data: userData } = await supabase
            .from("users").select("username").eq("id", uid).single();
          if (userData?.username) setUsername(userData.username);
        }
      } catch (err) {
        console.error("❌ Settings fetch user error:", err);
      }
    })();
  }, []);

  // ── Bell animations (unchanged) ───────────────────────────────────────────
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale,   { toValue: 1.25, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: false }),
          Animated.timing(ringOpacity, { toValue: 0,    duration: 900, useNativeDriver: false }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale,   { toValue: 1,   duration: 0, useNativeDriver: false }),
          Animated.timing(ringOpacity, { toValue: 0.4, duration: 0, useNativeDriver: false }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    const swing = () => {
      Animated.sequence([
        Animated.timing(bellRotate, { toValue:  1,   duration: 180, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(bellRotate, { toValue: -1,   duration: 180, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(bellRotate, { toValue:  0.5, duration: 140, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(bellRotate, { toValue: -0.4, duration: 140, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(bellRotate, { toValue:  0,   duration: 120, easing: Easing.out(Easing.ease),   useNativeDriver: false }),
      ]).start(() => setTimeout(swing, 3000));
    };
    const timer = setTimeout(swing, 1000);
    return () => clearTimeout(timer);
  }, []);

  // ── Toggle a single Angelus notification ─────────────────────────────────
  const handleToggle = async (key: AngelusTime, enabled: boolean) => {
    const granted = await requestPermissions();
    if (!granted && enabled) {
      Alert.alert("Permission Required", "Enable notifications in Settings to receive Angelus reminders.");
      return;
    }

    setToggles((prev) => ({ ...prev, [key]: enabled }));

    const updatedIds = { ...notifIds };

    if (enabled) {
      // Cancel any stale id first, then reschedule
      await cancelNotif(updatedIds[key] ?? null);
      const newId = await scheduleAngelus(key);
      updatedIds[key] = newId;
    } else {
      await cancelNotif(updatedIds[key] ?? null);
      delete updatedIds[key];
    }

    setNotifIds(updatedIds);
    await saveStoredIds(updatedIds);
  };

  // ── Enable / Disable all ──────────────────────────────────────────────────
  const handleEnableAll = async () => {
    const granted = await requestPermissions();
    if (!granted) {
      Alert.alert("Permission Required", "Enable notifications in Settings to receive Angelus reminders.");
      return;
    }

    const updatedIds: StoredIds = { ...notifIds };

    for (const key of (["morning", "noon", "evening"] as AngelusTime[])) {
      await cancelNotif(updatedIds[key] ?? null);
      updatedIds[key] = await scheduleAngelus(key);
    }

    setNotifIds(updatedIds);
    setToggles({ morning: true, noon: true, evening: true });
    await saveStoredIds(updatedIds);
  };

  const handleDisableAll = async () => {
    for (const key of (["morning", "noon", "evening"] as AngelusTime[])) {
      await cancelNotif(notifIds[key] ?? null);
    }

    const empty: StoredIds = {};
    setNotifIds(empty);
    setToggles({ morning: false, noon: false, evening: false });
    await saveStoredIds(empty);
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      await logout();
      onLogout();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <>
      <Modal visible={showLogoutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="log-out-outline" size={32} color={COLORS.gold} />
            </View>
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalText}>
              Are you sure you want to sign out? Your prayer progress has been saved and will be waiting when you return.
            </Text>
            <View style={styles.modalDivider} />
            <TouchableOpacity
              style={styles.modalConfirmBtn}
              onPress={() => { setShowLogoutModal(false); handleLogout(); }}
            >
              <Ionicons name="log-out-outline" size={18} color="#fff" />
              <Text style={styles.modalConfirmText}>Yes, Sign Out</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowLogoutModal(false)}>
              <Text style={styles.modalCancelText}>Stay & Pray</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <SafeAreaView style={styles.container}>
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

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.sectionHeader}>
            <View style={styles.line} />
            <Text style={styles.sectionHeaderText}>SETTINGS</Text>
            <View style={styles.line} />
          </View>

          {/* ACCOUNT INFO */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="person-circle-outline" size={20} color={COLORS.gold} />
              <Text style={styles.cardTitle}>My Account</Text>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.profileRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarLetter}>
                  {username ? username.charAt(0).toUpperCase() : "?"}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{username || "—"}</Text>
                <Text style={styles.profileEmail}>{email || "—"}</Text>
              </View>
            </View>
          </View>

          {/* NOTIFICATIONS */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="notifications-outline" size={20} color={COLORS.gold} />
              <Text style={styles.cardTitle}>Prayer Notifications</Text>
            </View>
            <View style={styles.cardDivider} />

            {(["morning", "noon", "evening"] as AngelusTime[]).map((key, i, arr) => (
              <View key={key}>
                <NotificationRow
                  label={ANGELUS_CONFIG[key].label}
                  time={ANGELUS_CONFIG[key].time}
                  enabled={toggles[key]}
                  onToggle={(val) => handleToggle(key, val)}
                />
                {i < arr.length - 1 && <View style={styles.rowDivider} />}
              </View>
            ))}
          </View>

          {/* ENABLE / DISABLE ALL */}
          <View style={styles.bulkRow}>
            <TouchableOpacity style={styles.bulkBtn} onPress={handleEnableAll}>
              <Ionicons name="notifications" size={16} color="#fff" />
              <Text style={styles.bulkBtnText}>Enable All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.bulkBtn, styles.bulkBtnOutline]} onPress={handleDisableAll}>
              <Ionicons name="notifications-off-outline" size={16} color={COLORS.gold} />
              <Text style={[styles.bulkBtnText, { color: COLORS.gold }]}>Disable All</Text>
            </TouchableOpacity>
          </View>

          {/* SESSION */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.gold} />
              <Text style={styles.cardTitle}>Session</Text>
            </View>
            <View style={styles.cardDivider} />
            <TouchableOpacity style={styles.logoutRow} onPress={() => setShowLogoutModal(true)}>
              <Ionicons name="log-out-outline" size={20} color="#C0392B" />
              <Text style={styles.logoutRowText}>Sign Out</Text>
              <Ionicons name="chevron-forward" size={18} color="#C0392B" style={{ marginLeft: "auto" }} />
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// ─── NotificationRow (unchanged UI) ──────────────────────────────────────────
function NotificationRow({
  label, time, enabled, onToggle,
}: {
  label: string; time: string; enabled: boolean; onToggle: (val: boolean) => void;
}) {
  return (
    <View style={styles.notifRow}>
      <View style={[styles.notifDot, { backgroundColor: enabled ? COLORS.gold : "#D0C8B8" }]} />
      <View style={styles.notifText}>
        <Text style={styles.notifLabel}>{label}</Text>
        <Text style={styles.notifTime}>{time}</Text>
      </View>
      <Switch
        value={enabled}
        onValueChange={onToggle}
        trackColor={{ false: "#D0C8B8", true: "#D4AF57" }}
        thumbColor={enabled ? "#fff" : "#f4f3f4"}
      />
    </View>
  );
}

// ─── Styles (same as original) ────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  scroll: { paddingBottom: 20 },
  header: {
    height: 100, backgroundColor: "#2F4A7A", paddingRight: 24, paddingLeft: 12,
    borderBottomLeftRadius: 25, borderBottomRightRadius: 25,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  logo: { width: 140, height: 40, resizeMode: "contain" },
  bellContainer: { width: 85, height: 85, justifyContent: "center", alignItems: "center" },
  bellImage: { width: 85, height: 85, position: "absolute", zIndex: 2 },
  bellEffect: { width: 85, height: 85, position: "absolute", zIndex: 1 },
  sectionHeader: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 24, marginTop: 28, marginBottom: 18,
  },
  sectionHeaderText: {
    color: COLORS.navy, fontSize: 13, letterSpacing: 1.5,
    marginHorizontal: 12, fontFamily: "CormorantGaramond",
  },
  line: { flex: 1, height: 1, backgroundColor: COLORS.border },
  card: {
    marginHorizontal: 20, marginTop: 4, marginBottom: 16,
    backgroundColor: COLORS.card, borderRadius: 24, borderWidth: 2,
    borderColor: COLORS.border, paddingVertical: 18, paddingHorizontal: 20,
    shadowColor: "#3B2E22", shadowOpacity: 0.07, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 18, color: COLORS.navy, fontFamily: "CormorantGaramond", fontWeight: "600" },
  cardDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  rowDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 2 },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarCircle: {
    width: 54, height: 54, borderRadius: 27, backgroundColor: COLORS.navy,
    justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: COLORS.gold,
  },
  avatarLetter: { fontSize: 26, color: "#fff", fontWeight: "700", fontFamily: "CormorantGaramond" },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, color: COLORS.textPrimary, fontWeight: "700", fontFamily: "CormorantGaramond" },
  profileEmail: { fontSize: 14, color: COLORS.textSecondary, fontFamily: "CormorantGaramond", marginTop: 2 },
  notifRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  notifDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  notifText: { flex: 1 },
  notifLabel: { fontSize: 17, color: COLORS.textPrimary, fontFamily: "CormorantGaramond", fontWeight: "600" },
  notifTime: { fontSize: 13, color: COLORS.textSecondary, fontFamily: "CormorantGaramond", marginTop: 2 },
  bulkRow: { flexDirection: "row", gap: 12, marginHorizontal: 20, marginBottom: 16 },
  bulkBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, backgroundColor: COLORS.gold, borderRadius: 30, paddingVertical: 12,
  },
  bulkBtnOutline: { backgroundColor: "transparent", borderWidth: 2, borderColor: COLORS.gold },
  bulkBtnText: { color: "#fff", fontSize: 15, fontWeight: "600", fontFamily: "CormorantGaramond" },
  logoutRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  logoutRowText: { fontSize: 17, color: "#C0392B", fontFamily: "CormorantGaramond", fontWeight: "600" },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center", alignItems: "center", padding: 28,
  },
  modalCard: {
    width: "100%", backgroundColor: COLORS.card, borderRadius: 28, padding: 28,
    alignItems: "center", borderWidth: 2, borderColor: COLORS.border,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
  modalIconCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: "#FFF3DC",
    borderWidth: 2, borderColor: COLORS.gold,
    justifyContent: "center", alignItems: "center", marginBottom: 16,
  },
  modalTitle: { fontSize: 28, color: COLORS.navy, fontWeight: "700", fontFamily: "CormorantGaramond", marginBottom: 10 },
  modalText: {
    fontSize: 16, color: COLORS.textSecondary, fontFamily: "CormorantGaramond",
    textAlign: "center", lineHeight: 24, marginBottom: 4,
  },
  modalDivider: { height: 1, backgroundColor: COLORS.border, width: "100%", marginVertical: 20 },
  modalConfirmBtn: {
    width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#C0392B", borderRadius: 30, paddingVertical: 14, marginBottom: 12,
  },
  modalConfirmText: { color: "#fff", fontSize: 17, fontWeight: "700", fontFamily: "CormorantGaramond" },
  modalCancelBtn: {
    width: "100%", alignItems: "center", justifyContent: "center",
    borderRadius: 30, paddingVertical: 13, borderWidth: 2, borderColor: COLORS.border,
  },
  modalCancelText: { color: COLORS.navy, fontSize: 17, fontWeight: "600", fontFamily: "CormorantGaramond" },
});