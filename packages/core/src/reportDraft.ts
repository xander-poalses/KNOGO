import type { ConfirmationAnswer } from "./lib/supabaseApi";
import type { ReportSource, ReportSubmissionResult } from "./types/place";
import { reportObservationValues } from "./trust";
export type PendingReport = { placeId: string; answers: ConfirmationAnswer[]; reportSource: ReportSource; sourceUrl?: string; createdAt: string };
export function isRecoveryCallback(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("intent") === "recovery" || new URLSearchParams(parsed.hash.slice(1)).get("type") === "recovery";
  } catch { return false; }
}
export function venueCallbackPlaceId(url: string): string | null {
  try {
    const placeId = new URL(url).searchParams.get("venue");
    return placeId && /^[a-z0-9][a-z0-9_-]{0,199}$/.test(placeId) ? placeId : null;
  } catch { return null; }
}
export function reportValidationError(input: { answers: ConfirmationAnswer[]; reportSource: ReportSource | null; sourceUrl?: string }): string | null {
  if (!input.reportSource) return "Choose how you checked: at the venue, by phone or online.";
  if (!["in_person", "phone", "online"].includes(input.reportSource)) return "Choose how you checked this place.";
  if (input.reportSource === "online") {
    try {
      const url = new URL(input.sourceUrl?.trim() ?? "");
      if (!["https:", "http:"].includes(url.protocol) || !url.hostname) throw new Error();
    } catch {
      return "Add the website address where you checked, starting with https:// or http://.";
    }
  }
  if (!input.answers.length) return "Add at least one check before submitting.";
  if (input.answers.length > 6 || new Set(input.answers.map(answer => answer.type)).size !== input.answers.length || input.answers.some(answer => !reportObservationValues[answer.type]?.includes(answer.value))) return "Review your answers before submitting.";
  return null;
}
export async function finishEmailReport(input: {
  url: string; completeEmailLink: (url: string) => Promise<unknown>; readDraft: () => Promise<PendingReport | null>;
  submit: (draft: PendingReport) => Promise<ReportSubmissionResult>; clearDraft: () => Promise<void>; now?: number;
}) {
  await input.completeEmailLink(input.url);
  if (isRecoveryCallback(input.url)) return { kind: "recovery" as const };
  const venue = venueCallbackPlaceId(input.url);
  if (venue) return { kind: "venue" as const, placeId: venue };
  // Account registration must not publish an unrelated report saved earlier.
  try {
    if (new URL(input.url).searchParams.get("intent") === "account") return { kind: "account" as const };
  } catch { /* Link validity is checked by completeEmailLink. */ }
  const draft = await input.readDraft();
  try {
    const callback = new URL(input.url);
    if (callback.searchParams.get("intent") === "review") {
      const placeId = callback.searchParams.get("placeId");
      if (!placeId || !/^[a-z0-9][a-z0-9_-]{0,199}$/.test(placeId)) return { kind: "account" as const };
      return placeId === draft?.placeId
        ? { kind: "recheck" as const, draft } : { kind: "report" as const, placeId };
    }
  } catch { /* Link validity is checked by completeEmailLink. */ }
  if (!draft) return { kind: "account" as const };
  return { kind: "recheck" as const, draft };
}
