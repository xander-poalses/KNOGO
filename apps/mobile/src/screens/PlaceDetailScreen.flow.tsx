import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockPlaces, type Place } from "@knogo/core";
import { PlaceDetailScreen } from "./PlaceDetailScreen";

const mocks = vi.hoisted(() => ({ places: [] as Place[], loading: false, saved: false, toggle: vi.fn(), push: vi.fn(), open: vi.fn(), refresh: vi.fn() }));
vi.mock("expo-router", async () => {
  const { useEffect } = await import("react");
  return { useLocalSearchParams: () => ({ placeId: "test-place" }), useRouter: () => ({ push: mocks.push }), useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]) };
});
vi.mock("../state/PlacesContext", () => ({ usePlaces: () => ({ places: mocks.places, loading: mocks.loading, isSaved: () => mocks.saved, toggleSaved: mocks.toggle, refreshPlace: mocks.refresh }) }));
vi.mock("../telemetry", () => ({ captureEvent: vi.fn() }));
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
vi.mock("lucide-react-native", () => Object.fromEntries(["CheckCircle2", "ChevronRight", "CircleHelp", "CircleX", "Clock3", "ExternalLink", "Globe", "Heart", "MapPin", "MoreHorizontal", "Navigation", "Phone", "TriangleAlert", "UtensilsCrossed"].map(name => [name, () => null])));
vi.mock("../theme", () => ({ fonts: {}, radii: {}, shadows: {}, sizes: {}, space: {}, useTheme: () => ({ colours: {} }), useThemeStyles: (factory: (value: object) => object) => factory({}) }));
vi.mock("../components/PlaceSheet", async () => {
  const { createElement } = await import("react");
  return { PlaceSheet: ({ visible, title, onClose, children }: any) => visible ? createElement("section", { role: "dialog", "aria-label": title }, createElement("button", { onClick: onClose }, "Close sheet"), children) : null };
});
vi.mock("../components/TripPlanner", async () => {
  const { createElement } = await import("react");
  return { TripPlanner: ({ place }: { place: Place }) => createElement("p", null, `Trip for ${place.id}`) };
});
vi.mock("../components/Ui", async () => {
  const { createElement } = await import("react");
  return {
    Page: ({ children }: any) => createElement("main", null, children),
    BackButton: () => createElement("button", null, "Back"),
    Notice: ({ title, message, actionLabel, onAction }: any) => createElement("div", null, createElement("p", null, title, message), actionLabel ? createElement("button", { onClick: onAction }, actionLabel) : null),
    ActionButton: ({ label, onPress }: any) => createElement("button", { onClick: onPress }, label)
  };
});
vi.mock("react-native", async () => {
  const { createElement } = await import("react");
  return {
    View: ({ children, accessibilityLabel }: any) => createElement("div", { "aria-label": accessibilityLabel }, children),
    Text: ({ children, accessibilityRole }: any) => createElement("div", { role: accessibilityRole === "alert" ? "alert" : undefined }, children),
    Pressable: ({ children, onPress, accessibilityLabel, accessibilityRole, ...props }: any) => createElement("button", { onClick: onPress, "aria-label": accessibilityLabel, role: accessibilityRole === "link" ? "link" : undefined, "aria-pressed": props["aria-pressed"] }, children),
    AppState: { addEventListener: () => ({ remove: vi.fn() }) }, Linking: { openURL: mocks.open },
    StyleSheet: { create: (value: unknown) => value, hairlineWidth: 1 }
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.places = [{ ...mockPlaces[0], id: "test-place", kitchenHours: undefined, features: [], phone: undefined, website: undefined, menuUrl: undefined }];
  mocks.loading = false; mocks.saved = false;
  mocks.toggle.mockResolvedValue(undefined); mocks.open.mockResolvedValue(undefined);
  mocks.refresh.mockReset().mockResolvedValue(undefined);
});
afterEach(cleanup);

describe("place dashboard journey", () => {
  it("refreshes on entry and lets a failed report refresh be retried", async () => {
    mocks.refresh.mockRejectedValueOnce(new Error("Offline")).mockRejectedValueOnce(new Error("Offline"));
    render(<PlaceDetailScreen/>);
    await vi.waitFor(() => expect(mocks.refresh).toHaveBeenCalledWith("test-place"));
    await vi.waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Status and practical checks" }));
    await screen.findByText(/Could not refresh reports/);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await vi.waitFor(() => expect(screen.queryByText(/Could not refresh reports/)).toBeNull());
    expect(mocks.refresh).toHaveBeenCalledTimes(3);
  });
  it("keeps detail content behind its commands", () => {
    render(<PlaceDetailScreen/>);
    for (const name of ["Status and practical checks", "View listed hours", "Plan your trip", "View place information", "Contact and directions"]) {
      expect(screen.getByRole("button", { name })).toBeTruthy();
    }
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("Practical checks")).toBeNull();
  });
  it("opens and closes status checks without starting a trip", () => {
    render(<PlaceDetailScreen/>);
    fireEvent.click(screen.getByRole("button", { name: "Status and practical checks" }));
    expect(screen.getByRole("dialog", { name: "Status & checks" })).toBeTruthy();
    expect(screen.getByText("Practical checks")).toBeTruthy();
    expect(screen.queryByText("Walk-ins")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Practical checks" }));
    expect(screen.getByText("Walk-ins")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Practical checks" }));
    expect(screen.queryByText("Walk-ins")).toBeNull();
    expect(screen.queryByText("Trip for test-place")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Close sheet" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("shows missing kitchen hours without copying trading times", () => {
    render(<PlaceDetailScreen/>);
    fireEvent.click(screen.getByRole("button", { name: "View listed hours" }));
    expect(screen.getByRole("dialog", { name: "Listed hours" })).toBeTruthy();
    expect(screen.getByText("Kitchen hours not published.")).toBeTruthy();
    expect(screen.queryByText("Kitchen")).toBeNull();
  });
  it("offers reporting inside the checks sheet without confusing schedules with evidence", () => {
    mocks.places[0] = { ...mocks.places[0], currentStatus: { ...mocks.places[0].currentStatus, trust: { version: 1, claims: {} } } };
    render(<PlaceDetailScreen/>);
    fireEvent.click(screen.getByRole("button", { name: "Status and practical checks" }));
    const sheet = within(screen.getByRole("dialog", { name: "Status & checks" }));
    expect(sheet.getByText("Community reports")).toBeTruthy();
    expect(sheet.getByText("From listed hours, not a community check.")).toBeTruthy();
    expect(sheet.queryByText("Outside service hours")).toBeNull();
    fireEvent.click(sheet.getByRole("button", { name: "Leave a report" }));
    expect(mocks.push).toHaveBeenCalledWith({ pathname: "/confirm/[placeId]", params: { placeId: "test-place" } });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("shows a trading-hours gap rather than inventing a closure", () => {
    mocks.places[0] = { ...mocks.places[0], openingHours: [] };
    render(<PlaceDetailScreen/>);
    fireEvent.click(screen.getByRole("button", { name: "View listed hours" }));
    expect(screen.getByText("Trading hours not published.")).toBeTruthy();
    expect(screen.queryByText("Closed today")).toBeNull();
  });
  it("opens the selected venue planner on request", () => {
    render(<PlaceDetailScreen/>);
    fireEvent.click(screen.getByRole("button", { name: "Plan your trip" }));
    expect(screen.getByRole("dialog", { name: "Plan your trip" })).toBeTruthy();
    expect(screen.getByText("Trip for test-place")).toBeTruthy();
  });
  it("hides missing features and routes venue access to this place", () => {
    render(<PlaceDetailScreen/>);
    fireEvent.click(screen.getByRole("button", { name: "View place information" }));
    expect(screen.queryByText("Features")).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: "Represent this venue" }));
    expect(mocks.push).toHaveBeenCalledWith({ pathname: "/venue/[placeId]", params: { placeId: "test-place" } });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("offers directions when contact details are missing", () => {
    render(<PlaceDetailScreen/>);
    fireEvent.click(screen.getByRole("button", { name: "Contact and directions" }));
    expect(screen.getByText("Contact details not listed")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Directions" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Call" })).toBeNull();
  });
  it("keeps failed external actions in the sheet for retry", async () => {
    mocks.open.mockRejectedValue(new Error("No handler"));
    render(<PlaceDetailScreen/>);
    fireEvent.click(screen.getByRole("button", { name: "Contact and directions" }));
    fireEvent.click(screen.getByRole("button", { name: "Directions" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Could not open this link");
    expect(screen.getByRole("dialog", { name: "Contact & directions" })).toBeTruthy();
  });
  it("saves and routes reporting to the selected place", () => {
    render(<PlaceDetailScreen/>);
    fireEvent.click(screen.getByRole("button", { name: "Save place" }));
    expect(mocks.toggle).toHaveBeenCalledWith("test-place");
    fireEvent.click(screen.getByRole("button", { name: "Leave a report" }));
    expect(mocks.push).toHaveBeenCalledWith({ pathname: "/confirm/[placeId]", params: { placeId: "test-place" } });
  });
  it("waits for place restoration before showing a missing-place state", () => {
    mocks.places = []; mocks.loading = true;
    render(<PlaceDetailScreen/>);
    expect(screen.getByText("Loading place")).toBeTruthy();
    expect(screen.queryByText(/Place not found/)).toBeNull();
  });
});
