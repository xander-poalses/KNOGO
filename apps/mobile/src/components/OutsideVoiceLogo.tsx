import { useEffect, useState } from "react";
import { View } from "react-native";
import { Image } from "expo-image";

export function OutsideVoiceLogo({ width = 150, onLoadEnd }: { width?: number; onLoadEnd?: () => void }) {
  const [symbolReady, setSymbolReady] = useState(false);
  const [wordmarkReady, setWordmarkReady] = useState(false);
  const scale = width / 150;
  useEffect(() => { if (symbolReady && wordmarkReady) onLoadEnd?.(); }, [symbolReady, wordmarkReady, onLoadEnd]);
  return <View accessible accessibilityLabel="Outside Voice Software" style={{ width, height: 32.501 * scale, backgroundColor: "#000000" }}>
    <Image source={require("../../assets/outside-voice-symbol.svg")} contentFit="contain" onLoadEnd={() => setSymbolReady(true)} style={{ position: "absolute", left: 0, top: 0, width: 30.7598 * scale, height: 32.501 * scale }} />
    <Image source={require("../../assets/outside-voice-wordmark.svg")} contentFit="contain" onLoadEnd={() => setWordmarkReady(true)} style={{ position: "absolute", left: 38.42 * scale, top: 17.36 * scale, width: 111.584 * scale, height: 11.3 * scale }} />
  </View>;
}
