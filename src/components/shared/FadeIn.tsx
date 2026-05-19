import React, { useRef, useEffect } from "react";
import { Animated } from "react-native";

type FadeInProps = {
  children: React.ReactNode;
  delay?: number;
  isVisible: boolean;
  style?: any;
};

export function FadeIn({ children, delay = 0, isVisible, style }: FadeInProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  return (
    <Animated.View style={[{ opacity }, style]}>
      {children}
    </Animated.View>
  );
}