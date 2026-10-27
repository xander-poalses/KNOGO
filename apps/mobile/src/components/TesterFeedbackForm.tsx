// Imports
import { useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { ActionButton, Chip } from "./Ui";
import { FeedbackToast } from "./FeedbackToast";
import { usePlaces } from "../state/PlacesContext";
import { supabaseApi } from "../supabase";
import { testerFeedbackEnabled } from "../testing";
import { fonts, radii, space, useTheme, useThemeStyles, type ThemeColours } from "../theme";

// Components
export function TesterFeedbackForm({ onSent }: { onSent: () => void }) {
  const { session, signInAsTester } = usePlaces();
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const [kind, setKind] = useState<"suggestion" | "bug">("suggestion");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);
  const appVersion = `${Application.nativeApplicationVersion || Constants.expoConfig?.version || "unknown"} (${Application.nativeBuildVersion || "dev"})`;
  const send = async () => {
    if (!testerFeedbackEnabled || running.current || message.trim().length < 10) return;
    running.current = true; setBusy(true); setError(null);
    try {
      if (!session) await signInAsTester();
      await supabaseApi.submitTesterFeedback({ kind, message, appVersion });
      setMessage(""); onSent();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "";
      setError(["This account is not approved for tester feedback.", "You have sent five messages this hour. Try again later."].includes(message) ? message : "Could not send your feedback. It may have reached KNOGO; wait before trying again.");
    } finally { running.current = false; setBusy(false); }
  };
  if (!testerFeedbackEnabled) return null;
  return <View style={styles.form}>
    <View accessibilityRole="radiogroup" accessibilityLabel="Feedback type" style={styles.types}>
      <Chip role="radio" label="Suggestion" selected={kind === "suggestion"} disabled={busy} onPress={() => setKind("suggestion")}/>
      <Chip role="radio" label="Bug report" selected={kind === "bug"} disabled={busy} onPress={() => setKind("bug")}/>
    </View>
    <Text style={styles.label}>{kind === "bug" ? "What went wrong?" : "What could we improve?"}</Text>
    <TextInput accessibilityLabel="Feedback message" multiline maxLength={2000} value={message} onChangeText={setMessage} editable={!busy} textAlignVertical="top" style={styles.input} placeholder="Your feedback" placeholderTextColor={colours.muted}/>
    <Text style={styles.help}>{message.length}/2000</Text>
    <Text style={styles.help}>Your account or guest ID and app version are attached. Do not include passwords or contact details.</Text>
    <FeedbackToast message={error} onDismiss={() => setError(null)}/>
    <ActionButton label="Send feedback" tone="green" loading={busy} disabled={message.trim().length < 10} onPress={() => void send()}/>
  </View>;
}

// Styles
const createStyles = (colours: ThemeColours) => StyleSheet.create({
  form: { gap: space.md }, types: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  label: { color: colours.text, fontFamily: fonts.semibold, fontSize: 16, lineHeight: 24 },
  input: { minHeight: 160, padding: space.md, borderWidth: 1, borderColor: colours.border, borderRadius: radii.content, color: colours.text, backgroundColor: colours.control, fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  help: { color: colours.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 }
});
