import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  ImageBackground,
  StyleSheet,
  Platform,
  StatusBar,
  Keyboard,
  KeyboardAvoidingView, // ← ADDED
} from "react-native";
import { useState, useEffect, useRef } from "react";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";
import * as SplashScreen from "expo-splash-screen";
import { register } from "../api/authApi";
import { FONT_BODY_SEMIBOLD } from "../lib/constants/fonts";

SplashScreen.preventAutoHideAsync();

const churchBg = require("../../assets/bgchurch.png");

const COUNTRIES = [
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩" },
];

type Country = {
  code: string;
  name: string;
  flag: string;
};

type ActiveField = "username" | "email" | "password" | null;

function GlassInput({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  if (Platform.OS === "ios") {
    return (
      <BlurView
        intensity={95}
        tint="light"
        style={[styles.glassContainer, style]}
      >
        {children}
      </BlurView>
    );
  }
  return (
    <View style={[styles.glassContainer, styles.glassAndroid, style]}>
      {children}
    </View>
  );
}

export default function RegisterScreen({
  goToLogin,
  goToHome,
}: {
  goToLogin: () => void;
  goToHome: () => void;
}) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [countryModalVisible, setCountryModalVisible] = useState(false);

  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [tempValue, setTempValue] = useState("");
  const [showTempPassword, setShowTempPassword] = useState(false);

  const floatInputRef = useRef<TextInput>(null);

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => {
    if (activeField) {
      const timer = setTimeout(() => {
        floatInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeField]);

  if (!fontsLoaded) return null;

  const openField = (field: ActiveField) => {
    if (field === "username") setTempValue(username);
    else if (field === "email") setTempValue(email);
    else if (field === "password") setTempValue(password);
    setShowTempPassword(false);
    setActiveField(field);
  };

  const confirmField = () => {
    if (activeField === "username") setUsername(tempValue);
    else if (activeField === "email") setEmail(tempValue);
    else if (activeField === "password") setPassword(tempValue);
    Keyboard.dismiss();
    setActiveField(null);
  };

  const cancelField = () => {
    Keyboard.dismiss();
    setActiveField(null);
  };

  const getFieldLabel = () => {
    if (activeField === "username") return "Username";
    if (activeField === "email") return "Email";
    if (activeField === "password") return "Password";
    return "";
  };

  const handleRegister = async () => {
    if (!email || !username || !password) {
      alert("Fill all fields");
      return;
    }
    if (!selectedCountry) {
      alert("Please select a country");
      return;
    }
    try {
      setLoading(true);
      const data = await register(
        email,
        username,
        password,
        selectedCountry.name,
      );
      if (data.session) {
        goToHome();
      } else {
        alert("Check your email to confirm your account.");
        goToLogin();
      }
    } catch (err: any) {
      console.log("REGISTER ERROR:", err);
      alert(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <ImageBackground source={churchBg} style={styles.bg} resizeMode="cover">
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>Begin with the{"\n"}Angelus</Text>
            <View style={styles.taglineContainer}>
              <Text style={[styles.heroTagline, styles.pauseText]}>Pause.</Text>
              <Text style={[styles.heroTagline, styles.listenText]}>
                Listen.
              </Text>
              <Text style={[styles.heroTagline, styles.prayText]}>Pray.</Text>
            </View>
          </View>

          <View style={styles.formSection}>
            {/* Username */}
            <TouchableOpacity
              onPress={() => openField("username")}
              activeOpacity={0.8}
            >
              <GlassInput>
                <Text
                  style={[
                    styles.textInput,
                    username ? styles.filledText : styles.placeholderText,
                  ]}
                >
                  {username || "Username"}
                </Text>
              </GlassInput>
            </TouchableOpacity>

            {/* Email */}
            <TouchableOpacity
              onPress={() => openField("email")}
              activeOpacity={0.8}
            >
              <GlassInput>
                <Text
                  style={[
                    styles.textInput,
                    email ? styles.filledText : styles.placeholderText,
                  ]}
                >
                  {email || "Email"}
                </Text>
              </GlassInput>
            </TouchableOpacity>

            {/* Password */}
            <TouchableOpacity
              onPress={() => openField("password")}
              activeOpacity={0.8}
            >
              <GlassInput
                style={{ flexDirection: "row", alignItems: "center" }}
              >
                <Text
                  style={[
                    styles.textInput,
                    { flex: 1 },
                    password ? styles.filledText : styles.placeholderText,
                  ]}
                >
                  {password
                    ? "•".repeat(Math.min(password.length, 20))
                    : "Password"}
                </Text>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color="rgba(255,230,167,0.5)"
                />
              </GlassInput>
            </TouchableOpacity>

            {/* Country picker */}
            <TouchableOpacity
              onPress={() => setCountryModalVisible(true)}
              activeOpacity={0.8}
            >
              <GlassInput
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  minHeight: 50,
                }}
              >
                <Text style={[styles.textInput, { flex: 1, color: "#FFE6A7" }]}>
                  {selectedCountry
                    ? `${selectedCountry.flag}  ${selectedCountry.name}`
                    : " Country"}
                </Text>
                <Text style={{ color: "rgba(255,230,167,0.7)", fontSize: 11 }}>
                  ▼
                </Text>
              </GlassInput>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
              style={[
                styles.nextBtn,
                loading && { backgroundColor: "#4A6A9E" },
              ]}
            >
              <Text style={styles.nextBtnText}>
                {loading ? "Creating..." : "Register"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={goToLogin}
              activeOpacity={0.7}
              style={{ alignItems: "center", marginTop: 12 }}
            >
              <Text
                style={{
                  color: "#FFE6A7",
                  fontSize: 14,
                  fontWeight: "600",
                  textDecorationLine: "underline",
                  letterSpacing: 0.3,
                }}
              >
                Sign in to your account
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* ✅ FIXED FLOATING INPUT BOTTOM SHEET */}
        <Modal
          visible={activeField !== null}
          transparent
          animationType="slide"
          statusBarTranslucent // ← ADDED
          onRequestClose={cancelField}
        >
          {/* ← ADDED: fixes keyboard pushing sheet correctly in APK */}
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={cancelField}
              style={styles.floatBackdrop}
            >
              <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                <View style={styles.floatSheet}>
                  {/* Drag Handle */}
                  <View style={styles.modalHandle} />

                  {/* Header */}
                  <View style={styles.floatHeader}>
                    <TouchableOpacity
                      onPress={cancelField}
                      style={styles.floatHeaderBtn}
                    >
                      <Text style={styles.floatCancelText}>Cancel</Text>
                    </TouchableOpacity>

                    <Text style={styles.floatTitle}>{getFieldLabel()}</Text>

                    <TouchableOpacity
                      onPress={confirmField}
                      style={[
                        styles.floatHeaderBtn,
                        { alignItems: "flex-end" },
                      ]}
                    >
                      <Text style={styles.floatDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalDivider} />

                  {/* Input */}
                  <View style={styles.floatInputRow}>
                    <TextInput
                      ref={floatInputRef}
                      value={tempValue}
                      onChangeText={setTempValue}
                      style={styles.floatTextInput}
                      placeholder={`Enter ${getFieldLabel()}`}
                      placeholderTextColor="#C0B8A8"
                      secureTextEntry={
                        activeField === "password" && !showTempPassword
                      }
                      keyboardType={
                        activeField === "email" ? "email-address" : "default"
                      }
                      autoCapitalize={
                        activeField === "email" || activeField === "password"
                          ? "none"
                          : "words"
                      }
                      returnKeyType="done"
                      onSubmitEditing={confirmField}
                      autoCorrect={false}
                    />

                    {activeField === "password" && (
                      <TouchableOpacity
                        onPress={() => setShowTempPassword((prev) => !prev)}
                        style={styles.eyeBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons
                          name={
                            showTempPassword ? "eye-outline" : "eye-off-outline"
                          }
                          size={24}
                          color="#C8922A"
                        />
                      </TouchableOpacity>
                    )}
                  </View>

                  {activeField === "password" && (
                    <Text style={styles.floatHelperText}>
                      {showTempPassword
                        ? "Password is visible"
                        : "Password is hidden"}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>

        {/* ✅ FIXED COUNTRY PICKER MODAL */}
        <Modal
          visible={countryModalVisible}
          transparent
          animationType="slide"
          statusBarTranslucent // ← ADDED
          onRequestClose={() => setCountryModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setCountryModalVisible(false)}
            style={styles.modalBackdrop}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => undefined}>
              <View style={styles.modalSheet}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>Select Your Country</Text>
                <View style={styles.modalDivider} />
                <FlatList
                  data={COUNTRIES}
                  keyExtractor={(item) => item.code}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => {
                    const isSelected = selectedCountry?.code === item.code;
                    return (
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedCountry(item);
                          setCountryModalVisible(false);
                        }}
                        style={[
                          styles.countryRow,
                          isSelected && styles.countryRowSelected,
                        ]}
                      >
                        <Text style={styles.countryFlag}>{item.flag}</Text>
                        <Text
                          style={[
                            styles.countryName,
                            isSelected && { fontWeight: "700" },
                          ]}
                        >
                          {item.name}
                        </Text>
                        {isSelected && <Text style={styles.checkmark}>✓</Text>}
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  bg: {
    flex: 1,
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingBottom: 48,
    minHeight: "100%",
  },
  heroSection: {
    paddingTop: 90,
    paddingHorizontal: 28,
    paddingBottom: 20,
  },
  heroTitle: {
    fontFamily: FONT_BODY_SEMIBOLD,
    fontSize: 34,
    color: "#1F3A6E",
    textAlign: "center",
    letterSpacing: 0.4,
    lineHeight: 42,
    marginBottom: 12,
    fontWeight: "400",
  },
  taglineContainer: {
    position: "absolute",
    top: 180,
    left: 250,
  },
  heroTagline: {
    fontFamily: "PlayfairDisplay_400Regular_Italic",
    fontSize: 23,
    color: "#FFE6A7",
    position: "absolute",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  pauseText: { top: 0, left: -50 },
  listenText: { top: 34, left: 5 },
  prayText: { top: 68, left: 50 },
  formSection: {
    paddingHorizontal: 20,
    gap: 8,
    paddingTop: 20,
  },
  glassContainer: {
    height: 52,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(200,170,90,0.7)",
    paddingHorizontal: 18,

    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "rgba(150,175,215,0.45)",
  },
  glassAndroid: {
    backgroundColor: "rgba(150,175,215,0.68)",
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "400",
    letterSpacing: 0.2,
    color: "#FFE6A7",
    textAlignVertical: "center",
    includeFontPadding: false, // Android
  },
  filledText: {
    color: "#FFE6A7",
  },
  placeholderText: {
    color: "rgba(255,230,167,0.7)",
  },
  nextBtn: {
    backgroundColor: "#C8922A",
    borderRadius: 50,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  nextBtnText: {
    color: "#FFFDF7",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.6,
  },
  floatBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  floatSheet: {
    backgroundColor: "#FFFDF7",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 50 : 48,
  },
  floatHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  floatHeaderBtn: {
    minWidth: 64,
  },
  floatTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F3A6E",
    textAlign: "center",
    flex: 1,
  },
  floatCancelText: {
    fontSize: 14,
    color: "#888",
    fontWeight: "500",
  },
  floatDoneText: {
    fontSize: 14,
    color: "#C8922A",
    fontWeight: "700",
    textAlign: "right",
  },
  floatInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: "#D4A017",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 4,
    backgroundColor: "#FFF8EE",
  },
  floatTextInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: "#1C1C1C",
    fontWeight: "400",
  },
  eyeBtn: {
    paddingLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  floatHelperText: {
    fontSize: 11,
    color: "#AAA",
    marginTop: 6,
    marginLeft: 22,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalSheet: {
    backgroundColor: "#FFFDF7",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingBottom: 40,
    maxHeight: 420,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#D4A017",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  modalTitle: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    color: "#1F3A6E",
    marginBottom: 8,
  },
  modalDivider: {
    height: 1,
    backgroundColor: "#F0EDE4",
    marginBottom: 4,
  },
  countryRow: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F0E8",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  countryRowSelected: { backgroundColor: "#F5F0E8" },
  countryFlag: { fontSize: 20 },
  countryName: {
    fontSize: 14,
    color: "#1C1C1C",
    flex: 1,
    fontWeight: "400",
  },
  checkmark: {
    color: "#D4A017",
    fontSize: 16,
    fontWeight: "bold",
  },
});
