import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ init: vi.fn(), capture: vi.fn(), message: vi.fn(), exception: vi.fn() }));
vi.mock("@sentry/react-native", () => ({ init: mocks.init, close: vi.fn(), captureMessage: mocks.message, captureException: mocks.exception }));
vi.mock("posthog-react-native", () => ({ PostHog: class { capture = mocks.capture; optOut() {} } }));
vi.mock("expo-application", () => ({ nativeApplicationVersion: "0.1.0", nativeBuildVersion: "7" }));
vi.mock("expo-constants", () => ({ default: { expoConfig: { version: "0.1.0" } } }));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
import { captureError, captureEvent, disableTelemetry, enableTelemetry } from "./telemetry";
const build = { app_version: "0.1.0", build_number: "7", platform: "android", environment: "development" };
afterEach(() => { disableTelemetry(); vi.unstubAllEnvs(); });

beforeEach(() => {
  disableTelemetry();
  vi.clearAllMocks();
  vi.stubEnv("EXPO_PUBLIC_POSTHOG_API_KEY", "test-key");
  vi.stubEnv("EXPO_PUBLIC_SENTRY_DSN", "https://test.example");
});
describe("diagnostics payload boundary", () => {
  it("labels journeys and allows only step names, counts and outcomes", () => {
    vi.stubEnv("EXPO_PUBLIC_APP_ENV", "testing");
    enableTelemetry();
    captureEvent("report_step_viewed", { step: "kitchen_status", answer: "yes", place_id: "private" });
    expect(mocks.capture).toHaveBeenLastCalledWith("report_step_viewed", {
      step: "kitchen_status", app_version: "0.1.0", build_number: "7", platform: "android", environment: "testing"
    });
    captureEvent("trip_estimate_completed", { origin_mode: "address", has_fuel_cost: false, duration_seconds: 3, latitude: -25 });
    expect(mocks.capture).toHaveBeenLastCalledWith("trip_estimate_completed", expect.objectContaining({ origin_mode: "address", has_fuel_cost: false, duration_seconds: 3 }));
    expect(JSON.stringify(mocks.capture.mock.calls)).not.toMatch(/private|latitude|"answer"/);
  });
  it("rejects arbitrary journey fields and keeps telemetry failures out of the UI", () => {
    enableTelemetry();
    captureEvent("report_abandoned", { step: "person@example.com", duration_seconds: Infinity });
    expect(mocks.capture).toHaveBeenLastCalledWith("report_abandoned", build);
    captureEvent("filter_changed", { field: "private search", selected_count: -1 });
    expect(mocks.capture).toHaveBeenLastCalledWith("filter_changed", build);
    mocks.capture.mockImplementationOnce(() => { throw new Error("Analytics unavailable"); });
    expect(() => captureEvent("trip_opened")).not.toThrow();
    disableTelemetry();
    mocks.capture.mockClear();
    captureEvent("report_step_viewed", { step: "review" });
    expect(mocks.capture).not.toHaveBeenCalled();
  });
  it("strips request, account and exception content at the SDK boundary", () => {
    enableTelemetry();
    const options = mocks.init.mock.calls[0][0];
    const event = options.beforeSend({
      message: "private", user: { email: "person@example.com" },
      request: { url: "https://private.example" }, breadcrumbs: [{ message: "private" }],
      extra: { token: "secret" }, contexts: { location: {} }, tags: { context: "auth", email: "private" },
      exception: { values: [{ type: "PrivateError", value: "secret", stacktrace: { frames: [{ filename: "app.js?token=secret", vars: { token: "secret" }, context_line: "private" }] } }] },
    });
    expect(JSON.stringify(event)).not.toMatch(/secret|private|person@example/);
    expect(event.tags).toEqual({ context: "auth" });
    expect(event.exception.values[0].stacktrace.frames[0].filename).toBe("app.js");
    expect(options.beforeBreadcrumb({ message: "private" })).toBeNull();
    expect(options.tracesSampleRate).toBe(0);
  });
  it("keeps supported categories without accepting an arbitrary category", () => {
    enableTelemetry();
    captureEvent("place_opened", { category: "quick_bites", grouped: false });
    expect(mocks.capture).toHaveBeenCalledWith("place_opened", { ...build, category: "quick_bites", grouped: false });
  });
  it("rejects context text outside the error context list", () => {
    enableTelemetry();
    captureError(null, "person@example.com" as "auth");
    expect(mocks.message).not.toHaveBeenCalled();
  });
  it("sends nothing without consent", () => {
    captureEvent("search_completed", { has_query: true });
    captureError(new Error("private"), "auth");
    expect(mocks.capture).not.toHaveBeenCalled();
    expect(mocks.message).not.toHaveBeenCalled();
  });
  it("drops search text, email, coordinates and URLs", () => {
    enableTelemetry();
    captureEvent("search_completed", { has_query: true, query: "Parkview", email: "person@example.com", latitude: -25, source_url: "https://private.example" });
    expect(mocks.capture).toHaveBeenCalledWith("search_completed", { ...build, has_query: true });
  });
  it("rejects arbitrary values in allowed property names", () => {
    enableTelemetry();
    captureEvent("place_opened", { category: "person@example.com", grouped: "private" });
    captureEvent("report_submitted", { source: "private", answer_count: 999, outcome: "report text" });
    expect(mocks.capture).toHaveBeenNthCalledWith(1, "place_opened", build);
    expect(mocks.capture).toHaveBeenNthCalledWith(2, "report_submitted", build);
  });
  it("retains structured report counts and source only", () => {
    enableTelemetry();
    captureEvent("report_submitted", { source: "phone", answer_count: 3 });
    expect(mocks.capture).toHaveBeenCalledWith("report_submitted", { ...build, source: "phone", answer_count: 3 });
  });
  it("does not forward provider exceptions", () => {
    enableTelemetry();
    captureError(new Error("access_token=secret person@example.com"), "auth");
    expect(mocks.exception).not.toHaveBeenCalled();
    expect(mocks.message).toHaveBeenCalledWith("KNOGO operation failed", { level: "error", tags: { context: "auth" } });
  });
});
