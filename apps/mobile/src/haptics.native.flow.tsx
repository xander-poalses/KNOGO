import { beforeEach, describe, expect, it, vi } from "vitest";
import { ctaHaptic } from "./haptics.native";
const native = vi.hoisted(() => ({ platform: { OS: "android" }, android: vi.fn(), selection: vi.fn() }));
vi.mock("react-native", () => ({ Platform: native.platform }));
vi.mock("expo-haptics", () => ({
  AndroidHaptics: { Virtual_Key: "virtual-key" },
  ImpactFeedbackStyle: { Medium: "medium" },
  performAndroidHapticsAsync: native.android, impactAsync: native.selection
}));
beforeEach(() => {
  vi.resetAllMocks(); native.platform.OS = "android";
  native.android.mockResolvedValue(undefined); native.selection.mockResolvedValue(undefined);
});
describe("native CTA haptics", () => {
  it("uses Android key feedback, not a vibration pattern", () => {
    ctaHaptic();
    expect(native.android).toHaveBeenCalledWith("virtual-key");
    expect(native.selection).not.toHaveBeenCalled();
  });
  it("uses a medium impact on iOS", () => {
    native.platform.OS = "ios"; ctaHaptic();
    expect(native.selection).toHaveBeenCalledOnce();
    expect(native.selection).toHaveBeenCalledWith("medium");
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
