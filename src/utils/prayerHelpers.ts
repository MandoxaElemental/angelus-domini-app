import { AngelusMode } from "../services/notificationService";
import { getNextPrayer } from "./prayer";

export function format12Hour(date: Date): string {
  let h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export function getCurrentPrayerWindow() {
  const hour = new Date().getHours();

  if (hour >= 6 && hour < 12) {
    return {
      key: "morning",
      label: "Morning Angelus",
    };
  }

  if (hour >= 12 && hour < 18) {
    return {
      key: "noon",
      label: "Noon Angelus",
    };
  }

  return {
    key: "evening",
    label: "Evening Angelus",
  };
}

export function getPrayerDay() {
  const now = new Date();

  if (now.getHours() < 6) {
    now.setDate(now.getDate() - 1);
  }

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function getNextPrayerForMode(mode: AngelusMode) {
  if (mode !== "noon_only") {
    return getNextPrayer();
  }

  const now = new Date();

  const nextNoon = new Date(now);
  nextNoon.setHours(12, 0, 0, 0);

  if (now >= nextNoon) {
    nextNoon.setDate(nextNoon.getDate() + 1);
  }

  return {
    title: "Noon Angelus",
    icon: "Noon",
    time: nextNoon,
  };
}

const DAILY_VERSES = [
  { quote: "Be it done unto me according to your word.", ref: "Luke 1:38" },
  { quote: "The Lord is my shepherd; I shall not want.", ref: "Psalm 23:1" },
  {
    quote: "I can do all things through Christ who strengthens me.",
    ref: "Phil 4:13",
  },
  { quote: "Trust in the Lord with all your heart.", ref: "Prov 3:5" },
  {
    quote: "For God so loved the world that He gave His only Son.",
    ref: "John 3:16",
  },
  { quote: "Be still, and know that I am God.", ref: "Psalm 46:10" },
  { quote: "Love one another as I have loved you.", ref: "John 15:12" },
  { quote: "The Lord is near to the brokenhearted.", ref: "Psalm 34:18" },
  {
    quote: "Ask and it will be given to you; seek and you will find.",
    ref: "Matt 7:7",
  },
  { quote: "I am the way, the truth, and the life.", ref: "John 14:6" },
  {
    quote: "Come to me, all who are weary, and I will give you rest.",
    ref: "Matt 11:28",
  },
  {
    quote: "Your word is a lamp to my feet and a light to my path.",
    ref: "Psalm 119:105",
  },
  {
    quote: "Do not be anxious about anything, but in everything pray.",
    ref: "Phil 4:6",
  },
  { quote: "The Lord bless you and keep you.", ref: "Num 6:24" },
  { quote: "With God all things are possible.", ref: "Matt 19:26" },
  { quote: "Fear not, for I am with you.", ref: "Isaiah 41:10" },
  {
    quote: "Blessed are the pure in heart, for they shall see God.",
    ref: "Matt 5:8",
  },
  {
    quote: "He who began a good work in you will complete it.",
    ref: "Phil 1:6",
  },
  {
    quote: "Cast all your anxieties on Him, for He cares for you.",
    ref: "1 Pet 5:7",
  },
  { quote: "The peace of God surpasses all understanding.", ref: "Phil 4:7" },
  { quote: "Rejoice always, pray without ceasing.", ref: "1 Thess 5:16–17" },
  { quote: "Create in me a clean heart, O God.", ref: "Psalm 51:10" },
  {
    quote: "Blessed is she who believed the Lord's promise would be fulfilled.",
    ref: "Luke 1:45",
  },
  {
    quote: "This is the day the Lord has made; let us rejoice.",
    ref: "Psalm 118:24",
  },
  { quote: "Nothing is impossible with God.", ref: "Luke 1:37" },
  {
    quote: "Seek first the kingdom of God and His righteousness.",
    ref: "Matt 6:33",
  },
  { quote: "My grace is sufficient for you.", ref: "2 Cor 12:9" },
  { quote: "The Lord is my light and my salvation.", ref: "Psalm 27:1" },
  { quote: "He who abides in love abides in God.", ref: "1 John 4:16" },
  { quote: "I am with you always, to the end of the age.", ref: "Matt 28:20" },
];

export function getDailyVerse() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const day = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return DAILY_VERSES[day % DAILY_VERSES.length];
}

export function slotToKey(slot: string): "morning" | "noon" | "evening" | null {
  if (!slot) return null;
  if (slot.endsWith("_6")) return "morning";
  if (slot.endsWith("_12")) return "noon";
  if (slot.endsWith("_18")) return "evening";
  return null;
}

export function hourToSlotKey(h: number): "morning" | "noon" | "evening" {
  if (h === 6) return "morning";
  if (h === 12) return "noon";
  return "evening";
}
