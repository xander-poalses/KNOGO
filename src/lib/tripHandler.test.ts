import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requestTrip: vi.fn(), serverRpc: vi.fn() }));
vi.mock("../../supabase/functions/_shared/providerServices.ts", () => ({ requestTrip: mocks.requestTrip }));
vi.mock("../../supabase/functions/_shared/server.ts", () => ({
  serverRpc: mocks.serverRpc,
  jsonResponse: (body: unknown, status = 200, origin = "") => new Response(JSON.stringify(body), { status, headers: { "Access-Control-Allow-Origin": origin, "Cache-Control": "no-store" } }),
}));
let handler: (req: Request) => Promise<Response>;
let env: Record<string, string>;
beforeEach(async () => {
  vi.resetModules(); vi.clearAllMocks();
  env = { TRIP_ALLOWED_ORIGINS: "http://localhost:8081", SUPABASE_PUBLISHABLE_KEYS: '{"default":"sb_publishable_test"}', SUPABASE_URL: "https://project.example", SUPABASE_SERVICE_ROLE_KEY: "server-only", ORS_API_KEY: "provider-only", ORS_FREE_TIER_CONFIRMED: "true" };
  vi.stubGlobal("Deno", { env: { get: (name: string) => env[name] }, serve: (fn: typeof handler) => { handler = fn; } });
  const entry = "../../supabase/functions/trip-planner/index.ts";
  await import(entry);
});
afterEach(() => vi.unstubAllGlobals());
const request = (headers: Record<string, string> = { apikey: "sb_publishable_test", origin: "http://localhost:8081" }, body = '{"action":"search","query":"Menlyn"}') => new Request("https://project.example/trip", { method: "POST", headers, body });
describe("trip endpoint admission", () => {
  it("rejects absent keys and unapproved origins before provider work", async () => {
    expect((await handler(request({}))).status).toBe(401);
    expect((await handler(request({ apikey: "wrong" }))).status).toBe(401);
    expect((await handler(request({ apikey: "sb_publishable_test", origin: "https://other.example" }))).status).toBe(403);
    expect(mocks.requestTrip).not.toHaveBeenCalled();
  });
  it("supports browser preflight without a key or provider call", async () => {
    expect((await handler(new Request("https://project.example/trip", { method: "OPTIONS", headers: { origin: "http://localhost:8081" } }))).status).toBe(200);
    expect(mocks.requestTrip).not.toHaveBeenCalled();
  });
  it("routes native requests through the trip-only server reservation", async () => {
    mocks.requestTrip.mockImplementation(async (_body, config) => { await config.reserve("routes"); return { results: [] }; });
    mocks.serverRpc.mockResolvedValue(true);
    const response = await handler(request({ apikey: "sb_publishable_test" }));
    expect(response.status).toBe(200);
    expect(mocks.serverRpc).toHaveBeenCalledWith("https://project.example", "server-only", "reserve_trip_provider_call", { p_provider: "routes" });
    expect(await response.text()).not.toContain("provider-only");
  });
  it("fails closed on malformed key configuration", async () => {
    env.SUPABASE_PUBLISHABLE_KEYS = "not JSON";
    expect((await handler(request())).status).toBe(401);
    expect(mocks.requestTrip).not.toHaveBeenCalled();
  });
  it("returns quota feedback without leaking provider errors", async () => {
    mocks.requestTrip.mockRejectedValue(new Error("quota"));
    expect((await handler(request())).status).toBe(429);
    mocks.requestTrip.mockRejectedValue(new Error("provider-only"));
    expect(await (await handler(request())).text()).not.toContain("provider-only");
  });
});
