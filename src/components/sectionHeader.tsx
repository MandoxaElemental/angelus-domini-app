import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Polygon } from "react-native-svg";

type Props = {
  size?: number;
};

export function EightPointStar({
  size = 18,
  color = "#C9A44C",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* Vertical */}
      <Polygon points="50,0 47.5,46 52.5,46" fill={color} />
      <Polygon points="50,100 47.5,54 52.5,54" fill={color} />

      {/* Horizontal */}
      <Polygon points="22,50 46,47.5 46,52.5" fill={color} />
      <Polygon points="78,50 54,47.5 54,52.5" fill={color} />

      {/* Diagonals */}
      <Polygon points="34,34 47.5,47.5 49.5,45.5" fill={color} />
      <Polygon points="66,34 52.5,47.5 50.5,45.5" fill={color} />
      <Polygon points="66,66 52.5,52.5 50.5,54.5" fill={color} />
      <Polygon points="34,66 47.5,52.5 49.5,54.5" fill={color} />

      {/* Center */}
      <Polygon points="50,45 55,50 50,55 45,50" fill={color} />
    </Svg>
  );
}

export function SectionHeader({ size = 40 }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.line} />

      <EightPointStar size={size} />

      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 5,
  },
  line: {
    flex: 1,
    width: 150,
    height: 1,
    backgroundColor: "#C9A44C",
    marginHorizontal: 10,
  },
});
