import { defaultFilters, type PlaceCategory, type PlaceFilters } from "@knogo/core";

export function filterCapabilities(categories: PlaceCategory[]) {
  return {
    dining: categories.length > 0 && categories.every(category => category === "restaurant" || category === "bar"),
    cuisines: categories.length > 0 && categories.every(category => ["restaurant", "bar", "quick_bites", "cafe"].includes(category))
  };
}

export function contextualFilters(filters: PlaceFilters, categories: PlaceCategory[]): PlaceFilters {
  const supported = filterCapabilities(categories);
  return { ...filters, openNow: false, kitchenServing: false, walkIns: false, backupPower: false, cardWorking: false,
    openAfter: supported.dining ? filters.openAfter : defaultFilters.openAfter,
    busyLevel: supported.dining ? filters.busyLevel : defaultFilters.busyLevel,
    cuisines: supported.cuisines ? filters.cuisines : [] };
}
