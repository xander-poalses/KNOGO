import { describe, expect, it } from "vitest";
import { buildDiscoveryItems, distanceKm, formatDistance, mergeRecentSearches, requestDiscoveryLocation } from "@knogo/core";
import { mockPlaces } from "../data/mockPlaces";

describe("discovery helpers", () => {
  it("calculates and formats local distance", () => {
    const value = distanceKm({ latitude: -25.75, longitude: 28.20 }, { latitude: -25.76, longitude: 28.21 });
    expect(value).toBeGreaterThan(1);
    expect(formatDistance(value)).toMatch(/km$/);
    expect(formatDistance(0.35)).toBe("350 m");
  });

  it("replaces grouped branches with one group tile", () => {
    const branches = mockPlaces.slice(0, 2).map((place, index) => ({ ...place, id: `branch-${index}`, groupId: "group-1" }));
    const items = buildDiscoveryItems(branches, [{ id: "group-1", name: "Branch Group", slug: "branch-group", category: "restaurant", cuisine: [], features: [], branchIds: branches.map((place) => place.id) }], null);
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe("group");
  });

  it("sorts groups and places by their nearest coordinate", () => {
    const near = { ...mockPlaces[0], id: "near", name: "Near", latitude: -25.75, longitude: 28.20 };
    const far = { ...mockPlaces[1], id: "far", name: "Far", latitude: -26.1, longitude: 28.6 };
    const items = buildDiscoveryItems([far, near], [], { latitude: -25.751, longitude: 28.201 });
    expect(items.map((item) => item.id)).toEqual(["near", "far"]);
  });

  it("handles granted, denied and unavailable discovery location", async () => {
    const base = { getPermission: async () => "undetermined" as const, getCoordinates: async () => ({ latitude: -25.75, longitude: 28.2 }) };
    await expect(requestDiscoveryLocation({ ...base, hasServices: async () => true, requestPermission: async () => "granted" })).resolves.toMatchObject({ permission: "granted", coordinates: { latitude: -25.75 } });
    await expect(requestDiscoveryLocation({ ...base, hasServices: async () => true, requestPermission: async () => "denied" })).resolves.toMatchObject({ permission: "denied", coordinates: null });
    await expect(requestDiscoveryLocation({ ...base, hasServices: async () => false, requestPermission: async () => "granted" })).resolves.toMatchObject({ permission: "unavailable", coordinates: null });
  });

  it("recovers when discovery location times out", async () => {
    const result = await requestDiscoveryLocation({ hasServices: async () => true, getPermission: async () => "granted", requestPermission: async () => "granted", getCoordinates: () => new Promise(() => undefined) }, 1);
    expect(result.error).toContain("timed out");
    expect(result.coordinates).toBeNull();
  });

  it("deduplicates and limits recent searches", () => {
    expect(mergeRecentSearches(["Spur", "Pizza"], "spur")).toEqual(["spur", "Pizza"]);
    expect(mergeRecentSearches(["1", "2", "3"], "4", 3)).toEqual(["4", "1", "2"]);
    expect(mergeRecentSearches(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"], "11")).toEqual(["11", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);
  });
});
