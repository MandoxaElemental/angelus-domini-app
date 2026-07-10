import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  visible: boolean;
  pendingCount?: number;
};

export default function SyncBanner({ visible, pendingCount = 0 }: Props) {
  const [dismissed, setDismissed] = useState(false);

  const bannerY = useRef(new Animated.Value(-70)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setDismissed(false);
    }

    Animated.spring(bannerY, {
      toValue: visible && !dismissed ? 0 : -70,
      useNativeDriver: true,
    }).start();
  }, [visible, dismissed]);

  useEffect(() => {
    if (!visible) return;

    const animation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    animation.start();

    return () => animation.stop();
  }, [visible]);

  if (!visible && dismissed) {
    return null;
  }

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          transform: [{ translateY: bannerY }],
        },
      ]}
    >
      <View style={styles.left}>
        <Animated.View
          style={{
            transform: [{ rotate }],
          }}
        >
          <Ionicons name="sync-circle" size={24} color="#D4AF57" />
        </Animated.View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.title}>Syncing prayers...</Text>

          <Text style={styles.text}>
            {pendingCount === 1
              ? "Uploading your offline prayer."
              : `Uploading ${pendingCount} offline prayers.`}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => {
          Animated.timing(bannerY, {
            toValue: -70,
            duration: 220,
            useNativeDriver: true,
          }).start(() => {
            setDismissed(true);
          });
        }}
      >
        <Ionicons name="close" size={22} color="#FFF" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",

    top: 10,
    left: 16,
    right: 16,

    zIndex: 999,

    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#2F4A7AEE",

    borderRadius: 18,

    paddingHorizontal: 16,
    paddingVertical: 11,

    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 6,
  },

  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  title: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },

  text: {
    color: "#F4F4F4",
    fontSize: 13,
    lineHeight: 18,
  },
});
