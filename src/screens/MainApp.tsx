import { useEffect, useState } from "react";
import { Text, View, Button, TouchableOpacity, StyleSheet } from "react-native";
import { getToken, logout } from "../store/auth";
import LoginScreen from "./LoginScreen";
import { getNextPrayerTime } from "../utils/prayer";
import { getUserId } from "../utils/user";
import { completePrayer, getGlobalCount, startPrayer } from "../api/prayerApi";
import Bell from "../components/Bell";
import { supabase } from "../lib/supabaseClient";

export default function MainApp() {
  const [timeLeft, setTimeLeft] = useState("00:00:00");
  const [session, setSession] = useState<any>(null);
  const [count, setCount] = useState(0);
  const [userId, setUserId] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      setIsLoggedIn(!!token);
    })();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = getNextPrayerTime();
      const now = new Date();
      const diff = next.getTime() - now.getTime();
      const hrs = Math.floor(diff / 1000 / 3600);
      const mins = Math.floor(((diff / 1000) % 3600) / 60);
      const secs = Math.floor((diff / 1000) % 60);
      setTimeLeft(
        `${hrs.toString().padStart(2, "0")}:${mins
          .toString()
          .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    (async () => {
      const uid = await getUserId();
      setUserId(uid);
      const sess = await startPrayer(uid);
      setSession(sess);
      const globalCount = await getGlobalCount(sess.slot);
      setCount(globalCount);
    })();
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  const handleComplete = async () => {
    if (!session) return;
    await completePrayer(userId, session.sessionId);
    const newCount = await getGlobalCount(session.slot);
    setCount(newCount);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut(); // invalidate supabase session
      await logout();               // wipe SecureStore token + userId
      setSession(null);
      setUserId("");
      setIsLoggedIn(false);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const bells = [
    { time: "6 AM", hour: 6, completed: false },
    { time: "12 PM", hour: 12, completed: false },
    { time: "6 PM", hour: 18, completed: false },
  ];

  return (
    <View style={styles.container}>
      {/* Logout button — top right */}
      <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>

      <View style={styles.inner}>
        <Text style={styles.title}>Angelus</Text>

        <Text style={styles.label}>Next Prayer In</Text>
        <Text style={styles.countdown}>{timeLeft}</Text>

        <View style={styles.bellsRow}>
          {bells.map((b, i) => (
            <Bell key={i} {...b} />
          ))}
        </View>

        <Text style={styles.globalCount}>
          🌍 {count} people prayed this slot
        </Text>

        <Button title="I Prayed 🙏" onPress={handleComplete} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  logoutBtn: {
    position: "absolute",
    top: 56,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D4A017",
  },
  logoutText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#C8922A",
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    textAlign: "center",
    marginBottom: 20,
  },
  label: {
    textAlign: "center",
    marginBottom: 8,
  },
  countdown: {
    fontSize: 32,
    textAlign: "center",
    marginBottom: 20,
  },
  bellsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 20,
    gap: 16,
  },
  globalCount: {
    textAlign: "center",
    marginBottom: 20,
  },
});