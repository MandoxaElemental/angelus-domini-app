// ─── Types ────────────────────────────────────────────────────────────────────

export type PrayerStatus = "upcoming" | "active" | "completed" | "missed";

// ─── Prayer Definitions ───────────────────────────────────────────────────────

export const PRAYERS = [
  {
    key: "morning",
    title: "Morning Angelus",
    icon: "Morning",
    hour: 6,
    minute: 0,
    endHour: 12,
    endMinute: 0,
  },
  {
    key: "noon",
    title: "Noon Angelus",
    icon: "Noon",
    hour: 12,
    minute: 0,
    endHour: 18,
    endMinute: 0,
  },
  {
    key: "evening",
    title: "Evening Angelus",
    icon: "Evening",
    hour: 18,
    minute: 0,
    endHour: 23,
    endMinute: 59,
  },
] as const;

// ─── Core Helpers ─────────────────────────────────────────────────────────────

export function getPrayerDate(hour: number, minute = 0): Date {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

export function getNextPrayer() {
  const now = new Date();

  for (const prayer of PRAYERS) {
    const prayerTime = getPrayerDate(prayer.hour, prayer.minute);
    if (now < prayerTime) {
      return { ...prayer, time: prayerTime };
    }
  }

  // Past all three — return tomorrow's morning prayer
  const tomorrowMorning = getPrayerDate(6, 0);
  tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
  return { ...PRAYERS[0], time: tomorrowMorning };
}

export function getPrayerStatus(key: string, completed: boolean): PrayerStatus {
  const now = new Date();
  const prayer = PRAYERS.find((p) => p.key === key);
  if (!prayer) return "upcoming";

  const start = getPrayerDate(prayer.hour, prayer.minute);
  const end = getPrayerDate(prayer.endHour, prayer.endMinute);

  if (completed) return "completed";
  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "active";
  return "missed";
}

export function formatPrayerTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// ─── Slot Helpers (used by prayerApi) ────────────────────────────────────────

/**
 * Returns the active prayer slot string for the current time,
 * e.g. "2025-06-01_6", "2025-06-01_12", "2025-06-01_18".
 */
export function getSlot(): string {
  const now = new Date();
  const h = now.getHours();

  let hourSlot = 6;
  if (h >= 9)  hourSlot = 12;
  if (h >= 15) hourSlot = 18;

  return `${now.toISOString().split("T")[0]}_${hourSlot}`;
}

/**
 * Returns the Date of the next prayer time.
 * Alias kept for any code still importing getNextPrayerTime.
 */
export function getNextPrayerTime(): Date {
  return getNextPrayer().time;
}