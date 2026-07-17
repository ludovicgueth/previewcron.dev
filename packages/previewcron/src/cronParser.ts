export function parseCronSchedule(schedule: string): string {
  const parts = schedule.split(" ");

  if (parts.length !== 5) {
    return schedule;
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Every minute
  if (schedule === "* * * * *") {
    return "Every minute";
  }

  // Every X minutes
  if (
    minute.startsWith("*/") &&
    hour === "*" &&
    dayOfMonth === "*" &&
    month === "*" &&
    dayOfWeek === "*"
  ) {
    const interval = minute.slice(2);
    return `Every ${interval} minutes`;
  }

  // Every hour
  if (
    minute === "0" &&
    hour === "*" &&
    dayOfMonth === "*" &&
    month === "*" &&
    dayOfWeek === "*"
  ) {
    return "Every hour";
  }

  // Every X hours
  if (
    minute !== "*" &&
    hour.startsWith("*/") &&
    dayOfMonth === "*" &&
    month === "*" &&
    dayOfWeek === "*"
  ) {
    const interval = hour.slice(2);
    return `Every ${interval} hours`;
  }

  // Specific time daily
  if (
    minute !== "*" &&
    hour !== "*" &&
    dayOfMonth === "*" &&
    month === "*" &&
    dayOfWeek === "*"
  ) {
    const hourNum = parseInt(hour);
    const minuteNum = parseInt(minute);

    if (isNaN(hourNum) || isNaN(minuteNum) || hourNum < 0 || hourNum > 23 || minuteNum < 0 || minuteNum > 59) {
      return schedule;
    }

    const period = hourNum >= 12 ? "PM" : "AM";
    const displayHour = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
    const time = `${displayHour}:${minuteNum.toString().padStart(2, "0")}`;

    return `At ${time} ${period}`;
  }

  // Specific day of week
  if (
    minute !== "*" &&
    hour !== "*" &&
    dayOfMonth === "*" &&
    month === "*" &&
    dayOfWeek !== "*"
  ) {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayName = days[parseInt(dayOfWeek)] || dayOfWeek;
    const hourNum = parseInt(hour);
    const minuteNum = parseInt(minute);

    if (isNaN(hourNum) || isNaN(minuteNum) || hourNum < 0 || hourNum > 23 || minuteNum < 0 || minuteNum > 59) {
      return schedule;
    }

    const period = hourNum >= 12 ? "PM" : "AM";
    const displayHour = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
    const time = `${displayHour}:${minuteNum.toString().padStart(2, "0")}`;

    return `At ${time} ${period} on ${dayName}`;
  }

  // Specific day of month
  if (
    minute !== "*" &&
    hour !== "*" &&
    dayOfMonth !== "*" &&
    month === "*" &&
    dayOfWeek === "*"
  ) {
    const hourNum = parseInt(hour);
    const minuteNum = parseInt(minute);

    if (isNaN(hourNum) || isNaN(minuteNum) || hourNum < 0 || hourNum > 23 || minuteNum < 0 || minuteNum > 59) {
      return schedule;
    }

    const period = hourNum >= 12 ? "PM" : "AM";
    const displayHour = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
    const time = `${displayHour}:${minuteNum.toString().padStart(2, "0")}`;

    if (dayOfMonth.startsWith("*/")) {
      const interval = dayOfMonth.slice(2);
      return `At ${time} ${period} every ${interval} days`;
    }

    return `At ${time} ${period} on day ${dayOfMonth}`;
  }

  return schedule;
}
