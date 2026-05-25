import React from "react";
import { View, StyleSheet, Image, Animated } from "react-native";

export default function AppHeader({ bellRotate, ringScale, ringOpacity }: any) {
  return (
    <View style={styles.header}>
      <Image source={require("../../assets/Logo.png")} style={styles.logo} />

      <View style={styles.bellContainer}>
        <Animated.Image
          source={require("../../assets/ring.png")}
          style={[
            styles.bellEffect,
            {
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            },
          ]}
        />

        <Animated.Image
          source={require("../../assets/bell.png")}
          style={[
            styles.bellImage,
            {
              transform: [{ rotate: bellRotate }],
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 100,
    backgroundColor: "#2F4A7A",
    paddingRight: 24,
    paddingLeft: 12,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bellContainer: {
    width: 85,
    height: 85,
    justifyContent: "center",
    alignItems: "center",
  },

  bellImage: {
    width: 85,
    height: 85,
    position: "absolute",
    zIndex: 2,
  },

  bellEffect: {
    width: 85,
    height: 85,
    position: "absolute",
    zIndex: 1,
  },
  logo: {
    width: 140,
    height: 40,
    resizeMode: "contain",
  },
});
