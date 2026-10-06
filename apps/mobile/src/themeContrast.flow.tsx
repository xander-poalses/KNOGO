import { describe, expect, it, vi } from "vitest";
import { darkColours, lightColours } from "./theme";

vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));
vi.mock("react-native", () => ({ useColorScheme: () => null }));

function rgb(hex: string) {
  return [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
}
function luminance(channels: number[]) {
  const linear = channels.map(channel => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}
function ratio(foreground: number[], background: number[]) {
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
function over(foreground: number[], background: number[], opacity: number) {
  return foreground.map((value, index) => value * opacity + background[index] * (1 - opacity));
}

for (const [mode, colours] of Object.entries({ light: lightColours, dark: darkColours })) {
  describe(`${mode} WCAG AA surface tokens`, () => {
    const surfaces = ["background", "surface", "elevated", "statusSurface", "tripSurface", "sheetSurface", "control", "controlStrong", "primarySoft"] as const;
    for (const surface of surfaces) {
      for (const ink of ["text", "muted", "primary", "success", "warning", "closed"] as const) {
        it(`${ink} on ${surface} keeps 4.5:1, including press feedback`, () => {
          const background = rgb(colours[surface]);
          expect(ratio(rgb(colours[ink]), background)).toBeGreaterThanOrEqual(4.5);
          expect(ratio(over(rgb(colours[ink]), background, 0.92), background)).toBeGreaterThanOrEqual(4.5);
        });
      }
      it(`control boundary and focus on ${surface} keep 3:1`, () => {
        for (const ink of ["controlBorder", "focus"] as const) {
          expect(ratio(rgb(colours[ink]), rgb(colours[surface]))).toBeGreaterThanOrEqual(3);
        }
      });
    }
    for (const fill of ["text", "primary"] as const) {
      it(`button text and check icons on ${fill} keep contrast when pressed`, () => {
        for (const surface of surfaces) {
          const backdrop = rgb(colours[surface]);
          const foreground = over(rgb(colours.background), backdrop, 0.92);
          const background = over(rgb(colours[fill]), backdrop, 0.92);
          expect(ratio(foreground, background)).toBeGreaterThanOrEqual(4.5);
        }
      });
    }
  });
}
