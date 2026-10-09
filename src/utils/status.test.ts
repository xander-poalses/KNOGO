import { describe, expect, it } from "vitest";
import type { LiveStatus } from "../types/place";
import { getConfidenceLevel, getCurrentStatus, getStatusLabel } from "./status";

const baseStatus: LiveStatus = {
  isOpen: true,
  isKitchenServing: null,
  acceptsWalkIns: null,
  busyLevel: "unknown",
  hasBackupPower: null,
  cardMachineWorking: null,
  lastConfirmedAt: null,
  confidenceScore: 0,
  source: "unknown"
};

describe("status helpers", () => {
  it("expires each check without renewing it through another check", () => {
    const status: LiveStatus = { ...baseStatus, source: "community", lastConfirmedAt: "2026-09-30T11:00:00Z", cardMachineWorking: true,
      signalConfirmedAt: { open_status: "2026-09-30T07:00:00Z", card_machine: "2026-09-30T11:00:00Z" } };
    expect(getCurrentStatus(status, new Date("2026-09-30T12:00:00Z"))).toMatchObject({ isOpen: null, cardMachineWorking: true });
    expect(getCurrentStatus(status, new Date("2026-09-30T15:00:00Z"))).toMatchObject({ isOpen: null, cardMachineWorking: null, source: "unknown" });
  });

  it("does not revive legacy fields when per-check timestamps are absent", () => {
    expect(getCurrentStatus({ ...baseStatus, source: "community", lastConfirmedAt: "2026-09-30T11:00:00Z", signalConfirmedAt: {} }, new Date("2026-09-30T12:00:00Z")))
      .toMatchObject({ isOpen: null, source: "unknown" });
  });
  it("does not overclaim unknown kitchen status", () => {
    expect(getStatusLabel(baseStatus)).toBe("No recent check");
  });

  it("does not convert a legacy score into a status claim", () => {
    expect(getStatusLabel({ ...baseStatus, isKitchenServing: true, confidenceScore: 55 })).toBe("No recent check");
  });

  it("does not treat a higher legacy score as proof of availability", () => {
    expect(getStatusLabel({ ...baseStatus, isKitchenServing: true, confidenceScore: 82 })).toBe("No recent check");
  });

  it("maps confidence scores", () => {
    expect(getConfidenceLevel(80)).toBe("high");
    expect(getConfidenceLevel(52)).toBe("medium");
    expect(getConfidenceLevel(20)).toBe("low");
    expect(getConfidenceLevel(0)).toBe("unknown");
  });

  it("keeps a community report before its four-hour expiry", () => {
    const status = { ...baseStatus, source: "community" as const, lastConfirmedAt: "2026-09-30T08:00:00Z" };
    expect(getCurrentStatus(status, new Date("2026-09-30T11:59:59Z"))).toBe(status);
  });

  it("hides expired community answers held in an offline copy", () => {
    const status = { ...baseStatus, source: "community" as const, lastConfirmedAt: "2026-09-30T08:00:00Z", isKitchenServing: true, acceptsWalkIns: true, confidenceScore: 80 };
    expect(getCurrentStatus(status, new Date("2026-09-30T12:00:00Z"))).toMatchObject({ isOpen: null, isKitchenServing: null, acceptsWalkIns: null, confidenceScore: 0, source: "unknown", lastConfirmedAt: null });
  });

  it("does not treat an undated community report as current", () => {
    expect(getCurrentStatus({ ...baseStatus, source: "community" })).toMatchObject({ isOpen: null, source: "unknown" });
  });

  it("does not expire a business update", () => {
    const status = { ...baseStatus, source: "business" as const, lastConfirmedAt: "2026-09-29T08:00:00Z" };
    expect(getCurrentStatus(status, new Date("2026-09-30T12:00:00Z"))).toBe(status);
  });
});
