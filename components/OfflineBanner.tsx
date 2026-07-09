import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  visible: boolean;
  message?: string;
};

export default function OfflineBanner({
  visible,
  message = "You're offline. Some features may be unavailable until you're back online.",
}: Props) {
  const [dismissed, setDismissed] = useState(false);

  const bannerY = useRef(new Animated.Value(-70)).current;

  useEffect(() => {
    if (visible) {
      setDismissed(false);
    }

    Animated.spring(bannerY, {
      toValue: visible && !dismissed ? 0 : -70,
      useNativeDriver: true,
    }).start();
  }, [visible, dismissed]);

  if (!visible && dismissed) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          transform: [
            {
              translateY: bannerY,
            },
          ],
        },
      ]}
    >
      <View style={styles.left}>
        <Ionicons name="cloud-offline-outline" size={20} color="#C9A24A" />

        <Text style={styles.text}>{message}</Text>
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

    backgroundColor: "#23385fc6",

    borderRadius: 18,

    paddingHorizontal: 16,
    paddingVertical: 10,

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

  text: {
    flex: 1,

    marginLeft: 10,

    color: "#FFF",

    fontSize: 15,

    lineHeight: 20,
  },
});
