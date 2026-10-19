import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlaceImage } from "./PlaceImage";

const mocks = vi.hoisted(() => ({ image: vi.fn() }));
vi.mock("expo-image", () => ({ Image: (props: any) => {
  mocks.image(props);
  return <img alt={props.accessibilityLabel} src={props.source.uri} onError={props.onError} onLoad={props.onLoad}/>;
} }));
vi.mock("../theme", () => ({ fonts: {}, useTheme: () => ({ colours: { tileTones: ["#fff"] } }), useThemeStyles: (factory: (colours: any) => object) => factory({}) }));
vi.mock("react-native", () => ({
  StyleSheet: { create: (styles: unknown) => styles, absoluteFill: {} },
  View: ({ children }: any) => <div>{children}</div>, Text: ({ children }: any) => <span>{children}</span>
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("place photos", () => {
  it("keeps the current initial when there is no photo", () => {
    render(<PlaceImage id="hot-spot" name="  hot spot"/>);
    expect(screen.getByText("H")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });
  it("loads a photo without retaining an app disk cache", () => {
    render(<PlaceImage id="hot-spot" name="Hot Spot" uri="https://example.com/store.jpg"/>);
    expect(screen.getByRole("img", { name: "Hot Spot photo" }).getAttribute("src")).toBe("https://example.com/store.jpg");
    expect(mocks.image.mock.lastCall?.[0].cachePolicy).toBe("none");
  });
  it("uses the initial after an offline or broken-image request", () => {
    render(<PlaceImage id="hot-spot" name="Hot Spot" uri="https://example.com/store.jpg"/>);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("H")).toBeTruthy();
  });
  it("tries a changed URL and ignores a late error from the previous photo", () => {
    const view = render(<PlaceImage id="hot-spot" name="Hot Spot" uri="https://example.com/old.jpg"/>);
    const oldError = mocks.image.mock.lastCall?.[0].onError;
    view.rerender(<PlaceImage id="hot-spot" name="Hot Spot" uri="https://example.com/new.jpg"/>);
    act(() => oldError());
    expect(screen.getByRole("img").getAttribute("src")).toBe("https://example.com/new.jpg");
  });
});
