import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { render } from "../testRender";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsScreen } from "./SettingsScreen";

const mocks = vi.hoisted(() => ({ signOut: vi.fn(), testerFeedbackEnabled: false, session: { email: "tester@example.com" } as { email: string } | null }));
vi.mock("../testing", () => ({ get testerFeedbackEnabled() { return mocks.testerFeedbackEnabled; } }));
vi.mock("../components/TesterFeedbackForm", () => ({ TesterFeedbackForm: () => null }));
vi.mock("../state/PlacesContext", () => ({ usePlaces: () => ({ session: mocks.session, signOut: mocks.signOut }) }));
vi.mock("../state/FuelContext", () => ({ useFuel: () => ({ preferences: {}, save: vi.fn() }) }));
vi.mock("expo-router", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("../theme", () => ({ fonts: {}, radii: {}, sizes: {}, space: {}, useTheme: () => ({ colours: {}, preference: "system", setPreference: vi.fn() }), useThemeStyles: (factory: (value: object) => object) => factory({}) }));
vi.mock("../components/AccountForm", () => ({ AccountForm: () => null }));
vi.mock("../components/FuelPreferencesForm", () => ({ FuelPreferencesForm: () => null }));
vi.mock("../components/PlaceSheet", () => ({ PlaceSheet: () => null }));
vi.mock("../components/Ui", async () => {
  const { createElement } = await import("react");
  return { Page: ({ children }: any) => createElement("main", null, children), ActionButton: ({ label, onPress, loading, disabled }: any) => createElement("button", { onClick: onPress, disabled: disabled || loading, "aria-busy": Boolean(loading) }, label) };
});
vi.mock("../components/HapticPressable", async () => {
  const { createElement } = await import("react");
  return { HapticPressable: ({ children, onPress }: any) => createElement("button", { onClick: onPress }, children) };
});
vi.mock("lucide-react-native", () => ({ ChevronRight: () => null, FileText: () => null, Fuel: () => null, LogOut: () => null, MessageSquare: () => null, Moon: () => null, Palette: () => null, ShieldCheck: () => null, Sun: () => null, X: () => null }));
vi.mock("react-native", async () => {
  const { createElement } = await import("react");
  const box = ({ children, accessibilityRole }: any) => createElement("div", { role: accessibilityRole }, children);
  return { View: box, Text: box, StyleSheet: { create: (value: unknown) => value } };
});
beforeEach(() => { vi.clearAllMocks(); mocks.testerFeedbackEnabled = false; mocks.session = { email: "tester@example.com" }; mocks.signOut.mockResolvedValue(undefined); });
afterEach(cleanup);

describe("settings sign-out", () => {
  it("hides tester feedback outside the Android tester build", () => {
    render(<SettingsScreen/>);
    expect(screen.queryByText("Suggest an improvement")).toBeNull();
  });
  it("offers feedback in the Android tester build", () => {
    mocks.testerFeedbackEnabled = true;
    render(<SettingsScreen/>);
    expect(screen.getByText("Suggest an improvement")).toBeTruthy();
  });
  it("blocks repeated taps until sign-out finishes", async () => {
    let finish!: () => void;
    mocks.signOut.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
    render(<SettingsScreen/>);
    const button = screen.getByRole("button", { name: "Sign out" });
    fireEvent.click(button); fireEvent.click(button);
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(button.getAttribute("aria-busy")).toBe("true");
    finish();
    await waitFor(() => expect(button.getAttribute("aria-busy")).toBe("false"));
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("handles a failure without showing tokens or account details", async () => {
    mocks.signOut.mockRejectedValue(new Error("access_token=secret tester@example.com"));
    render(<SettingsScreen/>);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("could not confirm sign-out");
    expect(alert.textContent).not.toContain("secret");
    expect(alert.textContent).not.toContain("tester@example.com");
  });
  it("does not offer sign-out without a session", () => {
    mocks.session = null;
    render(<SettingsScreen/>);
    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeTruthy();
  });
});
