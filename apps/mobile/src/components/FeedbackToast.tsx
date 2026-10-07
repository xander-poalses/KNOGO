import { StyleSheet, Text, View } from "react-native";
import { CircleAlert, X } from "lucide-react-native";
import { HapticPressable as Pressable } from "./HapticPressable";
import { fonts, useTheme, useThemeStyles, type ThemeColours } from "../theme";

// Hallmark: P5 H4 E4 S4 R5 V4. Form feedback stays beside its recovery action.
export function FeedbackToast({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  return <View accessibilityLiveRegion="polite">
    {message ? <View style={styles.toast}>
      <CircleAlert color={colours.closed} size={20} accessibilityElementsHidden />
      <Text accessibilityRole="alert" style={styles.message}>{message}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notification" onPress={onDismiss} style={styles.dismiss}><X color={colours.text} size={18}/></Pressable>
    </View> : null}
  </View>;
}

const createStyles = (colours: ThemeColours) => StyleSheet.create({
  toast: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colours.surface, borderRadius: 8, borderWidth: 1, borderColor: colours.controlBorder, paddingLeft: 12 },
  message: { flex: 1, minWidth: 0, color: colours.text, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, paddingVertical: 10 },
  dismiss: { width: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }
});
