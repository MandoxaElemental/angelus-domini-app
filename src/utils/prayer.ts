export type PrayerStatus = "upcoming" | "active" | "completed" | "missed";

export const PRAYERS = [
  {
    key: "morning",
    title: "Morning Angelus",
    icon: "Morning",
    hour: 6,
    minute: 0,
  },
  {
    key: "noon",
    title: "Noon Angelus",
    icon: "Noon",
    hour: 12,
    minute: 0,
  },
  {
    key: "evening",
    title: "Evening Angelus",
    icon: "Evening",
    hour: 18,
    minute: 0,
  },
];

export function getPrayerDate(hour: number, minute = 0) {
  const date = new Date();

  date.setHours(hour, minute, 0, 0);

  return date;
}

export function getNextPrayer() {
  const now = new Date();

  for (const prayer of PRAYERS) {
    const prayerTime = getPrayerDate(prayer.hour, prayer.minute);

    if (now < prayerTime) {
      return {
        ...prayer,
        time: prayerTime,
      };
    }
  }

  // next day's morning prayer
  const tomorrowMorning = getPrayerDate(6, 0);

  tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);

  return {
    ...PRAYERS[0],
    time: tomorrowMorning,
  };
}

export function getPrayerStatus(key: string, completed: boolean): PrayerStatus {
  const now = new Date();

  const prayer = PRAYERS.find((p) => p.key === key);

  if (!prayer) return "upcoming";

  // Prayer start time
  const start = new Date();
  start.setHours(prayer.hour, prayer.minute, 0, 0);

  // 5-minute grace window
  const activeUntil = new Date(start.getTime() + 5 * 60 * 1000);

  // Completed always wins
  if (completed) {
    return "completed";
  }

  // Before prayer starts
  if (now < start) {
    return "upcoming";
  }

  if (now >= start && now <= activeUntil) {
    return "active";
  }

  return "missed";
}

export function formatPrayerTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}
