import React from "react";
import {
  TouchableOpacity,
  Text,
  View,
  ImageBackground,
  StyleSheet,
} from "react-native";
import { FadeIn } from "../../shared/FadeIn";
import { sharedStyles, width, height } from "../styles/sharedStyles";
import { BLUE } from "../../../lib/constants/colors";
import {
  FONT_BODY_SEMIBOLD,
  FONT_TITLE_ITALIC,
} from "../../../lib/constants/fonts";

type Props = {
  title: string;
  subtitle: string;
  isActive: boolean;
  onPress: () => void;
};

export function ScriptureSlide({ title, subtitle, isActive, onPress }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      style={{ width, height }}
    >
      <ImageBackground
        source={require("../../../../assets/bgsone.png")}
        style={sharedStyles.slide}
        resizeMode="cover"
      >
        <View style={sharedStyles.centerContent}>
          <FadeIn delay={180} isVisible={isActive}>
            <Text style={styles.scriptureMain}>{title}</Text>
          </FadeIn>
          <FadeIn delay={820} isVisible={isActive}>
            <Text style={styles.scriptureItalic}>{subtitle}</Text>
          </FadeIn>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scriptureMain: {
    fontFamily: FONT_BODY_SEMIBOLD,
    fontSize: 40,
    color: BLUE,
    textAlign: "center",
    letterSpacing: 0.3,
    marginTop: 70,
    lineHeight: 46,
    fontWeight: "400",
  },
  scriptureItalic: {
    fontFamily: FONT_TITLE_ITALIC,
    fontSize: 34,
    fontStyle: "italic",
    color: "#FFE6A7",
    textAlign: "center",
    marginTop: 400,
    letterSpacing: 0.2,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});