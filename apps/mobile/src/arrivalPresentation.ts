import type { ArrivalHours } from "@knogo/core";

export function describeArrivalHours(hours: ArrivalHours): string {
  if (hours.state === "unknown") return "Hours not available for arrival.";
  if (hours.state === "outside") return "Outside listed hours on arrival.";
  if (hours.minutesRemaining === null || !Number.isFinite(hours.minutesRemaining) || hours.minutesRemaining <= 0) return "Within listed hours on arrival.";
  const minutes = Math.floor(hours.minutesRemaining);
  if (minutes === 0) return "Less than 1 min before closing.";
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return `${h ? `${h} hr${m ? ` ${m} min` : ""}` : `${m} min`} before closing.`;
}
