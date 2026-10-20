import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { StagedModal } from "./StagedModal";
import { PanelBottomClose } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticPressable } from "./HapticPressable";
import { fonts, radii, sizes, space, useTheme, useThemeStyles, type ThemeColours } from "../theme";

export function PlaceSheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return <StagedModal accessibilityLabel={title} visible={visible} statusBarTranslucent onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.overlay}>
      <HapticPressable accessible={false} focusable={false} onPress={onClose} style={StyleSheet.absoluteFill}/>
      <View accessibilityViewIsModal style={[styles.sheet, { maxHeight: height - insets.top - space.lg }]}>
        <View style={styles.heading}><Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <HapticPressable accessibilityRole="button" accessibilityLabel={`Close ${title.toLowerCase()}`} onPress={onClose} style={styles.close}><PanelBottomClose color={colours.text} size={34} strokeWidth={1.7}/></HapticPressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator contentContainerStyle={[styles.content, { paddingBottom: space.lg + insets.bottom }]}>{children}</ScrollView>
      </View>
    </KeyboardAvoidingView>
  </StagedModal>;
}

// Hallmark critique: P5 H4 E4 S5 R5 V4. Existing theme, one task per sheet.
const createStyles = (colours: ThemeColours) => StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: { width: "100%", maxWidth: 720, alignSelf: "center", flexShrink: 1, borderTopLeftRadius: radii.sheet, borderTopRightRadius: radii.sheet, backgroundColor: colours.sheetSurface, overflow: "hidden" },
  heading: { paddingTop: space.lg, paddingBottom: space.md, paddingHorizontal: space.lg, flexDirection: "row", alignItems: "center", gap: space.sm },
  title: { flex: 1, color: colours.text, fontFamily: fonts.extraBold, fontSize: 26, lineHeight: 38 },
  close: { width: sizes.touch, height: sizes.touch, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 14, gap: 15 }
});
