import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { fonts, useThemeStyles, type ThemeColours } from "../theme";

export function PlaceLogo({ name, style }: { name: string; style?: StyleProp<ViewStyle> }) {
  const styles = useThemeStyles(createStyles);
  return <View style={[styles.root, style]} aria-hidden>
    <Text style={styles.initial}>{name.trim().charAt(0).toUpperCase()}</Text>
  </View>;
}

const createStyles = (colours: ThemeColours) => StyleSheet.create({
  root: { overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: colours.surface },
  initial: { textAlign: "center", color: colours.muted, fontFamily: fonts.extraBold, fontSize: 26, lineHeight: 36 }
});
