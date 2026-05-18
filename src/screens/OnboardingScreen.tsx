import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  StyleSheet,
  Platform,
  Linking,
  Alert,
  Image,
  ImageBackground,
  ScrollView,
} from "react-native";
import { useState, useRef, useEffect } from "react";
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_700Bold_Italic,
} from "@expo-google-fonts/playfair-display";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Animated } from "react-native";

SplashScreen.preventAutoHideAsync();

const { width, height } = Dimensions.get("window");

const FONT_TITLE_BOLD = "PlayfairDisplay_400Bold";
const FONT_TITLE_ITALIC = "PlayfairDisplay_400Regular_Italic";
const FONT_BODY = "PlayfairDisplay_400Regular";
const FONT_BODY_SEMIBOLD = "PlayfairDisplay_600SemiBold";

const BLUE = "#1F3A6E";
const GOLD = "#C9960C";
const PARCHMENT = "#F5F2E7";
const IVORY = "#FDFAF0";
const TEXT_SECONDARY = "#6F6A5F";
const TEXT_MUTED = "#9B9588";
const DIVIDER = "#E2DAC4";

const ONBOARDING_SCREENS = [
  {
    id: 1,
    type: "scripture",
    title: "And the Word\nwas made flesh",
    subtitle: "and dwelt among us",
  },
  {
    id: 2,
    type: "welcome",
    title: "Welcome to\nAngelus Domini",
    description: "Join Catholics around the world praying the Angelus each day.",
    prayerTimes: ["6 AM", "12 PM", "6 PM"],
  },
  {
    id: 3,
    type: "rhythm",
    title: "Set your\nDaily Rhythm",
    description: "Pause with the Church at the\ntraditional hours of prayer.",
    slots: [
      { label: "Morning", time: "6:00 AM",  image: require("../../assets/1.png") },
      { label: "Noon",    time: "12:00 PM", image: require("../../assets/2.png") },
      { label: "Evening", time: "6:00 PM",  image: require("../../assets/3.png") },
    ],
  },
  {
    id: 4,
    type: "bells",
    title: "Hear the Bells",
    description: "Your phone rings like Church\nBells when it's time to pray the\nAngelus.",
    illustration: require("../../assets/notificationsbg.png"),
    buttonText: "Continue",
    isNotificationSlide: false,
  },
  {
    id: 5,
    type: "community",
    title: "United in \n Prayer Around \nthe World",
    description: "See how many prayed the Angelus with you across the world.",
    buttonText: "Continue",
  },
  {
    id: 6,
    type: "meditation",
    title: "A Meditation\non the \n Incarnation",
    description: "Build the spiritual discipline of\nprayer at 6, 12 and 6.",
  },
  {
    id: 7,
    type: "begin",
    title: "Begin with the\nAngelus",
    tagline: "Pause. Listen and Pray.",
  },
];

async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) {
    Alert.alert("Simulator Detected", "Push notifications only work on a real device.");
    return false;
  }
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === "granted") return true;
  if (existingStatus === "denied") {
    Alert.alert(
      "Notifications Disabled",
      "To hear the Angelus bells, please enable notifications in your device Settings.",
      [
        { text: "Not Now", style: "cancel" },
        { text: "Open Settings", onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  if (status === "granted") {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("angelus-bells", {
        name: "Angelus Bells",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    return true;
  }
  return false;
}

function FadeIn({
  children,
  delay = 0,
  isVisible,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  isVisible: boolean;
  style?: any;
}) {
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

function SlideItem({
  s,
  index,
  currentScreen,
  onNext,
  onSkip,
  onGetStarted,
  onEnableNotifications,
}: any) {
  const isActive = currentScreen === index;

  if (s.type === "scripture") {
    return (
      <TouchableOpacity activeOpacity={1} onPress={onNext} style={{ width, height }}>
        <ImageBackground
          source={require("../../assets/bgsone.png")}
          style={styles.slide}
          resizeMode="cover"
        >
          <View style={styles.centerContent}>
            <FadeIn delay={180} isVisible={isActive}>
              <Text style={styles.scriptureMain}>{s.title}</Text>
            </FadeIn>
            <FadeIn delay={820} isVisible={isActive}>
              <Text style={styles.scriptureItalic}>{s.subtitle}</Text>
            </FadeIn>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    );
  }

  if (s.type === "welcome") {
    return (
      <View style={styles.slide}>
        <View style={styles.centerContent}>
          <FadeIn delay={100} isVisible={isActive}>
            <Image
              source={require("../../assets/angelusdominibell.png")}
              style={styles.appIcon}
              resizeMode="contain"
            />
          </FadeIn>
          <FadeIn delay={200} isVisible={isActive}>
            <Text style={styles.welcomeTitle}>{s.title}</Text>
          </FadeIn>
          <FadeIn delay={400} isVisible={isActive}>
            <Text style={styles.desc}>{s.description}</Text>
          </FadeIn>
          <FadeIn delay={720} isVisible={isActive}>
            <Text style={styles.goldTimes}>{s.prayerTimes.join("  ·  ")}</Text>
          </FadeIn>
        </View>
        <View style={styles.navArea}>
          <FadeIn delay={1060} isVisible={isActive} style={styles.ctaWrap}>
            <TouchableOpacity onPress={onNext} style={[styles.primaryBtn, { backgroundColor: BLUE }]}>
              <Text style={[styles.primaryText, { color: IVORY }]}>Continue</Text>
            </TouchableOpacity>
          </FadeIn>
          <FadeIn delay={1200} isVisible={isActive}>
            <TouchableOpacity onPress={onSkip} style={styles.skipUnderlineWrap}>
              <Text style={styles.skipUnderlineText}>Skip</Text>
            </TouchableOpacity>
          </FadeIn>
        </View>
      </View>
    );
  }

  if (s.type === "rhythm") {
    return (
      <View style={styles.slide}>
        <View style={styles.centerContent}>
          <FadeIn delay={100} isVisible={isActive}>
            <Text style={styles.rhythmHeading}>{s.title}</Text>
          </FadeIn>
          <FadeIn delay={260} isVisible={isActive}>
            <Text style={styles.rhythmSubheading}>{s.description}</Text>
          </FadeIn>
          <View style={styles.rhythmList}>
            {s.slots.map((slot: any, i: number) => (
              <FadeIn key={slot.label} delay={380 + i * 140} isVisible={isActive} style={styles.rhythmCardWrap}>
                <Image source={slot.image} style={styles.rhythmImage} resizeMode="contain" />
                <View style={styles.rhythmTextWrap}>
                  <Text style={styles.rhythmCardLabel}>{slot.label}</Text>
                  <Text style={styles.rhythmCardTime}>{slot.time}</Text>
                </View>
              </FadeIn>
            ))}
          </View>
        </View>
        <View style={styles.navArea}>
          <FadeIn delay={840} isVisible={isActive} style={styles.ctaWrap}>
            <TouchableOpacity onPress={onNext} style={[styles.primaryBtn, { backgroundColor: GOLD }]}>
              <Text style={[styles.primaryText, { color: IVORY }]}>Continue</Text>
            </TouchableOpacity>
          </FadeIn>
        </View>
      </View>
    );
  }

  if (s.type === "bells") {
    return (
      <View style={styles.slide}>
        <View style={styles.centerContent}>
          <FadeIn delay={120} isVisible={isActive}>
            <Text style={styles.bellsTitle}>{s.title}</Text>
          </FadeIn>
          <FadeIn delay={300} isVisible={isActive}>
            <Text style={styles.bellsDesc}>{s.description}</Text>
          </FadeIn>
          <FadeIn delay={500} isVisible={isActive}>
            <Image
              source={s.illustration}
              style={styles.bellsIllustration}
              resizeMode="contain"
            />
          </FadeIn>
        </View>
        <View style={styles.navArea}>
          <FadeIn delay={700} isVisible={isActive} style={styles.ctaWrap}>
            <TouchableOpacity onPress={onNext} style={[styles.primaryBtn, { backgroundColor: BLUE }]}>
              <Text style={[styles.primaryText, { color: IVORY }]}>{s.buttonText}</Text>
            </TouchableOpacity>
          </FadeIn>
        </View>
      </View>
    );
  }

  if (s.type === "community") {
    const mapHeight = height < 700 ? height * 0.28 : height * 0.32;
    return (
      <View style={styles.slide}>
        <View style={styles.communityContent}>
          <FadeIn delay={80} isVisible={isActive}>
            <Image
              source={require("../../assets/globe.png")}
              style={[styles.worldMap, { height: mapHeight }]}
              resizeMode="contain"
            />
          </FadeIn>
          <FadeIn delay={400} isVisible={isActive}>
            <Text style={styles.communityTitle}>{s.title}</Text>
          </FadeIn>
          <FadeIn delay={600} isVisible={isActive}>
            <Text style={styles.communityDesc}>{s.description}</Text>
          </FadeIn>
          <FadeIn delay={800} isVisible={isActive} style={{ width: "100%" }}>
            <View style={styles.counterCard}>
              <Text style={styles.counterNumber}>12,468</Text>
              <Text style={styles.counterLabel}>prayed today.</Text>
              <Text style={styles.counterTagline}>One prayer. One Church.</Text>
            </View>
          </FadeIn>
        </View>
        <View style={styles.navArea}>
          <FadeIn delay={1000} isVisible={isActive} style={styles.ctaWrap}>
            <TouchableOpacity onPress={onNext} style={[styles.primaryBtn, { backgroundColor: GOLD }]}>
              <Text style={[styles.primaryText, { color: IVORY }]}>Continue</Text>
            </TouchableOpacity>
          </FadeIn>
        </View>
      </View>
    );
  }

  if (s.type === "meditation") {
    const titleFontSize = width < 375 ? 30 : 34;
    return (
      <View style={styles.slide}>
        <View style={styles.meditationTopSection}>
          <FadeIn delay={120} isVisible={isActive}>
            <Text style={[styles.meditationTitle, { fontSize: titleFontSize }]}>
              {s.title}
            </Text>
          </FadeIn>
        </View>
        <View style={{ alignItems: "center" }}>
          <FadeIn delay={300} isVisible={isActive}>
            <Image
              source={require("../../assets/threeicons.png")}
              style={{ width: width, height: 240 }}
              resizeMode="contain"
            />
          </FadeIn>
          <FadeIn delay={420} isVisible={isActive} style={{ marginTop: -140 }}>
            <Image
              source={require("../../assets/mary-icon.png")}
              style={{ width: 350, height: 350 }}
              resizeMode="contain"
            />
          </FadeIn>
        </View>
        <FadeIn delay={560} isVisible={isActive} style={{ marginTop: -100 }}>
          <Text style={styles.meditationDesc}>{s.description}</Text>
        </FadeIn>
        <View style={styles.navArea}>
          <FadeIn delay={740} isVisible={isActive} style={styles.ctaWrap}>
            <TouchableOpacity onPress={onNext} style={[styles.primaryBtn, { backgroundColor: BLUE }]}>
              <Text style={[styles.primaryText, { color: IVORY }]}>Continue</Text>
            </TouchableOpacity>
          </FadeIn>
        </View>
      </View>
    );
  }

  if (s.type === "begin") {
    return (
      <ImageBackground
        source={require("../../assets/onboardchurch.png")}
        style={styles.slide}
        resizeMode="cover"
      >
        <View style={styles.beginTopSection}>
          <FadeIn delay={180} isVisible={isActive}>
            <Text style={styles.beginTitle}>{s.title}</Text>
          </FadeIn>
          <FadeIn delay={800} isVisible={isActive}>
            <Text style={styles.tagline}>{s.tagline}</Text>
          </FadeIn>
        </View>
        <View style={styles.navArea}>
          <FadeIn delay={1100} isVisible={isActive} style={styles.ctaWrap}>
            {/* ✅ "Get Started" calls onGetStarted → triggers onDone in App.tsx → goes to Register */}
            <TouchableOpacity onPress={onGetStarted} style={[styles.primaryBtn, { backgroundColor: GOLD }]}>
              <Text style={[styles.primaryText, { color: IVORY }]}>Get Started</Text>
            </TouchableOpacity>
          </FadeIn>
        </View>
      </ImageBackground>
    );
  }

  return null;
}

// ─── Root ─────────────────────────────────────────────────────────────────────
// ✅ Only needs onDone — App.tsx decides where that goes (Register screen)
export default function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_700Bold_Italic,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  const goTo = (i: number) => {
    setCurrentScreen(i);
    scrollRef.current?.scrollTo({ x: i * width, animated: true });
  };

  const handleNext = () => {
    const next = currentScreen + 1;
    if (next < ONBOARDING_SCREENS.length) {
      goTo(next);
    } else {
      onDone(); // last slide's Continue → register
    }
  };

  const handleEnableNotifications = async () => {
    await requestNotificationPermission();
    handleNext();
  };

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setCurrentScreen(Math.round(e.nativeEvent.contentOffset.x / width))
        }
      >
        {ONBOARDING_SCREENS.map((s, i) => (
          <SlideItem
            key={s.id}
            s={s}
            index={i}
            currentScreen={currentScreen}
            onNext={handleNext}
            onSkip={onDone}       // ✅ Skip → onDone → Register
            onGetStarted={onDone} // ✅ Get Started → onDone → Register
            onEnableNotifications={handleEnableNotifications}
          />
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  slide: {
    width,
    height,
    backgroundColor: PARCHMENT,
    alignItems: "center",
    justifyContent: "space-between",
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
    color: TEXT_MUTED,
    fontFamily: FONT_BODY_SEMIBOLD,
    fontSize: 15,
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
  scriptureMain: {
    fontFamily: FONT_TITLE_BOLD,
    fontSize: 40,
    color: BLUE,
    textAlign: "center",
    letterSpacing: 0.3,
    marginTop: 70,
    lineHeight: 46,
  },
  scriptureItalic: {
    fontSize: 34,
    fontStyle: "italic",
    color: "#FFE6A7",
    textAlign: "center",
    marginTop: 300,
    letterSpacing: 0.2,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  appIcon: {
    width: 160,
    height: 160,
    marginBottom: -6,
  },
  welcomeTitle: {
    fontFamily: FONT_TITLE_BOLD,
    fontSize: 40,
    color: BLUE,
    textAlign: "center",
    letterSpacing: 0.2,
    lineHeight: 42,
    marginBottom: 10,
  },
  goldTimes: {
    fontFamily: FONT_BODY_SEMIBOLD,
    color: GOLD,
    fontSize: 28,
    fontWeight: "700",
    marginTop: 80,
    textAlign: "center",
  },
  rhythmHeading: {
    fontFamily: FONT_TITLE_BOLD,
    fontSize: 40,
    color: BLUE,
    textAlign: "center",
    letterSpacing: 0.3,
    lineHeight: 46,
    marginBottom: 12,
  },
  rhythmSubheading: {
    fontFamily: FONT_BODY,
    fontSize: 15,
    color: TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 22,
  },
  rhythmList: {
    width: "100%",
    marginTop: 28,
  },
  rhythmCardWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BLUE,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 14,
    width: "100%",
  },
  rhythmImage: {
    width: 91,
    height: 91,
    marginRight: 18,
  },
  rhythmTextWrap: {
    flex: 1,
    flexDirection: "column",
  },
  rhythmCardLabel: {
    fontFamily: FONT_TITLE_BOLD,
    fontSize: 20,
    color: IVORY,
    letterSpacing: 0.2,
    marginBottom: 3,
  },
  rhythmCardTime: {
    fontFamily: FONT_BODY_SEMIBOLD,
    fontSize: 15,
    color: GOLD,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  bellsTitle: {
    fontFamily: FONT_TITLE_BOLD,
    fontSize: 40,
    color: BLUE,
    textAlign: "center",
    letterSpacing: 0.3,
    lineHeight: 46,
    marginBottom: 12,
  },
  bellsDesc: {
    fontFamily: FONT_BODY,
    fontSize: 16,
    color: TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 24,
  },
  bellsIllustration: {
    width: width * 0.85,
    height: height * 0.38,
    marginTop: 24,
  },
  desc: {
    fontFamily: FONT_BODY,
    color: TEXT_SECONDARY,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 4,
    lineHeight: 24,
    fontSize: 15,
  },
  communityContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingTop: 30,
    gap: 14,
  },
  worldMap: {
    width: width * 0.78,
    maxWidth: 230,
    marginBottom: -50,
  },
  communityTitle: {
    fontFamily: FONT_TITLE_BOLD,
    fontSize: width < 375 ? 30 : 34,
    color: BLUE,
    textAlign: "center",
    letterSpacing: 0.3,
    lineHeight: 40,
  },
  communityDesc: {
    fontFamily: FONT_BODY,
    color: TEXT_SECONDARY,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 23,
    paddingHorizontal: 4,
  },
  counterCard: {
    backgroundColor: BLUE,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 28,
    alignItems: "center",
    width: "100%",
  },
  counterNumber: {
    fontFamily: FONT_TITLE_BOLD,
    fontSize: width < 375 ? 36 : 42,
    color: GOLD,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  counterLabel: {
    fontFamily: FONT_BODY_SEMIBOLD,
    fontSize: 15,
    color: IVORY,
    marginBottom: 4,
  },
  counterTagline: {
    fontFamily: FONT_TITLE_ITALIC,
    fontSize: 13,
    color: "rgba(253,250,240,0.65)",
    letterSpacing: 0.3,
  },
  meditationTopSection: {
    width: "100%",
    alignItems: "center",
    paddingTop: 90,
    paddingHorizontal: 32,
  },
  meditationTitle: {
    fontFamily: FONT_TITLE_BOLD,
    fontSize: 40,
    color: BLUE,
    textAlign: "center",
    letterSpacing: 0.3,
    lineHeight: 44,
  },
  meditationDesc: {
    fontFamily: FONT_BODY,
    fontSize: 15,
    color: TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 24,
  },
  beginTitle: {
    fontFamily: FONT_TITLE_BOLD,
    fontSize: 36,
    color: BLUE,
    paddingTop: 70,
    textAlign: "center",
    letterSpacing: 0.3,
    lineHeight: 48,
  },
  beginTopSection: {
    width: "100%",
    alignItems: "center",
    paddingTop: 72,
    paddingHorizontal: 32,
  },
  tagline: {
    fontSize: 30,
    fontStyle: "italic",
    color: "#FFE6A7",
    textAlign: "center",
    marginTop: 10,
    letterSpacing: 0.3,
  },
  skipUnderlineWrap: {
    alignItems: "center",
    marginTop: 16,
  },
  skipUnderlineText: {
    color: TEXT_MUTED,
    fontFamily: FONT_BODY_SEMIBOLD,
    fontSize: 15,
    textDecorationLine: "underline",
  },
  ctaWrap: {
    width: "100%",
    marginTop: 20,
  },
  primaryBtn: {
    paddingVertical: 18,
    borderRadius: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
  },
  primaryText: {
    fontFamily: FONT_BODY_SEMIBOLD,
    textAlign: "center",
    color: IVORY,
    fontSize: 18,
    fontWeight: "600",
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