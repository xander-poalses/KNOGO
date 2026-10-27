// Imports
import { useId, useLayoutEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { X } from "lucide-react-native";
import notificationBell from "../../assets/notification-bell.svg";
import { HapticPressable as Pressable } from "./HapticPressable";
import { radii, fonts, useTheme, useThemeStyles, type ThemeColours } from "../theme";
import { dismissToast, showToast } from "./Sonner";

// Components
export function FeedbackToast({ message, detail, onDismiss, action, style }: { message: string | null; detail?: string; onDismiss?: () => void; action?: { label: string; onPress: () => void }; style?: StyleProp<ViewStyle> }) {
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const id = useId();
  const callbacks = useRef({ onDismiss, action });
  callbacks.current = { onDismiss, action };
  const dismissed = useRef<string | null>(null);
  const identity = JSON.stringify([message, detail, action?.label]);
  const previous = useRef(identity);
  const dismiss = () => { dismissed.current = identity; dismissToast(id); callbacks.current.onDismiss?.(); };
  const content = useMemo(() => message ? <View accessibilityLiveRegion="polite" style={[styles.toast, style]}>
    <Image source={notificationBell} contentFit="contain" tintColor={colours.primary} accessible={false} style={styles.icon}/>
    <View style={styles.copy}>
      <Text accessibilityRole="alert" style={styles.message}>{message}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      {action ? <Pressable accessibilityRole="button" onPress={() => callbacks.current.action?.onPress()} style={styles.action}><Text style={styles.actionText}>{action.label}</Text></Pressable> : null}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notification" onPress={dismiss} style={styles.dismiss}><X color={colours.text} size={18}/></Pressable>
  </View> : null, [message, detail, action?.label, style, styles, colours, identity, id]);
  useLayoutEffect(() => {
    if (previous.current !== identity) { dismissed.current = null; previous.current = identity; }
    if (!content) { dismissed.current = null; dismissToast(id); return; }
    if (dismissed.current !== identity) showToast(id, content, () => {
      dismissed.current = identity;
      callbacks.current.onDismiss?.();
    });
  }, [id, content, identity]);
  useLayoutEffect(() => () => { dismissToast(id); }, [id]);
  return null;
}

// Styles
const createStyles = (colours: ThemeColours) => StyleSheet.create({
  toast: { alignSelf: "center", maxWidth: "100%", minHeight: 65, flexDirection: "row", alignItems: "center", gap: 6.5, backgroundColor: colours.toastSurface, borderRadius: radii.control, borderWidth: 1, borderColor: colours.border, paddingLeft: 13, paddingRight: 19.5, paddingVertical: 10, shadowColor: colours.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 16, elevation: 6 },
  icon: { width: 24, height: 24, flexShrink: 0 },
  copy: { flexShrink: 1, minWidth: 0 },
  message: { color: colours.text, fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21 },
  detail: { color: colours.text, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  action: { minWidth: 44, minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  actionText: { color: colours.primary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 21 },
  dismiss: { width: 44, minHeight: 44, marginRight: -13, alignItems: "center", justifyContent: "center" }
});
