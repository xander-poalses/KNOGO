import type { ConfirmationAnswer } from "./lib/supabaseApi";
import type { ReportSource, ReportSubmissionResult } from "./types/place";
export type PendingReport = { placeId: string; answers: ConfirmationAnswer[]; reportSource: ReportSource; sourceUrl?: string; createdAt: string };
export function venueCallbackPlaceId(url: string): string | null {
  try {
    const placeId = new URL(url).searchParams.get("venue");
    return placeId && /^[a-z0-9][a-z0-9_-]{0,199}$/.test(placeId) ? placeId : null;
  } catch { return null; }
}
export function reportValidationError(input: { answers: ConfirmationAnswer[]; reportSource: ReportSource | null; sourceUrl?: string }): string | null {
  if (!input.reportSource) return "Choose how you checked: at the venue, by phone or online.";
  if (input.reportSource === "online") {
    try {
      const url = new URL(input.sourceUrl?.trim() ?? "");
      if (!["https:", "http:"].includes(url.protocol) || !url.hostname) throw new Error();
    } catch {
      return "Add the website address where you checked, starting with https:// or http://.";
    }
  }
  if (["open_status", "kitchen_status", "busy_level"].some((type) => !input.answers.some((answer) => answer.type === type))) {
    return "Answer the open, kitchen and busy checks before submitting.";
  }
  return null;
}
export async function finishEmailReport(input: {
  url: string; completeEmailLink: (url: string) => Promise<unknown>; readDraft: () => Promise<PendingReport | null>;
  submit: (draft: PendingReport) => Promise<ReportSubmissionResult>; clearDraft: () => Promise<void>; now?: number;
}) {
  await input.completeEmailLink(input.url);
  const venue = venueCallbackPlaceId(input.url);
  if (venue) return { kind: "venue" as const, placeId: venue };
  // Account registration must not publish an unrelated report saved earlier.
  try {
    if (new URL(input.url).searchParams.get("intent") === "account") return { kind: "account" as const };
  } catch { /* Link validity is checked by completeEmailLink. */ }
  const draft = await input.readDraft();
  if (!draft) return { kind: "account" as const };
  const now = input.now ?? Date.now();
  const checkedAt = Date.parse(draft.createdAt);
  try {
    const callback = new URL(input.url);
    if (callback.searchParams.get("intent") === "review") {
      return callback.searchParams.get("placeId") === draft.placeId
        ? { kind: "recheck" as const, draft } : { kind: "account" as const };
    }
  } catch { /* Link validity is checked by completeEmailLink. */ }
  if (!Number.isFinite(checkedAt) || now - checkedAt >= 4 * 60 * 60 * 1000 || checkedAt > now) return { kind: "recheck" as const, draft };
  const result = await input.submit(draft);
  await input.clearDraft().catch(() => undefined);
  return { kind: "report" as const, draft, result };
}
