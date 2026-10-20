import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlaceLogo } from "./PlaceLogo";

const mocks = vi.hoisted(() => ({ load: vi.fn(), image: vi.fn(() => null) }));
vi.mock("../logoAsset", () => ({ loadJpegLogo: mocks.load }));
vi.mock("expo-image", () => ({ Image: mocks.image }));
vi.mock("lucide-react-native", () => ({ MapPin: () => <span data-testid="place-icon"/> }));
vi.mock("../theme", () => ({ fonts: {}, useTheme: () => ({colours:{}}), useThemeStyles: () => ({}) }));
vi.mock("react-native", () => ({ StyleSheet: { create: (v: unknown) => v }, View: ({ children }: any) => <div>{children}</div>, Text: ({ children }: any) => <span>{children}</span> }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("place initials", () => {
  it.each(["\ud83c\udf7d\ufe0f The Kitchen", "\ud83d\udc69\ud83c\udffd\u200d\ud83d\udcbb Cafe", " "])("uses an icon when the name has no letter initial (%s)", name => {
    render(<PlaceLogo name={name}/>);
    expect(screen.getByTestId("place-icon")).toBeTruthy();
    expect(document.body.textContent).not.toContain("\ufffd");
  });
  it("keeps the accent attached to a decomposed initial", () => {
    render(<PlaceLogo name={"E\u0301lan"}/>);
    expect(screen.getByText("E\u0301")).toBeTruthy();
  });
  it.each(["Cappuccinos", "Example", "  example"])("uses an initial without loading a venue logo (%s)", name => {
    const legacyData = { name, uri: "https://example.com/logo.jpg" };
    render(<PlaceLogo {...legacyData} />);
    expect(screen.getByText(name.trim()[0].toUpperCase())).toBeTruthy();
    expect(mocks.load).not.toHaveBeenCalled();
    expect(mocks.image).not.toHaveBeenCalled();
  });
});
