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
  const subject = placeId ? `KNOGO data correction: ${placeId}` : "KNOGO support";
  return <Page><BackButton /><View style={styles.header}><Text style={styles.eyebrow}>Support</Text><Text style={styles.title}>{placeId ? "Report a place data issue." : "How can we help?"}</Text><Text style={styles.body}>Tell us about wrong hours, contact details, categories, closures or account problems. Include the place name and what needs to change.</Text></View>{email ? <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}`)} style={styles.action}><Mail color={colours.background} size={20} /><Text style={styles.actionText}>Email KNOGO support</Text></Pressable> : null}</Page>;
}

const createStyles = (colours: ThemeColours) => StyleSheet.create({
  header: { gap: 10 }, eyebrow: { color: colours.primary, fontFamily: fonts.extraBold, fontSize: 13 }, title: { paddingBottom: 6, color: colours.text, fontFamily: fonts.extraBold, fontSize: 34, lineHeight: 41 }, body: { color: colours.muted, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 }, action: { minHeight: 52, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderRadius: 8, backgroundColor: colours.primary }, actionText: { color: colours.background, fontFamily: fonts.extraBold, fontSize: 14 }
});
