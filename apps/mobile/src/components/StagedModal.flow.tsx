import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StagedModal } from "./StagedModal";

const mocks = vi.hoisted(() => ({ autoShow: false, reduced: vi.fn(), timing: vi.fn(), sequence: vi.fn(), start: vi.fn(), stop: vi.fn(), set: vi.fn() }));
vi.mock("../theme", () => ({ useTheme: () => ({ colours: { overlayStrong: "#0008" } }) }));
vi.mock("react-native", async () => {
  const { createElement, useLayoutEffect } = await import("react");
  return {
    Modal: ({ visible, onShow, onRequestClose, children, animationType }: any) => {
      useLayoutEffect(() => { if (mocks.autoShow && visible) onShow({}); }, [visible]);
      return visible ? createElement("section", { role: "dialog", "data-animation": animationType }, createElement("button", { onClick: onShow }, "Show"), createElement("button", { onClick: onRequestClose }, "Back"), children) : null;
    },
    AccessibilityInfo: { isReduceMotionEnabled: mocks.reduced },
    Animated: {
      Value: class { setValue = mocks.set; interpolate() { return 0; } },
      View: ({ children }: any) => createElement("div", null, children),
      timing: mocks.timing, sequence: mocks.sequence
    },
    StyleSheet: { absoluteFill: {} }
  };
});
beforeEach(() => {
  vi.clearAllMocks(); mocks.autoShow = false; mocks.reduced.mockResolvedValue(false);
  mocks.timing.mockImplementation((_value, config) => config);
  mocks.sequence.mockReturnValue({ start: mocks.start, stop: mocks.stop });
});
afterEach(cleanup);

describe("sheet entrance", () => {
  it("runs input focus only after the sheet entrance finishes", async () => {
    const onReady = vi.fn();
    render(<StagedModal visible onReady={onReady}>Content</StagedModal>);
    fireEvent.click(screen.getByText("Show"));
    await waitFor(() => expect(mocks.start).toHaveBeenCalledOnce());
    expect(onReady).not.toHaveBeenCalled();
    act(() => mocks.start.mock.calls[0][0]({ finished: true }));
    expect(onReady).toHaveBeenCalledOnce();
  });
  it("does not focus after an interrupted entrance", async () => {
    const onReady = vi.fn();
    render(<StagedModal visible onReady={onReady}>Content</StagedModal>);
    fireEvent.click(screen.getByText("Show"));
    await waitFor(() => expect(mocks.start).toHaveBeenCalledOnce());
    act(() => mocks.start.mock.calls[0][0]({ finished: false }));
    expect(onReady).not.toHaveBeenCalled();
  });
  it("ignores an entrance completion from a closed sheet", async () => {
    const onReady = vi.fn();
    const view = render(<StagedModal visible onReady={onReady}>Content</StagedModal>);
    fireEvent.click(screen.getByText("Show"));
    await waitFor(() => expect(mocks.start).toHaveBeenCalledOnce());
    view.rerender(<StagedModal visible={false} onReady={onReady}>Content</StagedModal>);
    act(() => mocks.start.mock.calls[0][0]({ finished: true }));
    expect(onReady).not.toHaveBeenCalled();
  });
  it("runs readiness without animation when Reduce Motion is enabled", async () => {
    mocks.reduced.mockResolvedValue(true);
    const onReady = vi.fn();
    render(<StagedModal visible onReady={onReady}>Content</StagedModal>);
    fireEvent.click(screen.getByText("Show"));
    await waitFor(() => expect(onReady).toHaveBeenCalledOnce());
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it("uses the callback from the current render at completion", async () => {
    const old = vi.fn(), current = vi.fn();
    const view = render(<StagedModal visible onReady={old}>Content</StagedModal>);
    fireEvent.click(screen.getByText("Show"));
    await waitFor(() => expect(mocks.start).toHaveBeenCalledOnce());
    view.rerender(<StagedModal visible onReady={current}>Content</StagedModal>);
    act(() => mocks.start.mock.calls[0][0]({ finished: true }));
    expect(old).not.toHaveBeenCalled();
    expect(current).toHaveBeenCalledOnce();
  });
  it("starts when the modal shows before its parent's passive effect", async () => {
    mocks.autoShow = true;
    render(<StagedModal visible>Content</StagedModal>);
    await waitFor(() => expect(mocks.start).toHaveBeenCalledOnce());
  });
  it("fades the backdrop before moving the sheet and preserves show/back callbacks", async () => {
    const onShow = vi.fn(), onClose = vi.fn();
    render(<StagedModal visible onShow={onShow} onRequestClose={onClose}>Content</StagedModal>);
    expect(screen.getByRole("dialog").getAttribute("data-animation")).toBe("none");
    fireEvent.click(screen.getByText("Show"));
    await waitFor(() => expect(mocks.start).toHaveBeenCalledOnce());
    expect(mocks.sequence.mock.calls[0][0]).toEqual([
      { toValue: 1, duration: 120, useNativeDriver: true },
      { toValue: 1, duration: 220, useNativeDriver: true }
    ]);
    expect(onShow).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByText("Back")); expect(onClose).toHaveBeenCalledOnce();
  });
  it("skips motion when the OS requests it", async () => {
    mocks.reduced.mockResolvedValue(true);
    render(<StagedModal visible>Content</StagedModal>);
    fireEvent.click(screen.getByText("Show"));
    await waitFor(() => expect(mocks.set).toHaveBeenCalledWith(1));
    expect(mocks.sequence).not.toHaveBeenCalled();
  });
  it("does not start an entrance after closing during the preference lookup", async () => {
    let finish!: (value: boolean) => void;
    mocks.reduced.mockReturnValue(new Promise<boolean>(resolve => { finish = resolve; }));
    const { rerender } = render(<StagedModal visible>Content</StagedModal>);
    fireEvent.click(screen.getByText("Show"));
    rerender(<StagedModal visible={false}>Content</StagedModal>);
    finish(false); await Promise.resolve();
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it("ignores the previous opening's lookup after closing and reopening", async () => {
    let finishOld!: (value: boolean) => void;
    let finishNew!: (value: boolean) => void;
    mocks.reduced
      .mockReturnValueOnce(new Promise<boolean>(resolve => { finishOld = resolve; }))
      .mockReturnValueOnce(new Promise<boolean>(resolve => { finishNew = resolve; }));
    const { rerender } = render(<StagedModal visible>Content</StagedModal>);
    fireEvent.click(screen.getByText("Show"));
    rerender(<StagedModal visible={false}>Content</StagedModal>);
    rerender(<StagedModal visible>Content</StagedModal>);
    fireEvent.click(screen.getByText("Show"));
    await act(async () => { finishOld(false); });
    expect(mocks.start).not.toHaveBeenCalled();
    await act(async () => { finishNew(false); });
    expect(mocks.start).toHaveBeenCalledOnce();
  });
});
