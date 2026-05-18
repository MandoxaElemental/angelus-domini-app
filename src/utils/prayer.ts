export function getNextPrayerTime(): Date {
  const now = new Date();
  const hours = [6, 12, 18];

  for (let h of hours) {
    const target = new Date();
    target.setHours(h, 0, 0, 0);

    if (now <= target) return target;
  }

  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(6, 0, 0, 0);

  return tomorrow;
}

export function getSlot(): string {
  const now = new Date();

  let hourSlot = 6;
  if (now.getHours() >= 9) hourSlot = 12;
  if (now.getHours() >= 15) hourSlot = 18;

  return `${now.toISOString().split("T")[0]}_${hourSlot}`;
}