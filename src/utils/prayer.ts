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

function localDateString(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

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
  const hour = now.getHours();

  // Midnight → 5:59 AM
  if (hour < 6) {
    return "upcoming";
  }

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

/**
 * Returns slot string for the CURRENT prayer period.
 * Morning  = 06:00–11:59 → "_6"
 * Noon     = 12:00–17:59 → "_12"
 * Evening  = 18:00–05:59 → "_18"
 */
export function getSlot(): string {
  const now = new Date();
  const h = now.getHours();
  const date = localDateString(now);

  let slot: number;
  if (h >= 6 && h < 12) slot = 6;
  else if (h >= 12 && h < 18) slot = 12;
  else slot = 18; // 18:00–05:59 → evening slot

  // For evening slots that fall on the next calendar day (midnight–5:59am),
  // attribute them to the previous day's evening slot date
  let slotDate = date;
  if (h < 6) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    slotDate = localDateString(yesterday);
  }

  return `${slotDate}_${slot}`;
}

export function getNextPrayerTime(): Date {
  return getNextPrayer().time;
}
