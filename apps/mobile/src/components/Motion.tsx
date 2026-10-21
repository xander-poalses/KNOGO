import { useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, type StyleProp, type ViewStyle } from "react-native";
import Animated, { cancelAnimation, cubicBezier, Easing, FadeIn, FadeOut, LinearTransition, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from "react-native-reanimated";

export const motionEase = Easing.bezier(0.23, 1, 0.32, 1);

export function useMotionPreference() {
  const initial = useReducedMotion();
  const [reduced, setReduced] = useState(initial);
  useEffect(() => {
    const subscription = AccessibilityInfo?.addEventListener?.("reduceMotionChanged", setReduced);
    return () => subscription?.remove();
  }, []);
  return reduced;
}

export function AccordionMotion({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduced = useMotionPreference();
  return <Animated.View style={[{ overflow: "hidden" }, style]} layout={reduced ? undefined : LinearTransition.duration(180).easing(motionEase)}>{children}</Animated.View>;
}

export function AccordionArrow({ open, children }: { open: boolean; children: ReactNode }) {
  const reduced = useMotionPreference();
  return <Animated.View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }], transitionProperty: "transform", transitionDuration: reduced ? 0 : 180, transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1) }}>{children}</Animated.View>;
}

export function StateMotion({ value, children, style, step = false }: { value: string | number; children: ReactNode; style?: StyleProp<ViewStyle>; step?: boolean }) {
  const reduced = useMotionPreference();
  const previous = useRef(value);
  const opacity = useSharedValue(1);
  const offset = useSharedValue(0);
  useEffect(() => {
    if (reduced) { cancelAnimation(opacity); cancelAnimation(offset); opacity.set(1); offset.set(0); }
    if (previous.current === value) return;
    const direction = Number(value) < Number(previous.current) ? -1 : 1;
    previous.current = value;
    cancelAnimation(opacity); cancelAnimation(offset);
    if (reduced) { opacity.set(1); offset.set(0); return; }
    opacity.set(0.35);
    offset.set(step ? direction * 12 : 0);
    opacity.set(withTiming(1, { duration: 180, easing: motionEase }));
    offset.set(withTiming(0, { duration: 180, easing: motionEase }));
  }, [value, reduced, step, opacity, offset]);
  const motion = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ translateX: offset.get() }] }));
  return <Animated.View style={[style, motion]}>{children}</Animated.View>;
}

export function SaveMotion({ saved, children }: { saved: boolean; children: ReactNode }) {
  const reduced = useMotionPreference();
  const previous = useRef(saved);
  const scale = useSharedValue(1);
  useEffect(() => {
    cancelAnimation(scale);
    scale.set(1);
    if (saved && !previous.current && !reduced) scale.set(withSequence(withTiming(1.15, { duration: 100 }), withTiming(1, { duration: 140, easing: motionEase })));
    previous.current = saved;
  }, [saved, reduced, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

export function ReceiptMotion({ children }: { children: ReactNode }) {
  const reduced = useMotionPreference();
  return <Animated.View entering={reduced ? undefined : FadeIn.duration(200)}>{children}</Animated.View>;
}

export function AccordionBody({ children }: { children: ReactNode }) {
  const reduced = useMotionPreference();
  return <Animated.View entering={reduced ? undefined : FadeIn.duration(180)} exiting={reduced ? undefined : FadeOut.duration(100)}>{children}</Animated.View>;
}
