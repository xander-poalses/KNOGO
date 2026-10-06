import type { RouteLeg } from "./trip";

export type TripPoint = { latitude: number; longitude: number };
export type AddressResult = TripPoint & { id: string; label: string };
export type TripRoute = { outbound: RouteLeg; returnLeg?: RouteLeg; attribution: string; path?: TripPoint[] };
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
export const validTripPoint = (point: unknown): point is TripPoint => isRecord(point) && typeof point.latitude === "number" && typeof point.longitude === "number" && Number.isFinite(point.latitude) && Number.isFinite(point.longitude) && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180;
const validLeg = (leg: unknown): leg is RouteLeg => isRecord(leg) && typeof leg.distanceMetres === "number" && Number.isFinite(leg.distanceMetres) && leg.distanceMetres >= 0 && typeof leg.durationSeconds === "number" && Number.isFinite(leg.durationSeconds) && leg.durationSeconds >= 0;
const validText = (value: unknown, limit: number): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= limit;
export function createTripApi(config: { url?: string; publishableKey?: string; fetcher?: typeof fetch; timeoutMs?: number }) {
  async function request(body: unknown, signal?: AbortSignal): Promise<unknown> {
    if (!config.url) throw new Error("Trip planning is not connected yet. Browsing and reporting are still available.");
    if (signal?.aborted) throw new Error("Trip request cancelled.");
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancel: (() => void) | undefined;
    const stopped = new Promise<never>((_, reject) => {
      cancel = () => { controller.abort(); reject(new Error("Trip request cancelled.")); };
      signal?.addEventListener("abort", cancel, { once: true });
      timer = setTimeout(() => { controller.abort(); reject(new Error("Trip service took too long. Try again.")); }, config.timeoutMs ?? 20000);
    });
    try {
      // Bound both the connection and response parsing, even if a fetch adapter ignores abort.
      return await Promise.race([stopped, (async () => {
        let response: Response;
        try {
          response = await (config.fetcher ?? fetch)(config.url!, { method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json", ...(config.publishableKey ? { apikey: config.publishableKey } : {}) }, body: JSON.stringify(body) });
        } catch {
          throw new Error("Could not reach the trip service. Check your connection and try again.");
        }
        if (!response.ok) throw new Error(response.status === 429 ? "Trip service limit reached. Try again later." : "Trip service could not complete this request.");
        try { return await response.json(); }
        catch { throw new Error("Trip service returned data that could not be read."); }
      })()]);
    } finally {
      clearTimeout(timer);
      if (cancel) signal?.removeEventListener("abort", cancel);
    }
  }
  return {
    configured: Boolean(config.url),
    search: async (query: string, signal?: AbortSignal): Promise<AddressResult[]> => {
      if (query.trim().length < 3 || query.length > 200) throw new Error("Enter an address between 3 and 200 characters.");
      const raw = await request({ action: "search", query: query.trim() }, signal);
      if (!isRecord(raw) || !Array.isArray(raw.results) || raw.results.length > 5 || raw.results.some((item) => !isRecord(item) || !validText(item.label, 500) || !validText(item.id, 200) || !validTripPoint(item))) throw new Error("Address service returned data that could not be used.");
      const results = raw.results as AddressResult[];
      if (new Set(results.map((item) => item.id)).size !== results.length) throw new Error("Address service returned duplicate results.");
      return results.map(({ id, label, latitude, longitude }) => ({ id, label: label.trim(), latitude, longitude }));
    },
    route: async (origin: TripPoint, destination: TripPoint, includeReturn: boolean, signal?: AbortSignal): Promise<TripRoute> => {
      if (!validTripPoint(origin) || !validTripPoint(destination)) throw new Error("Coordinates are not available for this trip.");
      const coordinates = ({ latitude, longitude }: TripPoint) => ({ latitude, longitude });
      const raw = await request({ action: "route", origin: coordinates(origin), destination: coordinates(destination), includeReturn }, signal);
      if (!isRecord(raw) || !validLeg(raw.outbound) || (raw.returnLeg !== undefined && !validLeg(raw.returnLeg)) || !validText(raw.attribution, 500)) throw new Error("Route service returned data that could not be used.");
      if (raw.path !== undefined && (!Array.isArray(raw.path) || raw.path.length < 2 || raw.path.length > 20000 || !raw.path.every(validTripPoint))) throw new Error("Route service returned a path that could not be used.");
      const leg = ({ distanceMetres, durationSeconds }: RouteLeg): RouteLeg => ({ distanceMetres, durationSeconds });
      return { outbound: leg(raw.outbound), returnLeg: raw.returnLeg === undefined ? undefined : leg(raw.returnLeg as RouteLeg), attribution: raw.attribution.trim(), ...(raw.path === undefined ? {} : { path: (raw.path as TripPoint[]).map(coordinates) }) };
    }
  };
}
