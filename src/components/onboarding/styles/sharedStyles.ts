import { Dimensions, StyleSheet } from "react-native";
import {
  BLUE,
  DIVIDER,
  GOLD,
  IVORY,
  PARCHMENT,
  TEXT_MUTED,
} from "../../../lib/constants/colors";
import { FONT_BODY, FONT_BODY_SEMIBOLD } from "../../../lib/constants/fonts";

const { width, height } = Dimensions.get("window");

export { width, height };

export const sharedStyles = StyleSheet.create({
  slide: {
    width,
    height,
    backgroundColor: PARCHMENT,
    alignItems: "center",
    justifyContent: "space-between",
  },
  church: {
    width,
    height,
    backgroundColor: "#6E87AF",
    alignItems: "center",
    justifyContent: "space-between",
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  navArea: {
    width: "100%",
    paddingHorizontal: 26,
    paddingBottom: 60,
    alignItems: "center",
  },
  ctaWrap: {
    width: "100%",
    marginTop: 20,
  },
  primaryBtn: {
    paddingVertical: 18,
    borderRadius: 50,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 6,
  },
  primaryText: {
    fontFamily: FONT_BODY,
    textAlign: "center",
    color: IVORY,
    fontSize: 18,
    fontWeight: "400",
  },
  skipUnderlineWrap: {
    alignItems: "center",
    marginTop: 16,
  },
  skipUnderlineText: {
    color: "#6F8FAF",
    fontFamily: FONT_BODY_SEMIBOLD,
    fontSize: 15,
    textDecorationLine: "underline",
  },
  skip: {
    position: "absolute",
    top: 56,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: DIVIDER,
    backgroundColor: "rgba(253,250,240,0.7)",
  },
  skipText: {
    color: "#6F8FAF",
    fontFamily: FONT_BODY_SEMIBOLD,
    fontSize: 15,
  },
  skipOnDark: {
    position: "absolute",
    top: 56,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  skipTextOnDark: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: FONT_BODY_SEMIBOLD,
    fontSize: 15,
  },
  dots: {
    flexDirection: "row",
    marginBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    backgroundColor: DIVIDER,
    marginHorizontal: 5,
    borderRadius: 4,
  },
  activeDot: {
    width: 24,
    backgroundColor: GOLD,
    borderRadius: 4,
  },
});
