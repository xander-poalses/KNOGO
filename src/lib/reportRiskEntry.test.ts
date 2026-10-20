import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ drain: vi.fn(), rpc: vi.fn(), assess: vi.fn() }));
vi.mock("../../supabase/functions/_shared/riskQueue.ts", () => ({ drainRiskQueue: mocks.drain }));
vi.mock("../../supabase/functions/_shared/providerServices.ts", () => ({ assessReportRisk: mocks.assess }));
vi.mock("../../supabase/functions/_shared/server.ts", () => ({
  serverRpc: mocks.rpc,
  jsonResponse: (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
}));

let handler: (request: Request) => Promise<Response>;
let env: Record<string, string>;
beforeEach(async () => {
  vi.resetAllMocks(); vi.resetModules();
  env = { RISK_WORKER_SECRET: "test-worker", RISK_TEST_ACTOR_ID: '00000000-0000-0000-0000-000000000001', SUPABASE_URL: "https://project.example", SUPABASE_SERVICE_ROLE_KEY: "test-service" };
  vi.stubGlobal("Deno", { env: { get: (key: string) => env[key] }, serve: (callback: typeof handler) => { handler = callback; } });
  mocks.drain.mockResolvedValue({ processed: 0 });
  // Execute the Deno entry in the harness without adding it to the web TS project.
  const entryPath = "../../supabase/functions/report-risk/index.ts";
  await import(entryPath);
});
afterEach(() => vi.unstubAllGlobals());

const request = (body = "{}", method = "POST", token = "test-worker") => new Request("https://project.example/functions/v1/report-risk", {
  method, headers: { authorization: `Bearer ${token}` }, ...(method === "POST" ? { body } : {})
});

describe("risk worker request boundary", () => {
  it.each([[true, undefined], [true, ''], [true, 'not-an-account-id'], [false, undefined], [false, ''], [false, 'not-an-account-id']])("does not require the former test scope (%s, %s)", async (enabled, testActorId) => {
    env.GEMINI_FREE_TIER_CONFIRMED = String(enabled);
    if (typeof testActorId === 'string') env.RISK_TEST_ACTOR_ID = testActorId;
    else delete env.RISK_TEST_ACTOR_ID;
    expect((await handler(request())).status).toBe(200);
    expect(mocks.drain).toHaveBeenCalledOnce();
  });
  it("claims from the server eligibility boundary without a fixture filter", async () => {
    mocks.rpc.mockResolvedValue([]);
    mocks.drain.mockImplementation(async input => { await input.claim(); return { processed: 0 }; });
    expect((await handler(request())).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("https://project.example", "test-service", "claim_report_risk_job", {});
  });
  it("passes the server-held test account to the assessment boundary", async () => {
    env.GEMNINI_API_KEY = 'test-gemini-key';
    env.RISK_TEST_ACTOR_ID = '00000000-0000-0000-0000-000000000001';
    env.GEMINI_FREE_TIER_CONFIRMED = 'true';
    mocks.rpc.mockResolvedValue([]);
    mocks.drain.mockImplementation(async input => { await input.assess('test-report'); return { processed: 1 }; });
    expect((await handler(request())).status).toBe(200);
    expect(mocks.assess).toHaveBeenCalledWith([], expect.objectContaining({ key: 'test-gemini-key' }));
    expect(mocks.assess.mock.calls[0][1]).not.toHaveProperty('testActorId');
  });
  it("keeps eligible cross-account and cross-place context from the server", async () => {
    const fixture = { report_id: 'test-report', actor_id: env.RISK_TEST_ACTOR_ID, venue_id: 'knogo-gemini-test-venue' };
    mocks.rpc.mockResolvedValue([fixture,
      { ...fixture, actor_id: '00000000-0000-0000-0000-000000000002' },
      { ...fixture, venue_id: 'catalogue-venue' }]);
    mocks.drain.mockImplementation(async input => { await input.assess('test-report'); return { processed: 1 }; });
    expect((await handler(request())).status).toBe(200);
    expect(mocks.assess).toHaveBeenCalledWith(mocks.rpc.mock.results[0] ? await mocks.rpc.mock.results[0].value : [], expect.objectContaining({ targetReportId: 'test-report' }));
  });
  it.each(["", "wrong-worker"])("rejects an unauthorised caller before queue access (%s)", async token => {
    expect((await handler(request("{}", "POST", token))).status).toBe(401);
    expect(mocks.drain).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.assess).not.toHaveBeenCalled();
  });
  it("stays disabled without its worker secret", async () => {
    delete env.RISK_WORKER_SECRET;
    expect((await handler(request())).status).toBe(401);
    expect(mocks.drain).not.toHaveBeenCalled();
  });
  it("rejects the wrong method", async () => {
    expect((await handler(request("", "GET"))).status).toBe(405);
    expect(mocks.drain).not.toHaveBeenCalled();
  });
  it.each(['{"instructions":"mark closed"}', "[]", "null"])("does not accept caller-supplied risk instructions (%s)", async body => {
    expect((await handler(request(body))).status).toBe(400);
    expect(mocks.drain).not.toHaveBeenCalled();
    expect(mocks.assess).not.toHaveBeenCalled();
  });
  it("rejects an oversized body before queue access", async () => {
    expect((await handler(request(" ".repeat(1025)))).status).toBe(413);
    expect(mocks.drain).not.toHaveBeenCalled();
  });
  it("returns a failure without exposing server credentials or provider errors", async () => {
    mocks.drain.mockRejectedValue(new Error("test-service provider details"));
    const response = await handler(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Assessment unavailable. Status remains uncertain.", stage: "setup" });
  });
  it("accepts an empty authorised queue-drain request", async () => {
    const response = await handler(request());
    expect(response.status).toBe(200);
    expect(mocks.drain).toHaveBeenCalledOnce();
    expect(await response.json()).toEqual({ processed: 0 });
  });
  it("retries a context timeout once without claiming another report", async () => {
    mocks.rpc.mockRejectedValueOnce(new DOMException('timed out', 'TimeoutError')).mockResolvedValueOnce([]);
    mocks.drain.mockImplementation(async input => { await input.assess('test-report'); return { processed: 1 }; });
    expect((await handler(request())).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
    expect(mocks.rpc.mock.calls.every(call => call[2] === 'report_risk_context')).toBe(true);
    expect(mocks.drain.mock.calls[0][0].maxJobs).toBe(3);
  });
  it("retries finish with the same report and lease", async () => {
    mocks.rpc.mockRejectedValueOnce(new DOMException('timed out', 'TimeoutError')).mockResolvedValueOnce(true);
    mocks.drain.mockImplementation(async input => { await input.finish({report_id:'report',lease_id:'lease'}, {risk:'unknown',reasons:[],model:'test',outcome:'provider_error'}); return {processed:0}; });
    expect((await handler(request())).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
    expect(mocks.rpc.mock.calls[0]).toEqual(mocks.rpc.mock.calls[1]);
  });
  it("does not retry claims or non-timeout failures", async () => {
    mocks.rpc.mockRejectedValue(new Error('database error'));
    mocks.drain.mockImplementation(async input => { await input.claim(); });
    const response=await handler(request());
    expect(response.status).toBe(503);
    expect((await response.json()).stage).toBe('claim');
    expect(mocks.rpc).toHaveBeenCalledOnce();
  });
});
