import { getMapRegion, validTripPoint, type TripPoint } from "@knogo/core";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { HapticPressable as Pressable } from "./HapticPressable";
import MapView, { Marker, Polyline } from "react-native-maps";
import { fonts, useTheme } from "../theme";

export function RoutePreview({ path }: { path: TripPoint[] }) {
  const [attempt, setAttempt] = useState(0);
  if (path.length < 2 || !path.every(validTripPoint)) return null;
  return <NativeRouteMap key={attempt} path={path} onRetry={() => setAttempt(n => n + 1)} />;
}

function NativeRouteMap({ path, onRetry }: { path: TripPoint[]; onRetry: () => void }) {
  const { colours, isDark } = useTheme();
  const map = useRef<MapView>(null);
  const ready = useRef(false);
  const laidOut = useRef(false);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    // A readiness event can arrive before the effect starts.
    if (!ready.current) timer.current = setTimeout(() => setState("failed"), 30000);
    return () => clearTimeout(timer.current);
  }, []);
  const fit = () => {
    if (!ready.current || !laidOut.current) return;
    map.current?.fitToCoordinates(path, { animated: false, edgePadding: { top: 36, right: 36, bottom: 36, left: 36 } });
  };
  const loaded = () => { ready.current = true; clearTimeout(timer.current); setState("ready"); fit(); };
  useEffect(fit, [path]);
  return <View style={{ gap: 8 }}>
    {state !== "failed" ? <View style={[styles.map, { backgroundColor: colours.elevated }]}>
      <MapView ref={map} style={StyleSheet.absoluteFill} initialRegion={getMapRegion(path)!}
        userInterfaceStyle={isDark ? "dark" : "light"} loadingEnabled
        loadingBackgroundColor={colours.elevated} loadingIndicatorColor={colours.primary}
        toolbarEnabled={false} onMapReady={loaded} onMapLoaded={loaded}
        onLayout={() => { laidOut.current = true; fit(); }}>
        <Polyline coordinates={path} strokeColor={colours.primary} strokeWidth={5} />
        <Marker coordinate={path[0]} title="Start" />
        <Marker coordinate={path[path.length - 1]} title="Venue" />
      </MapView>
      {state === "loading" ? <View pointerEvents="none" style={[styles.loading, { backgroundColor: colours.elevated }]}><Text style={{ color: colours.muted, fontFamily: fonts.regular }}>Loading route map...</Text></View> : null}
    </View> : <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry}><Text style={{ color: colours.text, fontFamily: fonts.semibold }}>Map unavailable. Retry map</Text></Pressable>}
  </View>;
}
const styles = StyleSheet.create({ map: { height: 260, overflow: "hidden", borderRadius: 7 }, loading: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, alignItems: "center", justifyContent: "center" }, retry: { minHeight: 48, justifyContent: "center" } });
