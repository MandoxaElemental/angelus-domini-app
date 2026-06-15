export type PrayerStatus = "upcoming" | "active" | "completed" | "missed";

export const PRAYERS = [
  { key: "morning", title: "Morning Angelus", icon: "Morning", hour: 6,  minute: 0 },
  { key: "noon",    title: "Noon Angelus",    icon: "Noon",    hour: 12, minute: 0 },
  { key: "evening", title: "Evening Angelus", icon: "Evening", hour: 18, minute: 0 },
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

// Active window = 10 minutes after the prayer time
export const PRAYER_WINDOW_MINUTES = 5;

const ACTIVE_WINDOW_MS =
  PRAYER_WINDOW_MINUTES * 60 * 1000;

export function getPrayerStatus(key: string, completed: boolean, suppressMissed = false): PrayerStatus {
  if (completed) return "completed";

  const now    = new Date();
  const prayer = PRAYERS.find((p) => p.key === key);
  if (!prayer) return "upcoming";

  const start     = getPrayerDate(prayer.hour, prayer.minute);
  const activeEnd = new Date(start.getTime() + ACTIVE_WINDOW_MS);

  if (now < start)                       return "upcoming";
  if (now >= start && now <= activeEnd)  return "active";
  if (suppressMissed)                    return "upcoming";
  return "missed";
}

export function formatPrayerTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function getSlot(): string {
  const now = new Date();
  const h   = now.getHours();

  const localDateStr = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, "0");
    const dd   = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // midnight–5:59 AM belongs to the previous day's evening slot
  if (h < 6) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return `${localDateStr(yesterday)}_18`;
  }

  let slot: number;
  if      (h >= 6  && h < 12) slot = 6;
  else if (h >= 12 && h < 18) slot = 12;
  else                         slot = 18;

  return `${localDateStr(now)}_${slot}`;
}

export function getNextPrayerTime(): Date {
  return getNextPrayer().time;
}

export function isWithinPrayerWindow(
  prayerHour: number,
  prayerMinute = 0
): boolean {

  const now = new Date();

  const start = new Date();
  start.setHours(
    prayerHour,
    prayerMinute,
    0,
    0
  );

  const end = new Date(
    start.getTime() +
    PRAYER_WINDOW_MINUTES * 60 * 1000
  );

  return now >= start && now <= end;
}


export function getCurrentPrayerWindow() {
  const now = new Date();

  for (const prayer of PRAYERS) {
    const start = getPrayerDate(
      prayer.hour,
      prayer.minute
    );

    const end = new Date(
      start.getTime() +
      PRAYER_WINDOW_MINUTES * 60 * 1000
    );

    if (now >= start && now <= end) {
      return {
        prayer,
        start,
        end,
      };
    }
  }

  return null;
}