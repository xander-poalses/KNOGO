import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { fonts, useTheme, useThemeStyles, type ThemeColours } from "../theme";
import { loadJpegLogo } from "../logoAsset";

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

function localLogoFor(name: string) {
  if (name.toLowerCase().startsWith("cappuccinos")) return require("../../assets/logos/cappuccinos.jpg");
  return null;
}

export function PlaceLogo({ id, name, uri, style, fallback = "surface", compact = false }: { id: string; name: string; uri?: string; style?: StyleProp<ViewStyle>; fallback?: "tone" | "surface" | "hidden"; compact?: boolean }) {
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const [remote, setRemote] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [decodeFailed, setDecodeFailed] = useState(false);
  const logoSource = remote ? { uri: remote } : !uri || failed ? localLogoFor(name) : null;
  const [loading, setLoading] = useState(Boolean(logoSource));

  useEffect(() => {
    let active = true;
    setRemote(null); setLoading(Boolean(uri || localLogoFor(name))); setFailed(false); setDecodeFailed(false);
    if (uri) void loadJpegLogo(uri).then(value => { if (active) setRemote(value); }).catch(() => { if (active) { setFailed(true); setLoading(false); } });
    return () => { active = false; };
  }, [name, uri]);

  const hasLogo = Boolean(logoSource) && !decodeFailed;
  const backgroundColor = colours.surface;
  if (!hasLogo && fallback === "hidden") return null;

  return <View style={[styles.root, { backgroundColor }, style]}>
    {!hasLogo ? <Text accessibilityElementsHidden style={styles.compactInitial}>{initial(name)}</Text> : null}
    {hasLogo ? <Image accessibilityLabel={`${name} logo`} cachePolicy="memory" contentFit="contain" onError={() => { setDecodeFailed(true); setLoading(false); }} onLoad={() => setLoading(false)} onLoadStart={() => setLoading(true)} recyclingKey={`${name}:${uri ?? "local"}`} source={logoSource} transition={0} style={styles.logo} /> : null}
    {loading ? <View accessibilityLabel="Loading logo" accessibilityRole="progressbar" style={styles.skeleton} /> : null}
  </View>;
}

const createStyles = (colours: ThemeColours) => StyleSheet.create({
  root: { overflow: "hidden", alignItems: "center", justifyContent: "center" },
  logo: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  initial: { position: "absolute", top: -22, right: 5, color: colours.imageTextGhost, fontFamily: fonts.extraBold, fontSize: 104, lineHeight: 120 },
  initialOnSurface: { color: colours.border },
  compactInitial: { position: "relative", top: 0, right: 0, textAlign: "center", color: colours.muted, fontSize: 26, lineHeight: 64 },
  skeleton: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colours.elevated, opacity: 0.86 }
});
