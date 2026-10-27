import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlaces } from "../state/PlacesContext";
import { OutsideVoiceLogo } from "./OutsideVoiceLogo";

export function StartupSplash({ fontsReady, onFinish, onLayout }: { fontsReady: boolean; onFinish: () => void; onLayout: () => void }) {
  const { storageReady, authLoading, loading } = usePlaces();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [mascotReady, setMascotReady] = useState(false);
  const [logoReady, setLogoReady] = useState(false);
  const completed = [fontsReady, storageReady, !authLoading, !loading, mascotReady, logoReady].filter(Boolean).length;
  const progress = completed / 6;
  const fill = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const bottom = Math.max(insets.bottom + 24, Math.min(100, height * 0.16));
  const barWidth = Math.min(360, width * 300 / 440);
  const mascotWidth = width * 0.1;

  useEffect(() => {
    const animation = Animated.timing(opacity, { toValue: 1, duration: reducedMotion ? 0 : 220, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [opacity, reducedMotion]);

  useEffect(() => {
    const animation = Animated.timing(fill, { toValue: progress, duration: reducedMotion ? 0 : 180, easing: Easing.out(Easing.quad), useNativeDriver: false });
    animation.start(({ finished }) => { if (finished && progress === 1) onFinish(); });
    return () => animation.stop();
  }, [fill, progress, reducedMotion, onFinish]);

  return <View style={styles.overlay} onLayout={onLayout} testID="startup-splash">
    <StatusBar hidden />
    <Animated.View style={[StyleSheet.absoluteFill, { opacity }]}>
      <Image source={require("../../assets/splash-mascot.png")} contentFit="contain" accessibilityLabel="KNOGO" onLoadEnd={() => setMascotReady(true)} style={{ position: "absolute", width: mascotWidth, height: mascotWidth, left: (width - mascotWidth) / 2, top: (height - mascotWidth) / 2 }} />
      <View style={{ position: "absolute", bottom: bottom + 35, alignSelf: "center" }}>
        <OutsideVoiceLogo width={Math.min(180, width * 150 / 440)} onLoadEnd={() => setLogoReady(true)} />
      </View>
      <View accessibilityRole="progressbar" accessibilityLabel="Loading KNOGO" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} style={[styles.track, { bottom, width: barWidth, left: (width - barWidth) / 2 }]}>
        <Animated.View style={[styles.fill, { width: fill.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
      </View>
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: "#000000", zIndex: 20000 },
  track: { position: "absolute", height: 5, borderRadius: 100, backgroundColor: "rgba(237,244,238,0.2)", overflow: "hidden" },
  fill: { height: 5, borderRadius: 100, backgroundColor: "#edf4ee" }
});
