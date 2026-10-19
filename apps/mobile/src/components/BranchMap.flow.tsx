import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useImperativeHandle } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Place } from "@knogo/core";
import { BranchMap } from "./BranchMap.native";
import Mapbox from "@rnmapbox/maps";
import { loadMapbox } from "./loadMapbox.native";
vi.mock("./loadMapbox.native", () => ({ loadMapbox: vi.fn() }));
const poiLabel = vi.hoisted(() => vi.fn((_props: unknown) => null));
const nativeMapbox = vi.hoisted(() => ({ available: true }));

const mocks = vi.hoisted(() => ({ fit: vi.fn(), setCamera: vi.fn(), background: vi.fn((_props: unknown) => null), water: vi.fn(() => null), dark: false, permission: vi.fn(), position: vi.fn(), mapProps: null as any, environment: "storeClient", platform: "android", mapsKey: "", reduced: vi.fn(), start: vi.fn(), stop: vi.fn(), loop: vi.fn(), remove: vi.fn(), listener: null as null | ((enabled: boolean) => void) }));
vi.mock("expo-constants", () => ({ default: { get executionEnvironment() { return mocks.environment; }, get expoConfig() { return { android: { config: { googleMaps: { apiKey: mocks.mapsKey } } } }; } }, ExecutionEnvironment: { StoreClient: "storeClient" } }));
vi.mock("@rnmapbox/maps", () => ({ default: { setAccessToken: vi.fn(), setTelemetryEnabled: vi.fn(), StyleURL: { Light: "light", Dark: "dark" }, MapView: (props: any) => { mocks.mapProps = props; return <div data-testid="native-map">{props.children}</div>; }, Camera: ({ ref }: any) => { useImperativeHandle(ref, () => ({ fitBounds: mocks.fit, setCamera: mocks.setCamera })); return null; }, MarkerView: ({ children }: any) => <div>{children}</div>, BackgroundLayer: mocks.background, FillLayer: mocks.water, SymbolLayer: poiLabel } }));
vi.mock("../theme", () => ({ fonts: {}, shadows: { card: { elevation: 1 } }, useTheme: () => ({ colours: {}, isDark: mocks.dark }), useThemeStyles: (factory: any) => factory({}) }));
vi.mock("expo-location", () => ({ requestForegroundPermissionsAsync: mocks.permission }));
vi.mock("../tripLocation", () => ({ getTripPosition: mocks.position }));
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
vi.mock("lucide-react-native", () => ({ LocateFixed: () => null, MapPin: () => null, Maximize2: () => null, UserRound: () => null, X: () => null }));
vi.mock("./HapticPressable", () => ({ HapticPressable: ({ children, accessibilityLabel, disabled, onPress }: any) => <button aria-label={accessibilityLabel} disabled={disabled} onClick={onPress}>{children}</button> }));
vi.mock("./Ui", () => ({ Skeleton: ({ height }: any) => <div data-testid="skeleton" style={{ height }} /> }));
vi.mock("react-native", async () => {
  const { createElement } = await import("react");
  const box = ({ children, accessibilityLabel, style }: any) => createElement("div", { "aria-label": accessibilityLabel, "data-height": Array.isArray(style) ? undefined : style?.height }, children);
  return {
    NativeModules: { get RNMBXModule() { return nativeMapbox.available ? {} : undefined; } },
    View: box, Text: box, Modal: box, StyleSheet: { create: (styles: unknown) => styles }, Platform: { get OS() { return mocks.platform; } },
    AccessibilityInfo: { isReduceMotionEnabled: mocks.reduced, addEventListener: (_event: string, listener: (enabled: boolean) => void) => { mocks.listener = listener; return { remove: mocks.remove }; } },
    Animated: { View: box, Value: class { setValue() {} }, timing: vi.fn(), sequence: vi.fn(), loop: mocks.loop }
  };
});

const branches = [{ id: "branch", name: "Test branch", area: "Menlyn", latitude: -25.8, longitude: 28.3 }] as Place[];
beforeEach(() => {
  nativeMapbox.available = true;
  vi.clearAllMocks(); mocks.environment = "storeClient"; mocks.platform = "android"; mocks.mapsKey = ""; mocks.listener = null;
  vi.mocked(loadMapbox).mockReturnValue(Mapbox);
  vi.stubEnv("EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN", "pk.test-token");
  mocks.dark = false; mocks.mapProps = null;
  mocks.permission.mockResolvedValue({ granted: true });
  mocks.position.mockResolvedValue({ coords: { longitude: 28.2, latitude: -25.7 } });
  mocks.reduced.mockResolvedValue(false); mocks.loop.mockReturnValue({ start: mocks.start, stop: mocks.stop });
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

describe("Expo Go map placeholder", () => {
  it("keeps the branch list accessible when the installed build lacks Mapbox", () => {
    mocks.environment = "bare";
    nativeMapbox.available = false;
    render(<BranchMap branches={branches} onSelect={vi.fn()} />);
    expect(screen.getByText("Install the KNOGO development build with Mapbox to view the map.")).toBeTruthy();
    expect(screen.queryByTestId("native-map")).toBeNull();
    expect(screen.queryByText("Loading map...")).toBeNull();
    expect(loadMapbox).not.toHaveBeenCalled();
  });
  it("keeps SDK load errors within the branch map", () => {
    mocks.environment = "bare";
    vi.mocked(loadMapbox).mockImplementation(() => { throw new Error("SDK unavailable"); });
    expect(() => render(<BranchMap branches={branches} onSelect={vi.fn()} />)).not.toThrow();
    expect(loadMapbox).toHaveBeenCalledOnce();
    expect(screen.queryByTestId("native-map")).toBeNull();
  });
  it("keeps the basemap layers and fits labelled pins after loading", async () => {
    mocks.environment = "bare";
    const places = [...branches, { ...branches[0], id: "second", longitude: 28.4, latitude: -25.9 }];
    render(<BranchMap branches={places} onSelect={vi.fn()} />);
    await screen.findByTestId("native-map");
    expect(mocks.background.mock.calls[0]?.[0]).toMatchObject({ id: "land", existing: true, layerIndex: 0 });
    expect(poiLabel.mock.calls[0]?.[0]).toMatchObject({ id: "poi-label", existing: true, style: { textColor: "#050505", textFont: ["Open Sans Semibold", "Arial Unicode MS Regular"], textHaloWidth: 0.5, textHaloColor: "rgba(255,255,255,0.55)" } });
    expect(mocks.water).not.toHaveBeenCalled();
    expect(mocks.mapProps.scaleBarEnabled).toBe(false);
    expect(mocks.fit).not.toHaveBeenCalled();
    act(() => mocks.mapProps.onDidFinishLoadingMap());
    expect(mocks.fit).toHaveBeenCalledWith([28.4, -25.8], [28.3, -25.9], [84, 84, 76, 84], 0);
  });
  it("centres branches sharing a coordinate without fitting zero bounds", async () => {
    mocks.environment = "bare";
    render(<BranchMap branches={[...branches, { ...branches[0], id: "second" }]} onSelect={vi.fn()} />);
    await screen.findByTestId("native-map");
    act(() => mocks.mapProps.onDidFinishLoadingMap());
    expect(mocks.fit).not.toHaveBeenCalled();
    expect(mocks.setCamera).toHaveBeenCalledWith({ centerCoordinate: [28.3, -25.8], zoomLevel: 13, animationDuration: 0 });
  });
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
  it("shows Mapbox in Android builds with a map token", async () => {
    mocks.environment = "bare";
    mocks.mapsKey = "test-maps-key";
    render(<BranchMap branches={branches} onSelect={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId("native-map")).toBeTruthy()); expect(screen.queryByTestId("skeleton")).toBeNull();
  });
  it.each(["", "   "])("does not mount the Android map without a key (%j)", (key) => {
    mocks.environment = "bare";
    vi.stubEnv("EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN", key);
    render(<BranchMap branches={branches} onSelect={vi.fn()} />);
    expect(screen.queryByTestId("native-map")).toBeNull();
    expect(screen.queryByTestId("skeleton")).toBeNull();
    expect(screen.queryByText("Loading map...")).toBeNull();
  });
  it("keeps iOS maps available without an Android key", async () => {
    mocks.environment = "bare";
    mocks.platform = "ios";
    render(<BranchMap branches={branches} onSelect={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId("native-map")).toBeTruthy());
  });
  it("does not show a placeholder for branches without coordinates", () => {
    render(<BranchMap branches={[]} onSelect={vi.fn()} />);
    expect(screen.queryByTestId("skeleton")).toBeNull(); expect(screen.queryByTestId("native-map")).toBeNull();
  });
  it("selects the branch when its marker is pressed", async () => {
    mocks.environment = "bare";
    const onSelect = vi.fn();
    render(<BranchMap branches={branches} onSelect={onSelect} />);
    await screen.findByTestId("native-map");
    fireEvent.click(screen.getByRole("button", { name: "Expand map" }));
    fireEvent.click(await screen.findByRole("button", { name: "Test branch, Menlyn" }));
    expect(onSelect).toHaveBeenCalledWith(branches[0]);
    expect(screen.queryByRole("button", { name: "Close map" })).toBeNull();
  });
  it("uses the theme and keeps map panning in the expanded view", async () => {
    mocks.environment = "bare";
    const view = render(<BranchMap branches={branches} onSelect={vi.fn()} />);
    await screen.findByTestId("native-map");
    expect(mocks.mapProps.styleURL).toBe("light");
    expect(mocks.mapProps.scrollEnabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Expand map" }));
    expect(mocks.mapProps.scrollEnabled).toBe(true);
    mocks.dark = true;
    mocks.background.mockClear();
    poiLabel.mockClear();
    view.rerender(<BranchMap branches={branches} onSelect={vi.fn()} />);
    expect(mocks.mapProps.styleURL).toBe("dark");
    expect(mocks.background).not.toHaveBeenCalled();
    expect(poiLabel).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Close map" }));
    expect(mocks.mapProps.scrollEnabled).toBe(false);
  });
  it("shows the user only after a location request with permission", async () => {
    mocks.environment = "bare";
    render(<BranchMap branches={branches} onSelect={vi.fn()} />);
    await screen.findByTestId("native-map");
    expect(mocks.permission).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Expand map" }));
    fireEvent.click(screen.getByRole("button", { name: "Show my location" }));
    expect(await screen.findByLabelText("Your location")).toBeTruthy();
  });
  it("shows the user from the inline map without losing the branches", async () => {
    mocks.environment = "bare";
    render(<BranchMap branches={branches} onSelect={vi.fn()} />);
    await screen.findByTestId("native-map");
    fireEvent.click(screen.getByRole("button", { name: "Show my location" }));
    await screen.findByLabelText("Your location");
    expect(screen.getByText("You")).toBeTruthy();
    expect(mocks.fit).toHaveBeenCalledWith([28.3, -25.7], [28.2, -25.8], [84, 84, 76, 84], 0);
    expect(mocks.mapProps.scrollEnabled).toBe(false);
  });
  it("keeps branches available when permission is denied", async () => {
    mocks.environment = "bare"; mocks.permission.mockResolvedValue({ granted: false });
    render(<BranchMap branches={branches} onSelect={vi.fn()} />);
    await screen.findByTestId("native-map");
    fireEvent.click(screen.getByRole("button", { name: "Expand map" }));
    fireEvent.click(screen.getByRole("button", { name: "Show my location" }));
    await screen.findByText("Location permission is off. Branches are still available.");
    expect(mocks.position).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Your location")).toBeNull();
    expect(screen.getByRole("button", { name: "Test branch, Menlyn" })).toBeTruthy();
  });
  it("lets the user retry after a location failure", async () => {
    mocks.environment = "bare"; mocks.position.mockRejectedValue(new Error("GPS unavailable"));
    render(<BranchMap branches={branches} onSelect={vi.fn()} />);
    await screen.findByTestId("native-map");
    fireEvent.click(screen.getByRole("button", { name: "Expand map" }));
    fireEvent.click(screen.getByRole("button", { name: "Show my location" }));
    await screen.findByText("Could not find your location. Try again.");
    expect((screen.getByRole("button", { name: "Show my location" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
