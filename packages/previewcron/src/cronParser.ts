const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "H M" → "h:mm AM/PM", or null when either field is not a plain in-range number. */
function formatTime(hour: string, minute: string): string | null {
  const h = parseInt(hour);
  const m = parseInt(minute);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayHour}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export function parseCronSchedule(schedule: string): string {
  const parts = schedule.split(" ");
  if (parts.length !== 5) return schedule;
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  if (month !== "*") return schedule;

  if (dayOfMonth === "*" && dayOfWeek === "*") {
    if (minute === "*" && hour === "*") return "Every minute";
    if (minute.startsWith("*/") && hour === "*") return `Every ${minute.slice(2)} minutes`;
    if (minute === "0" && hour === "*") return "Every hour";
    if (minute !== "*" && hour.startsWith("*/")) return `Every ${hour.slice(2)} hours`;
  }
  if (minute === "*" || hour === "*") return schedule;

  const time = formatTime(hour, minute);
  if (!time) return schedule;
  if (dayOfMonth === "*" && dayOfWeek === "*") return `At ${time}`;
  if (dayOfMonth === "*") return `At ${time} on ${DAYS[parseInt(dayOfWeek)] || dayOfWeek}`;
  if (dayOfWeek !== "*") return schedule;
  if (dayOfMonth.startsWith("*/")) return `At ${time} every ${dayOfMonth.slice(2)} days`;
  return `At ${time} on day ${dayOfMonth}`;
}
