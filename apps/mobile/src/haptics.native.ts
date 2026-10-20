import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export function ctaHaptic(): void {
  try {
    const feedback = Platform.OS === "android"
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick)
      : Haptics.selectionAsync();
    void feedback.catch(() => undefined);
  } catch {
    // Feedback must not interrupt the action when hardware is unavailable.
  }
}
