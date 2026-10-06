import type { TripPoint } from "@knogo/core";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { HapticPressable as Pressable } from "./HapticPressable";
import { fonts, useTheme } from "../theme";

let stylesheet: Promise<void> | undefined;
function loadStylesheet() {
  if (!stylesheet) stylesheet = new Promise<void>((resolve, reject) => {
    const css = document.createElement("link");
    css.id = "knogo-leaflet-css"; css.rel = "stylesheet"; css.href = "/leaflet.css";
    css.onload = () => resolve();
    css.onerror = () => { css.remove(); stylesheet = undefined; reject(new Error("Map stylesheet unavailable")); };
    document.head.appendChild(css);
  });
  return stylesheet;
}

export function RoutePreview({ path }: { path: TripPoint[] }) {
  const { colours } = useTheme();
  const root = useRef<any>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  useEffect(() => {
    let cancelled = false;
    let map: import("leaflet").Map | undefined;
    setState("loading");
    const timer = setTimeout(() => { if (!cancelled) setState("failed"); }, 25000);
    Promise.all([import("leaflet"), loadStylesheet()]).then(([L]) => {
      if (cancelled || !root.current) return;
      map = L.map(root.current, { scrollWheelZoom: false });
      const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      tiles.on("load", () => { if (!cancelled) { clearTimeout(timer); setState("ready"); } });
      tiles.on("tileerror", () => { if (!cancelled) { clearTimeout(timer); setState("failed"); } });
      const points: [number, number][] = path.map(p => [p.latitude, p.longitude]);
      const line = L.polyline(points, { color: colours.primary, weight: 5 }).addTo(map);
      L.circleMarker(points[0], { radius: 7, color: colours.primary, fillOpacity: 1 }).addTo(map).bindTooltip("Start");
      L.circleMarker(points[points.length - 1], { radius: 7, color: colours.closed, fillOpacity: 1 }).addTo(map).bindTooltip("Venue");
      map.fitBounds(line.getBounds(), { padding: [28, 28], maxZoom: 16 });
      map.invalidateSize();
    }).catch(() => { if (!cancelled) { clearTimeout(timer); setState("failed"); } });
    return () => { cancelled = true; clearTimeout(timer); map?.remove(); };
  }, [path, attempt, colours.primary, colours.closed]);
  return <View style={{ gap: 8 }}>
    <View style={[styles.map, { display: state === "failed" ? "none" : "flex", backgroundColor: colours.elevated }]}>
      <View ref={root} accessibilityLabel="Trip route preview" style={StyleSheet.absoluteFill} />
      {state === "loading" ? <View pointerEvents="none" style={[styles.loading, { backgroundColor: colours.elevated }]}><Text style={{ color: colours.muted, fontFamily: fonts.regular }}>Loading route map...</Text></View> : null}
    </View>
    {state === "failed" ? <Pressable accessibilityRole="button" onPress={() => setAttempt(n => n + 1)} style={styles.retry}><Text style={{ color: colours.text, fontFamily: fonts.semibold }}>Map unavailable. Retry map</Text></Pressable> : null}
  </View>;
}
const styles = StyleSheet.create({ map: { height: 260, overflow: "hidden", borderRadius: 7, zIndex: 0 }, loading: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, alignItems: "center", justifyContent: "center", zIndex: 1000 }, retry: { minHeight: 48, justifyContent: "center" } });
