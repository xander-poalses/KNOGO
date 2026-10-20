import type { OpeningHours } from "./types/place";

export type FuelGrade = "petrol_93" | "petrol_95" | "diesel_50ppm" | "diesel_500ppm";
export type FuelRegion = "inland" | "coastal";
export type FuelPreferences = { consumptionLPer100Km: number | null; consumptionUnit?: "l_per_100km" | "km_per_litre"; grade: FuelGrade | null; region: FuelRegion | null; priceOverrideZarPerLitre: number | null };
export const emptyFuelPreferences: FuelPreferences = { consumptionLPer100Km: null, grade: null, region: null, priceOverrideZarPerLitre: null };
export function positiveNumber(value: unknown, maximum = 1000): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > maximum) return null;
  return value;
}
export function parseFuelPreferences(value: unknown): FuelPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...emptyFuelPreferences };
  const raw = value as Record<string, unknown>;
  return { consumptionLPer100Km: positiveNumber(raw.consumptionLPer100Km, 100),
    ...(raw.consumptionUnit === "l_per_100km" || raw.consumptionUnit === "km_per_litre" ? { consumptionUnit: raw.consumptionUnit } : {}),
    grade: ["petrol_93", "petrol_95", "diesel_50ppm", "diesel_500ppm"].includes(String(raw.grade)) ? raw.grade as FuelGrade : null,
    region: raw.region === "inland" || raw.region === "coastal" ? raw.region : null,
    priceOverrideZarPerLitre: positiveNumber(raw.priceOverrideZarPerLitre) };
}
export function calculateTankConsumption(kilometres: number, litres: number, filledToFullBothTimes: boolean): number | null {
  if (!filledToFullBothTimes || !positiveNumber(kilometres, 100000) || !positiveNumber(litres, 10000)) return null;
  return positiveNumber(litres / kilometres * 100, 100);
}
export function fuelRegionForLocation(point: {latitude:number;longitude:number} | null): FuelRegion | null {
  // shortcut: only the supported Pretoria East area is mapped; retain the chooser elsewhere until zone polygons are available.
  return point && point.latitude >= -25.95 && point.latitude <= -25.65 && point.longitude >= 28.15 && point.longitude <= 28.5 ? "inland" : null;
}
export function estimateFuel(kilometres: number, consumption: number | null, price: number | null) {
  if (!Number.isFinite(kilometres) || kilometres < 0 || !positiveNumber(consumption, 100)) return { litres: null, costZar: null };
  const litres = kilometres / 100 * consumption!;
  return { litres, costZar: positiveNumber(price) ? litres * price! : null };
}
export type RouteLeg = { distanceMetres: number; durationSeconds: number };
export function planJourney(outbound: RouteLeg, departure: Date, includeReturn: boolean, returnLeg?: RouteLeg) {
  const valid = (leg: RouteLeg) => Number.isFinite(leg.distanceMetres) && leg.distanceMetres >= 0 && Number.isFinite(leg.durationSeconds) && leg.durationSeconds >= 0;
  if (!valid(outbound) || !Number.isFinite(departure.getTime()) || (returnLeg && !valid(returnLeg))) throw new Error("Route or departure is not valid.");
  return { arrival: new Date(departure.getTime() + outbound.durationSeconds * 1000),
    outboundKilometres: outbound.distanceMetres / 1000,
    totalKilometres: (outbound.distanceMetres + (includeReturn ? returnLeg?.distanceMetres ?? outbound.distanceMetres : 0)) / 1000,
    returnAssumption: includeReturn && !returnLeg ? "Return distance estimated by doubling the outbound distance." : null };
}

const weekdays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const minuteOfDay = (value: string) => {
  const parts = /^(\d{2}):(\d{2})$/.exec(value);
  if (!parts || +parts[1] > 23 || +parts[2] > 59) return null;
  return +parts[1] * 60 + +parts[2];
};
export function parseSouthAfricanDeparture(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || minuteOfDay(time) === null) return null;
  const result = new Date(`${date}T${time}:00+02:00`);
  if (!Number.isFinite(result.getTime())) return null;
  const local = new Date(result.getTime() + 2 * 60 * 60 * 1000);
  return local.toISOString().slice(0, 10) === date ? result : null;
}
export function withSouthAfricanDepartureDay(value: Date, dayOffset: number, now = new Date()) {
  const localNow = new Date(now.getTime() + 7200000);
  const localValue = new Date(value.getTime() + 7200000);
  return new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate() + dayOffset,
    localValue.getUTCHours(), localValue.getUTCMinutes()) - 7200000);
}
export type ArrivalHours = { state: "within" | "outside" | "unknown"; minutesRemaining: number | null; endsAt: string | null };
export function compareArrivalWithHours(arrival: Date, hours?: OpeningHours[]): ArrivalHours {
  const unknown: ArrivalHours = { state: "unknown", minutesRemaining: null, endsAt: null };
  if (!hours?.length || !Number.isFinite(arrival.getTime())) return unknown;
  // South Africa stays UTC+02:00; no device timezone or DST enters the calculation.
  const local = new Date(arrival.getTime() + 2 * 60 * 60 * 1000);
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - 2 * 60 * 60 * 1000;
  const today = local.getUTCDay();
  let missing = false;
  for (const offset of [-1, 0]) {
    const day = weekdays[(today + offset + 7) % 7];
    const rows = hours.filter((row) => row.day.slice(0, 3).toLowerCase() === day);
    if (rows.length !== 1) { missing = true; continue; }
    const row = rows[0];
    if (row.isClosed) continue;
    const open = minuteOfDay(row.openTime);
    const close = minuteOfDay(row.closeTime);
    if (open === null || close === null) { missing = true; continue; }
    const begins = midnight + offset * 86400000 + open * 60000;
    const ends = midnight + offset * 86400000 + (close + (close <= open ? 1440 : 0)) * 60000;
    if (arrival.getTime() >= begins && arrival.getTime() < ends) return { state: "within", minutesRemaining: (ends - arrival.getTime()) / 60000, endsAt: new Date(ends).toISOString() };
  }
  return missing ? unknown : { state: "outside", minutesRemaining: null, endsAt: null };
}

export type FuelPriceRecord = { grade: FuelGrade; region: FuelRegion; zarPerLitre: number; effectiveAt: string; effectiveUntil: string | null; checkedAt: string; sourceUrl: string; kind: "retail_reference" | "wholesale_reference" };
export function usableFuelPrice(record: FuelPriceRecord | null, grade: FuelGrade | null, region: FuelRegion | null, now = Date.now()) {
  if (!record || record.grade !== grade || record.region !== region || !positiveNumber(record.zarPerLitre) ||
    !Number.isFinite(Date.parse(record.effectiveAt)) || Date.parse(record.effectiveAt) > now ||
    (record.effectiveUntil !== null && (!Number.isFinite(Date.parse(record.effectiveUntil)) || Date.parse(record.effectiveUntil) <= now || Date.parse(record.effectiveUntil) <= Date.parse(record.effectiveAt))) ||
    !Number.isFinite(Date.parse(record.checkedAt)) || Date.parse(record.checkedAt) > now || now - Date.parse(record.checkedAt) >= 48 * 3600000 || !/^https:\/\//.test(record.sourceUrl)) return null;
  if (grade?.startsWith("diesel_") && record.kind !== "wholesale_reference") return null;
  if (grade?.startsWith("petrol_") && record.kind !== "retail_reference") return null;
  return record;
}
