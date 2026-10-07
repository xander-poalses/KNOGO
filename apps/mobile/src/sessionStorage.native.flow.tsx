import { beforeEach, describe, expect, it, vi } from "vitest";
import { storageKeys } from "@knogo/core";
import { sessionStorage } from "./sessionStorage.native";

const mocks = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn(), legacy: vi.fn(), clear: vi.fn() }));
vi.mock("expo-secure-store", () => ({ WHEN_UNLOCKED_THIS_DEVICE_ONLY: 6, getItemAsync: mocks.get, setItemAsync: mocks.set, deleteItemAsync: mocks.remove }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem: mocks.legacy, removeItem: mocks.clear } }));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.get.mockResolvedValue(null); mocks.legacy.mockResolvedValue(null);
  mocks.set.mockResolvedValue(undefined); mocks.remove.mockResolvedValue(undefined); mocks.clear.mockResolvedValue(undefined);
});
describe("native session credentials", () => {
  it("migrates only after secure storage succeeds", async () => {
    mocks.legacy.mockResolvedValue("session");
    expect(await sessionStorage.read()).toBe("session");
    expect(mocks.set).toHaveBeenCalledWith("knogo.session.v1", "session", expect.any(Object));
    expect(mocks.clear).toHaveBeenCalledWith(storageKeys.supabaseSession);
    expect(mocks.set.mock.invocationCallOrder[0]).toBeLessThan(mocks.clear.mock.invocationCallOrder[0]);
  });
  it("retains the migration source if the encrypted write fails", async () => {
    mocks.legacy.mockResolvedValue("session"); mocks.set.mockRejectedValue(new Error("Locked"));
    await expect(sessionStorage.read()).rejects.toThrow("Locked");
    expect(mocks.clear).not.toHaveBeenCalled();
  });
  it("does not fall back to plaintext after a secure read failure", async () => {
    mocks.get.mockRejectedValue(new Error("Locked"));
    await expect(sessionStorage.read()).rejects.toThrow("Locked");
    expect(mocks.legacy).not.toHaveBeenCalled();
  });
  it("removes plaintext left over when encrypted credentials exist", async () => {
    mocks.get.mockResolvedValue("session");
    expect(await sessionStorage.read()).toBe("session");
    expect(mocks.legacy).not.toHaveBeenCalled(); expect(mocks.clear).toHaveBeenCalledOnce();
  });
  it("stores new sessions without writing plaintext", async () => {
    await sessionStorage.write("session");
    expect(mocks.set).toHaveBeenCalledOnce(); expect(mocks.clear).toHaveBeenCalledOnce();
  });
  it("finishes migration before clearing both stores on sign-out", async () => {
    mocks.legacy.mockResolvedValue("session");
    await Promise.all([sessionStorage.read(), sessionStorage.clear()]);
    expect(mocks.remove).toHaveBeenCalledOnce();
    expect(mocks.set.mock.invocationCallOrder[0]).toBeLessThan(mocks.remove.mock.invocationCallOrder[0]);
  });
});
