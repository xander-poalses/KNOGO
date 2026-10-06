import type { OpeningHours } from "../types/place";

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function getTodayHours(hours: OpeningHours[], date = new Date()) {
  return hours.find((item) => item.day.slice(0, 3).toLowerCase() === dayNames[date.getDay()].toLowerCase());
}

export function getWeeklyHours(opening: OpeningHours[], kitchen: OpeningHours[] = []) {
  const byDay = (hours: OpeningHours[]) => new Map(hours.map((item) => [item.day.slice(0, 3).toLowerCase(), item]));
  const tradingByDay = byDay(opening);
  const kitchenByDay = byDay(kitchen);
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
    day,
    opening: tradingByDay.get(day.toLowerCase()),
    kitchen: kitchenByDay.get(day.toLowerCase())
  }));
}

export function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function formatRelativeTime(value: string | null, now = new Date()) {
  if (!value) return "Not confirmed yet";
  const diff = Math.max(0, now.getTime() - new Date(value).getTime());
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `Last confirmed ${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Last confirmed ${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `Last confirmed ${days} days ago`;
}

export function closesAfter(hours: OpeningHours[], target: string, date = new Date()) {
  const today = getTodayHours(hours, date);
  if (!today || today.isClosed) return false;
  return timeToMinutes(today.closeTime) > timeToMinutes(target);
}

export function getCloseTime(hours: OpeningHours[], date = new Date()) {
  const today = getTodayHours(hours, date);
  if (!today) return "Trading hours not published";
  if (today.isClosed) return "Closed today";
  if (!today.openTime || !today.closeTime) return "Trading hours not published";
  return `Closes ${today.closeTime}`;
}
