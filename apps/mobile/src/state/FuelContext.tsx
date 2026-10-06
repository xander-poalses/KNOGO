import { emptyFuelPreferences, parseFuelPreferences, type FuelPreferences, type FuelFeedResult } from "@knogo/core";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { mobileStorage } from "../storage";
import { fuelFeed } from "../fuelFeed";

const FuelContext = createContext<{ preferences: FuelPreferences; save: (value: FuelPreferences) => Promise<void>; prices: FuelFeedResult | null; pricesLoading: boolean; refreshPrices: (force?: boolean) => Promise<void> } | null>(null);
export function FuelProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<FuelPreferences>({ ...emptyFuelPreferences });
  const [prices, setPrices] = useState<FuelFeedResult | null>(null);
  const [pricesLoading, setPricesLoading] = useState(false);
  const savedRevision = useRef(0);
  const writes = useRef<Promise<void>>(Promise.resolve());
  const refreshPrices = useCallback(async (force = false) => {
    setPricesLoading(true);
    try { setPrices(await fuelFeed.load(force)); }
    finally { setPricesLoading(false); }
  }, []);
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
    // Keep device storage and the displayed preferences in the same write order.
    const write = writes.current.then(async () => {
      await mobileStorage.writeFuelPreferences(normalised);
      savedRevision.current += 1;
      setPreferences(normalised);
    });
    writes.current = write.catch(() => undefined);
    return write;
  }, []);
  return <FuelContext.Provider value={{ preferences, save, prices, pricesLoading, refreshPrices }}>{children}</FuelContext.Provider>;
}
export function useFuel() {
  const value = useContext(FuelContext);
  if (!value) throw new Error("useFuel needs FuelProvider");
  return value;
}
