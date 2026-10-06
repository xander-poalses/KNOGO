import { describe, expect, it } from "vitest";
import { getCloseTime, getWeeklyHours } from "./time";

const monday = new Date("2026-09-28T12:00:00Z");

describe("getCloseTime", () => {
  it("does not call missing hours closed", () => {
    expect(getCloseTime([], monday)).toBe("Trading hours not published");
  });

  it("calls a published closure closed", () => {
    expect(getCloseTime([{ day: "Mon", openTime: "", closeTime: "", isClosed: true }], monday)).toBe("Closed today");
  });

  it("does not invent a closing time from incomplete hours", () => {
    expect(getCloseTime([{ day: "Mon", openTime: "08:00", closeTime: "", isClosed: false }], monday)).toBe("Trading hours not published");
  });

  it("keeps seven days and leaves missing kitchen hours unknown", () => {
    const opening = [{ day: "Monday", openTime: "08:00", closeTime: "21:00", isClosed: false }];
    const kitchen = [{ day: "Tue", openTime: "09:00", closeTime: "20:00", isClosed: false }];
    const rows = getWeeklyHours(opening, kitchen);
    expect(rows).toHaveLength(7);
    expect(rows[0]).toEqual({ day: "Mon", opening: opening[0], kitchen: undefined });
    expect(rows[1]).toEqual({ day: "Tue", opening: undefined, kitchen: kitchen[0] });
    expect(rows[6]).toEqual({ day: "Sun", opening: undefined, kitchen: undefined });
  });
});
