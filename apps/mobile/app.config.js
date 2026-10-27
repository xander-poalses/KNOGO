module.exports = ({ config }) => {
  const profile = process.env.EAS_BUILD_PROFILE;
  if (profile === "testing" && process.env.EXPO_PUBLIC_APP_ENV !== "testing") {
    throw new Error("Testing builds must enable the testing environment.");
  }
  if (profile === "production" && process.env.EXPO_PUBLIC_APP_ENV !== "production") {
    throw new Error("Production builds must disable tester features.");
  }
  if (profile === "testing" || profile === "production") {
    const required = ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN", "EXPO_PUBLIC_SUPPORT_EMAIL"];
    const missing = required.filter(name => !process.env[name]?.trim());
    if (missing.length) throw new Error(`Play build configuration missing: ${missing.join(", ")}`);
    if (process.env.EXPO_PUBLIC_USE_MOCK_DATA === "true") throw new Error("Play builds must use the hosted database.");
    const url = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".supabase.co")) throw new Error("Play builds require a hosted Supabase HTTPS endpoint.");
    if (!process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN.startsWith("pk.")) throw new Error("Use a public Mapbox token in the app.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.EXPO_PUBLIC_SUPPORT_EMAIL)) throw new Error("Configure a support email address.");
  }
  return config;
};
