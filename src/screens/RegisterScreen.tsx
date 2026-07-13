import { useState, useEffect, useRef } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  StyleSheet,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  Image,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { register } from "../api/authApi";

const angelusIcon = require("../../assets/AngelusLogo2.png");

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
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

  const [loading, setLoading] = useState(false);

  const [countryModalVisible, setCountryModalVisible] = useState(false);

  const [activeField, setActiveField] = useState<ActiveField>(null);

  const [tempValue, setTempValue] = useState("");

  const [showTempPassword, setShowTempPassword] = useState(false);

  const floatInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (activeField) {
      const timer = setTimeout(() => {
        floatInputRef.current?.focus();
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [activeField]);

  const openField = (field: ActiveField) => {
    if (field === "username") setTempValue(username);

    if (field === "email") setTempValue(email);

    if (field === "password") setTempValue(password);

    setShowTempPassword(false);
    setActiveField(field);
  };

  const confirmField = () => {
    if (activeField === "username") setUsername(tempValue);

    if (activeField === "email") setEmail(tempValue);

    if (activeField === "password") setPassword(tempValue);

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
    if (loading) return;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const cleanUsername = username.trim();
    const cleanEmail = email.trim();

    if (!cleanUsername || !cleanEmail || !password) {
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
        cleanEmail,
        cleanUsername,
        password,
        selectedCountry.name,
        timezone,
      );

      if (data.session) {
        goToHome();
      } else {
        alert("Check your email to confirm your account.");
        goToLogin();
      }
    } catch (err: any) {
      const msg = err?.message ?? "";

      if (msg.toLowerCase().includes("already")) {
        alert("An account with this email already exists.");
      } else {
        alert(msg || "Unable to create your account.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.center}>
          <Image source={angelusIcon} style={styles.logo} />

          <Text style={styles.title}>Create your account</Text>

          <TouchableOpacity
            onPress={() => openField("username")}
            activeOpacity={0.8}
          >
            <View style={styles.inputBox}>
              <Text style={[styles.inputText, username && styles.filledText]}>
                {username || "Username"}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => openField("email")}
            activeOpacity={0.8}
          >
            <View style={styles.inputBox}>
              <Text style={[styles.inputText, email && styles.filledText]}>
                {email || "Email"}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => openField("password")}
            activeOpacity={0.8}
          >
            <View style={styles.inputBox}>
              <Text style={[styles.inputText, password && styles.filledText]}>
                {password
                  ? "•".repeat(Math.min(password.length, 20))
                  : "Password"}
              </Text>

              <Ionicons name="lock-closed-outline" size={20} color="#9B9588" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setCountryModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.inputBox}>
              <Text
                style={[styles.inputText, selectedCountry && styles.filledText]}
              >
                {selectedCountry
                  ? `${selectedCountry.flag} ${selectedCountry.name}`
                  : "Country"}
              </Text>

              <Ionicons name="chevron-down" size={20} color="#9B9588" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            style={[styles.primaryButton, loading && { opacity: 0.6 }]}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? "Creating..." : "Register"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.secondaryText}>Already have an account?</Text>

          <TouchableOpacity onPress={goToLogin} style={styles.outlineButton}>
            <Text style={styles.outlineButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {/* Floating Input Bottom Sheet */}

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
                <View style={styles.modalHandle} />

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
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={confirmField}
                    autoCorrect={false}
                    textContentType={
                      activeField === "email"
                        ? "emailAddress"
                        : activeField === "password"
                          ? "newPassword"
                          : "username"
                    }
                    autoComplete={
                      activeField === "email"
                        ? "email"
                        : activeField === "password"
                          ? "new-password"
                          : "username"
                    }
                  />

                  {activeField === "password" && (
                    <TouchableOpacity
                      onPress={() => setShowTempPassword((prev) => !prev)}
                      style={styles.eyeBtn}
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
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Country Picker */}

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
          style={styles.floatBackdrop}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.countrySheet}>
              <View style={styles.modalHandle} />

              <Text style={styles.countryTitle}>Select Your Country</Text>

              <View style={styles.modalDivider} />

              <FlatList
                data={COUNTRIES}
                keyExtractor={(item) => item.code}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const selected = selectedCountry?.code === item.code;

                  return (
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedCountry(item);
                        setCountryModalVisible(false);
                      }}
                      style={[
                        styles.countryRow,
                        selected && styles.countrySelected,
                      ]}
                    >
                      <Text style={styles.flag}>{item.flag}</Text>

                      <Text style={styles.countryName}>{item.name}</Text>

                      {selected && <Text style={styles.check}>✓</Text>}
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
  container: {
    flex: 1,
    backgroundColor: "#FFFDF7",
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    gap: 16,
    paddingVertical: 60,
  },

  logo: {
    width: 240,
    height: 240,
    resizeMode: "contain",
    alignSelf: "center",
    marginBottom: 20,
  },

  title: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: "#1F3A6E",
    marginBottom: 8,
  },

  inputBox: {
    height: 56,
    backgroundColor: "#F6F3E8",
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
    flexDirection: "row",
    alignItems: "center",
  },

  inputText: {
    flex: 1,
    fontSize: 16,
    color: "#9B9588",
  },

  filledText: {
    color: "#1C1C1C",
  },

  primaryButton: {
    height: 56,
    backgroundColor: "#1F3A6E",
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },

  primaryButtonText: {
    color: "#FFFDF7",
    fontSize: 16,
    fontWeight: "bold",
  },

  secondaryText: {
    textAlign: "center",
    marginTop: 8,
    color: "#6F6A5F",
    fontSize: 14,
  },

  outlineButton: {
    height: 56,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#D4A017",
    justifyContent: "center",
    alignItems: "center",
  },

  outlineButtonText: {
    color: "#D4A017",
    fontWeight: "bold",
    fontSize: 16,
  },

  /* Floating sheet */

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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  floatHeaderBtn: {
    minWidth: 64,
  },

  floatTitle: {
    flex: 1,
    textAlign: "center",
    color: "#1F3A6E",
    fontWeight: "700",
    fontSize: 15,
  },

  floatCancelText: {
    color: "#888",
    fontSize: 14,
  },

  floatDoneText: {
    color: "#1F3A6E",
    fontWeight: "700",
    fontSize: 14,
  },

  floatInputRow: {
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: "#1F3A6E",
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6F3E8",
  },

  floatTextInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: "#1C1C1C",
  },

  eyeBtn: {
    paddingLeft: 8,
  },

  floatHelperText: {
    marginTop: 6,
    marginLeft: 22,
    color: "#AAA",
    fontSize: 11,
  },

  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#D4A017",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },

  modalDivider: {
    height: 1,
    backgroundColor: "#F0EDE4",
  },

  /* Country */

  countrySheet: {
    backgroundColor: "#FFFDF7",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: 420,
    paddingTop: 10,
    paddingBottom: 40,
  },

  countryTitle: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    color: "#1F3A6E",
    marginBottom: 10,
  },

  countryRow: {
    height: 52,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F5F0E8",
  },

  countrySelected: {
    backgroundColor: "#F6F3E8",
  },

  flag: {
    fontSize: 22,
    marginRight: 12,
  },

  countryName: {
    flex: 1,
    fontSize: 15,
    color: "#1C1C1C",
  },

  check: {
    color: "#D4A017",
    fontWeight: "bold",
    fontSize: 18,
  },
});
