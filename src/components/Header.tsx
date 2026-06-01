import { View, Image, Animated, StyleSheet } from "react-native";

type Props = {
  ringOpacity: Animated.Value;
  ringScale: Animated.Value;
  bellRotate: Animated.Value;
};

export default function Header({ ringOpacity, ringScale, bellRotate }: Props) {
  return (
    <View style={styles.header}>
      <Image source={require("../../assets/Logo.png")} style={styles.logo} />

      <View style={styles.bellContainer}>
        <Animated.Image
          source={require("../../assets/ring.png")}
          style={[
            styles.bellEffect,
            { opacity: ringOpacity, transform: [{ scale: ringScale }] },
          ]}
          resizeMode="contain"
        />

        <Animated.Image
          source={require("../../assets/bell.png")}
          resizeMode="contain"
          style={[
            styles.bellImage,
            {
              transform: [
                {
                  rotate: bellRotate.interpolate({
                    inputRange: [-1, 1],
                    outputRange: ["-12deg", "12deg"],
                  }),
                },
              ],
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
