// Imports
import { useEffect, useRef, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Modal, StyleSheet, View, type ModalProps } from "react-native";
import { useTheme } from "../theme";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ToastViewport } from "./ToastProvider";

// State and Helpers
const entrance = { backdropMs: 120, sheetMs: 220, offset: 48 };

// Components
export function StagedModal({ children, visible, onShow, onReady, backdropColour, ...props }: ModalProps & { children: ReactNode; backdropColour?: string; onReady?: () => void }) {
  const { colours } = useTheme();
  const backdrop = useRef(new Animated.Value(0)).current;
  const sheet = useRef(new Animated.Value(0)).current;
  const active = useRef(false);
  const opening = useRef(0);
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  const ready = useRef(onReady);
  ready.current = onReady;
  useEffect(() => {
    active.current = Boolean(visible);
    if (!visible) {
      animation.current?.stop();
      backdrop.setValue(0);
      sheet.setValue(0);
    }
    return () => { opening.current += 1; active.current = false; animation.current?.stop(); };
  }, [visible, backdrop, sheet]);

  const show: NonNullable<ModalProps["onShow"]> = event => {
    const currentOpening = ++opening.current;
    const complete = () => {
      if (active.current && currentOpening === opening.current) ready.current?.();
    };
    onShow?.(event);
    void AccessibilityInfo.isReduceMotionEnabled().catch(() => true).then(reduced => {
      if (!active.current || currentOpening !== opening.current) return;
      if (reduced) { backdrop.setValue(1); sheet.setValue(1); complete(); return; }
      animation.current = Animated.sequence([
        Animated.timing(backdrop, { toValue: 1, duration: entrance.backdropMs, useNativeDriver: true }),
        Animated.timing(sheet, { toValue: 1, duration: entrance.sheetMs, useNativeDriver: true })
      ]);
      animation.current.start(({ finished }) => { if (finished) complete(); });
    });
  };
  return <Modal {...props} visible={visible} transparent animationType="none" onShow={show}>
    <GestureHandlerRootView style={{ flex: 1 }}>
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: backdropColour ?? colours.overlayStrong, opacity: backdrop }]} />
    <Animated.View style={{ flex: 1, opacity: sheet, transform: [{ translateY: sheet.interpolate({ inputRange: [0, 1], outputRange: [entrance.offset, 0] }) }] }}><View style={{ flex: 1 }}>{children}</View></Animated.View>
    {visible ? <ToastViewport modal/> : null}
    </GestureHandlerRootView>
  </Modal>;
}
