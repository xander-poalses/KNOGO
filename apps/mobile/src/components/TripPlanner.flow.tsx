// Imports
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockPlaces, emptyFuelPreferences, type FuelPreferences } from "@knogo/core";
import { TripPlanner } from "./TripPlanner";
vi.mock('expo-constants',()=>({default:{expoConfig:{extra:{}}}}));
vi.mock('../state/PlacesContext',()=>({usePlaces:()=>({coordinates:null})}));

// State and Helpers
const mocks = vi.hoisted(() => ({ route: vi.fn(), search: vi.fn(), permission: vi.fn(), location: vi.fn(), save: vi.fn(), refresh: vi.fn(), watch: vi.fn(), loading: false, preferences: null as FuelPreferences | null }));
vi.mock("./BranchMap", async () => {
  const { createElement } = await import("react");
  return { BranchMap: ({ branches, route }: any) => createElement("div", { "data-testid": "trip-map", "data-route-points": route?.length ?? 0 }, branches[0].name) };
});
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
vi.mock("../state/FuelContext", () => ({ useFuel: () => ({ preferences: mocks.preferences ?? emptyFuelPreferences, save: mocks.save, prices: null, refreshPrices: mocks.refresh, pricesLoading:mocks.loading,watchPrices:mocks.watch }) }));
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
  mocks.preferences = null;
  mocks.loading = false;
  mocks.permission.mockResolvedValue({ status: "granted" });
  mocks.location.mockResolvedValue({ coords: { latitude: -25.78, longitude: 28.27 } });
  mocks.route.mockResolvedValue({ outbound: { distanceMetres: 8000, durationSeconds: 900 }, attribution: "openrouteservice" });
  mocks.refresh.mockResolvedValue(undefined);
  mocks.save.mockResolvedValue(undefined);
});
afterEach(cleanup);

// Tests
describe("trip planner flow", () => {
  it('shows price loading without blocking routes and hides it for a price override',async()=>{
    mocks.loading=true;
    const view=render(<TripPlanner place={mockPlaces[0]}/>);
    fireEvent.click(screen.getByRole('button',{name:'Estimate my trip'}));
    await screen.findByRole('button',{name:'Open directions'});
    expect(screen.getByText('Getting prices')).toBeTruthy();
    mocks.preferences={...emptyFuelPreferences,priceOverrideZarPerLitre:25};
    view.rerender(<TripPlanner place={mockPlaces[0]}/>);
    expect(screen.queryByText('Getting prices')).toBeNull();
  });
  it("shows the destination map before estimating and the accepted route afterwards", async () => {
    const path = [{ latitude: -25.78, longitude: 28.27 }, { latitude: mockPlaces[0].latitude, longitude: mockPlaces[0].longitude }];
    mocks.route.mockResolvedValueOnce({ outbound: { distanceMetres: 8000, durationSeconds: 900 }, attribution: "openrouteservice", path });
    render(<TripPlanner place={mockPlaces[0]}/>);
    expect(screen.getByTestId("trip-map").getAttribute("data-route-points")).toBe("0");
    expect(screen.queryByText("Estimated fuel cost")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Estimate my trip" }));
    await screen.findByRole("button", { name: "Open directions" });
    expect(screen.getByTestId("trip-map").getAttribute("data-route-points")).toBe("2");
    expect(mocks.route).toHaveBeenCalledOnce();
  });
  it.each([false, true])("does not invent a closing buffer when hours are missing or closed (%s)", async closed => {
    const openingHours = closed ? mockPlaces[0].openingHours.map(row => ({ ...row, isClosed: true })) : [];
    render(<TripPlanner place={{ ...mockPlaces[0], openingHours }}/>);
    fireEvent.click(screen.getByRole("button", { name: "Estimate my trip" }));
    await screen.findByRole("button", { name: "Open directions" });
    expect(screen.getByText(closed ? "Outside listed hours" : "Hours not listed")).toBeTruthy();
    expect(screen.queryByText("Before listed closing")).toBeNull();
  });
  it("shows the listed-hours buffer at arrival, without claiming the venue is open", async () => {
    const openingHours = mockPlaces[0].openingHours.map(row => ({ ...row, openTime: "00:00", closeTime: "00:00", isClosed: false }));
    render(<TripPlanner place={{ ...mockPlaces[0], openingHours }}/>);
    fireEvent.click(screen.getByRole("button", { name: "Estimate my trip" }));
    await screen.findByRole("button", { name: "Open directions" });
    expect(screen.getByText("Before listed closing")).toBeTruthy();
    expect(screen.getByText(/\d+hr \d+min/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Hours at arrival" }));
    expect(screen.getByText("Listed hours are not a check. Reports do not predict conditions at arrival.")).toBeTruthy();
  });
  it("calculates rand cost from saved consumption and pump price without a price feed", async () => {
    mocks.preferences = { ...emptyFuelPreferences, consumptionLPer100Km: 7.5, priceOverrideZarPerLitre: 23 };
    render(<TripPlanner place={mockPlaces[0]}/>);
    fireEvent.click(screen.getByRole("button", { name: "Estimate my trip" }));
    expect(await screen.findByText("R 13.80")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Add fuel details for a cost" })).toBeNull();
  });
  it("recalculates the existing route after saving decimal-comma fuel inputs", async () => {
    mocks.save.mockImplementationOnce(async (value: FuelPreferences) => { mocks.preferences = value; });
    render(<TripPlanner place={mockPlaces[0]}/>);
    fireEvent.click(screen.getByRole("button", { name: "Estimate my trip" }));
    await screen.findByRole("button", { name: "Open directions" });
    fireEvent.click(screen.getByRole("button", { name: "Add fuel details for a cost" }));
    fireEvent.change(screen.getByLabelText("Car fuel use in litres per 100 kilometres"), { target: { value: "7,5" } });
    fireEvent.change(screen.getByLabelText("Fuel price in rand per litre"), { target: { value: "23" } });
    fireEvent.click(screen.getByRole("button", { name: "Save fuel details" }));
    expect(await screen.findByText("R 13.80")).toBeTruthy();
    expect(mocks.route).toHaveBeenCalledOnce();
  });
  it("shows drive time once when no fuel cost is available", async () => {
    render(<TripPlanner place={mockPlaces[0]}/>);
    fireEvent.click(screen.getByRole("button", { name: "Estimate my trip" }));
    await screen.findByText("15 min");
    expect(screen.getAllByText("15 min")).toHaveLength(1);
    expect(screen.queryByText("15 min drive")).toBeNull();
    expect(screen.queryByText("8.0 km away")).toBeNull();
  });
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
    expect(screen.queryByText("8.0 km away")).toBeNull();
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
  it("has no departure, return or explanation controls", async () => {
    render(<TripPlanner place={mockPlaces[0]}/>);
    fireEvent.click(screen.getByRole("button", { name: "Estimate my trip" }));
    await screen.findByRole("button", { name: "Open directions" });
    expect(screen.queryByRole("button", { name: /Leaving:/ })).toBeNull();
    expect(screen.queryByLabelText("Include return fuel")).toBeNull();
    expect(screen.queryByRole("button", { name: "How trip estimates work" })).toBeNull();
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
  it("only requests the outbound route", async () => {
    render(<TripPlanner place={mockPlaces[0]}/>);
    fireEvent.click(screen.getByRole("button", { name: "Estimate my trip" }));
    await screen.findByRole("button", { name: "Open directions" });
    expect(mocks.route).toHaveBeenCalledTimes(1);
    expect(mocks.route.mock.calls[0][2]).toBe(false);
  });
});
