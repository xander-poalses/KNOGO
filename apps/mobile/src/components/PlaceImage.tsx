import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { PlaceLogo } from "./PlaceLogo";

export function PlaceImage({ id, name, uri, style }: { id: string; name: string; uri?: string; style?: StyleProp<ViewStyle> }) {
  // shortcut: failed URLs retry on remount or URL change; use a shared network signal for reconnect retries.
  const [failedUri, setFailedUri] = useState<string>();
  return <View style={[styles.root, style]}>
    <PlaceLogo name={name} style={StyleSheet.absoluteFill}/>
    {uri && uri !== failedUri ? <Image key={uri} accessibilityLabel={`${name} photo`} cachePolicy="none" contentFit="cover" onError={() => setFailedUri(uri)} recyclingKey={`${id}:${uri}`} source={{ uri }} transition={180} style={StyleSheet.absoluteFill} /> : null}
  </View>;
}

const styles = StyleSheet.create({
  root: { overflow: "hidden" }
});
