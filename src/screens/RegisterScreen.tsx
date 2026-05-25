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
} from "react-native";
import { useState, useEffect } from "react";
import { BlurView } from "expo-blur";
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";
import * as SplashScreen from "expo-splash-screen";
import { register } from "../api/authApi";

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

function GlassInput({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  if (Platform.OS === "ios") {
    return (
      <BlurView intensity={95} tint="light" style={[styles.glassContainer, style]}>
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

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

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
        selectedCountry.name
      );

      if (data.session) {
        goToHome(); // ✅ auto login → go to MainApp
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
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ImageBackground source={churchBg} style={styles.bg} resizeMode="cover">
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>Begin with the{"\n"}Angelus</Text>
            <View style={styles.taglineContainer}>
              <Text style={[styles.heroTagline, styles.pauseText]}>Pause.</Text>
              <Text style={[styles.heroTagline, styles.listenText]}>Listen.</Text>
              <Text style={[styles.heroTagline, styles.prayText]}>Pray.</Text>
            </View>
          </View>

          <View style={styles.formSection}>
            <GlassInput>
              <TextInput
                placeholder="Username"
                placeholderTextColor="rgba(255,230,167,0.7)"
                value={username}
                onChangeText={setUsername}
                style={styles.textInput}
              />
            </GlassInput>

            <GlassInput>
              <TextInput
                placeholder="Email"
                placeholderTextColor="rgba(255,230,167,0.7)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.textInput}
              />
            </GlassInput>

            <GlassInput>
              <TextInput
                placeholder="Password"
                placeholderTextColor="rgba(255,230,167,0.7)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.textInput}
              />
            </GlassInput>

            <TouchableOpacity
              onPress={() => setCountryModalVisible(true)}
              activeOpacity={0.8}
            >
              <GlassInput style={{ flexDirection: "row", alignItems: "center", minHeight: 50 }}>
                <Text style={[styles.textInput, { flex: 1, color: "#FFE6A7" }]}>
                  {selectedCountry
                    ? `${selectedCountry.flag}  ${selectedCountry.name}`
                    : " Country"}
                </Text>
                <Text style={{ color: "rgba(255,230,167,0.7)", fontSize: 11 }}>▼</Text>
              </GlassInput>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
              style={[styles.nextBtn, loading && { backgroundColor: "#4A6A9E" }]}
            >
              <Text style={styles.nextBtnText}>
                {loading ? "Creating..." : "Register"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={goToLogin}
              activeOpacity={0.85}
              style={styles.loginBtn}
            >
              <Text style={styles.loginBtnText}>
                Already have an account? Login
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <Modal
          visible={countryModalVisible}
          transparent
          animationType="slide"
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
                        {isSelected && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
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
    top: 0, left: 0, right: 0, bottom: 0,
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
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 34,
    color: "#1F3A6E",
    textAlign: "center",
    letterSpacing: 0.4,
    lineHeight: 42,
    marginBottom: 12,
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
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(200,170,90,0.7)",
    paddingHorizontal: 18,
    paddingVertical: 0,
    minHeight: 50,
    justifyContent: "center",
    backgroundColor: "rgba(150,175,215,0.45)",
  },
  glassAndroid: {
    backgroundColor: "rgba(150,175,215,0.68)",
  },
  textInput: {
    height: 42,
    color: "#FFE6A7",
    fontSize: 12,
    fontWeight: "400",
    letterSpacing: 0.2,
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
  loginBtn: {
    backgroundColor: "transparent",
    borderRadius: 50,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#D4A017",
    marginTop: 4,
  },
  loginBtnText: {
    color: "#FFE6A7",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.4,
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