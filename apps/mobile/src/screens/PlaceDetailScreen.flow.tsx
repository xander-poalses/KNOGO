import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockPlaces, type Place, type TrustClaim, type ConfirmationType } from "@knogo/core";
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
  it("does not show kitchen status for a non-food place", () => {
    mocks.places[0] = { ...mocks.places[0], category: "shops", placeType: "supermarket" };
    render(<PlaceDetailScreen />);
    expect(screen.queryByText("Service expected")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "View recent reports" }));
    expect(screen.queryByText("Kitchen serving")).toBeNull();
    expect(screen.getByText("No opening reports")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close sheet" }));
    fireEvent.click(screen.getByRole("button", { name: "View listed hours" }));
    expect(screen.queryByText("Kitchen hours not published.")).toBeNull();
  });
  it.each([true, false])("shows reported opening, age and serving only from evidence (%s)", (serving) => {
    const reportedAt = new Date(Date.now() - 65 * 60_000).toISOString();
    const expiresAt = new Date(Date.now() + 60 * 60_000).toISOString();
    const claim = (type: ConfirmationType, value: string): TrustClaim => ({ state: "community_indication", value, reportedAt, expiresAt, rule: "community", evidence: [{ id: type, actorId: "tester", type, value, source: "community", reportedAt, expiresAt }] });
    mocks.places[0].currentStatus = { ...mocks.places[0].currentStatus, trust: { version: 1, claims: { open_status: claim("open_status", "open"), ...(serving ? { kitchen_status: claim("kitchen_status", "yes") } : {}) } } };
    render(<PlaceDetailScreen />);
    expect(screen.getByText("Open")).toBeTruthy();
    expect(screen.getByText("Reported 01:05 ago")).toBeTruthy();
    expect(Boolean(screen.queryByText("and Serving"))).toBe(serving);
    expect(screen.queryByText("Community reports open")).toBeNull();
  });
  it("uses the visible reports label as its accessible name", () => {
    render(<PlaceDetailScreen/>);
    expect(screen.getByRole("button", { name: "View recent reports" }).textContent).toContain("View recent reports");
  });
  it("counts busy-level evidence as a practical check without calling it an opening report", () => {
    const reportedAt = new Date(Date.now() - 5 * 60_000).toISOString();
    const expiresAt = new Date(Date.now() + 60 * 60_000).toISOString();
    mocks.places[0].currentStatus.trust = { version: 1, claims: { busy_level: { state: "community_indication", value: "quiet", reportedAt, expiresAt, rule: "community", evidence: [{ id: "busy-check", actorId: "tester", type: "busy_level", value: "quiet", source: "community", reportedAt, expiresAt }] } } };
    render(<PlaceDetailScreen/>);
    fireEvent.click(screen.getByRole("button", { name: "View recent reports" }));
    expect(screen.getByText("1 of 4 checked")).toBeTruthy();
    expect(screen.getByText("No opening reports")).toBeTruthy();
  });
  it("refreshes on entry and lets a failed report refresh be retried", async () => {
    mocks.refresh.mockRejectedValueOnce(new Error("Offline")).mockRejectedValueOnce(new Error("Offline"));
    render(<PlaceDetailScreen/>);
    await vi.waitFor(() => expect(mocks.refresh).toHaveBeenCalledWith("test-place"));
    await vi.waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "View recent reports" }));
    await screen.findByText(/Could not refresh reports/);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await vi.waitFor(() => expect(screen.queryByText(/Could not refresh reports/)).toBeNull());
    expect(mocks.refresh).toHaveBeenCalledTimes(3);
  });
  it("keeps detail content behind its commands", () => {
    render(<PlaceDetailScreen/>);
    for (const name of ["View recent reports", "View listed hours", "Plan your trip", "View place information", "Contact and directions"]) {
      expect(screen.getByRole("button", { name })).toBeTruthy();
    }
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("Practical checks")).toBeNull();
  });
  it("opens and closes status checks without starting a trip", () => {
    render(<PlaceDetailScreen/>);
    fireEvent.click(screen.getByRole("button", { name: "View recent reports" }));
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
    fireEvent.click(screen.getByRole("button", { name: "View recent reports" }));
    const sheet = within(screen.getByRole("dialog", { name: "Status & checks" }));
    expect(sheet.getByText("Reports")).toBeTruthy();
    expect(sheet.getByText("Based on listed hours, not a status check.")).toBeTruthy();
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
  it("does not claim a listed-hours basis when no trading hours exist", () => {
    mocks.places[0] = { ...mocks.places[0], openingHours: [], currentStatus: { ...mocks.places[0].currentStatus, trust: { version: 1, claims: {} } } };
    render(<PlaceDetailScreen/>);
    fireEvent.click(screen.getByRole("button", { name: "View recent reports" }));
    const sheet = within(screen.getByRole("dialog", { name: "Status & checks" }));
    expect(sheet.getByText("Hours are not listed for this time. Contact the venue to check.")).toBeTruthy();
    expect(sheet.queryByText("From listed hours, not a community check.")).toBeNull();
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
  it("groups contact actions and keeps listing provenance behind disclosure", async () => {
    mocks.places[0] = { ...mocks.places[0], phone: "012 123 4567", website: "https://example.com/venue", sourceUrl: "https://example.com/source", sourceCheckedAt: "2026-10-17", dataNotes: "Coordinates mark the shopping centre." };
    render(<PlaceDetailScreen/>);
    fireEvent.click(screen.getByRole("button", { name: "View place information" }));
    const sheet = within(screen.getByRole("dialog", { name: "Place information" }));
    expect(sheet.getByText("Address")).toBeTruthy();
    expect(sheet.getByRole("button", { name: "Call 012 123 4567" })).toBeTruthy();
    expect(sheet.queryByText("Coordinates mark the shopping centre.")).toBeNull();
    fireEvent.click(sheet.getByRole("button", { name: "About this listing" }));
    expect(sheet.getByText("Coordinates mark the shopping centre.")).toBeTruthy();
    fireEvent.click(sheet.getByRole("button", { name: "View listing source" }));
    await vi.waitFor(() => expect(mocks.open).toHaveBeenCalledWith("https://example.com/source"));
  });
  it("does not expose unsafe listing source links", () => {
    mocks.places[0] = { ...mocks.places[0], sourceUrl: "javascript:alert(1)", dataNotes: "Source needs a check." };
    render(<PlaceDetailScreen/>);
    fireEvent.click(screen.getByRole("button", { name: "View place information" }));
    fireEvent.click(screen.getByRole("button", { name: "About this listing" }));
    expect(screen.queryByRole("button", { name: "View listing source" })).toBeNull();
  });
  it("keeps photo credit behind listing details and opens its source", async () => {
    mocks.places[0] = { ...mocks.places[0], imageUrl: "https://example.com/place.jpg", imageSourceUrl: "https://example.com/photos", imageAttribution: "Example photographer", imageCheckedAt: "2026-10-18" };
    render(<PlaceDetailScreen/>);
    fireEvent.click(screen.getByRole("button", { name: "View place information" }));
    expect(screen.queryByText("Photo: Example photographer")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "About this listing" }));
    expect(screen.getByText("Photo: Example photographer")).toBeTruthy();
    expect(screen.getByText("Photo checked 2026-10-18")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "View photo source" }));
    await vi.waitFor(() => expect(mocks.open).toHaveBeenCalledWith("https://example.com/photos"));
  });
  it("does not expose an unsafe photo source", () => {
    mocks.places[0] = { ...mocks.places[0], imageUrl: "https://example.com/place.jpg", imageSourceUrl: "javascript:alert(1)", imageAttribution: "Example photographer" };
    render(<PlaceDetailScreen/>);
    fireEvent.click(screen.getByRole("button", { name: "View place information" }));
    fireEvent.click(screen.getByRole("button", { name: "About this listing" }));
    expect(screen.queryByRole("button", { name: "View photo source" })).toBeNull();
  });
  it("keeps report evidence behind a control and excludes expired evidence", () => {
    const reportedAt = new Date(Date.now() - 5 * 60_000).toISOString();
    const expiresAt = new Date(Date.now() + 60 * 60_000).toISOString();
    const evidence = { id: "check-1", actorId: "tester", type: "open_status" as const, value: "open", source: "community" as const, reportedAt, expiresAt, checkedBy: "in_person" as const };
    mocks.places[0].currentStatus = { ...mocks.places[0].currentStatus, trust: { version: 1, claims: { open_status: { state: "community_indication", value: "open", reportedAt, expiresAt, rule: "community", evidence: [evidence] } } } };
    const view = render(<PlaceDetailScreen/>);
    fireEvent.click(screen.getByRole("button", { name: "View recent reports" }));
    const sheet = within(screen.getByRole("dialog", { name: "Status & checks" }));
    expect(sheet.queryByText(/Expires at/)).toBeNull();
    fireEvent.click(sheet.getByRole("button", { name: "Open report details" }));
    expect(sheet.getByText(/At the venue/)).toBeTruthy();
    expect(sheet.getAllByText(/Expires at/)).toHaveLength(1);
    mocks.places[0].currentStatus.trust!.claims.open_status!.evidence[0].expiresAt = new Date(Date.now() - 60_000).toISOString();
    view.rerender(<PlaceDetailScreen/>);
    expect(sheet.queryByRole("button", { name: "Open report details" })).toBeNull();
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
