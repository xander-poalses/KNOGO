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
  env = { RISK_WORKER_SECRET: "test-worker", SUPABASE_URL: "https://project.example", SUPABASE_SERVICE_ROLE_KEY: "test-service" };
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
    expect(await response.json()).toEqual({ error: "Assessment unavailable. Status remains uncertain." });
  });
  it("accepts an empty authorised queue-drain request", async () => {
    const response = await handler(request());
    expect(response.status).toBe(200);
    expect(mocks.drain).toHaveBeenCalledOnce();
    expect(await response.json()).toEqual({ processed: 0 });
  });
});
