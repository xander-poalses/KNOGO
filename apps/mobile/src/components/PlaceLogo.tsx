import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { MapPin } from "lucide-react-native";
import { fonts, useTheme, useThemeStyles, type ThemeColours } from "../theme";

export function PlaceLogo({ name, style }: { name: string; style?: StyleProp<ViewStyle> }) {
  const styles = useThemeStyles(createStyles);
  const { colours } = useTheme();
  const initial = name.trim().match(/^[\p{L}\p{N}]\p{M}*/u)?.[0].toUpperCase();
  return <View style={[styles.root, style]} aria-hidden>
    {initial ? <Text style={styles.initial}>{initial}</Text> : <MapPin color={colours.muted} size={26} />}
  </View>;
}

const createStyles = (colours: ThemeColours) => StyleSheet.create({
  root: { overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: colours.surface },
  initial: { textAlign: "center", color: colours.muted, fontFamily: fonts.extraBold, fontSize: 26, lineHeight: 36 }
});
