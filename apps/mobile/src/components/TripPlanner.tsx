// Hallmark: decision-led place flow; KNOGO tokens; P5 H5 E4 S5 R5 V4.
import { compareArrivalWithHours, createTripApi, estimateFuel, planJourney, positiveNumber, usableFuelPrice, validTripPoint, withSouthAfricanDepartureDay, type AddressResult, type Place, type TripPoint } from "@knogo/core";
import * as Location from "expo-location";
import { ArrowUpRight, Clock3, Fuel, Info, MapPin, Navigation, RefreshCw, Search, X } from "lucide-react-native";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { StagedModal } from "./StagedModal";
import { HapticPressable as Pressable } from "./HapticPressable";
import { ctaHaptic } from "../haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFuel } from "../state/FuelContext";
import { fuelFeed } from "../fuelFeed";
import { fonts, radii, sizes, space, useTheme, useThemeStyles, type ThemeColours } from "../theme";
import { ActionButton, Chip } from "./Ui";
import { DeparturePicker } from "./DeparturePicker";
import { rememberFocus } from "./AccessibilityStyles";
import { describeArrivalHours } from "../arrivalPresentation";
import { getTripPosition } from "../tripLocation";

const api = createTripApi({ url: process.env.EXPO_PUBLIC_TRIP_API_URL, publishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY });
export type TripEstimateSummary = { costZar: number | null; litres: number | null; kilometres: number; arrival: string; includeReturn: boolean };
type Sheet = "origin" | "time" | "about" | "fuel" | "arrival" | null;
const clock = (date: Date) => date.toLocaleTimeString("en-ZA", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit", hour12: false });

export function TripPlanner({ place, onEstimateChange }: { place: Place; onEstimateChange?: (summary: TripEstimateSummary | null) => void }) {
  const styles = useThemeStyles(createStyles);
  const { colours } = useTheme();
  const { preferences, save, prices, refreshPrices } = useFuel();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [origin, setOrigin] = useState<TripPoint | null>(null);
  const [originMode, setOriginMode] = useState<"device" | "address">("device");
  const [originLabel, setOriginLabel] = useState("Your location");
  const [query, setQuery] = useState("");
  const [addresses, setAddresses] = useState<AddressResult[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [leaveNow, setLeaveNow] = useState(true);
  const [chosenDeparture, setChosenDeparture] = useState(() => new Date(Date.now() + 3600000));
  const [draftDeparture, setDraftDeparture] = useState(chosenDeparture);
  const [includeReturn, setIncludeReturn] = useState(false);
  const [phase, setPhase] = useState<"idle" | "locating" | "routing">("idle");
  const [error, setError] = useState<string | null>(null);
  const [returnError, setReturnError] = useState<string | null>(null);
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
  const busy = phase !== "idle";
  useEffect(() => () => { controller.current?.abort(); controller.current = null; searchController.current?.abort(); searchController.current = null; }, []);

  const invalidate = () => {
    controller.current?.abort(); controller.current = null;
    setPhase("idle"); setResult(null); setDeparture(null); setError(null); setReturnError(null);
  };
  const closeSheet = () => {
    searchController.current?.abort(); searchController.current = null;
    setSearchBusy(false); setSheetVisible(false);
  };
  const openSheet = (next: Sheet) => {
    if (!sheetVisible) restoreFocus.current = rememberFocus();
    if (next === "time") setDraftDeparture(leaveNow ? new Date(Date.now() + 3600000) : chosenDeparture);
    if (next === "fuel") {
      setConsumption(preferences.consumptionLPer100Km?.toString() ?? "");
      setPumpPrice(preferences.priceOverrideZarPerLitre?.toString() ?? "");
      setFuelError(null);
    }
    setSheet(next);
    setSheetVisible(next !== null);
  };
  const estimate = async (point?: TripPoint, returnTrip = includeReturn, useDevice = false) => {
    if (controller.current) return;
    const request = new AbortController(); controller.current = request;
    setError(null); setReturnError(null); setResult(null); setDeparture(null);
    const leaving = leaveNow ? new Date() : chosenDeparture;
    try {
      if (leaving.getTime() < Date.now() - 60000) throw new Error("That departure has passed. Choose another time.");
      let start = useDevice ? null : point ?? (originMode === "address" ? origin : null);
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
      const route = await api.route(start, { latitude: place.latitude, longitude: place.longitude }, returnTrip, request.signal);
      if (!request.signal.aborted) {
        setResult(route); setDeparture(leaveNow ? new Date() : leaving); setIncludeReturn(returnTrip);
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

  const journey = result && departure ? planJourney(result.outbound, departure, includeReturn, result.returnLeg) : null;
  const cache = fuelFeed.currentCache(prices?.cache ?? null);
  const reference = cache?.records.find(record => usableFuelPrice(record, preferences.grade, preferences.region)) ?? null;
  const price = preferences.priceOverrideZarPerLitre ?? reference?.zarPerLitre ?? null;
  const fuel = journey ? estimateFuel(journey.totalKilometres, preferences.consumptionLPer100Km, price) : null;
  const arrivalHours = journey ? compareArrivalWithHours(journey.arrival, place.openingHours) : null;
  const kitchenArrivalHours = journey ? compareArrivalWithHours(journey.arrival, place.kitchenHours) : null;
  useEffect(() => {
    onEstimateChange?.(journey ? { costZar: fuel?.costZar ?? null, litres: fuel?.litres ?? null, kilometres: journey.totalKilometres, arrival: journey.arrival.toISOString(), includeReturn } : null);
  }, [result, departure, includeReturn, preferences.consumptionLPer100Km, price, onEstimateChange]);
  const changeReturn = async (value: boolean) => {
    if (controller.current) return;
    setReturnError(null);
    if (!value || result?.returnLeg) { setIncludeReturn(value); return; }
    if (!result || !origin) return;
    const request = new AbortController(); controller.current = request;
    setPhase("routing");
    try {
      // A return leg changes fuel distance, never the accepted outbound arrival.
      const route = await api.route({ latitude: place.latitude, longitude: place.longitude }, origin, false, request.signal);
      if (!request.signal.aborted) {
        setResult(current => current ? { ...current, returnLeg: route.outbound } : null);
        setIncludeReturn(true);
      }
    } catch {
      if (!request.signal.aborted) {
        setReturnError("Return route unavailable. Using twice the outbound distance for fuel.");
        setIncludeReturn(true);
      }
    } finally {
      if (controller.current === request) { controller.current = null; setPhase("idle"); }
    }
  };
  const saveFuel = async () => {
    if (saving) return;
    const use = positiveNumber(Number(consumption.replace(",", ".")), 100);
    const amount = positiveNumber(Number(pumpPrice.replace(",", ".")));
    if (!use || (!amount && !reference)) { setFuelError("Add your car's L/100 km and the price per litre."); return; }
    setSaving(true); setFuelError(null);
    try { await save({ ...preferences, consumptionLPer100Km: use, priceOverrideZarPerLitre: pumpPrice.trim() ? amount : null }); closeSheet(); }
    catch { setFuelError("Could not save your fuel details. Try again."); }
    finally { setSaving(false); }
  };
  const directions = () => void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}${originMode === "address" && origin ? `&origin=${origin.latitude},${origin.longitude}` : ""}&travelmode=driving`).catch(() => setError("Could not open directions."));
  const control = (label: string, value: string, icon: ReactNode, onPress: () => void) => <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}. Change ${label.toLowerCase()}`} disabled={busy} onPress={onPress} style={({ pressed }) => [styles.control, pressed && styles.pressed]}>{icon}<View style={styles.controlCopy}><Text style={styles.caption}>{label}</Text><Text numberOfLines={2} style={styles.controlValue}>{value}</Text></View><ArrowUpRight color={colours.muted} size={18} /></Pressable>;

  return <View style={styles.section}>
    <View style={styles.heading}><View style={styles.headingCopy}><Text accessibilityRole="header" style={styles.title}>{result ? "Trip estimate" : "Distance & fuel"}</Text></View>{result ? <Pressable accessibilityRole="button" accessibilityLabel="Refresh trip estimate" disabled={busy} onPress={() => void estimate()} style={styles.iconButton}><RefreshCw size={19} color={colours.muted}/></Pressable> : null}<Pressable accessibilityRole="button" accessibilityLabel="How trip estimates work" onPress={() => openSheet("about")} style={styles.iconButton}><Info size={20} color={colours.muted} /></Pressable></View>
    {journey && result ? <View accessibilityLiveRegion="polite" style={styles.receipt}>
      <Text style={styles.caption}>{fuel?.costZar != null ? `Estimated fuel / ${includeReturn ? "there and back" : "one way"}` : "Estimated drive"}</Text>
      <Text style={styles.amount}>{fuel?.costZar != null ? `R ${fuel.costZar.toFixed(2)}` : `${Math.ceil(result.outbound.durationSeconds / 60)} min`}</Text>
      <View style={styles.metrics}><Text style={styles.metric}>{journey.outboundKilometres.toFixed(1)} km away</Text><Text style={styles.metric}>{Math.ceil(result.outbound.durationSeconds / 60)} min drive</Text><Text style={styles.metric}>Arrive {clock(journey.arrival)}</Text></View>
      {returnError ? <Text accessibilityLiveRegion="polite" style={styles.note}>{returnError}</Text> : journey.returnAssumption ? <Text style={styles.note}>{journey.returnAssumption}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Hours at arrival" onPress={() => openSheet("arrival")} style={styles.textCommand}><Clock3 color={colours.muted} size={18}/><Text style={styles.arrival}>{arrivalHours ? describeArrivalHours(arrivalHours) : "Hours at arrival"}</Text><ArrowUpRight color={colours.muted} size={18}/></Pressable>
      {fuel?.costZar == null ? <Pressable accessibilityRole="button" onPress={() => openSheet("fuel")} style={styles.textCommand}><Fuel color={colours.primary} size={18} /><Text style={styles.link}>Add fuel details for a cost</Text></Pressable> : null}
    </View> : null}
    <View style={styles.controls}>
      {control("From", originLabel, <MapPin size={19} color={colours.muted} />, () => openSheet("origin"))}
      <View accessible accessibilityLabel={`To: ${place.name}, ${place.area}`} style={styles.destination}><Navigation size={19} color={colours.primary}/><View style={styles.controlCopy}><Text style={styles.caption}>To</Text><Text style={styles.controlValue}>{place.name}</Text><Text style={styles.caption}>{place.area}</Text></View></View>
    </View>
    {control("Leaving", leaveNow ? "Now" : chosenDeparture.toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }), <Clock3 size={19} color={colours.muted} />, () => openSheet("time"))}
    {error ? <View style={styles.errorRow}><Text accessibilityRole="alert" style={styles.warning}>{error}</Text><Pressable accessibilityRole="button" onPress={() => openSheet("origin")} style={styles.textCommand}><Text style={styles.link}>Change starting place</Text></Pressable></View> : null}
    {!api.configured ? <Text style={styles.note}>Trip estimates are not connected in this build.</Text> : null}
    <ActionButton label={phase === "locating" ? "Locating..." : phase === "routing" ? "Estimating..." : result ? "Open directions" : "Estimate my trip"} tone="green" loading={busy} icon={<Navigation color={colours.background} size={18} />} disabled={!validTripPoint(place) || (!api.configured && !result)} onPress={() => result ? directions() : void estimate()} />
    {!result ? <Text style={styles.consent}>Uses your starting place for this estimate.</Text> : <View style={styles.returnRow}><Text style={styles.controlValue}>Include return fuel</Text><Switch accessibilityLabel="Include return fuel" value={includeReturn} disabled={busy} onValueChange={value => { if (busy) return; ctaHaptic(); void changeReturn(value); }} trackColor={{ false: colours.controlStrong, true: colours.primary }} thumbColor={colours.paper} /></View>}
    <TripSheet title={sheet === "origin" ? "Where are you leaving from?" : sheet === "time" ? "When are you leaving?" : sheet === "fuel" ? "Your fuel details" : sheet === "arrival" ? "Hours at arrival" : "How estimates work"} visible={sheetVisible} onClose={closeSheet} onDismiss={() => restoreFocus.current()} onShow={() => { if (sheet === "origin") addressInput.current?.focus(); }}>
      {sheet === "origin" ? <>
        <ActionButton label="Use my location" tone="light" icon={<Navigation color={colours.text} size={18}/>} onPress={() => { invalidate(); setOriginMode("device"); setOrigin(null); setOriginLabel("Your location"); closeSheet(); void estimate(undefined, includeReturn, true); }} />
        <Text style={styles.caption}>Or choose another starting place</Text>
        <View style={styles.search}><Search size={20} color={colours.muted}/><TextInput ref={addressInput} autoFocus accessibilityLabel="Starting address" placeholder="Suburb, street or landmark" placeholderTextColor={colours.muted} value={query} onChangeText={value => { searchController.current?.abort(); setSearchBusy(false); setQuery(value); setAddresses([]); setSearchError(null); }} onSubmitEditing={() => void searchAddress()} returnKeyType="search" style={styles.searchInput} /><Pressable accessibilityRole="button" accessibilityLabel="Search starting places" disabled={searchBusy || query.trim().length < 3} onPress={() => void searchAddress()} style={styles.iconButton}>{searchBusy ? <ActivityIndicator color={colours.primary}/> : <ArrowUpRight size={20} color={colours.primary}/>}</Pressable></View>
        {searchError ? <Text accessibilityRole="alert" style={styles.warning}>{searchError}</Text> : null}
        {addresses.map(item => <Pressable accessibilityRole="button" key={item.id} onPress={() => { invalidate(); setOriginMode("address"); setOrigin(item); setOriginLabel(item.label); closeSheet(); void estimate(item); }} style={styles.address}><MapPin color={colours.muted} size={18}/><Text style={styles.controlValue}>{item.label}</Text></Pressable>)}
      </> : sheet === "time" ? <>
        <ActionButton label="Leave now" tone="light" onPress={() => { setLeaveNow(true); if (result) setDeparture(new Date()); closeSheet(); }}/>
        <Text style={styles.caption}>Or plan for later / South African time</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Departure day" style={styles.dayChips}>{[0, 1].map(offset => <Chip role="radio" key={offset} label={offset ? "Tomorrow" : "Today"} selected={withSouthAfricanDepartureDay(draftDeparture, offset).getTime() === new Date(Math.floor(draftDeparture.getTime() / 60000) * 60000).getTime()} onPress={() => setDraftDeparture(withSouthAfricanDepartureDay(draftDeparture, offset))}/>)}</View>
        <DeparturePicker value={draftDeparture} onChange={setDraftDeparture}/>
        {draftDeparture.getTime() < Date.now() - 60000 ? <Text accessibilityRole="alert" style={styles.warning}>Choose a time that has not passed.</Text> : null}
        <ActionButton label="Use this departure" tone="green" disabled={draftDeparture.getTime() < Date.now() - 60000} onPress={() => { setChosenDeparture(draftDeparture); setLeaveNow(false); if (result) setDeparture(draftDeparture); closeSheet(); }}/>
      </> : sheet === "fuel" ? <>
        <Text style={styles.note}>Saved on this device for your next trip.</Text>
        <Text style={styles.controlValue}>Car's fuel use (L/100 km)</Text><TextInput accessibilityLabel="Car fuel use in litres per 100 kilometres" value={consumption} onChangeText={setConsumption} keyboardType="decimal-pad" placeholder="e.g. 7.5" placeholderTextColor={colours.muted} style={styles.input}/>
        <Text style={styles.controlValue}>Fuel price (R/litre)</Text><TextInput accessibilityLabel="Fuel price in rand per litre" value={pumpPrice} onChangeText={setPumpPrice} keyboardType="decimal-pad" placeholder={reference ? reference.zarPerLitre.toFixed(2) : "Price you pay at the pump"} placeholderTextColor={colours.muted} style={styles.input}/>
        {fuelError ? <Text accessibilityRole="alert" style={styles.warning}>{fuelError}</Text> : null}
        <ActionButton label={saving ? "Saving..." : "Save fuel details"} tone="green" loading={saving} onPress={() => void saveFuel()}/>
      </> : sheet === "arrival" && journey ? <>
        <Text style={styles.note}>Arrive {journey.arrival.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Johannesburg" })} at {clock(journey.arrival)} / South African time</Text>
        <Text style={styles.controlValue}>Trading</Text><Text style={styles.note}>{arrivalHours ? describeArrivalHours(arrivalHours) : "Hours not available for arrival."}</Text>
        {arrivalHours?.endsAt ? <Text style={styles.caption}>Listed closing time {clock(new Date(arrivalHours.endsAt))}</Text> : null}
        <Text style={styles.controlValue}>Kitchen / service</Text><Text style={styles.note}>{kitchenArrivalHours ? describeArrivalHours(kitchenArrivalHours) : "Hours not available for arrival."}</Text>
        {kitchenArrivalHours?.endsAt ? <Text style={styles.caption}>Listed service ends {clock(new Date(kitchenArrivalHours.endsAt))}</Text> : null}
        <Text style={styles.note}>These are listed hours, not a check. Reports describe conditions when they were submitted, not when you arrive.</Text>
      </> : sheet === "about" ? <>
        <Text style={styles.controlValue}>An estimate, not a promise</Text><Text style={styles.note}>Distance comes from openrouteservice. Drive time does not include live traffic. Fuel cost uses your car's fuel use and the price per litre.</Text>
        <Text style={styles.controlValue}>Your starting place</Text><Text style={styles.note}>Your start and the venue are sent through KNOGO's route service to openrouteservice. KNOGO does not save your starting location. Location is used only when you ask for an estimate.</Text>
        <Text style={styles.controlValue}>Hours and reports</Text><Text style={styles.note}>Listed hours show when service is expected, not proof that everything is working. Reports describe conditions at the time of the check, not when you arrive.</Text>
        {journey?.returnAssumption ? <Text style={styles.note}>{journey.returnAssumption}</Text> : null}
        {fuel?.litres != null ? <Text style={styles.note}>{journey?.totalKilometres.toFixed(1)} km fuel distance / {fuel.litres.toFixed(2)} litres / {preferences.consumptionLPer100Km} L/100 km / R{price?.toFixed(2)} per litre.</Text> : null}
        {reference && !preferences.priceOverrideZarPerLitre ? <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(reference.sourceUrl).catch(() => setError("Could not open the fuel price source."))} style={styles.textCommand}><Text style={styles.link}>Fuel price source{reference.kind === "wholesale_reference" ? " / wholesale reference" : ""}</Text></Pressable> : null}
        {reference && !preferences.priceOverrideZarPerLitre ? <Text style={styles.note}>Price checked {new Date(reference.checkedAt).toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg" })}. In effect until {new Date(reference.effectiveUntil).toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg" })}. {reference.kind === "wholesale_reference" ? "This is a wholesale reference, not the price promised at the pump." : "Pump prices and fuel use may differ."}{prices?.source === "cache" ? " Showing a cached reference." : ""}</Text> : null}
        <Pressable accessibilityRole="button" onPress={() => openSheet("fuel")} style={styles.textCommand}><Text style={styles.link}>Change fuel details</Text></Pressable>
      </> : null}
    </TripSheet>
  </View>;
}

function TripSheet({ title, visible, onClose, onDismiss, onShow, children }: { title: string; visible: boolean; onClose: () => void; onDismiss: () => void; onShow: () => void; children: ReactNode }) {
  const styles = useThemeStyles(createStyles);
  const { colours } = useTheme();
  const insets = useSafeAreaInsets();
  return <StagedModal visible={visible} onRequestClose={onClose} onDismiss={onDismiss} onReady={onShow}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.overlay}>
      <Pressable accessible={false} focusable={false} onPress={onClose} style={StyleSheet.absoluteFill}/>
      <View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: space.md + insets.bottom, marginTop: insets.top + space.lg }]}>
        <View style={styles.sheetHeading}><Text accessibilityRole="header" style={styles.sheetTitle}>{title}</Text><Pressable accessibilityLabel="Close trip sheet" accessibilityRole="button" onPress={onClose} style={styles.iconButton}><X color={colours.text} size={22}/></Pressable></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>{children}</ScrollView>
      </View>
    </KeyboardAvoidingView>
  </StagedModal>;
}
const createStyles = (colours: ThemeColours) => StyleSheet.create({
  section: { gap: space.md },
  heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.sm },
  headingCopy: { flex: 1, minWidth: 0 },
  title: { color: colours.text, fontFamily: fonts.semibold, fontSize: 18, lineHeight: 25 },
  note: { color: colours.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 22 },
  caption: { color: colours.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 },
  iconButton: { width: sizes.touch, height: sizes.touch, alignItems: "center", justifyContent: "center" },
  controls: { borderRadius: radii.surface, overflow: "hidden", backgroundColor: colours.elevated },
  control: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 64, paddingHorizontal: space.md, paddingVertical: space.sm, backgroundColor: colours.elevated, borderRadius: radii.surface },
  destination: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 80, padding: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colours.border },
  controlCopy: { flex: 1, minWidth: 0, gap: 2 },
  controlValue: { flexShrink: 1, color: colours.text, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 },
  receipt: { gap: space.sm, paddingVertical: space.sm },
  amount: { color: colours.text, fontFamily: fonts.extraBold, fontSize: 44, lineHeight: 56, paddingBottom: space.xs },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  metric: { color: colours.text, fontFamily: fonts.medium, fontSize: 14, lineHeight: 22 },
  arrival: { color: colours.muted, fontFamily: fonts.medium, fontSize: 14, lineHeight: 22 },
  warning: { color: colours.closed, fontFamily: fonts.regular, fontSize: 14, lineHeight: 22 },
  consent: { color: colours.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, textAlign: "center" },
  returnRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm, minHeight: sizes.touch },
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
