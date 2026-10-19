import { describe, expect, it } from "vitest";
import { directoryCategories, isFoodCategory, mapSupabasePlace } from "@knogo/core";

describe("directory categories", () => {
  it("keeps legacy categories inside the six directory categories", () => {
    expect(directoryCategories).toHaveLength(6);
    expect(directoryCategories.find(category => category.id === "shops")?.members).toContain("pharmacy");
    expect(directoryCategories.find(category => category.id === "automotive")?.members).toContain("petrol_station");
    expect(isFoodCategory("restaurant")).toBe(true);
    expect(isFoodCategory("food_drink")).toBe(true);
    expect(isFoodCategory("public_services")).toBe(false);
  });
  it.each(["shops", "automotive", "public_services", "entertainment", "sport_outdoors"])("does not turn %s into a restaurant", category => {
    const place = mapSupabasePlace({ place: {
      id: "branch", slug: "branch", name: "Branch", category_id: category, place_type: "supermarket", region_id: "menlyn", address: "Menlyn", latitude: -25.78, longitude: 28.27,
      source_url: "https://example.com/branch", source_checked_at: "2026-10-16", data_notes: "Hours not published.", phone: null, website: null, menu_url: null, features: [], tags: [], is_active: true
    }, hours: [] });
    expect(place.category).toBe(category);
    expect(place.placeType).toBe("supermarket");
    expect(place.sourceUrl).toBe("https://example.com/branch");
    expect(place.openingHours).toEqual([]);
    expect(place.currentStatus.isOpen).toBeNull();
  });
});
