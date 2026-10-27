import { Info } from "lucide-react-native";
import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { HapticPressable as Pressable } from "./HapticPressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, useThemeStyles, type ThemeColours } from "../theme";
import { usePlaces } from "../state/PlacesContext";
import { FeedbackToast } from "./FeedbackToast";

export function BrandHeader() {
  const insets = useSafeAreaInsets();
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const [betaOpen, setBetaOpen] = useState(false);
  const { places, loading, error } = usePlaces();
  const betaMessage = !places.length && (loading || error) ? "KNOGO is currently in beta. Place count unavailable." : `KNOGO is currently in beta. ${places.length} ${places.length === 1 ? "Place in Pretoria East is" : "Places in Pretoria East are"} available.`;

  return (
    <View style={[styles.header, { height: 70 + insets.top, paddingTop: 8 + insets.top }]}>
      <View style={styles.identity}>
        <Image source={require("../../assets/knogo-mascot.png")} contentFit="contain" style={styles.mascot} />
        <Image source={require("../../assets/knogo-logo.png")} contentFit="contain" tintColor={colours.text} style={styles.logo} />
      </View>
      <View style={styles.headerActions}>
        <Pressable accessibilityLabel="About KNOGO beta" accessibilityRole="button" accessibilityState={{ expanded: betaOpen }} onPress={() => setBetaOpen((current) => !current)} style={({ pressed }) => [styles.headerInfo, pressed && styles.pressed]}>
          <Info color={colours.primary} size={18} />
        </Pressable>
        {betaOpen ? <FeedbackToast message={betaMessage} onDismiss={() => setBetaOpen(false)}/> : null}
      </View>
    </View>
  );
}

const createStyles = (colours: ThemeColours) => StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colours.headerBorder,
    backgroundColor: colours.background
  },
  identity: { height: 61, flexDirection: "row", alignItems: "center" },
  mascot: { width: 33, height: 57, alignSelf: "flex-end" },
  logo: { width: 92, height: 35, marginLeft: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerInfo: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.72 }
});
