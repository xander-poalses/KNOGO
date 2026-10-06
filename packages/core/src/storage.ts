export type LocalSettings = {
  locationEnabled: boolean;
  notificationsEnabled: boolean;
  privacyMode: boolean;
  theme: "system" | "dark" | "light";
  telemetryConsent: "unset" | "granted" | "denied";
};

export const defaultSettings: LocalSettings = {
  locationEnabled: false,
  notificationsEnabled: false,
  privacyMode: true,
  theme: "light",
  telemetryConsent: "unset"
};

export const storageKeys = {
  savedPlaceIds: "knogo.savedPlaceIds",
  confirmations: "knogo.confirmations",
  settings: "knogo.settings",
  supabaseSession: "knogo.supabaseSession",
  placeDataCache: "knogo.placeDataCache",
  recentSearches: "knogo.recentSearches",
  fallbackArea: "knogo.fallbackArea",
  pendingReport: "knogo.pendingReport",
  fuelPreferences: "knogo.fuelPreferences",
  fuelOnboardingVersion: "knogo.fuelOnboardingVersion",
  fuelPriceCache: "knogo.fuelPriceCache.v1"
} as const;

export const legacyStorageKeys = {
  savedPlaceIds: "opona.savedPlaceIds",
  confirmations: "opona.confirmations",
  settings: "opona.settings"
} as const;
