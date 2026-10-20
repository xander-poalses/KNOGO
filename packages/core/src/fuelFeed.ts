import { positiveNumber, usableFuelPrice, type FuelPriceRecord } from "./trip";
import { storageKeys } from "./storage";

export type FuelFeedPolicy = { feedUrl: string; termsUrl: string; maxCacheAgeSeconds: number; termsConfirmed: boolean };
export type FuelFeedCache = { version: 2; feedUrl: string; termsUrl: string; fetchedAt: string; records: FuelPriceRecord[] };
export type FuelFeedResult = { source: "live" | "cache" | "none"; cache: FuelFeedCache | null; error: string | null; updateState: "idle" | "pending" | "failed" };
type Storage = { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void> };
const cacheKey = storageKeys.fuelPriceCache;
const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const timestamp = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) return false;
  const utcParts = new Date(`${value.slice(0, 19)}Z`);
  return Number.isFinite(utcParts.getTime()) && utcParts.toISOString().slice(0, 19) === value.slice(0, 19);
};
const https = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  try { const url = new URL(value); return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password; }
  catch { return false; }
};

export function fuelFeedConfigured(policy: FuelFeedPolicy) {
  return policy.termsConfirmed && https(policy.feedUrl) && https(policy.termsUrl) && Number.isSafeInteger(policy.maxCacheAgeSeconds) && policy.maxCacheAgeSeconds > 0 && policy.maxCacheAgeSeconds <= 604800;
}

export function parseFuelFeed(value: unknown, now = Date.now()): FuelPriceRecord[] | null {
  if (!object(value) || value.version !== 2 || value.currency !== "ZAR" || !["ZAR/litre", "cents/litre"].includes(String(value.unit)) || !Array.isArray(value.records) || value.records.length > 8) return null;
  const keys = new Set<string>();
  const records: FuelPriceRecord[] = [];
  for (const item of value.records) {
    if (!object(item) || !["petrol_93", "petrol_95", "diesel_50ppm", "diesel_500ppm"].includes(String(item.grade)) || !["inland", "coastal"].includes(String(item.region)) || !["retail_reference", "wholesale_reference"].includes(String(item.kind)) || !timestamp(item.effectiveAt) || (item.effectiveUntil !== null && !timestamp(item.effectiveUntil)) || !timestamp(item.checkedAt) || !https(item.sourceUrl) || item.forecast !== false) return null;
    const price = positiveNumber(item.price, value.unit === "cents/litre" ? 100000 : 1000);
    if (price === null) return null;
    const record = { grade: item.grade, region: item.region, kind: item.kind, effectiveAt: item.effectiveAt, effectiveUntil: item.effectiveUntil, checkedAt: item.checkedAt, sourceUrl: item.sourceUrl, zarPerLitre: value.unit === "cents/litre" ? price / 100 : price } as FuelPriceRecord;
    const key = `${record.grade}:${record.region}`;
    if (keys.has(key) || !usableFuelPrice(record, record.grade, record.region, now)) return null;
    keys.add(key); records.push(record);
  }
  return records;
}

export function readFuelFeedCache(value: unknown, policy: FuelFeedPolicy, now = Date.now()): FuelFeedCache | null {
  if (!fuelFeedConfigured(policy) || !object(value) || value.version !== 2 || value.feedUrl !== policy.feedUrl || value.termsUrl !== policy.termsUrl || !timestamp(value.fetchedAt)) return null;
  const age = now - Date.parse(value.fetchedAt);
  if (age < 0 || age >= policy.maxCacheAgeSeconds * 1000 || !Array.isArray(value.records)) return null;
  const records = parseFuelFeed({ version: 2, currency: "ZAR", unit: "ZAR/litre", records: value.records.map((record) => object(record) ? { ...record, price: record.zarPerLitre, forecast: false } : record) }, now);
  return records ? { version: 2, feedUrl: policy.feedUrl, termsUrl: policy.termsUrl, fetchedAt: value.fetchedAt, records } : null;
}

export function createFuelFeed(policy: FuelFeedPolicy, storage: Storage, fetcher: typeof fetch = fetch) {
  let pending: Promise<FuelFeedResult> | null = null;
  const load = async (method: "GET" | "POST"): Promise<FuelFeedResult> => {
    if (!fuelFeedConfigured(policy)) return { source: "none", cache: null, error: "Price unavailable", updateState: "failed" };
    let cached: FuelFeedCache | null = null;
    try { const raw = await storage.getItem(cacheKey); cached = readFuelFeedCache(raw ? JSON.parse(raw) : null, policy); } catch { /* A storage failure must not stop a live request or price entry. */ }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const value = await Promise.race([(async () => {
        const response = await fetcher(policy.feedUrl, { method, signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("feed_failed");
        if (Number(response.headers.get("content-length") ?? 0) > 32768 || !response.body) throw new Error("feed_too_large");
        const reader = response.body.getReader(); const decoder = new TextDecoder(); let text = "", size = 0;
        try { while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > 32768) throw new Error("feed_too_large"); text += decoder.decode(value, { stream: true }); } text += decoder.decode(); }
        finally { await reader.cancel(); }
        return JSON.parse(text) as unknown;
      })(), new Promise<never>((_, reject) => { timer = setTimeout(() => { reject(new Error("feed_timeout")); controller.abort(); }, 10000); })]);
      const records = parseFuelFeed(value);
      if (!records || !object(value) || !["idle", "pending", "failed"].includes(String(value.updateState))) throw new Error("feed_invalid");
      const updateState = value.updateState as FuelFeedResult["updateState"];
      const cache: FuelFeedCache = { version: 2, feedUrl: policy.feedUrl, termsUrl: policy.termsUrl, fetchedAt: new Date().toISOString(), records };
      try { await storage.setItem(cacheKey, JSON.stringify(cache)); }
      catch { return { source: "live", cache, error: "Price data loaded, but could not be saved on this device.", updateState }; }
      return { source: "live", cache, error: null, updateState };
    } catch {
      // Recheck the interval after a failed request, not just before it started.
      const fallback = cached && readFuelFeedCache(cached, policy);
      return { source: fallback ? "cache" : "none", cache: fallback, error: "Fuel-price data could not be refreshed. You can enter a price in Settings.", updateState: "failed" };
    } finally { clearTimeout(timer); }
  };
  const request = (method: "GET" | "POST"): Promise<FuelFeedResult> => {
    if (pending) return pending;
    pending = load(method).finally(() => { pending = null; });
    return pending;
  };
  return {
    configured: fuelFeedConfigured(policy),
    // The server owns the daily limit; a client force flag cannot bypass it.
    load: (_force = false) => request("POST"),
    poll: () => request("GET"),
    currentCache: (cache: FuelFeedCache | null) => readFuelFeedCache(cache, policy)
  };
}
