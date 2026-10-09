import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockPlaces, emptyFuelPreferences } from "@knogo/core";
import { TripPlanner } from "./TripPlanner";

const mocks = vi.hoisted(() => ({ route: vi.fn(), search: vi.fn(), permission: vi.fn(), location: vi.fn(), save: vi.fn(), refresh: vi.fn() }));
// Entrance sequencing has its own tests; these tests exercise trip state.
vi.mock("./StagedModal", async () => {
  const { Modal } = await import("react-native");
  return { StagedModal: Modal };
});
vi.mock("@knogo/core", async importOriginal => ({ ...await importOriginal<object>(), createTripApi: () => ({ configured: true, route: mocks.route, search: mocks.search }) }));
vi.mock("expo-location", () => ({ Accuracy: { Balanced: 3 }, requestForegroundPermissionsAsync: mocks.permission, getCurrentPositionAsync: mocks.location }));
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
vi.mock("lucide-react-native", () => Object.fromEntries(["ArrowUpRight", "Clock3", "Fuel", "Info", "MapPin", "Navigation", "RefreshCw", "Search", "X", "ChevronLeft"].map(key => [key, () => null])));
vi.mock("../theme", () => ({
  fonts: {}, radii: {}, sizes: {}, space: {},
  useTheme: () => ({ colours: {} }), useThemeStyles: (factory: (value: object) => object) => factory({})
}));
vi.mock("../state/FuelContext", () => ({ useFuel: () => ({ preferences: emptyFuelPreferences, save: mocks.save, prices: null, refreshPrices: mocks.refresh }) }));
vi.mock("./DeparturePicker", async () => {
  const { createElement } = await import("react");
  return { DeparturePicker: () => createElement("span", null, "Date picker") };
});
vi.mock("./Ui", async () => {
  const { createElement } = await import("react");
  return {
    ActionButton: ({ label, onPress, disabled, loading }: any) => createElement("button", { onClick: onPress, disabled: disabled || loading, "aria-busy": Boolean(loading) }, label),
    Chip: ({ label, onPress }: any) => createElement("button", { onClick: onPress }, label)
  };
});
vi.mock("react-native", async () => {
  const { createElement, forwardRef } = await import("react");
  const box = ({ children }: any) => createElement("div", null, children);
  return {
    View: box, Text: box, ScrollView: box, KeyboardAvoidingView: box,
    Modal: ({ children, visible }: any) => visible ? createElement("section", { role: "dialog" }, children) : null,
    Pressable: ({ children, onPress, accessibilityLabel, disabled }: any) => createElement("button", { onClick: onPress, "aria-label": accessibilityLabel, disabled }, children),
    TextInput: forwardRef(({ onChangeText, onSubmitEditing, accessibilityLabel, value, placeholder }: any, ref: any) => createElement("input", { ref, "aria-label": accessibilityLabel, value, placeholder, onChange: (event: any) => onChangeText(event.target.value), onKeyDown: (event: any) => { if (event.key === "Enter") onSubmitEditing?.(); } })),
    Switch: ({ onValueChange, value, accessibilityLabel, disabled }: any) => createElement("input", { type: "checkbox", "aria-label": accessibilityLabel, checked: value, disabled, onChange: (event: any) => onValueChange(event.target.checked) }),
    ActivityIndicator: () => null, Linking: { openURL: vi.fn().mockResolvedValue(undefined) }, Platform: { OS: "web" },
    StyleSheet: { create: (value: unknown) => value, hairlineWidth: 1, absoluteFill: {} }
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.permission.mockResolvedValue({ status: "granted" });
  mocks.location.mockResolvedValue({ coords: { latitude: -25.78, longitude: 28.27 } });
  mocks.route.mockResolvedValue({ outbound: { distanceMetres: 8000, durationSeconds: 900 }, attribution: "openrouteservice" });
  mocks.refresh.mockResolvedValue(undefined);
  mocks.save.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe("trip planner flow", () => {
  it("keeps fuel edits when returning through Back without saving", async () => {
    render(<TripPlanner place={mockPlaces[0]}/>);
    fireEvent.click(screen.getByRole("button", { name: "Estimate my trip" }));
    await screen.findByRole("button", { name: "Open directions" });
    fireEvent.click(screen.getByRole("button", { name: "Add fuel details for a cost" }));
    fireEvent.change(screen.getByLabelText("Car fuel use in litres per 100 kilometres"), { target: { value: "7.8" } });
    fireEvent.click(screen.getByRole("button", { name: "Back to trip estimate" }));
    fireEvent.click(screen.getByRole("button", { name: "Add fuel details for a cost" }));
    expect((screen.getByLabelText("Car fuel use in litres per 100 kilometres") as HTMLInputElement).value).toBe("7.8");
    expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.route).toHaveBeenCalledOnce();
  });
  it("does not start a route when location arrives after closing the planner", async () => {
    let finish!: (value: unknown) => void;
    mocks.location.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const view = render(<TripPlanner place={mockPlaces[0]}/>);
    fireEvent.click(screen.getByRole("button", { name: "Estimate my trip" }));
    await waitFor(() => expect(mocks.location).toHaveBeenCalledTimes(1));
    view.unmount();
    await act(async () => { finish({ coords: { latitude: -25.78, longitude: 28.27 } }); });
    expect(mocks.route).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it("does not request a position after a permission reply to a closed planner", async () => {
    let finish!: (value: unknown) => void;
    mocks.permission.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const view = render(<TripPlanner place={mockPlaces[0]}/>);
    fireEvent.click(screen.getByRole("button", { name: "Estimate my trip" }));
    view.unmount();
    await act(async () => { finish({ status: "granted" }); });
    expect(mocks.location).not.toHaveBeenCalled();
    expect(mocks.route).not.toHaveBeenCalled();
  });
  it("compares kitchen hours separately behind the arrival command", async () => {
    render(<TripPlanner place={{ ...mockPlaces[0], kitchenHours: undefined }}/>);
    fireEvent.click(screen.getByRole("button", { name: "Estimate my trip" }));
    await screen.findByRole("button", { name: "Open directions" });
    fireEvent.click(screen.getByRole("button", { name: "Hours at arrival" }));
    expect(screen.getByText("Kitchen / service")).toBeTruthy();
    expect(screen.getAllByText("Hours not available for arrival.").length).toBeGreaterThan(0);
    expect(mocks.route).toHaveBeenCalledTimes(1);
  });
  it("estimates from device location and now with one tap", async () => {
    render(<TripPlanner place={mockPlaces[0]}/>);
    fireEvent.click(screen.getByRole("button", { name: "Estimate my trip" }));
    await screen.findByRole("button", { name: "Open directions" });
    expect(mocks.permission).toHaveBeenCalledTimes(1);
    expect(mocks.location).toHaveBeenCalledTimes(1);
    expect(mocks.route.mock.calls[0][0]).toEqual({ latitude: -25.78, longitude: 28.27 });
    expect(screen.getByText("8.0 km away")).toBeTruthy();
    expect(screen.queryByText("Loading route map...")).toBeNull();
  });
  it("ignores repeated taps while the estimate runs", async () => {
    render(<TripPlanner place={mockPlaces[0]}/>);
    const button = screen.getByRole("button", { name: "Estimate my trip" });
    fireEvent.click(button); fireEvent.click(button);
    await screen.findByRole("button", { name: "Open directions" });
    expect(mocks.route).toHaveBeenCalledTimes(1);
  });
  it("offers address selection after a denied location permission", async () => {
    mocks.permission.mockResolvedValue({ status: "denied" });
    render(<TripPlanner place={mockPlaces[0]}/>);
    fireEvent.click(screen.getByRole("button", { name: "Estimate my trip" }));
    await screen.findByText("Choose a starting place to estimate your trip.");
    expect(mocks.route).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Change starting place" }));
    expect(screen.getByLabelText("Starting address")).toBeTruthy();
  });
  it("selecting an address returns to estimate without a GPS or routing request", async () => {
    mocks.search.mockResolvedValue([{ id: "menlyn", label: "Menlyn", latitude: -25.78, longitude: 28.27 }]);
    render(<TripPlanner place={mockPlaces[0]}/>);
    fireEvent.click(screen.getByRole("button", { name: "From: Your location. Change from" }));
    fireEvent.change(screen.getByLabelText("Starting address"), { target: { value: "Menlyn" } });
    fireEvent.click(screen.getByRole("button", { name: "Search starting places" }));
    fireEvent.click(await screen.findByRole("button", { name: "Menlyn" }));
    expect(mocks.route).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Estimate my trip" }));
    await screen.findByRole("button", { name: "Open directions" });
    expect(mocks.permission).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("departure changes reuse the accepted route and do not spend another request", async () => {
    render(<TripPlanner place={mockPlaces[0]}/>);
    fireEvent.click(screen.getByRole("button", { name: "Estimate my trip" }));
    await screen.findByRole("button", { name: "Open directions" });
    fireEvent.click(screen.getByRole("button", { name: "Leaving: Now. Change leaving" }));
    fireEvent.click(screen.getByRole("button", { name: "Tomorrow" }));
    fireEvent.click(screen.getByRole("button", { name: "Use this departure" }));
    expect(mocks.route).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("keeps a route result usable when fuel settings are absent", async () => {
    render(<TripPlanner place={mockPlaces[0]}/>);
    fireEvent.click(screen.getByRole("button", { name: "Estimate my trip" }));
    await screen.findByRole("button", { name: "Open directions" });
    fireEvent.click(screen.getByRole("button", { name: "Add fuel details for a cost" }));
    fireEvent.change(screen.getByLabelText("Car fuel use in litres per 100 kilometres"), { target: { value: "7.5" } });
    fireEvent.change(screen.getByLabelText("Fuel price in rand per litre"), { target: { value: "23" } });
    fireEvent.click(screen.getByRole("button", { name: "Save fuel details" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({ ...emptyFuelPreferences, consumptionLPer100Km: 7.5, priceOverrideZarPerLitre: 23 }));
    expect(mocks.route).toHaveBeenCalledTimes(1);
  });
  it("does not invent a result after a routing failure", async () => {
    mocks.route.mockRejectedValue(new Error("Service is at its limit. Try later."));
    render(<TripPlanner place={mockPlaces[0]}/>);
    fireEvent.click(screen.getByRole("button", { name: "Estimate my trip" }));
    await screen.findByText("Service is at its limit. Try later.");
    expect(screen.queryByRole("button", { name: "Open directions" })).toBeNull();
    expect(screen.getByRole("button", { name: "Estimate my trip" })).toBeTruthy();
  });
  it("switching from an address to my location does not reuse the address", async () => {
    mocks.search.mockResolvedValue([{ id: "test", label: "Chosen start", latitude: -25.8, longitude: 28.3 }]);
    render(<TripPlanner place={mockPlaces[0]}/>);
    fireEvent.click(screen.getByRole("button", { name: "From: Your location. Change from" }));
    fireEvent.change(screen.getByLabelText("Starting address"), { target: { value: "Menlyn" } });
    fireEvent.click(screen.getByRole("button", { name: "Search starting places" }));
    fireEvent.click(await screen.findByRole("button", { name: "Chosen start" }));
    fireEvent.click(screen.getByRole("button", { name: "Estimate my trip" }));
    await screen.findByRole("button", { name: "Open directions" });
    fireEvent.click(screen.getByRole("button", { name: "From: Chosen start. Change from" }));
    fireEvent.click(screen.getByRole("button", { name: "Use my location" }));
    fireEvent.click(screen.getByRole("button", { name: "Estimate my trip" }));
    await waitFor(() => expect(mocks.route).toHaveBeenCalledTimes(2));
    expect(mocks.route.mock.calls[1][0]).toEqual({ latitude: -25.78, longitude: 28.27 });
    expect(mocks.location).toHaveBeenCalledTimes(1);
  });
  it("fetches a return leg once and reuses it after toggling", async () => {
    mocks.route.mockResolvedValue({ outbound: { distanceMetres: 8000, durationSeconds: 900 }, attribution: "openrouteservice" });
    render(<TripPlanner place={mockPlaces[0]}/>);
    fireEvent.click(screen.getByRole("button", { name: "Estimate my trip" }));
    await screen.findByRole("button", { name: "Open directions" });
    mocks.route.mockResolvedValue({ outbound: { distanceMetres: 9000, durationSeconds: 1000 }, attribution: "openrouteservice" });
    fireEvent.click(screen.getByLabelText("Include return fuel"));
    await screen.findByRole("button", { name: "Open directions" });
    expect(mocks.route.mock.calls[1][0]).toEqual({ latitude: mockPlaces[0].latitude, longitude: mockPlaces[0].longitude });
    expect(mocks.route.mock.calls[1][1]).toEqual({ latitude: -25.78, longitude: 28.27 });
    expect(mocks.route.mock.calls[1][2]).toBe(false);
    fireEvent.click(screen.getByLabelText("Include return fuel"));
    fireEvent.click(screen.getByLabelText("Include return fuel"));
    expect(mocks.route).toHaveBeenCalledTimes(2);
  });
  it("keeps outbound distance and arrival when a return leg finishes", async () => {
    const onEstimateChange = vi.fn();
    render(<TripPlanner place={mockPlaces[0]} onEstimateChange={onEstimateChange}/>);
    fireEvent.click(screen.getByRole("button", { name: "Estimate my trip" }));
    await screen.findByRole("button", { name: "Open directions" });
    await waitFor(() => expect(onEstimateChange.mock.calls.at(-1)?.[0]).toMatchObject({ includeReturn: false }));
    const original = onEstimateChange.mock.calls.at(-1)![0];
    mocks.route.mockResolvedValue({ outbound: { distanceMetres: 12000, durationSeconds: 2000 }, attribution: "openrouteservice" });
    fireEvent.click(screen.getByLabelText("Include return fuel"));
    await screen.findByRole("button", { name: "Open directions" });
    await waitFor(() => expect(onEstimateChange.mock.calls.at(-1)?.[0]).toMatchObject({ kilometres: 20, arrival: original.arrival, includeReturn: true }));
    expect(screen.getByText("8.0 km away")).toBeTruthy();
    expect(mocks.location).toHaveBeenCalledTimes(1);
  });
  it("retains outbound arrival and labels the doubling fallback on return failure", async () => {
    const onEstimateChange = vi.fn();
    render(<TripPlanner place={mockPlaces[0]} onEstimateChange={onEstimateChange}/>);
    fireEvent.click(screen.getByRole("button", { name: "Estimate my trip" }));
    await screen.findByRole("button", { name: "Open directions" });
    await waitFor(() => expect(onEstimateChange.mock.calls.at(-1)?.[0]).toMatchObject({ includeReturn: false }));
    const original = onEstimateChange.mock.calls.at(-1)![0];
    mocks.route.mockRejectedValue(new Error("Offline"));
    fireEvent.click(screen.getByLabelText("Include return fuel"));
    await screen.findByText("Return route unavailable. Using twice the outbound distance for fuel.");
    expect(screen.getByRole("button", { name: "Open directions" })).toBeTruthy();
    await waitFor(() => expect(onEstimateChange.mock.calls.at(-1)?.[0]).toMatchObject({ kilometres: 16, arrival: original.arrival, includeReturn: true }));
    fireEvent.click(screen.getByLabelText("Include return fuel"));
    expect(screen.queryByText("Return route unavailable. Using twice the outbound distance for fuel.")).toBeNull();
    await waitFor(() => expect(onEstimateChange.mock.calls.at(-1)?.[0]?.kilometres).toBe(8));
  });
  it("does not add a second return request while one is running", async () => {
    render(<TripPlanner place={mockPlaces[0]}/>);
    fireEvent.click(screen.getByRole("button", { name: "Estimate my trip" }));
    await screen.findByRole("button", { name: "Open directions" });
    let finish!: (value: unknown) => void;
    mocks.route.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    fireEvent.click(screen.getByLabelText("Include return fuel"));
    fireEvent.click(screen.getByLabelText("Include return fuel"));
    expect(mocks.route).toHaveBeenCalledTimes(2);
    finish({ outbound: { distanceMetres: 9000, durationSeconds: 1000 }, attribution: "openrouteservice" });
    await screen.findByRole("button", { name: "Open directions" });
  });
});
