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
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BrandHeader } from "../src/components/AppChrome";
import { PlacesProvider } from "../src/state/PlacesContext";
import { ThemeProvider, useTheme } from "../src/theme";
import { TelemetryGate } from "../src/components/TelemetryGate";
import { FuelProvider } from "../src/state/FuelContext";
import { AccessibilityStyles } from "../src/components/AccessibilityStyles";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold
  });

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider><FuelProvider><PlacesProvider><TelemetryGate><ThemedStack /></TelemetryGate></PlacesProvider></FuelProvider></ThemeProvider>
    </SafeAreaProvider>
  );
}

function ThemedStack() {
  const { colours, isDark } = useTheme();
  return <><AccessibilityStyles /><StatusBar style={isDark ? "light" : "dark"} /><Stack screenOptions={{ contentStyle: { backgroundColor: colours.background }, header: () => <BrandHeader /> }}><Stack.Screen name="(tabs)" options={{ headerShown: false }} /><Stack.Screen name="confirm/[placeId]" options={{ presentation: "card" }} /><Stack.Screen name="auth/callback" options={{ headerShown: false }} /><Stack.Screen name="support" /><Stack.Screen name="legal/privacy" /></Stack></>;
}
