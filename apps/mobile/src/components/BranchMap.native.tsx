import { getMapRegion, type Place } from "@knogo/core";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { ExpoGoSkeleton } from "./ExpoGoSkeleton";
import { fonts, useTheme, useThemeStyles, type ThemeColours } from "../theme";

type BranchMapProps = {
  branches: Place[];
  selectedId?: string;
  onSelect: (place: Place) => void;
};

export function BranchMap({ branches, selectedId, onSelect }: BranchMapProps) {
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const mapRef = useRef<MapView>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  // Adding this key also requires rebuilding the APK to embed it in AndroidManifest.
  const missingAndroidKey = Platform.OS === "android" && !Constants.expoConfig?.android?.config?.googleMaps?.apiKey?.trim();
  const mapUnavailable = isExpoGo || missingAndroidKey;

  useEffect(() => {
    if (mapUnavailable) return;
    setMapReady(false);
    setMapFailed(false);
    timeoutRef.current = setTimeout(() => setMapFailed(true), 20000);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [mapUnavailable]);

  const handleMapLoaded = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setMapReady(true);
    setMapFailed(false);
    fitBranches();
  };

  const validBranches = branches.filter((branch) => Number.isFinite(branch.latitude) && Number.isFinite(branch.longitude) && Math.abs(branch.latitude) <= 90 && Math.abs(branch.longitude) <= 180);
  const fitBranches = () => { if (!validBranches.length) return; mapRef.current?.fitToCoordinates(validBranches.map(({ latitude, longitude }) => ({ latitude, longitude })), { animated: false, edgePadding: { top: 44, right: 44, bottom: 44, left: 44 } }); };

  if (!validBranches.length) return null;
  if (isExpoGo) return <ExpoGoSkeleton label="Branch map unavailable in Expo Go" height={310} />;
  if (missingAndroidKey) return null;
  if (mapFailed) return null;

  return (
    <View style={styles.mapWrap}>
      <MapView ref={mapRef} initialRegion={getMapRegion(validBranches)!} onLayout={fitBranches} onMapLoaded={handleMapLoaded} onMapReady={handleMapLoaded} style={styles.map}>
        {validBranches.map((branch) => (
          <Marker
            key={branch.id}
            coordinate={{ latitude: branch.latitude, longitude: branch.longitude }}
            description={branch.area}
            onPress={() => onSelect(branch)}
            pinColor={selectedId === branch.id ? colours.gold : colours.primary}
            title={branch.name}
          />
        ))}
      </MapView>
      {!mapReady ? <View pointerEvents="none" style={styles.loading}><Text style={styles.copy}>Loading map...</Text></View> : null}
    </View>
  );
}

const createStyles = (colours: ThemeColours) => StyleSheet.create({
  mapWrap: { height: 310, overflow: "hidden", borderRadius: 7, borderWidth: 1, borderColor: colours.border, backgroundColor: colours.elevated },
  map: { flex: 1 },
  loading: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center", backgroundColor: colours.elevated },
  copy: { color: colours.muted, fontFamily: fonts.regular, fontSize: 13 },
});
