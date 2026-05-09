import { useEffect, useState } from "react";
import { Text, View, Button } from "react-native";
import { getNextPrayerTime } from "../utils/prayer";
import { getUserId } from "../utils/user";
import { completePrayer, getGlobalCount, startPrayer } from "../api/prayerApi";
import Bell from "../components/Bell";

export default function MainApp() {
  const [timeLeft, setTimeLeft] = useState("00:00:00");
  const [session, setSession] = useState<any>(null);
  const [count, setCount] = useState(0);
  const [userId, setUserId] = useState("");

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
          .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`,
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    (async () => {
      const uid = await getUserId();
      setUserId(uid);

      const session = await startPrayer(uid);
      setSession(session);

      const count = await getGlobalCount(session.slot);
      setCount(count);
    })();
  }, []);

  const handleComplete = async () => {
    if (!session) return;

    await completePrayer(userId, session.sessionId);

    const newCount = await getGlobalCount(session.slot);
    setCount(newCount);
  };

  const bells = [
    { time: "6 AM", hour: 6, completed: false },
    { time: "12 PM", hour: 12, completed: false },
    { time: "6 PM", hour: 18, completed: false },
  ];

  return (
    <View
      style={{
        padding: 20,
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <View
        style={{
          padding: 20,
          marginTop: 60,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 24, textAlign: "center" }}>Angelus</Text>

        {/* Countdown */}
        <Text style={{ textAlign: "center", marginVertical: 20 }}>
          Next Prayer In
        </Text>
        <Text style={{ fontSize: 32, textAlign: "center" }}>{timeLeft}</Text>

        {/* Bells */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-around",
            marginVertical: 20,
          }}
        >
          {bells.map((b, i) => (
            <Bell key={i} {...b} />
          ))}
        </View>

        {/* Global Count */}
        <Text style={{ textAlign: "center", marginBottom: 20 }}>
          🌍 {count} people prayed this slot
        </Text>

        {/* Complete Button */}
        <Button title="I Prayed 🙏" onPress={handleComplete} />
      </View>
    </View>
  );
}
