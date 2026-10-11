import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, View } from "react-native";
import { Skeleton } from "./Ui";

export function ExpoGoSkeleton({ label, height }: { label: string; height: number }) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let active = true;
    let preferenceChanged = false;
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.55, duration: 900, useNativeDriver: true, isInteraction: false }),
      Animated.timing(opacity, { toValue: 1, duration: 900, useNativeDriver: true, isInteraction: false })
    ]));
    const update = (reduced: boolean) => {
      if (!active) return;
      pulse.stop();
      opacity.setValue(1);
      if (!reduced) pulse.start();
    };
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", reduced => {
      preferenceChanged = true;
      update(reduced);
    });
    void AccessibilityInfo.isReduceMotionEnabled().catch(() => true).then(reduced => {
      if (!preferenceChanged) update(reduced);
    });
    return () => { active = false; pulse.stop(); subscription.remove(); };
  }, [opacity]);

  return <View accessible accessibilityLabel={label} pointerEvents="none">
    <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ opacity }}>
      <Skeleton height={height} />
    </Animated.View>
  </View>;
}
