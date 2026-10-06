import { describe, expect, it } from "vitest";
import { calculateTankConsumption, compareArrivalWithHours, estimateFuel, parseFuelPreferences, parseSouthAfricanDeparture, planJourney, usableFuelPrice, withSouthAfricanDepartureDay } from "@knogo/core";

describe("trip and fuel calculations", () => {
  it("keeps the chosen time when choosing today or tomorrow in South Africa", () => {
    const chosen = new Date("2026-10-03T16:30:00Z");
    const now = new Date("2026-10-01T23:30:00Z");
    expect(withSouthAfricanDepartureDay(chosen, 0, now).toISOString()).toBe("2026-10-02T16:30:00.000Z");
    expect(withSouthAfricanDepartureDay(chosen, 1, now).toISOString()).toBe("2026-10-03T16:30:00.000Z");
  });
  it("uses full-tank measurements, not arbitrary refills", () => {
    expect(calculateTankConsumption(400,32,true)).toBe(8);
    expect(calculateTankConsumption(400,32,false)).toBeNull();
    expect(calculateTankConsumption(0,32,true)).toBeNull();
  });
  it("calculates litres and ZAR without replacing missing inputs with zero", () => {
    expect(estimateFuel(50,8,25)).toEqual({litres:4,costZar:100});
    expect(estimateFuel(50,8,null)).toEqual({litres:4,costZar:null});
    expect(estimateFuel(50,null,25)).toEqual({litres:null,costZar:null});
  });
  it("does not use the return leg for outbound arrival", () => {
    const journey=planJourney({distanceMetres:10000,durationSeconds:600},new Date("2026-10-01T10:00:00Z"),true,{distanceMetres:14000,durationSeconds:1200});
    expect(journey.totalKilometres).toBe(24);
    expect(journey.arrival.toISOString()).toBe("2026-10-01T10:10:00.000Z");
    expect(journey.returnAssumption).toBeNull();
    expect(planJourney({distanceMetres:10000,durationSeconds:600},new Date(),true).returnAssumption).toContain("doubling");
  });
  it("handles South African midnight arrivals within an overnight interval", () => {
    const result=compareArrivalWithHours(new Date("2026-10-01T22:30:00Z"),[{day:"Thursday",openTime:"18:00",closeTime:"02:00",isClosed:false}]);
    expect(result.state).toBe("within");
    expect(result.minutesRemaining).toBe(90);
    expect(compareArrivalWithHours(new Date("2026-10-02T00:00:00Z"),[]).state).toBe("unknown");
  });
  it("rejects invalid dates, numbers and preferences", () => {
    expect(parseSouthAfricanDeparture("2026-02-30","12:00")).toBeNull();
    expect(parseSouthAfricanDeparture("2026-10-01","12:00")?.toISOString()).toBe("2026-10-01T10:00:00.000Z");
    expect(parseFuelPreferences({consumptionLPer100Km:-1,grade:"rocket",region:"automatic",priceOverrideZarPerLitre:0})).toEqual({consumptionLPer100Km:null,grade:null,region:null,priceOverrideZarPerLitre:null});
  });
  it("does not use future fuel prices as current prices", () => {
    expect(usableFuelPrice({grade:"petrol_95",region:"inland",zarPerLitre:25,effectiveAt:"2099-01-01",effectiveUntil:"2099-02-01",checkedAt:"2026-10-01",sourceUrl:"https://example.com",kind:"retail_reference"},"petrol_95","inland")).toBeNull();
  });
});
