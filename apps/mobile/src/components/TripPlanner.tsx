// Imports
import { compareArrivalWithHours, createTripApi, estimateFuel, fuelRegionForLocation, planJourney, positiveNumber, usableFuelPrice, validTripPoint, type AddressResult, type Place, type TripPoint } from "@knogo/core";
import * as Location from "expo-location";
import { ArrowUpRight, ChevronLeft, Fuel, MapPin, Navigation, Search } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Linking, StyleSheet, Text, TextInput, View } from "react-native";
import { HapticPressable as Pressable } from "./HapticPressable";
import { useFuel } from "../state/FuelContext";
import { fuelFeed } from "../fuelFeed";
import { fonts, radii, sizes, space, useTheme, useThemeStyles, type ThemeColours } from "../theme";
import { ActionButton } from "./Ui";
import { FeedbackToast } from "./FeedbackToast";
import { rememberFocus } from "./AccessibilityStyles";
import { describeArrivalHours } from "../arrivalPresentation";
import { getTripPosition } from "../tripLocation";
import { BranchMap } from "./BranchMap";
import { usePlaces } from "../state/PlacesContext";

// State and Helpers
const api = createTripApi({ url: process.env.EXPO_PUBLIC_TRIP_API_URL, publishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY });
// Types
export type TripEstimateSummary = { costZar: number | null; litres: number | null; kilometres: number; arrival: string };
type Sheet = "origin" | "fuel" | "arrival" | null;
const clock = (date: Date) => date.toLocaleTimeString("en-ZA", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit", hour12: false });
const fuelLabels = { petrol_93: "Petrol 93", petrol_95: "Petrol 95", diesel_50ppm: "Diesel 50 ppm", diesel_500ppm: "Diesel 500 ppm" };

// Components
export function TripPlanner({ place, onEstimateChange }: { place: Place; onEstimateChange?: (summary: TripEstimateSummary | null) => void }) {
  const styles = useThemeStyles(createStyles);
  const { colours } = useTheme();
  const { preferences, save, prices, pricesLoading, refreshPrices, watchPrices } = useFuel();
  const { coordinates } = usePlaces();
  const useKmPerLitre = preferences.consumptionUnit === "km_per_litre";
  useEffect(() => watchPrices(), [watchPrices]);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [origin, setOrigin] = useState<TripPoint | null>(null);
  const [originMode, setOriginMode] = useState<"device" | "address">("device");
  const [originLabel, setOriginLabel] = useState("Your location");
  const [query, setQuery] = useState("");
  const [addresses, setAddresses] = useState<AddressResult[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "locating" | "routing">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.route>> | null>(null);
  const [departure, setDeparture] = useState<Date | null>(null);
  const [consumption, setConsumption] = useState("");
  const [pumpPrice, setPumpPrice] = useState("");
  const [fuelError, setFuelError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const searchController = useRef<AbortController | null>(null);
  const addressInput = useRef<TextInput>(null);
  const restoreFocus = useRef<() => void>(() => undefined);
  const fuelVisited = useRef(false);
  const busy = phase !== "idle";
  useEffect(() => () => { controller.current?.abort(); controller.current = null; searchController.current?.abort(); searchController.current = null; }, []);

  const invalidate = () => {
    controller.current?.abort(); controller.current = null;
    setPhase("idle"); setResult(null); setDeparture(null); setError(null);
  };
  const closeSheet = () => {
    searchController.current?.abort(); searchController.current = null;
    setSearchBusy(false); setSheetVisible(false);
  };
  const openSheet = (next: Sheet) => {
    if (!sheetVisible) restoreFocus.current = rememberFocus();
    if (next === "fuel" && !fuelVisited.current) {
      fuelVisited.current = true;
      setConsumption(preferences.consumptionLPer100Km ? (useKmPerLitre ? Number((100/preferences.consumptionLPer100Km).toPrecision(10)) : preferences.consumptionLPer100Km).toString() : "");
      setPumpPrice(preferences.priceOverrideZarPerLitre?.toString() ?? "");
      setFuelError(null);
    }
    setSheet(next);
    setSheetVisible(next !== null);
  };
  const estimate = async () => {
    if (controller.current) return;
    const request = new AbortController(); controller.current = request;
    setError(null); setResult(null); setDeparture(null);
    try {
      let start = originMode === "address" ? origin : null;
      if (!start) {
        setPhase("locating");
        const permission = await Location.requestForegroundPermissionsAsync();
        if (request.signal.aborted) return;
        if (permission.status !== "granted") throw new Error("Choose a starting place to estimate your trip.");
        const location = await getTripPosition(request.signal);
        if (request.signal.aborted) return;
        start = { latitude: location.coords.latitude, longitude: location.coords.longitude };
      }
      if (!validTripPoint(start)) throw new Error("Choose another starting place.");
      setOrigin(start); setPhase("routing");
      void refreshPrices().catch(() => undefined);
      const route = await api.route(start, { latitude: place.latitude, longitude: place.longitude }, false, request.signal);
      if (!request.signal.aborted) {
        setResult(route); setDeparture(new Date());
      }
    } catch (cause) {
      if (!request.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not estimate this trip. Try again.");
    } finally {
      if (controller.current === request) { controller.current = null; setPhase("idle"); }
    }
  };
  const searchAddress = async () => {
    if (query.trim().length < 3) return;
    searchController.current?.abort();
    const request = new AbortController(); searchController.current = request;
    setSearchBusy(true); setSearchError(null); setAddresses([]);
    try {
      const found = await api.search(query.trim(), request.signal);
      if (!request.signal.aborted) { setAddresses(found); if (!found.length) setSearchError("No matches. Try a suburb, street or landmark."); }
    } catch (cause) { if (!request.signal.aborted) setSearchError(cause instanceof Error ? cause.message : "Address search failed. Try again."); }
    finally { if (searchController.current === request) { searchController.current = null; setSearchBusy(false); } }
  };

  const journey = result && departure ? planJourney(result.outbound, departure, false) : null;
  const cache = fuelFeed.currentCache(prices?.cache ?? null);
  const referenceRegion = fuelRegionForLocation(originMode === "device" ? origin ?? coordinates : coordinates) ?? preferences.region;
  const reference = cache?.records.find(record => usableFuelPrice(record, preferences.grade, referenceRegion)) ?? null;
  const price = preferences.priceOverrideZarPerLitre ?? reference?.zarPerLitre ?? null;
  const fuel = journey ? estimateFuel(journey.totalKilometres, preferences.consumptionLPer100Km, price) : null;
  const arrivalHours = journey ? compareArrivalWithHours(journey.arrival, place.openingHours) : null;
  const kitchenArrivalHours = journey ? compareArrivalWithHours(journey.arrival, place.kitchenHours) : null;
  const mapBranches = useMemo(() => [place], [place]);
  const mapRoute = useMemo(() => result?.path ?? [], [result?.path]);
  const closingMinutes = arrivalHours?.minutesRemaining == null ? null : Math.floor(arrivalHours.minutesRemaining);
  useEffect(() => {
    onEstimateChange?.(journey ? { costZar: fuel?.costZar ?? null, litres: fuel?.litres ?? null, kilometres: journey.totalKilometres, arrival: journey.arrival.toISOString() } : null);
  }, [result, departure, preferences.consumptionLPer100Km, price, onEstimateChange]);
  const saveFuel = async () => {
    if (saving) return;
    const entered = Number(consumption.replace(",", "."));
    const use = positiveNumber(useKmPerLitre ? 100 / entered : entered, 100);
    const amount = positiveNumber(Number(pumpPrice.replace(",", ".")));
    if (!use || (!amount && !reference)) { setFuelError("Add your car's fuel use and the price per litre."); return; }
    setSaving(true); setFuelError(null);
    try { await save({ ...preferences, consumptionLPer100Km: use, priceOverrideZarPerLitre: pumpPrice.trim() ? amount : null }); closeSheet(); }
    catch { setFuelError("Could not save your fuel details. Try again."); }
    finally { setSaving(false); }
  };
  const directions = () => void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}${originMode === "address" && origin ? `&origin=${origin.latitude},${origin.longitude}` : ""}&travelmode=driving`).catch(() => setError("Could not open directions."));

  return <View style={styles.section}>
    {!sheetVisible ? <>
    {journey && result ? <View accessibilityLiveRegion="polite" style={styles.receipt}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryAmount}><Text style={styles.amount}>{fuel?.costZar != null ? `R ${fuel.costZar.toFixed(2)}` : `${Math.ceil(result.outbound.durationSeconds / 60)} min`}</Text><Text style={styles.caption}>{fuel?.costZar != null ? "Estimated fuel cost" : "Estimated drive"}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Hours at arrival" onPress={() => openSheet("arrival")} style={styles.closingBuffer}>
          <Text style={styles.bufferValue}>{closingMinutes != null ? `${Math.floor(closingMinutes / 60)}hr ${closingMinutes % 60}min` : arrivalHours?.state === "outside" ? "Outside listed hours" : "Hours not listed"}</Text>
          <Text style={styles.bufferCaption}>{closingMinutes != null ? "Before listed closing" : "Check before leaving"}</Text>
        </Pressable>
      </View>
      {price != null ? <Text style={styles.caption}>{`${preferences.grade ? fuelLabels[preferences.grade] : "Fuel"}: R${price.toFixed(2)}`}</Text> : null}
      {price == null && (pricesLoading || prices?.updateState === "failed") ? <Text style={styles.caption}>{pricesLoading ? "Getting prices" : "Price unavailable"}</Text> : null}
      {fuel?.costZar == null ? <Pressable accessibilityRole="button" onPress={() => openSheet("fuel")} style={styles.textCommand}><Fuel color={colours.primary} size={18} /><Text style={styles.link}>Add fuel details for a cost</Text></Pressable> : null}
    </View> : null}
    <View style={styles.controls}>
      <View style={styles.field}><Text style={styles.caption}>From</Text><Pressable accessibilityRole="button" accessibilityLabel={`From: ${originLabel}. Change from`} disabled={busy} onPress={() => openSheet("origin")} style={({ pressed }) => [styles.routeField, pressed && styles.pressed]}><Text style={styles.routeValue}>{originLabel}</Text><MapPin size={24} color={colours.muted}/></Pressable></View>
      <View style={styles.field}><Text style={styles.caption}>To</Text><View accessible accessibilityLabel={`To: ${place.name}, ${place.area}`} style={styles.routeField}><Text style={styles.routeValue}>{place.name}</Text><Navigation size={24} color={colours.muted}/></View></View>
    </View>
    <BranchMap branches={mapBranches} route={mapRoute}/>
    <FeedbackToast message={error} onDismiss={() => setError(null)} action={{ label: "Change starting place", onPress: () => openSheet("origin") }}/>
    {!api.configured ? <Text style={styles.note}>Trip estimates are not connected in this build.</Text> : null}
    <ActionButton label={phase === "locating" ? "Locating..." : phase === "routing" ? "Estimating..." : result ? "Open directions" : "Estimate my trip"} tone="green" size="large" loading={busy} disabled={!validTripPoint(place) || (!api.configured && !result)} onPress={() => result ? directions() : void estimate()} />
    {!result ? <Text style={styles.consent}>Uses your starting place for this estimate.</Text> : null}
    </> : null}
    <TripSheet title={sheet === "origin" ? "Where are you leaving from?" : sheet === "fuel" ? "Your fuel details" : "Hours at arrival"} visible={sheetVisible} onClose={closeSheet} onDismiss={() => restoreFocus.current()} onShow={() => { if (sheet === "origin") addressInput.current?.focus(); }}>
      {sheet === "origin" ? <>
        <ActionButton label="Use my location" tone="light" icon={<Navigation color={colours.text} size={18}/>} onPress={() => { invalidate(); setOriginMode("device"); setOrigin(null); setOriginLabel("Your location"); closeSheet(); }} />
        <View style={styles.search}><Search size={20} color={colours.muted}/><TextInput ref={addressInput} autoFocus accessibilityLabel="Starting address" placeholder="Suburb, street or landmark" placeholderTextColor={colours.muted} value={query} onChangeText={value => { searchController.current?.abort(); setSearchBusy(false); setQuery(value); setAddresses([]); setSearchError(null); }} onSubmitEditing={() => void searchAddress()} returnKeyType="search" style={styles.searchInput} /><Pressable accessibilityRole="button" accessibilityLabel="Search starting places" disabled={searchBusy || query.trim().length < 3} onPress={() => void searchAddress()} style={styles.iconButton}>{searchBusy ? <ActivityIndicator color={colours.primary}/> : <ArrowUpRight size={20} color={colours.primary}/>}</Pressable></View>
        <FeedbackToast message={searchError} onDismiss={() => setSearchError(null)}/>
        {addresses.map(item => <Pressable accessibilityRole="button" key={item.id} onPress={() => { invalidate(); setOriginMode("address"); setOrigin(item); setOriginLabel(item.label); closeSheet(); }} style={styles.address}><MapPin color={colours.muted} size={18}/><Text style={styles.controlValue}>{item.label}</Text></Pressable>)}
      </> : sheet === "fuel" ? <>
        <Text style={styles.note}>Saved on this device for your next trip.</Text>
        <Text style={styles.controlValue}>Car's fuel use ({useKmPerLitre ? "km/l" : "L/100 km"})</Text><TextInput accessibilityLabel={useKmPerLitre ? "Car fuel use in kilometres per litre" : "Car fuel use in litres per 100 kilometres"} value={consumption} onChangeText={setConsumption} keyboardType="decimal-pad" placeholder={useKmPerLitre ? "e.g. 12.5" : "e.g. 7.5"} placeholderTextColor={colours.muted} style={styles.input}/>
        <Text style={styles.controlValue}>Fuel price (R/litre)</Text><TextInput accessibilityLabel="Fuel price in rand per litre" value={pumpPrice} onChangeText={setPumpPrice} keyboardType="decimal-pad" placeholder={reference ? reference.zarPerLitre.toFixed(2) : "Price you pay at the pump"} placeholderTextColor={colours.muted} style={styles.input}/>
        {!pumpPrice.trim() ? <Text style={styles.caption}>{reference ? `Reference R ${reference.zarPerLitre.toFixed(2)}/litre` : pricesLoading ? "Getting prices" : "Price unavailable"}</Text> : null}
        <FeedbackToast message={fuelError} onDismiss={() => setFuelError(null)}/>
        <ActionButton label={saving ? "Saving..." : "Save fuel details"} tone="green" loading={saving} onPress={() => void saveFuel()}/>
      </> : sheet === "arrival" && journey ? <>
        <Text style={styles.note}>Arrive {journey.arrival.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Johannesburg" })} at {clock(journey.arrival)} / South African time</Text>
        <Text style={styles.controlValue}>Trading</Text><Text style={styles.note}>{arrivalHours ? describeArrivalHours(arrivalHours) : "Hours not available for arrival."}</Text>
        {arrivalHours?.endsAt ? <Text style={styles.caption}>Listed closing time {clock(new Date(arrivalHours.endsAt))}</Text> : null}
        <Text style={styles.controlValue}>Kitchen / service</Text><Text style={styles.note}>{kitchenArrivalHours ? describeArrivalHours(kitchenArrivalHours) : "Hours not available for arrival."}</Text>
        {kitchenArrivalHours?.endsAt ? <Text style={styles.caption}>Listed service ends {clock(new Date(kitchenArrivalHours.endsAt))}</Text> : null}
        <Text style={styles.note}>Listed hours are not a check. Reports do not predict conditions at arrival.</Text>
      </> : null}
    </TripSheet>
  </View>;
}

function TripSheet({ title, visible, onClose, onDismiss, onShow, children }: { title: string; visible: boolean; onClose: () => void; onDismiss: () => void; onShow: () => void; children: ReactNode }) {
  const styles = useThemeStyles(createStyles);
  const { colours } = useTheme();
  const callbacks = useRef({ onShow, onDismiss });
  callbacks.current = { onShow, onDismiss };
  useEffect(() => { if (!visible) return; callbacks.current.onShow(); return () => callbacks.current.onDismiss(); }, [visible]);
  if (!visible) return null;
  return <View style={styles.section}>
    <View style={styles.sheetHeading}><Pressable accessibilityLabel="Back to trip estimate" accessibilityRole="button" onPress={onClose} style={styles.iconButton}><ChevronLeft color={colours.text} size={22}/></Pressable><Text accessibilityRole="header" style={styles.sheetTitle}>{title}</Text></View>
    <View style={styles.sheetContent}>{children}</View>
  </View>;
}
// Styles
const createStyles = (colours: ThemeColours) => StyleSheet.create({
  section: { gap: space.md },
  note: { color: colours.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 22 },
  caption: { color: colours.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 },
  iconButton: { width: sizes.touch, height: sizes.touch, alignItems: "center", justifyContent: "center" },
  controls: { gap: 15 },
  field: { gap: 3 },
  routeField: { minHeight: 54, paddingVertical: 15, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: space.sm, backgroundColor: colours.sheetInset, borderRadius: radii.inset, borderTopLeftRadius: radii.inset / 4 },
  routeValue: { flex: 1, minWidth: 0, color: colours.text, fontFamily: fonts.medium, fontSize: 16, lineHeight: 24 },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", columnGap: space.sm, rowGap: space.xs },
  summaryAmount: { flexShrink: 1 },
  closingBuffer: { flexShrink: 1, minHeight: sizes.touch, justifyContent: "center", alignItems: "flex-end", maxWidth: "48%" },
  bufferValue: { color: colours.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, textAlign: "right" },
  bufferCaption: { color: colours.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, textAlign: "right" },
  tripOptions: { flexDirection: "row", alignItems: "center", gap: space.xs },
  option: { flex: 1, minWidth: 0, minHeight: sizes.touch, flexDirection: "row", alignItems: "center", gap: space.xs },
  optionText: { flexShrink: 1, color: colours.muted, fontFamily: fonts.medium, fontSize: 14, lineHeight: 21 },
  controlValue: { flexShrink: 1, color: colours.text, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 },
  receipt: { gap: space.sm, paddingHorizontal: space.sm, paddingVertical: space.sm },
  amount: { color: colours.text, fontFamily: fonts.extraBold, fontSize: 44, lineHeight: 53 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  metric: { color: colours.text, fontFamily: fonts.medium, fontSize: 14, lineHeight: 22 },
  warning: { color: colours.closed, fontFamily: fonts.regular, fontSize: 14, lineHeight: 22 },
  consent: { color: colours.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, textAlign: "center" },
  returnRow: { flexDirection: "row", alignItems: "center", gap: space.xs, minHeight: sizes.touch },
  returnCaption: { maxWidth: 58, color: colours.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 },
  textCommand: { minHeight: sizes.touch, flexDirection: "row", alignItems: "center", gap: space.sm },
  link: { flexShrink: 1, color: colours.primary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 22 },
  errorRow: { gap: space.xs }, pressed: { opacity: 0.92 },
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: { maxHeight: "90%", paddingHorizontal: space.lg, paddingTop: space.md, borderTopLeftRadius: radii.sheet, borderTopRightRadius: radii.sheet, backgroundColor: colours.sheetSurface },
  sheetHeading: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingBottom: space.md },
  sheetTitle: { flex: 1, color: colours.text, fontFamily: fonts.extraBold, fontSize: 22, lineHeight: 30, paddingBottom: space.xs },
  sheetContent: { gap: space.md, paddingBottom: space.md },
  search: { flexDirection: "row", alignItems: "center", gap: space.sm, borderWidth: 1, borderColor: colours.controlBorder, borderRadius: radii.control, paddingLeft: space.md, backgroundColor: colours.control },
  searchInput: { flex: 1, minWidth: 0, minHeight: sizes.control, color: colours.text, fontFamily: fonts.regular, fontSize: 16 },
  input: { minHeight: sizes.control, padding: space.md, borderWidth: 1, borderColor: colours.controlBorder, borderRadius: radii.control, backgroundColor: colours.control, color: colours.text, fontFamily: fonts.regular, fontSize: 16 },
  address: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: sizes.control, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colours.border },
  dayChips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm }
});
