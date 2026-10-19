import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlaceLogo } from "./PlaceLogo";

const mocks = vi.hoisted(() => ({ load: vi.fn(), image: vi.fn(() => null) }));
vi.mock("../logoAsset", () => ({ loadJpegLogo: mocks.load }));
vi.mock("expo-image", () => ({ Image: mocks.image }));
vi.mock("../theme", () => ({ fonts: {}, useThemeStyles: () => ({}) }));
vi.mock("react-native", () => ({ StyleSheet: { create: (v: unknown) => v }, View: ({ children }: any) => <div>{children}</div>, Text: ({ children }: any) => <span>{children}</span> }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("place initials", () => {
  it.each(["Cappuccinos", "Example", "  example"])("uses an initial without loading a venue logo (%s)", name => {
    const legacyData = { name, uri: "https://example.com/logo.jpg" };
    render(<PlaceLogo {...legacyData} />);
    expect(screen.getByText(name.trim()[0].toUpperCase())).toBeTruthy();
    expect(mocks.load).not.toHaveBeenCalled();
    expect(mocks.image).not.toHaveBeenCalled();
  });
});
