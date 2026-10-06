import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { fonts, useTheme, useThemeStyles, type ThemeColours } from "../theme";

function toneFor(id: string, tones: readonly string[]) {
  return tones[[...id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % tones.length];
}

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

function localLogoFor(name: string) {
  if (name.toLowerCase().startsWith("cappuccinos")) return require("../../assets/logos/cappuccinos.jpg");
  return null;
}

export function PlaceLogo({ id, name, uri: _uri, style, fallback = "tone", compact = false }: { id: string; name: string; uri?: string; style?: StyleProp<ViewStyle>; fallback?: "tone" | "surface" | "hidden"; compact?: boolean }) {
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const logoSource = localLogoFor(name);
  const [loading, setLoading] = useState(Boolean(logoSource));
  const [failed, setFailed] = useState(false);

  useEffect(() => { setLoading(Boolean(logoSource)); setFailed(false); }, [name]);

  const hasLogo = Boolean(logoSource) && !failed;
  const backgroundColor = hasLogo ? "#000000" : fallback === "surface" ? colours.surface : toneFor(id, colours.tileTones);
  if (!hasLogo && fallback === "hidden") return null;

  return <View style={[styles.root, { backgroundColor }, style]}>
    {!hasLogo ? <Text accessibilityElementsHidden style={[styles.initial, fallback === "surface" && styles.initialOnSurface, compact && styles.compactInitial]}>{initial(name)}</Text> : null}
    {hasLogo ? <Image accessibilityLabel={`${name} logo`} cachePolicy="memory-disk" contentFit="contain" onError={() => { setFailed(true); setLoading(false); }} onLoad={() => setLoading(false)} onLoadStart={() => setLoading(true)} recyclingKey={name} source={logoSource} transition={160} style={styles.logo} /> : null}
    {hasLogo && loading ? <View accessibilityLabel="Loading logo" accessibilityRole="progressbar" style={[styles.skeleton, { backgroundColor: "#000000" }]} /> : null}
  </View>;
}

const createStyles = (colours: ThemeColours) => StyleSheet.create({
  root: { overflow: "hidden" },
  logo: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  initial: { position: "absolute", top: -22, right: 5, color: colours.imageTextGhost, fontFamily: fonts.extraBold, fontSize: 104, lineHeight: 120 },
  initialOnSurface: { color: colours.border },
  compactInitial: { position: "relative", top: 0, right: 0, textAlign: "center", color: colours.muted, fontSize: 26, lineHeight: 64 },
  skeleton: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colours.elevated, opacity: 0.86 }
});
