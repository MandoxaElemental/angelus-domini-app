import { useState, useEffect, useRef } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  StyleSheet,
  Platform,
  Keyboard,
  KeyboardAvoidingView, // ← ADDED
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { login } from "../api/authApi";
import { saveAuth } from "../store/auth";

const angelusIcon = require("../../assets/AngelusLogo2.png");

type ActiveField = "email" | "password" | null;

export default function LoginScreen({ onLogin, goToRegister }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
    if (field === "email") setTempValue(email);
    else if (field === "password") setTempValue(password);
    setShowTempPassword(false);
    setActiveField(field);
  };

  const confirmField = () => {
    if (activeField === "email") setEmail(tempValue);
    else if (activeField === "password") setPassword(tempValue);
    Keyboard.dismiss();
    setActiveField(null);
  };

  const cancelField = () => {
    Keyboard.dismiss();
    setActiveField(null);
  };

  const getFieldLabel = () => {
    if (activeField === "email") return "Username/Email";
    if (activeField === "password") return "Password";
    return "";
  };

  const handleLogin = async () => {
    try {
      const res = await login(email, password);
      if (!res.token) throw new Error("No session");
      await saveAuth(res.token, res.userId);
      onLogin();
    } catch (err: any) {
      alert(err.message || "Invalid login");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFDF7" }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24 }}
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
                width: 300,
                height: 300,
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Image
                source={angelusIcon}
                style={{ width: 300, height: 300, resizeMode: "contain" }}
              />
            </View>
          </View>

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

          {/* Login Button */}
          <TouchableOpacity
            onPress={handleLogin}
            style={{
              backgroundColor: "#1F3A6E",
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
              Login
            </Text>
          </TouchableOpacity>

          <View style={{ alignItems: "center", marginTop: 8 }}>
            <Text style={{ color: "#6F6A5F", fontSize: 14 }}>
              Don't have an account?
            </Text>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            onPress={() => {
              goToRegister();
            }}
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
              Register
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ✅ FIXED FLOATING INPUT BOTTOM SHEET */}
      <Modal
        visible={activeField !== null}
        transparent
        animationType="slide"
        statusBarTranslucent // ← ADDED: fixes backdrop in APK
        onRequestClose={cancelField}
      >
        {/* ← ADDED: fixes keyboard pushing sheet up correctly in APK */}
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
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: 4,
  },
});
