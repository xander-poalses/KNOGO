import { createElement } from "react";
import { useTheme } from "../theme";

export function rememberFocus() {
  const trigger = typeof document !== "undefined" ? document.activeElement : null;
  const label = trigger?.getAttribute("aria-label");
  return () => {
    if (typeof HTMLElement === "undefined" || !(trigger instanceof HTMLElement)) return;
    if (trigger.isConnected) { trigger.focus(); return; }
    if (!label) return;
    // A sheet step can unmount its trigger, then recreate it with a changed value.
    const replacement = Array.from(document.querySelectorAll<HTMLElement>("button[aria-label]")).find(element => {
      const candidate = element.getAttribute("aria-label");
      return candidate === label || (label.includes(": ") && candidate?.startsWith(`${label.split(": ")[0]}: `));
    });
    replacement?.focus();
  };
}

export function AccessibilityStyles() {
  const { colours } = useTheme();
  return createElement("style", null, `
    :is(button, a, input, select, textarea, [tabindex], [role="button"], [role="link"]):focus-visible {
      outline: 3px solid ${colours.focus} !important;
      outline-offset: 3px !important;
    }
    :is(button, a, input, select, textarea, [tabindex]) {
      scroll-margin-block: 100px;
    }
  `);
}
