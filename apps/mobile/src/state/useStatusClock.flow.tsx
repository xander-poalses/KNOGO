import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getCurrentStatus, mockPlaces, type Place } from "@knogo/core";
import { useStatusClock } from "./useStatusClock";

const appState = vi.hoisted(() => ({ listener: null as null | ((state: string) => void), remove: vi.fn() }));
vi.mock("react-native", () => ({ AppState: { addEventListener: (_: string, listener: (state: string) => void) => {
  appState.listener = listener;
  return { remove: appState.remove };
} } }));
afterEach(() => { cleanup(); vi.useRealTimers(); appState.listener = null; vi.clearAllMocks(); });

function placesWithExpiry(expiry: string): Place[] {
  return [{ ...mockPlaces[0], currentStatus: { ...mockPlaces[0].currentStatus, trust: { version: 1, claims: {
    open_status: { state: "community_indication", value: "open", reportedAt: "2026-10-04T10:00:00Z", expiresAt: expiry, evidence: [{
      id: "report", actorId: "report", type: "open_status", value: "open", source: "community", checkedBy: "phone", reportedAt: "2026-10-04T10:00:00Z", expiresAt: expiry
    }], rule: "test" }
  } } } }];
}

describe("report expiry clock", () => {
  it("expires a displayed answer at its boundary without a fetch", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-04T11:00:00Z"));
    const places = placesWithExpiry("2026-10-04T11:00:05Z");
    const { result } = renderHook(() => useStatusClock(places));
    expect(getCurrentStatus(places[0].currentStatus, result.current).isOpen).toBe(true);
    act(() => vi.advanceTimersByTime(4999));
    expect(getCurrentStatus(places[0].currentStatus, result.current).isOpen).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(getCurrentStatus(places[0].currentStatus, result.current).isOpen).toBeNull();
  });
  it("checks the time on foreground return even when background timers did not run", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-04T11:00:00Z"));
    const places = placesWithExpiry("2026-10-04T11:20:00Z");
    const { result } = renderHook(() => useStatusClock(places));
    vi.setSystemTime(new Date("2026-10-04T12:00:00Z"));
    act(() => appState.listener?.("active"));
    expect(getCurrentStatus(places[0].currentStatus, result.current).isOpen).toBeNull();
  });
  it("reschedules for replacement data and cleans up on unmount", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-04T11:00:00Z"));
    const { result, rerender, unmount } = renderHook(({ places }) => useStatusClock(places), { initialProps: { places: placesWithExpiry("2026-10-04T11:30:00Z") } });
    rerender({ places: placesWithExpiry("2026-10-04T11:00:02Z") });
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.toISOString()).toBe("2026-10-04T11:00:02.000Z");
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(appState.remove).toHaveBeenCalled();
  });
});
