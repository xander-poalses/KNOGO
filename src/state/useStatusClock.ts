import type { Place } from "@knogo/core";
import { useEffect, useState } from "react";

export function useStatusClock(places: Place[]) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timestamp = Date.now();
    const expiries = places.flatMap(place => Object.values(place.currentStatus.trust?.claims ?? {}))
      .map(claim => Date.parse(claim?.expiresAt ?? "")).filter(expiry => expiry > timestamp);
    const timer = window.setTimeout(() => setNow(new Date()), Math.max(1, Math.min(60_000, ...expiries.map(expiry => expiry - timestamp))));
    const foreground = () => { if (document.visibilityState === "visible") setNow(new Date()); };
    window.addEventListener("focus", foreground);
    document.addEventListener("visibilitychange", foreground);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", foreground);
      document.removeEventListener("visibilitychange", foreground);
    };
  }, [places, now]);
  return now;
}
