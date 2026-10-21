import { useEffect, useRef, type ReactNode } from "react";
import { useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { ctaHaptic } from "../haptics";
import { useMotionPreference } from "./Motion";
import { shouldDismissSheet } from "./swipeDismiss";

export function SwipeSheet({ visible, onClose, header, children, style }: { visible: boolean; onClose: () => void; header: ReactNode; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { height } = useWindowDimensions();
  const reduced = useMotionPreference();
  const y = useSharedValue(0);
  const start = useSharedValue(0);
  const closing = useSharedValue(false);
  const revision = useSharedValue(0);
  const active = useRef(visible);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    active.current = visible;
    revision.set(value => value + 1);
    cancelAnimation(y); y.set(0); closing.set(false);
    return () => { active.current = false; revision.set(value => value + 1); cancelAnimation(y); };
  }, [visible, revision, y, closing]);
  const finish = (expected: number) => {
    if (active.current && revision.get() === expected) { active.current = false; close.current(); }
  };
  const pan = Gesture.Pan().activeOffsetY([-10, 10]).failOffsetX([-20, 20])
    .onStart(() => { if (!closing.get()) { cancelAnimation(y); start.set(y.get()); } })
    .onUpdate(event => { if (!closing.get()) y.set(Math.max(0, start.get() + event.translationY)); })
    .onEnd(event => {
      if (closing.get()) return;
      if (shouldDismissSheet(y.get(), event.velocityY, height)) {
        closing.set(true);
        const expected = revision.get();
        scheduleOnRN(ctaHaptic);
        if (reduced) { scheduleOnRN(finish, expected); return; }
        y.set(withSpring(height, { duration: 300, dampingRatio: 1, velocity: event.velocityY, overshootClamping: true }, finished => { if (finished) scheduleOnRN(finish, expected); }));
      } else y.set(reduced ? 0 : withSpring(0, { duration: 300, dampingRatio: 0.8, velocity: event.velocityY }));
    })
    .onFinalize((_event, success) => { if (!success && !closing.get()) y.set(reduced ? 0 : withSpring(0, { duration: 300, dampingRatio: 1 })); });
  const motion = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  return <Animated.View accessibilityViewIsModal style={[style, motion]}>
    <GestureDetector gesture={pan}><Animated.View collapsable={false}>{header}</Animated.View></GestureDetector>
    {children}
  </Animated.View>;
}
