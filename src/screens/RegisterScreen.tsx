import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  FlatList,
  StyleSheet,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";
import * as SplashScreen from "expo-splash-screen";
import { register } from "../api/authApi";

SplashScreen.preventAutoHideAsync();

const angelusIcon = require("../../assets/login_icons.png");

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
    if (activeField === "username") {
      if (tempValue.length < 6 || tempValue.length > 10) {
        alert("Username must be between 6 and 10 characters");
        return;
      }
      setUsername(tempValue);
    } else if (activeField === "email") setEmail(tempValue);
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
    if (username.length < 6 || username.length > 10) {
      alert("Username must be between 6 and 10 characters");
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
    <View style={{ flex: 1, backgroundColor: "#FFFDF7" }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            gap: 16,
            paddingVertical: 60,
          }}
        >
          {/* Logo */}
          <View style={{ alignItems: "center", marginBottom: 32 }}>
            <View
              style={{
                width: 240,
                height: 240,
                borderRadius: 180,
                backgroundColor: "#1F3A6E",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 8,
                marginTop: -20,
              }}
            >
              <Image
                source={angelusIcon}
                style={{ width: 300, height: 200, resizeMode: "contain" }}
              />
            </View>
          </View>

          {/* ← ADDED: Heading */}
          <Text style={styles.formHeading}>Create your Account</Text>

          {/* Username Field */}
          <TouchableOpacity
            onPress={() => openField("username")}
            activeOpacity={0.8}
          >
            <View
              style={{
                backgroundColor: "#F6F3E8",
                borderRadius: 12,
                paddingHorizontal: 16,
                height: 56,
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: username ? "#1C1C1C" : "#9B9588",
                }}
              >
                {username || "Username"}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Email Field */}
          <TouchableOpacity
            onPress={() => openField("email")}
            activeOpacity={0.8}
          >
            <View
              style={{
                backgroundColor: "#F6F3E8",
                borderRadius: 12,
                paddingHorizontal: 16,
                height: 56,
                justifyContent: "center",
              }}
            >
              <Text
                style={{ fontSize: 16, color: email ? "#1C1C1C" : "#9B9588" }}
              >
                {email || "Email"}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Password Field */}
          <TouchableOpacity
            onPress={() => openField("password")}
            activeOpacity={0.8}
          >
            <View
              style={{
                backgroundColor: "#F6F3E8",
                borderRadius: 12,
                paddingHorizontal: 16,
                height: 56,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: password ? "#1C1C1C" : "#9B9588",
                }}
              >
                {password
                  ? "•".repeat(Math.min(password.length, 20))
                  : "Password"}
              </Text>
              <Ionicons name="lock-closed-outline" size={20} color="#9B9588" />
            </View>
          </TouchableOpacity>

          {/* Country Picker Field */}
          <TouchableOpacity
            onPress={() => setCountryModalVisible(true)}
            activeOpacity={0.8}
          >
            <View
              style={{
                backgroundColor: "#F6F3E8",
                borderRadius: 12,
                paddingHorizontal: 16,
                height: 56,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: selectedCountry ? "#1C1C1C" : "#9B9588",
                }}
              >
                {selectedCountry
                  ? `${selectedCountry.flag}  ${selectedCountry.name}`
                  : "Country"}
              </Text>
              <Text style={{ color: "#9B9588", fontSize: 11 }}>▼</Text>
            </View>
          </TouchableOpacity>

          {/* Register Button */}
          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
            style={{
              backgroundColor: loading ? "#4A6A9E" : "#1F3A6E",
              borderRadius: 50,
              height: 56,
              justifyContent: "center",
              alignItems: "center",
              marginTop: 8,
            }}
          >
            <Text
              style={{ color: "#FFFDF7", fontWeight: "bold", fontSize: 16 }}
            >
              {loading ? "Creating..." : "Register"}
            </Text>
          </TouchableOpacity>

          <View style={{ alignItems: "center", marginTop: 8 }}>
            <Text style={{ color: "#6F6A5F", fontSize: 14 }}>
              Already have an account?
            </Text>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            onPress={goToLogin}
            activeOpacity={0.7}
            style={{
              backgroundColor: "transparent",
              borderRadius: 50,
              height: 56,
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 2,
              borderColor: "#D4A017",
            }}
          >
            <Text
              style={{ color: "#D4A017", fontWeight: "bold", fontSize: 16 }}
            >
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ✅ FLOATING INPUT BOTTOM SHEET */}
      <Modal
        visible={activeField !== null}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={cancelField}
      >
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
                    style={[styles.floatHeaderBtn, { alignItems: "flex-end" }]}
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
                    maxLength={activeField === "username" ? 10 : undefined}
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
                        color="#1F3A6E"
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

                {activeField === "username" && (
                  <Text style={styles.floatHelperText}>
                    Username must be 6-10 characters
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ✅ COUNTRY PICKER MODAL */}
      <Modal
        visible={countryModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
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
    </View>
  );
}

const styles = StyleSheet.create({
  // ← ADDED
  formHeading: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F3A6E",
    textAlign: "center",
    marginBottom: 8,
    marginTop: -40,
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
    paddingBottom: Platform.OS === "ios" ? 40 : 28,
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
    color: "#1F3A6E",
    fontWeight: "700",
    textAlign: "right",
  },
  floatInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: "#1F3A6E",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 4,
    backgroundColor: "#F6F3E8",
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