import { forwardRef, type ComponentRef } from "react";
import { Pressable as NativePressable, type PressableProps } from "react-native";
import { ctaHaptic } from "../haptics";

export const HapticPressable = forwardRef<ComponentRef<typeof NativePressable>, PressableProps>(
  function HapticPressable({ onPress, disabled, accessibilityState, ...props }, ref) {
    const unavailable = Boolean(disabled || accessibilityState?.disabled || accessibilityState?.busy || props["aria-disabled"] || props["aria-busy"]);
    return <NativePressable {...props} ref={ref} disabled={unavailable} accessibilityState={accessibilityState}
      onPress={onPress ? event => {
        if (unavailable) return;
        if (props.accessible !== false) ctaHaptic();
        onPress(event);
      } : undefined}/>;
  }
);
