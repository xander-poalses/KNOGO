import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";

const configure = createRequire(import.meta.url)("../../apps/mobile/app.config.js");
afterEach(() => vi.unstubAllEnvs());

function settings(profile: string) {
  vi.stubEnv("EAS_BUILD_PROFILE", profile);
  vi.stubEnv("EXPO_PUBLIC_APP_ENV", profile);
  vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable");
  vi.stubEnv("EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN", "pk.test");
  vi.stubEnv("EXPO_PUBLIC_SUPPORT_EMAIL", "support@example.test");
  vi.stubEnv("EXPO_PUBLIC_USE_MOCK_DATA", "false");
}

describe("Play build configuration", () => {
  it("allows configured tester and production builds", () => {
    for (const profile of ["testing", "production"]) {
      settings(profile);
      expect(configure({ config: { name: "KNOGO" } })).toEqual({ name: "KNOGO" });
    }
  });
  it("rejects tester features in production and missing support configuration", () => {
    settings("production");
    vi.stubEnv("EXPO_PUBLIC_APP_ENV", "testing");
    expect(() => configure({ config: {} })).toThrow("disable tester");
    vi.stubEnv("EXPO_PUBLIC_APP_ENV", "production");
    vi.stubEnv("EXPO_PUBLIC_SUPPORT_EMAIL", "");
    expect(() => configure({ config: {} })).toThrow("SUPPORT_EMAIL");
  });
});
