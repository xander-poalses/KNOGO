import { useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { usePlaces } from "../state/PlacesContext";
import { accountError } from "../auth/accountError";
import { fonts, sizes, space, useTheme, useThemeStyles, type ThemeColours } from "../theme";
import { ActionButton } from "./Ui";
import { FeedbackToast } from "./FeedbackToast";

export function PasswordResetForm({ onComplete, onRequestLink }: { onComplete: () => void; onRequestLink: () => void }) {
  const { updatePassword } = usePlaces();
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const running = useRef(false);
  const submit = async () => {
    if (running.current || password.length < 8 || password !== confirmation) return;
    running.current = true;
    setBusy(true); setError(null);
    try { await updatePassword(password); setPassword(""); setConfirmation(""); setSaved(true); }
    catch (cause) { setError(accountError(cause, "password")); }
    finally { running.current = false; setBusy(false); }
  };
  return <View style={styles.form}>
    <Text accessibilityRole="header" style={styles.title}>{saved ? "Password saved" : "Choose a password"}</Text>
    {saved ? <ActionButton label="Return to KNOGO" tone="green" onPress={onComplete}/> : <>
      <Text style={styles.body}>Use at least 8 characters.</Text>
      <TextInput accessibilityLabel="New password" placeholder="New password" placeholderTextColor={colours.muted} value={password} onChangeText={setPassword} editable={!busy} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" style={styles.input}/>
      <TextInput accessibilityLabel="Repeat password" placeholder="Repeat password" placeholderTextColor={colours.muted} value={confirmation} onChangeText={setConfirmation} editable={!busy} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" style={styles.input}/>
      {confirmation && confirmation !== password ? <Text style={styles.body}>Passwords do not match.</Text> : null}
      <FeedbackToast message={error} onDismiss={() => setError(null)}/>
      <ActionButton label="Save password" tone="green" loading={busy} disabled={password.length < 8 || password !== confirmation} onPress={() => void submit()}/>
      <ActionButton label="Request another link" tone="light" disabled={busy} onPress={onRequestLink}/>
    </>}
  </View>;
}
const createStyles = (colours: ThemeColours) => StyleSheet.create({
  form: { gap: space.md }, title: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 32, color: colours.text },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: colours.muted },
  input: { minHeight: sizes.control, padding: space.sm, borderWidth: 1, borderColor: colours.controlBorder, borderRadius: 8, backgroundColor: colours.surface, color: colours.text, fontFamily: fonts.regular, fontSize: 16 }
});
