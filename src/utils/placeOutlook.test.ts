import { describe, expect, it } from "vitest";
import { getPlaceOutlook, mockPlaces, type TrustClaim } from "@knogo/core";

const now = new Date("2026-10-02T10:00:00Z");
const hours = ["Thursday", "Friday"].map(day => ({ day, openTime: "09:00", closeTime: "22:00", isClosed: false }));
const place = { ...mockPlaces[0], openingHours: hours, kitchenHours: undefined, currentStatus: { ...mockPlaces[0].currentStatus, trust: undefined, source: "unknown" as const } };
const claim = (state: TrustClaim["state"], value: string | null, expiresAt = "2026-10-02T12:00:00Z"): TrustClaim => ({
  state, value, expiresAt: state === "unknown" ? null : expiresAt, reportedAt: state === "unknown" ? null : "2026-10-02T09:00:00Z", rule: "test",
  evidence: (state === "disagree" ? ["open", "closed"] : state === "unknown" ? [] : [value!]).map((answer, index) => ({
    id: `report-${index}`, actorId: `report-${index}`, type: "open_status", value: answer, source: "community", checkedBy: "phone",
    reportedAt: "2026-10-02T09:00:00Z", expiresAt
  }))
});
describe("place expectations", () => {
  it("shows a schedule expectation without changing live data", () => {
    expect(getPlaceOutlook(place, now).trading).toMatchObject({ label: "Expected open", basis: "schedule" });
    expect(getPlaceOutlook(place, now).kitchen.detail).toContain("Kitchen hours are not published");
    expect(place.kitchenHours).toBeUndefined();
  });
  it("respects a report that passes the trust rules over the schedule", () => {
    const reported = { ...place, currentStatus: { ...place.currentStatus, trust: { version: 1 as const, claims: { open_status: claim("likely_negative", "closed") } } } };
    expect(getPlaceOutlook(reported, now).trading).toMatchObject({ label: "Likely closed", basis: "report", positive: false });
  });
  it("does not turn a conflict into a schedule claim", () => {
    const reported = { ...place, currentStatus: { ...place.currentStatus, trust: { version: 1 as const, claims: { open_status: claim("disagree", null) } } } };
    expect(getPlaceOutlook(reported, now).trading.basis).toBe("conflict");
  });
  it("falls back to the schedule after a report expires", () => {
    const reported = { ...place, currentStatus: { ...place.currentStatus, trust: { version: 1 as const, claims: { open_status: claim("likely_negative", "closed", "2026-10-02T09:30:00Z") } } } };
    expect(getPlaceOutlook(reported, now).trading.label).toBe("Expected open");
  });
  it("does not present a rejected negative report as a closure", () => {
    const reported = { ...place, currentStatus: { ...place.currentStatus, trust: { version: 1 as const, claims: { open_status: { ...claim("unknown", null), rule: "negative_evidence_needs_review" } } } } };
    expect(getPlaceOutlook(reported, now).trading.label).toBe("Expected open");
  });
  it("uses kitchen hours when published and does not guess missing hours", () => {
    expect(getPlaceOutlook({ ...place, kitchenHours: hours.map(h => ({ ...h, openTime: "17:00" })) }, now).kitchen.positive).toBe(false);
    expect(getPlaceOutlook({ ...place, openingHours: [] }, now).trading.basis).toBe("unlisted");
  });
  it("keeps overnight expectations in South African time", () => {
    expect(getPlaceOutlook({ ...place, openingHours: [{ day: "Thursday", openTime: "18:00", closeTime: "02:00", isClosed: false }] }, new Date("2026-10-01T22:30:00Z")).trading.label).toBe("Expected open");
  });
});
