import { describe, expect, it } from "vitest";
import { getPlaceOutlook, mockPlaces, type TrustClaim } from "@knogo/core";
import { getCheckPresentation, getOutlookTone } from "./statusPresentation";

describe("status colour meaning", () => {
  it("does not give legacy answers a working or problem colour", () => {
    const status = { ...mockPlaces[0].currentStatus, isOpen: true, cardMachineWorking: false };
    expect(getCheckPresentation(status)).toMatchObject({ label: "No recent check", tone: "neutral", reportedOpen: false });
    expect(getCheckPresentation(status, "card_machine")).toMatchObject({ label: "No recent check", tone: "neutral", timing: null });
  });
  it("retains source, check time and expiry in South African time", () => {
    const claim: TrustClaim = { state: "community_indication", value: "open", reportedAt: "2026-10-04T10:00:00Z", expiresAt: "2026-10-04T14:00:00Z", rule: "test", evidence: [{
      id: "report", actorId: "report", type: "open_status", value: "open", source: "community", checkedBy: "phone", reportedAt: "2026-10-04T10:00:00Z", expiresAt: "2026-10-04T14:00:00Z"
    }] };
    const status = { ...mockPlaces[0].currentStatus, trust: { version: 1 as const, claims: { open_status: claim } } };
    const check = getCheckPresentation(status, "open_status", new Date("2026-10-04T11:00:00Z"));
    expect(check).toMatchObject({ label: "Community reports open", tone: "success", reportedOpen: true });
    expect(check.summary).toContain("12:00");
    expect(check.summary).toContain("expires");
    expect(check.summary).toContain("16:00");
    expect(getCheckPresentation(status, "open_status", new Date("2026-10-04T14:00:00Z"))).toMatchObject({ label: "No recent check", tone: "neutral", timing: null, reportedOpen: false });
  });
  it("uses conflict colour without counting the venue as open", () => {
    const claim: TrustClaim = { state: "disagree", value: null, reportedAt: "2026-10-04T10:00:00Z", expiresAt: "2026-10-04T14:00:00Z", rule: "test", evidence: ["open", "closed"].map((value, index) => ({
      id: `report-${index}`, actorId: `report-${index}`, type: "open_status", value, source: "community", checkedBy: "phone", reportedAt: "2026-10-04T10:00:00Z", expiresAt: "2026-10-04T14:00:00Z"
    })) };
    expect(getCheckPresentation({ ...mockPlaces[0].currentStatus, trust: { version: 1, claims: { open_status: claim } } }, "open_status", new Date("2026-10-04T11:00:00Z")))
      .toMatchObject({ label: "Reports disagree", tone: "warning", reportedOpen: false });
  });
  it.each([true, false, null])("keeps schedule expectations neutral (%s)", positive => {
    expect(getOutlookTone({ basis: "schedule", positive })).toBe("neutral");
  });
  it("keeps missing checks neutral", () => {
    expect(getOutlookTone({ basis: "unlisted", positive: null })).toBe("neutral");
    expect(getOutlookTone({ basis: "report", positive: null })).toBe("neutral");
  });
  it("uses green for reports supporting working and red for a problem", () => {
    expect(getOutlookTone({ basis: "report", positive: true })).toBe("success");
    expect(getOutlookTone({ basis: "report", positive: false })).toBe("closed");
  });
  it("uses amber for conflicting reports", () => {
    expect(getOutlookTone({ basis: "conflict", positive: null })).toBe("warning");
  });
  it("removes report colour when a report expires", () => {
    const claim: TrustClaim = { state: "likely_negative", value: "closed", reportedAt: "2026-10-02T08:00:00Z", expiresAt: "2026-10-02T09:00:00Z", rule: "test", evidence: [] };
    const place = { ...mockPlaces[0], currentStatus: { ...mockPlaces[0].currentStatus, trust: { version: 1 as const, claims: { open_status: claim } } } };
    expect(getOutlookTone(getPlaceOutlook(place, new Date("2026-10-02T10:00:00Z")).trading)).toBe("neutral");
  });
});
