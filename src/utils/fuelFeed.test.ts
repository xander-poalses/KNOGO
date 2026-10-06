import { afterEach, describe, expect, it, vi } from "vitest";
import { createFuelFeed, fuelFeedConfigured, parseFuelFeed, readFuelFeedCache, usableFuelPrice, type FuelFeedCache, type FuelFeedPolicy } from "@knogo/core";

const now = Date.parse("2026-10-01T10:00:00Z");
const policy: FuelFeedPolicy = { feedUrl: "https://knogo.example/fuel", termsUrl: "https://provider.example/terms", maxCacheAgeSeconds: 3600, termsConfirmed: true };
const item = () => ({ grade: "petrol_95", region: "inland", price: 2525, kind: "retail_reference", effectiveAt: "2026-09-02T00:00:00+02:00", effectiveUntil: "2026-10-07T00:00:00+02:00", checkedAt: "2026-10-01T09:00:00Z", sourceUrl: "https://provider.example/prices", forecast: false });
const envelope = (records: unknown[] = [item()]) => ({ version: 1, currency: "ZAR", unit: "cents/litre", records });
function cached(): FuelFeedCache {
  return { version: 1, feedUrl: policy.feedUrl, termsUrl: policy.termsUrl, fetchedAt: new Date(now - 1000).toISOString(), records: parseFuelFeed(envelope(), now)! };
}
function harness(cache: FuelFeedCache | null = null, feedPolicy = policy) {
  vi.useFakeTimers(); vi.setSystemTime(now);
  const storage = { getItem: vi.fn(async () => cache ? JSON.stringify(cache) : null), setItem: vi.fn(async (_key: string, _value: string) => {}) };
  const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(envelope())));
  return { feed: createFuelFeed(feedPolicy, storage, fetcher), storage, fetcher };
}
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("fuel reference data and cache", () => {
  it("requires terms, HTTPS and a retention period before using a feed or cache", async () => {
    for (const change of [{ termsConfirmed: false }, { maxCacheAgeSeconds: 0 }, { maxCacheAgeSeconds: 604801 }, { feedUrl: "http://provider.example" }, { termsUrl: "" }]) {
      const h = harness(cached(), { ...policy, ...change });
      expect(fuelFeedConfigured({ ...policy, ...change })).toBe(false);
      expect((await h.feed.load()).cache).toBeNull();
      expect(h.fetcher).not.toHaveBeenCalled();
      expect(h.storage.getItem).not.toHaveBeenCalled();
    }
  });
  it("converts cents per litre to ZAR without an AI calculation", () => {
    expect(parseFuelFeed(envelope(), now)?.[0].zarPerLitre).toBe(25.25);
    expect(parseFuelFeed({ ...envelope([{ ...item(), price: 25.25 }]), unit: "ZAR/litre" }, now)?.[0].zarPerLitre).toBe(25.25);
    expect(parseFuelFeed({ ...envelope(), unit: "USD/gallon" }, now)).toBeNull();
  });
  it("keeps grades, regions and diesel wholesale meaning distinct", () => {
    for (const grade of ["diesel_50ppm", "diesel_500ppm"]) {
      expect(parseFuelFeed(envelope([{ ...item(), grade }]), now)).toBeNull();
      const record = parseFuelFeed(envelope([{ ...item(), grade, kind: "wholesale_reference", region: "coastal" }]), now)![0];
      expect(usableFuelPrice(record, grade as "diesel_50ppm" | "diesel_500ppm", "coastal", now)).toBe(record);
      expect(usableFuelPrice(record, "petrol_95", "coastal", now)).toBeNull();
      expect(usableFuelPrice(record, record.grade, "inland", now)).toBeNull();
    }
    expect(parseFuelFeed(envelope([{ ...item(), kind: "wholesale_reference" }]), now)).toBeNull();
  });
  it("rejects forecast, expired, future, missing and zero price records", () => {
    for (const change of [{ forecast: true }, { forecast: undefined }, { price: 0 }, { price: null }, { price: "25.25" }, { effectiveUntil: "2026-10-01T10:00:00Z" }, { effectiveAt: "2026-10-02T10:00:00Z" }, { checkedAt: "2026-10-02T10:00:00Z" }, { effectiveUntil: undefined }, { effectiveAt: "2026-02-30T00:00:00Z" }, { sourceUrl: "javascript:alert(1)" }]) {
      expect(parseFuelFeed(envelope([{ ...item(), ...change }]), now)).toBeNull();
    }
  });
  it("rejects duplicate price pairs instead of choosing an arbitrary record", () => {
    expect(parseFuelFeed(envelope([item(), item()]), now)).toBeNull();
    expect(parseFuelFeed(envelope([{ ...item(), region: "unknown" }]), now)).toBeNull();
    expect(parseFuelFeed(envelope([{ ...item(), grade: "diesel" }]), now)).toBeNull();
  });
  it("rejects cache version, source, terms, timestamps and retention mismatches", () => {
    for (const change of [{ version: 2 }, { feedUrl: "https://other.example" }, { termsUrl: "https://other.example/terms" }, { fetchedAt: "bad" }, { fetchedAt: new Date(now + 1).toISOString() }, { fetchedAt: new Date(now - 3600000).toISOString() }]) {
      expect(readFuelFeedCache({ ...cached(), ...change }, policy, now)).toBeNull();
    }
  });
  it("loads and caches a verified response, then serves cache without another request", async () => {
    const h = harness();
    const result = await h.feed.load();
    expect(result.source).toBe("live");
    expect(result.cache?.records[0].zarPerLitre).toBe(25.25);
    expect(h.storage.setItem).toHaveBeenCalledOnce();
    h.storage.getItem.mockResolvedValue(JSON.stringify(result.cache));
    expect((await h.feed.load()).source).toBe("cache");
    expect(h.fetcher).toHaveBeenCalledOnce();
  });
  it("uses unexpired cache on a failed refresh without hiding the failure", async () => {
    const h = harness(cached());
    h.fetcher.mockRejectedValueOnce(new Error("Offline"));
    const result = await h.feed.load(true);
    expect(result.source).toBe("cache");
    expect(result.error).toContain("could not be refreshed");
    expect(h.storage.setItem).not.toHaveBeenCalled();
  });
  it("does not extend cache lifetime or replace it with a forecast response", async () => {
    const h = harness(cached());
    h.fetcher.mockResolvedValueOnce(new Response(JSON.stringify(envelope([{ ...item(), forecast: true }]))));
    const result = await h.feed.load(true);
    expect(result.cache?.fetchedAt).toBe(cached().fetchedAt);
    expect(h.storage.setItem).not.toHaveBeenCalled();
    expect(readFuelFeedCache(result.cache, policy, now + 3600000)).toBeNull();
  });
  it("recovers from malformed cache and reports a device write failure", async () => {
    const h = harness();
    h.storage.getItem.mockResolvedValueOnce("{broken");
    h.storage.setItem.mockRejectedValueOnce(new Error("Disk unavailable"));
    const result = await h.feed.load();
    expect(result.source).toBe("live");
    expect(result.error).toContain("could not be saved");
    expect(result.cache?.records).toHaveLength(1);
  });
  it("times out and deduplicates requests, rechecking cache expiry after waiting", async () => {
    const cache = { ...cached(), fetchedAt: new Date(now - 3595000).toISOString() };
    const h = harness(cache);
    h.fetcher.mockImplementation(() => new Promise<Response>(() => {}));
    const first = h.feed.load(true);
    const second = h.feed.load(true);
    expect(first).toBe(second);
    await vi.advanceTimersByTimeAsync(10000);
    const result = await first;
    expect(result.source).toBe("none");
    expect(result.cache).toBeNull();
    expect(h.fetcher).toHaveBeenCalledOnce();
    expect(h.fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
