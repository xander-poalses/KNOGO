import { afterEach, describe, expect, it, vi } from "vitest";
import { createVenueClaimHandler, type VenueDelivery } from "../../supabase/functions/_shared/venueClaims";

const userId = "11111111-1111-4111-8111-111111111111";
const challengeId = "22222222-2222-4222-8222-222222222222";
const attemptId = "33333333-3333-4333-8333-333333333333";
const heldPhone = "+27125550123";
const start = { action: "start", placeId: "place-1", channel: "sms" };
const verify = { action: "verify", challengeId, code: "123456" };

function harness(deliveryEnabled = true) {
  const authenticate = vi.fn(async (): Promise<{ id: string; is_anonymous?: boolean } | null> => ({ id: userId }));
  const rpc = vi.fn(async (name: string, _args: Record<string, unknown>): Promise<unknown> => {
    if (name === "start_venue_claim") return { challengeId, phone: heldPhone, channel: "sms" };
    if (name === "begin_venue_claim_verification") return { attemptId, phone: heldPhone, reference: "provider-reference" };
    return true;
  });
  const send = vi.fn(async () => ({ reference: "provider-reference" }));
  const check = vi.fn(async () => true);
  const delivery: VenueDelivery = { send, verify: check };
  const handler = createVenueClaimHandler({ origins: ["https://knogo.example"], authenticate, rpc, delivery: deliveryEnabled ? delivery : null });
  const request = (body: unknown, headers: Record<string, string> = {}) => handler(new Request("https://edge.example/venue-claim", {
    method: "POST", headers: { Authorization: "Bearer caller-token", ...headers }, body: JSON.stringify(body)
  }));
  return { request, handler, authenticate, rpc, send, check };
}

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("venue claim HTTP boundary", () => {
  it("rejects callers without a token, anonymous accounts and invalidated accounts", async () => {
    const h = harness();
    expect((await h.handler(new Request("https://edge.example/venue-claim", { method: "POST", body: JSON.stringify(start) }))).status).toBe(401);
    expect(h.authenticate).not.toHaveBeenCalled();
    h.authenticate.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: userId, is_anonymous: true });
    expect((await h.request(start)).status).toBe(401);
    expect((await h.request(start)).status).toBe(401);
    expect(h.rpc).not.toHaveBeenCalled();
    expect(h.send).not.toHaveBeenCalled();
  });

  it("rejects user, phone, verification and provider-reference overrides", async () => {
    const h = harness();
    for (const addition of [{ userId }, { phone: "+27825550123" }, { verified: true }, { reference: "own-reference" }]) {
      expect((await h.request({ ...start, ...addition })).status).toBe(400);
      expect((await h.request({ ...verify, ...addition })).status).toBe(400);
    }
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it("does not reserve challenges when delivery is disabled", async () => {
    const h = harness(false);
    expect((await h.request(start)).status).toBe(503);
    expect((await h.request(verify)).status).toBe(503);
    expect(h.rpc).not.toHaveBeenCalled();
    expect(h.send).not.toHaveBeenCalled();
  });

  it("uses the Auth account and held number, returning only a phone hint", async () => {
    const h = harness();
    const response = await h.request({ ...start, channel: "voice" });
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(h.authenticate).toHaveBeenCalledWith("caller-token");
    expect(h.rpc).toHaveBeenCalledWith("start_venue_claim", { p_place_id: "place-1", p_user_id: userId, p_channel: "voice" });
    expect(h.send).toHaveBeenCalledWith({ phone: heldPhone, channel: "voice" });
    expect(result.phoneHint).toBe("Ending 0123");
    expect(JSON.stringify(result)).not.toContain(heldPhone);
    expect(JSON.stringify(result)).not.toContain("provider-reference");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("records delivery failure without leaking provider messages", async () => {
    const h = harness();
    h.send.mockRejectedValueOnce(new Error(`secret ${heldPhone}`));
    const response = await h.request(start);
    expect(response.status).toBe(503);
    expect(h.rpc).toHaveBeenCalledWith("attach_venue_claim_delivery", { p_challenge_id: challengeId, p_user_id: userId, p_reference: null });
    expect(await response.text()).not.toContain(heldPhone);
  });

  it("finishes mismatches and provider failures as unverified", async () => {
    const h = harness();
    h.check.mockResolvedValueOnce(false).mockRejectedValueOnce(new Error("provider_secret"));
    expect((await h.request(verify)).status).toBe(400);
    expect((await h.request(verify)).status).toBe(503);
    expect(h.rpc.mock.calls.filter(([name]) => name === "finish_venue_claim_verification").every(([, args]) => args.p_verified === false)).toBe(true);
    expect(h.check).toHaveBeenCalledWith({ phone: heldPhone, reference: "provider-reference", code: "123456" });
  });

  it("requires both provider approval and database authorisation", async () => {
    const h = harness();
    h.rpc.mockImplementation(async (name) => name === "begin_venue_claim_verification" ? { attemptId, phone: heldPhone, reference: "provider-reference" } : false);
    expect((await h.request(verify)).status).toBe(400);
    h.rpc.mockImplementation(async (name) => name === "begin_venue_claim_verification" ? { attemptId, phone: heldPhone, reference: "provider-reference" } : true);
    const response = await h.request(verify);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ verified: true, notice: expect.stringContaining("does not prove legal ownership") });
  });

  it("rejects origins, methods, oversized bodies and malformed codes", async () => {
    const h = harness();
    expect((await h.request(start, { Origin: "https://other.example" })).status).toBe(403);
    expect((await h.handler(new Request("https://edge.example/venue-claim"))).status).toBe(405);
    expect((await h.request({ ...start, extra: "x".repeat(4100) })).status).toBe(413);
    expect((await h.request({ ...verify, code: "abcdef" })).status).toBe(400);
    const response = await h.request(start, { Origin: "https://knogo.example" });
    expect(response.headers.get("access-control-allow-origin")).toBe("https://knogo.example");
  });

  it("times out a provider check and releases it without granting access", async () => {
    vi.useFakeTimers();
    const h = harness();
    h.check.mockImplementation(() => new Promise<boolean>(() => {}));
    const result = h.request(verify);
    await vi.advanceTimersByTimeAsync(10_000);
    expect((await result).status).toBe(503);
    expect(h.rpc).toHaveBeenCalledWith("finish_venue_claim_verification", { p_challenge_id: challengeId, p_user_id: userId, p_attempt_id: attemptId, p_verified: false });
    expect(vi.getTimerCount()).toBe(0);
  });
});
