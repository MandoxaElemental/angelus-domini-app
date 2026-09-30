import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  Easing,
  Switch,
  Modal,
  Platform,
  Alert,
  FlatList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logout } from "../store/auth";
import { supabase } from "../lib/supabaseClient";
import AppHeader from "../../components/Header";
import {
  AngelusMode,
  getAngelusMode,
  setAngelusMode,
  scheduleAngelusNotifications,
  cancelAngelusNotifications,
  getSlotToggles,
  setSlotToggles,
} from "../services/notificationService";
import { useFonts } from "expo-font";

const COLORS = {
  navy: "#2F4A7A",
  gold: "#C9A24A",
  cream: "#F7F2EA",
  card: "#FFFAF2",
  textPrimary: "#53433B",
  textSecondary: "#6B5E52",
  border: "#E7DCCB",
};

const LANGUAGE_KEY = "angelus_language";

type AngelusTime = "morning" | "noon" | "evening";

const ANGELUS_CONFIG: Record<
  AngelusTime,
  { label: string; time: string; hour: number; minute: number }
> = {
  morning: { label: "Morning Angelus", time: "6:00 AM", hour: 6, minute: 0 },
  noon: { label: "Noon Angelus", time: "12:00 PM", hour: 12, minute: 0 },
  evening: { label: "Evening Angelus", time: "6:00 PM", hour: 18, minute: 0 },
};

// ← CHANGED: trimmed to the three supported languages.
// Codes must match the keys used in PrayerScreen's TRANSLATIONS.
const LANGUAGES = [
  { code: "en", name: "English", native: "English" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "la", name: "Latin", native: "Latina" },
];

type Props = { onLogout: () => void };
type TogglesState = Record<AngelusTime, boolean>;

export default function SettingsScreen({ onLogout }: Props) {
  const navigation = useNavigation<any>();

  useFonts({
    CormorantGaramond: require("../../assets/fonts/CormorantGaramond.ttf"),
    EBGaramond_Medium: require("../../assets/fonts/EBGaramond-Medium.ttf"),
  });
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.4)).current;
  const bellRotate = useRef(new Animated.Value(0)).current;

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [selectedLang, setSelectedLang] = useState("en");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  // ← ADDED: needed so the deletion request can be linked to this user
  const [userId, setUserId] = useState("");

  // ← ADDED: state for the new Delete Account confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [angelusMode, setAngelusModeState] = useState<AngelusMode>("all_three");

  // ← CHANGED: this now holds ONLY the user's saved custom preference —
  // it's what gets persisted/edited, independent of what's currently shown
  // (Traditional/Noon Only override the display, see displayToggles below).
  const [customToggles, setCustomToggles] = useState<TogglesState>({
    morning: true,
    noon: true,
    evening: true,
  });

  // ← ADDED: true only when the "Custom" schedule is selected — this is
  // what actually unlocks the Prayer Notifications toggles below.
  const togglesEditable = angelusMode === "custom";

  // ← ADDED: what the three switches actually show. Traditional forces all
  // on; Noon Only forces only noon on; Custom shows (and allows editing)
  // the saved per-slot preference.
  const displayToggles: TogglesState =
    angelusMode === "all_three"
      ? { morning: true, noon: true, evening: true }
      : angelusMode === "noon_only"
        ? { morning: false, noon: true, evening: false }
        : customToggles;

  // ── Load persisted mode + custom toggle preference on mount ──────────────
  useEffect(() => {
    (async () => {
      const mode = await getAngelusMode();
      setAngelusModeState(mode);

      const stored = await getSlotToggles();
      setCustomToggles(stored);

      try {
        const savedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
        if (savedLang) setSelectedLang(savedLang);
      } catch {}
    })();
  }, []);

  // ── Mode change: route entirely through notificationService ──────────────
  const handleAngelusModeChange = async (mode: AngelusMode) => {
    await setAngelusMode(mode);
    setAngelusModeState(mode);
    // force=true so the per-launch gate is bypassed for explicit user action
    await scheduleAngelusNotifications(mode, true);

    // ← ADDED: switching INTO Custom re-syncs from whatever was last saved,
    // so re-entering Custom after a stint in Traditional/Noon Only restores
    // exactly what the user had before, rather than showing stale state.
    if (mode === "custom") {
      const stored = await getSlotToggles();
      setCustomToggles(stored);
    }
  };

  // Fetch user info
  useEffect(() => {
    (async () => {
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

        if (!authSession?.user) return;
        setEmail(authSession.user.email ?? "");
        setUserId(authSession.user.id); // ← ADDED: capture uid for deletion requests

        const uid = authSession.user.id;
        const metaUsername =
          authSession.user.user_metadata?.username ||
          authSession.user.user_metadata?.name;

        if (metaUsername) {
          setUsername(metaUsername);
        } else {
          const { data: userData } = await supabase
            .from("users")
            .select("username")
            .eq("id", uid)
            .single();
          if (userData?.username) setUsername(userData.username);
        }
      } catch (err) {
        console.error("❌ Settings fetch user error:", err);
      }
    })();
  }, []);

  // Bell pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1.25,
            duration: 900,
            easing: Easing.out(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 900,
            useNativeDriver: false,
          }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: false,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.4,
            duration: 0,
            useNativeDriver: false,
          }),
        ]),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Bell swing animation
  useEffect(() => {
    const swing = () => {
      Animated.sequence([
        Animated.timing(bellRotate, {
          toValue: 1,
          duration: 180,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(bellRotate, {
          toValue: -1,
          duration: 180,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(bellRotate, {
          toValue: 0.5,
          duration: 140,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(bellRotate, {
          toValue: -0.4,
          duration: 140,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(bellRotate, {
          toValue: 0,
          duration: 120,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
      ]).start(() => setTimeout(swing, 3000));
    };
    const timer = setTimeout(swing, 1000);
    return () => clearTimeout(timer);
  }, []);

  // ── Toggle a single time on/off (Custom mode only) ────────────────────────
  const handleToggle = async (key: AngelusTime, enabled: boolean) => {
    // ← ADDED: hard guard. The switches are already visually disabled
    // outside Custom mode, but this keeps the handler itself safe if it's
    // ever called some other way.
    if (!togglesEditable) return;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted" && enabled) {
      Alert.alert(
        "Permission Required",
        "Enable notifications in Settings to receive Angelus reminders.",
      );
      return;
    }

    const next = { ...customToggles, [key]: enabled };
    setCustomToggles(next);
    await setSlotToggles(next);

    // ← CHANGED: reschedule through the service (mode="custom", force=true)
    // instead of duplicating the scheduling logic here — the service is now
    // the single place that knows how to filter by mode + toggles.
    await scheduleAngelusNotifications("custom", true);
  };

  // ── Enable all (Custom mode only) ─────────────────────────────────────────
  const handleEnableAll = async () => {
    if (!togglesEditable) return; // ← ADDED

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Enable notifications in Settings to receive Angelus reminders.",
      );
      return;
    }

    const allEnabled = { morning: true, noon: true, evening: true };
    setCustomToggles(allEnabled);
    await setSlotToggles(allEnabled);
    await scheduleAngelusNotifications("custom", true);
  };

  // ── Disable all (Custom mode only) ────────────────────────────────────────
  const handleDisableAll = async () => {
    if (!togglesEditable) return; // ← ADDED

    const allDisabled = { morning: false, noon: false, evening: false };
    setCustomToggles(allDisabled);
    await setSlotToggles(allDisabled);
    await cancelAngelusNotifications();
  };

  const handleSelectLanguage = async (code: string) => {
    setSelectedLang(code);
    setShowLangModal(false);
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, code);
    } catch {}
  };

  const currentLang =
    LANGUAGES.find((l) => l.code === selectedLang) ??
    LANGUAGES.find((l) => l.code === "en")!;

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      await logout();
      onLogout();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // ← ADDED: inserts a row into account_deletion_requests. A Supabase
  // cron job (pg_cron) checks this table and deletes the account 1 hour
  // after `requested_at`. This function does NOT delete anything itself —
  // it only records the request, per your "delete after 1 hour" flow.
  const handleDeleteAccountRequest = async () => {
    if (!userId) {
      Alert.alert("Please wait", "Still loading your account, try again in a moment.");
      return;
    }
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("account_deletion_requests")
        .insert({ user_id: userId });

      if (error) throw error;

      setShowDeleteModal(false);
      Alert.alert(
        "Deletion Scheduled",
        "Your account will be permanently deleted in 1 hour. Please log out now to begin the process.",
      );
    } catch (err) {
      console.error("❌ Delete account request error:", err);
      Alert.alert("Something went wrong", "Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {/* Logout Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="log-out-outline" size={32} color={COLORS.gold} />
            </View>
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalText}>
              Are you sure you want to sign out? Your prayer progress has been
              saved and will be waiting when you return.
            </Text>
            <View style={styles.modalDivider} />
            <TouchableOpacity
              style={styles.modalConfirmBtn}
              onPress={() => {
                setShowLogoutModal(false);
                handleLogout();
              }}
            >
              <Ionicons name="log-out-outline" size={18} color="#fff" />
              <Text style={styles.modalConfirmText}>Yes, Sign Out</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowLogoutModal(false)}
            >
              <Text style={styles.modalCancelText}>Stay & Pray</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ← ADDED: Delete Account Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="trash-outline" size={32} color="#C0392B" />
            </View>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalText}>
              Are you sure you want to delete this account? It will be
              permanently deleted in 1 hour. Please log out now to begin
              the process.
            </Text>
            <View style={styles.modalDivider} />
            <TouchableOpacity
              style={styles.modalConfirmBtn}
              onPress={handleDeleteAccountRequest}
              disabled={deleting}
            >
              <Ionicons name="trash-outline" size={18} color="#fff" />
              <Text style={styles.modalConfirmText}>
                {deleting ? "Processing..." : "Yes, Delete My Account"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowDeleteModal(false)}
              disabled={deleting}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Language Picker Modal */}
      <Modal visible={showLangModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.langModalCard]}>
            <View style={styles.langModalHeader}>
              <View style={styles.modalIconCircle}>
                <Ionicons
                  name="language-outline"
                  size={28}
                  color={COLORS.gold}
                />
              </View>
              <Text style={styles.modalTitle}>Choose Language</Text>
              <Text style={styles.langModalSubtitle}>
                Select your preferred language for prayers and content.
              </Text>
            </View>
            <View style={styles.modalDivider} />
            <FlatList
              data={LANGUAGES}
              keyExtractor={(item) => item.code}
              style={styles.langList}
              showsVerticalScrollIndicator={false}
              initialNumToRender={20}
              ItemSeparatorComponent={() => (
                <View style={styles.langSeparator} />
              )}
              renderItem={({ item }) => {
                const isSelected = item.code === selectedLang;
                return (
                  <TouchableOpacity
                    style={[
                      styles.langItem,
                      isSelected && styles.langItemSelected,
                    ]}
                    onPress={() => handleSelectLanguage(item.code)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.langItemText}>
                      <Text
                        style={[
                          styles.langItemName,
                          isSelected && styles.langItemNameSelected,
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={[
                          styles.langItemNative,
                          isSelected && styles.langItemNativeSelected,
                        ]}
                      >
                        {item.native}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={COLORS.gold}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
            <View style={styles.modalDivider} />
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowLangModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.container}>
        <AppHeader />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.line} />
            <Text style={styles.sectionHeaderText}>SETTINGS</Text>
            <View style={styles.line} />
          </View>

          {/* ACCOUNT INFO */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons
                name="person-circle-outline"
                size={20}
                color={COLORS.gold}
              />
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

          {/* ANGELUS SCHEDULE */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="time-outline" size={20} color={COLORS.gold} />
              <Text style={styles.cardTitle}>Angelus Schedule</Text>
            </View>
            <View style={styles.cardDivider} />
            <TouchableOpacity
              style={[
                styles.modeOption,
                angelusMode === "all_three" && styles.modeOptionSelected,
              ]}
              onPress={() => handleAngelusModeChange("all_three")}
            >
              <Text style={styles.modeTitle}>Traditional</Text>
              <Text style={styles.modeDescription}>
                Morning, Noon, and Evening Angelus — 6:00 AM, 12:00 PM, 6:00 PM
              </Text>
            </TouchableOpacity>
           
            {/* ← ADDED: Custom mode */}
            <TouchableOpacity
              style={[
                styles.modeOption,
                angelusMode === "custom" && styles.modeOptionSelected,
              ]}
              onPress={() => handleAngelusModeChange("custom")}
            >
              <Text style={styles.modeTitle}>Custom</Text>
              <Text style={styles.modeDescription}>
                Choose exactly which Angelus times notify you, below
              </Text>
            </TouchableOpacity>
          </View>

          {/* NOTIFICATIONS */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons
                name="notifications-outline"
                size={20}
                color={COLORS.gold}
              />
              <Text style={styles.cardTitle}>Prayer Notifications</Text>
            </View>
            <View style={styles.cardDivider} />

            {/* ← ADDED: explains why the switches are locked when not Custom */}
            {!togglesEditable && (
              <Text style={styles.customHint}>
                Select "Custom" in Angelus Schedule above to enable or disable
                these individually.
              </Text>
            )}

            {(["morning", "noon", "evening"] as AngelusTime[]).map(
              (key, i, arr) => (
                <View key={key}>
                  <NotificationRow
                    label={ANGELUS_CONFIG[key].label}
                    time={ANGELUS_CONFIG[key].time}
                    enabled={displayToggles[key]} // ← CHANGED (was toggles[key])
                    onToggle={(val) => handleToggle(key, val)}
                    disabled={!togglesEditable} // ← CHANGED (was mode-based partial gating)
                  />
                  {i < arr.length - 1 && <View style={styles.rowDivider} />}
                </View>
              ),
            )}
          </View>

          {/* ENABLE / DISABLE ALL — only meaningful in Custom mode */}
          <View style={styles.bulkRow}>
            <TouchableOpacity
              style={[
                styles.bulkBtn,
                !togglesEditable && styles.bulkBtnDisabled, // ← ADDED
              ]}
              onPress={handleEnableAll}
              disabled={!togglesEditable} // ← ADDED
            >
              <Ionicons name="notifications" size={16} color="#fff" />
              <Text style={styles.bulkBtnText}>Enable All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.bulkBtn,
                styles.bulkBtnOutline,
                !togglesEditable && styles.bulkBtnDisabled, // ← ADDED
              ]}
              onPress={handleDisableAll}
              disabled={!togglesEditable} // ← ADDED
            >
              <Ionicons
                name="notifications-off-outline"
                size={16}
                color={COLORS.gold}
              />
              <Text style={[styles.bulkBtnText, { color: COLORS.gold }]}>
                Disable All
              </Text>
            </TouchableOpacity>
          </View>

          {/* LANGUAGE */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="language-outline" size={20} color={COLORS.gold} />
              <Text style={styles.cardTitle}>Language</Text>
            </View>
            <View style={styles.cardDivider} />
            {/* ← CHANGED: enabled — no more disabled style / Coming Soon.
                Tapping opens the language picker modal. */}
            <TouchableOpacity
              style={styles.langRow}
              onPress={() => setShowLangModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.langRowLeft}>
                <View style={styles.langIconCircle}>
                  <Ionicons
                    name="globe-outline"
                    size={18}
                    color={COLORS.gold}
                  />
                </View>
                <View style={styles.langRowText}>
                  <Text style={styles.langRowLabel}>Choose Language</Text>
                  <Text style={styles.langRowValue}>
                    {currentLang.name}
                    {currentLang.native !== currentLang.name
                      ? `  ·  ${currentLang.native}`
                      : ""}
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* SESSION */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={COLORS.gold}
              />
              <Text style={styles.cardTitle}>Session</Text>
            </View>
            <View style={styles.cardDivider} />
            <TouchableOpacity
              style={styles.logoutRow}
              onPress={() => setShowLogoutModal(true)}
            >
              <Ionicons name="log-out-outline" size={20} color="#C0392B" />
              <Text style={styles.logoutRowText}>Sign Out</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color="#C0392B"
                style={{ marginLeft: "auto" }}
              />
            </TouchableOpacity>
          </View>

          {/* ← ADDED: separate Danger Zone card for Delete Account */}
          <View style={[styles.card, styles.dangerCard]}>
            <View style={styles.cardTitleRow}>
              <Ionicons
                name="warning-outline"
                size={20}
                color="#C0392B"
              />
              <Text style={[styles.cardTitle, styles.dangerCardTitle]}>
                Danger Zone
              </Text>
            </View>
            <View style={styles.cardDivider} />
           <Text style={styles.dangerNote}>
  Permanent action. Your account will be deleted after 1 hour
  and cannot be recovered.
</Text>
            <TouchableOpacity
              style={styles.deleteAccountBtn}
              onPress={() => setShowDeleteModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="trash-outline" size={18} color="#fff" />
              <Text style={styles.deleteAccountBtnText}>Delete Account</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </>
  );
}

function NotificationRow({
  label,
  time,
  enabled,
  onToggle,
  disabled,
}: {
  label: string;
  time: string;
  enabled: boolean;
  onToggle: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.notifRow}>
      <View
        style={[
          styles.notifDot,
          { backgroundColor: enabled ? COLORS.gold : "#D0C8B8" },
        ]}
      />
      <View style={styles.notifText}>
        <Text style={[styles.notifLabel, disabled && { opacity: 0.5 }]}>
          {label}
        </Text>
        <Text style={styles.notifTime}>{time}</Text>
      </View>
      <Switch
        value={enabled}
        onValueChange={(val) => {
          if (!disabled) onToggle(val);
        }}
        disabled={disabled}
        trackColor={{ false: COLORS.border, true: COLORS.gold }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={COLORS.border}
      />
    </View>
  );
}

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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    marginTop: 28,
    marginBottom: 18,
  },
  sectionHeaderText: {
    color: COLORS.navy,
    fontSize: 30,
    letterSpacing: 1.5,
    marginHorizontal: 12,
    fontFamily: "EBGaramond_Medium",
  },
  line: { flex: 1, height: 1, backgroundColor: COLORS.border },
  card: {
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 16,
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
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    color: COLORS.navy,
    fontFamily: "EBGaramond_Medium",
    fontWeight: "600",
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  rowDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 2 },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.navy,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  avatarLetter: {
    fontSize: 26,
    color: "#fff",
    fontWeight: "700",
    fontFamily: "CormorantGaramond",
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: 20,
    color: COLORS.textPrimary,
    fontWeight: "700",
    fontFamily: "CormorantGaramond",
  },
  profileEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: "CormorantGaramond",
    marginTop: 2,
  },
  notifRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  notifDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  notifText: { flex: 1 },
  notifLabel: {
    fontSize: 17,
    color: COLORS.textPrimary,
    fontFamily: "CormorantGaramond",
    fontWeight: "600",
  },
  notifTime: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: "CormorantGaramond",
    marginTop: 2,
  },
  // ← ADDED
  customHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: "CormorantGaramond",
    marginBottom: 8,
  },
  bulkRow: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  bulkBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.gold,
    borderRadius: 30,
    paddingVertical: 12,
  },
  bulkBtnOutline: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  bulkBtnDisabled: { opacity: 0.4 }, // ← ADDED
  bulkBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "CormorantGaramond",
  },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  logoutRowText: {
    fontSize: 17,
    color: "#C0392B",
    fontFamily: "CormorantGaramond",
    fontWeight: "600",
  },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  langRowDisabled: { opacity: 0.45 },
  comingSoonTag: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textSecondary,
    fontFamily: "CormorantGaramond",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: "hidden",
  },
  langRowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  langIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF3DC",
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    justifyContent: "center",
    alignItems: "center",
  },
  langRowText: { flex: 1 },
  langRowLabel: {
    fontSize: 17,
    color: COLORS.textPrimary,
    fontFamily: "CormorantGaramond",
    fontWeight: "600",
  },
  langRowValue: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: "CormorantGaramond",
    marginTop: 2,
  },
  langModalCard: { maxHeight: "85%", paddingBottom: 20 },
  langModalHeader: { alignItems: "center", width: "100%" },
  langModalSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: "CormorantGaramond",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
  langList: { width: "100%", maxHeight: 380 },
  langSeparator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
  },
  langItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  langItemSelected: { backgroundColor: "#FFF3DC" },
  langItemText: { flex: 1 },
  langItemName: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontFamily: "CormorantGaramond",
    fontWeight: "600",
  },
  langItemNameSelected: { color: COLORS.navy },
  langItemNative: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: "CormorantGaramond",
    marginTop: 1,
  },
  langItemNativeSelected: { color: COLORS.gold },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
  },
  modalCard: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFF3DC",
    borderWidth: 2,
    borderColor: COLORS.gold,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 28,
    color: COLORS.navy,
    fontWeight: "700",
    fontFamily: "CormorantGaramond",
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontFamily: "CormorantGaramond",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 4,
  },
  modalDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    width: "100%",
    marginVertical: 20,
  },
  modalConfirmBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#C0392B",
    borderRadius: 30,
    paddingVertical: 14,
    marginBottom: 12,
  },
  modalConfirmText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "CormorantGaramond",
  },
  modalCancelBtn: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 30,
    paddingVertical: 13,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  modalCancelText: {
    color: COLORS.navy,
    fontSize: 17,
    fontWeight: "600",
    fontFamily: "CormorantGaramond",
  },
  modeOption: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  modeOptionSelected: {
    borderColor: COLORS.gold,
    backgroundColor: "#FFF3DC",
  },
  modeOptionDisabled: { opacity: 0.45 },
  modeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardDisabled: { opacity: 0.45 },
  notifCardContent: { opacity: 0.55 },
  modeTitle: {
    fontSize: 18,
    color: COLORS.navy,
    fontFamily: "CormorantGaramond",
    fontWeight: "700",
  },
  modeDescription: {
    marginTop: 4,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: "CormorantGaramond",
  },
  // ← ADDED: Danger Zone card + button styles
  dangerCard: {
    borderColor: "#EBC6C0",
    backgroundColor: "#FFF6F5",
  },
  dangerCardTitle: {
    color: "#C0392B",
  },
  dangerNote: {
    fontSize: 13.5,
    lineHeight: 19,
    color: COLORS.textSecondary,
    fontFamily: "CormorantGaramond",
    marginBottom: 14,
  },
  deleteAccountBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#C0392B",
    borderRadius: 30,
    paddingVertical: 14,
  },
  deleteAccountBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "CormorantGaramond",
  },
});