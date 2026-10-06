import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getTripPosition } from "./tripLocation";

const mocks = vi.hoisted(() => ({ position: vi.fn() }));
vi.mock("expo-location", () => ({ Accuracy: { Balanced: 3 }, getCurrentPositionAsync: mocks.position }));
const position = { coords: { latitude: -25.78, longitude: 28.27 } };
beforeEach(() => { vi.resetAllMocks(); vi.useFakeTimers(); mocks.position.mockResolvedValue(position); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

it("returns the position and clears its timeout and listener", async () => {
  const controller = new AbortController();
  const remove = vi.spyOn(controller.signal, "removeEventListener");
  await expect(getTripPosition(controller.signal)).resolves.toEqual(position);
  expect(mocks.position).toHaveBeenCalledWith({ accuracy: 3 });
  expect(vi.getTimerCount()).toBe(0);
  expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
});
it("does not start a lookup when the request is already cancelled", async () => {
  const controller = new AbortController(); controller.abort();
  await expect(getTripPosition(controller.signal)).rejects.toMatchObject({ name: "AbortError" });
  expect(mocks.position).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});
it("cancels the wait and clears the timeout without waiting for Expo", async () => {
  let resolve!: (value: unknown) => void;
  mocks.position.mockReturnValue(new Promise(yes => { resolve = yes; }));
  const controller = new AbortController();
  const pending = getTripPosition(controller.signal);
  const assertion = expect(pending).rejects.toMatchObject({ name: "AbortError" });
  await Promise.resolve(); controller.abort();
  await assertion;
  expect(vi.getTimerCount()).toBe(0);
  resolve(position); await Promise.resolve();
});
it("handles an Expo rejection arriving after cancellation", async () => {
  let reject!: (error: Error) => void;
  mocks.position.mockReturnValue(new Promise((_, no) => { reject = no; }));
  const controller = new AbortController();
  const pending = getTripPosition(controller.signal);
  const assertion = expect(pending).rejects.toMatchObject({ name: "AbortError" });
  await Promise.resolve(); controller.abort(); await assertion;
  reject(new Error("Location unavailable")); await Promise.resolve();
  expect(vi.getTimerCount()).toBe(0);
});
it("times out with the address alternative and clears its listener", async () => {
  mocks.position.mockReturnValue(new Promise(() => {}));
  const controller = new AbortController();
  const remove = vi.spyOn(controller.signal, "removeEventListener");
  const pending = getTripPosition(controller.signal);
  const assertion = expect(pending).rejects.toThrow("Choose a starting place instead");
  await vi.advanceTimersByTimeAsync(15000); await assertion;
  expect(vi.getTimerCount()).toBe(0);
  expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
});
it("cleans up when Expo fails", async () => {
  mocks.position.mockRejectedValue(new Error("Location unavailable"));
  await expect(getTripPosition(new AbortController().signal)).rejects.toThrow("Location unavailable");
  expect(vi.getTimerCount()).toBe(0);
});
