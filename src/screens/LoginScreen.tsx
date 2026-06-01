// /src/screens/LoginScreen.tsx
import { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Image,
} from "react-native";
import { login } from "../api/authApi";
import { saveAuth } from "../store/auth";

const angelusIcon = require("../../assets/angelusdominiicon.png");

export default function LoginScreen({ onLogin, goToRegister }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const res = await login(email, password);

      if (!res.token) throw new Error("No session");

      onLogin(); // navigate first

      saveAuth(res.token, res.userId).catch(console.error);
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
          {/* Circular Logo Container */}
          <View style={{ alignItems: "center", marginBottom: 32 }}>
            <View
              style={{
                width: 260,
                height: 260,
                borderRadius: 130,
                backgroundColor: "#1F3A6E",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Image
                source={angelusIcon}
                style={{
                  width: 180,
                  height: 180,
                  resizeMode: "contain",
                }}
              />
            </View>
          </View>

          {/* Email Input */}
          <View
            style={{
              backgroundColor: "#F6F3E8",
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 4,
            }}
          >
            <TextInput
              placeholder="Username/Email"
              placeholderTextColor="#9B9588"
              value={email}
              onChangeText={setEmail}
              style={{
                height: 56,
                color: "#1C1C1C",
                fontSize: 16,
              }}
            />
          </View>

          {/* Password Input */}
          <View
            style={{
              backgroundColor: "#F6F3E8",
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 4,
            }}
          >
            <TextInput
              placeholder="Password"
              placeholderTextColor="#9B9588"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={{
                height: 56,
                color: "#1C1C1C",
                fontSize: 16,
              }}
            />
          </View>

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

          {/* Don't have an account text */}
          <View style={{ alignItems: "center", marginTop: 8 }}>
            <Text style={{ color: "#6F6A5F", fontSize: 14 }}>
              Don't have an account?
            </Text>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            onPress={() => {
              console.log("GO TO REGISTER CLICKED");
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
    </View>
  );
}
