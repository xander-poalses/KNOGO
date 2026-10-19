import { type Place } from "@knogo/core";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { useEffect, useRef, useState } from "react";
import { Modal, NativeModules, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import { LocateFixed, MapPin, Maximize2, UserRound, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Camera } from "@rnmapbox/maps";
import { loadMapbox } from "./loadMapbox.native";
import { HapticPressable } from "./HapticPressable";
import { getTripPosition } from "../tripLocation";
import { ExpoGoSkeleton } from "./ExpoGoSkeleton";
import { fonts, shadows, useTheme, useThemeStyles, type ThemeColours } from "../theme";

type BranchMapProps = {
  branches: Place[];
  selectedId?: string;
  onSelect: (place: Place) => void;
};

export function BranchMap({ branches, selectedId, onSelect }: BranchMapProps) {
  const { colours, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemeStyles(createStyles);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [tokenReady, setTokenReady] = useState(false);
  const [Mapbox, setMapbox] = useState<typeof import("@rnmapbox/maps").default | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const locationRequest = useRef<AbortController | null>(null);
  const camera = useRef<Camera>(null);
  useEffect(() => () => locationRequest.current?.abort(), []);

  const locate = async () => {
    locationRequest.current?.abort();
    const request = new AbortController();
    locationRequest.current = request;
    setLocating(true);
    setLocationError("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (request.signal.aborted) return;
      if (!permission.granted) { setLocationError("Location permission is off. Branches are still available."); return; }
      const result = await getTripPosition(request.signal);
      if (request.signal.aborted) return;
      const coordinate: [number, number] = [result.coords.longitude, result.coords.latitude];
      if (!Number.isFinite(coordinate[0]) || !Number.isFinite(coordinate[1]) || Math.abs(coordinate[0]) > 180 || Math.abs(coordinate[1]) > 90) throw new Error("Location unavailable");
      setPosition(coordinate);
      if (expanded) camera.current?.setCamera({ centerCoordinate: coordinate, zoomLevel: 13, animationDuration: 0 });
      else fitMap(coordinate);
    } catch {
      if (!request.signal.aborted) setLocationError("Could not find your location. Try again.");
    } finally {
      if (!request.signal.aborted) setLocating(false);
    }
  };
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();
  const hasNativeMapbox = NativeModules.RNMBXModule != null;
  const mapUnavailable = isExpoGo || !token || !hasNativeMapbox;

  useEffect(() => {
    if (mapUnavailable) return;
    // Bundle the SDK without async chunks, but evaluate it only after the native-module check.
    try {
      setMapbox(loadMapbox());
    } catch { setMapFailed(true); }
  }, [mapUnavailable]);

  useEffect(() => {
    if (mapUnavailable || !Mapbox) return;
    let active = true;
    setTokenReady(false);
    void Promise.resolve(Mapbox.setAccessToken(token!)).then(() => { if (active) setTokenReady(true); }).catch(() => { if (active) setMapFailed(true); });
    Mapbox.setTelemetryEnabled(false);
    setMapReady(false);
    setMapFailed(false);
    timeoutRef.current = setTimeout(() => setMapFailed(true), 20000);
    return () => { active = false; if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [mapUnavailable, token, Mapbox]);

  const handleMapLoaded = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setMapReady(true);
    setMapFailed(false);
    fitMap();
  };

  const fitMap = (userPosition = position) => {
    const coordinates = validBranches.map(b => [b.longitude, b.latitude]);
    if (userPosition) coordinates.push(userPosition);
    const ne: [number, number] = [Math.max(...coordinates.map(c => c[0])), Math.max(...coordinates.map(c => c[1]))];
    const sw: [number, number] = [Math.min(...coordinates.map(c => c[0])), Math.min(...coordinates.map(c => c[1]))];
    if (ne[0] === sw[0] && ne[1] === sw[1]) {
      camera.current?.setCamera({ centerCoordinate: ne, zoomLevel: 13, animationDuration: 0 });
    } else {
      camera.current?.fitBounds(ne, sw, [84, 84, 76, 84], 0);
    }
  };

  const validBranches = branches.filter((branch) => Number.isFinite(branch.latitude) && Number.isFinite(branch.longitude) && Math.abs(branch.latitude) <= 90 && Math.abs(branch.longitude) <= 180);

  if (!validBranches.length) return null;
  if (isExpoGo) return <ExpoGoSkeleton label="Branch map unavailable in Expo Go" height={310} />;
  if (!token) return null;
  if (!hasNativeMapbox) return <View style={styles.buildNotice}><Text style={styles.copy}>Install the KNOGO development build with Mapbox to view the map.</Text></View>;
  if (mapFailed) return null;
  if (!Mapbox) return null;

  const map = (
    <View style={expanded ? styles.expandedMap : styles.mapWrap}>
      {tokenReady ? <Mapbox.MapView key={isDark ? "dark" : "light"} styleURL={isDark ? Mapbox.StyleURL.Dark : Mapbox.StyleURL.Light} scaleBarEnabled={false} compassEnabled={false} scrollEnabled={expanded} zoomEnabled={expanded} requestDisallowInterceptTouchEvent={expanded} rotateEnabled={false} pitchEnabled={false} onDidFinishLoadingMap={handleMapLoaded} onMapLoadingError={() => setMapFailed(true)} style={styles.map}>
        {/* Keep the fallback at the bottom so it cannot cover roads or labels. */}
        {!isDark ? <Mapbox.BackgroundLayer id="land" existing layerIndex={0} style={{ backgroundColor: colours.controlStrong }} /> : null}
        {!isDark ? <Mapbox.SymbolLayer id="poi-label" existing style={{ textColor: "#050505", textFont: ["Open Sans Semibold", "Arial Unicode MS Regular"], textHaloColor: "rgba(255,255,255,0.55)", textHaloWidth: 0.5, textHaloBlur: 0.5 }} /> : null}
        <Mapbox.Camera
          ref={camera}
          animationDuration={0}
          defaultSettings={{
            centerCoordinate: [validBranches[0].longitude, validBranches[0].latitude], zoomLevel: 13,
          }}
        />
        {validBranches.map((branch) => (
          <Mapbox.MarkerView
            key={branch.id}
            coordinate={[branch.longitude, branch.latitude]}
            anchor={{ x: 0.5, y: 1 }}
            allowOverlap
          >
            <HapticPressable accessibilityRole="button" accessibilityLabel={`${branch.name}, ${branch.area}`} accessibilityState={{ selected: selectedId === branch.id }} onPress={() => { setExpanded(false); onSelect(branch); }} style={styles.pin}>
              <MapPin size={21} color={selectedId === branch.id ? colours.gold : colours.primary} />
              <Text numberOfLines={2} style={styles.pinLabel}>{branch.area || branch.name}</Text>
            </HapticPressable>
          </Mapbox.MarkerView>
        ))}
        {position ? <Mapbox.MarkerView coordinate={position} allowOverlap><View accessibilityLabel="Your location" style={styles.userMarker}><View style={styles.userPin}><UserRound color={colours.background} size={24} /></View><Text style={styles.userLabel}>You</Text></View></Mapbox.MarkerView> : null}
      </Mapbox.MapView> : null}
      {!mapReady ? <View pointerEvents="none" style={styles.loading}><Text style={styles.copy}>Loading map...</Text></View> : null}
      <View style={[styles.tools, expanded && { top: insets.top + 12 }]}>
        <HapticPressable accessibilityRole="button" accessibilityLabel="Show my location" accessibilityState={{ busy: locating, disabled: locating }} disabled={locating} onPress={() => void locate()} style={styles.tool}><LocateFixed size={22} color={colours.primary} /></HapticPressable>
        <HapticPressable accessibilityRole="button" accessibilityLabel={expanded ? "Close map" : "Expand map"} onPress={() => { setExpanded(!expanded); setMapReady(false); }} style={styles.tool}>{expanded ? <X size={22} color={colours.text} /> : <Maximize2 size={22} color={colours.text} />}</HapticPressable>
      </View>
      {locationError ? <View accessibilityRole="alert" style={[styles.locationNotice, { bottom: expanded ? insets.bottom + 52 : 40 }]}><Text style={styles.copy}>{locationError}</Text></View> : null}
    </View>
  );
  return expanded ? <Modal visible animationType="none" onRequestClose={() => { setExpanded(false); setMapReady(false); }}>{map}</Modal> : map;
}

const createStyles = (colours: ThemeColours) => StyleSheet.create({
  buildNotice: { padding: 16, backgroundColor: colours.surface, borderRadius: 7 },
  mapWrap: { height: 310, overflow: "hidden", borderRadius: 7, borderWidth: 1, borderColor: colours.border, backgroundColor: colours.elevated },
  map: { flex: 1 },
  expandedMap: { flex: 1, backgroundColor: colours.surface },
  tools: { position: "absolute", top: 12, right: 12, flexDirection: "row", gap: 8 },
  tool: { width: 48, height: 48, borderRadius: 8, backgroundColor: colours.surface, borderWidth: 1, borderColor: colours.controlBorder, alignItems: "center", justifyContent: "center" },
  pin: { minHeight: 44, maxWidth: 132, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 6, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colours.surface, ...shadows.card },
  pinLabel: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 13, color: colours.text },
  userMarker: { alignItems: "center", gap: 3 },
  userPin: { width: 44, height: 44, borderRadius: 22, backgroundColor: colours.primary, alignItems: "center", justifyContent: "center", ...shadows.card },
  userLabel: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, backgroundColor: colours.background, color: colours.text, fontFamily: fonts.extraBold, fontSize: 12 },
  locationNotice: { position: "absolute", left: 16, right: 16, padding: 12, borderRadius: 8, backgroundColor: colours.surface },
  loading: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center", backgroundColor: colours.elevated },
  copy: { color: colours.muted, fontFamily: fonts.regular, fontSize: 13 },
});
