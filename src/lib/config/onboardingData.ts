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
    title: "Set your\nDaily Rhythm",
    description: "Pause with the Church at the\ntraditional hours of prayer.",
    prayerTimes: ["6 AM", "12 PM", "6 PM"],
  },
  {
    id: 3,
    type: "rhythm",
    title: "Let the Bells Remind You",
    description: `Receive a gentle reminder when\n it’s time to pray the Angelus.`,
    slots: [
      {
        label: "Morning",
        time: "6:00 AM",
        image: require("../../../assets/Morning_Solid.png"),
      },
      {
        label: "Noon",
        time: "12:00 PM",
        image: require("../../../assets/Noon_Solid.png"),
      },
      {
        label: "Evening",
        time: "6:00 PM",
        image: require("../../../assets/Evening_Solid.png"),
      },
    ],
  },
  {
    id: 4,
    type: "community",
    title: "United in \n Prayer Around \nthe World",
    description: "See how many prayed the Angelus with you across the world.",
    buttonText: "Continue",
  },
  {
    id: 5,
    type: "meditation",
    title: "A Meditation\non the \n Incarnation",
    description: "Build the spiritual discipline of\nprayer at 6, 12 and 6.",
  },
  {
    id: 6,
    type: "begin",
    title: "Begin with the\nAngelus",
    tagline: "Pause. Listen. Pray.",
  },
];
