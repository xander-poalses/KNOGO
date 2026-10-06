import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HapticPressable } from "./HapticPressable";
import { Text } from "react-native";

const feedback = vi.hoisted(() => vi.fn());
vi.mock("../haptics", () => ({ ctaHaptic: feedback }));
// @ts-expect-error The installed web renderer does not ship declarations here.
vi.mock("react-native", () => import("../../node_modules/react-native-web"));
beforeEach(() => feedback.mockClear());
afterEach(cleanup);

describe("CTA touch feedback", () => {
  it("pulses once before running the action", () => {
    const action = vi.fn(() => expect(feedback).toHaveBeenCalledOnce());
    render(<HapticPressable accessibilityRole="button" onPress={action}><Text>Search</Text></HapticPressable>);
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(action).toHaveBeenCalledOnce();
    expect(feedback).toHaveBeenCalledOnce();
  });
  it.each([{ disabled: true }, { accessibilityState: { busy: true } }, { "aria-disabled": true }])("keeps unavailable controls silent: %j", props => {
    const action = vi.fn();
    render(<HapticPressable {...props} accessibilityRole="button" onPress={action}><Text>Submit</Text></HapticPressable>);
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(action).not.toHaveBeenCalled();
    expect(feedback).not.toHaveBeenCalled();
  });
  it("keeps sheet backdrops silent", () => {
    const action = vi.fn();
    render(<HapticPressable accessible={false} testID="backdrop" onPress={action}/>);
    fireEvent.click(screen.getByTestId("backdrop"));
    expect(action).toHaveBeenCalledOnce();
    expect(feedback).not.toHaveBeenCalled();
  });
  it("preserves nested save propagation without a second pulse", () => {
    const open = vi.fn(), save = vi.fn();
    render(<HapticPressable onPress={open}>
      <HapticPressable accessibilityRole="button" onPress={event => { event.stopPropagation(); save(); }}><Text>Save</Text></HapticPressable>
    </HapticPressable>);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(save).toHaveBeenCalledOnce();
    expect(open).not.toHaveBeenCalled();
    expect(feedback).toHaveBeenCalledOnce();
  });
});
