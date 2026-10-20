import { defaultFilters, emptyFuelPreferences, filterPlaces, type FuelPreferences, type PlaceFilters } from "@knogo/core";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import { FilterSheet } from "../../src/components/FilterSheet";
import { FuelPreferencesForm } from "../../src/components/FuelPreferencesForm";
import { ExplorePlaceTile } from "../../src/components/PlaceCards";
import { VirtualizedGrid } from "../../src/components/VirtualizedGrid";
import { SearchField } from "../../src/components/Ui";
import { HapticPressable } from "../../src/components/HapticPressable";
import { PlaceDetailScreen } from "../../src/screens/PlaceDetailScreen";
import { PlacesContext, usePlaces } from "../../src/state/PlacesContext";
import { darkColours, fonts, lightColours, ThemeContext, useTheme } from "../../src/theme";
import { auditStates, uiAuditPlaces, type AuditState } from "../../src/dev/uiAuditData";

export default function UiAuditRoute() {
  if (!__DEV__ || Platform.OS !== "web") return null;
  return <UiAudit />;
}

function UiAudit() {
  const params = useLocalSearchParams<{ data?: string; surface?: string; mode?: string }>();
  const router = useRouter();
  const parent = usePlaces();
  const theme = useTheme();
  const isDark = params.mode !== "light";
  const colours = isDark ? darkColours : lightColours;
  const state: AuditState = auditStates.includes(params.data as AuditState) ? params.data as AuditState : "demo";
  const surface = params.surface ?? "list";
  const places = useMemo(() => uiAuditPlaces(state), [state]);
  const [filters, setFilters] = useState<PlaceFilters>({ ...defaultFilters, maxDistanceKm: 25 });
  const [fuel, setFuel] = useState<FuelPreferences>({ ...emptyFuelPreferences });
  const [filterOpen, setFilterOpen] = useState(true);
  const [toolbarHeight, setToolbarHeight] = useState(150);
  const noWrite = async () => undefined;
  const value = { ...parent, places, placeGroups: [], loading: false, refreshing: false, error: null, coordinates: null,
    refresh: noWrite, refreshPlace: noWrite, toggleSaved: noWrite, isSaved: () => false };
  const shown = filterPlaces(places, filters);
  const button = (label: string, selected: boolean, onPress: () => void) => <HapticPressable key={label} accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={{ padding: 8, minHeight: 36, justifyContent: "center", backgroundColor: selected ? "#fff" : "#ddd", borderRadius: 3 }}><Text style={{ color: "#111", fontSize: 12 }}>{label}</Text></HapticPressable>;
  return <ThemeContext.Provider value={{ ...theme, colours, isDark, setPreference: () => undefined }}><PlacesContext.Provider value={value}><View style={{ flex: 1, paddingBottom: toolbarHeight + 8, backgroundColor: colours.background }}>
    {surface === "detail" ? <PlaceDetailScreen /> : surface === "fuel" ? <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 180, maxWidth: 720, width: "100%", alignSelf: "center" }}><FuelPreferencesForm key={state} preferences={fuel} onSave={async next => setFuel(next)} allowClear /></ScrollView> : <VirtualizedGrid data={shown} columns={1} keyExtractor={place => place.id} roundedList header={<View style={{ gap: 12 }}><SearchField value={filters.query} onChangeText={query => setFilters(current => ({ ...current, query }))} accessibilityLabel="Search audit places" /><Text style={{ color: colours.text, fontFamily: fonts.medium }}>{shown.length} {shown.length === 1 ? "place" : "places"}</Text></View>} empty={<Text style={{ color: colours.text }}>No places</Text>} renderTile={(place, width) => <ExplorePlaceTile place={place} width={width} saved={false} onToggleSaved={() => undefined} onPress={() => router.setParams({ surface: "detail", placeId: place.id })} />} />}
    {surface === "filters" ? <FilterSheet visible={filterOpen} filters={filters} areas={[...new Set(places.map(place => place.area))]} cuisines={[...new Set(places.flatMap(place => place.cuisine))]} places={places} categories={["restaurant"]} nearby onChange={setFilters} onClose={() => setFilterOpen(false)} /> : null}
    <View onLayout={event => setToolbarHeight(event.nativeEvent.layout.height)} style={{ position: "absolute", bottom: 8, alignSelf: "center", maxWidth: "100%", backgroundColor: "#ddd", padding: 4, gap: 4, zIndex: 100 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 3 }}>{auditStates.map(item => button(item === "demo" ? "Demo data" : item === "worst" ? "Worst case" : item === "huge" ? "1,000 rows" : item === "empty" ? "Empty" : "One", state === item, () => { setFilters({ ...defaultFilters, maxDistanceKm: 25 }); router.setParams({ data: item }); }))}</View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 3 }}>{["list", "detail", "filters", "fuel"].map(item => button(item, surface === item, () => { setFilterOpen(true); router.setParams({ surface: item, placeId: places[0]?.id ?? "audit-0" }); }))}</View>
      <View style={{ flexDirection: "row", gap: 3 }}>{["light", "dark"].map(mode => button(mode, (isDark ? "dark" : "light") === mode, () => router.setParams({ mode })))}</View>
    </View>
  </View></PlacesContext.Provider></ThemeContext.Provider>;
}
