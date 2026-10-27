// Imports
import { reportReviewNoticeVersion, type ReportReviewNotice, type ConfirmationType, type Place, type PlaceGroup, type ReportAssessment, type ReportSource, type ReportSubmissionResult } from "../types/place";
import {
  mapSupabaseConfirmation,
  mapSupabasePlace,
  mapSupabasePlaceGroup,
  type SupabaseConfirmationRow,
  type SupabaseHoursRow,
  type SupabaseLiveStatusRow,
  type SupabasePlaceGroupRow,
  type SupabasePlaceRow,
  type SupabaseRegionRow
} from "./supabaseMapper";

// Types
export type SupabaseSession = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  expiresAt: number;
  isAnonymous?: boolean;
};

export type ConfirmationAnswer = {
  type: ConfirmationType;
  value: string;
};

export type VenueAccess = { verified: boolean; verifiedAt: string | null; expiresAt: string | null };

export type SessionStorage = {
  read: () => SupabaseSession | null | Promise<SupabaseSession | null>;
  write: (session: SupabaseSession) => void | Promise<void>;
  clear: () => void | Promise<void>;
};

type AuthResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  user?: { id: string; email?: string; is_anonymous?: boolean };
};

type AuthUserResponse = { id?: string; email?: string };

type SupabaseError = { error_description?: string; msg?: string; message?: string; error_code?: string; error?: string };

// Classes
class AuthRequestError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) { super(message); }
}

// Functions
export function createSupabaseApi(config: {
  url?: string;
  publishableKey?: string;
  venueClaimUrl?: string;
  allowGuestReporting?: boolean;
  sessionStorage: SessionStorage;
}) {
  const { url, publishableKey, sessionStorage } = config;
  const hasConfig = Boolean(url && publishableKey);
  let refreshInFlight: Promise<SupabaseSession | null> | null = null;
  let sessionGeneration = 0;

  async function withRequestTimeout<T>(action: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error("KNOGO could not reach Supabase within 20 seconds. Check your connection and the project's status. If you submitted a report, it may have reached Supabase. Check the place before trying again."));
        controller.abort();
      }, 20_000);
    });
    try {
      return await Promise.race([action(controller.signal), timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  function requireConfig() {
    if (!url || !publishableKey) throw new Error("Supabase env vars are not set.");
    return { url, publishableKey };
  }

  async function readError(response: Response, fallback: string) {
    const text = await response.text();
    try {
      const error = JSON.parse(text) as SupabaseError;
      return error.error_description ?? error.msg ?? error.message ?? error.error ?? fallback;
    } catch {
      return text || fallback;
    }
  }

  async function authRequest(path: string, body: Record<string, unknown>, accessToken?: string, method = "POST") {
    const current = requireConfig();
    return withRequestTimeout(async (signal) => {
    const response = await fetch(`${current.url}/auth/v1/${path}`, {
      signal,
      method,
      headers: {
        apikey: current.publishableKey,
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const details = await response.clone().json().catch(() => null) as SupabaseError | null;
      throw new AuthRequestError(await readError(response, `Supabase Auth failed with ${response.status}`), response.status, details?.error_code);
    }
    if (response.status === 204) return {};
    return (await response.json()) as AuthResponse;
    });
  }

  function mapAuthResponse(response: AuthResponse, fallbackEmail: string): SupabaseSession {
    if (!response.access_token || !response.refresh_token || !response.user?.id) {
      throw new Error("Supabase Auth did not return a session. Check whether email confirmation is required.");
    }
    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      userId: response.user.id,
      email: response.user.email ?? fallbackEmail,
      ...(response.user.is_anonymous === true ? { isAnonymous: true } : {}),
      expiresAt: response.expires_at ?? Math.floor(Date.now() / 1000) + (response.expires_in ?? 3600)
    };
  }

  async function request<T>(table: string, init?: RequestInit, accessToken?: string, onResponse?: (response: Response) => void): Promise<T> {
    const current = requireConfig();
    return withRequestTimeout(async (signal) => {
    const response = await fetch(`${current.url}/rest/v1/${table}`, {
      ...init,
      signal,
      headers: {
        apikey: current.publishableKey,
        Authorization: `Bearer ${accessToken ?? current.publishableKey}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {})
      }
    });
    if (!response.ok) throw new Error((await response.text()) || `Supabase request failed with ${response.status}`);
    onResponse?.(response);
    return (await response.json()) as T;
    });
  }

  async function requestAll<T>(table: string): Promise<T[]> {
    const rows: T[] = [];
    let total: number | null = null;
    while (true) {
      const page = await request<T[]>(`${table}&limit=500&offset=${rows.length}`, {
        headers: { Prefer: "count=exact" }
      }, undefined, response => {
        const count = response.headers.get("Content-Range")?.split("/")[1];
        if (count && /^\d+$/.test(count)) total = Number(count);
      });
      if (!Array.isArray(page)) throw new Error("Could not read place data.");
      rows.push(...page);
      if (total !== null && rows.length >= total) return rows;
      if (!page.length) {
        if (total !== null) throw new Error("Place data changed while loading. Try again.");
        return rows;
      }
    }
  }

  async function sendEmailLink(email: string, redirectTo: string) {
    const redirect = encodeURIComponent(redirectTo);
    await authRequest(`otp?redirect_to=${redirect}`, { email, create_user: true });
  }

  async function verifyEmailCode(email: string, code: string) {
    const session = mapAuthResponse(await authRequest("verify", { email, token: code, type: "email" }), email);
    await sessionStorage.write(session);
    return session;
  }

  async function completeEmailLink(callbackUrl: string) {
    const current = requireConfig();
    const fragmentStart = callbackUrl.indexOf("#");
    const queryStart = callbackUrl.indexOf("?");
    const rawParams = fragmentStart >= 0
      ? callbackUrl.slice(fragmentStart + 1)
      : queryStart >= 0
        ? callbackUrl.slice(queryStart + 1)
        : "";
    const params = new URLSearchParams(rawParams);
    const authError = params.get("error_description") ?? params.get("error");
    if (authError) throw new Error(authError);

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) throw new Error("This sign-in link is invalid or has expired.");

    const user = await withRequestTimeout(async signal => {
      const response = await fetch(`${current.url}/auth/v1/user`, {
        signal, headers: { apikey: current.publishableKey, Authorization: `Bearer ${accessToken}` }
      });
      if (!response.ok) throw new Error(await readError(response, "Could not finish signing in."));
      return (await response.json()) as AuthUserResponse;
    });
    if (!user.id) throw new Error("Supabase did not return an account for this link.");

    const expiresIn = Number(params.get("expires_in") ?? 3600);
    const session: SupabaseSession = {
      accessToken,
      refreshToken,
      userId: user.id,
      email: user.email ?? "",
      expiresAt: Math.floor(Date.now() / 1000) + (Number.isFinite(expiresIn) ? expiresIn : 3600)
    };
    await sessionStorage.write(session);
    return session;
  }

  async function signInAsTester() {
    if (!config.allowGuestReporting) throw new Error("Guest reporting is only available in the tester build.");
    const current = await getValidSession();
    if (current) return current;
    const session = mapAuthResponse(await authRequest("signup", {}), "");
    if (!session.isAnonymous) throw new Error("KNOGO could not start a guest session.");
    await sessionStorage.write(session);
    return session;
  }

  async function signInWithEmail(email: string, password: string) {
    const session = mapAuthResponse(await authRequest("token?grant_type=password", { email, password }), email);
    await sessionStorage.write(session);
    return session;
  }

  async function requestPasswordRecovery(email: string, redirectTo: string) {
    await authRequest(`recover?redirect_to=${encodeURIComponent(redirectTo)}`, { email });
  }

  async function updatePassword(password: string) {
    if (password.length < 8) throw new Error("Use at least 8 characters for your password.");
    const session = await getValidSession();
    if (!session) throw new AuthRequestError("Open a recovery link to change your password.", 401, "session_not_found");
    await authRequest("user", { password }, session.accessToken, "PUT");
  }

  async function signUpWithEmail(email: string, password: string) {
    const session = mapAuthResponse(await authRequest("signup", { email, password }), email);
    await sessionStorage.write(session);
    return session;
  }

  async function registerWithEmail(email: string, password: string, redirectTo: string): Promise<SupabaseSession | null> {
    const response = await authRequest(`signup?redirect_to=${encodeURIComponent(redirectTo)}`, { email, password });
    if (!response.access_token && !response.refresh_token) return null;
    const session = mapAuthResponse(response, email);
    await sessionStorage.write(session);
    return session;
  }

  async function refreshStoredSession() {
    const generation = sessionGeneration;
    const current = await sessionStorage.read();
    if (!current) return null;
    try {
      const session = mapAuthResponse(
        await authRequest("token?grant_type=refresh_token", { refresh_token: current.refreshToken }),
        current.email
      );
      const stored = await sessionStorage.read();
      if (generation !== sessionGeneration || stored?.refreshToken !== current.refreshToken) return stored;
      await sessionStorage.write(session);
      return session;
    } catch (cause) {
      const stored = await sessionStorage.read();
      if (generation !== sessionGeneration || stored?.refreshToken !== current.refreshToken) return stored;
      if (cause instanceof AuthRequestError && [400, 401, 403].includes(cause.status)) await sessionStorage.clear();
      throw cause;
    }
  }

  function refreshSession() {
    if (!refreshInFlight) {
      refreshInFlight = refreshStoredSession().finally(() => { refreshInFlight = null; });
    }
    return refreshInFlight;
  }

  async function getValidSession() {
    const session = await sessionStorage.read();
    if (!session) return null;
    if (session.expiresAt > Math.floor(Date.now() / 1000) + 60) return session;
    return refreshSession();
  }

  async function signOut() {
    const generation = ++sessionGeneration;
    const session = await sessionStorage.read();
    try {
      if (session) await authRequest("logout?scope=local", {}, session.accessToken);
    } finally {
      const stored = await sessionStorage.read();
      if (generation === sessionGeneration && stored?.refreshToken === session?.refreshToken) {
        await sessionStorage.clear();
      }
    }
  }

  async function restoreSession() {
    const session = await sessionStorage.read();
    if (!session) return null;
    if (!session.expiresAt || session.expiresAt <= Math.floor(Date.now() / 1000) + 60) {
      try {
        return await refreshSession();
      } catch {
        return sessionStorage.read();
      }
    }
    return session;
  }

  async function submitConfirmations(input: { placeId: string; answers: ConfirmationAnswer[]; reportSource: ReportSource; sourceUrl?: string }) {
    if (!input.answers.length) throw new Error("Choose at least one status before submitting.");
    if (input.reportSource === "online" && !input.sourceUrl?.trim()) throw new Error("Add the page where you checked this information.");
    const session = await getValidSession();
    if (!session) throw new Error("You need to sign in before confirming a status.");
    if (session.isAnonymous && !config.allowGuestReporting) throw new Error("Sign in before submitting a report.");
    const results = await request<Array<{
      report_id: string;
      outcome: "pending" | "accepted" | "conflict";
      accepted_signals: ConfirmationType[] | null;
      confirmations: SupabaseConfirmationRow[] | null;
    }>>(
      "rpc/submit_status_report",
      {
        method: "POST",
        body: JSON.stringify({
          p_place_id: input.placeId,
          p_report_source: input.reportSource,
          p_source_url: input.sourceUrl?.trim() || null,
          p_answers: input.answers
        })
      },
      session.accessToken
    );
    const result = results[0];
    if (!result) throw new Error("KNOGO did not receive a report result.");
    return {
      reportId: result.report_id,
      outcome: result.outcome,
      acceptedSignals: result.accepted_signals ?? [],
      confirmations: (result.confirmations ?? []).map(mapSupabaseConfirmation)
    } satisfies ReportSubmissionResult;
  }

  async function reportReviewNotice(accept?: { version: string; adultConfirmed: boolean }): Promise<ReportReviewNotice> {
    const session = await getValidSession();
    if (!session) throw new Error("Sign in before reviewing the report notice.");
    if (accept && (!accept.adultConfirmed || accept.version !== reportReviewNoticeVersion)) throw new Error("Confirm you are 18 or over and accept the report notice.");
    const value = await request<ReportReviewNotice | null>(`rpc/${accept ? "accept" : "read"}_report_review_notice`, {
      method: "POST", body: JSON.stringify(accept ? { p_version: accept.version, p_adult_confirmed: accept.adultConfirmed } : {})
    }, session.accessToken);
    if (!value || value.version !== reportReviewNoticeVersion || typeof value.accepted !== "boolean" || (accept && !value.accepted)) throw new Error("Could not read or save the report notice. Try again.");
    const current = await sessionStorage.read();
    if (current?.userId !== session.userId) throw new Error("Your account changed. Check the report notice again.");
    return { version: value.version, accepted: value.accepted };
  }

  const readReportReviewNotice = () => reportReviewNotice();
  const acceptReportReviewNotice = (input: { version: string; adultConfirmed: boolean }) => reportReviewNotice(input);

  async function readReportAssessment(reportId: string): Promise<ReportAssessment> {
    const session = await getValidSession();
    if (!session) throw new Error("Sign in to view your report assessment.");
    const value = await request<ReportAssessment | null>("rpc/read_report_assessment", { method: "POST", body: JSON.stringify({ p_report_id: reportId }) }, session.accessToken);
    if (!value || value.reportId !== reportId || !["queued", "reviewing", "complete", "unavailable", "expired"].includes(value.state)) {
      throw new Error("Your report assessment is not available.");
    }
    if (value.state === "complete" ?
      !["low", "medium", "high", "unknown"].includes(value.risk ?? "") || typeof value.model !== "string" || !/^gemini-[a-z0-9.-]{1,80}$/.test(value.model) || typeof value.assessedAt !== "string" || !Number.isFinite(Date.parse(value.assessedAt)) :
      value.risk !== null || value.model !== null || value.assessedAt !== null) {
      throw new Error("KNOGO could not read the report assessment.");
    }
    if (value.reason !== null && !["quota","disabled","setup","attempts","notice"].includes(value.reason) || value.retryAt !== null && (typeof value.retryAt !== "string" || !Number.isFinite(Date.parse(value.retryAt)))) throw new Error("KNOGO could not read the report assessment.");
    const current = await sessionStorage.read();
    if (current?.userId !== session.userId) throw new Error("Your account changed. Check the report assessment again.");
    return { reportId: value.reportId, state: value.state, risk: value.risk, model: value.model, assessedAt: value.assessedAt, reason: value.reason, retryAt: value.retryAt };
  }

  async function readVenueAccess(placeId: string): Promise<VenueAccess> {
    const session = await getValidSession();
    if (!session) throw new Error("Sign in before managing a venue.");
    const result = await request<VenueAccess>("rpc/read_venue_access", { method: "POST", body: JSON.stringify({ p_place_id: placeId }) }, session.accessToken);
    if (!result || typeof result.verified !== "boolean" || (result.verified && (!result.verifiedAt || !result.expiresAt || !Number.isFinite(Date.parse(result.verifiedAt)) || !Number.isFinite(Date.parse(result.expiresAt))))) throw new Error("Could not check venue access.");
    return result;
  }

  async function venueClaim(body: Record<string, string>): Promise<Record<string, unknown>> {
    const current = requireConfig();
    if (!config.venueClaimUrl) throw new Error("Venue phone verification is not configured. Community reports remain available.");
    const session = await getValidSession();
    if (!session) throw new Error("Sign in before claiming a venue.");
    return withRequestTimeout(async (signal) => {
      const response = await fetch(config.venueClaimUrl!, { method: "POST", signal, headers: { apikey: current.publishableKey, Authorization: `Bearer ${session.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error(await readError(response, "Venue verification unavailable."));
      return await response.json() as Record<string, unknown>;
    });
  }

  async function startVenueClaim(placeId: string, channel: "sms" | "voice") {
    const result = await venueClaim({ action: "start", placeId, channel });
    if (typeof result.challengeId !== "string" || typeof result.phoneHint !== "string") throw new Error("KNOGO did not receive a venue challenge.");
    return { challengeId: result.challengeId, phoneHint: result.phoneHint };
  }

  async function verifyVenueClaim(challengeId: string, code: string) {
    if (!/^\d{6}$/.test(code)) throw new Error("Enter the six digits from the venue code.");
    const result = await venueClaim({ action: "verify", challengeId, code });
    if (result.verified !== true) throw new Error("Venue verification was not accepted.");
  }

  async function publishVenueUpdate(placeId: string, answer: ConfirmationAnswer, dispute: boolean) {
    const session = await getValidSession();
    if (!session) throw new Error("Sign in before publishing a venue update.");
    const result = await request<string>("rpc/publish_venue_update", { method: "POST", body: JSON.stringify({ p_place_id: placeId, p_check_type: answer.type, p_value: answer.value, p_dispute: dispute }) }, session.accessToken);
    if (typeof result !== "string" || !result) throw new Error("KNOGO did not receive an update result.");
    return result;
  }

  async function fetchPlace(placeId: string): Promise<Place | null> {
    const encodedId = encodeURIComponent(placeId);
    const rows = await request<SupabasePlaceRow[]>(`places?select=*&id=eq.${encodedId}&is_active=eq.true&limit=1`);
    const place = rows[0];
    if (!place) return null;

    const [regions, groups, hours, statuses] = await Promise.all([
      request<SupabaseRegionRow[]>(`regions?select=*&id=eq.${encodeURIComponent(place.region_id)}&limit=1`),
      place.group_id
        ? request<SupabasePlaceGroupRow[]>(`place_groups?select=*&id=eq.${encodeURIComponent(place.group_id)}&is_active=eq.true&limit=1`)
        : Promise.resolve([]),
      request<SupabaseHoursRow[]>(`place_hours?select=*&place_id=eq.${encodedId}&order=sort_order.asc`),
      request<SupabaseLiveStatusRow[]>(`current_live_statuses?select=*&place_id=eq.${encodedId}&limit=1`)
    ]);

    return mapSupabasePlace({
      place,
      region: regions[0],
      group: groups[0],
      hours,
      liveStatus: statuses[0]
    });
  }

  async function fetchPlaceData(): Promise<{ places: Place[]; groups: PlaceGroup[] }> {
    const places = await requestAll<SupabasePlaceRow>("places?select=*&is_active=eq.true&order=name.asc,id.asc");
    const [groups, regions, hours, statuses] = await Promise.all([
      requestAll<SupabasePlaceGroupRow>("place_groups?select=*&is_active=eq.true&order=name.asc,id.asc"),
      requestAll<SupabaseRegionRow>("regions?select=*&order=id.asc"),
      requestAll<SupabaseHoursRow>("place_hours?select=*&order=place_id.asc,hours_type.asc,day_of_week.asc"),
      requestAll<SupabaseLiveStatusRow>("current_live_statuses?select=*&order=place_id.asc")
    ]);
    const groupsById = new Map(groups.map((group) => [group.id, group]));
    const regionsById = new Map(regions.map((region) => [region.id, region]));
    const hoursByPlace = new Map<string, SupabaseHoursRow[]>();
    const statusesByPlace = new Map(statuses.map((status) => [status.place_id, status]));
    for (const row of hours) hoursByPlace.set(row.place_id, [...(hoursByPlace.get(row.place_id) ?? []), row]);
    const mappedPlaces = places.map((place) =>
      mapSupabasePlace({
        place,
        region: regionsById.get(place.region_id),
        group: place.group_id ? groupsById.get(place.group_id) : undefined,
        hours: hoursByPlace.get(place.id) ?? [],
        liveStatus: statusesByPlace.get(place.id)
      })
    );
    const placesByGroup = new Map<string, SupabasePlaceRow[]>();
    for (const place of places) {
      if (place.group_id) placesByGroup.set(place.group_id, [...(placesByGroup.get(place.group_id) ?? []), place]);
    }
    return {
      places: mappedPlaces,
      groups: groups.map((group) => mapSupabasePlaceGroup({ group, branches: placesByGroup.get(group.id) ?? [] }))
    };
  }

  async function fetchPlaces(): Promise<Place[]> {
    return (await fetchPlaceData()).places;
  }

  async function fetchPlaceGroups(): Promise<PlaceGroup[]> {
    return (await fetchPlaceData()).groups;
  }

  return {
    hasConfig,
    readSession: restoreSession,
    clearSession: sessionStorage.clear,
    sendEmailLink,
    verifyEmailCode,
    completeEmailLink,
    signInWithEmail,
    signInAsTester,
    requestPasswordRecovery,
    updatePassword,
    signUpWithEmail,
    registerWithEmail,
    refreshSession,
    signOut,
    fetchPlaceData,
    fetchPlaces,
    fetchPlace,
    fetchPlaceGroups,
    submitConfirmations,
    readReportReviewNotice,
    acceptReportReviewNotice,
    readReportAssessment,
    readVenueAccess,
    startVenueClaim,
    verifyVenueClaim,
    publishVenueUpdate
  };
}
