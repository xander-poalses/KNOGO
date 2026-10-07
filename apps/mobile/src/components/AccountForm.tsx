import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import * as Linking from "expo-linking";
import { Eye, EyeOff } from "lucide-react-native";
import { HapticPressable as Pressable } from "./HapticPressable";
import { ActionButton } from "./Ui";
import { FeedbackToast } from "./FeedbackToast";
import { accountError } from "../auth/accountError";
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
  const [passwordVisible, setPasswordVisible] = useState(false);
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
      .catch(() => { if (active) setError("Google could not connect. Use email and password."); });
    return () => { active = false; };
  }, [reportPlaceId, venuePlaceId, googleAttempt]);
  const running = useRef(false);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const google = async () => {
    if (!googleSignInSupported) {
      setError("Google sign-in cannot run in Expo Go. Use email and password here.");
      return;
    }
    if (running.current || !googleRequest) return;
    running.current = true; setBusy(true); setGoogleBusy(true); setError(null);
    try {
      const session = await openGoogleSignIn(googleRequest);
      if (session) { await adoptSession(session); setPassword(""); if (mounted.current) onAuthenticated(); }
      else setGoogleAttempt(attempt => attempt + 1);
    } catch { setError("Google sign-in did not finish. Try again."); setGoogleAttempt(attempt => attempt + 1); }
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
      setPassword(""); setPasswordVisible(false);
      if (session) { if (mounted.current) onAuthenticated(); }
      else { setSent(true); setMode("signin"); }
    } catch (cause) {
      // Do not put provider responses, credentials or account existence in UI/telemetry.
      setError(accountError(cause, mode));
    } finally { running.current = false; setBusy(false); }
  };

  if (sent) return <View style={styles.form}>
    <Text accessibilityRole="header" style={styles.title}>Check your email</Text>
    <Text accessibilityRole="alert" style={styles.body}>If your account needs confirmation, check your inbox and spam folder for a link, then sign in. If you have an account, sign in with its password. This request does not change your password.</Text>
    {reportPlaceId ? <Text style={styles.body}>Your check is saved on this device. Signing in returns you to review it.</Text> : null}
    <ActionButton label="Sign in" tone="green" onPress={() => { setSent(false); setMode("signin"); }}/>
    <ActionButton label="Use another email" tone="light" onPress={() => { setSent(false); setMode("signup"); setEmail(""); setError(null); }}/>
  </View>;

  return <View style={styles.form}>
    <Text accessibilityRole="header" style={styles.title}>{mode === "signin" ? "Sign in" : "Create an account"}</Text>
    {!hasSupabaseConfig ? <Text accessibilityRole="alert" style={styles.error}>Account access needs a connection to Supabase.</Text> : null}
    <View style={styles.field}><Text style={styles.label}>Email</Text><TextInput accessibilityLabel="Email address" value={email} onChangeText={setEmail} editable={!busy} autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address" placeholder="you@example.com" placeholderTextColor={colours.muted} style={styles.input}/></View>
    <View style={styles.field}><Text style={styles.label}>Password</Text><View style={styles.passwordField}><TextInput accessibilityLabel="Password" value={password} onChangeText={setPassword} editable={!busy} secureTextEntry={!passwordVisible} autoCapitalize="none" autoCorrect={false} autoComplete={mode === "signup" ? "new-password" : "current-password"} textContentType={mode === "signup" ? "newPassword" : "password"} onSubmitEditing={() => void submit()} returnKeyType="go" style={[styles.input, styles.passwordInput]}/><Pressable accessibilityRole="button" accessibilityLabel={passwordVisible ? "Hide password" : "Show password"} accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => setPasswordVisible(value => !value)} style={styles.visibilityButton}>{passwordVisible ? <EyeOff color={colours.muted} size={20}/> : <Eye color={colours.muted} size={20}/>}</Pressable></View>{mode === "signup" ? <Text style={styles.body}>Use at least 8 characters.</Text> : null}</View>
    <FeedbackToast message={error} onDismiss={() => setError(null)}/>
    <ActionButton label={mode === "signin" ? "Sign in" : "Create account"} tone="green" loading={busy && !googleBusy} disabled={busy || !hasSupabaseConfig || !validEmail || !password} onPress={() => void submit()}/>
    {googleSignInEnabled ? <ActionButton label="Continue with Google" tone="light" loading={googleBusy} disabled={busy || (googleSignInSupported && !googleRequest)} onPress={() => void google()}/> : null}
    <ActionButton label={mode === "signin" ? "Create an account" : "Use my account"} tone="light" disabled={busy} onPress={() => { setMode(mode === "signin" ? "signup" : "signin"); setPassword(""); setPasswordVisible(false); setError(null); setSent(false); }}/>
  </View>;
}

const createStyles = (colours: ThemeColours) => StyleSheet.create({
  form: { gap: space.md }, field: { gap: space.xs },
  passwordField: { flexDirection: "row", alignItems: "center", borderRadius: radii.control, borderWidth: 1, borderColor: colours.controlBorder, backgroundColor: colours.surface },
  passwordInput: { flex: 1, minWidth: 0, borderWidth: 0 },
  visibilityButton: { width: sizes.touch, height: sizes.control, alignItems: "center", justifyContent: "center" },
  title: { color: colours.text, fontFamily: fonts.extraBold, fontSize: 24, lineHeight: 32, paddingBottom: space.xs },
  label: { color: colours.text, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 },
  body: { color: colours.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 22 },
  input: { minHeight: sizes.control, padding: space.sm, borderRadius: radii.control, borderWidth: 1, borderColor: colours.controlBorder, color: colours.text, backgroundColor: colours.surface, fontFamily: fonts.regular, fontSize: 16 },
  error: { color: colours.closed, fontFamily: fonts.medium, fontSize: 14, lineHeight: 22 }
});
