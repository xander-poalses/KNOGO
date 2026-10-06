import { beforeEach, describe, expect, it } from "vitest";
import { legacyStorageKeys, storageKeys } from "@knogo/core/storage";
import { readConfirmations, readSavedPlaceIds, writeConfirmations, writeSavedPlaceIds } from "./storage";

describe("local storage helpers", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("persists saved place ids", () => {
    writeSavedPlaceIds(["one", "two"]);
    expect(readSavedPlaceIds()).toEqual(["one", "two"]);
  });

  it("persists confirmations", () => {
    writeConfirmations([
      {
        id: "c1",
        placeId: "one",
        type: "kitchen_status",
        value: "yes",
        createdAt: "2026-07-03T10:00:00.000Z",
        locationVerified: false,
        source: "user"
      }
    ]);
    expect(readConfirmations()).toHaveLength(1);
  });

  it("migrates saved ids from the former app key", () => {
    window.localStorage.setItem(legacyStorageKeys.savedPlaceIds, JSON.stringify(["legacy-place"]));

    expect(readSavedPlaceIds()).toEqual(["legacy-place"]);
    expect(window.localStorage.getItem(storageKeys.savedPlaceIds)).toBe(JSON.stringify(["legacy-place"]));
    expect(window.localStorage.getItem(legacyStorageKeys.savedPlaceIds)).toBeNull();
  });
});
