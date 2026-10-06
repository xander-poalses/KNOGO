import { describe, expect, it } from "vitest";
import { defaultFilters } from "@knogo/core";
import { contextualFilters, filterCapabilities } from "./filterContext";

describe("service filter context", () => {
  it("supports dining filters for restaurants and bars", () => {
    expect(filterCapabilities(["restaurant", "bar"])).toEqual({ dining: true, cuisines: true });
  });
  it("keeps cuisine for takeaway but not dining filters", () => {
    expect(filterCapabilities(["quick_bites"])).toEqual({ dining: false, cuisines: true });
  });
  it("does not offer food filters across mixed services", () => {
    expect(filterCapabilities(["restaurant", "pharmacy"])).toEqual({ dining: false, cuisines: false });
  });
  it("neutralises hidden filters while keeping area and query", () => {
    const result = contextualFilters({ ...defaultFilters, query: "shop", areas: ["Brooklyn"], cuisines: ["Pizza"], openNow: true, kitchenServing: true, walkIns: true, backupPower: true, cardWorking: true, openAfter: "21:00", busyLevel: "busy" }, ["hardware"]);
    expect(result).toEqual({ ...defaultFilters, query: "shop", areas: ["Brooklyn"] });
  });
});
