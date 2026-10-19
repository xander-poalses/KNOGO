import { ChevronRight, FileText, Fuel, LogOut, Moon, Palette, ShieldCheck, Sun } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useRef, useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { HapticPressable as Pressable } from "../components/HapticPressable";
import { ActionButton, Page } from "../components/Ui";
import { AccountForm } from "../components/AccountForm";
import { PlaceSheet } from "../components/PlaceSheet";
import { fonts, radii, space, sizes, useTheme, useThemeStyles, type ThemeColours, type ThemePreference } from "../theme";
import { usePlaces } from "../state/PlacesContext";
import { useFuel } from "../state/FuelContext";
import { FuelPreferencesForm } from "../components/FuelPreferencesForm";

// Hallmark: P5 H5 E4 S5 R5 V4. Account anchor, grouped rows, detail sheets.
export function SettingsScreen() {
  const { colours, preference, setPreference } = useTheme();
  const { session, signOut } = usePlaces();
  const { preferences, save } = useFuel();
  const router = useRouter();
  const styles = useThemeStyles(createStyles);
  const [accountOpen, setAccountOpen] = useState(false);
  const [preferencesSheet, setPreferencesSheet] = useState<"appearance" | "fuel" | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [accountError, setAccountError] = useState("");
  const signOutRunning = useRef(false);
  const leaveAccount = async () => {
    if (signOutRunning.current) return;
    signOutRunning.current = true;
    setSigningOut(true);
    setAccountError("");
    try { await signOut(); }
    catch { setAccountError("KNOGO could not confirm sign-out with Supabase. Check your connection before signing in again."); }
    finally { signOutRunning.current = false; setSigningOut(false); }
  };
  const themes: Array<{ value: ThemePreference; label: string }> = [{ value: "system", label: "System" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }];
  const row = (label: string, value: string, icon: ReactNode, onPress: () => void) => <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${value}`} onPress={onPress} style={({ pressed }) => [styles.linkRow, pressed && styles.rowPressed]}>
    <View style={styles.rowIcon}>{icon}</View><View style={styles.profileCopy}><Text style={styles.linkText}>{label}</Text><Text style={styles.help}>{value}</Text></View><ChevronRight color={colours.muted} size={18}/>
  </Pressable>;
  return (
    <Page>
      <View style={styles.header}><Text accessibilityRole="header" style={styles.title}>Settings</Text></View>
      <View style={styles.account}>
        <View style={styles.accountHead}><View style={styles.accountIcon}><ShieldCheck color={colours.primary} size={26}/></View><View style={styles.profileCopy}><Text style={styles.accountTitle}>{session ? "Your account" : "Join the community"}</Text><Text style={styles.help}>{session ? session.email : "Sign in to share a check."}</Text></View></View>
        {!session ? <ActionButton label="Sign in" tone="green" disabled={signingOut} onPress={() => { setAccountError(""); setAccountOpen(true); }}/> : null}
        {session ? <ActionButton label="Sign out" tone="light" icon={<LogOut color={colours.text} size={18}/>} loading={signingOut} onPress={() => void leaveAccount()}/> : null}
        {accountError ? <Text accessibilityRole="alert" style={styles.help}>{accountError}</Text> : null}
      </View>
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Preferences</Text>
        {row("Appearance", themes.find(theme => theme.value === preference)?.label ?? "System", <Palette color={colours.primary} size={20}/>, () => setPreferencesSheet("appearance"))}
        {row("Fuel and trip estimates", preferences.consumptionLPer100Km ? `${preferences.consumptionLPer100Km} L/100 km` : "Set up your fuel use", <Fuel color={colours.primary} size={20}/>, () => setPreferencesSheet("fuel"))}
      </View>
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Help and policies</Text>
        <Pressable accessibilityRole="link" onPress={() => router.push("/support")} style={styles.linkRow}><ShieldCheck color={colours.text} size={18} /><Text style={styles.linkText}>Support and data corrections</Text><ChevronRight color={colours.muted} size={18} /></Pressable>
        <Pressable accessibilityRole="link" onPress={() => router.push("/legal/privacy")} style={styles.linkRow}><FileText color={colours.text} size={18} /><Text style={styles.linkText}>Privacy and community rules</Text><ChevronRight color={colours.muted} size={18} /></Pressable>
      </View>
      <PlaceSheet title="Your account" visible={accountOpen} onClose={() => setAccountOpen(false)}><AccountForm onAuthenticated={() => setAccountOpen(false)}/></PlaceSheet>
      <PlaceSheet title={preferencesSheet === "fuel" ? "Fuel and trip estimates" : "Appearance"} visible={preferencesSheet !== null} onClose={() => setPreferencesSheet(null)}>
        {preferencesSheet === "fuel" ? <FuelPreferencesForm preferences={preferences} onSave={save} allowClear/> : <View style={styles.appearance}>
          <View accessibilityRole="radiogroup" accessibilityLabel="Theme" style={styles.segment}>{themes.map(theme => { const selected = preference === theme.value; return <Pressable accessibilityRole="radio" accessibilityLabel={theme.label} accessibilityState={{ checked: selected }} aria-checked={selected} key={theme.value} onPress={() => setPreference(theme.value)} style={[styles.segmentItem, selected && styles.segmentSelected]}>{theme.value === "light" ? <Sun color={selected ? colours.background : colours.muted} size={15}/> : theme.value === "dark" ? <Moon color={selected ? colours.background : colours.muted} size={15}/> : null}<Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{theme.label}</Text></Pressable>; })}</View>
          <Text style={styles.help}>System follows your phone's theme.</Text>
        </View>}
      </PlaceSheet>
    </Page>
  );
}

const createStyles = (colours: ThemeColours) => StyleSheet.create({
  header: { paddingTop: space.sm }, title: { paddingBottom: space.xs, color: colours.text, fontFamily: fonts.extraBold, fontSize: 28, lineHeight: 38 },
  account: { gap: space.md, padding: space.md, borderRadius: radii.surface, backgroundColor: colours.surface },
  accountHead: { flexDirection: "row", alignItems: "center", gap: space.sm }, accountIcon: { width: 48, height: 48, borderRadius: radii.round, backgroundColor: colours.primarySoft, alignItems: "center", justifyContent: "center" },
  accountTitle: { color: colours.text, fontFamily: fonts.bold, fontSize: 18, lineHeight: 26 },
  section: { gap: space.xs, paddingTop: space.sm }, sectionTitle: { color: colours.muted, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 20, paddingBottom: space.xs }, profileCopy: { flex: 1, minWidth: 0, gap: 2 }, help: { color: colours.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 }, note: { color: colours.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, textAlign: "center", paddingVertical: space.md },
  appearance: { gap: space.md }, segment: { minHeight: sizes.control, padding: 4, flexDirection: "row", gap: 4, borderRadius: radii.control, backgroundColor: colours.control }, segmentItem: { flex: 1, minHeight: sizes.touch, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: radii.surface }, segmentSelected: { backgroundColor: colours.primary }, segmentText: { color: colours.muted, fontFamily: fonts.semibold, fontSize: 14 }, segmentTextSelected: { color: colours.background },
  rowIcon: { width: 36, alignItems: "center" }, rowPressed: { backgroundColor: colours.primarySoft }, linkRow: { minHeight: 64, paddingVertical: space.sm, flexDirection: "row", alignItems: "center", gap: space.sm, borderBottomWidth: 1, borderColor: colours.border }, linkText: { flex: 1, color: colours.text, fontFamily: fonts.medium, fontSize: 16, lineHeight: 24 }
});
