import type { Place } from "@knogo/core";
import { useEffect, useState } from "react";
import { AppState } from "react-native";

export function useStatusClock(places: Place[]) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timestamp = Date.now();
    const expiries = places.flatMap(place => Object.values(place.currentStatus.trust?.claims ?? {}))
      .map(claim => Date.parse(claim?.expiresAt ?? "")).filter(expiry => expiry > timestamp);
    // Wake at the next evidence boundary, not just the next minute.
    const delay = Math.max(1, Math.min(60_000, ...expiries.map(expiry => expiry - timestamp)));
    const timer = setTimeout(() => setNow(new Date()), delay);
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") setNow(new Date());
    });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, [places, now]);
  return now;
}
