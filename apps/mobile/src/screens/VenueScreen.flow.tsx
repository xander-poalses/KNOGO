import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockPlaces } from "@knogo/core";
import { VenueScreen } from "./VenueScreen";

const mocks = vi.hoisted(() => ({ places: [] as any[], loading: false, session: null as any, access: vi.fn(), start: vi.fn() }));
vi.mock("expo-router", () => ({ useLocalSearchParams: () => ({ placeId: "cappuccinos-menlyn" }), useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("../state/PlacesContext", () => ({ usePlaces: () => ({ places: mocks.places, loading: mocks.loading, session: mocks.session, authLoading: false, refresh: vi.fn() }) }));
vi.mock("../supabase", () => ({ supabaseApi: { readVenueAccess: mocks.access, startVenueClaim: mocks.start } }));
vi.mock("../components/AccountForm", async () => {
  const { createElement } = await import("react");
  return { AccountForm: ({ venuePlaceId }: any) => createElement("section", { "aria-label": "Account access", "data-venue-id": venuePlaceId }, "Shared account form") };
});
vi.mock("../components/Ui", async () => {
  const { createElement } = await import("react");
  return {
    Page: ({ children }: any) => createElement("main", null, children),
    BackButton: () => createElement("button", null, "Back"),
    Notice: ({ title }: any) => createElement("p", null, title),
    ActionButton: ({ label }: any) => createElement("button", null, label)
  };
});
vi.mock("../theme", () => ({ fonts: {}, useTheme: () => ({ colours: {} }), useThemeStyles: (factory: (value: object) => object) => factory({}) }));
vi.mock("lucide-react-native", () => ({ Check: () => null }));
vi.mock("react-native", async () => {
  const { createElement } = await import("react");
  const box = ({ children }: any) => createElement("div", null, children);
  return { View: box, Text: box, TextInput: () => createElement("input"), Pressable: box, StyleSheet: { create: (value: unknown) => value } };
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("EXPO_PUBLIC_VENUE_CLAIM_API_URL", "");
  mocks.places = [{ ...mockPlaces[0], id: "cappuccinos-menlyn" }];
  mocks.loading = false; mocks.session = null;
  mocks.access.mockResolvedValue({ verified: false, verifiedAt: null, expiresAt: null });
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

describe("venue account entry", () => {
  it("uses shared account access with the venue return target", () => {
    render(<VenueScreen/>);
    expect(screen.getByRole("region", { name: "Account access" }).getAttribute("data-venue-id")).toBe("cappuccinos-menlyn");
    expect(screen.queryByRole("button", { name: "Send sign-in link" })).toBeNull();
    expect(mocks.access).not.toHaveBeenCalled();
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it("shows loading rather than a missing venue while places restore", () => {
    mocks.places = []; mocks.loading = true;
    render(<VenueScreen/>);
    expect(screen.getByText("Loading place")).toBeTruthy();
    expect(screen.queryByText("Place not found")).toBeNull();
  });
  it("checks representative access after sign-in without requesting a code", async () => {
    const view = render(<VenueScreen/>);
    mocks.session = { userId: "person" };
    view.rerender(<VenueScreen/>);
    await waitFor(() => expect(mocks.access).toHaveBeenCalledWith("cappuccinos-menlyn"));
    await screen.findByText("Verify venue phone access");
    expect(screen.queryByRole("region", { name: "Account access" })).toBeNull();
    expect(mocks.start).not.toHaveBeenCalled();
  });
});
