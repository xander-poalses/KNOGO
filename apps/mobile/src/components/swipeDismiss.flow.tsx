import { describe, expect, it } from "vitest";
import { shouldDismissSheet } from "./swipeDismiss";

describe("sheet dismissal", () => {
  it("requires travel before a flick can dismiss", () => {
    expect(shouldDismissSheet(0, 2000, 800)).toBe(false);
    expect(shouldDismissSheet(20, 2000, 800)).toBe(false);
    expect(shouldDismissSheet(30, 800, 800)).toBe(true);
  });
  it("dismisses a pull but not an upward gesture or a short drag", () => {
    expect(shouldDismissSheet(150, 0, 800)).toBe(true);
    expect(shouldDismissSheet(60, 0, 800)).toBe(false);
    expect(shouldDismissSheet(-150, -900, 800)).toBe(false);
    expect(shouldDismissSheet(110, 0, 400)).toBe(true);
  });
});
