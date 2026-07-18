import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
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

const NOTIF_IDS_KEY = "angelus_notif_ids";
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

const LANGUAGES = [
  { code: "af", name: "Afrikaans", native: "Afrikaans" },
  { code: "sq", name: "Albanian", native: "Shqip" },
  { code: "am", name: "Amharic", native: "አማርኛ" },
  { code: "ar", name: "Arabic", native: "العربية" },
  { code: "hy", name: "Armenian", native: "Հայերեն" },
  { code: "az", name: "Azerbaijani", native: "Azərbaycan" },
  { code: "eu", name: "Basque", native: "Euskara" },
  { code: "be", name: "Belarusian", native: "Беларуская" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "bs", name: "Bosnian", native: "Bosanski" },
  { code: "bg", name: "Bulgarian", native: "Български" },
  { code: "my", name: "Burmese", native: "မြန်မာဘာသာ" },
  { code: "ca", name: "Catalan", native: "Català" },
  { code: "ceb", name: "Cebuano", native: "Cebuano" },
  { code: "ny", name: "Chichewa", native: "Chichewa" },
  { code: "zh-CN", name: "Chinese (Simplified)", native: "中文 (简体)" },
  { code: "zh-TW", name: "Chinese (Traditional)", native: "中文 (繁體)" },
  { code: "co", name: "Corsican", native: "Corsu" },
  { code: "hr", name: "Croatian", native: "Hrvatski" },
  { code: "cs", name: "Czech", native: "Čeština" },
  { code: "da", name: "Danish", native: "Dansk" },
  { code: "nl", name: "Dutch", native: "Nederlands" },
  { code: "en", name: "English", native: "English" },
  { code: "eo", name: "Esperanto", native: "Esperanto" },
  { code: "et", name: "Estonian", native: "Eesti" },
  { code: "tl", name: "Filipino", native: "Filipino" },
  { code: "fi", name: "Finnish", native: "Suomi" },
  { code: "fr", name: "French", native: "Français" },
  { code: "fy", name: "Frisian", native: "Frysk" },
  { code: "gl", name: "Galician", native: "Galego" },
  { code: "ka", name: "Georgian", native: "ქართული" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "el", name: "Greek", native: "Ελληνικά" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
  { code: "ht", name: "Haitian Creole", native: "Kreyòl ayisyen" },
  { code: "ha", name: "Hausa", native: "Hausa" },
  { code: "haw", name: "Hawaiian", native: "ʻŌlelo Hawaiʻi" },
  { code: "iw", name: "Hebrew", native: "עברית" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "hmn", name: "Hmong", native: "Hmong" },
  { code: "hu", name: "Hungarian", native: "Magyar" },
  { code: "is", name: "Icelandic", native: "Íslenska" },
  { code: "ig", name: "Igbo", native: "Igbo" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia" },
  { code: "ga", name: "Irish", native: "Gaeilge" },
  { code: "it", name: "Italian", native: "Italiano" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "jw", name: "Javanese", native: "Basa Jawa" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "kk", name: "Kazakh", native: "Қазақ" },
  { code: "km", name: "Khmer", native: "ខ្មែរ" },
  { code: "rw", name: "Kinyarwanda", native: "Kinyarwanda" },
  { code: "ko", name: "Korean", native: "한국어" },
  { code: "ku", name: "Kurdish (Kurmanji)", native: "Kurdî" },
  { code: "ky", name: "Kyrgyz", native: "Кыргызча" },
  { code: "lo", name: "Lao", native: "ລາວ" },
  { code: "la", name: "Latin", native: "Latina" },
  { code: "lv", name: "Latvian", native: "Latviešu" },
  { code: "lt", name: "Lithuanian", native: "Lietuvių" },
  { code: "lb", name: "Luxembourgish", native: "Lëtzebuergesch" },
  { code: "mk", name: "Macedonian", native: "Македонски" },
  { code: "mg", name: "Malagasy", native: "Malagasy" },
  { code: "ms", name: "Malay", native: "Bahasa Melayu" },
  { code: "ml", name: "Malayalam", native: "മലയാളം" },
  { code: "mt", name: "Maltese", native: "Malti" },
  { code: "mi", name: "Maori", native: "Māori" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "mn", name: "Mongolian", native: "Монгол" },
  { code: "ne", name: "Nepali", native: "नेपाली" },
  { code: "no", name: "Norwegian", native: "Norsk" },
  { code: "or", name: "Odia (Oriya)", native: "ଓଡ଼ିଆ" },
  { code: "ps", name: "Pashto", native: "پښتو" },
  { code: "fa", name: "Persian", native: "فارسی" },
  { code: "pl", name: "Polish", native: "Polski" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "ro", name: "Romanian", native: "Română" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "sm", name: "Samoan", native: "Samoan" },
  { code: "gd", name: "Scots Gaelic", native: "Gàidhlig" },
  { code: "sr", name: "Serbian", native: "Српски" },
  { code: "st", name: "Sesotho", native: "Sesotho" },
  { code: "sn", name: "Shona", native: "Shona" },
  { code: "sd", name: "Sindhi", native: "سنڌي" },
  { code: "si", name: "Sinhala", native: "සිංහල" },
  { code: "sk", name: "Slovak", native: "Slovenčina" },
  { code: "sl", name: "Slovenian", native: "Slovenščina" },
  { code: "so", name: "Somali", native: "Soomaali" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "su", name: "Sundanese", native: "Basa Sunda" },
  { code: "sw", name: "Swahili", native: "Kiswahili" },
  { code: "sv", name: "Swedish", native: "Svenska" },
  { code: "tg", name: "Tajik", native: "Тоҷикӣ" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "tt", name: "Tatar", native: "Татарча" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "th", name: "Thai", native: "ไทย" },
  { code: "tr", name: "Turkish", native: "Türkçe" },
  { code: "tk", name: "Turkmen", native: "Türkmen" },
  { code: "uk", name: "Ukrainian", native: "Українська" },
  { code: "ur", name: "Urdu", native: "اردو" },
  { code: "ug", name: "Uyghur", native: "ئۇيغۇرچە" },
  { code: "uz", name: "Uzbek", native: "O'zbek" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt" },
  { code: "cy", name: "Welsh", native: "Cymraeg" },
  { code: "xh", name: "Xhosa", native: "isiXhosa" },
  { code: "yi", name: "Yiddish", native: "יידיש" },
  { code: "yo", name: "Yoruba", native: "Yorùbá" },
  { code: "zu", name: "Zulu", native: "isiZulu" },
];

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ─── Permission helper ─────────────────────────────────────────────────────────
async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("angelus-bells", {
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

async function scheduleAngelus(key: AngelusTime): Promise<string> {
  const cfg = ANGELUS_CONFIG[key];
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `🔔 ${cfg.label}`,
      body: "The bells are calling you to prayer. Tap to pray the Angelus.",
      sound: "default",
      data: { screen: "Prayer", autoPlay: true },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: cfg.hour,
      minute: cfg.minute,
      channelId: Platform.OS === "android" ? "angelus-bells" : undefined,
    } as any,
  });
  return id;
}

async function cancelNotif(id: string | null) {
  if (id) await Notifications.cancelScheduledNotificationAsync(id);
}

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

type Props = { onLogout: () => void };
type TogglesState = Record<AngelusTime, boolean>;

export default function SettingsScreen({ onLogout }: Props) {
  const navigation = useNavigation<any>();

  const [fontsLoaded] = useFonts({
    CormorantGaramond: require("../../assets/fonts/CormorantGaramond.ttf"),
    EBGaramond_Medium: require("../../assets/fonts/EBGaramond-Medium.ttf"),
  });

  // Default all toggles to TRUE — notifications are on by default
  const [toggles, setToggles] = useState<TogglesState>({
    morning: true,
    noon: true,
    evening: true,
  });
  const [notifIds, setNotifIds] = useState<StoredIds>({});
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [selectedLang, setSelectedLang] = useState("en");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const busyRef = useRef(false);
  if (busyRef.current) return;

  busyRef.current = true;

  try {
  } finally {
    busyRef.current = false;
  }

  const [angelusMode, setAngelusModeState] = useState<AngelusMode>("all_three");
  useEffect(() => {
    (async () => {
      const mode = await getAngelusMode();
      setAngelusModeState(mode);
    })();
  }, []);

  const handleAngelusModeChange = async (mode: AngelusMode) => {
    await setAngelusMode(mode);
    setAngelusModeState(mode);

    if (mode === "noon_only") {
      // Cancel morning + evening

      await cancelNotif(notifIds.morning ?? null);
      await cancelNotif(notifIds.evening ?? null);

      let noonId = notifIds.noon;

      if (!noonId) {
        noonId = await scheduleAngelus("noon");
      }

      const updatedIds = {
        noon: noonId,
      };

      setNotifIds(updatedIds);

      setToggles({
        morning: false,
        noon: true,
        evening: false,
      });

      await saveStoredIds(updatedIds);
    } else {
      // Re-enable all three

      const freshIds: StoredIds = {};

      freshIds.morning = await scheduleAngelus("morning");
      freshIds.noon = await scheduleAngelus("noon");
      freshIds.evening = await scheduleAngelus("evening");

      setNotifIds(freshIds);

      setToggles({
        morning: true,
        noon: true,
        evening: true,
      });

      await saveStoredIds(freshIds);
    }
  };

  // On mount: request permissions + auto-enable all on first launch,
  // or restore saved toggle state for returning users
  useEffect(() => {
    (async () => {
      const granted = await requestPermissions();

      if (!granted) {
        Alert.alert(
          "Notifications Disabled",
          "Please enable notifications in your device settings to receive Angelus reminders.",
          [{ text: "OK" }],
        );
      }

      const ids = await loadStoredIds();
      const isFirstLaunch = !ids.morning && !ids.noon && !ids.evening;

      if (isFirstLaunch && granted) {
        // ✅ First time: auto-schedule all three and save
        const freshIds: StoredIds = {};
        for (const key of ["morning", "noon", "evening"] as AngelusTime[]) {
          freshIds[key] = await scheduleAngelus(key);
        }
        setNotifIds(freshIds);
        setToggles({ morning: true, noon: true, evening: true });
        await saveStoredIds(freshIds);
      } else {
        // ✅ Returning user: restore exactly what they had saved
        setNotifIds(ids);
        setToggles({
          morning: !!ids.morning,
          noon: !!ids.noon,
          evening: !!ids.evening,
        });
      }

      try {
        const savedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
        if (savedLang) setSelectedLang(savedLang);
      } catch {}
    })();
  }, []);

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

  // Toggle a single notification on/off
  const handleToggle = async (key: AngelusTime, enabled: boolean) => {
    const granted = await requestPermissions();
    if (!granted && enabled) {
      Alert.alert(
        "Permission Required",
        "Enable notifications in Settings to receive Angelus reminders.",
      );
      return;
    }

    // Update UI immediately for snappy feel
    setToggles((prev) => ({ ...prev, [key]: enabled }));

    const updatedIds = { ...notifIds };

    if (enabled) {
      // Cancel any existing one first to avoid duplicates
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

  // Enable all three
  const handleEnableAll = async () => {
    const granted = await requestPermissions();
    if (!granted) {
      Alert.alert(
        "Permission Required",
        "Enable notifications in Settings to receive Angelus reminders.",
      );
      return;
    }

    const updatedIds: StoredIds = { ...notifIds };

    for (const key of ["morning", "noon", "evening"] as AngelusTime[]) {
      await cancelNotif(updatedIds[key] ?? null);
      updatedIds[key] = await scheduleAngelus(key);
    }

    setNotifIds(updatedIds);
    setToggles({ morning: true, noon: true, evening: true });
    await saveStoredIds(updatedIds);
  };

  // Disable all three
  const handleDisableAll = async () => {
    for (const key of ["morning", "noon", "evening"] as AngelusTime[]) {
      await cancelNotif(notifIds[key] ?? null);
    }

    const empty: StoredIds = {};
    setNotifIds(empty);
    setToggles({ morning: false, noon: false, evening: false });
    await saveStoredIds(empty);
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
      await Notifications.cancelAllScheduledNotificationsAsync();
      await AsyncStorage.removeItem(NOTIF_IDS_KEY);
      await logout();
      onLogout();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };
  if (!fontsLoaded) {
    return null;
  }
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

          {/* <TouchableOpacity
            style={{
              marginHorizontal: 24,
              marginBottom: 20,
              padding: 16,
              backgroundColor: "#C9A24A",
              borderRadius: 12,
              alignItems: "center",
            }}
            onPress={() =>
              navigation.navigate("Prayer", {
                autoPlay: true,
              })
            }
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>
              Prayer Screen
            </Text>
          </TouchableOpacity> */}

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
                Morning, Noon, and Evening Angelus
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeOption,
                angelusMode === "noon_only" && styles.modeOptionSelected,
              ]}
              onPress={() => handleAngelusModeChange("noon_only")}
            >
              <Text style={styles.modeTitle}>Noon Only</Text>

              <Text style={styles.modeDescription}>
                Receive only the noon Angelus reminder
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
            {(["morning", "noon", "evening"] as AngelusTime[]).map(
              (key, i, arr) => (
                <View key={key}>
                  <NotificationRow
                    label={ANGELUS_CONFIG[key].label}
                    time={ANGELUS_CONFIG[key].time}
                    enabled={toggles[key]}
                    onToggle={(val) => handleToggle(key, val)}
                    disabled={angelusMode === "noon_only" && key !== "noon"}
                  />
                  {i < arr.length - 1 && <View style={styles.rowDivider} />}
                </View>
              ),
            )}
          </View>

          {/* ENABLE / DISABLE ALL */}
          <View style={styles.bulkRow}>
            <TouchableOpacity style={styles.bulkBtn} onPress={handleEnableAll}>
              <Ionicons name="notifications" size={16} color="#fff" />
              <Text style={styles.bulkBtnText}>Enable All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkBtn, styles.bulkBtnOutline]}
              onPress={handleDisableAll}
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
            <TouchableOpacity
              style={[styles.langRow, styles.disabledRow]}
              disabled
              activeOpacity={1}
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
                  <Text style={styles.langRowLabel}>Language</Text>
                  <Text style={styles.langComingSoon}>Coming Soon</Text>
                  {/* <Text style={styles.langRowLabel}>Choose Language</Text>
                  <Text style={styles.langRowValue}>
                    {currentLang.name}
                    {currentLang.native !== currentLang.name
                      ? `  ·  ${currentLang.native}`
                      : ""}
                  </Text> */}
                </View>
              </View>
              {/* <Ionicons
                name="chevron-forward"
                size={18}
                color={COLORS.textSecondary}
              /> */}
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
        value={disabled ? false : enabled}
        onValueChange={(val) => {
          if (!disabled) onToggle(val);
        }}
        trackColor={{
          false: COLORS.border,
          true: COLORS.gold,
        }}
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
  disabledRow: {
    opacity: 0.65,
  },

  langComingSoon: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontStyle: "italic",
  },

  comingSoonBadge: {
    backgroundColor: "#EFE6D6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  comingSoonBadgeText: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: "600",
  },
});
