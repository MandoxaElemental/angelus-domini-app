import { toZonedTime } from "date-fns-tz";

export type PrayerStatus =
  | "upcoming"
  | "active"
  | "completed"
  | "missed"
  | "disabled"
  | "loading";

export const PRAYERS = [
  {
    key: "morning",
    title: "Morning Angelus",
    icon: "Morning",
    hour: 6,
    minute: 0,
  },
  { key: "noon", title: "Noon Angelus", icon: "Noon", hour: 12, minute: 0 },
  {
    key: "evening",
    title: "Evening Angelus",
    icon: "Evening",
    hour: 18,
    minute: 0,
  },
] as const;

export function getPrayerDate(hour: number, minute = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

export function getNextPrayer() {
  const now = new Date();
  for (const prayer of PRAYERS) {
    const t = getPrayerDate(prayer.hour, prayer.minute);
    if (now < t) return { ...prayer, time: t };
  }
  const tomorrow = getPrayerDate(6, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { ...PRAYERS[0], time: tomorrow };
}

// Active window = 5 minutes after the prayer time
const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

export function getPrayerStatus(key: string, completed: boolean): PrayerStatus {
  if (completed) return "completed";

  const now = new Date();

  const prayer = PRAYERS.find((p) => p.key === key);
  if (!prayer) return "upcoming";

  const start = getPrayerDate(prayer.hour, prayer.minute);
  const activeEnd = new Date(start.getTime() + ACTIVE_WINDOW_MS);

  if (now < start) return "upcoming";
  if (now <= activeEnd) return "active";

  return "missed";
}

export function formatPrayerTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getSlot(timezone: string) {
  const utcNow = new Date();

  const localNow = toZonedTime(utcNow, timezone);

  const hourSlot =
    localNow.getHours() < 9 ? 6 : localNow.getHours() < 15 ? 12 : 18;

  return `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(localNow.getDate()).padStart(2, "0")}_${hourSlot}`;
}

export function getNextPrayerTime(): Date {
  return getNextPrayer().time;
}
