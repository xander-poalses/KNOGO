import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionButton, Chip } from "./Ui";
import { ConfirmScreen } from "../screens/ConfirmScreen";
import { PlaceSheet } from "./PlaceSheet";
import { FilterSheet } from "./FilterSheet";
import { defaultFilters } from "@knogo/core";
import { Text } from "react-native";

const route = vi.hoisted(() => ({ outcome: undefined as "pending" | undefined }));

// React Native Web ships runtime exports here without TypeScript declarations.
// @ts-expect-error Test the installed web renderer, not a native-component mock.
vi.mock("react-native", () => import("../../node_modules/react-native-web"));
vi.mock("expo-router", () => ({ useRouter: () => ({}), useLocalSearchParams: () => ({ placeId: "progress-test", outcome: route.outcome }) }));
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
vi.mock("lucide-react-native", async () => {
  const { createElement } = await import("react");
  return { CircleAlert: (props: Record<string, unknown>) => createElement("svg", props), Check: () => null, ArrowLeft: () => null, ChevronRight: () => null, ChevronDown: () => null, ChevronUp: () => null, X: () => null, Search: () => null };
});
vi.mock("../state/PlacesContext", async () => {
  const { mockPlaces } = await import("@knogo/core");
  return { usePlaces: () => ({ places: [{ ...mockPlaces[0], id: "progress-test" }], loading: false, authLoading: false, hasSupabaseConfig: false, session: null }) };
});
vi.mock("../storage", () => ({ mobileStorage: { readPendingReport: async () => null } }));
vi.mock("../telemetry", () => ({ captureEvent: vi.fn(), captureError: vi.fn() }));
vi.mock("./AccountForm", () => ({ AccountForm: () => null }));
vi.mock("./ReportAssessmentReceipt", () => ({ ReportAssessmentReceipt: () => null }));
vi.mock("./FeedbackToast", () => ({ FeedbackToast: () => null }));
vi.mock("../theme", () => ({
  fonts: {}, radii: {}, shadows: {}, sizes: { control: 52, touch: 44 }, space: { xs: 4, sm: 10, md: 16, lg: 24 },
  useTheme: () => ({ colours: {} }), useThemeStyles: (factory: (value: object) => object) => factory({ focus: "#0b4f2f" })
}));
afterEach(() => { cleanup(); route.outcome = undefined; vi.restoreAllMocks(); });

describe("rendered web CTA semantics", () => {
  it("keeps the report result back button at the top of the page", () => {
    route.outcome = "pending";
    render(<ConfirmScreen />);
    const back = screen.getAllByRole("button", { name: "Back to place" })[0];
    expect(getComputedStyle(back.parentElement!).justifyContent).toBe("flex-start");
  });
  it("hides the toast icon without sending native props to SVG", async () => {
    const { FeedbackToast } = await vi.importActual<typeof import("./FeedbackToast")>("./FeedbackToast");
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const view = render(<FeedbackToast message="Try again" onDismiss={() => {}} />);
    expect(view.container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(errors.mock.calls.flat().join(" ")).not.toContain("accessibilityElementsHidden");
  });
  it("names place dialogs from the current sheet title", async () => {
    const view = render(<PlaceSheet visible title="Status & checks" onClose={() => {}}><Text>Checks</Text></PlaceSheet>);
    expect(await screen.findByRole("dialog", { name: "Status & checks" })).toBeTruthy();
    view.rerender(<PlaceSheet visible title="Plan your trip" onClose={() => {}}><Text>Trip</Text></PlaceSheet>);
    expect(await screen.findByRole("dialog", { name: "Plan your trip" })).toBeTruthy();
  });
  it.each([
    [false, false, "Filters"],
    [true, false, "Choose areas"],
    [false, true, "Choose cuisines"]
  ] as const)("names discovery dialogs for their selection mode", async (areasOnly, cuisinesOnly, name) => {
    render(<FilterSheet visible filters={defaultFilters} areas={[]} cuisines={[]} areasOnly={areasOnly} cuisinesOnly={cuisinesOnly} onChange={() => {}} onClose={() => {}}/>);
    expect(await screen.findByRole("dialog", { name })).toBeTruthy();
  });
  it("exposes the report progress value and updates it after a step", async () => {
    render(<ConfirmScreen/>);
    const progress = await screen.findByRole("progressbar", { name: "Report progress" });
    expect(progress.getAttribute("aria-valuemin")).toBe("1");
    expect(progress.getAttribute("aria-valuemax")).toBe("5");
    expect(progress.getAttribute("aria-valuenow")).toBe("1");
    expect(progress.getAttribute("aria-valuetext")).toBe("Step 1 of 5");
    fireEvent.click(screen.getByRole("radio", { name: "By phone" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(progress.getAttribute("aria-valuenow")).toBe("2");
    expect(progress.getAttribute("aria-valuetext")).toBe("Step 2 of 5");
  });
  it("shows focus without changing the target size and preserves caller events", () => {
    const onFocus = vi.fn(), onBlur = vi.fn();
    render(<ActionButton label="Estimate my trip" onFocus={onFocus} onBlur={onBlur}/>);
    const button = screen.getByRole("button", { name: "Estimate my trip" });
    const before = getComputedStyle(button).minHeight;
    fireEvent.focus(button);
    expect(getComputedStyle(button).outlineWidth).toBe("2px");
    expect(getComputedStyle(button).minHeight).toBe(before);
    expect(onFocus).toHaveBeenCalledOnce();
    fireEvent.blur(button);
    expect(getComputedStyle(button).outlineWidth).not.toBe("2px");
    expect(onBlur).toHaveBeenCalledOnce();
  });
  it("keeps hover feedback and caller events without changing the label", () => {
    const onHoverIn = vi.fn(), onHoverOut = vi.fn();
    render(<ActionButton label="Submit check" onHoverIn={onHoverIn} onHoverOut={onHoverOut}/>);
    const button = screen.getByRole("button", { name: "Submit check" });
    fireEvent.mouseEnter(button);
    expect(onHoverIn).toHaveBeenCalledOnce();
    expect(getComputedStyle(button).opacity).toBe("0.92");
    fireEvent.mouseLeave(button);
    expect(onHoverOut).toHaveBeenCalledOnce();
  });
  it("exposes busy and disabled states through React Native Web", () => {
    const onPress = vi.fn();
    render(<ActionButton label="Send report" loading onPress={onPress}/>);
    const button = screen.getByRole("button", { name: "Send report" });
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(button);
    expect(onPress).not.toHaveBeenCalled();
  });
  it("exposes chip selection without relying on colour", () => {
    const { rerender } = render(<Chip label="Inland" selected onPress={() => {}}/>);
    expect(screen.getByRole("checkbox", { name: "Inland", checked: true })).toBeTruthy();
    rerender(<Chip label="Inland" selected={false} onPress={() => {}}/>);
    expect(screen.getByRole("checkbox", { name: "Inland", checked: false })).toBeTruthy();
  });
  it("keeps selection targets at 44 pixels and shows keyboard focus", () => {
    render(<Chip label="Brooklyn" onPress={() => {}}/>);
    const control = screen.getByRole("checkbox", { name: "Brooklyn" });
    expect(getComputedStyle(control).minHeight).toBe("44px");
    fireEvent.focus(control);
    expect(getComputedStyle(control).outlineWidth).toBe("2px");
  });
  it("announces single-choice state and prevents disabled changes", () => {
    const onPress = vi.fn();
    render(<Chip label="Petrol 95" role="radio" selected disabled onPress={onPress}/>);
    const control = screen.getByRole("radio", { name: "Petrol 95", checked: true });
    expect(control.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(control);
    expect(onPress).not.toHaveBeenCalled();
  });
  it("supports Space without scrolling the page", () => {
    const onPress = vi.fn();
    render(<Chip label="Brooklyn" onPress={onPress}/>);
    fireEvent.keyDown(screen.getByRole("checkbox", { name: "Brooklyn" }), { key: " " });
    expect(onPress).toHaveBeenCalledOnce();
  });
});
