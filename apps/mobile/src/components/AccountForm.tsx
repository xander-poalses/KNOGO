// Imports
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import * as Linking from "expo-linking";
import { Eye, EyeOff, Mail, Pencil } from "lucide-react-native";
import { HapticPressable as Pressable } from "./HapticPressable";
import { ActionButton } from "./Ui";
import { FeedbackToast } from "./FeedbackToast";
import { accountError } from "../auth/accountError";
import { usePlaces } from "../state/PlacesContext";
import { fonts, radii, sizes, space, useTheme, useThemeStyles, type ThemeColours } from "../theme";
import { googleSignInEnabled, googleSignInSupported, openGoogleSignIn, prepareGoogleSignIn } from "../auth/googleSignIn";

// Components
export function AccountForm({ onAuthenticated, reportPlaceId, venuePlaceId, startRecovery = false }: { onAuthenticated: () => void; reportPlaceId?: string; venuePlaceId?: string; startRecovery?: boolean }) {
  const { signInWithEmail, registerWithEmail, requestPasswordRecovery, hasSupabaseConfig, adoptSession } = usePlaces();
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [recovering, setRecovering] = useState(startRecovery);
  const [recoverySent, setRecoverySent] = useState(false);
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
  const nextSignupStep = () => {
    if (busy || !validEmail || !hasSupabaseConfig) return;
    setSignupStep(2); setError(null);
  };
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
      setError(accountError(cause, mode));
    } finally { running.current = false; setBusy(false); }
  };

  const recover = async () => {
    if (running.current || !hasSupabaseConfig || !validEmail) return;
    running.current = true; setBusy(true); setError(null);
    try {
      await requestPasswordRecovery(email.trim(), Linking.createURL("auth/callback", { queryParams: { intent: "recovery", ...(reportPlaceId ? { placeId: reportPlaceId } : {}) } }));
      if (mounted.current) setRecoverySent(true);
    } catch (cause) { if (mounted.current) setError(accountError(cause, "recovery")); }
    finally { running.current = false; if (mounted.current) setBusy(false); }
  };

  if (recovering) return <View style={styles.form}>
    <Text accessibilityRole="header" style={styles.title}>{recoverySent ? "Check your inbox" : "Reset your password"}</Text>
    {recoverySent ? <FeedbackToast message="If an account can receive a recovery email, a link is on its way. Check your inbox and spam folder."/> : <>
      <Text style={styles.body}>We will send a link to change your password.</Text>
      <TextInput accessibilityLabel="Recovery email address" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address" editable={!busy} style={styles.input}/>
      <FeedbackToast message={error} onDismiss={() => setError(null)}/>
      <ActionButton label="Send recovery email" tone="green" loading={busy} disabled={!validEmail || !hasSupabaseConfig} onPress={() => void recover()}/>
    </>}
    <ActionButton label="Back to sign in" tone="light" disabled={busy} onPress={() => { setRecovering(false); setRecoverySent(false); setError(null); }}/>
  </View>;

  if (sent) return <View style={styles.form}>
    <Mail color={colours.primary} size={28}/>
    <Text accessibilityRole="header" style={styles.title}>Check your email</Text>
    <Text style={styles.emailValue}>{email.trim()}</Text>
    <FeedbackToast message="If confirmation is needed, check your inbox and spam. Already registered? Use your password; it has not changed."/>
    {reportPlaceId ? <Text style={styles.body}>Sign in to continue your report.</Text> : null}
    <ActionButton label="Sign in" tone="green" onPress={() => { setSent(false); setMode("signin"); }}/>
    <Pressable accessibilityRole="button" style={styles.modeLink} onPress={() => { setSent(false); setMode("signup"); setSignupStep(1); setEmail(""); setError(null); }}><Text style={styles.linkText}>Use another email</Text></Pressable>
  </View>;

  return <View style={styles.form}>
    <View style={styles.intro}>
      <Text accessibilityRole="header" style={styles.title}>{mode === "signin" ? "Sign in to KNOGO" : signupStep === 1 ? "Create your account" : "Choose a password"}</Text>
      {mode === "signup" ? <View style={styles.progressHead}>
        <View accessibilityRole="progressbar" accessibilityLabel="Account setup" accessibilityValue={{ min: 1, max: 2, now: signupStep, text: `${signupStep} of 2` }} aria-valuemin={1} aria-valuemax={2} aria-valuenow={signupStep} aria-valuetext={`${signupStep} of 2`} style={styles.progress}>
          <View style={[styles.progressPart, styles.progressComplete]}/><View style={[styles.progressPart, signupStep === 2 && styles.progressComplete]}/>
        </View>
        <Text style={styles.stepLabel}>{signupStep} of 2</Text>
      </View> : null}
    </View>
    <FeedbackToast message={!hasSupabaseConfig ? "Account access needs a connection to Supabase." : null}/>
    {googleSignInEnabled && (mode === "signin" || signupStep === 1) ? <>
      <ActionButton label="Continue with Google" tone="light" loading={googleBusy} disabled={busy || (googleSignInSupported && !googleRequest)} onPress={() => void google()}/>
      <View style={styles.divider}><View style={styles.dividerLine}/><Text style={styles.stepLabel}>or use email</Text><View style={styles.dividerLine}/></View>
    </> : null}
    {mode === "signin" || signupStep === 1 ? <View style={styles.field}><Text style={styles.label}>Email</Text><TextInput accessibilityLabel="Email address" value={email} onChangeText={setEmail} editable={!busy} autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address" onSubmitEditing={mode === "signup" ? nextSignupStep : undefined} returnKeyType="next" placeholder="you@example.com" placeholderTextColor={colours.muted} style={styles.input}/></View> : <View style={styles.emailRow}>
      <Text style={[styles.emailValue, styles.emailCopy]}>{email.trim()}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Change email" disabled={busy} style={styles.editEmail} onPress={() => { setSignupStep(1); setPassword(""); setPasswordVisible(false); setError(null); }}><Pencil color={colours.muted} size={18}/></Pressable>
    </View>}
    {mode === "signin" || signupStep === 2 ? <View style={styles.field}>
      <View style={styles.passwordHeading}><Text style={styles.label}>Password</Text>{mode === "signin" ? <Pressable accessibilityRole="button" onPress={() => { setRecovering(true); setPassword(""); setError(null); }} disabled={busy} style={styles.forgot}><Text style={styles.linkText}>Forgot password?</Text></Pressable> : null}</View>
      <View style={styles.passwordField}><TextInput key={mode} accessibilityLabel="Password" value={password} onChangeText={setPassword} editable={!busy} secureTextEntry={!passwordVisible} autoCapitalize="none" autoCorrect={false} autoComplete={mode === "signup" ? "new-password" : "current-password"} textContentType={mode === "signup" ? "newPassword" : "password"} onSubmitEditing={() => void submit()} returnKeyType="go" style={[styles.input, styles.passwordInput]}/><Pressable accessibilityRole="button" accessibilityLabel={passwordVisible ? "Hide password" : "Show password"} accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => setPasswordVisible(value => !value)} style={styles.visibilityButton}>{passwordVisible ? <EyeOff color={colours.muted} size={20}/> : <Eye color={colours.muted} size={20}/>}</Pressable></View>
      {mode === "signup" ? <Text style={styles.body}>At least 8 characters.</Text> : null}
    </View> : null}
    <FeedbackToast message={error} onDismiss={() => setError(null)}/>
    {mode === "signup" && signupStep === 1 ? <ActionButton label="Continue" tone="green" disabled={busy || !hasSupabaseConfig || !validEmail} onPress={nextSignupStep}/> : <ActionButton label={mode === "signin" ? "Sign in" : "Create account"} tone="green" loading={busy && !googleBusy} disabled={busy || !hasSupabaseConfig || !validEmail || !password} onPress={() => void submit()}/>}
    <View style={styles.modeRow}><Text style={styles.body}>{mode === "signin" ? "New to KNOGO?" : "Have an account?"}</Text>
      <Pressable accessibilityRole="button" disabled={busy} style={styles.modeLink} onPress={() => { setMode(mode === "signin" ? "signup" : "signin"); setSignupStep(1); setPassword(""); setPasswordVisible(false); setError(null); setSent(false); }}><Text style={styles.linkText}>{mode === "signin" ? "Create an account" : "Use my account"}</Text></Pressable>
    </View>
  </View>;
}

// Styles
const createStyles = (colours: ThemeColours) => StyleSheet.create({
  form: { gap: space.md }, field: { gap: space.xs },
  intro: { gap: space.sm, paddingBottom: space.xs },
  progressHead: { flexDirection: "row", alignItems: "center", gap: space.sm },
  progress: { flex: 1, height: 4, flexDirection: "row", gap: 6 },
  progressPart: { flex: 1, height: 4, borderRadius: radii.round, backgroundColor: colours.controlStrong },
  progressComplete: { backgroundColor: colours.primary },
  stepLabel: { color: colours.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 },
  divider: { flexDirection: "row", alignItems: "center", gap: space.sm },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colours.controlBorder },
  emailRow: { minHeight: sizes.touch, flexDirection: "row", alignItems: "center", gap: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colours.border },
  emailValue: { color: colours.text, fontFamily: fonts.medium, fontSize: 14, lineHeight: 22 },
  emailCopy: { flex: 1, minWidth: 0 },
  editEmail: { width: sizes.touch, height: sizes.touch, alignItems: "center", justifyContent: "center" },
  passwordHeading: { minHeight: sizes.touch, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  forgot: { minHeight: sizes.touch, justifyContent: "center" },
  modeRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", columnGap: space.xs },
  modeLink: { minHeight: sizes.touch, justifyContent: "center", alignItems: "center" },
  linkText: { color: colours.primary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 21 },
  passwordField: { flexDirection: "row", alignItems: "center", borderRadius: radii.control, borderWidth: 1, borderColor: colours.controlBorder, backgroundColor: colours.surface },
  passwordInput: { flex: 1, minWidth: 0, borderWidth: 0 },
  visibilityButton: { width: sizes.touch, height: sizes.control, alignItems: "center", justifyContent: "center" },
  title: { color: colours.text, fontFamily: fonts.extraBold, fontSize: 24, lineHeight: 32, paddingBottom: space.xs },
  label: { color: colours.text, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 },
  body: { color: colours.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 22 },
  input: { minHeight: sizes.control, padding: space.sm, borderRadius: radii.control, borderWidth: 1, borderColor: colours.controlBorder, color: colours.text, backgroundColor: colours.surface, fontFamily: fonts.regular, fontSize: 16 },
  error: { color: colours.closed, fontFamily: fonts.medium, fontSize: 14, lineHeight: 22 }
});
