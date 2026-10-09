import { afterEach, describe, expect, it, vi } from "vitest";
import { rememberFocus } from "./AccessibilityStyles";

vi.mock("../theme", () => ({ useTheme: () => ({ colours: {} }) }));
afterEach(() => { document.body.replaceChildren(); });

describe("sheet focus return", () => {
  it("returns to a recreated trip control after an inline step", () => {
    const trigger = document.createElement("button"); trigger.setAttribute("aria-label", "From: Your location. Change from");
    document.body.append(trigger); trigger.focus(); const restore = rememberFocus(); trigger.remove();
    const replacement = document.createElement("button"); replacement.setAttribute("aria-label", "From: Menlyn. Change from"); document.body.append(replacement);
    restore(); expect(document.activeElement).toBe(replacement);
  });
  it("does not use DOM constructors in a native runtime", () => {
    const restore = rememberFocus(); vi.stubGlobal("HTMLElement", undefined);
    try { expect(() => restore()).not.toThrow(); } finally { vi.unstubAllGlobals(); }
  });
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
