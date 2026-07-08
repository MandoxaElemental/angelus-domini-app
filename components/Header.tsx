import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Image, Animated } from "react-native";

const ALERT_HOURS = [6, 12, 18];

export default function AppHeader() {
  const bellRotate = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  const runBellAnimation = () => {
    bellRotate.setValue(0);
    ringScale.setValue(1);
    ringOpacity.setValue(0);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(bellRotate, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(bellRotate, {
          toValue: -1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(bellRotate, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(bellRotate, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),

      Animated.parallel([
        Animated.timing(ringScale, {
          toValue: 1.4,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacity, {
          toValue: 0.7,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      Animated.timing(ringOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      ringScale.setValue(1);
    });
  };

  useEffect(() => {
    const checkTime = () => {
      const now = new Date();

      const isAlertTime =
        ALERT_HOURS.includes(now.getHours()) && now.getMinutes() === 0;

      if (isAlertTime) {
        runBellAnimation();
      }
    };

    checkTime();

    const interval = setInterval(checkTime, 60_000);

    return () => clearInterval(interval);
  }, []);

  const rotateInterpolate = bellRotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-15deg", "15deg"],
  });

  const lastTriggered = useRef<string | null>(null);

  const checkTime = () => {
    const now = new Date();

    const key = `${now.getHours()}-${now.getDate()}`;

    const isAlertTime =
      ALERT_HOURS.includes(now.getHours()) && now.getMinutes() === 0;

    if (isAlertTime && lastTriggered.current !== key) {
      lastTriggered.current = key;
      runBellAnimation();
    }
  };

  return (
    <View style={styles.header}>
      <Image source={require("../assets/Angelus_Domini_(1500_x_475_px).png")} style={styles.logo} />

      <View style={styles.bellContainer}>
        <Animated.Image
          source={require("../assets/ring.png")}
          style={[
            styles.bellEffect,
            {
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            },
          ]}
        />

        <Animated.Image
          source={require("../assets/bell.png")}
          style={[
            styles.bellImage,
            {
              transform: [{ rotate: rotateInterpolate }],
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: { width: 140, height: 40, resizeMode: "contain" },
  bellContainer: {
    width: 85,
    height: 85,
    justifyContent: "center",
    alignItems: "center",
  },
  bellImage: { width: 85, height: 85, position: "absolute", zIndex: 2 },
  bellEffect: { width: 85, height: 85, position: "absolute", zIndex: 1 },
});
