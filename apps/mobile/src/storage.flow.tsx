import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentStatus, mockPlaces, storageKeys, type SupabaseSession } from "@knogo/core";
import { mobileStorage } from "./storage";

const device = vi.hoisted(() => ({ values: new Map<string, string>(), read: vi.fn(), remove: vi.fn() }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {
  getItem: device.read,
  setItem: async (key: string, value: string) => { device.values.set(key, value); },
  removeItem: device.remove
} }));
beforeEach(() => {
  device.values.clear();
  device.read.mockReset().mockImplementation(async (key: string) => device.values.get(key) ?? null);
  device.remove.mockReset().mockImplementation(async (key: string) => { device.values.delete(key); });
});

describe("device consent restoration", () => {
  it("returns unset only when no stored settings exist", async () => {
    expect((await mobileStorage.readSettings()).telemetryConsent).toBe("unset");
  });
  it("restores a saved decline", async () => {
    device.values.set(storageKeys.settings, JSON.stringify({ telemetryConsent: "denied" }));
    expect((await mobileStorage.readSettings()).telemetryConsent).toBe("denied");
  });
  it("does not turn a storage failure into unset consent", async () => {
    device.read.mockRejectedValueOnce(new Error("Storage unavailable"));
    await expect(mobileStorage.readSettings()).rejects.toThrow("Storage unavailable");
  });
  it("does not turn damaged settings into unset consent", async () => {
    device.values.set(storageKeys.settings, "{broken");
    await expect(mobileStorage.readSettings()).rejects.toThrow();
    expect(device.remove).not.toHaveBeenCalled();
  });
});

describe("device session restoration", () => {
  const session: SupabaseSession = { accessToken: "access-token", refreshToken: "refresh-token", userId: "user-1", email: "person@example.com", expiresAt: 1900000000 };
  it("restores only the session fields KNOGO needs", async () => {
    device.values.set(storageKeys.supabaseSession, JSON.stringify({ ...session, metadata: { ignored: true } }));
    expect(await mobileStorage.readSession()).toEqual(session);
  });
  it("keeps expired credentials for the API's refresh path", async () => {
    await mobileStorage.writeSession({ ...session, expiresAt: 1 });
    expect(await mobileStorage.readSession()).toEqual({ ...session, expiresAt: 1 });
  });
  it("marks a legacy session without expiry for refresh", async () => {
    const { expiresAt, ...legacy } = session;
    device.values.set(storageKeys.supabaseSession, JSON.stringify(legacy));
    expect(await mobileStorage.readSession()).toEqual({ ...legacy, expiresAt: 0 });
  });
  it.each([
    [], "session", {}, { ...session, accessToken: "" },
    { ...session, refreshToken: null }, { ...session, accessToken: "token\nheader" },
    { ...session, userId: {} }, { ...session, email: null },
    { ...session, email: "person@example.com\n" }, { ...session, expiresAt: "1900000000" },
    { ...session, expiresAt: -1 }, { ...session, expiresAt: 1.5 },
    { ...session, expiresAt: Number.MAX_SAFE_INTEGER + 1 }
  ])("does not restore a damaged session: %j", async value => {
    device.values.set(storageKeys.supabaseSession, JSON.stringify(value));
    expect(await mobileStorage.readSession()).toBeNull();
    expect(device.remove).not.toHaveBeenCalled();
  });
  it("keeps startup usable after a storage read failure", async () => {
    device.read.mockRejectedValueOnce(new Error("Storage unavailable"));
    expect(await mobileStorage.readSession()).toBeNull();
  });
  it("keeps startup usable after damaged session JSON", async () => {
    device.values.set(storageKeys.supabaseSession, "{broken");
    expect(await mobileStorage.readSession()).toBeNull();
  });
});

describe("device place cache recovery", () => {
  it("restores a report draft with its required answers", async () => {
    const draft = { placeId: "cappuccinos-menlyn", createdAt: new Date().toISOString(), reportSource: "in_person" as const, answers: [{ type: "open_status" as const, value: "open" }, { type: "kitchen_status" as const, value: "yes" }, { type: "busy_level" as const, value: "quiet" }] };
    await mobileStorage.writePendingReport(draft);
    expect(await mobileStorage.readPendingReport()).toEqual(draft);
  });
  it("restores a draft containing one observation", async () => {
    const draft = { placeId: "cappuccinos-menlyn", createdAt: new Date().toISOString(), reportSource: "phone" as const, answers: [{ type: "card_machine" as const, value: "no" }] };
    await mobileStorage.writePendingReport(draft);
    expect(await mobileStorage.readPendingReport()).toEqual(draft);
  });
  it.each([null, [], [null], [{ type: "open_status", value: "open" }, { type: "kitchen_status", value: "yes" }, { type: "busy_level", value: "quiet" }, { type: "busy_level", value: "busy" }]])("rejects malformed or incomplete report answers: %j", async answers => {
    device.values.set(storageKeys.pendingReport, JSON.stringify({ placeId: "cappuccinos-menlyn", createdAt: new Date().toISOString(), reportSource: "in_person", answers }));
    expect(await mobileStorage.readPendingReport()).toBeNull();
    expect(device.remove).toHaveBeenCalledWith(storageKeys.pendingReport);
  });
  it("keeps reporting available when damaged-draft cleanup fails", async () => {
    device.values.set(storageKeys.pendingReport, JSON.stringify({ answers: null }));
    device.remove.mockRejectedValueOnce(new Error("Storage unavailable"));
    expect(await mobileStorage.readPendingReport()).toBeNull();
  });
  it("round-trips a venue cache through device storage", async () => {
    const fetchedAt = new Date(Date.now() - 1000).toISOString();
    await mobileStorage.writePlaceDataCache({ schemaVersion: 1, fetchedAt, places: [mockPlaces[0]], groups: [] });
    const restored = await mobileStorage.readPlaceDataCache();
    expect(restored?.cache.places[0].id).toBe(mockPlaces[0].id);
    expect(restored?.cache.fetchedAt).toBe(fetchedAt);
  });
  it("returns no cache instead of crashing on invalid JSON", async () => {
    device.values.set(storageKeys.placeDataCache, "{broken");
    expect(await mobileStorage.readPlaceDataCache()).toBeNull();
  });
  it("rejects malformed place records even when storage cleanup fails", async () => {
    device.values.set(storageKeys.placeDataCache, JSON.stringify({ schemaVersion: 1, fetchedAt: new Date(Date.now() - 1000).toISOString(), places: [null], groups: [] }));
    device.remove.mockRejectedValueOnce(new Error("Storage unavailable"));
    expect(await mobileStorage.readPlaceDataCache()).toBeNull();
    expect(device.remove).toHaveBeenCalledWith(storageKeys.placeDataCache);
  });
  it("keeps venue facts but no status answer from malformed cached trust data", async () => {
    const place = { ...mockPlaces[0], currentStatus: { ...mockPlaces[0].currentStatus, trust: { version: 1, claims: { open_status: { state: "venue_update", value: "open", evidence: null } } } } };
    device.values.set(storageKeys.placeDataCache, JSON.stringify({ schemaVersion: 1, fetchedAt: new Date(Date.now() - 1000).toISOString(), places: [place], groups: [] }));
    const cache = await mobileStorage.readPlaceDataCache();
    expect(cache?.cache.places[0].name).toBe(place.name);
    expect(getCurrentStatus(cache!.cache.places[0].currentStatus).isOpen).toBeNull();
    expect(device.remove).not.toHaveBeenCalled();
  });
});
