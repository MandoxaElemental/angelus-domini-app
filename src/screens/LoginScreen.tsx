// /src/screens/LoginScreen.tsx
import { useState } from "react";
import { View, TextInput, Button, Text } from "react-native";
import { login } from "../api/authApi";
import { saveAuth } from "../store/auth";

export default function LoginScreen({ onLogin, goToRegister }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
    <View
      style={{
        padding: 20,
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Email</Text>
      <TextInput
        onChangeText={setEmail}
        style={{ borderWidth: 1, marginBottom: 10 }}
      />

      <Text>Password</Text>
      <TextInput
        secureTextEntry
        onChangeText={setPassword}
        style={{ borderWidth: 1 }}
      />
      <View style={{ marginTop: 15 }}>
        <Button title="Login" onPress={handleLogin} />
      </View>

      <View style={{ marginTop: 15 }}>
        <Button
          title="Create Account"
          onPress={() => {
            console.log("GO TO REGISTER CLICKED");
            goToRegister();
          }}
        />{" "}
      </View>
    </View>
  );
}
