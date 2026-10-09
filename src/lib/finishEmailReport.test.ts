import { describe, expect, it, vi } from "vitest";
import { finishEmailReport, venueCallbackPlaceId } from "@knogo/core";

const draft = { placeId: "place-1", answers: [{ type: "open_status" as const, value: "open" }], reportSource: "phone" as const, createdAt: "2026-09-30T10:00:00Z" };
const result = { reportId: "report-1", outcome: "pending" as const, acceptedSignals: [], confirmations: [] };
const harness = () => ({ url: "knogo://auth/callback#tokens", completeEmailLink: vi.fn(async () => ({})), readDraft: vi.fn(async () => draft),
  submit: vi.fn(async () => result), clearDraft: vi.fn(async () => {}), now: Date.parse("2026-09-30T11:00:00Z") });

describe("email return reporting", () => {
  it("returns a Google report login for review without submitting or clearing answers", async () => {
    const input = { ...harness(), url: "knogo://auth/callback?intent=review&placeId=place-1&code=one-time" };
    expect((await finishEmailReport(input)).kind).toBe("recheck");
    expect(input.submit).not.toHaveBeenCalled();
    expect(input.clearDraft).not.toHaveBeenCalled();
  });
  it("does not route a review callback to a different report draft", async () => {
    const input = { ...harness(), url: "knogo://auth/callback?intent=review&placeId=other&code=one-time" };
    expect((await finishEmailReport(input)).kind).toBe("account");
    expect(input.submit).not.toHaveBeenCalled();
  });
  it("does not publish a saved report when confirming account registration", async () => {
    const input = { ...harness(), url: "knogo://auth/callback?intent=account#access_token=token" };
    expect((await finishEmailReport(input)).kind).toBe("account");
    expect(input.readDraft).not.toHaveBeenCalled();
    expect(input.submit).not.toHaveBeenCalled();
    expect(input.clearDraft).not.toHaveBeenCalled();
  });
  it("returns venue sign-in to its branch without reading or submitting a report draft", async () => {
    const input = { ...harness(), url: "knogo://auth/callback?venue=place-1#access_token=token" };
    expect(await finishEmailReport(input)).toEqual({ kind: "venue", placeId: "place-1" });
    expect(input.completeEmailLink).toHaveBeenCalledOnce();
    expect(input.readDraft).not.toHaveBeenCalled();
    expect(input.submit).not.toHaveBeenCalled();
    expect(input.clearDraft).not.toHaveBeenCalled();
  });
  it("does not accept routes or URLs as venue IDs", () => {
    for (const value of ["../settings", "https://other.example", "", "/restaurants/place-1"]) {
      expect(venueCallbackPlaceId(`knogo://auth/callback?venue=${encodeURIComponent(value)}`)).toBeNull();
    }
    expect(venueCallbackPlaceId("not a url")).toBeNull();
  });
  it("returns every saved draft to review without publishing it", async () => {
    const input = harness();
    expect((await finishEmailReport(input)).kind).toBe("recheck");
    expect(input.submit).not.toHaveBeenCalled();
    expect(input.clearDraft).not.toHaveBeenCalled();
  });
  it("preserves the draft on an auth failure", async () => {
    const input = harness();
    input.completeEmailLink.mockRejectedValueOnce(new Error("Expired link"));
    await expect(finishEmailReport(input)).rejects.toThrow("Expired link");
    expect(input.submit).not.toHaveBeenCalled();
    expect(input.clearDraft).not.toHaveBeenCalled();
  });
  it.each(["knogo://auth/callback?intent=recovery&venue=place-1", "knogo://auth/callback#type=recovery&access_token=token"])("handles recovery before report and venue callbacks: %s", async url => {
    const input = { ...harness(), url };
    expect(await finishEmailReport(input)).toEqual({ kind: "recovery" });
    expect(input.readDraft).not.toHaveBeenCalled();
    expect(input.submit).not.toHaveBeenCalled();
    expect(input.clearDraft).not.toHaveBeenCalled();
  });
  it("asks for a recheck rather than publishing a draft older than four hours", async () => {
    const input = harness();
    input.now = Date.parse("2026-09-30T14:00:00Z");
    expect((await finishEmailReport(input)).kind).toBe("recheck");
    expect(input.submit).not.toHaveBeenCalled();
  });
  it("returns to the account when there is no pending report", async () => {
    const input = { ...harness(), readDraft: vi.fn(async () => null) };
    expect((await finishEmailReport(input)).kind).toBe("account");
    expect(input.submit).not.toHaveBeenCalled();
  });
});
