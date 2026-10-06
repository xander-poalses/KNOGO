import { describe, expect, it } from "vitest";
import { getMapRegion, getPlaceActionLinks } from "@knogo/core";
import { mockPlaces } from "../data/mockPlaces";

describe("place actions and maps", () => {
  it.each(["javascript:alert(1)", "data:text/html,test", "file:///etc/passwd", "https://user:password@example.com", "https://example.com/\nmenu", "not a url"])("does not offer an unusable web action: %s", (url) => {
    const place = { ...mockPlaces[0], phone: undefined, website: url, menuUrl: url };
    expect(getPlaceActionLinks(place).map(action => action.type)).toEqual(["directions"]);
  });
  it("formats a phone number without allowing dial commands", () => {
    const place = { ...mockPlaces[0], phone: "+27 (12) 345-6789" };
    expect(getPlaceActionLinks(place).find(action => action.type === "call")?.url).toBe("tel:+27123456789");
    for (const phone of ["*123#", "0123456789;123", "tel:0123456789", "123", "01234567890123456"]) {
      expect(getPlaceActionLinks({ ...place, phone }).some(action => action.type === "call")).toBe(false);
    }
  });
  it.each([NaN, Infinity, 91])("does not offer directions with unusable coordinates: %s", (latitude) => {
    expect(getPlaceActionLinks({ ...mockPlaces[0], latitude }).some(action => action.type === "directions")).toBe(false);
  });
  it("hides unavailable place actions", () => {
    const place = { ...mockPlaces[0], phone: undefined, website: undefined, menuUrl: undefined };
    expect(getPlaceActionLinks(place).map((action) => action.type)).toEqual(["directions"]);
  });

  it("includes every available place action", () => {
    const place = { ...mockPlaces[0], phone: "0123456789", website: "https://example.com", menuUrl: "https://example.com/menu" };
    expect(getPlaceActionLinks(place).map((action) => action.type)).toEqual(["directions", "call", "website", "menu"]);
  });

  it("builds a map region around all branches", () => {
    const region = getMapRegion([{ latitude: -25.7, longitude: 28.2 }, { latitude: -25.8, longitude: 28.4 }]);
    expect(region?.latitude).toBeCloseTo(-25.75);
    expect(region?.longitudeDelta).toBeGreaterThan(0.2);
    expect(getMapRegion([])).toBeNull();
  });
});
