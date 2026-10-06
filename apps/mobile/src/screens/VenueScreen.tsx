// Hallmark pre-emit critique: Philosophy 4, Hierarchy 4, Execution 4, Specificity 4, Restraint 5, Variety 3.
import type { ConfirmationType, VenueAccess } from "@knogo/core";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { ActionButton, Chip, BackButton, Notice, Page } from "../components/Ui";
import { AccountForm } from "../components/AccountForm";
import { usePlaces } from "../state/PlacesContext";
import { supabaseApi } from "../supabase";
import { fonts, useTheme, useThemeStyles, type ThemeColours } from "../theme";

const checks: Array<{ type: ConfirmationType; label: string; answers: Array<[string, string]> }> = [
  { type: "open_status", label: "Trading", answers: [["open", "Open"], ["closed", "Closed"]] },
  { type: "kitchen_status", label: "Kitchen", answers: [["yes", "Serving"], ["no", "Not serving"]] },
  { type: "walk_ins", label: "Walk-ins", answers: [["yes", "Welcome"], ["no", "Unavailable"]] },
  { type: "card_machine", label: "Card machine", answers: [["yes", "Working"], ["no", "Not working"], ["cash_only", "Cash only"]] },
  { type: "backup_power", label: "Power", answers: [["normal", "Normal"], ["limited", "Limited"], ["closed", "Closed"]] },
  { type: "busy_level", label: "Busy level", answers: [["quiet", "Quiet"], ["normal", "Normal"], ["busy", "Busy"], ["packed", "Packed"]] }
];

export function VenueScreen() {
  const { placeId } = useLocalSearchParams<{ placeId: string }>();
  const router = useRouter();
  const { places, loading: placesLoading, session, authLoading, refresh } = usePlaces();
  const styles = useThemeStyles(createStyles);
  const { colours } = useTheme();
  const place = places.find((item) => item.id === placeId);
  const [access, setAccess] = useState<VenueAccess | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const mounted = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [channel, setChannel] = useState<"sms" | "voice">("sms");
  const [challenge, setChallenge] = useState<{ challengeId: string; phoneHint: string } | null>(null);
  const [code, setCode] = useState("");
  const [checkType, setCheckType] = useState<ConfirmationType>("open_status");
  const [value, setValue] = useState<string | null>(null);
  const [dispute, setDispute] = useState(false);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    setAccess(null); setChallenge(null); setCode(""); setError(null); setMessage(null);
    setLoading(false);
    if (!session || !place) return;
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
  const claimConfigured = Boolean(process.env.EXPO_PUBLIC_VENUE_CLAIM_API_URL);

  return <Page><BackButton label="Back to place" onBack={() => router.replace({ pathname: "/restaurants/[placeId]", params: { placeId: place.id } })} />
    <Text accessibilityRole="header" style={styles.title}>Represent this venue</Text>
    <Text style={styles.name}>{place.name}</Text>
    <Text style={styles.body}>Phone verification checks access to a venue number held by KNOGO. It does not prove legal ownership. You cannot choose a receiving number.</Text>
    {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.error}>{error}</Text> : null}
    {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
    {authLoading || loading ? <Notice title="Checking venue access" loading /> : !session ? <View style={styles.section}>
      {!claimConfigured ? <Text style={styles.body}>Phone-code delivery is unavailable in this build. Sign-in checks any existing representative access; it will not send a venue code.</Text> : null}
      <Text style={styles.body}>Community reports do not require a venue to register. This sign-in is for representative access.</Text>
      <AccountForm venuePlaceId={place.id} onAuthenticated={() => { setError(null); setMessage(null); }} />
    </View> : !access ? <ActionButton label={busy ? "Checking..." : "Retry access check"} loading={busy} tone="light" onPress={() => void run(async () => { const result = await supabaseApi.readVenueAccess(place.id); if (mounted.current) setAccess(result); })} /> : access.verified ? <View style={styles.section}>
      <Text style={styles.heading}>Venue representative</Text>
      <Text style={styles.body}>Phone access checked {new Date(access.verifiedAt!).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}. Access expires {new Date(access.expiresAt!).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })} (South African time).</Text>
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
      <Text style={styles.heading}>Verify venue phone access</Text>
      {!claimConfigured ? <Text style={styles.body}>Venue phone verification is not configured in this build. Community reporting remains available. No code will be sent.</Text> : challenge ? <>
        <Text style={styles.body}>Code requested for the KNOGO-held number: {challenge.phoneHint}. Codes expire ten minutes after the request is reserved, with at most five code checks.</Text>
        <TextInput accessibilityLabel="Venue verification code" value={code} onChangeText={setCode} editable={!busy} keyboardType="number-pad" autoComplete="sms-otp" maxLength={6} placeholder="Six-digit code" placeholderTextColor={colours.muted} style={styles.input} />
        <ActionButton label={busy ? "Checking..." : "Verify phone access"} loading={busy} disabled={!/^\d{6}$/.test(code)} tone="green" onPress={() => void run(async () => {
          await supabaseApi.verifyVenueClaim(challenge.challengeId, code);
          const result = await supabaseApi.readVenueAccess(place.id);
          if (mounted.current) { setAccess(result); setCode(""); setChallenge(null); setMessage("Phone access verified. This does not prove legal ownership."); }
        })} />
        <ActionButton label="Start another request" tone="light" disabled={busy} onPress={() => { setChallenge(null); setCode(""); setMessage(null); }} />
      </> : <>
        <Text style={styles.body}>KNOGO uses a number checked against a source independent of your account. Requests are limited to three per account per day, with limits on the receiving number too.</Text>
        <View style={styles.options}>{(["sms", "voice"] as const).map((item) => <Chip role="radio" key={item} label={item === "sms" ? "SMS" : "Voice call"} selected={channel === item} disabled={busy} onPress={() => setChannel(item)} />)}</View>
        <ActionButton label={busy ? "Requesting..." : "Request venue code"} loading={busy} tone="green" onPress={() => void run(async () => { const result = await supabaseApi.startVenueClaim(place.id, channel); if (mounted.current) setChallenge(result); })} />
      </>}
    </View>}
  </Page>;
}

const createStyles = (colours: ThemeColours) => StyleSheet.create({
  title: { color: colours.text, fontFamily: fonts.extraBold, fontSize: 28, lineHeight: 35, paddingBottom: 5 },
  name: { color: colours.primary, fontFamily: fonts.semibold, fontSize: 17, lineHeight: 24 },
  body: { color: colours.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, flexShrink: 1 },
  section: { gap: 14, paddingVertical: 18, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colours.border },
  heading: { color: colours.text, fontFamily: fonts.semibold, fontSize: 18, lineHeight: 25 },
  input: { minHeight: 52, borderWidth: 1, borderColor: colours.border, borderRadius: 8, paddingHorizontal: 14, color: colours.text, backgroundColor: colours.control, fontFamily: fonts.regular, fontSize: 16 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  error: { color: colours.closed, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 21 },
  message: { color: colours.primary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 }
});
