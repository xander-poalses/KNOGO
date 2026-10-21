// Imports
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

// Functions
export function ctaHaptic(): void {
  try {
    const feedback = Platform.OS === "android"
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void feedback.catch(() => undefined);
  } catch {
  }
}
