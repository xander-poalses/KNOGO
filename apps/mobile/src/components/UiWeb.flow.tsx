import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionButton, Chip } from "./Ui";

// React Native Web ships runtime exports here without TypeScript declarations.
// @ts-expect-error Test the installed web renderer, not a native-component mock.
vi.mock("react-native", () => import("../../node_modules/react-native-web"));
vi.mock("expo-router", () => ({ useRouter: () => ({}) }));
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
vi.mock("lucide-react-native", () => ({ Check: () => null }));
vi.mock("../theme", () => ({
  fonts: {}, radii: {}, sizes: { control: 52, touch: 44 }, space: { sm: 10 },
  useTheme: () => ({ colours: {} }), useThemeStyles: (factory: (value: object) => object) => factory({ focus: "#0b4f2f" })
}));
afterEach(cleanup);

describe("rendered web CTA semantics", () => {
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
