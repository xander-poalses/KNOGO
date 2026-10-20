import { beforeEach, describe, expect, it, vi } from "vitest";
import { ctaHaptic } from "./haptics.native";
const native = vi.hoisted(() => ({ platform: { OS: "android" }, android: vi.fn(), selection: vi.fn() }));
vi.mock("react-native", () => ({ Platform: native.platform }));
vi.mock("expo-haptics", () => ({
  AndroidHaptics: { Segment_Tick: "segment-tick" },
  performAndroidHapticsAsync: native.android, selectionAsync: native.selection
}));
beforeEach(() => {
  vi.resetAllMocks(); native.platform.OS = "android";
  native.android.mockResolvedValue(undefined); native.selection.mockResolvedValue(undefined);
});
describe("native CTA haptics", () => {
  it("uses the Android selection tick, not a vibration pattern", () => {
    ctaHaptic();
    expect(native.android).toHaveBeenCalledWith("segment-tick");
    expect(native.selection).not.toHaveBeenCalled();
  });
  it("uses selection feedback on iOS", () => {
    native.platform.OS = "ios"; ctaHaptic();
    expect(native.selection).toHaveBeenCalledOnce();
    expect(native.android).not.toHaveBeenCalled();
  });
  it("contains native rejection without delaying the action", async () => {
    native.android.mockRejectedValue(new Error("No haptic hardware"));
    expect(ctaHaptic()).toBeUndefined();
    await Promise.resolve();
  });
  it("contains synchronous native failure", () => {
    native.android.mockImplementation(() => { throw new Error("Unavailable"); });
    expect(ctaHaptic).not.toThrow();
  });
});
