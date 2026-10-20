import { useState } from "react";
import { FeedbackToast } from "../components/FeedbackToast";
import { useLocalSearchParams } from "expo-router";
import { Linking, StyleSheet, Text, View } from "react-native";
import { HapticPressable as Pressable } from "../components/HapticPressable";
import { Mail } from "lucide-react-native";
import { BackButton, Page } from "../components/Ui";
import { radii, fonts, useTheme, useThemeStyles, type ThemeColours } from "../theme";

export function SupportScreen() {
  const { placeId, placeName, reason } = useLocalSearchParams<{ placeId?: string; placeName?: string; reason?: string }>();
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const email = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim();
  const [error, setError] = useState<string | null>(null);
  const representation = reason === "representation";
  const subject = representation ? `KNOGO representation request: ${placeName || placeId || "Place"}` : placeId ? `KNOGO data correction: ${placeId}` : "KNOGO support";
  const body = representation ? `I would like to represent ${placeName || "this place"}.\nPlace ID: ${placeId || "Not provided"}\n\nMy role at the place:\nMy KNOGO account email:\nHow you can verify my role:\n` : "";
  return <Page><BackButton /><View style={styles.header}><Text style={styles.title}>{representation ? "Represent this place" : placeId ? "Place data issue" : "Support"}</Text>{representation ? <Text style={styles.body}>Contact KNOGO with your role at the place and the email on your account. Access is granted after review, not by sending this request.</Text> : null}<Text style={styles.body}>{email ? representation ? placeName : "For place corrections, account help or deletion requests. Include the place name where needed." : "Support contact is not available in this build. No request can be sent from this screen."}</Text></View>{email ? <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ""}`).catch(() => setError("Could not open your email app. Use the address shown here."))} style={styles.action}><Mail color={colours.background} size={20} /><Text style={styles.actionText}>{representation ? "Contact KNOGO" : "Email KNOGO support"}</Text></Pressable> : null}{email ? <Text selectable style={styles.body}>{email}</Text> : null}<FeedbackToast message={error} onDismiss={() => setError(null)}/></Page>;
}

const createStyles = (colours: ThemeColours) => StyleSheet.create({
  header: { gap: 10 }, eyebrow: { color: colours.primary, fontFamily: fonts.extraBold, fontSize: 13 }, title: { paddingBottom: 6, color: colours.text, fontFamily: fonts.extraBold, fontSize: 34, lineHeight: 41 }, body: { color: colours.muted, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 }, action: { minHeight: 52, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderRadius: radii.control, backgroundColor: colours.primary }, actionText: { color: colours.background, fontFamily: fonts.extraBold, fontSize: 14 }
});
