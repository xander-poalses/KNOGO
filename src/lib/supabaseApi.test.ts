import { afterEach, describe, expect, it, vi } from "vitest";
import { createSupabaseApi, type SupabaseSession } from "@knogo/core";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...(Array.isArray(body) ? { "Content-Range": `*/${body.length}` } : {}) } });
}

function createHarness(initialSession: SupabaseSession | null = null, venueClaimUrl?: string) {
  let session = initialSession;
  const storage = {
    read: vi.fn(async () => session),
    write: vi.fn(async (next: SupabaseSession) => { session = next; }),
    clear: vi.fn(async () => { session = null; })
  };
  return { api: createSupabaseApi({ url: "https://test.supabase.co", publishableKey: "publishable", sessionStorage: storage, venueClaimUrl }), storage };
}

const authResponse = {
  access_token: "access",
  refresh_token: "refresh",
  expires_in: 3600,
  user: { id: "user-1", email: "person@example.com" }
};

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("report review notice", () => {
  const session: SupabaseSession = { accessToken: "access", refreshToken: "refresh", userId: "user-1", email: "person@example.test", expiresAt: Math.floor(Date.now() / 1000) + 3600 };
  it("reads and accepts only through the signed-in account RPC", async () => {
    const { api } = createHarness(session);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response({ version: "2026-10-19", accepted: false }))
      .mockResolvedValueOnce(response({ version: "2026-10-19", accepted: true }));
    expect(await api.readReportReviewNotice()).toEqual({ version: "2026-10-19", accepted: false });
    expect(await api.acceptReportReviewNotice({ version: "2026-10-19", adultConfirmed: true })).toEqual({ version: "2026-10-19", accepted: true });
    expect(JSON.parse(fetchMock.mock.calls[1][1]!.body as string)).toEqual({ p_version: "2026-10-19", p_adult_confirmed: true });
    expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({ Authorization: "Bearer access" });
  });
  it("does not acknowledge without sign-in or adult confirmation", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(createHarness().api.readReportReviewNotice()).rejects.toThrow("Sign in");
    await expect(createHarness(session).api.acceptReportReviewNotice({ version: "2026-10-19", adultConfirmed: false })).rejects.toThrow("18");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([null, { version: "old", accepted: true }, { version: "2026-10-19", accepted: "yes" }])("rejects a malformed notice %j", async value => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response(value));
    await expect(createHarness(session).api.readReportReviewNotice()).rejects.toThrow("notice");
  });
  it("rejects an acceptance response that did not save", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ version: "2026-10-19", accepted: false }));
    await expect(createHarness(session).api.acceptReportReviewNotice({ version: "2026-10-19", adultConfirmed: true })).rejects.toThrow("notice");
  });
  it("discards notice responses when the account changes during the request", async () => {
    const {api,storage}=createHarness(session);
    let finish!:(value:Response)=>void;
    vi.spyOn(globalThis,"fetch").mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
    const read=api.readReportReviewNotice();
    await vi.waitFor(()=>expect(globalThis.fetch).toHaveBeenCalledOnce());
    await storage.write({...session,userId:"account-b"});
    finish(response({version:"2026-10-19",accepted:true}));
    await expect(read).rejects.toThrow("account changed");
  });
});

describe("report assessment receipts", () => {
  const reportId = "10000000-0000-0000-0000-000000000001";
  const session: SupabaseSession = { accessToken: "access", refreshToken: "refresh", userId: "user-1", email: "person@example.test", expiresAt: Math.floor(Date.now() / 1000) + 3600 };
  it("reads the receipt with an account session", async () => {
    const { api } = createHarness(session);
    const receipt = { reportId, state: "complete", risk: "low", model: "gemini-3.5-flash-lite", assessedAt: "2026-10-09T12:00:00Z", reason: null, retryAt: null };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(response(receipt));
    expect(await api.readReportAssessment(reportId)).toEqual(receipt);
    expect(fetchMock).toHaveBeenCalledWith("https://test.supabase.co/rest/v1/rpc/read_report_assessment", expect.objectContaining({ method: "POST", body: JSON.stringify({ p_report_id: reportId }), headers: expect.objectContaining({ Authorization: "Bearer access" }) }));
  });
  it("does not read a receipt without sign-in", async () => {
    const { api } = createHarness();
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(api.readReportAssessment(reportId)).rejects.toThrow("Sign in");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("validates wait reasons and retry timestamps", async () => {
    const {api}=createHarness(session);
    const value={reportId,state:"queued",risk:null,model:null,assessedAt:null,reason:"quota",retryAt:"2026-10-19T14:00:00Z"};
    const fetcher=vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(response(value)).mockResolvedValueOnce(response({...value,reason:"provider-secret"})).mockResolvedValueOnce(response({...value,retryAt:"invalid"}));
    expect(await api.readReportAssessment(reportId)).toEqual(value);
    await expect(api.readReportAssessment(reportId)).rejects.toThrow("assessment");
    await expect(api.readReportAssessment(reportId)).rejects.toThrow("assessment");
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it.each([null, { reportId, state: "made-up" }, { reportId, state: "complete", risk: "low", model: null, assessedAt: null }, { reportId: "other", state: "queued", risk: null, model: null, assessedAt: null }])("rejects unavailable or malformed receipts: %j", async value => {
    const { api } = createHarness(session);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response(value));
    await expect(api.readReportAssessment(reportId)).rejects.toThrow("assessment");
  });
});

describe("Supabase API authentication", () => {
  it("requests recovery with a redirect but never stores an account session", async () => {
    const { api, storage } = createHarness();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(response({}));
    await api.requestPasswordRecovery("person@example.com", "knogo://auth/callback?intent=recovery");
    expect(fetchMock.mock.calls[0][0]).toBe("https://test.supabase.co/auth/v1/recover?redirect_to=knogo%3A%2F%2Fauth%2Fcallback%3Fintent%3Drecovery");
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toEqual({ email: "person@example.com" });
    expect(storage.write).not.toHaveBeenCalled();
  });
  it("updates the password using the session and PUT", async () => {
    const { api } = createHarness({ accessToken: "access", refreshToken: "refresh", userId: "user-1", email: "person@example.test", expiresAt: Math.floor(Date.now() / 1000) + 3600 });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ id: "user-1" }));
    await api.updatePassword("new-password");
    expect(fetchMock).toHaveBeenCalledWith("https://test.supabase.co/auth/v1/user", expect.objectContaining({ method: "PUT", body: JSON.stringify({ password: "new-password" }), headers: expect.objectContaining({ Authorization: "Bearer access" }) }));
  });
  it("does not update a password without a session", async () => {
    const { api } = createHarness();
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(api.updatePassword("new-password")).rejects.toMatchObject({ code: "session_not_found" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([204, 503])("keeps a replacement sign-in when an earlier logout returns %s", async (status) => {
    const initial: SupabaseSession = { accessToken: "old", refreshToken: "old-refresh", userId: "user-1", email: "person@example.com", expiresAt: Math.floor(Date.now() / 1000) + 3600 };
    const { api, storage } = createHarness(initial);
    let finishLogout!: (value: Response) => void;
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { finishLogout = resolve; }))
      .mockResolvedValueOnce(response(authResponse));
    const logout = api.signOut().then(() => null, (error: Error) => error);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const replacement = await api.signInWithEmail("person@example.com", "test-password");
    finishLogout(status === 204 ? new Response(null, { status }) : response({ message: "Auth unavailable" }, status));
    const outcome = await logout;
    if (status === 503) expect(outcome?.message).toBe("Auth unavailable");
    else expect(outcome).toBeNull();
    expect(await storage.read()).toEqual(replacement);
    expect(storage.clear).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls[0][0]).toBe("https://test.supabase.co/auth/v1/logout?scope=local");
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ Authorization: "Bearer old" });
  });

  it("clears the signed-out session even when the logout request fails", async () => {
    const initial: SupabaseSession = { accessToken: "old", refreshToken: "old-refresh", userId: "user-1", email: "person@example.com", expiresAt: 0 };
    const { api, storage } = createHarness(initial);
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("Network request failed"));
    await expect(api.signOut()).rejects.toThrow("Network request failed");
    expect(await storage.read()).toBeNull();
    expect(storage.clear).toHaveBeenCalledOnce();
  });

  it("shares one refresh request across callers", async () => {
    const expired: SupabaseSession = { accessToken: "old", refreshToken: "old-refresh", userId: "user-1", email: "person@example.com", expiresAt: 0 };
    const { api, storage } = createHarness(expired);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(response(authResponse));
    const results = await Promise.all([api.refreshSession(), api.refreshSession(), api.readSession()]);
    expect(results.map((session) => session?.accessToken)).toEqual(["access", "access", "access"]);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(storage.write).toHaveBeenCalledOnce();
  });

  it("does not restore a session when a refresh finishes after sign-out", async () => {
    const expired: SupabaseSession = { accessToken: "old", refreshToken: "old-refresh", userId: "user-1", email: "person@example.com", expiresAt: 0 };
    const { api, storage } = createHarness(expired);
    let finishRefresh!: (value: Response) => void;
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { finishRefresh = resolve; }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const refreshing = api.refreshSession();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    await api.signOut();
    finishRefresh(response(authResponse));
    expect(await refreshing).toBeNull();
    expect(await storage.read()).toBeNull();
    expect(storage.write).not.toHaveBeenCalled();
  });

  it("does not clear a replacement session when an older refresh fails", async () => {
    const expired: SupabaseSession = { accessToken: "old", refreshToken: "old-refresh", userId: "user-1", email: "person@example.com", expiresAt: 0 };
    const { api, storage } = createHarness(expired);
    let finishRefresh!: (value: Response) => void;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementationOnce(() => new Promise<Response>((resolve) => { finishRefresh = resolve; }));
    const refreshing = api.refreshSession();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const replacement = { ...expired, accessToken: "replacement", refreshToken: "replacement-refresh" };
    await storage.write(replacement);
    finishRefresh(response({ message: "Invalid refresh token" }, 400));
    expect(await refreshing).toEqual(replacement);
    expect(storage.clear).not.toHaveBeenCalled();
  });

  it("signs in with a password and stores only the returned session", async () => {
    const { api, storage } = createHarness();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response(authResponse));
    const session = await api.signInWithEmail("person@example.com", "test-password");
    expect(fetchMock.mock.calls[0][0]).toBe("https://test.supabase.co/auth/v1/token?grant_type=password");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ email: "person@example.com", password: "test-password" });
    expect(storage.write).toHaveBeenCalledWith(session);
    expect(JSON.stringify(storage.write.mock.calls)).not.toContain("test-password");
  });
  it("treats confirmation-required registration as pending without creating a session", async () => {
    const { api, storage } = createHarness();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response({ id: "user-1", email: "person@example.com" }));
    expect(await api.registerWithEmail("person@example.com", "test-password", "knogo://auth/callback")).toBeNull();
    expect(fetchMock.mock.calls[0][0]).toBe("https://test.supabase.co/auth/v1/signup?redirect_to=knogo%3A%2F%2Fauth%2Fcallback");
    expect(storage.write).not.toHaveBeenCalled();
  });
  it("stores a registration session only if Supabase returned one", async () => {
    const { api, storage } = createHarness();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response(authResponse));
    expect((await api.registerWithEmail("person@example.com", "test-password", "knogo://auth/callback"))?.userId).toBe("user-1");
    expect(storage.write).toHaveBeenCalledOnce();
  });
  it("keeps the session after a network or server refresh failure", async () => {
    const expired: SupabaseSession = { accessToken: "old", refreshToken: "refresh", userId: "user-1", email: "person@example.com", expiresAt: 0 };
    const { api, storage } = createHarness(expired);
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("Network request failed"))
      .mockResolvedValueOnce(response({ message: "Auth unavailable" }, 503));
    await expect(api.refreshSession()).rejects.toThrow("Network request failed");
    await expect(api.refreshSession()).rejects.toThrow("Auth unavailable");
    expect(storage.clear).not.toHaveBeenCalled();
  });

  it("rejects missing or expired email-link credentials without storing a session", async () => {
    const { api, storage } = createHarness();
    await expect(api.completeEmailLink("knogo://auth/callback")).rejects.toThrow("invalid or has expired");
    await expect(api.completeEmailLink("knogo://auth/callback#error_description=Link%20expired")).rejects.toThrow("Link expired");
    expect(storage.write).not.toHaveBeenCalled();
  });
  it("sends a magic link to the supplied callback and completes its session", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(response({ id: "user-1", email: "person@example.com" }));
    const { api, storage } = createHarness();

    await api.sendEmailLink("person@example.com", "knogo://auth/callback");
    const session = await api.completeEmailLink("knogo://auth/callback#access_token=access&refresh_token=refresh&expires_in=3600");

    expect(fetchMock.mock.calls[0][0]).toBe("https://test.supabase.co/auth/v1/otp?redirect_to=knogo%3A%2F%2Fauth%2Fcallback");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ email: "person@example.com", create_user: true });
    expect(fetchMock.mock.calls[1][0]).toBe("https://test.supabase.co/auth/v1/user");
    expect(session.email).toBe("person@example.com");
    expect(session.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(storage.write).toHaveBeenCalledOnce();
  });

  it("refreshes an expired session and clears an invalid refresh token", async () => {
    const expired: SupabaseSession = { accessToken: "old", refreshToken: "old-refresh", userId: "user-1", email: "person@example.com", expiresAt: 0 };
    const success = createHarness(expired);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response(authResponse));
    expect((await success.api.readSession())?.accessToken).toBe("access");

    const invalid = createHarness(expired);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response({ message: "Invalid refresh token" }, 400));
    await expect(invalid.api.refreshSession()).rejects.toThrow("Invalid refresh token");
    expect(invalid.storage.clear).toHaveBeenCalledOnce();
  });

  it("clears local storage when Supabase signs out with no response body", async () => {
    const current: SupabaseSession = { accessToken: "access", refreshToken: "refresh", userId: "user-1", email: "person@example.com", expiresAt: Math.floor(Date.now() / 1000) + 3600 };
    const { api, storage } = createHarness(current);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 204 }));

    await api.signOut();

    expect(storage.clear).toHaveBeenCalledOnce();
  });
});

describe("Supabase API confirmations", () => {
  it("ends a stalled submission without retrying or claiming success", async () => {
    vi.useFakeTimers();
    const session: SupabaseSession = { accessToken: "access", refreshToken: "refresh", userId: "user-1", email: "person@example.com", expiresAt: Math.floor(Date.now() / 1000) + 3600 };
    const { api } = createHarness(session);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise<Response>(() => {}));
    const submitted = api.submitConfirmations({ placeId: "place-1", reportSource: "phone", answers: [{ type: "open_status", value: "open" }] });
    const checked = expect(submitted).rejects.toThrow("it may have reached Supabase");
    await vi.advanceTimersByTimeAsync(20_000);
    await checked;
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("ends a stalled sign-in email request", async () => {
    vi.useFakeTimers();
    const { api } = createHarness();
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise<Response>(() => {}));
    const checked = expect(api.sendEmailLink("person@example.com", "knogo://auth/callback")).rejects.toThrow("within 20 seconds");
    await vi.advanceTimersByTimeAsync(20_000);
    await checked;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("submits one report batch with provenance and returns the consensus outcome", async () => {
    const session: SupabaseSession = { accessToken: "access", refreshToken: "refresh", userId: "user-1", email: "person@example.com", expiresAt: Math.floor(Date.now() / 1000) + 3600 };
    const { api } = createHarness(session);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response([{ report_id: "report-1", outcome: "pending", accepted_signals: [], confirmations: [
      { id: "1", place_id: "place-1", user_id: "user-1", confirmation_type: "kitchen_status", value: "yes", created_at: "2026-08-26T10:00:00Z", location_verified: false },
      { id: "2", place_id: "place-1", user_id: "user-1", confirmation_type: "busy_level", value: "normal", created_at: "2026-08-26T10:00:00Z", location_verified: false }
    ] }]));

    const result = await api.submitConfirmations({ placeId: "place-1", reportSource: "phone", answers: [{ type: "kitchen_status", value: "yes" }, { type: "busy_level", value: "normal" }] });
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as Record<string, unknown>;

    expect(fetchMock.mock.calls[0][0]).toBe("https://test.supabase.co/rest/v1/rpc/submit_status_report");
    expect(body).toMatchObject({ p_place_id: "place-1", p_report_source: "phone", p_source_url: null });
    expect(result.outcome).toBe("pending");
    expect(result.confirmations).toHaveLength(2);
    expect(result.confirmations.every((item) => item.locationVerified === false)).toBe(true);
  });

  it("requires a source URL for online reports", async () => {
    const session: SupabaseSession = { accessToken: "access", refreshToken: "refresh", userId: "user-1", email: "person@example.com", expiresAt: Math.floor(Date.now() / 1000) + 3600 };
    const { api } = createHarness(session);
    await expect(api.submitConfirmations({ placeId: "place-1", reportSource: "online", answers: [{ type: "open_status", value: "open" }] })).rejects.toThrow("Add the page");
  });
});

describe("venue access client", () => {
  const session: SupabaseSession = { accessToken: "caller-token", refreshToken: "refresh", userId: "user-1", email: "person@example.com", expiresAt: Math.floor(Date.now() / 1000) + 3600 };
  it("keeps disabled claims disabled without making requests", async () => {
    const { api } = createHarness(session);
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(api.startVenueClaim("place-1", "sms")).rejects.toThrow("not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("sends the caller token without account or phone overrides", async () => {
    const { api } = createHarness(session, "https://test.supabase.co/functions/v1/venue-claim");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response({ challengeId: "challenge-1", phoneHint: "Ending 0123" })).mockResolvedValueOnce(response({ verified: true }));
    await expect(api.startVenueClaim("place-1", "voice")).resolves.toEqual({ challengeId: "challenge-1", phoneHint: "Ending 0123" });
    await api.verifyVenueClaim("challenge-1", "123456");
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ Authorization: "Bearer caller-token", apikey: "publishable" });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ action: "start", placeId: "place-1", channel: "voice" });
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ action: "verify", challengeId: "challenge-1", code: "123456" });
  });
  it("shows endpoint errors and rejects missing verification approval", async () => {
    const { api } = createHarness(session, "https://test.supabase.co/functions/v1/venue-claim");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response({ error: "Delivery not configured." }, 503)).mockResolvedValueOnce(response({ verified: false }));
    await expect(api.startVenueClaim("place-1", "sms")).rejects.toThrow("Delivery not configured.");
    await expect(api.verifyVenueClaim("challenge-1", "123456")).rejects.toThrow("not accepted");
    await expect(api.verifyVenueClaim("challenge-1", "abc")).rejects.toThrow("six digits");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("reads only caller access and publishes a statement using their JWT", async () => {
    const { api } = createHarness(session);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response({ verified: false, verifiedAt: null, expiresAt: null })).mockResolvedValueOnce(response("update-1"));
    expect((await api.readVenueAccess("place-1")).verified).toBe(false);
    expect(await api.publishVenueUpdate("place-1", { type: "kitchen_status", value: "no" }, true)).toBe("update-1");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ p_place_id: "place-1" });
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ p_place_id: "place-1", p_check_type: "kitchen_status", p_value: "no", p_dispute: true });
    expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({ Authorization: "Bearer caller-token" });
  });
  it("requires sign-in for updates and rejects malformed access responses", async () => {
    const absent = createHarness();
    await expect(absent.api.publishVenueUpdate("place-1", { type: "open_status", value: "open" }, false)).rejects.toThrow("Sign in");
    const { api } = createHarness(session);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response({ verified: true, verifiedAt: "bad", expiresAt: "bad" }));
    await expect(api.readVenueAccess("place-1")).rejects.toThrow("Could not check");
  });
});

describe("Supabase API place loading", () => {
  it("loads every page even when the server caps pages below the requested limit", async () => {
    const { api } = createHarness();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
      const url = new URL(String(input));
      const offset = Number(url.searchParams.get("offset"));
      const rows = url.pathname.endsWith("/regions")
        ? [{ id: "region-1", name: "Brooklyn", slug: "brooklyn", region_type: "suburb_area", parent_id: null, sort_order: 1 }, { id: "region-2", name: "Menlyn", slug: "menlyn", region_type: "suburb_area", parent_id: null, sort_order: 2 }]
        : [];
      return new Response(JSON.stringify(rows.slice(offset, offset + 1)), { headers: { "Content-Range": `*/${rows.length}` } });
    });
    expect(await api.fetchPlaceData()).toEqual({ places: [], groups: [] });
    const regions = fetchMock.mock.calls.filter(([url]) => String(url).includes("/regions?"));
    expect(regions).toHaveLength(2);
    expect(String(regions[1][0])).toContain("offset=1");
    expect(regions[0][1]?.headers).toMatchObject({ Prefer: "count=exact" });
  });
  const placeRow = {
    id: "place-1",
    slug: "test-place",
    name: "Test Place",
    category_id: "restaurant",
    region_id: "region-1",
    address: "1 Test Road",
    latitude: -25.7,
    longitude: 28.2,
    phone: null,
    website: null,
    menu_url: null,
    features: [],
    tags: ["pizza"],
    is_active: true,
    group_id: null,
    image_url: null
  };

  it("fetches only the requested place and its related records", async () => {
    const { api } = createHarness();
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response([placeRow]))
      .mockResolvedValueOnce(response([{ id: "region-1", name: "Brooklyn", slug: "brooklyn", region_type: "suburb_area", parent_id: null, sort_order: 1 }]))
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response([]));

    const place = await api.fetchPlace("place-1");

    expect(place?.name).toBe("Test Place");
    expect(place?.area).toBe("Brooklyn");
    expect(String(fetchMock.mock.calls[0][0])).toContain("places?select=*&id=eq.place-1");
    expect(fetchMock.mock.calls).toHaveLength(4);
  });

  it("rejects dataset failures so callers preserve their cache", async () => {
    const { api } = createHarness();
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response([placeRow]))
      .mockResolvedValueOnce(response({ message: "groups unavailable" }, 503))
      .mockResolvedValueOnce(response({ message: "regions unavailable" }, 503))
      .mockResolvedValueOnce(response({ message: "hours unavailable" }, 503))
      .mockResolvedValueOnce(response({ message: "statuses unavailable" }, 503));

    await expect(api.fetchPlaceData()).rejects.toThrow("groups unavailable");
  });
});
