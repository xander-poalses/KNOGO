import type { ConfidenceLevel, ConfirmationType, LiveStatus, PlaceFeature } from "../types/place";
import { parseTrustSnapshot, trustClaimLabel, trustRules } from "../trust";

export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  if (score > 0) return "low";
  return "unknown";
}

export function getCurrentStatus(status: LiveStatus, now = new Date()): LiveStatus {
  if (status.trust !== undefined) {
    const snapshot = parseTrustSnapshot(status.trust) ?? { version: 1 as const, claims: {} };
    const claims = Object.fromEntries(Object.entries(snapshot.claims).map(([type, claim]) => {
      if (!claim) return [type, claim];
      const expiresAt = Date.parse(claim.expiresAt ?? "");
      const reportedAt = Date.parse(claim.reportedAt ?? "");
      return [type, claim.state !== "unknown" && (!Number.isFinite(expiresAt) || expiresAt <= now.getTime() ||
        !Number.isFinite(reportedAt) || reportedAt > now.getTime() || now.getTime() - reportedAt >= trustRules.evidenceLifetimeMs ||
        claim.evidence.some(item => Date.parse(item.reportedAt) > now.getTime() || Date.parse(item.expiresAt) <= now.getTime()))
        ? { ...claim, state: "unknown" as const, value: null, reportedAt: null, expiresAt: null, rule: "expired_evidence", evidence: [] } : claim];
    }));
    const value = (type: string) => claims[type]?.value ?? null;
    const bool = (type: string, yes: string) => value(type) === null ? null : value(type) === yes;
    return { ...status, trust: { version: 1, claims }, isOpen: bool("open_status", "open"), isKitchenServing: bool("kitchen_status", "yes"),
      acceptsWalkIns: bool("walk_ins", "yes"), cardMachineWorking: bool("card_machine", "yes"), hasBackupPower: bool("backup_power", "normal"),
      busyLevel: value("busy_level") as LiveStatus["busyLevel"] ?? "unknown", confidenceScore: 0 };
  }
  if (status.source !== "community") return status;
  if (status.signalConfirmedAt) {
    const fresh = (type: keyof NonNullable<LiveStatus["signalConfirmedAt"]>) => {
      const timestamp = Date.parse(status.signalConfirmedAt?.[type] ?? "");
      return Number.isFinite(timestamp) && timestamp <= now.getTime() && now.getTime() - timestamp < 4 * 60 * 60 * 1000;
    };
    const current = {
      ...status,
      isOpen: fresh("open_status") ? status.isOpen : null,
      isKitchenServing: fresh("kitchen_status") ? status.isKitchenServing : null,
      acceptsWalkIns: fresh("walk_ins") ? status.acceptsWalkIns : null,
      busyLevel: fresh("busy_level") ? status.busyLevel : "unknown" as const,
      hasBackupPower: fresh("backup_power") ? status.hasBackupPower : null,
      cardMachineWorking: fresh("card_machine") ? status.cardMachineWorking : null
    };
    if (Object.keys(status.signalConfirmedAt).some((type) => fresh(type as keyof NonNullable<LiveStatus["signalConfirmedAt"]>))) return current;
  } else {
    const confirmedAt = status.lastConfirmedAt ? new Date(status.lastConfirmedAt).getTime() : NaN;
    if (Number.isFinite(confirmedAt) && now.getTime() - confirmedAt < 4 * 60 * 60 * 1000 && confirmedAt <= now.getTime()) return status;
  }
  return {
    isOpen: null,
    isKitchenServing: null,
    acceptsWalkIns: null,
    busyLevel: "unknown",
    hasBackupPower: null,
    cardMachineWorking: null,
    lastConfirmedAt: null,
    confidenceScore: 0,
    source: "unknown"
  };
}

export function getConfidenceLabel(score: number) {
  const level = getConfidenceLevel(score);
  if (level === "unknown") return "Not confirmed";
  return `${level[0].toUpperCase()}${level.slice(1)} confidence`;
}

export function getStatusLabel(status: LiveStatus) {
  if (status.trust) return trustClaimLabel("open_status", getCurrentStatus(status).trust?.claims.open_status);
  return "Status unknown";
}

export function getStatusTone(status: LiveStatus) {
  const tone = getCheckPresentation(status).tone;
  return tone === "success" ? "open" : tone === "neutral" ? "unknown" : tone;
}

export function boolLabel(value: boolean | null, positive: string, negative: string) {
  if (value === true) return positive;
  if (value === false) return negative;
  return "Not confirmed";
}

export function featureLabel(feature: PlaceFeature) {
  return feature
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export function statusSummary(status: LiveStatus) {
  return getCheckPresentation(status).summary;
}

export function getCheckPresentation(status: LiveStatus, type: ConfirmationType = "open_status", now = new Date()) {
  const claim = getCurrentStatus(status, now).trust?.claims[type];
  const label = trustClaimLabel(type, claim);
  const positiveValue = type === "open_status" ? "open" : type === "backup_power" ? "normal" : "yes";
  const tone: "neutral" | "success" | "warning" | "closed" = !claim || claim.state === "unknown" ? "neutral"
    : claim.state === "disagree" ? "warning"
      : type === "busy_level" ? "neutral" : claim.value === positiveValue ? "success" : "closed";
  const time = (value: string | null) => value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Johannesburg" }) : null;
  const reported = time(claim?.reportedAt ?? null);
  const expiry = time(claim?.expiresAt ?? null);
  const source = claim?.state === "venue_update" ? "Phone-verified venue representative"
    : claim?.state === "disagree" ? [...new Set(claim.evidence.map(item => item.source === "venue" ? "Venue" : "Community"))].join(" + ") || "Reports"
      : "Community";
  const timing = reported && expiry && claim?.state !== "unknown" ? `${source} / checked ${reported} / expires ${expiry} (SA time)` : null;
  return { label, tone, timing, summary: timing ? `${label}. ${timing}` : label, reportedOpen: type === "open_status" && tone === "success" };
}
