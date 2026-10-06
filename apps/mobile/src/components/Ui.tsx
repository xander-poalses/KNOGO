import { useState, type ReactNode } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type ScrollViewProps
} from "react-native";
import { HapticPressable as Pressable } from "./HapticPressable";
import { ArrowLeft, Check, RefreshCw, Search, SlidersHorizontal, WifiOff } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts, radii, sizes, space, useTheme, useThemeStyles, type ThemeColours } from "../theme";

export function Page({ children, contentContainerStyle, ...props }: ScrollViewProps & { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const styles = useThemeStyles(createStyles);

  return (
    <ScrollView
      contentContainerStyle={[styles.page, { paddingBottom: 112 + insets.bottom }, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...props}
    >
      {children}
    </ScrollView>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  const styles = useThemeStyles(createStyles);
  return <Text style={styles.eyebrow}>{children}</Text>;
}

export function Title({ children, size = "page" }: { children: ReactNode; size?: "page" | "card" }) {
  const styles = useThemeStyles(createStyles);
  return <Text style={size === "page" ? styles.title : styles.cardTitle}>{children}</Text>;
}

export function Body({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  const styles = useThemeStyles(createStyles);
  return <Text style={[styles.body, muted && styles.muted]}>{children}</Text>;
}

export function BackButton({ label = "Back", onBack, iconOnly = false }: { label?: string; onBack?: () => void; iconOnly?: boolean }) {
  const router = useRouter();
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const goBack = () => router.canGoBack() ? router.back() : router.replace("/restaurants");

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={6} onPress={onBack ?? goBack} style={({ pressed }) => [styles.backButton, iconOnly && styles.backIconOnly, pressed && styles.pressed]}>
      <ArrowLeft color={colours.text} size={19} />
      {!iconOnly ? <Text style={styles.backText}>{label}</Text> : null}
    </Pressable>
  );
}

export function ActionButton({
  label,
  icon,
  tone = "dark",
  loading = false,
  disabled,
  accessibilityState,
  onFocus,
  onBlur,
  onHoverIn,
  onHoverOut,
  style,
  ...props
}: PressableProps & { label: string; icon?: ReactNode; tone?: "dark" | "light" | "green"; loading?: boolean }) {
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const busy = loading || Boolean(accessibilityState?.busy);
  const unavailable = Boolean(disabled || busy || accessibilityState?.disabled);
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityState={{ ...accessibilityState, disabled: unavailable, busy }}
      aria-disabled={unavailable}
      aria-busy={busy}
      disabled={unavailable}
      onFocus={event => { setFocused(true); onFocus?.(event); }}
      onBlur={event => { setFocused(false); onBlur?.(event); }}
      onHoverIn={event => { setHovered(true); onHoverIn?.(event); }}
      onHoverOut={event => { setHovered(false); onHoverOut?.(event); }}
      style={state => [styles.button, styles[`button_${tone}`], unavailable && !busy && styles.buttonDisabled, (state.pressed || (hovered && !unavailable)) && styles.pressed, typeof style === "function" ? style(state) : style, Platform.OS === "web" && focused && styles.buttonFocus]}
    >
      {busy ? <ActivityIndicator accessibilityElementsHidden importantForAccessibility="no-hide-descendants" color={tone === "light" ? colours.text : colours.background}/> : icon}
      <Text style={[styles.buttonText, tone === "light" && styles.buttonTextDark, unavailable && !busy && styles.buttonTextDark]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected = false, onPress, disabled = false, role = "checkbox" }: { label: string; selected?: boolean; onPress: () => void; disabled?: boolean; role?: "checkbox" | "radio" }) {
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const [focused, setFocused] = useState(false);
  const keyboardProps = Platform.OS === "web" ? { onKeyDown: (event: { key: string; preventDefault: () => void }) => {
    if (event.key === " " && !disabled) { event.preventDefault(); onPress(); }
  } } : {};
  return (
    <Pressable {...keyboardProps} accessibilityRole={role} accessibilityLabel={label} accessibilityState={{ checked: selected, disabled }} aria-checked={selected} aria-disabled={disabled} disabled={disabled} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onPress={onPress} style={({ pressed }) => [styles.chip, disabled && styles.selectionDisabled, pressed && styles.pressed, Platform.OS === "web" && focused && styles.buttonFocus]}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.chipIcon, role === "radio" && styles.radioIcon, selected && styles.chipSelected]}>{selected ? role === "radio" ? <View style={styles.radioDot}/> : <Check color={colours.background} size={14} strokeWidth={3} /> : null}</View>
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

export function SearchField({ value, onChangeText, onFilter, placeholder = "Search by place, area, or cuisine", accessibilityLabel = "Search places" }: { value: string; onChangeText: (value: string) => void; onFilter?: () => void; placeholder?: string; accessibilityLabel?: string }) {
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  return (
    <View style={styles.search}>
      <Search color={colours.muted} size={18} />
      <TextInput
        accessibilityLabel={accessibilityLabel}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colours.muted}
        style={styles.searchInput}
        returnKeyType="search"
      />
      {onFilter ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Open filters" onPress={onFilter} style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}>
          <SlidersHorizontal color={colours.text} size={19} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Notice({ title, message, loading = false, actionLabel, onAction }: { title: string; message?: string; loading?: boolean; actionLabel?: string; onAction?: () => void }) {
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  return (
    <View accessibilityRole="alert" style={styles.notice}>
      {loading ? <ActivityIndicator color={colours.primary} /> : null}
      <Text style={styles.noticeTitle}>{title}</Text>
      {message ? <Text style={styles.noticeText}>{message}</Text> : null}
      {actionLabel && onAction ? <ActionButton label={actionLabel} tone="light" onPress={onAction} /> : null}
    </View>
  );
}

export function CacheNotice({ fetchedAt, expired, onRetry }: { fetchedAt: string | null; expired: boolean; onRetry: () => void }) {
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const updated = fetchedAt ? new Date(fetchedAt).toLocaleString() : "unknown";
  return (
    <View style={styles.cacheNotice}>
      <WifiOff color={colours.text} size={18} />
      <View style={styles.cacheCopy}>
        <Text style={styles.cacheTitle}>Showing saved places</Text>
        <Text style={styles.cacheText}>Last updated {updated}{expired ? ". This copy is over seven days old." : "."}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Retry live data" hitSlop={8} onPress={onRetry} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
        <RefreshCw color={colours.text} size={18} />
      </Pressable>
    </View>
  );
}

export function Panel({ children }: { children: ReactNode }) {
  const styles = useThemeStyles(createStyles);
  return <View style={styles.panel}>{children}</View>;
}

export function Skeleton({ height = 110 }: { height?: number }) {
  const styles = useThemeStyles(createStyles);
  return <View accessibilityLabel="Loading" accessibilityRole="progressbar" style={[styles.skeleton, { height }]} />;
}

const createStyles = (colours: ThemeColours) => StyleSheet.create({
  page: { width: "100%", maxWidth: 720, flexGrow: 1, alignSelf: "center", padding: space.md, gap: space.md, backgroundColor: colours.background },
  eyebrow: { color: colours.primary, fontFamily: fonts.extraBold, fontSize: 13 },
  title: { maxWidth: 340, paddingBottom: 8, color: colours.text, fontFamily: fonts.extraBold, fontSize: 38, lineHeight: 45 },
  cardTitle: { paddingBottom: 6, color: colours.text, fontFamily: fonts.extraBold, fontSize: 28, lineHeight: 34 },
  body: { color: colours.text, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  muted: { color: colours.muted },
  backButton: { minWidth: 84, minHeight: sizes.touch, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7 },
  backIconOnly: { minWidth: sizes.touch, width: sizes.touch, justifyContent: "center" },
  backText: { color: colours.text, fontFamily: fonts.extraBold, fontSize: 14 },
  button: { minHeight: sizes.control, minWidth: sizes.touch, paddingVertical: space.sm, paddingHorizontal: 17, flexDirection: "row", gap: 9, alignItems: "center", justifyContent: "center", borderRadius: radii.control },
  button_dark: { backgroundColor: colours.text },
  button_green: { backgroundColor: colours.primary },
  button_light: { backgroundColor: colours.surface, borderWidth: 1, borderColor: colours.controlBorder },
  buttonDisabled: { backgroundColor: colours.controlStrong, borderWidth: 1, borderColor: colours.controlBorder },
  buttonText: { flexShrink: 1, textAlign: "center", color: colours.background, fontFamily: fonts.extraBold, fontSize: 14, lineHeight: 20 },
  buttonTextDark: { color: colours.text },
  buttonFocus: { outlineColor: colours.focus, outlineWidth: 2, outlineOffset: 3, outlineStyle: "solid" },
  pressed: { opacity: 0.92 },
  chip: { minHeight: sizes.touch, paddingVertical: space.xs, paddingHorizontal: 8, borderRadius: 4, flexDirection: "row", gap: 10, alignItems: "center", maxWidth: "100%" },
  chipIcon: { width: 20, height: 20, flexShrink: 0, borderWidth: 1.5, borderColor: colours.controlBorder, borderRadius: 4, backgroundColor: colours.surface, alignItems: "center", justifyContent: "center" },
  chipSelected: { borderColor: colours.primary, backgroundColor: colours.primary },
  radioIcon: { borderRadius: radii.round },
  radioDot: { width: 8, height: 8, borderRadius: radii.round, backgroundColor: colours.background },
  chipText: { flexShrink: 1, color: colours.text, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  selectionDisabled: { opacity: 0.5 },
  search: { minHeight: sizes.control, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: colours.controlBorder, borderRadius: radii.control, backgroundColor: colours.surface },
  searchInput: { flex: 1, color: colours.text, fontFamily: fonts.regular, fontSize: 15, paddingVertical: 10 },
  filterButton: { width: sizes.touch, height: sizes.touch, alignItems: "center", justifyContent: "center" },
  notice: { minHeight: 160, paddingVertical: 28, paddingHorizontal: 20, alignItems: "center", justifyContent: "center", gap: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colours.border },
  noticeTitle: { paddingBottom: 3, color: colours.text, fontFamily: fonts.extraBold, fontSize: 20, lineHeight: 23, textAlign: "center" },
  noticeText: { color: colours.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, textAlign: "center" },
  cacheNotice: { minHeight: 72, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderLeftWidth: 3, borderColor: colours.warning, borderRadius: radii.surface, backgroundColor: colours.control },
  cacheCopy: { flex: 1, gap: 3 },
  cacheTitle: { color: colours.text, fontFamily: fonts.extraBold, fontSize: 14 },
  cacheText: { color: colours.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  retryButton: { width: sizes.iconButton, height: sizes.iconButton, alignItems: "center", justifyContent: "center" },
  panel: { padding: 16, gap: 14, borderRadius: radii.surface, borderWidth: 1, borderColor: colours.border, backgroundColor: colours.surface },
  skeleton: { borderRadius: radii.surface, backgroundColor: colours.elevated, opacity: 0.72 }
});
