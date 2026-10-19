import { describe, expect, it } from "vitest";
import { defaultFilters, foodCategories, mockPlaces } from "@knogo/core";
import { contextualFilters, directoryFilterOptions, filterCapabilities } from "./filterContext";

describe("service filter context", () => {
  it.each([
    ["shops", "Departments"], ["automotive", "Services & fuel"], ["public_services", "Services"],
    ["entertainment", "Activities"], ["sport_outdoors", "Activities"]
  ] as const)("names %s tags for their category", (category, label) => {
    const places = [{ ...mockPlaces[0], category, placeType: "test_type", cuisine: ["One", "Two", "One"] }];
    expect(directoryFilterOptions(places, [category])).toEqual({ types: [{ id: "test_type", label: "Test type" }], tags: ["One", "Two"], tagLabel: label });
  });
  it("keeps food cuisines separate from service tags and sorts type labels", () => {
    const places = [{ ...mockPlaces[0], category: "bar" as const, placeType: undefined }, { ...mockPlaces[0], category: "restaurant" as const, placeType: undefined }];
    expect(directoryFilterOptions(places, ["bar", "restaurant"]).types.map(t => t.id)).toEqual(["bar", "restaurant"]);
    expect(directoryFilterOptions(places, ["bar", "restaurant"]).tagLabel).toBeNull();
    expect(contextualFilters({ ...defaultFilters, tags: ["Fuel"] }, ["restaurant"]).tags).toEqual([]);
  });
  it("supports dining filters for restaurants and bars", () => {
    expect(filterCapabilities(["restaurant", "bar"])).toEqual({ dining: true, cuisines: true });
  });
  it("keeps cuisine for takeaway but not dining filters", () => {
    expect(filterCapabilities(["quick_bites"])).toEqual({ dining: false, cuisines: true });
  });
  it("keeps cuisines for the aggregate food category without enabling dining filters", () => {
    expect(filterCapabilities(foodCategories)).toEqual({ dining: false, cuisines: true });
    expect(filterCapabilities(["food_drink"])).toEqual({ dining: false, cuisines: true });
    expect(contextualFilters({ ...defaultFilters, cuisines: ["Pizza"], tags: ["Fuel"] }, foodCategories)).toEqual({ ...defaultFilters, cuisines: ["Pizza"] });
  });
  it("does not offer food filters across mixed services", () => {
    expect(filterCapabilities(["restaurant", "pharmacy"])).toEqual({ dining: false, cuisines: false });
  });
  it("neutralises hidden filters while keeping area and query", () => {
    const result = contextualFilters({ ...defaultFilters, query: "shop", areas: ["Brooklyn"], cuisines: ["Pizza"], openNow: true, kitchenServing: true, walkIns: true, backupPower: true, cardWorking: true, openAfter: "21:00", busyLevel: "busy" }, ["hardware"]);
    expect(result).toEqual({ ...defaultFilters, query: "shop", areas: ["Brooklyn"] });
  });
});
