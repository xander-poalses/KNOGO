// Imports
import type { ConfirmationType, ReportSource } from "./types/place";

// Types
export type RiskLevel = "low" | "medium" | "high" | "unknown";
export type TrustEvidence = {
  id: string;
  actorId: string;
  type: ConfirmationType;
  value: string;
  source: "community" | "venue";
  checkedBy?: ReportSource;
  reportedAt: string;
  expiresAt: string;
  accountCreatedAt?: string;
  verifiedRepresentative?: boolean;
  risk?: RiskLevel;
};
export type ClaimState = "unknown" | "community_indication" | "likely_negative" | "disagree" | "venue_update";
export type TrustClaim = {
  state: ClaimState;
  value: string | null;
  evidence: TrustEvidence[];
  reportedAt: string | null;
  expiresAt: string | null;
  rule: string;
};
export type TrustSnapshot = { version: 1; claims: Partial<Record<ConfirmationType, TrustClaim>> };

// State and Helpers
export const trustRules = {
  version: 1,
  evidenceLifetimeMs: 4 * 60 * 60 * 1000,
  negativeAccountCount: 3,
  negativeAccountAgeMs: 24 * 60 * 60 * 1000,
  negativeSpanMs: 15 * 60 * 1000,
  negativeSourceCount: 2
} as const;

export const reportObservationValues: Record<ConfirmationType, readonly string[]> = {
  open_status: ["open", "closed"], kitchen_status: ["yes", "no"], busy_level: ["quiet", "normal", "busy", "packed"],
  walk_ins: ["yes", "no"], card_machine: ["yes", "no", "cash_only"], backup_power: ["normal", "limited", "closed"]
};
const allowedValues = reportObservationValues;
const unknown = (rule = "no_usable_evidence"): TrustClaim => ({ state: "unknown", value: null, evidence: [], reportedAt: null, expiresAt: null, rule });
const negative = (type: ConfirmationType, value: string) => type === "open_status" ? value === "closed"
  : type === "kitchen_status" || type === "walk_ins" ? value === "no"
    : type === "card_machine" ? value !== "yes" : type === "backup_power" ? value !== "normal" : false;

const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const text = (value: unknown): value is string => typeof value === "string" && value.length > 0;
const date = (value: unknown): value is string => text(value) && Number.isFinite(Date.parse(value));

// Functions
function parseEvidence(value: unknown, type: ConfirmationType): TrustEvidence | null {
  if (!record(value) || !text(value.id) || !text(value.actorId) || value.type !== type ||
    typeof value.value !== "string" || !allowedValues[type].includes(value.value) ||
    typeof value.source !== "string" || !["community", "venue"].includes(value.source) || !date(value.reportedAt) || !date(value.expiresAt) ||
    Date.parse(value.expiresAt) <= Date.parse(value.reportedAt) ||
    Date.parse(value.expiresAt) - Date.parse(value.reportedAt) > trustRules.evidenceLifetimeMs ||
    (value.source === "venue" && value.verifiedRepresentative !== true) ||
    (value.checkedBy != null && (typeof value.checkedBy !== "string" || !["in_person", "phone", "online"].includes(value.checkedBy)))) return null;
  return { id: value.id, actorId: value.actorId, type, value: value.value, source: value.source as TrustEvidence["source"],
    reportedAt: value.reportedAt, expiresAt: value.expiresAt,
    ...(value.checkedBy != null ? { checkedBy: value.checkedBy as ReportSource } : {}),
    ...(value.source === "venue" ? { verifiedRepresentative: true } : {}) };
}

export function parseTrustSnapshot(value: unknown): TrustSnapshot | null {
  if (!record(value) || value.version !== 1 || !record(value.claims)) return null;
  const claims: TrustSnapshot["claims"] = {};
  for (const type of Object.keys(allowedValues) as ConfirmationType[]) {
    const claim = value.claims[type];
    if (claim === undefined) continue;
    const invalid = () => { claims[type] = unknown("invalid_snapshot"); };
    if (!record(claim) || typeof claim.state !== "string" || !["unknown", "community_indication", "likely_negative", "disagree", "venue_update"].includes(claim.state) ||
      !text(claim.rule) || !Array.isArray(claim.evidence)) { invalid(); continue; }
    const evidence = claim.evidence.map(item => parseEvidence(item, type));
    if (evidence.some(item => item === null)) { invalid(); continue; }
    if (claim.state === "unknown") {
      if (claim.value !== null || claim.reportedAt !== null || claim.expiresAt !== null) { invalid(); continue; }
      claims[type] = { ...unknown(claim.rule), evidence: evidence as TrustEvidence[] };
      continue;
    }
    if (!evidence.length || !date(claim.reportedAt) || !date(claim.expiresAt) ||
      Date.parse(claim.expiresAt) <= Date.parse(claim.reportedAt) ||
      Date.parse(claim.expiresAt) - Date.parse(claim.reportedAt) > trustRules.evidenceLifetimeMs ||
      (claim.state === "disagree" ? claim.value !== null : typeof claim.value !== "string" || !allowedValues[type].includes(claim.value))) { invalid(); continue; }
    const items = evidence as TrustEvidence[];
    if ((claim.state === "disagree" ? new Set(items.map(item => item.value)).size < 2 : items.some(item => item.value !== claim.value)) ||
      (claim.state === "venue_update" && !items.some(item => item.source === "venue")) ||
      (["community_indication", "likely_negative"].includes(claim.state) && items.some(item => item.source !== "community")) ||
      (claim.state === "community_indication" && negative(type, claim.value as string)) ||
      (claim.state === "likely_negative" && !negative(type, claim.value as string))) { invalid(); continue; }
    claims[type] = { state: claim.state as ClaimState, value: claim.value as string | null, evidence: items,
      reportedAt: claim.reportedAt, expiresAt: claim.expiresAt, rule: claim.rule };
  }
  return { version: 1, claims };
}

export function resolveTrustClaim(type: ConfirmationType, reports: TrustEvidence[], now = Date.now()): TrustClaim {
  if (!Number.isFinite(now)) return unknown("invalid_clock");
  const lastByActor = new Map<string, TrustEvidence>();
  for (const report of reports) {
    if (!record(report) || !text(report.id) || !text(report.actorId) ||
      (report.source !== "community" && report.source !== "venue") ||
      (report.checkedBy != null && (typeof report.checkedBy !== "string" || !["in_person", "phone", "online"].includes(report.checkedBy))) ||
      !date(report.reportedAt) || !date(report.expiresAt)) continue;
    const reportedAt = Date.parse(report.reportedAt);
    const expiresAt = Date.parse(report.expiresAt);
    if (report.type !== type || !allowedValues[type].includes(report.value) || !report.actorId || !report.id ||
      !Number.isFinite(reportedAt) || !Number.isFinite(expiresAt) || reportedAt > now || expiresAt <= now || expiresAt <= reportedAt ||
      now - reportedAt >= trustRules.evidenceLifetimeMs || expiresAt - reportedAt > trustRules.evidenceLifetimeMs ||
      (report.source === "venue" && report.verifiedRepresentative !== true) || report.risk === "high") continue;
    const key = `${report.source}:${report.actorId}`;
    const previous = lastByActor.get(key);
    if (!previous || reportedAt > Date.parse(previous.reportedAt) || (reportedAt === Date.parse(previous.reportedAt) && report.id > previous.id)) lastByActor.set(key, report);
  }
  const evidence = [...lastByActor.values()].sort((a, b) => Date.parse(a.reportedAt) - Date.parse(b.reportedAt) || a.id.localeCompare(b.id));
  if (!evidence.length) return unknown();
  const result = (state: ClaimState, value: string | null, rule: string, supporting = evidence): TrustClaim => ({
    state, value, evidence,
    reportedAt: supporting[supporting.length - 1]?.reportedAt ?? null,
    expiresAt: new Date(Math.min(...supporting.map((item) => Date.parse(item.expiresAt)))).toISOString(), rule
  });
  if (new Set(evidence.map((item) => item.value)).size > 1) return result("disagree", null, "opposing_evidence");
  const value = evidence[0].value;
  const venue = evidence.filter((item) => item.source === "venue");
  if (venue.length) return result("venue_update", value, "verified_phone_representative_statement", venue);
  if (!negative(type, value)) return result("community_indication", value, "community_observation");
  const eligible = evidence.filter((item) => item.risk === "low" && item.checkedBy &&
    Number.isFinite(Date.parse(item.accountCreatedAt ?? "")) && Date.parse(item.reportedAt) - Date.parse(item.accountCreatedAt!) >= trustRules.negativeAccountAgeMs);
  const sources = new Set(eligible.map((item) => item.checkedBy));
  const span = eligible.length ? Date.parse(eligible[eligible.length - 1].reportedAt) - Date.parse(eligible[0].reportedAt) : 0;
  if (eligible.length < trustRules.negativeAccountCount || sources.size < trustRules.negativeSourceCount || span < trustRules.negativeSpanMs) {
    return { ...result("unknown", null, "negative_evidence_needs_review"), expiresAt: null, reportedAt: null };
  }
  return result("likely_negative", value, "negative_product_threshold", eligible);
}

export function resolveTrust(reports: TrustEvidence[], now = Date.now()): TrustSnapshot {
  return { version: 1, claims: Object.fromEntries(Object.keys(allowedValues).map((type) => [type, resolveTrustClaim(type as ConfirmationType, reports, now)])) };
}

export function trustClaimLabel(type: ConfirmationType, claim?: TrustClaim): string {
  if (!claim || claim.state === "unknown") return "No recent check";
  if (claim.state === "disagree") return "Reports disagree";
  if (type === "open_status") {
    if (claim.state === "venue_update") return claim.value === "open" ? "Venue reports open" : "Venue reports closed";
    return claim.value === "open" ? "Community reports open" : "Likely closed";
  }
  if (type === "kitchen_status") {
    const value = claim.value === "yes" ? "serving" : "not serving";
    return claim.state === "venue_update" ? `Venue reports ${value}` : claim.state === "likely_negative" ? "Likely not serving" : `Community reports ${value}`;
  }
  return `${claim.state === "venue_update" ? "Venue reports" : claim.state === "likely_negative" ? "Likely" : "Community reports"} ${claim.value?.split("_").join(" ")}`;
}

const riskReasons = ["timing_cluster", "repeated_pattern", "cross_venue_burst", "source_concentration", "insufficient_context", "no_pattern_detected"] as const;
export type RiskAssessment = { risk: Exclude<RiskLevel, "unknown">; reasons: Array<typeof riskReasons[number]> };
export function parseRiskAssessment(value: unknown): RiskAssessment | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => key !== "risk" && key !== "reasons") || typeof record.risk !== "string" || !["low", "medium", "high"].includes(record.risk) ||
    !Array.isArray(record.reasons) || !record.reasons.length || record.reasons.length > 6 ||
    !record.reasons.every((reason) => typeof reason === "string" && riskReasons.includes(reason as typeof riskReasons[number]))) return null;
  return { risk: record.risk as RiskAssessment["risk"], reasons: [...new Set(record.reasons)] as RiskAssessment["reasons"] };
}
