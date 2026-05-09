import { useEffect, useState } from "react";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import { getToken } from "./src/store/auth";
import MainApp from "./src/screens/MainApp";
import PrayerScreen from "./src/screens/PrayerScreen";

export default function App() {
  return <PrayerScreen />;
  // const [isLoggedIn, setIsLoggedIn] = useState(false);
  // const [loading, setLoading] = useState(true);
  // const [screen, setScreen] = useState<"login" | "register">("login");
  // console.log("SUPABASE ENV:", {
  //   url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  //   key: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  // });
  // useEffect(() => {
  //   (async () => {
  //     try {
  //       console.log("GETTING TOKEN...");
  //       const token = await getToken();
  //       console.log("TOKEN:", token);

  //       setIsLoggedIn(!!token);
  //     } catch (err) {
  //       console.error("GET TOKEN ERROR:", err);
  //     } finally {
  //       setLoading(false);
  //       console.log("LOADING FALSE");
  //     }
  //   })();
  // }, []);

  // if (loading) {
  //   return <div style={{ color: "black" }}>Loading...</div>;
  // }

  // if (isLoggedIn) {
  //   return <MainApp />;
  // }

  // if (screen === "login") {
  //   return (
  //     <LoginScreen
  //       onLogin={() => setIsLoggedIn(true)}
  //       goToRegister={() => setScreen("register")}
  //     />
  //   );
  // }

  // return <RegisterScreen goToLogin={() => setScreen("login")} />;
}
