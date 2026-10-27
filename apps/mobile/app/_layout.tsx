import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
  useFonts
} from "@expo-google-fonts/dm-sans";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BrandHeader } from "../src/components/AppChrome";
import { PlacesProvider } from "../src/state/PlacesContext";
import { ThemeProvider, useTheme } from "../src/theme";
import { TelemetryGate } from "../src/components/TelemetryGate";
import { FuelProvider } from "../src/state/FuelContext";
import { AccessibilityStyles } from "../src/components/AccessibilityStyles";
import { ToastProvider } from "../src/components/ToastProvider";
import { StartupSplash } from "../src/components/StartupSplash";

void SplashScreen.preventAutoHideAsync();
const hideNativeSplash = () => { void SplashScreen.hideAsync(); };

export default function RootLayout() {
  const [splashDone, setSplashDone] = useState(false);
  const finishSplash = useCallback(() => setSplashDone(true), []);
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold
  });

  const fontsReady = fontsLoaded || Boolean(fontError);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaProvider>
      <ThemeProvider><ToastProvider><FuelProvider><PlacesProvider>
        <View style={{ flex: 1 }} accessibilityElementsHidden={!splashDone} importantForAccessibility={splashDone ? "auto" : "no-hide-descendants"} pointerEvents={splashDone ? "auto" : "none"}>
          {splashDone ? <TelemetryGate><ThemedStack /></TelemetryGate> : null}
        </View>
        {!splashDone ? <StartupSplash fontsReady={fontsReady} onFinish={finishSplash} onLayout={hideNativeSplash} /> : null}
      </PlacesProvider></FuelProvider></ToastProvider></ThemeProvider>
    </SafeAreaProvider></GestureHandlerRootView>
  );
}

function ThemedStack() {
  const { colours, isDark } = useTheme();
  return <><AccessibilityStyles /><StatusBar style={isDark ? "light" : "dark"} /><Stack screenOptions={{ contentStyle: { backgroundColor: colours.background }, header: () => <BrandHeader /> }}><Stack.Screen name="(tabs)" options={{ headerShown: false }} /><Stack.Screen name="confirm/[placeId]" options={{ presentation: "card" }} /><Stack.Screen name="auth/callback" options={{ headerShown: false }} /><Stack.Screen name="support" /><Stack.Screen name="legal/privacy" /></Stack></>;
}
