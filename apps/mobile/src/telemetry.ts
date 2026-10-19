import * as Sentry from "@sentry/react-native";
import { PostHog } from "posthog-react-native";
import { placeCategoryIds } from "@knogo/core";

type EventName = "app_opened" | "search_completed" | "place_opened" | "place_saved" | "report_submitted" | "report_failed";
type EventProperties = Record<string, string | number | boolean | null>;

let enabled = false;
let posthog: PostHog | null = null;

export function enableTelemetry() {
  if (enabled) return;
  enabled = true;
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (dsn) Sentry.init({
    dsn, sendDefaultPii: false, tracesSampleRate: 0, enableNative: true,
    enableAutoSessionTracking: false,
    beforeBreadcrumb: () => null,
    beforeSend: event => {
      delete event.user;
      delete event.request;
      delete event.breadcrumbs;
      delete event.extra;
      delete event.contexts;
      delete event.transaction;
      delete event.logentry;
      event.message = "KNOGO operation failed";
      const context = event.tags?.context;
      event.tags = typeof context === "string" && ["auth", "data", "report", "navigation"].includes(context) ? { context } : {};
      for (const exception of event.exception?.values ?? []) {
        exception.value = "KNOGO exception";
        exception.type = "Error";
        for (const frame of exception.stacktrace?.frames ?? []) {
          delete frame.vars;
          delete frame.pre_context;
          delete frame.context_line;
          delete frame.post_context;
          if (frame.filename?.includes("?")) frame.filename = frame.filename.split("?")[0];
          if (frame.abs_path?.includes("?")) frame.abs_path = frame.abs_path.split("?")[0];
        }
      }
      return event;
    },
  });
  const key = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
  if (key) posthog = new PostHog(key, { host: process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com", enableSessionReplay: false, captureAppLifecycleEvents: false, setDefaultPersonProperties: false, disabled: false });
}

export function disableTelemetry() {
  enabled = false;
  posthog?.optOut();
  posthog = null;
  void Sentry.close();
}

export function captureEvent(name: EventName, properties: EventProperties = {}) {
  if (!enabled) return;
  const safe: EventProperties = {};
  const booleanKeys: Partial<Record<EventName, string[]>> = {
    search_completed: ["has_query", "suggestion"],
    place_opened: ["grouped"],
    place_saved: ["saved"],
  };
  for (const key of booleanKeys[name] ?? []) {
    if (typeof properties[key] === "boolean") safe[key] = properties[key];
  }
  if (name === "place_opened" && placeCategoryIds.some(category => category === properties.category)) {
    safe.category = properties.category;
  }
  if (name === "report_failed" && ["auth", "report"].includes(String(properties.stage))) safe.stage = properties.stage;
  if (name === "report_submitted") {
    if (["in_person", "phone", "online"].includes(String(properties.source))) safe.source = properties.source;
    if (Number.isInteger(properties.answer_count) && Number(properties.answer_count) >= 1 && Number(properties.answer_count) <= 5) safe.answer_count = properties.answer_count;
  }
  posthog?.capture(name, safe);
}

export function captureError(_error: unknown, context: "auth" | "data" | "report" | "navigation") {
  if (!enabled) return;
  if (!["auth", "data", "report", "navigation"].includes(context)) return;
  // Provider messages and exception stacks can contain credentials or report data.
  Sentry.captureMessage("KNOGO operation failed", { level: "error", tags: { context } });
}
