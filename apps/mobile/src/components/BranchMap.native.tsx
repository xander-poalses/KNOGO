// Imports
import { validTripPoint, type Place, type TripPoint } from "@knogo/core";
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
import { FeedbackToast } from "./FeedbackToast";
import { ToastViewport } from "./ToastProvider";
import { fonts, radii, shadows, useTheme, useThemeStyles, type ThemeColours } from "../theme";

// Types
type BranchMapProps = {
  branches: Place[];
  selectedId?: string;
  onSelect?: (place: Place) => void;
  route?: TripPoint[];
};

// Components
export function BranchMap({ branches, selectedId, onSelect, route }: BranchMapProps) {
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
    coordinates.push(...routePoints.map(point => [point.longitude, point.latitude]));
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
  const routePoints = route?.filter(validTripPoint) ?? [];
  useEffect(() => { if (mapReady) fitMap(); }, [route]);

  if (!validBranches.length) return null;
  if (isExpoGo) return <ExpoGoSkeleton label="Branch map unavailable in Expo Go" height={310} />;
  if (route !== undefined && (!token || mapFailed)) return <View style={[styles.mapWrap, styles.tripMap, styles.unavailable]}><Text style={styles.copy}>Map unavailable. You can still open directions.</Text></View>;
  if (!token) return null;
  if (!hasNativeMapbox) return <View style={styles.buildNotice}><Text style={styles.copy}>Install the KNOGO development build with Mapbox to view the map.</Text></View>;
  if (mapFailed) return null;
  if (!Mapbox) return null;

  const map = (
    <View style={expanded ? styles.expandedMap : [styles.mapWrap, route !== undefined && styles.tripMap]}>
      {tokenReady ? <Mapbox.MapView key={isDark ? "dark" : "light"} styleURL={isDark ? Mapbox.StyleURL.Dark : Mapbox.StyleURL.Light} scaleBarEnabled={false} compassEnabled={false} scrollEnabled={expanded} zoomEnabled={expanded} requestDisallowInterceptTouchEvent={expanded} rotateEnabled={false} pitchEnabled={false} onDidFinishLoadingMap={handleMapLoaded} onMapLoadingError={() => setMapFailed(true)} style={styles.map}>
        {!isDark ? <Mapbox.BackgroundLayer id="land" existing layerIndex={0} style={{ backgroundColor: colours.controlStrong }} /> : null}
        {!isDark ? <Mapbox.SymbolLayer id="poi-label" existing style={{ textColor: "#050505", textFont: ["Open Sans Semibold", "Arial Unicode MS Regular"], textHaloColor: "rgba(255,255,255,0.55)", textHaloWidth: 0.5, textHaloBlur: 0.5 }} /> : null}
        <Mapbox.Camera
          ref={camera}
          animationDuration={0}
          defaultSettings={{
            centerCoordinate: [validBranches[0].longitude, validBranches[0].latitude], zoomLevel: 13,
          }}
        />
        {routePoints.length > 1 ? <Mapbox.ShapeSource id="trip-route" shape={{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: routePoints.map(point => [point.longitude, point.latitude]) } }}><Mapbox.LineLayer id="trip-route-line" style={{ lineColor: colours.primary, lineWidth: 4, lineCap: "round", lineJoin: "round" }}/></Mapbox.ShapeSource> : null}
        {routePoints[0] ? <Mapbox.MarkerView coordinate={[routePoints[0].longitude, routePoints[0].latitude]} allowOverlap><View accessible accessibilityLabel="Starting place" style={styles.userMarker}><View style={styles.userPin}><UserRound color={colours.background} size={24}/></View><Text style={styles.userLabel}>Start</Text></View></Mapbox.MarkerView> : null}
        {validBranches.map((branch) => (
          <Mapbox.MarkerView
            key={branch.id}
            coordinate={[branch.longitude, branch.latitude]}
            anchor={{ x: 0.5, y: 1 }}
            allowOverlap
          >
            <HapticPressable accessibilityRole={onSelect ? "button" : undefined} accessibilityLabel={`${branch.name}, ${branch.area}`} accessibilityState={onSelect ? { selected: selectedId === branch.id } : undefined} disabled={!onSelect} onPress={() => { setExpanded(false); onSelect?.(branch); }} style={styles.pin}>
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
      <FeedbackToast message={locationError}/>
    </View>
  );
  return expanded ? <Modal visible animationType="none" onRequestClose={() => { setExpanded(false); setMapReady(false); }}>{map}<ToastViewport modal/></Modal> : map;
}

// Styles
const createStyles = (colours: ThemeColours) => StyleSheet.create({
  buildNotice: { padding: 16, backgroundColor: colours.surface, borderRadius: radii.control },
  mapWrap: { height: 310, overflow: "hidden", borderRadius: radii.control, borderWidth: 1, borderColor: colours.border, backgroundColor: colours.elevated },
  tripMap: { height: 256, borderRadius: radii.inset, borderWidth: 0, backgroundColor: colours.sheetInset },
  unavailable: { alignItems: "center", justifyContent: "center", padding: 24 },
  map: { flex: 1 },
  expandedMap: { flex: 1, backgroundColor: colours.surface },
  tools: { position: "absolute", top: 12, right: 12, flexDirection: "row", gap: 8 },
  tool: { width: 48, height: 48, borderRadius: radii.listInset, backgroundColor: colours.surface, borderWidth: 1, borderColor: colours.controlBorder, alignItems: "center", justifyContent: "center" },
  pin: { minHeight: 44, maxWidth: 132, paddingHorizontal: 9, paddingVertical: 6, borderRadius: radii.control, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colours.surface, ...shadows.card },
  pinLabel: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 13, color: colours.text },
  userMarker: { alignItems: "center", gap: 3 },
  userPin: { width: 44, height: 44, borderRadius: radii.round, backgroundColor: colours.primary, alignItems: "center", justifyContent: "center", ...shadows.card },
  userLabel: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.control, backgroundColor: colours.background, color: colours.text, fontFamily: fonts.extraBold, fontSize: 12 },
  locationNotice: { position: "absolute", left: 16, right: 16 },
  loading: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center", backgroundColor: colours.elevated },
  copy: { color: colours.muted, fontFamily: fonts.regular, fontSize: 13 },
});
