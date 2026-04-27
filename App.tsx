import { useEffect, useState } from "react";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import { getToken } from "./src/store/auth";
import MainApp from "./src/screens/MainApp";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [screen, setScreen] = useState<"login" | "register">("login");

  useEffect(() => {
    (async () => {
      const token = await getToken();
      setIsLoggedIn(!!token);
    })();
  }, []);

  if (isLoggedIn) {
    return <MainApp />;
  }

  if (screen === "login") {
    return (
      <LoginScreen
        onLogin={() => setIsLoggedIn(true)}
        goToRegister={() => setScreen("register")}
      />
    );
  }

  return <RegisterScreen goToLogin={() => setScreen("login")} />;
}
