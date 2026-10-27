import { afterEach, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

it.each([
  ["testing", "android", true],
  ["testing", "web", false],
  ["production", "android", false],
  ["production", "web", false],
  ["testing", "ios", false]
])("gates feedback for %s on %s", async (environment, platform, expected) => {
  vi.resetModules();
  vi.stubEnv("EXPO_PUBLIC_APP_ENV", environment);
  vi.doMock("react-native", () => ({ Platform: { OS: platform } }));
  expect((await import("./testing")).testerFeedbackEnabled).toBe(expected);
});
