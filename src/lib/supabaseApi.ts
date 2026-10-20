import { createSupabaseApi, storageKeys, type SupabaseSession } from "@knogo/core";

const sessionStorage = {
  read(): SupabaseSession | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(storageKeys.supabaseSession);
      return raw ? (JSON.parse(raw) as SupabaseSession) : null;
    } catch {
      return null;
    }
  },
  write(session: SupabaseSession) {
    window.localStorage.setItem(storageKeys.supabaseSession, JSON.stringify(session));
  },
  clear() {
    window.localStorage.removeItem(storageKeys.supabaseSession);
  }
};

const api = createSupabaseApi({
  url: import.meta.env.VITE_SUPABASE_URL,
  publishableKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  sessionStorage
});

export type { SupabaseSession } from "@knogo/core";
export const hasSupabaseConfig = api.hasConfig;
export const readSupabaseSession = sessionStorage.read;
export const clearSupabaseSession = api.clearSession;
export const signInWithEmail = api.signInWithEmail;
export const signUpWithEmail = api.signUpWithEmail;
export const fetchSupabasePlaces = api.fetchPlaces;
export const fetchSupabasePlaceGroups = api.fetchPlaceGroups;
export const fetchSupabasePlace=api.fetchPlace;
export const readReportAssessment=api.readReportAssessment;
export const readReportReviewNotice=api.readReportReviewNotice;
export const acceptReportReviewNotice=api.acceptReportReviewNotice;
export const submitSupabaseReport=api.submitConfirmations;
export const submitSupabaseConfirmation = async (input: { placeId: string; type: import("@knogo/core").ConfirmationType; value: string; reportSource?: import("@knogo/core").ReportSource; sourceUrl?: string }) => {
  if (!input.reportSource) throw new Error("Choose how you checked this venue. Use the mobile reporting flow while web reporting is updated.");
  const result = await api.submitConfirmations({ placeId: input.placeId, reportSource: input.reportSource, sourceUrl: input.sourceUrl, answers: [{ type: input.type, value: input.value }] });
  return result.confirmations[0];
};
