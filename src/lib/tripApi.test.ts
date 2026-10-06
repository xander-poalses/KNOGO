import { afterEach, describe, expect, it, vi } from "vitest";
import { createTripApi, validTripPoint } from "@knogo/core";

const point = { latitude: -25.8, longitude: 28.3 };
const leg = { distanceMetres: 12000, durationSeconds: 900 };
const address = { ...point, id: "parkview", label: "Parkview, Pretoria" };
const route = { outbound: leg, attribution: "OpenRouteService" };
function harness(value: unknown = route, status = 200) {
  const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(value), { status }));
  return { fetcher, api: createTripApi({ url: "https://knogo.example/trip", fetcher }) };
}
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("trip client failures and privacy", () => {
  it("keeps validated route coordinates without metadata", async () => {
    const path = [{ ...point, accuracy: 4 }, { latitude: -25.9, longitude: 28.4 }];
    expect((await harness({ ...route, path }).api.route(point, point, false)).path).toEqual([point, { latitude: -25.9, longitude: 28.4 }]);
  });
  it("rejects malformed and oversized map paths", async () => {
    for (const path of [null, [], [point], [point, { latitude: 91, longitude: 28 }], Array(20001).fill(point)]) {
      await expect(harness({ ...route, path }).api.route(point, point, false)).rejects.toThrow("path");
    }
  });
  it("does not request an unconfigured service", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(createTripApi({ fetcher }).search("Pretoria")).rejects.toThrow("not connected");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects absent and out-of-range coordinates without throwing from the validator", async () => {
    for (const value of [null, undefined, [], {}, { latitude: "-25", longitude: 28 }, { latitude: NaN, longitude: 28 }, { latitude: 91, longitude: 28 }, { latitude: 25, longitude: 181 }]) expect(validTripPoint(value)).toBe(false);
    const h = harness();
    await expect(h.api.route({ latitude: Infinity, longitude: 28 }, point, false)).rejects.toThrow("Coordinates");
    expect(h.fetcher).not.toHaveBeenCalled();
  });
  it("sends coordinates without GPS metadata or an address label", async () => {
    const h = harness();
    await h.api.route({ ...point, accuracy: 3, altitude: 900, label: "Home" } as typeof point, point, true);
    expect(JSON.parse(String(h.fetcher.mock.calls[0][1]?.body))).toEqual({ action: "route", origin: point, destination: point, includeReturn: true });
  });
  it("retains a return leg and strips fields outside the route contract", async () => {
    const h = harness({ ...route, outbound: { ...leg, trail: [point] }, returnLeg: { distanceMetres: 13000, durationSeconds: 1000 } });
    expect(await h.api.route(point, point, true)).toEqual({ ...route, returnLeg: { distanceMetres: 13000, durationSeconds: 1000 } });
  });
  it("rejects malformed routes, blank attribution and invalid return legs", async () => {
    for (const value of [null, [], {}, { ...route, outbound: null }, { ...route, outbound: { ...leg, durationSeconds: -1 } }, { ...route, attribution: " " }, { ...route, returnLeg: null }, { ...route, returnLeg: { ...leg, distanceMetres: "12000" } }]) {
      await expect(harness(value).api.route(point, point, true)).rejects.toThrow("could not be used");
    }
  });
  it("validates address input before making a request", async () => {
    const h = harness();
    for (const query of [" a ", "x".repeat(201)]) await expect(h.api.search(query)).rejects.toThrow("3 and 200");
    expect(h.fetcher).not.toHaveBeenCalled();
  });
  it("accepts empty search results and only exposes address fields", async () => {
    expect(await harness({ results: [] }).api.search("Pretoria")).toEqual([]);
    expect(await harness({ results: [{ ...address, label: ` ${address.label} `, providerPayload: "discard" }] }).api.search(" Pretoria ")).toEqual([address]);
  });
  it("rejects null, duplicate, oversized and malformed addresses", async () => {
    for (const value of [null, { results: [null] }, { results: [{ ...address, label: " " }] }, { results: [{ ...address, id: "" }] }, { results: Array(6).fill(address) }, { results: [address, address] }]) {
      await expect(harness(value).api.search("Pretoria")).rejects.toThrow(/could not be used|duplicate/);
    }
  });
  it("reports quota and server failures without inventing a route", async () => {
    await expect(harness({}, 429).api.route(point, point, false)).rejects.toThrow("limit reached");
    await expect(harness({}, 503).api.route(point, point, false)).rejects.toThrow("could not complete");
  });
  it("reports network and JSON failures without leaking provider error text", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => { throw new Error("provider private detail"); });
    await expect(createTripApi({ url: "https://knogo.example/trip", fetcher }).search("Pretoria")).rejects.toThrow("Check your connection");
    fetcher.mockResolvedValue(new Response("<html>Error</html>"));
    await expect(createTripApi({ url: "https://knogo.example/trip", fetcher }).search("Pretoria")).rejects.toThrow("could not be read");
  });
  it("times out connection and body parsing even if the adapter ignores abort", async () => {
    vi.useFakeTimers();
    for (const bodyStalls of [false, true]) {
      const stalled = new Promise<never>(() => {});
      const response = new Response("{}");
      vi.spyOn(response, "json").mockReturnValue(stalled);
      const fetcher = vi.fn<typeof fetch>(() => bodyStalls ? Promise.resolve(response) : stalled);
      const api = createTripApi({ url: "https://knogo.example/trip", fetcher, timeoutMs: 100 });
      const check = expect(api.route(point, point, false)).rejects.toThrow("took too long");
      await vi.advanceTimersByTimeAsync(100);
      await check;
      expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    }
  });
  it("cancels before or during a request and clears its timeout", async () => {
    vi.useFakeTimers();
    const h = harness();
    const cancelled = new AbortController(); cancelled.abort();
    await expect(h.api.search("Pretoria", cancelled.signal)).rejects.toThrow("cancelled");
    expect(h.fetcher).not.toHaveBeenCalled();
    const controller = new AbortController();
    const fetcher = vi.fn<typeof fetch>(() => new Promise(() => {}));
    const check = expect(createTripApi({ url: "https://knogo.example/trip", fetcher }).search("Pretoria", controller.signal)).rejects.toThrow("cancelled");
    controller.abort();
    await check;
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
