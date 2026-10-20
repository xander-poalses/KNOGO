import { describe, expect, it, vi } from "vitest";
import { radii } from "./theme";

vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));
vi.mock("react-native", () => ({ useColorScheme: () => null }));

describe("corner geometry", () => {
  it("uses one standalone radius for cards, fields and buttons", () => {
    expect(radii.surface).toBe(radii.control);
    expect(radii.tile).toBe(radii.control);
    expect(radii.inset).toBe(radii.control);
  });
  it("subtracts the inset for nested containers", () => {
    expect(radii.sheet - 14).toBe(radii.control);
    expect(radii.inset - 15).toBe(radii.check);
    expect(radii.surface - 16).toBe(radii.content);
    expect(radii.control - 4).toBe(radii.segment);
    expect(radii.nav - 5).toBe(radii.navItem);
  });
});
