import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import * as Linking from "expo-linking";
import { ActionButton } from "./Ui";
import { usePlaces } from "../state/PlacesContext";
import { fonts, radii, sizes, space, useTheme, useThemeStyles, type ThemeColours } from "../theme";
import { googleSignInEnabled, googleSignInSupported, openGoogleSignIn, prepareGoogleSignIn } from "../auth/googleSignIn";

// Hallmark: P5 H4 E4 S5 R5 V4. One next-step command; existing form tokens.
export function AccountForm({ onAuthenticated, reportPlaceId, venuePlaceId }: { onAuthenticated: () => void; reportPlaceId?: string; venuePlaceId?: string }) {
  const { signInWithEmail, registerWithEmail, hasSupabaseConfig, adoptSession } = usePlaces();
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [googleRequest, setGoogleRequest] = useState<Awaited<ReturnType<typeof prepareGoogleSignIn>> | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleAttempt, setGoogleAttempt] = useState(0);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    if (!googleSignInEnabled || !googleSignInSupported) return;
    let active = true;
    setGoogleRequest(null);
    void prepareGoogleSignIn(reportPlaceId, venuePlaceId).then(request => { if (active) setGoogleRequest(request); })
      .catch(() => { if (active) setError("Google sign-in could not connect. You can sign in with your password."); });
    return () => { active = false; };
  }, [reportPlaceId, venuePlaceId, googleAttempt]);
  const running = useRef(false);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const google = async () => {
    if (!googleSignInSupported) {
      setError("Google sign-in cannot run in Expo Go. Open KNOGO in the browser or use a KNOGO development build. You can use email and password here.");
      return;
    }
    if (running.current || !googleRequest) return;
    running.current = true; setBusy(true); setGoogleBusy(true); setError(null);
    try {
      const session = await openGoogleSignIn(googleRequest);
      if (session) { await adoptSession(session); setPassword(""); if (mounted.current) onAuthenticated(); }
      else setGoogleAttempt(attempt => attempt + 1);
    } catch { setError("Google sign-in did not finish. Try again or use your password."); setGoogleAttempt(attempt => attempt + 1); }
    finally { running.current = false; setBusy(false); setGoogleBusy(false); }
  };

  const submit = async () => {
    if (running.current || !hasSupabaseConfig || !validEmail || !password) return;
    if (mode === "signup" && password.length < 8) { setError("Use at least 8 characters for your password."); return; }
    running.current = true; setBusy(true); setError(null);
    try {
      const session = mode === "signin"
        ? await signInWithEmail(email.trim(), password)
        : await registerWithEmail(email.trim(), password, Linking.createURL("auth/callback", { queryParams: venuePlaceId
          ? { venue: venuePlaceId }
          : reportPlaceId ? { intent: "review", placeId: reportPlaceId } : { intent: "account" } }));
      setPassword("");
      if (session) { if (mounted.current) onAuthenticated(); }
      else { setSent(true); setMode("signin"); }
    } catch {
      // Do not put provider responses, credentials or account existence in UI/telemetry.
      setError(mode === "signin"
        ? "Could not sign in. Check your email, password, email confirmation and connection, then try again."
        : "Could not create your account. Check your connection and try again. Email limits or account rules may apply.");
    } finally { running.current = false; setBusy(false); }
  };

  return <View style={styles.form}>
    <Text accessibilityRole="header" style={styles.title}>{mode === "signin" ? "Sign in" : "Create an account"}</Text>
    {sent ? <Text accessibilityRole="alert" style={styles.body}>Check your email for a confirmation link. Once you confirm your email, return here and sign in with your password.</Text> : null}
    {!hasSupabaseConfig ? <Text accessibilityRole="alert" style={styles.error}>Account access needs a connection to Supabase.</Text> : null}
    <View style={styles.field}><Text style={styles.label}>Email</Text><TextInput accessibilityLabel="Email address" value={email} onChangeText={setEmail} editable={!busy} autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address" placeholder="you@example.com" placeholderTextColor={colours.muted} style={styles.input}/></View>
    <View style={styles.field}><Text style={styles.label}>Password</Text><TextInput accessibilityLabel="Password" value={password} onChangeText={setPassword} editable={!busy} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete={mode === "signup" ? "new-password" : "current-password"} textContentType={mode === "signup" ? "newPassword" : "password"} onSubmitEditing={() => void submit()} returnKeyType="go" style={styles.input}/>{mode === "signup" ? <Text style={styles.body}>Use at least 8 characters. Supabase may require more.</Text> : null}</View>
    {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.error}>{error}</Text> : null}
    <ActionButton label={mode === "signin" ? "Sign in" : "Create account"} tone="green" loading={busy && !googleBusy} disabled={busy || !hasSupabaseConfig || !validEmail || !password} onPress={() => void submit()}/>
    {googleSignInEnabled ? <ActionButton label="Continue with Google" tone="light" loading={googleBusy} disabled={busy || (googleSignInSupported && !googleRequest)} onPress={() => void google()}/> : null}
    <ActionButton label={mode === "signin" ? "Create an account" : "Use my account"} tone="light" disabled={busy} onPress={() => { setMode(mode === "signin" ? "signup" : "signin"); setPassword(""); setError(null); setSent(false); }}/>
  </View>;
}

const createStyles = (colours: ThemeColours) => StyleSheet.create({
  form: { gap: space.md }, field: { gap: space.xs },
  title: { color: colours.text, fontFamily: fonts.extraBold, fontSize: 24, lineHeight: 32, paddingBottom: space.xs },
  label: { color: colours.text, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 },
  body: { color: colours.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 22 },
  input: { minHeight: sizes.control, padding: space.sm, borderRadius: radii.control, borderWidth: 1, borderColor: colours.controlBorder, color: colours.text, backgroundColor: colours.surface, fontFamily: fonts.regular, fontSize: 16 },
  error: { color: colours.closed, fontFamily: fonts.medium, fontSize: 14, lineHeight: 22 }
});
