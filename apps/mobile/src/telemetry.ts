// Imports
import * as Sentry from "@sentry/react-native";
import { PostHog } from "posthog-react-native";
import { placeCategoryIds } from "@knogo/core";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { Platform } from "react-native";

// Types
type EventName = "app_opened" | "search_completed" | "place_opened" | "place_saved" | "report_submitted" | "report_failed"
  | "report_started" | "report_step_viewed" | "report_abandoned" | "report_completed"
  | "trip_opened" | "trip_abandoned" | "trip_estimate_started" | "trip_estimate_completed" | "trip_estimate_failed" | "trip_directions_opened"
  | "filters_opened" | "filter_changed" | "filters_applied" | "filters_cleared";
type EventProperties = Record<string, string | number | boolean | null>;

// State and Helpers
let enabled = false;
let posthog: PostHog | null = null;

// Functions
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
    trip_estimate_completed: ["has_fuel_cost"],
    filters_opened: ["nearby"],
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
    if (Number.isInteger(properties.answer_count) && Number(properties.answer_count) >= 1 && Number(properties.answer_count) <= 6) safe.answer_count = properties.answer_count;
  }
  if (["report_step_viewed", "report_abandoned"].includes(name) && ["method", "open_status", "kitchen_status", "busy_level", "walk_ins", "card_machine", "backup_power", "review"].includes(String(properties.step))) safe.step = properties.step;
  if (name.startsWith("trip_") && ["device", "address"].includes(String(properties.origin_mode))) safe.origin_mode = properties.origin_mode;
  if (name === "trip_estimate_failed" && ["permission", "location", "route"].includes(String(properties.stage))) safe.stage = properties.stage;
  if (name === "filters_opened" && ["all", "areas", "cuisines"].includes(String(properties.mode))) safe.mode = properties.mode;
  if (name === "filter_changed" && ["areas", "cuisines", "placeTypes", "tags", "openAfter", "busyLevel", "maxDistanceKm"].includes(String(properties.field))) safe.field = properties.field;
  if (["filter_changed", "filters_applied"].includes(name) && Number.isInteger(properties.selected_count) && Number(properties.selected_count) >= 0 && Number(properties.selected_count) <= 1000) safe.selected_count = properties.selected_count;
  if (["report_abandoned", "report_completed", "trip_abandoned", "trip_estimate_completed", "trip_estimate_failed"].includes(name) && typeof properties.duration_seconds === "number" && Number.isFinite(properties.duration_seconds) && properties.duration_seconds >= 0) safe.duration_seconds = Math.min(86400, Math.round(properties.duration_seconds));
  const environment = process.env.EXPO_PUBLIC_APP_ENV;
  try {
    posthog?.capture(name, { ...safe, app_version: Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? "unknown", build_number: Application.nativeBuildVersion ?? "web", platform: Platform.OS, environment: environment === "testing" || environment === "production" ? environment : "development" });
  } catch { /* Analytics must not interrupt a check or trip. */ }
}

export function captureError(_error: unknown, context: "auth" | "data" | "report" | "navigation") {
  if (!enabled) return;
  if (!["auth", "data", "report", "navigation"].includes(context)) return;
  Sentry.captureMessage("KNOGO operation failed", { level: "error", tags: { context } });
}
