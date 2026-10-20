import { validTripPoint, type Place, type TripPoint } from "@knogo/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { fonts, radii, useTheme, useThemeStyles, type ThemeColours } from "../theme";

declare global { interface Window { google?: any } }

type Props = { branches: Place[]; selectedId?: string; onSelect?: (place: Place) => void; route?: TripPoint[] };

function loadGoogleMaps(key: string) {
  if (window.google?.maps) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById("knogo-google-maps") as HTMLScriptElement | null;
    if (existing) { existing.addEventListener("load", () => resolve(), { once: true }); existing.addEventListener("error", reject, { once: true }); return; }
    const script = document.createElement("script");
    script.id = "knogo-google-maps";
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export function BranchMap({ branches, selectedId, onSelect, route }: Props) {
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const rootRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
  const valid = useMemo(() => branches.filter((branch) => Number.isFinite(branch.latitude) && Number.isFinite(branch.longitude) && Math.abs(branch.latitude) <= 90 && Math.abs(branch.longitude) <= 180), [branches]);

  useEffect(() => {
    if (!key || !rootRef.current || !valid.length) { setLoading(false); setFailed(true); return; }
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    const timeout = window.setTimeout(() => { if (!cancelled) { setLoading(false); setFailed(true); } }, 20000);
    void loadGoogleMaps(key).then(() => {
      if (cancelled || !window.google?.maps || !rootRef.current) return;
      const bounds = new window.google.maps.LatLngBounds();
      const map = new window.google.maps.Map(rootRef.current, { disableDefaultUI: true, fullscreenControl: true, gestureHandling: "cooperative" });
      markersRef.current = valid.map((branch) => {
        const position = { lat: branch.latitude, lng: branch.longitude };
        bounds.extend(position);
        const marker = new window.google.maps.Marker({ map, position, title: branch.name });
        if (onSelect) marker.addListener("click", () => onSelect(branch));
        return { marker, id: branch.id };
      });
      const path = route?.filter(validTripPoint).map(point => ({ lat: point.latitude, lng: point.longitude })) ?? [];
      path.forEach(point => bounds.extend(point));
      const line = path.length > 1 ? new window.google.maps.Polyline({ map, path, strokeColor: colours.primary, strokeWeight: 4 }) : null;
      if (line) markersRef.current.push({ marker: line });
      if (path[0]) markersRef.current.push({ marker: new window.google.maps.Marker({ map, position: path[0], title: "Starting place", label: "A" }) });
      map.fitBounds(bounds, 48);
      window.clearTimeout(timeout);
      setLoading(false);
    }).catch(() => { if (!cancelled) { window.clearTimeout(timeout); setLoading(false); setFailed(true); } });
    return () => { cancelled = true; window.clearTimeout(timeout); markersRef.current.forEach(({ marker }) => marker.setMap(null)); markersRef.current = []; };
  }, [key, onSelect, valid, route, colours.primary]);

  useEffect(() => { markersRef.current.forEach(({ marker, id }) => { if (id) marker.setIcon(id === selectedId ? "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png" : undefined); }); }, [selectedId]);

  if (failed) return route !== undefined ? <View style={[styles.mapWrap, styles.tripMap, styles.unavailable]}><Text style={styles.copy}>Map unavailable. You can still open directions.</Text></View> : null;
  return <View style={[styles.mapWrap, route !== undefined && styles.tripMap]}><View ref={rootRef} style={StyleSheet.absoluteFill} />{loading ? <View pointerEvents="none" style={styles.loading}><Text style={styles.copy}>Loading map...</Text></View> : null}</View>;
}

const createStyles = (colours: ThemeColours) => StyleSheet.create({
  mapWrap: { height: 310, overflow: "hidden", borderRadius: radii.control, borderWidth: 1, borderColor: colours.border, backgroundColor: colours.elevated },
  tripMap: { height: 256, borderRadius: radii.inset, borderWidth: 0, backgroundColor: colours.sheetInset },
  unavailable: { alignItems: "center", justifyContent: "center", padding: 24 },
  loading: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center", backgroundColor: colours.elevated },
  copy: { color: colours.muted, fontFamily: fonts.regular, fontSize: 13 }
});
