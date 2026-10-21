import { motionTest } from "../motionTestSetup";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccordionArrow, SaveMotion, StateMotion } from "./Motion";
import { SwipeSheet } from "./SwipeSheet";

const feedback = vi.hoisted(() => ({ tap: vi.fn(), styles: [] as any[] }));
vi.mock("../haptics", () => ({ ctaHaptic: feedback.tap }));
vi.mock("react-native", async () => {
  const { createElement } = await import("react");
  return {
    View: ({ children, style }: any) => { feedback.styles.push(style); return createElement("div", null, children); },
    useWindowDimensions: () => ({ height: 800, width: 400 }),
    AccessibilityInfo: { addEventListener: (_name: string, listener: (value: boolean) => void) => { motionTest.preference = listener; return { remove() {} }; } }
  };
});
beforeEach(() => { motionTest.reduced = false; motionTest.timings.length = 0; motionTest.springs.length = 0; motionTest.gestures.length = 0; feedback.styles.length = 0; vi.clearAllMocks(); });
afterEach(cleanup);

describe("motion", () => {
  it("uses an Android-compatible easing object when the report accordion mounts", () => {
    const view = render(<AccordionArrow open={false}>Arrow</AccordionArrow>);
    expect(feedback.styles.at(-1).transitionTimingFunction.normalize()).toEqual({ name: "cubicBezier", x1: 0.23, y1: 1, x2: 0.32, y2: 1 });
    view.rerender(<AccordionArrow open>Arrow</AccordionArrow>);
    expect(feedback.styles.at(-1).transitionTimingFunction.normalize()).toEqual({ name: "cubicBezier", x1: 0.23, y1: 1, x2: 0.32, y2: 1 });
  });
  it("does not pulse on mount, only when a place becomes saved", () => {
    const view = render(<SaveMotion saved>Heart</SaveMotion>);
    expect(motionTest.timings).toHaveLength(0);
    view.rerender(<SaveMotion saved={false}>Heart</SaveMotion>);
    expect(motionTest.timings).toHaveLength(0);
    view.rerender(<SaveMotion saved>Heart</SaveMotion>);
    expect(motionTest.timings.map(item => item.value)).toEqual([1.15, 1]);
  });
  it("does not replay unchanged status and respects reduced motion", () => {
    const view = render(<StateMotion value="Open">Open</StateMotion>);
    view.rerender(<StateMotion value="Open">Open 1 min ago</StateMotion>);
    expect(motionTest.timings).toHaveLength(0);
    act(() => motionTest.preference?.(true));
    view.rerender(<StateMotion value="Closed">Closed</StateMotion>);
    expect(motionTest.timings).toHaveLength(0);
  });
  it("reverses report-step motion without remounting its inputs", () => {
    const view = render(<StateMotion value={0} step><input defaultValue="Draft"/></StateMotion>);
    const input = view.container.querySelector("input");
    view.rerender(<StateMotion value={1} step><input defaultValue="Draft"/></StateMotion>);
    view.rerender(<StateMotion value={0} step><input defaultValue="Draft"/></StateMotion>);
    expect(view.container.querySelector("input")).toBe(input);
    expect(motionTest.timings).toHaveLength(4);
  });
});

describe("sheet gesture", () => {
  it("snaps back a cancelled drag without closing or buzzing", () => {
    const close = vi.fn();
    render(<SwipeSheet visible onClose={close} header="Header">Content</SwipeSheet>);
    const gesture = motionTest.gestures.at(-1);
    act(() => { gesture.onStart(); gesture.onUpdate({ translationY: 80 }); gesture.onFinalize({}, false); });
    expect(motionTest.springs.at(-1).value).toBe(0);
    expect(close).not.toHaveBeenCalled(); expect(feedback.tap).not.toHaveBeenCalled();
  });
  it("closes once after a committed swipe and ignores duplicate completions", () => {
    const close = vi.fn();
    render(<SwipeSheet visible onClose={close} header="Header">Content</SwipeSheet>);
    const gesture = motionTest.gestures.at(-1);
    act(() => { gesture.onStart(); gesture.onUpdate({ translationY: 150 }); gesture.onEnd({ velocityY: 300 }); gesture.onEnd({ velocityY: 300 }); });
    expect(feedback.tap).toHaveBeenCalledOnce(); expect(close).not.toHaveBeenCalled();
    act(() => { motionTest.springs.at(-1).complete(true); motionTest.springs.at(-1).complete(true); });
    expect(close).toHaveBeenCalledOnce();
  });
  it("does not close a reopened sheet from an old animation", () => {
    const close = vi.fn();
    const view = render(<SwipeSheet visible onClose={close} header="Header">Content</SwipeSheet>);
    const gesture = motionTest.gestures.at(-1);
    act(() => { gesture.onStart(); gesture.onUpdate({ translationY: 150 }); gesture.onEnd({ velocityY: 300 }); });
    const complete = motionTest.springs.at(-1).complete;
    view.rerender(<SwipeSheet visible={false} onClose={close} header="Header">Content</SwipeSheet>);
    view.rerender(<SwipeSheet visible onClose={close} header="Header">Content</SwipeSheet>);
    act(() => complete(true));
    expect(close).not.toHaveBeenCalled();
  });
  it("dismisses without a spring when reduced motion is on", () => {
    motionTest.reduced = true;
    const close = vi.fn();
    render(<SwipeSheet visible onClose={close} header="Header">Content</SwipeSheet>);
    const gesture = motionTest.gestures.at(-1);
    act(() => { gesture.onStart(); gesture.onUpdate({ translationY: 150 }); gesture.onEnd({ velocityY: 300 }); });
    expect(close).toHaveBeenCalledOnce(); expect(motionTest.springs).toHaveLength(0);
  });
});
