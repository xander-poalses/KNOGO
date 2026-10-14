import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Place } from "@knogo/core";
import { BranchMap } from "./BranchMap.native";

const mocks = vi.hoisted(() => ({ environment: "storeClient", platform: "android", mapsKey: "", reduced: vi.fn(), start: vi.fn(), stop: vi.fn(), loop: vi.fn(), remove: vi.fn(), listener: null as null | ((enabled: boolean) => void) }));
vi.mock("expo-constants", () => ({ default: { get executionEnvironment() { return mocks.environment; }, get expoConfig() { return { android: { config: { googleMaps: { apiKey: mocks.mapsKey } } } }; } }, ExecutionEnvironment: { StoreClient: "storeClient" } }));
vi.mock("react-native-maps", () => ({ default: () => <div data-testid="native-map" />, Marker: () => null }));
vi.mock("../theme", () => ({ fonts: {}, useTheme: () => ({ colours: {} }), useThemeStyles: (factory: any) => factory({}) }));
vi.mock("./Ui", () => ({ Skeleton: ({ height }: any) => <div data-testid="skeleton" style={{ height }} /> }));
vi.mock("react-native", async () => {
  const { createElement } = await import("react");
  const box = ({ children, accessibilityLabel, style }: any) => createElement("div", { "aria-label": accessibilityLabel, "data-height": Array.isArray(style) ? undefined : style?.height }, children);
  return {
    View: box, Text: box, StyleSheet: { create: (styles: unknown) => styles }, Platform: { get OS() { return mocks.platform; } },
    AccessibilityInfo: { isReduceMotionEnabled: mocks.reduced, addEventListener: (_event: string, listener: (enabled: boolean) => void) => { mocks.listener = listener; return { remove: mocks.remove }; } },
    Animated: { View: box, Value: class { setValue() {} }, timing: vi.fn(), sequence: vi.fn(), loop: mocks.loop }
  };
});

const branches = [{ id: "branch", latitude: -25.8, longitude: 28.3 }] as Place[];
beforeEach(() => {
  vi.clearAllMocks(); mocks.environment = "storeClient"; mocks.platform = "android"; mocks.mapsKey = ""; mocks.listener = null;
  mocks.reduced.mockResolvedValue(false); mocks.loop.mockReturnValue({ start: mocks.start, stop: mocks.stop });
});
afterEach(cleanup);

describe("Expo Go map placeholder", () => {
  it("keeps the map space with a skeleton instead of mounting a native map", async () => {
    render(<BranchMap branches={branches} onSelect={vi.fn()} />);
    expect(screen.getByLabelText("Branch map unavailable in Expo Go")).toBeTruthy();
    expect(screen.getByTestId("skeleton").style.height).toBe("310px");
    expect(screen.queryByTestId("native-map")).toBeNull();
    await waitFor(() => expect(mocks.start).toHaveBeenCalledOnce());
  });
  it("stops motion and removes the preference listener on unmount", async () => {
    const view = render(<BranchMap branches={branches} onSelect={vi.fn()} />);
    await waitFor(() => expect(mocks.start).toHaveBeenCalledOnce());
    view.unmount();
    expect(mocks.stop).toHaveBeenCalled(); expect(mocks.remove).toHaveBeenCalledOnce();
  });
  it("keeps the skeleton still when reduced motion is enabled", async () => {
    mocks.reduced.mockResolvedValue(true);
    render(<BranchMap branches={branches} onSelect={vi.fn()} />);
    await waitFor(() => expect(mocks.reduced).toHaveBeenCalledOnce());
    expect(screen.getByTestId("skeleton")).toBeTruthy(); expect(mocks.start).not.toHaveBeenCalled();
  });
  it("stops the pulse when reduced motion changes while mounted", async () => {
    render(<BranchMap branches={branches} onSelect={vi.fn()} />);
    await waitFor(() => expect(mocks.start).toHaveBeenCalledOnce());
    mocks.stop.mockClear(); mocks.listener?.(true);
    expect(mocks.stop).toHaveBeenCalledOnce(); expect(mocks.start).toHaveBeenCalledOnce();
  });
  it("does not start motion after unmount while the preference check is pending", async () => {
    let resolve!: (enabled: boolean) => void;
    const pending = new Promise<boolean>(done => { resolve = done; });
    mocks.reduced.mockReturnValue(pending);
    const view = render(<BranchMap branches={branches} onSelect={vi.fn()} />);
    view.unmount(); resolve(false); await pending; await Promise.resolve();
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it("does not overwrite a motion preference change with a pending check", async () => {
    let resolve!: (enabled: boolean) => void;
    const pending = new Promise<boolean>(done => { resolve = done; });
    mocks.reduced.mockReturnValue(pending);
    render(<BranchMap branches={branches} onSelect={vi.fn()} />);
    mocks.listener?.(true); resolve(false); await pending; await Promise.resolve();
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it("leaves the native map in Android builds configured with a Maps key", () => {
    mocks.environment = "bare";
    mocks.mapsKey = "test-maps-key";
    render(<BranchMap branches={branches} onSelect={vi.fn()} />);
    expect(screen.getByTestId("native-map")).toBeTruthy(); expect(screen.queryByTestId("skeleton")).toBeNull();
  });
  it.each(["", "   "])("does not mount the Android map without a key (%j)", (key) => {
    mocks.environment = "bare";
    mocks.mapsKey = key;
    render(<BranchMap branches={branches} onSelect={vi.fn()} />);
    expect(screen.queryByTestId("native-map")).toBeNull();
    expect(screen.queryByTestId("skeleton")).toBeNull();
    expect(screen.queryByText("Loading map...")).toBeNull();
  });
  it("keeps iOS maps available without an Android key", () => {
    mocks.environment = "bare";
    mocks.platform = "ios";
    render(<BranchMap branches={branches} onSelect={vi.fn()} />);
    expect(screen.getByTestId("native-map")).toBeTruthy();
  });
  it("does not show a placeholder for branches without coordinates", () => {
    render(<BranchMap branches={[]} onSelect={vi.fn()} />);
    expect(screen.queryByTestId("skeleton")).toBeNull(); expect(screen.queryByTestId("native-map")).toBeNull();
  });
});
