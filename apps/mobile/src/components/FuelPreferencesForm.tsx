import { calculateTankConsumption, emptyFuelPreferences, positiveNumber, type FuelGrade, type FuelPreferences, type FuelRegion } from "@knogo/core";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Check, ChevronDown } from "lucide-react-native";
import { HapticPressable as Pressable } from "./HapticPressable";
import { fonts, useTheme, useThemeStyles, type ThemeColours } from "../theme";
import { ActionButton, Chip } from "./Ui";

const grades: Array<[FuelGrade, string]> = [["petrol_93", "Petrol 93"], ["petrol_95", "Petrol 95"], ["diesel_50ppm", "Diesel 50 ppm"], ["diesel_500ppm", "Diesel 500 ppm"]];
export function FuelPreferencesForm({ preferences, onSave, allowClear = false }: { preferences: FuelPreferences; onSave: (value: FuelPreferences) => Promise<void>; allowClear?: boolean }) {
  const styles = useThemeStyles(createStyles);
  const { colours } = useTheme();
  const [consumption, setConsumption] = useState(preferences.consumptionLPer100Km?.toString() ?? "");
  const [price, setPrice] = useState(preferences.priceOverrideZarPerLitre?.toString() ?? "");
  const [grade, setGrade] = useState<FuelGrade | null>(preferences.grade);
  const [region, setRegion] = useState<FuelRegion | null>(preferences.region);
  const [method, setMethod] = useState<"dashboard" | "tank">("dashboard");
  const [distance, setDistance] = useState("");
  const [litres, setLitres] = useState("");
  const [fullTank, setFullTank] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dropdown, setDropdown] = useState<"grade" | "region" | null>(null);
  const writing = useRef(false);
  useEffect(() => {
    setConsumption(preferences.consumptionLPer100Km?.toString() ?? "");
    setPrice(preferences.priceOverrideZarPerLitre?.toString() ?? "");
    setGrade(preferences.grade);
    setRegion(preferences.region);
  }, [preferences]);
  const number = (value: string) => Number(value.trim().replace(",", "."));
  const save = async (clear = false) => {
    if (writing.current) return;
    setMessage(null);
    const value = method === "tank" ? calculateTankConsumption(number(distance), number(litres), fullTank) : consumption.trim() ? positiveNumber(number(consumption), 100) : null;
    if (!clear && ((method === "tank" && value === null) || (consumption.trim() && method === "dashboard" && value === null) || (price.trim() && positiveNumber(number(price)) === null))) {
      setMessage("Enter a number above zero. Tank-fill setup needs the distance, litres and two fills to full."); return;
    }
    writing.current = true;
    setBusy(true);
    try {
      await onSave(clear ? { ...emptyFuelPreferences } : { consumptionLPer100Km: value, grade, region, priceOverrideZarPerLitre: price.trim() ? number(price) : null });
      if (clear) { setConsumption(""); setPrice(""); setGrade(null); setRegion(null); setMethod("dashboard"); }
      setMessage(clear ? "Fuel setup cleared." : "Fuel setup saved on this device.");
    } catch { setMessage("Could not save on this device. Try again."); }
    finally { writing.current = false; setBusy(false); }
  };
  const input = (label: string, value: string, onChange: (value: string) => void) => <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} style={styles.input} value={value} onChangeText={onChange} keyboardType="decimal-pad" editable={!busy} placeholder="Not set" placeholderTextColor={colours.muted} /></View>;
  const select = <T extends string,>(id: "grade" | "region", label: string, value: T | null, options: Array<[T, string]>, onChange: (value: T | null) => void) => <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${options.find(([key]) => key === value)?.[1] ?? "Not set"}`} accessibilityState={{ expanded: dropdown === id, disabled: busy }} aria-expanded={dropdown === id} disabled={busy} onPress={() => setDropdown(dropdown === id ? null : id)} style={styles.select}>
      <Text style={styles.selectText}>{options.find(([key]) => key === value)?.[1] ?? "Not set"}</Text><ChevronDown color={colours.muted} size={18}/>
    </Pressable>
    {dropdown === id ? <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.menu}>{([[null, "Not set"], ...options] as Array<[T | null, string]>).map(([key, text]) => <Pressable key={key ?? "unset"} accessibilityRole="radio" accessibilityLabel={text} accessibilityState={{ checked: key === value, disabled: busy }} aria-checked={key === value} disabled={busy} onPress={() => { onChange(key); setDropdown(null); }} style={({ pressed }) => [styles.menuOption, key === value && styles.menuSelected, pressed && styles.pressed]}><Text style={styles.selectText}>{text}</Text>{key === value ? <Check color={colours.primary} size={18}/> : null}</Pressable>)}</View> : null}
  </View>;
  return <View style={styles.form}>
    <View accessibilityRole="tablist" accessibilityLabel="Consumption calculation method" style={styles.tabs}>{([['dashboard', 'Dashboard L/100 km'], ['tank', 'Tank-fill calculation']] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: method === value, disabled: busy }} aria-selected={method === value} disabled={busy} onPress={() => setMethod(value)} style={({ pressed }) => [styles.tab, method === value && styles.tabActive, pressed && styles.pressed]}><Text style={[styles.tabText, method === value && styles.tabTextActive]}>{label}</Text></Pressable>)}</View>
    {method === "dashboard" ? input("Consumption (L/100 km)", consumption, setConsumption) : <>
      <Text style={styles.note}>Fill the tank, drive, then note the kilometres and litres needed to fill it again. A partial refill cannot establish consumption.</Text>
      {input("Kilometres between fills", distance, setDistance)}{input("Litres used to fill again", litres, setLitres)}
      <Chip label="The tank was filled to full both times." selected={fullTank} disabled={busy} onPress={() => setFullTank(!fullTank)} />
    </>}
    {select("grade", "Fuel grade", grade, grades, setGrade)}
    {select<FuelRegion>("region", "Reference-price region", region, [["inland", "Inland"], ["coastal", "Coastal"]], setRegion)}
    {input("Price override (R/litre)", price, setPrice)}
    <Text style={styles.note}>Diesel reference prices are wholesale, not a promise of pump prices. Use the price you pay as an override. Driving, traffic, load and roads affect fuel use.</Text>
    {message ? <Text accessibilityRole="alert" style={styles.note}>{message}</Text> : null}
    <ActionButton label={busy ? "Saving..." : "Save fuel setup"} tone="green" loading={busy} onPress={() => void save()} />
    {allowClear ? <ActionButton label="Clear fuel setup" tone="light" disabled={busy} onPress={() => void save(true)} /> : null}
  </View>;
}
const createStyles = (colours: ThemeColours) => StyleSheet.create({
  form: { gap: 14 }, field: { gap: 6 }, label: { fontFamily: fonts.semibold, fontSize: 14, color: colours.text },
  note: { flexShrink: 1, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colours.muted },
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderColor: colours.controlBorder },
  tab: { flex: 1, minHeight: 52, paddingVertical: 12, paddingHorizontal: 4, justifyContent: "center", borderBottomWidth: 3, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: colours.primary },
  tabText: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 20, textAlign: "center", color: colours.muted },
  tabTextActive: { color: colours.text, fontFamily: fonts.semibold },
  select: { minHeight: 52, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: colours.controlBorder, borderRadius: 8, backgroundColor: colours.control },
  selectText: { flex: 1, fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: colours.text },
  menu: { borderWidth: 1, borderColor: colours.controlBorder, borderRadius: 8, overflow: "hidden", backgroundColor: colours.surface },
  menuOption: { minHeight: 48, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 12 },
  menuSelected: { backgroundColor: colours.primarySoft },
  pressed: { opacity: 0.92 },
  input: { minHeight: 48, padding: 12, borderWidth: 1, borderColor: colours.border, borderRadius: 8, backgroundColor: colours.control, color: colours.text, fontFamily: fonts.regular, fontSize: 16 },
});
