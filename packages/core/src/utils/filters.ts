import type { Place, PlaceFilters } from "../types/place";
import { getCurrentStatus } from "./status";
import { closesAfter } from "./time";

export const defaultFilters: PlaceFilters = {
  query: "",
  areas: [],
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

export function filterPlaces(places: Place[], filters: PlaceFilters, now = new Date()) {
  const query = normaliseSearch(filters.query);

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
        ...place.cuisine,
        ...place.features,
        ...categoryTerms
      ].join(" "));
      if (!haystack.includes(query)) return false;
    }

    if (filters.areas.length > 0 && !filters.areas.includes(place.area)) return false;
    if (filters.openNow && (!hasTrust || status.isOpen !== true)) return false;
    if (filters.openAfter !== "none" && !closesAfter(place.openingHours, filters.openAfter)) return false;
    if (filters.kitchenServing && (!hasTrust || status.isKitchenServing !== true)) return false;
    if (filters.walkIns && (!hasTrust || status.acceptsWalkIns !== true)) return false;
    if (filters.busyLevel !== "any" && (!hasTrust || status.busyLevel !== filters.busyLevel)) return false;
    if (filters.backupPower && (!hasTrust || status.hasBackupPower !== true)) return false;
    if (filters.cardWorking && (!hasTrust || status.cardMachineWorking !== true)) return false;
    if (filters.cuisines.length > 0 && !filters.cuisines.some((cuisine) => place.cuisine.includes(cuisine))) return false;

    return true;
  });
}

function normaliseSearch(value: string) {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getCuisineOptions(places: Place[]) {
  return Array.from(new Set(places.flatMap((place) => place.cuisine))).sort();
}
