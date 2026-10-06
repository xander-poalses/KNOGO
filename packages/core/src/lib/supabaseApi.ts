import type { ConfirmationType, Place, PlaceGroup, ReportSource, ReportSubmissionResult } from "../types/place";
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

export type SupabaseSession = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  expiresAt: number;
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
  user?: { id: string; email?: string };
};

type AuthUserResponse = { id?: string; email?: string };

type SupabaseError = { error_description?: string; msg?: string; message?: string; error_code?: string; error?: string };

class AuthRequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export function createSupabaseApi(config: {
  url?: string;
  publishableKey?: string;
  venueClaimUrl?: string;
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

  async function authRequest(path: string, body: Record<string, unknown>, accessToken?: string) {
    const current = requireConfig();
    return withRequestTimeout(async (signal) => {
    const response = await fetch(`${current.url}/auth/v1/${path}`, {
      signal,
      method: "POST",
      headers: {
        apikey: current.publishableKey,
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new AuthRequestError(await readError(response, `Supabase Auth failed with ${response.status}`), response.status);
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
      expiresAt: response.expires_at ?? Math.floor(Date.now() / 1000) + (response.expires_in ?? 3600)
    };
  }

  async function request<T>(table: string, init?: RequestInit, accessToken?: string): Promise<T> {
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
    return (await response.json()) as T;
    });
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

  async function signInWithEmail(email: string, password: string) {
    const session = mapAuthResponse(await authRequest("token?grant_type=password", { email, password }), email);
    await sessionStorage.write(session);
    return session;
  }

  async function signUpWithEmail(email: string, password: string) {
    const session = mapAuthResponse(await authRequest("signup", { email, password }), email);
    await sessionStorage.write(session);
    return session;
  }

  async function registerWithEmail(email: string, password: string, redirectTo: string): Promise<SupabaseSession | null> {
    const response = await authRequest(`signup?redirect_to=${encodeURIComponent(redirectTo)}`, { email, password });
    // Confirmation-required sign-up returns an account without session tokens.
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

    const [regionResult, groupResult, hoursResult, statusResult] = await Promise.allSettled([
      request<SupabaseRegionRow[]>(`regions?select=*&id=eq.${encodeURIComponent(place.region_id)}&limit=1`),
      place.group_id
        ? request<SupabasePlaceGroupRow[]>(`place_groups?select=*&id=eq.${encodeURIComponent(place.group_id)}&is_active=eq.true&limit=1`)
        : Promise.resolve([]),
      request<SupabaseHoursRow[]>(`place_hours?select=*&place_id=eq.${encodedId}&order=sort_order.asc`),
      request<SupabaseLiveStatusRow[]>(`current_live_statuses?select=*&place_id=eq.${encodedId}&limit=1`)
    ]);

    return mapSupabasePlace({
      place,
      region: regionResult.status === "fulfilled" ? regionResult.value[0] : undefined,
      group: groupResult.status === "fulfilled" ? groupResult.value[0] : undefined,
      hours: hoursResult.status === "fulfilled" ? hoursResult.value : [],
      liveStatus: statusResult.status === "fulfilled" ? statusResult.value[0] : undefined
    });
  }

  async function fetchPlaceData(): Promise<{ places: Place[]; groups: PlaceGroup[] }> {
    const places = await request<SupabasePlaceRow[]>("places?select=*&is_active=eq.true&order=name.asc");
    const [groupsResult, regionsResult, hoursResult, statusesResult] = await Promise.allSettled([
      request<SupabasePlaceGroupRow[]>("place_groups?select=*&is_active=eq.true&order=name.asc"),
      request<SupabaseRegionRow[]>("regions?select=*"),
      request<SupabaseHoursRow[]>("place_hours?select=*&order=sort_order.asc"),
      request<SupabaseLiveStatusRow[]>("current_live_statuses?select=*")
    ]);
    const groups = groupsResult.status === "fulfilled" ? groupsResult.value : [];
    const regions = regionsResult.status === "fulfilled" ? regionsResult.value : [];
    const hours = hoursResult.status === "fulfilled" ? hoursResult.value : [];
    const statuses = statusesResult.status === "fulfilled" ? statusesResult.value : [];
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
    signUpWithEmail,
    registerWithEmail,
    refreshSession,
    signOut,
    fetchPlaceData,
    fetchPlaces,
    fetchPlace,
    fetchPlaceGroups,
    submitConfirmations,
    readVenueAccess,
    startVenueClaim,
    verifyVenueClaim,
    publishVenueUpdate
  };
}
