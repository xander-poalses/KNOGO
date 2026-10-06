import type { Place, PlaceGroup } from "../types/place";

export type Coordinates = { latitude: number; longitude: number };
export type DiscoveryPermission = "granted" | "denied" | "unavailable";

export type DiscoveryLocationAdapter = {
  hasServices: () => Promise<boolean>;
  getPermission: () => Promise<"granted" | "denied" | "undetermined">;
  requestPermission: () => Promise<"granted" | "denied" | "undetermined">;
  getCoordinates: () => Promise<Coordinates>;
};

export async function requestDiscoveryLocation(adapter: DiscoveryLocationAdapter, timeoutMs = 10000): Promise<{ permission: DiscoveryPermission; coordinates: Coordinates | null; error: string | null }> {
  if (!(await adapter.hasServices())) return { permission: "unavailable", coordinates: null, error: "Turn on location services or choose an area." };
  let permission = await adapter.getPermission();
  if (permission !== "granted") permission = await adapter.requestPermission();
  if (permission !== "granted") return { permission: "denied", coordinates: null, error: "Location was not allowed. Choose an area instead." };
  try {
    const coordinates = await Promise.race([
      adapter.getCoordinates(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Location timed out.")), timeoutMs))
    ]);
    return { permission: "granted", coordinates, error: null };
  } catch (cause) {
    return { permission: "granted", coordinates: null, error: `${cause instanceof Error ? cause.message : "Could not find your location."} Choose an area instead.` };
  }
}

export function mergeRecentSearches(current: string[], query: string, limit = 10) {
  const clean = query.trim();
  if (!clean) return current;
  return [clean, ...current.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, limit);
}

export type DiscoveryItem =
  | { kind: "place"; id: string; label: string; place: Place; distanceKm: number | null }
  | { kind: "group"; id: string; label: string; group: PlaceGroup; branches: Place[]; distanceKm: number | null };

export function distanceKm(from: Coordinates, to: Coordinates) {
  const radius = 6371;
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const firstLatitude = radians(from.latitude);
  const secondLatitude = radians(to.latitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function formatDistance(value: number | null) {
  if (value === null) return null;
  if (value < 1) return `${Math.max(1, Math.round(value * 1000))} m`;
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} km`;
}

export function getMapRegion(places: Pick<Place, "latitude" | "longitude">[]) {
  if (!places.length) return null;
  const latitudes = places.map((place) => place.latitude);
  const longitudes = places.map((place) => place.longitude);
  return {
    latitude: latitudes.reduce((sum, value) => sum + value, 0) / places.length,
    longitude: longitudes.reduce((sum, value) => sum + value, 0) / places.length,
    latitudeDelta: Math.max(0.025, Math.max(...latitudes) - Math.min(...latitudes) + 0.02),
    longitudeDelta: Math.max(0.025, Math.max(...longitudes) - Math.min(...longitudes) + 0.02)
  };
}

export function buildDiscoveryItems(places: Place[], groups: PlaceGroup[], coordinates: Coordinates | null): DiscoveryItem[] {
  const groupedIds = new Set<string>();
  const groupItems = groups.flatMap<DiscoveryItem>((group) => {
    const branches = places.filter((place) => place.groupId === group.id);
    if (!branches.length) return [];
    branches.forEach((branch) => groupedIds.add(branch.id));
    const distances = coordinates
      ? branches.map((branch) => distanceKm(coordinates, branch)).sort((left, right) => left - right)
      : [];
    return [{ kind: "group", id: group.id, label: group.name, group, branches, distanceKm: distances[0] ?? null }];
  });
  const placeItems = places
    .filter((place) => !groupedIds.has(place.id))
    .map<DiscoveryItem>((place) => ({
      kind: "place",
      id: place.id,
      label: place.name,
      place,
      distanceKm: coordinates ? distanceKm(coordinates, place) : null
    }));

  return [...groupItems, ...placeItems].sort((left, right) => {
    if (coordinates && left.distanceKm !== right.distanceKm) return (left.distanceKm ?? Infinity) - (right.distanceKm ?? Infinity);
    return left.label.localeCompare(right.label);
  });
}
