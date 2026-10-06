import { describe, expect, it } from "vitest";
import { createFuelStorage, emptyFuelPreferences, fuelFeatureVersion, storageKeys, type FuelPreferences } from "@knogo/core";

function device() {
  const values = new Map<string, string>();
  const storage = { getItem: async (key: string) => values.get(key) ?? null, setItem: async (key: string, value: string) => { values.set(key, value); } };
  return { values, storage, fuel: createFuelStorage(storage) };
}
const preferences: FuelPreferences = { consumptionLPer100Km: 7.4, grade: "petrol_95", region: "inland", priceOverrideZarPerLitre: 24.12 };

describe("fuel setup device storage", () => {
  it("offers setup for a new or existing install without the feature marker", async () => {
    const { fuel, values } = device();
    values.set(storageKeys.savedPlaceIds, '["cappuccinos-menlyn"]');
    expect(await fuel.readFuelPreferences()).toEqual(emptyFuelPreferences);
    expect(await fuel.readFuelOnboardingVersion()).toBeLessThan(fuelFeatureVersion);
    expect(values.get(storageKeys.savedPlaceIds)).toBe('["cappuccinos-menlyn"]');
  });
  it("persists skipping setup across a restart without inventing fuel inputs", async () => {
    const { fuel, storage } = device();
    await fuel.writeFuelOnboardingVersion(fuelFeatureVersion);
    const restarted = createFuelStorage(storage);
    expect(await restarted.readFuelOnboardingVersion()).toBe(fuelFeatureVersion);
    expect(await restarted.readFuelPreferences()).toEqual(emptyFuelPreferences);
  });
  it("persists completion, edits and clearing across restarts", async () => {
    const { fuel, storage } = device();
    await fuel.writeFuelPreferences(preferences);
    await fuel.writeFuelOnboardingVersion(fuelFeatureVersion);
    const restarted = createFuelStorage(storage);
    expect(await restarted.readFuelPreferences()).toEqual(preferences);
    await restarted.writeFuelPreferences({ ...preferences, grade: "diesel_50ppm", region: "coastal", consumptionLPer100Km: 6.2 });
    expect(await fuel.readFuelPreferences()).toMatchObject({ grade: "diesel_50ppm", region: "coastal", consumptionLPer100Km: 6.2 });
    await restarted.writeFuelPreferences({ ...emptyFuelPreferences });
    expect(await fuel.readFuelPreferences()).toEqual(emptyFuelPreferences);
    expect(await fuel.readFuelOnboardingVersion()).toBe(fuelFeatureVersion);
  });
  it("recovers malformed inputs and invalid onboarding versions", async () => {
    const { fuel, values } = device();
    values.set(storageKeys.fuelPreferences, '{broken');
    expect(await fuel.readFuelPreferences()).toEqual(emptyFuelPreferences);
    values.set(storageKeys.fuelPreferences, JSON.stringify({ ...preferences, consumptionLPer100Km: -1, region: "automatic", priceOverrideZarPerLitre: 0 }));
    expect(await fuel.readFuelPreferences()).toMatchObject({ consumptionLPer100Km: null, region: null, priceOverrideZarPerLitre: null });
    for (const version of ["Infinity", "-1", "1.5", "broken"]) {
      values.set(storageKeys.fuelOnboardingVersion, version);
      expect(await fuel.readFuelOnboardingVersion()).toBe(0);
    }
  });
  it("does not claim to save when storage fails", async () => {
    const fuel = createFuelStorage({ getItem: async () => { throw new Error("storage failed"); }, setItem: async () => { throw new Error("storage full"); } });
    await expect(fuel.readFuelPreferences()).rejects.toThrow("storage failed");
    await expect(fuel.writeFuelPreferences(preferences)).rejects.toThrow("storage full");
    await expect(fuel.writeFuelOnboardingVersion(fuelFeatureVersion)).rejects.toThrow("storage full");
    await expect(fuel.writeFuelOnboardingVersion(-1)).rejects.toThrow("version");
  });
});
