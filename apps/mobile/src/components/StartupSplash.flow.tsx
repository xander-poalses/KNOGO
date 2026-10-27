import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { motionTest } from "../motionTestSetup";
import { StartupSplash } from "./StartupSplash";

const mocks = vi.hoisted(() => ({
  places: { storageReady: false, authLoading: true, loading: true },
  dimensions: { width: 440, height: 956 },
  bottom: 0,
  timings: [] as any[]
}));
vi.mock("../state/PlacesContext", () => ({ usePlaces: () => mocks.places }));
vi.mock("expo-status-bar", () => ({ StatusBar: () => null }));
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ bottom: mocks.bottom }) }));
vi.mock("expo-image", () => ({ Image: ({ accessibilityLabel, onLoadEnd, style }: any) => <img aria-label={accessibilityLabel} onLoad={onLoadEnd} onError={onLoadEnd} style={style} /> }));
vi.mock("react-native", () => {
  const View = ({ children, style, accessibilityRole, accessibilityValue, accessibilityLabel, testID }: any) => <div data-testid={testID} style={Array.isArray(style) ? Object.assign({}, ...style) : style} role={accessibilityRole} aria-label={accessibilityLabel} aria-valuenow={accessibilityValue?.now}>{children}</div>;
  return {
    View,
    useWindowDimensions: () => mocks.dimensions,
    StyleSheet: { create: (styles: unknown) => styles, absoluteFill: {} },
    Easing: { out: (fn: unknown) => fn, quad: (n: number) => n },
    Animated: {
      View,
      Value: class { value: number; constructor(value: number) { this.value = value; } interpolate() { return `${this.value * 100}%`; } },
      timing: (value: any, options: any) => ({ start: (callback: any) => { value.value = options.toValue; mocks.timings.push(options); callback?.({ finished: true }); }, stop: () => undefined })
    }
  };
});

beforeEach(() => {
  motionTest.reduced = false;
  mocks.places = { storageReady: false, authLoading: true, loading: true };
  mocks.dimensions = { width: 440, height: 956 };
  mocks.bottom = 0;
  mocks.timings = [];
});
afterEach(cleanup);
const loadedImages = () => screen.getAllByRole("img").forEach(image => fireEvent.load(image));
const layout = () => undefined;

describe("startup splash", () => {
  it("does not advance without completed startup work", () => {
    const finish = vi.fn();
    const { rerender } = render(<StartupSplash fontsReady={false} onFinish={finish} onLayout={layout} />);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("0");
    rerender(<StartupSplash fontsReady={false} onFinish={finish} onLayout={layout} />);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("0");
    expect(finish).not.toHaveBeenCalled();
  });
  it("advances for completed work and waits for fonts and places", () => {
    mocks.places.storageReady = true;
    mocks.places.authLoading = false;
    const finish = vi.fn();
    const { rerender } = render(<StartupSplash fontsReady={false} onFinish={finish} onLayout={layout} />);
    loadedImages();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("67");
    expect(finish).not.toHaveBeenCalled();
    mocks.places.loading = false;
    rerender(<StartupSplash fontsReady onFinish={finish} onLayout={layout} />);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("100");
    expect(finish).toHaveBeenCalledOnce();
  });
  it("can finish after handled data and image errors", () => {
    mocks.places = { storageReady: true, authLoading: false, loading: false };
    const finish = vi.fn();
    render(<StartupSplash fontsReady onFinish={finish} onLayout={layout} />);
    screen.getAllByRole("img").forEach(image => fireEvent.error(image));
    expect(finish).toHaveBeenCalledOnce();
  });
  it.each([[320, 568], [440, 956], [768, 1024], [1024, 600]])("centres a 10%% mascot on %sx%s", (width, height) => {
    mocks.dimensions = { width, height };
    mocks.bottom = 34;
    render(<StartupSplash fontsReady={false} onFinish={vi.fn()} onLayout={layout} />);
    const mascot = screen.getByLabelText("KNOGO") as HTMLImageElement;
    expect(parseFloat(mascot.style.width)).toBeCloseTo(width * 0.1);
    expect(parseFloat(mascot.style.left) + parseFloat(mascot.style.width) / 2).toBeCloseTo(width / 2);
    expect(parseFloat(mascot.style.top) + parseFloat(mascot.style.height) / 2).toBeCloseTo(height / 2);
    const bar = screen.getByRole("progressbar");
    expect(parseFloat(bar.style.bottom)).toBe(Math.max(58, Math.min(100, height * 0.16)));
  });
  it("keeps the progress truthful without animation for reduced motion", () => {
    motionTest.reduced = true;
    const finish = vi.fn();
    render(<StartupSplash fontsReady={false} onFinish={finish} onLayout={layout} />);
    expect(mocks.timings.every(timing => timing.duration === 0)).toBe(true);
    expect(finish).not.toHaveBeenCalled();
  });
});
