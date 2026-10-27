import { cleanup, fireEvent, screen } from "@testing-library/react";
import { render } from "../testRender";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionButton, CacheNotice, SearchField } from "./Ui";

vi.mock("expo-router", () => ({ useRouter: () => ({}) }));
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
vi.mock("lucide-react-native", () => ({ X: () => null, Search: () => null, SlidersHorizontal: () => null }));
vi.mock("../theme", () => ({
  fonts: {}, radii: {}, sizes: { control: 52, touch: 44, iconButton: 44 }, space: { sm: 10 },
  useTheme: () => ({ colours: {} }), useThemeStyles: (factory: (value: object) => object) => factory({})
}));
vi.mock("react-native", async () => {
  const { createElement } = await import("react");
  const box = ({ children }: any) => createElement("div", null, children);
  return {
    Platform: { OS: "android" },
    View: box, Text: box, ScrollView: box, TextInput: box,
    ActivityIndicator: () => createElement("span", { "data-testid": "loading" }),
    StyleSheet: { create: (styles: unknown) => styles },
    Pressable: ({ children, onPress, accessibilityLabel, accessibilityState = {}, disabled, style }: any) => {
      const values = typeof style === "function" ? style({ pressed: false }) : [style];
      const merged = Object.assign({}, ...values.flat().filter(Boolean));
      return createElement("button", { onClick: onPress, disabled, "aria-label": accessibilityLabel, "aria-busy": accessibilityState.busy, "aria-selected": accessibilityState.selected, "data-height": merged.minHeight ?? merged.height, "data-width": merged.minWidth ?? merged.width }, children);
    }
  };
});
afterEach(cleanup);

describe("CTA feedback", () => {
  it("gives cached-data retry a 44px target and runs its action", async () => {
    const onRetry = vi.fn();
    render(<CacheNotice fetchedAt={null} expired={false} onRetry={onRetry}/>);
    const button = await screen.findByRole("button", { name: "Retry live data" });
    expect(button.getAttribute("data-height")).toBe("44");
    expect(button.getAttribute("data-width")).toBe("44");
    fireEvent.click(button);
    expect(onRetry).toHaveBeenCalledOnce();
  });
  it("gives the filter command a 44px target and runs its action", () => {
    const onFilter = vi.fn();
    render(<SearchField value="" onChangeText={() => {}} onFilter={onFilter}/>);
    const button = screen.getByRole("button", { name: "Open filters" });
    expect(button.getAttribute("data-height")).toBe("44");
    expect(button.getAttribute("data-width")).toBe("44");
    fireEvent.click(button);
    expect(onFilter).toHaveBeenCalledOnce();
  });
  it("announces loading and prevents a repeat action", () => {
    const onPress = vi.fn();
    render(<ActionButton label="Send report" loading onPress={onPress}/>);
    const button = screen.getByRole("button", { name: "Send report" });
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(screen.getByTestId("loading")).toBeTruthy();
    fireEvent.click(button);
    expect(onPress).not.toHaveBeenCalled();
  });
  it("preserves caller state and base touch size with custom styles", () => {
    render(<ActionButton label="Save setup" accessibilityState={{ selected: true }} style={{ marginTop: 8 }}/>);
    const button = screen.getByRole("button", { name: "Save setup" });
    expect(button.getAttribute("aria-selected")).toBe("true");
    expect(button.getAttribute("data-height")).toBe("52");
    expect(button.getAttribute("data-width")).toBe("44");
  });
  it("does not let a caller state re-enable a disabled action", () => {
    render(<ActionButton label="Send report" disabled accessibilityState={{ disabled: false }}/>);
    expect(screen.getByRole("button", { name: "Send report" }).hasAttribute("disabled")).toBe(true);
  });
});
