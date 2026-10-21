import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export function ctaHaptic(): void {
  try {
    const feedback = Platform.OS === "android"
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void feedback.catch(() => undefined);
  } catch {
    // Feedback must not interrupt the action when hardware is unavailable.
  }
}
