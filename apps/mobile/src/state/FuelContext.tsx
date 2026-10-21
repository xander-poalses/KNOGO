// Imports
import { emptyFuelPreferences, parseFuelPreferences, usableFuelPrice, type FuelPreferences, type FuelFeedResult } from "@knogo/core";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { mobileStorage } from "../storage";
import { fuelFeed } from "../fuelFeed";
import { AppState } from "react-native";

// State and Helpers
const FuelContext = createContext<{ preferences: FuelPreferences; save: (value: FuelPreferences) => Promise<void>; prices: FuelFeedResult | null; pricesLoading: boolean; refreshPrices: (force?: boolean) => Promise<void>; watchPrices: () => () => void } | null>(null);
// Components
export function FuelProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<FuelPreferences>({ ...emptyFuelPreferences });
  const [prices, setPrices] = useState<FuelFeedResult | null>(null);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [active, setActive] = useState(AppState.currentState !== "background" && AppState.currentState !== "inactive");
  const [watchers, setWatchers] = useState(0);
  const mounted = useRef(false);
  const pendingSince = useRef(0);
  const refresh = useRef<Promise<void> | null>(null);
  const savedRevision = useRef(0);
  const writes = useRef<Promise<void>>(Promise.resolve());
  const refreshPrices = useCallback((force = false): Promise<void> => {
    if (refresh.current) return refresh.current;
    if (mounted.current) setPricesLoading(true);
    refresh.current = (async () => {
      try {
        const result = await fuelFeed.load(force);
        if (mounted.current) { if (result.updateState === "pending") pendingSince.current = Date.now(); setPrices(result); }
      } catch { if (mounted.current) setPrices(previous => ({ source: previous?.source ?? "none", cache: previous?.cache ?? null, error: "Price unavailable", updateState: "failed" })); }
      finally { refresh.current = null; if (mounted.current) setPricesLoading(false); }
    })();
    return refresh.current;
  }, []);
  const watchPrices = useCallback(() => { setWatchers(count => count + 1); return () => setWatchers(count => Math.max(0, count - 1)); }, []);
  useEffect(() => {
    mounted.current = true;
    void refreshPrices();
    const subscription = AppState.addEventListener("change", state => {
      setActive(state === "active");
      if (state === "active") void refreshPrices();
    });
    return () => { mounted.current = false; subscription.remove(); };
  }, [refreshPrices]);
  useEffect(() => {
    if (!active || !watchers || prices?.updateState !== "pending") return;
    let cancelled = false;
    const remaining = 90000 - (Date.now() - pendingSince.current);
    const fail = () => setPrices(current => current ? { ...current, updateState: "failed", error: "Price unavailable" } : current);
    const timeout = setTimeout(fail, Math.max(0, remaining));
    const timer = setTimeout(() => {
      if (remaining <= 0) return;
      void fuelFeed.poll().then(result => { if (!cancelled) { if (Date.now() - pendingSince.current >= 90000) fail(); else setPrices(result); } }).catch(() => { if (!cancelled) fail(); });
    }, Math.max(0, Math.min(5000, remaining)));
    return () => { cancelled = true; clearTimeout(timer); clearTimeout(timeout); };
  }, [active, watchers, prices]);
  useEffect(() => {
    const records = prices?.cache?.records;
    if (!active || !watchers || !records?.length) return;
    const expiry = Math.min(...records.map(record => Math.min(Date.parse(record.checkedAt) + 48 * 3600000, record.effectiveUntil ? Date.parse(record.effectiveUntil) : Infinity)));
    const timer = setTimeout(() => {
      setPrices(current => current?.cache ? { ...current, cache: { ...current.cache, records: current.cache.records.filter(record => usableFuelPrice(record, record.grade, record.region)) }, updateState: "failed" } : current);
      void fuelFeed.poll().then(result => { if (mounted.current) setPrices(result); }).catch(() => undefined);
    }, Math.max(0, expiry - Date.now()));
    return () => clearTimeout(timer);
  }, [active, watchers, prices]);
  useEffect(() => {
    let active = true;
    const revision = savedRevision.current;
    void mobileStorage.readFuelPreferences().then(stored => {
      if (active && savedRevision.current === revision) setPreferences(parseFuelPreferences(stored));
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  const save = useCallback((value: FuelPreferences) => {
    const normalised = parseFuelPreferences(value);
    const write = writes.current.then(async () => {
      await mobileStorage.writeFuelPreferences(normalised);
      savedRevision.current += 1;
      setPreferences(normalised);
    });
    writes.current = write.catch(() => undefined);
    return write;
  }, []);
  return <FuelContext.Provider value={{ preferences, save, prices, pricesLoading: active && (pricesLoading || prices?.updateState === "pending"), refreshPrices, watchPrices }}>{children}</FuelContext.Provider>;
}
// Functions
export function useFuel() {
  const value = useContext(FuelContext);
  if (!value) throw new Error("useFuel needs FuelProvider");
  return value;
}
