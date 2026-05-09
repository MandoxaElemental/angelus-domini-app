import { useState } from "react";
import { View, Text, TextInput, Button } from "react-native";
import { register } from "../api/authApi";

export default function RegisterScreen({ goToLogin }: any) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !username || !password) {
      alert("Fill all fields");
      return;
    }

    try {
      setLoading(true);

      const data = await register(email, username, password);

      if (!data.session) {
        alert("Check your email to confirm your account.");
      } else {
        alert("Account created!");
      }

      goToLogin();
    } catch (err: any) {
      console.log("REGISTER ERROR:", err);
      alert(err.message || "Something went wrong");
    } finally {
      setLoading(false);
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
      <Text>Username</Text>
      <TextInput
        value={username}
        onChangeText={setUsername}
        style={{ borderWidth: 1, marginBottom: 10, width: 200 }}
      />

      <Text>Email</Text>
      <TextInput
        value={email}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        onChangeText={(text) => setEmail(text)}
        style={{ borderWidth: 1, marginBottom: 10, width: 200 }}
      />

      <Text>Password</Text>
      <TextInput
        value={password}
        secureTextEntry
        onChangeText={(text) => setPassword(text)}
        style={{ borderWidth: 1, marginBottom: 20, width: 200 }}
      />

      <Button
        title={loading ? "Creating..." : "Register"}
        onPress={handleRegister}
        disabled={loading}
      />

      <View style={{ marginTop: 15 }}>
        <Button title="Already have an account? Login" onPress={goToLogin} />
      </View>
    </View>
  );

  console.log([...email]);
}
