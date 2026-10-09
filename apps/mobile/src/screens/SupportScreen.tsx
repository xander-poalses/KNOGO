import { useState } from "react";
import { FeedbackToast } from "../components/FeedbackToast";
import { useLocalSearchParams } from "expo-router";
import { Linking, StyleSheet, Text, View } from "react-native";
import { HapticPressable as Pressable } from "../components/HapticPressable";
import { Mail } from "lucide-react-native";
import { BackButton, Page } from "../components/Ui";
import { fonts, useTheme, useThemeStyles, type ThemeColours } from "../theme";

export function SupportScreen() {
  const { placeId } = useLocalSearchParams<{ placeId?: string }>();
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const email = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim();
  const [error, setError] = useState<string | null>(null);
  const subject = placeId ? `KNOGO data correction: ${placeId}` : "KNOGO support";
  return <Page><BackButton /><View style={styles.header}><Text style={styles.eyebrow}>Support</Text><Text style={styles.title}>{placeId ? "Report a place data issue." : "How can we help?"}</Text><Text style={styles.body}>{email ? "Tell us about hours, contact details, closures, account problems or an account deletion request. Include the place name if relevant." : "Support contact is not available in this build. No request can be sent from this screen."}</Text></View>{email ? <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}`).catch(() => setError("Could not open your email app. Use the address shown here."))} style={styles.action}><Mail color={colours.background} size={20} /><Text style={styles.actionText}>Email KNOGO support</Text></Pressable> : null}{email ? <Text selectable style={styles.body}>{email}</Text> : null}<FeedbackToast message={error} onDismiss={() => setError(null)}/></Page>;
}

const createStyles = (colours: ThemeColours) => StyleSheet.create({
  header: { gap: 10 }, eyebrow: { color: colours.primary, fontFamily: fonts.extraBold, fontSize: 13 }, title: { paddingBottom: 6, color: colours.text, fontFamily: fonts.extraBold, fontSize: 34, lineHeight: 41 }, body: { color: colours.muted, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 }, action: { minHeight: 52, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderRadius: 8, backgroundColor: colours.primary }, actionText: { color: colours.background, fontFamily: fonts.extraBold, fontSize: 14 }
});
