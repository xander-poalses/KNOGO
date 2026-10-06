import { describe, expect, it } from "vitest";
import { compareArrivalWithHours } from "@knogo/core";
import { describeArrivalHours } from "./arrivalPresentation";

describe("arrival timing copy", () => {
  it("shows the time remaining without rounding it up", () => {
    expect(describeArrivalHours({ state: "within", minutesRemaining: 90.9, endsAt: null })).toBe("1 hr 30 min before closing.");
    expect(describeArrivalHours({ state: "within", minutesRemaining: 60, endsAt: null })).toBe("1 hr before closing.");
    expect(describeArrivalHours({ state: "within", minutesRemaining: .5, endsAt: null })).toBe("Less than 1 min before closing.");
  });
  it("does not call missing service hours closed", () => {
    expect(describeArrivalHours(compareArrivalWithHours(new Date("2026-10-04T10:00:00Z"), undefined))).toBe("Hours not available for arrival.");
  });
  it("keeps closing time across midnight", () => {
    const hours = [{ day: "Saturday", openTime: "18:00", closeTime: "02:00", isClosed: false }];
    const result = compareArrivalWithHours(new Date("2026-10-03T22:30:00Z"), hours);
    expect(describeArrivalHours(result)).toBe("1 hr 30 min before closing.");
    expect(result.endsAt).toBe("2026-10-04T00:00:00.000Z");
  });
  it("qualifies the outside-hours answer as a schedule", () => {
    expect(describeArrivalHours({ state: "outside", minutesRemaining: null, endsAt: null })).toBe("Outside listed hours on arrival.");
  });
});
