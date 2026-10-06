import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getCurrentStatus, mockPlaces, resolveTrust } from "@knogo/core";
import { useStatusClock } from "./useStatusClock";

afterEach(() => { cleanup(); vi.useRealTimers(); });
function places() {
  return [{ ...mockPlaces[0], currentStatus: { ...mockPlaces[0].currentStatus, trust: resolveTrust([{
    id: "report", actorId: "report", type: "open_status", value: "open", source: "community", checkedBy: "phone",
    reportedAt: "2026-10-04T12:00:00Z", expiresAt: "2026-10-04T13:00:05Z"
  }], Date.now()) } }];
}
describe("website report expiry clock", () => {
  it("updates at the evidence boundary without fetching or changing saved facts", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-04T13:00:00Z"));
    const data = places();
    const { result, unmount } = renderHook(() => useStatusClock(data));
    expect(getCurrentStatus(data[0].currentStatus, result.current).isOpen).toBe(true);
    act(() => vi.advanceTimersByTime(5000));
    expect(getCurrentStatus(data[0].currentStatus, result.current).isOpen).toBeNull();
    expect(data[0].currentStatus.trust.claims.open_status?.state).toBe("community_indication");
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("updates on window focus when a suspended tab missed expiry", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-04T13:00:00Z"));
    const data = places();
    const { result } = renderHook(() => useStatusClock(data));
    vi.setSystemTime(new Date("2026-10-04T14:00:00Z"));
    act(() => window.dispatchEvent(new Event("focus")));
    expect(getCurrentStatus(data[0].currentStatus, result.current).isOpen).toBeNull();
  });
});
