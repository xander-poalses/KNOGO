import { defaultFilters, isFoodCategory, type Place, type PlaceCategory, type PlaceFilters } from "@knogo/core";

export function directoryFilterOptions(places: Place[], categories: PlaceCategory[]) {
  const types = [...new Set(places.map(place => place.placeType ?? place.category))].map(id => {
    const text = id.replaceAll("_", " ");
    return { id, label: text.charAt(0).toUpperCase() + text.slice(1) };
  }).sort((a, b) => a.label.localeCompare(b.label));
  const only = (...values: PlaceCategory[]) => categories.length > 0 && categories.every(category => values.includes(category));
  const tagLabel = categories.length > 0 && categories.every(isFoodCategory) ? null
    : only("shops", "pharmacy", "hardware") ? "Departments"
      : only("automotive", "petrol_station") ? "Services & fuel"
        : only("public_services", "government_office") ? "Services"
          : only("sport_outdoors", "entertainment") ? "Activities" : "Services & activities";
  return { types, tags: [...new Set(places.flatMap(place => place.cuisine))].sort(), tagLabel };
}

export function filterCapabilities(categories: PlaceCategory[]) {
  return {
    dining: categories.length > 0 && categories.every(category => category === "restaurant" || category === "bar"),
    cuisines: categories.length > 0 && categories.every(isFoodCategory)
  };
}

export function contextualFilters(filters: PlaceFilters, categories: PlaceCategory[]): PlaceFilters {
  const supported = filterCapabilities(categories);
  return { ...filters, openNow: false, kitchenServing: false, walkIns: false, backupPower: false, cardWorking: false,
    openAfter: supported.dining ? filters.openAfter : defaultFilters.openAfter,
    busyLevel: supported.dining ? filters.busyLevel : defaultFilters.busyLevel,
    tags: categories.length > 0 && categories.every(isFoodCategory) ? [] : filters.tags,
    cuisines: supported.cuisines ? filters.cuisines : [] };
}
