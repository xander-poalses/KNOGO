// Imports
import type { ConfirmationType, VenueAccess } from "@knogo/core";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ActionButton, Chip, BackButton, Notice, Page } from "../components/Ui";
import { FeedbackToast } from "../components/FeedbackToast";
import { AccountForm } from "../components/AccountForm";
import { usePlaces } from "../state/PlacesContext";
import { supabaseApi } from "../supabase";
import { fonts, useThemeStyles, type ThemeColours } from "../theme";

// State and Helpers
const checks: Array<{ type: ConfirmationType; label: string; answers: Array<[string, string]> }> = [
  { type: "open_status", label: "Trading", answers: [["open", "Open"], ["closed", "Closed"]] },
  { type: "kitchen_status", label: "Kitchen", answers: [["yes", "Serving"], ["no", "Not serving"]] },
  { type: "walk_ins", label: "Walk-ins", answers: [["yes", "Welcome"], ["no", "Unavailable"]] },
  { type: "card_machine", label: "Card machine", answers: [["yes", "Working"], ["no", "Not working"], ["cash_only", "Cash only"]] },
  { type: "backup_power", label: "Power", answers: [["normal", "Normal"], ["limited", "Limited"], ["closed", "Closed"]] },
  { type: "busy_level", label: "Busy level", answers: [["quiet", "Quiet"], ["normal", "Normal"], ["busy", "Busy"], ["packed", "Packed"]] }
];

// Components
export function VenueScreen() {
  const { placeId } = useLocalSearchParams<{ placeId: string }>();
  const router = useRouter();
  const { places, loading: placesLoading, session, authLoading, refresh } = usePlaces();
  const styles = useThemeStyles(createStyles);
  const place = places.find((item) => item.id === placeId);
  const [access, setAccess] = useState<VenueAccess | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const mounted = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [checkType, setCheckType] = useState<ConfirmationType>("open_status");
  const [value, setValue] = useState<string | null>(null);
  const [dispute, setDispute] = useState(false);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    setAccess(null); setError(null); setMessage(null);
    setLoading(false);
    if (!session || session.isAnonymous || !place) return;
    let active = true;
    setLoading(true);
    void supabaseApi.readVenueAccess(place.id).then((result) => { if (active) setAccess(result); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not check venue access."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [place?.id, session?.userId]);

  const run = async (action: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(null); setMessage(null);
    try { await action(); }
    catch (cause) { if (mounted.current) setError(cause instanceof Error ? cause.message : "This request could not be completed."); }
    finally { locked.current = false; if (mounted.current) setBusy(false); }
  };

  if (!place) return <Page><BackButton /><Notice title={placesLoading ? "Loading place" : "Place not found"} loading={placesLoading} /></Page>;
  const activeCheck = checks.find((item) => item.type === checkType)!;
  const contact = () => router.push({ pathname: "/support", params: { reason: "representation", placeId: place.id, placeName: place.name } });

  return <Page><BackButton label="Back to place" onBack={() => router.replace({ pathname: "/restaurants/[placeId]", params: { placeId: place.id } })} />
    <Text accessibilityRole="header" style={styles.title}>Represent this venue</Text>
    <Text style={styles.name}>{place.name}</Text>
    <Text style={styles.body}>Representative access is granted by KNOGO after review.</Text>
    <FeedbackToast message={error} onDismiss={() => setError(null)}/>
    <FeedbackToast message={message} onDismiss={() => setMessage(null)}/>
    {authLoading || loading ? <Notice title="Checking venue access" loading /> : !session || session.isAnonymous ? <View style={styles.section}>
      <Text style={styles.body}>Sign in if you have representative access, or contact KNOGO to request it.</Text>
      <ActionButton label="Contact KNOGO" tone="light" onPress={contact}/>
      <AccountForm venuePlaceId={place.id} onAuthenticated={() => { setError(null); setMessage(null); }} />
    </View> : !access ? <ActionButton label={busy ? "Checking..." : "Retry access check"} loading={busy} tone="light" onPress={() => void run(async () => { const result = await supabaseApi.readVenueAccess(place.id); if (mounted.current) setAccess(result); })} /> : access.verified ? <View style={styles.section}>
      <Text style={styles.heading}>Venue representative</Text>
      <Text style={styles.body}>Access recorded {new Date(access.verifiedAt!).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}. Access expires {new Date(access.expiresAt!).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })} (South African time).</Text>
      <Text style={styles.body}>Your statements expire after four hours. Community evidence stays visible. Opposing reports show “Reports disagree”. Publishing again requires a five-minute wait.</Text>
      <View style={styles.options}>{checks.map((item) => <Chip role="radio" key={item.type} label={item.label} selected={checkType === item.type} disabled={busy} onPress={() => { setCheckType(item.type); setValue(null); setMessage(null); }} />)}</View>
      <Text style={styles.heading}>{activeCheck.label}</Text>
      <View style={styles.options}>{activeCheck.answers.map(([answer, label]) => <Chip role="radio" key={answer} label={label} selected={value === answer} disabled={busy} onPress={() => { setValue(answer); setMessage(null); }} />)}</View>
      <Chip label="Dispute a community claim" selected={dispute} disabled={busy} onPress={() => setDispute((current) => !current)} />
      <ActionButton label={busy ? "Publishing..." : dispute ? "Publish dispute" : "Publish update"} loading={busy} disabled={!value} tone="green" onPress={() => void run(async () => {
        if (!value) return;
        await supabaseApi.publishVenueUpdate(place.id, { type: checkType, value }, dispute);
        if (mounted.current) { setMessage("Statement received. Community reports have not been deleted or replaced."); setValue(null); }
        try { await refresh(); } catch { if (mounted.current) setMessage("Statement received. Refresh the place to load its status."); }
      })} />
    </View> : <View style={styles.section}>
      <Text style={styles.heading}>Request representative access</Text>
      <Text style={styles.body}>Contact KNOGO with your role at {place.name}. Sending a request does not grant access.</Text>
      <ActionButton label="Contact KNOGO" tone="green" onPress={contact}/>
    </View>}
  </Page>;
}

// Styles
const createStyles = (colours: ThemeColours) => StyleSheet.create({
  title: { color: colours.text, fontFamily: fonts.extraBold, fontSize: 28, lineHeight: 35, paddingBottom: 5 },
  name: { color: colours.primary, fontFamily: fonts.semibold, fontSize: 17, lineHeight: 24 },
  body: { color: colours.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, flexShrink: 1 },
  section: { gap: 14, paddingVertical: 18, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colours.border },
  heading: { color: colours.text, fontFamily: fonts.semibold, fontSize: 18, lineHeight: 25 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  error: { color: colours.closed, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 21 },
  message: { color: colours.primary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 }
});
