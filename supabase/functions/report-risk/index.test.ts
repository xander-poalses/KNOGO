import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), env: {} as Record<string, string>, handler: null as null | ((request: Request) => Promise<Response>) }));
vi.mock("../_shared/server.ts", () => ({
  serverRpc: mocks.rpc,
  jsonResponse: (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
}));

beforeEach(async () => {
  vi.resetModules(); mocks.rpc.mockReset(); mocks.rpc.mockResolvedValue([]);
  mocks.env = { RISK_WORKER_SECRET: "worker-test-only", RISK_TEST_ACTOR_ID: "00000000-0000-0000-0000-000000000001", SUPABASE_URL: "https://test.example", SUPABASE_SERVICE_ROLE_KEY: "server-test-only" };
  vi.stubGlobal("Deno", { env: { get: (name: string) => mocks.env[name] }, serve: (handler: typeof mocks.handler) => { mocks.handler = handler; } });
  await import("./index.ts");
});
afterEach(() => vi.unstubAllGlobals());

const invoke = () => mocks.handler!(new Request("https://test.example/report-risk", { method: "POST", headers: { authorization: "Bearer worker-test-only" }, body: "{}" }));

describe("report worker test boundary", () => {
  it("claims only the configured account at the test venue", async () => {
    const response = await invoke();
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith("https://test.example", "server-test-only", "claim_report_risk_job", {
      p_actor_id: mocks.env.RISK_TEST_ACTOR_ID, p_place_id: "knogo-gemini-test-venue"
    });
  });
  it.each([undefined, "", "not-a-uuid"])("does not touch the queue with an invalid test scope (%j)", async (actor) => {
    if (actor === undefined) delete mocks.env.RISK_TEST_ACTOR_ID;
    else mocks.env.RISK_TEST_ACTOR_ID = actor;
    expect((await invoke()).status).toBe(503);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects requests without the worker credential", async () => {
    expect((await mocks.handler!(new Request("https://test.example/report-risk", { method: "POST", body: "{}" }))).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
