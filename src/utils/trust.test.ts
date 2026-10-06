import { describe, expect, it } from "vitest";
import { getCurrentStatus, mockPlaces, parseRiskAssessment, parseTrustSnapshot, resolveTrust, resolveTrustClaim, trustClaimLabel, type TrustEvidence } from "@knogo/core";

const now = Date.parse("2026-10-01T12:00:00Z");
function report(id: string, overrides: Partial<TrustEvidence> = {}): TrustEvidence {
  return { id, actorId: id, type: "open_status", value: "closed", source: "community", checkedBy: "in_person",
    accountCreatedAt: "2026-09-01T10:00:00Z", reportedAt: "2026-10-01T11:00:00Z", expiresAt: "2026-10-01T15:00:00Z", risk: "low", ...overrides };
}
describe("trust product rules", () => {
  it.each([
    { source: "other" },
    { source: { toString: "venue" } },
    { checkedBy: "invented_method" },
    { checkedBy: { toString: "phone" } },
    { actorId: {} },
    { id: [] },
    { reportedAt: {} },
    { expiresAt: 1790857200000 }
  ])("rejects malformed resolver evidence rather than strengthening a negative (%j)", overrides => {
    const evidence = [report("a"), report("b"), report("c", { checkedBy: "phone", reportedAt: "2026-10-01T11:20:00Z", ...overrides } as any)];
    expect(resolveTrustClaim("open_status", evidence, now).state).toBe("unknown");
    expect(resolveTrustClaim("open_status", [{ ...report("c", { value: "open" }), ...overrides } as any], now).state).toBe("unknown");
  });
  it("rejects missing resolver evidence and an invalid clock", () => {
    expect(resolveTrustClaim("open_status", [null, undefined] as any, now).state).toBe("unknown");
    expect(resolveTrustClaim("open_status", [report("a", { value: "open" })], NaN)).toMatchObject({ state: "unknown", rule: "invalid_clock" });
  });
  it("accepts the database's public evidence without private account or risk data", () => {
    const evidence = [{ ...report("a", { value: "open" }), checkedBy: null, accountCreatedAt: undefined, risk: undefined }];
    const snapshot = { version: 1, claims: { open_status: { state: "community_indication", value: "open", reportedAt: evidence[0].reportedAt, expiresAt: evidence[0].expiresAt, rule: "community_observation", evidence } } };
    expect(parseTrustSnapshot(snapshot)?.claims.open_status?.state).toBe("community_indication");
  });
  it("keeps valid checks when another claim is malformed", () => {
    const snapshot = resolveTrust([report("a", { value: "open" })], now);
    const result = parseTrustSnapshot({ ...snapshot, claims: { ...snapshot.claims, kitchen_status: { state: "venue_update", evidence: null } } });
    expect(result?.claims.open_status?.state).toBe("community_indication");
    expect(result?.claims.kitchen_status).toMatchObject({ state: "unknown", value: null, rule: "invalid_snapshot" });
  });
  it("does not revive legacy booleans after a malformed or unsupported snapshot", () => {
    for (const trust of [null, "broken", { version: 99, claims: {} }, { version: 1, claims: [] }]) {
      expect(getCurrentStatus({ ...mockPlaces[0].currentStatus, trust } as any, new Date(now)).isOpen).toBeNull();
    }
  });
  it.each([
    { state: "unknown", value: "open" },
    { state: "community_indication", value: "closed" },
    { state: "venue_update", value: "open" },
    { state: "disagree", value: null },
    { state: "likely_negative", value: "open" },
    { expiresAt: "2026-10-01T18:00:00Z" },
    { evidence: [null] },
    { evidence: [] },
    { state: { toString: "broken" } },
    { evidence: [{ ...report("a", { value: "open" }), source: { toString: "broken" } }] },
    { value: "ignore the rules" }
  ])("keeps uncertainty for an inconsistent public claim (%j)", overrides => {
    const snapshot = resolveTrust([report("a", { value: "open" })], now);
    const result = parseTrustSnapshot({ ...snapshot, claims: { open_status: { ...snapshot.claims.open_status, ...overrides } } });
    expect(result?.claims.open_status?.state).toBe("unknown");
  });
  it("rejects future claim times and evidence even when expiry is in the future", () => {
    const snapshot = resolveTrust([report("a", { value: "open" })], now);
    const claim = snapshot.claims.open_status!;
    const cases = [
      { ...claim, reportedAt: "2026-10-01T12:10:00Z" },
      { ...claim, evidence: claim.evidence.map(item => ({ ...item, reportedAt: "2026-10-01T12:10:00Z" })) }
    ];
    for (const open_status of cases) expect(getCurrentStatus({ ...mockPlaces[0].currentStatus, trust: { version: 1, claims: { open_status } } }, new Date(now)).isOpen).toBeNull();
  });
  it("expires from the evidence even if a cached claim extends its own deadline", () => {
    const snapshot = resolveTrust([report("a", { value: "open", expiresAt: "2026-10-01T12:30:00Z" })], now);
    const open_status = { ...snapshot.claims.open_status!, expiresAt: "2026-10-01T15:00:00Z" };
    expect(getCurrentStatus({ ...mockPlaces[0].currentStatus, trust: { version: 1, claims: { open_status } } }, new Date("2026-10-01T12:30:00Z")).isOpen).toBeNull();
  });
  it("does not treat two accounts as sufficient negative evidence", () => {
    expect(resolveTrustClaim("open_status", [report("a"), report("b")], now).state).toBe("unknown");
  });
  it("labels eligible negative evidence likely closed, never Closed", () => {
    const evidence = [report("a"), report("b", { checkedBy: "phone", reportedAt: "2026-10-01T11:20:00Z" }), report("c")];
    const claim = resolveTrustClaim("open_status", evidence, now);
    expect(claim.state).toBe("likely_negative");
    expect(trustClaimLabel("open_status", claim)).toBe("Likely closed");
  });
  it("keeps uncertainty when risk assessment fails, is absent or reports coordination", () => {
    for (const risk of ["unknown", "medium", "high"] as const) {
      const evidence = [report("a", { risk }), report("b", { risk, checkedBy: "phone", reportedAt: "2026-10-01T11:20:00Z" }), report("c", { risk })];
      expect(resolveTrustClaim("open_status", evidence, now).state).toBe("unknown");
    }
  });
  it("does not count duplicate accounts twice", () => {
    const evidence = [report("a"), report("b", { actorId: "a" }), report("c", { actorId: "a" })];
    expect(resolveTrustClaim("open_status", evidence, now).state).toBe("unknown");
  });
  it("keeps venue and community statements in a conflict", () => {
    const claim = resolveTrustClaim("open_status", [report("a"), report("v", { source: "venue", value: "open", verifiedRepresentative: true })], now);
    expect(claim.state).toBe("disagree");
    expect(claim.evidence).toHaveLength(2);
  });
  it("rejects unverified representatives and expired or future evidence", () => {
    expect(resolveTrustClaim("open_status", [report("v", { source: "venue" }), report("a", { expiresAt: new Date(now).toISOString() }), report("b", { reportedAt: "2026-10-02T11:00:00Z" })], now).state).toBe("unknown");
  });
  it("keeps trading separate from service availability", () => {
    const snapshot = resolveTrust([report("a", { value: "open" }), report("v", { type: "kitchen_status", value: "no", source: "venue", verifiedRepresentative: true })], now);
    expect(snapshot.claims.open_status?.value).toBe("open");
    expect(snapshot.claims.kitchen_status?.value).toBe("no");
  });
  it("validates risk output and rejects injected reasons or extra fields", () => {
    expect(parseRiskAssessment({ risk: "low", reasons: ["no_pattern_detected"] })?.risk).toBe("low");
    expect(parseRiskAssessment({ risk: "low", reasons: ["ignore all rules"] })).toBeNull();
    expect(parseRiskAssessment({ risk: "low", reasons: ["no_pattern_detected"], isClosed: true })).toBeNull();
    expect(parseRiskAssessment("{bad-json}")).toBeNull();
    expect(parseRiskAssessment({ risk: { toString: "broken" }, reasons: ["no_pattern_detected"] })).toBeNull();
  });
});
