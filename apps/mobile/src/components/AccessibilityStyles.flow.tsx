import { afterEach, describe, expect, it, vi } from "vitest";
import { rememberFocus } from "./AccessibilityStyles";

vi.mock("../theme", () => ({ useTheme: () => ({ colours: {} }) }));
afterEach(() => { document.body.replaceChildren(); });

describe("sheet focus return", () => {
  it("returns to the opening control after dismissal", () => {
    const trigger = document.createElement("button");
    const sheetInput = document.createElement("input");
    document.body.append(trigger, sheetInput);
    trigger.focus();
    const restore = rememberFocus();
    sheetInput.focus();
    restore();
    expect(document.activeElement).toBe(trigger);
  });
  it("does not focus a control that was removed", () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const restore = rememberFocus();
    trigger.remove();
    expect(() => restore()).not.toThrow();
    expect(document.activeElement).toBe(document.body);
  });
});
