import { OnboardingSlide } from "../types/onboarding";

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
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
      { label: "Morning", time: "6:00 AM",  image: require("../../../assets/1.png") },
      { label: "Noon",    time: "12:00 PM", image: require("../../../assets/2.png") },
      { label: "Evening", time: "6:00 PM",  image: require("../../../assets/3.png") },
    ],
  },
  {
    id: 4,
    type: "bells",
    title: "Hear the Bells",
    description: "Your phone rings like Church\nBells when it's time to pray the\nAngelus.",
    illustration: require("../../../assets/notificationsbg.png"),
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