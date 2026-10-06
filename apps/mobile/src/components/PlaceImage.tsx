import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { fonts, useTheme, useThemeStyles, type ThemeColours } from "../theme";

function toneFor(id: string, tones: readonly string[]) {
  const index = [...id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % tones.length;
  return tones[index];
}

export function PlaceImage({ id, name, uri, style }: { id: string; name: string; uri?: string; style?: StyleProp<ViewStyle> }) {
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const [loading, setLoading] = useState(Boolean(uri));
  const [failed, setFailed] = useState(false);

  useEffect(() => { setLoading(Boolean(uri)); setFailed(false); }, [uri]);

  return <View style={[styles.root, { backgroundColor: toneFor(id, colours.tileTones) }, style]}>
    {!uri || failed ? <Text accessibilityElementsHidden style={styles.letter}>{name.charAt(0)}</Text> : null}
    {uri && !failed ? <Image accessibilityLabel={`${name} facade`} cachePolicy="memory-disk" contentFit="cover" onError={() => { setFailed(true); setLoading(false); }} onLoad={() => setLoading(false)} onLoadStart={() => setLoading(true)} recyclingKey={uri} source={{ uri }} transition={180} style={StyleSheet.absoluteFill} /> : null}
    {loading ? <View accessibilityLabel="Loading image" accessibilityRole="progressbar" style={styles.skeleton} /> : null}
  </View>;
}

const createStyles = (colours: ThemeColours) => StyleSheet.create({
  root: { overflow: "hidden", backgroundColor: colours.elevated },
  letter: { position: "absolute", right: 5, top: -22, color: colours.imageTextGhost, fontFamily: fonts.extraBold, fontSize: 104, lineHeight: 120 },
  skeleton: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colours.elevated, opacity: 0.86 }
});
