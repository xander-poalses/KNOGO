import { describe, expect, it } from "vitest";
import { mockPlaces } from "../data/mockPlaces";
import type { PlaceFilters } from "../types/place";
import { defaultFilters, filterPlaces } from "./filters";
import { resolveTrust, type ConfirmationType, type Place } from "@knogo/core";

const base: PlaceFilters = { ...defaultFilters };
const now = new Date("2026-10-04T13:00:00Z");
function reported(place: Place, answers: Array<[ConfirmationType, string]>, expiresAt = "2026-10-04T16:00:00Z"): Place {
  return { ...place, currentStatus: { ...place.currentStatus, trust: resolveTrust(answers.map(([type, value], index) => ({
    id: `report-${index}`, actorId: `report-${index}`, type, value, source: "community", checkedBy: "phone",
    reportedAt: "2026-10-04T12:00:00Z", expiresAt
  })), now.getTime()) } };
}

describe("filterPlaces", () => {
  it.each(["Cafe", "Caf\u00e9", "CAFE\u0301"])("matches accents and composed forms (%s)", query => {
    const place = { ...mockPlaces[0], name: "Caf\u00e9 S\u00e3o Jo\u00e3o" };
    expect(filterPlaces([place], { ...base, query })).toHaveLength(1);
  });
  it.each(["\u738b\u79c0\u82f1", "\u0646\u0648\u0631"])("keeps non-Latin search letters (%s)", query => {
    const place = { ...mockPlaces[0], id: "unicode", name: query };
    expect(filterPlaces([mockPlaces[0], place], { ...base, query }).map(item => item.id)).toEqual(["unicode"]);
  });
  it("does not treat a symbol-only search as no query", () => {
    expect(filterPlaces(mockPlaces, { ...base, query: "\ud83c\udf7d\ufe0f" })).toHaveLength(0);
  });
  it('matches Other outside named options but not missing information',()=>{
    const named={...mockPlaces[0],id:'named',area:'Menlyn',cuisine:['Pizza']};
    const other={...named,id:'other',area:'New area',cuisine:['New cuisine']};
    const missing={...named,id:'missing',area:'',cuisine:[]};
    const context={namedOptions:{areas:['Menlyn'],cuisines:['Pizza']}};
    expect(filterPlaces([named,other,missing],{...base,areas:['__other__']},now,context).map(p=>p.id)).toEqual(['other']);
    expect(filterPlaces([named,other,missing],{...base,cuisines:['__other__']},now,context).map(p=>p.id)).toEqual(['other']);
  });
  it('applies a nearby radius to individual branches before grouping',()=>{
    const start={latitude:-25.78,longitude:28.27};
    const near={...mockPlaces[0],...start,id:'near'};
    const far={...near,id:'far',latitude:-26.78};
    expect(filterPlaces([near,far],{...base,maxDistanceKm:25},now,{coordinates:start}).map(p=>p.id)).toEqual(['near']);
    expect(filterPlaces([near,far],{...base,maxDistanceKm:'other'},now,{coordinates:start}).map(p=>p.id)).toEqual(['far']);
  });
  it("filters by place type and matches any selected service tag", () => {
    const shop = { ...mockPlaces[0], id: "shop", category: "shops" as const, placeType: "hardware_store", cuisine: ["Tools", "Building supplies"] };
    const workshop = { ...shop, id: "workshop", category: "automotive" as const, placeType: "vehicle_repair_workshop", cuisine: ["Repairs"] };
    expect(filterPlaces([shop, workshop], { ...base, placeTypes: ["hardware_store"] }).map(p => p.id)).toEqual(["shop"]);
    expect(filterPlaces([shop, workshop], { ...base, tags: ["Repairs", "Tools"] })).toHaveLength(2);
    expect(filterPlaces([shop, workshop], { ...base, placeTypes: ["hardware_store"], tags: ["Repairs"] })).toHaveLength(0);
  });
  it("uses legacy category as the type when a place has no place type", () => {
    const place = { ...mockPlaces[0], placeType: undefined };
    expect(filterPlaces([place], { ...base, placeTypes: [place.category] })).toHaveLength(1);
    expect(filterPlaces([place], { ...base, placeTypes: ["fuel_station"] })).toHaveLength(0);
  });
  it("filters by area", () => {
    const results = filterPlaces(mockPlaces, { ...base, areas: ["Hazelwood"] });
    expect(results).toHaveLength(1);
    expect(results[0].area).toBe("Hazelwood");
  });

  it("filters places open after 20:00", () => {
    const closesAtEight = {
      ...mockPlaces[0],
      id: "closes-at-eight",
      openingHours: mockPlaces[0].openingHours.map((hours) => ({ ...hours, closeTime: "20:00" }))
    };
    const results = filterPlaces([closesAtEight, ...mockPlaces], { ...base, openAfter: "20:00" });
    expect(results.every((place) => place.id !== "closes-at-eight")).toBe(true);
  });

  it("keeps unknown status unless a confirming filter is selected", () => {
    const all = filterPlaces(mockPlaces, base);
    const serving = filterPlaces(mockPlaces, { ...base, kitchenServing: true });
    expect(all.some((place) => place.id === "waterkloof-late-plate")).toBe(true);
    expect(serving.some((place) => place.id === "waterkloof-late-plate")).toBe(false);
  });

  it("ignores retired confidence filters instead of treating scores as evidence", () => {
    const results = filterPlaces(mockPlaces, { ...base, confidence: "high" });
    expect(results.map(place => place.id)).toEqual(mockPlaces.map(place => place.id));
  });

  it("filters by cuisine and card status", () => {
    const results = filterPlaces(mockPlaces.map(place => reported(place, [["card_machine", "yes"]])), { ...base, cuisines: ["Pizza"], cardWorking: true }, now);
    expect(results.map((place) => place.id)).toEqual(["faerie-glen-pizza-house"]);
  });

  it.each([
    ["openNow", true, "open_status", "open"],
    ["kitchenServing", true, "kitchen_status", "yes"],
    ["walkIns", true, "walk_ins", "yes"],
    ["backupPower", true, "backup_power", "normal"],
    ["cardWorking", true, "card_machine", "yes"],
    ["busyLevel", "quiet", "busy_level", "quiet"]
  ] as const)("requires a current report for %s, not a legacy boolean", (key, selection, type, value) => {
    const filters = { ...base, [key]: selection };
    const legacy = { ...mockPlaces[0], currentStatus: { ...mockPlaces[0].currentStatus, isOpen: true, isKitchenServing: true, acceptsWalkIns: true, hasBackupPower: true, cardMachineWorking: true, busyLevel: "quiet" as const, confidenceScore: 99 } };
    expect(filterPlaces([legacy], filters, now)).toHaveLength(0);
    const fresh = reported(legacy, [[type, value]]);
    expect(filterPlaces([fresh], filters, now)).toHaveLength(1);
    expect(filterPlaces([fresh], filters, new Date("2026-10-04T16:00:00Z"))).toHaveLength(0);
  });
  it("does not count a conflict as open, and keeps kitchen availability separate", () => {
    const conflict = reported(mockPlaces[0], [["open_status", "open"], ["open_status", "closed"]]);
    expect(filterPlaces([conflict], { ...base, openNow: true }, now)).toHaveLength(0);
    const place = reported(mockPlaces[0], [["open_status", "open"]]);
    expect(filterPlaces([place], { ...base, openNow: true }, now)).toHaveLength(1);
    expect(filterPlaces([place], { ...base, openNow: true, kitchenServing: true }, now)).toHaveLength(0);
  });

  it("matches any selected area", () => {
    const results = filterPlaces(mockPlaces, { ...base, areas: ["Hazelwood", "Faerie Glen"] });
    expect(new Set(results.map((place) => place.area))).toEqual(new Set(["Hazelwood", "Faerie Glen"]));
  });

  it("matches any cuisine but requires the selected area group", () => {
    const results = filterPlaces(mockPlaces, { ...base, areas: ["Faerie Glen"], cuisines: ["Pizza", "Italian"] });
    expect(results.every((place) => place.area === "Faerie Glen")).toBe(true);
    expect(results.every((place) => place.cuisine.some((value) => ["Pizza", "Italian"].includes(value)))).toBe(true);
  });

  it("searches names, groups, addresses, categories and features", () => {
    const grouped = {
      ...mockPlaces[0],
      name: "Hatfield Branch",
      groupName: "Padstal",
      category: "bar" as const,
      address: "495 Hilda Street, Pretoria",
      features: ["late_night" as const]
    };

    expect(filterPlaces([grouped], { ...base, query: "Padstal" })).toHaveLength(1);
    expect(filterPlaces([grouped], { ...base, query: "Hilda Street" })).toHaveLength(1);
    expect(filterPlaces([grouped], { ...base, query: "bars" })).toHaveLength(1);
    expect(filterPlaces([grouped], { ...base, query: "late night" })).toHaveLength(1);
  });

  it("supports common quick-bite search terms", () => {
    const quickBite = { ...mockPlaces[0], category: "quick_bites" as const };
    expect(filterPlaces([quickBite], { ...base, query: "fast food" })).toHaveLength(1);
    expect(filterPlaces([quickBite], { ...base, query: "takeaway" })).toHaveLength(1);
  });

  it.each([
    ["Padstal", { name: "Padstal Lynnwood" }],
    ["Spur", { groupName: "Spur" }],
    ["Hazelwood", { area: "Hazelwood" }],
    ["pizza", { cuisine: ["Pizza"] }],
    ["bars", { category: "bar" as const }],
    ["fast food", { category: "quick_bites" as const }],
    ["takeaway", { category: "quick_bites" as const }]
  ])("finds a place for the global term %s", (query, fields) => {
    const place = { ...mockPlaces[0], ...fields };
    expect(filterPlaces([place], { ...base, query })).toHaveLength(1);
  });
});
