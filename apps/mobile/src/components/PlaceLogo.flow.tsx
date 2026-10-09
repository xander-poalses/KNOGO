import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlaceLogo } from "./PlaceLogo";
const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("../logoAsset", () => ({ loadJpegLogo: mocks.load }));
vi.mock("../theme", () => ({ fonts: {}, useTheme: () => ({ colours: { surface: "surface" } }), useThemeStyles: () => ({}) }));
vi.mock("expo-image", () => ({ Image: ({ accessibilityLabel, source, onError }: any) => <button aria-label={accessibilityLabel} data-source={source.uri} onClick={onError}/> }));
vi.mock("react-native", () => ({ StyleSheet: { create: (v: unknown) => v }, View: ({ children, style }: any) => <div data-background={Array.isArray(style) ? style[1]?.backgroundColor : undefined}>{children}</div>, Text: ({ children }: any) => <span>{children}</span> }));
beforeEach(() => { vi.resetAllMocks(); mocks.load.mockResolvedValue("data:image/jpeg;base64,bytes"); });
afterEach(cleanup);
describe("place logo rendering", () => {
  it("uses the supplied JPEG URL and falls back after decoding fails", async () => {
    const view = render(<PlaceLogo id="test" name="Example" uri="https://example.com/logo.jpg"/>);
    const logo = await screen.findByRole("button", { name: "Example logo" });
    expect(mocks.load).toHaveBeenCalledWith("https://example.com/logo.jpg");
    expect(logo.getAttribute("data-source")).toBe("data:image/jpeg;base64,bytes");
    fireEvent.click(logo);
    expect(screen.getByText("E")).toBeTruthy();
    expect(view.container.querySelector("[data-background]")?.getAttribute("data-background")).toBe("surface");
  });
  it("uses a surface fallback when validation rejects the image", async () => {
    mocks.load.mockRejectedValue(new Error("Must be JPEG"));
    render(<PlaceLogo id="test" name="Example" uri="https://example.com/logo.png"/>);
    await screen.findByText("E");
    expect(screen.queryByRole("button", { name: "Example logo" })).toBeNull();
  });
});
