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

export function getSlot(): string {
  const now = new Date();

  let slot: number;
  const date = new Date(now);

  if (now.getHours() < 6) {
    date.setDate(date.getDate() - 1);
    slot = 18;
  } else if (now.getHours() < 12) {
    slot = 6;
  } else if (now.getHours() < 18) {
    slot = 12;
  } else {
    slot = 18;
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}_${slot}`;
}

export function getNextPrayerTime(): Date {
  return getNextPrayer().time;
}
