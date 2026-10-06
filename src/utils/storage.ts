import type { Confirmation } from "@knogo/core/types/place";
import { defaultSettings, legacyStorageKeys, storageKeys, type LocalSettings } from "@knogo/core/storage";

export type { LocalSettings } from "@knogo/core/storage";

function readJson<T>(key: string, legacyKey: string, fallback: T): T {
  try {
    const current = window.localStorage.getItem(key);
    const legacy = current ? null : window.localStorage.getItem(legacyKey);
    const raw = current ?? legacy;
    if (legacy) {
      window.localStorage.setItem(key, legacy);
      window.localStorage.removeItem(legacyKey);
    }
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function readSavedPlaceIds() {
  return readJson<string[]>(storageKeys.savedPlaceIds, legacyStorageKeys.savedPlaceIds, []);
}

export function writeSavedPlaceIds(ids: string[]) {
  writeJson(storageKeys.savedPlaceIds, ids);
}

export function readConfirmations() {
  return readJson<Confirmation[]>(storageKeys.confirmations, legacyStorageKeys.confirmations, []);
}

export function writeConfirmations(confirmations: Confirmation[]) {
  writeJson(storageKeys.confirmations, confirmations);
}

export function readSettings() {
  const stored = readJson<Partial<LocalSettings>>(storageKeys.settings, legacyStorageKeys.settings, defaultSettings);
  const theme = stored.theme === "system" || stored.theme === "dark" || stored.theme === "light" ? stored.theme : defaultSettings.theme;
  return { ...defaultSettings, ...stored, theme };
}

export function writeSettings(settings: LocalSettings) {
  writeJson(storageKeys.settings, settings);
}
