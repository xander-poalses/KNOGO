import { describe, expect, it } from "vitest";
import {
  PLACE_CACHE_MAX_AGE_MS,
  PLACE_CACHE_SCHEMA_VERSION,
  parsePlaceDataCache,
  type PlaceDataCache
} from "../../packages/core/src/placeCache";
import { getCurrentStatus, mockPlaces } from "@knogo/core";

function cacheAt(fetchedAt: string): PlaceDataCache {
  return { schemaVersion: PLACE_CACHE_SCHEMA_VERSION, fetchedAt, places: [], groups: [] };
}

describe("place data cache", () => {
  it("restores venue facts while replacing a malformed trust snapshot with unknown", () => {
    const now = Date.parse("2026-10-04T12:00:00Z");
    const place = { ...mockPlaces[0], currentStatus: { ...mockPlaces[0].currentStatus, trust: { version: 1, claims: "broken" } } };
    const result = parsePlaceDataCache({ ...cacheAt("2026-10-04T11:00:00Z"), places: [place] }, now);
    expect(result?.cache.places[0].name).toBe(place.name);
    expect(getCurrentStatus(result!.cache.places[0].currentStatus, new Date(now)).isOpen).toBeNull();
  });
  it.each([null, {}, { ...mockPlaces[0], cuisine: null }, { ...mockPlaces[0], openingHours: [null] }, { ...mockPlaces[0], currentStatus: null }])("rejects malformed venue records (%j)", place => {
    expect(parsePlaceDataCache({ ...cacheAt("2026-10-04T11:00:00Z"), places: [place] }, Date.parse("2026-10-04T12:00:00Z"))).toBeNull();
  });
  it("rejects malformed groups, duplicate IDs and future fetch times", () => {
    const now = Date.parse("2026-10-04T12:00:00Z");
    expect(parsePlaceDataCache({ ...cacheAt("2026-10-04T11:00:00Z"), groups: [null] }, now)).toBeNull();
    expect(parsePlaceDataCache({ ...cacheAt("2026-10-04T11:00:00Z"), places: [mockPlaces[0], mockPlaces[0]] }, now)).toBeNull();
    expect(parsePlaceDataCache(cacheAt("2026-10-04T13:00:00Z"), now)).toBeNull();
    expect(parsePlaceDataCache({ ...cacheAt("2026-10-04T11:00:00Z"), places: [{ ...mockPlaces[0], features: [""] }] }, now)).toBeNull();
    expect(parsePlaceDataCache({ ...cacheAt("2026-10-04T11:00:00Z"), places: [{ ...mockPlaces[0], currentStatus: { ...mockPlaces[0].currentStatus, busyLevel: { toString: "broken" } } }] }, now)).toBeNull();
  });
  it("restores a current cache", () => {
    const now = Date.parse("2026-08-28T12:00:00Z");
    const result = parsePlaceDataCache(cacheAt("2026-08-28T11:00:00Z"), now);
    expect(result?.expired).toBe(false);
    expect(result?.cache.places).toEqual([]);
  });

  it("marks an old cache as expired without discarding it", () => {
    const fetchedAt = Date.parse("2026-08-01T00:00:00Z");
    const result = parsePlaceDataCache(cacheAt(new Date(fetchedAt).toISOString()), fetchedAt + PLACE_CACHE_MAX_AGE_MS + 1);
    expect(result?.expired).toBe(true);
  });

  it("rejects malformed and unsupported cache records", () => {
    expect(parsePlaceDataCache("broken")).toBeNull();
    expect(parsePlaceDataCache({ schemaVersion: 99, fetchedAt: new Date().toISOString(), places: [], groups: [] })).toBeNull();
    expect(parsePlaceDataCache({ schemaVersion: 1, fetchedAt: "not-a-date", places: {}, groups: [] })).toBeNull();
  });
});
