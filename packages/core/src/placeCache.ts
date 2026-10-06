import type { Place, PlaceGroup } from "./types/place";
import { parseTrustSnapshot } from "./trust";

export const PLACE_CACHE_SCHEMA_VERSION = 1;
export const PLACE_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type PlaceDataCache = {
  schemaVersion: typeof PLACE_CACHE_SCHEMA_VERSION;
  fetchedAt: string;
  places: Place[];
  groups: PlaceGroup[];
};

export type ParsedPlaceDataCache = {
  cache: PlaceDataCache;
  expired: boolean;
};

const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === "string");
const optionalText = (value: unknown) => value === undefined || typeof value === "string";
const categories = ["restaurant", "quick_bites", "bar", "pharmacy", "cafe", "hardware", "vet", "petrol_station", "government_office"];
const features = ["outdoor_seating", "family_friendly", "wheelchair_accessible", "backup_power", "card_payments", "late_night", "walk_ins", "takeaway", "bar", "halaal_friendly", "vegan_options", "pet_friendly"];
const hours = (value: unknown) => Array.isArray(value) && value.every(item => object(item) &&
  typeof item.day === "string" && typeof item.openTime === "string" && typeof item.closeTime === "string" && typeof item.isClosed === "boolean");
const identity = (value: Record<string, unknown>) => ["id", "name", "slug", "category"].every(key => typeof value[key] === "string" && value[key] !== "") &&
  categories.includes(String(value.category)) && strings(value.cuisine) && strings(value.features) && value.features.every(feature => features.includes(feature));
const optionalFields = ["groupId", "groupSlug", "groupName", "description", "phone", "website", "menuUrl", "imageUrl", "imageSourceUrl", "imageAttribution", "imageCheckedAt", "logoUrl", "logoSourceUrl", "logoCheckedAt"];

function validStatus(value: unknown) {
  if (!object(value)) return false;
  return ["isOpen", "isKitchenServing", "acceptsWalkIns", "hasBackupPower", "cardMachineWorking"].every(key => value[key] === null || typeof value[key] === "boolean") &&
    typeof value.busyLevel === "string" && ["quiet", "normal", "busy", "packed", "unknown"].includes(value.busyLevel) &&
    (value.lastConfirmedAt === null || typeof value.lastConfirmedAt === "string") &&
    typeof value.confidenceScore === "number" && Number.isFinite(value.confidenceScore) &&
    typeof value.source === "string" && ["official", "community", "business", "estimated", "unknown"].includes(value.source) &&
    (value.signalConfirmedAt === undefined || object(value.signalConfirmedAt) && Object.values(value.signalConfirmedAt).every(item => typeof item === "string"));
}

function validPlace(value: unknown): value is Place {
  return object(value) && identity(value) && typeof value.area === "string" && typeof value.address === "string" &&
    typeof value.latitude === "number" && Number.isFinite(value.latitude) && typeof value.longitude === "number" && Number.isFinite(value.longitude) &&
    optionalFields.every(key => optionalText(value[key])) && hours(value.openingHours) &&
    (value.kitchenHours === undefined || hours(value.kitchenHours)) && validStatus(value.currentStatus);
}

function validGroup(value: unknown): value is PlaceGroup {
  return object(value) && identity(value) && strings(value.branchIds) && optionalFields.every(key => optionalText(value[key]));
}

export function parsePlaceDataCache(value: unknown, now = Date.now()): ParsedPlaceDataCache | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<PlaceDataCache>;
  const fetchedAt = typeof record.fetchedAt === "string" ? Date.parse(record.fetchedAt) : Number.NaN;
  if (
    record.schemaVersion !== PLACE_CACHE_SCHEMA_VERSION ||
    !Number.isFinite(fetchedAt) || !Number.isFinite(now) ||
    fetchedAt > now ||
    !Array.isArray(record.places) ||
    !Array.isArray(record.groups) ||
    !record.places.every(validPlace) ||
    !record.groups.every(validGroup) ||
    new Set(record.places.map(place => place.id)).size !== record.places.length ||
    new Set(record.groups.map(group => group.id)).size !== record.groups.length
  ) return null;

  return {
    cache: { schemaVersion: PLACE_CACHE_SCHEMA_VERSION, fetchedAt: record.fetchedAt!, groups: record.groups,
      places: record.places.map(place => ({ ...place, currentStatus: place.currentStatus.trust === undefined ? place.currentStatus
        : { ...place.currentStatus, trust: parseTrustSnapshot(place.currentStatus.trust) ?? { version: 1, claims: {} } } })) },
    expired: now - fetchedAt > PLACE_CACHE_MAX_AGE_MS
  };
}
