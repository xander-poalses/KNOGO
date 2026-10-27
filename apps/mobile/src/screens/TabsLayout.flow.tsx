import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "../testRender";
import TabsLayout from "../../app/(tabs)/_layout";

const mocks = vi.hoisted(() => ({ emit: vi.fn(() => ({ defaultPrevented: false })), navigate: vi.fn(), replace: vi.fn() }));
vi.mock("expo-router", () => {
  const Tabs = Object.assign(({ tabBar }: any) => tabBar({
    state: { index: 0, routes: [{ key: "home", name: "index" }, { key: "explore", name: "restaurants" }, { key: "saved", name: "saved" }] },
    descriptors: { home: { options: { title: "Home" } }, explore: { options: { title: "Explore" } }, saved: { options: { title: "Saved" } } },
    emitter: { emit: mocks.emit }, navigateToTab: mocks.navigate
  }), { Screen: () => null });
  return { Tabs, useRouter: () => ({ replace: mocks.replace }) };
});
vi.mock("../components/HapticPressable", async () => {
  const { createElement } = await import("react");
  return { HapticPressable: ({ children, onPress }: any) => createElement("button", { onClick: onPress }, children) };
});
vi.mock("../components/AppChrome", () => ({ BrandHeader: () => null }));
vi.mock("lucide-react-native", () => ({ Compass: () => null, Home: () => null, Settings: () => null, Heart: () => null }));
vi.mock("../theme", () => ({ radii: {}, fonts: {}, shadows: {}, useTheme: () => ({ colours: {} }), useThemeStyles: (fn: Function) => fn({}) }));
vi.mock("react-native", async () => {
  const { createElement } = await import("react");
  const Box = ({ children }: any) => createElement("div", null, children);
  return { View: Box, Text: Box, useWindowDimensions: () => ({ width: 400 }), StyleSheet: { create: (value: unknown) => value } };
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("SDK 58 tab navigation", () => {
  it("uses the tab route key and preserves Explore reset", () => {
    render(<TabsLayout/>);
    fireEvent.click(screen.getByRole("button", { name: "Saved" }));
    expect(mocks.emit).toHaveBeenCalledWith({ type: "tabPress", target: "saved", canPreventDefault: true });
    expect(mocks.navigate).toHaveBeenCalledWith("saved");
    fireEvent.click(screen.getByRole("button", { name: "Explore" }));
    expect(mocks.replace).toHaveBeenCalledWith("/restaurants");
  });
  it("honours prevented tab presses", () => {
    mocks.emit.mockReturnValueOnce({ defaultPrevented: true });
    render(<TabsLayout/>);
    fireEvent.click(screen.getByRole("button", { name: "Saved" }));
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
