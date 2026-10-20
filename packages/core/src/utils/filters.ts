import type { Place, PlaceFilters } from "../types/place";
import { getCurrentStatus } from "./status";
import { closesAfter, getTodayHours } from "./time";
import { distanceKm, type Coordinates } from "./discovery";

export const otherFilterValue = "__other__";
export type PlaceFilterContext = { coordinates?: Coordinates | null; namedOptions?: Partial<Record<"areas" | "cuisines" | "placeTypes" | "tags", string[]>> };

export const defaultFilters: PlaceFilters = {
  query: "",
  areas: [],
  placeTypes: [],
  tags: [],
  openNow: false,
  openAfter: "none",
  kitchenServing: false,
  walkIns: false,
  busyLevel: "any",
  backupPower: false,
  cardWorking: false,
  cuisines: [],
  confidence: "any"
};

export function filterPlaces(places: Place[], filters: PlaceFilters, now = new Date(), context: PlaceFilterContext = {}) {
  const query = normaliseSearch(filters.query);
  if (filters.query.trim() && !query) return [];
  const named = {
    areas: places.map(place => place.area), placeTypes: places.map(place => place.placeType ?? place.category),
    cuisines: places.flatMap(place => place.cuisine), tags: places.flatMap(place => place.cuisine), ...context.namedOptions
  };
  const matches = (key: keyof typeof named, values: string[], selected: string[]) => !selected.length || values.some(value => {
    if (!value.trim() || value.toLowerCase() === "unknown") return false;
    if (selected.includes(value)) return true;
    return selected.includes(otherFilterValue) && (value.toLowerCase() === "other" || !named[key].includes(value));
  });

  return places.filter((place) => {
    const status = getCurrentStatus(place.currentStatus, now);
    const hasTrust = status.trust?.version === 1;
    if (query) {
      const categoryTerms = place.category === "quick_bites"
        ? ["quick bites", "fast food", "takeaway"]
        : place.category === "bar"
          ? ["bar", "bars", "pub", "nightlife"]
          : place.category === "restaurant"
            ? ["restaurant", "restaurants", "sit down"]
            : [place.category];
      const haystack = normaliseSearch([
        place.name,
        place.groupName ?? "",
        place.area,
        place.address,
        place.placeType ?? "",
        ...place.cuisine,
        ...place.features,
        ...categoryTerms
      ].join(" "));
      if (!haystack.includes(query)) return false;
    }

    if (!matches("areas", [place.area], filters.areas)) return false;
    if (!matches("placeTypes", [place.placeType ?? place.category], filters.placeTypes ?? [])) return false;
    if (!matches("tags", place.cuisine, filters.tags ?? [])) return false;
    if (context.coordinates && filters.maxDistanceKm !== undefined) {
      const distance = distanceKm(context.coordinates, place);
      if (!Number.isFinite(distance) || (filters.maxDistanceKm === "other" ? distance <= 50 : distance > filters.maxDistanceKm)) return false;
    }
    if (filters.openNow && (!hasTrust || status.isOpen !== true)) return false;
    if (filters.openAfter === "other") {
      const today = getTodayHours(place.openingHours, now);
      if (!today || today.isClosed || !/^\d{2}:\d{2}$/.test(today.closeTime) || closesAfter(place.openingHours, "20:00", now)) return false;
    } else if (filters.openAfter !== "none" && !closesAfter(place.openingHours, filters.openAfter, now)) return false;
    if (filters.kitchenServing && (!hasTrust || status.isKitchenServing !== true)) return false;
    if (filters.walkIns && (!hasTrust || status.acceptsWalkIns !== true)) return false;
    if (filters.busyLevel === "other") {
      if (!hasTrust || ["quiet", "normal", "busy", "packed", "unknown"].includes(status.busyLevel)) return false;
    } else if (filters.busyLevel !== "any" && (!hasTrust || status.busyLevel !== filters.busyLevel)) return false;
    if (filters.backupPower && (!hasTrust || status.hasBackupPower !== true)) return false;
    if (filters.cardWorking && (!hasTrust || status.cardMachineWorking !== true)) return false;
    if (!matches("cuisines", place.cuisine, filters.cuisines)) return false;

    return true;
  });
}

function normaliseSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}\p{M}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getCuisineOptions(places: Place[]) {
  return Array.from(new Set(places.flatMap((place) => place.cuisine))).sort();
}
