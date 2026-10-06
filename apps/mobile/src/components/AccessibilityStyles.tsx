import { createElement } from "react";
import { useTheme } from "../theme";

export function rememberFocus() {
  const trigger = typeof document !== "undefined" ? document.activeElement : null;
  return () => { if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus(); };
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
