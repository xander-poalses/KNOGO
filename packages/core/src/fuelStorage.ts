import { storageKeys } from "./storage";
import { emptyFuelPreferences, parseFuelPreferences, type FuelPreferences } from "./trip";

export const fuelFeatureVersion = 1;
type DeviceStorage = { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void> };

export function createFuelStorage(storage: DeviceStorage) {
  return {
    readFuelPreferences: async (): Promise<FuelPreferences> => {
      const raw = await storage.getItem(storageKeys.fuelPreferences);
      try { return parseFuelPreferences(raw === null ? null : JSON.parse(raw)); }
      catch { return { ...emptyFuelPreferences }; }
    },
    writeFuelPreferences: (value: FuelPreferences) => storage.setItem(storageKeys.fuelPreferences, JSON.stringify(parseFuelPreferences(value))),
    readFuelOnboardingVersion: async () => {
      const raw = await storage.getItem(storageKeys.fuelOnboardingVersion);
      const version = raw === null ? 0 : Number(raw);
      return Number.isSafeInteger(version) && version >= 0 ? version : 0;
    },
    writeFuelOnboardingVersion: (version: number) => {
      if (!Number.isSafeInteger(version) || version < 1) return Promise.reject(new Error("Fuel setup version is not valid."));
      return storage.setItem(storageKeys.fuelOnboardingVersion, String(version));
    }
  };
}
