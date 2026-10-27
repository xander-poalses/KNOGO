import { defaultFilters, filterPlaces, type Place } from "@knogo/core";
import { useRouter } from "expo-router";
import { ArrowRight, Search, X } from "lucide-react-native";
import { Image } from "expo-image";
import { useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { StagedModal } from "../components/StagedModal";
import { HapticPressable as Pressable } from "../components/HapticPressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlaces } from "../state/PlacesContext";
import { fonts, radii, shadows, space, useTheme, useThemeStyles, type ThemeColours } from "../theme";
import { captureEvent } from "../telemetry";

export function HomeScreen() {
  const router = useRouter();
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const searchInputRef = useRef<import("react-native").TextInputInstance>(null);
  const { places, recentSearches, addRecentSearch, clearRecentSearches } = usePlaces();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const cleanQuery = query.trim();
  const suggestions = useMemo(
    () => cleanQuery ? filterPlaces(places, { ...defaultFilters, query: cleanQuery }).slice(0, 10) : [],
    [cleanQuery, places]
  );

  const search = async (value = query) => {
    const clean = value.trim();
    if (!clean) return;
    await addRecentSearch(clean);
    captureEvent("search_completed", { has_query: true });
    setQuery(clean);
    setSearchOpen(false);
    router.push({ pathname: "/restaurants", params: { q: clean } });
  };

  const openSuggestion = (place: Place) => {
    const placeId = place.id;
    captureEvent("search_completed", { has_query: true, suggestion: true });
    setQuery(place.name);
    setSearchOpen(false);
    router.push({ pathname: "/restaurants/[placeId]", params: { placeId } });
    void addRecentSearch(place.name);
  };

  return (
    <View style={styles.page}>
      <View style={styles.intro}>
        <Text accessibilityRole="header" style={styles.title}>Know before you go</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Search KNOGO" accessibilityHint="Opens the search field" onPress={() => setSearchOpen(true)} style={({ pressed }) => [styles.searchBox, pressed && styles.pressed]}>
          <Search color={colours.text} size={22} /><Text numberOfLines={1} style={[styles.input, !query && styles.placeholder]}>{query || "Search names, areas or cuisines"}</Text><View style={styles.searchArrow}><ArrowRight color={colours.background} size={21} /></View>
        </Pressable>
      </View>
      <View style={[styles.hero, { marginBottom: 78 + insets.bottom }]}>
        <Image accessibilityLabel="The KNOGO community" source={require("../../assets/community-meerkats.png")} contentFit="contain" contentPosition="bottom" style={styles.heroImage} />
      </View>

      <StagedModal accessibilityLabel="Search KNOGO" backdropColour={colours.searchOverlay} onRequestClose={() => setSearchOpen(false)} onReady={() => searchInputRef.current?.focus()} presentationStyle="overFullScreen" statusBarTranslucent visible={searchOpen}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalRoot}>
          <Pressable accessibilityLabel="Close search" onPress={() => setSearchOpen(false)} style={StyleSheet.absoluteFill} />
          <View style={[styles.searchSheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            {!cleanQuery && recentSearches.length ? <View style={styles.recent}><View style={styles.recentHead}><Text style={styles.recentTitle}>Recent</Text><Pressable accessibilityLabel="Clear recent searches" accessibilityRole="button" onPress={() => void clearRecentSearches()} style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}><Text style={styles.clearText}>Clear</Text></Pressable></View><ScrollView nestedScrollEnabled showsVerticalScrollIndicator={recentSearches.length > 5} style={styles.resultScroll}>{recentSearches.slice(0, 10).map((item) => <Pressable accessibilityRole="button" key={item} onPress={() => void search(item)} style={styles.recentRow}><Search color={colours.muted} size={16} /><Text style={styles.recentText}>{item}</Text></Pressable>)}</ScrollView></View> : null}
            {cleanQuery ? <View style={styles.recent}><View style={styles.recentHead}><Text style={styles.recentTitle}>Suggested places</Text></View><ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled showsVerticalScrollIndicator={suggestions.length > 5} style={styles.resultScroll}>{suggestions.map((place) => <Pressable accessibilityLabel={`Open ${place.name} in ${place.area}`} accessibilityRole="button" key={place.id} onPress={() => openSuggestion(place)} style={styles.suggestionRow}><Search color={colours.muted} size={16} /><View style={styles.suggestionCopy}><Text numberOfLines={1} style={styles.recentText}>{place.name}</Text><Text numberOfLines={1} style={styles.suggestionArea}>{place.area}</Text></View></Pressable>)}{!suggestions.length ? <Text style={styles.noSuggestions}>No matching branches yet.</Text> : null}</ScrollView></View> : null}
            <View style={styles.floatingSearchBox}><Search color={colours.text} size={20} /><TextInput ref={searchInputRef} accessibilityLabel="Search KNOGO" autoCapitalize="none" autoFocus onChangeText={setQuery} onSubmitEditing={() => void search()} placeholder="Search KNOGO" placeholderTextColor={colours.muted} returnKeyType="search" style={styles.input} value={query} /><Pressable accessibilityRole="button" accessibilityLabel="Search" accessibilityState={{ disabled: !cleanQuery }} disabled={!cleanQuery} onPress={() => void search()} style={({ pressed }) => [styles.goButton, !cleanQuery && styles.goButtonDisabled, pressed && styles.pressed]}><ArrowRight color={cleanQuery ? colours.background : colours.muted} size={21} /></Pressable></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close search" onPress={() => setSearchOpen(false)} style={({ pressed }) => [styles.closeSearch, pressed && styles.pressed]}><X color={colours.text} size={19} /></Pressable>
          </View>
        </KeyboardAvoidingView>
      </StagedModal>
    </View>
  );
}

const createStyles = (colours: ThemeColours) => StyleSheet.create({
  page: { width: "100%", maxWidth: 720, flex: 1, alignSelf: "center", paddingTop: space.xl, backgroundColor: colours.background },
  hero: { flex: 1, minHeight: 0, marginTop: space.lg, overflow: "hidden", backgroundColor: "transparent" },
  heroImage: { width: "100%", height: "100%" },
  intro: { paddingHorizontal: space.md, gap: 18 },
  title: { maxWidth: 360, paddingBottom: 4, color: colours.text, fontFamily: fonts.extraBold, fontSize: 44, lineHeight: 58, textTransform: "uppercase" }, introCopy: { maxWidth: 360, color: colours.muted, fontFamily: fonts.medium, fontSize: 14, lineHeight: 19 },
  searchBox: { minHeight: 60, paddingLeft: 20, paddingRight: 10, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: radii.control, borderWidth: 1, borderColor: colours.border, backgroundColor: colours.surface, ...shadows.card }, input: { flex: 1, color: colours.text, fontFamily: fonts.regular, fontSize: 13 }, placeholder: { color: colours.muted }, searchArrow: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: radii.round, backgroundColor: colours.primary },
  pressed: { opacity: 0.92 },
  clearButton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  goButtonDisabled: { backgroundColor: colours.controlStrong },
  modalRoot: { flex: 1, justifyContent: "flex-end" }, searchSheet: { padding: 14, gap: 12, backgroundColor: colours.background, borderTopRightRadius: radii.sheet, borderTopLeftRadius: radii.sheet }, floatingSearchBox: { minHeight: 60, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", gap: 9, borderRadius: radii.control, borderWidth: 1, borderColor: colours.border, backgroundColor: colours.surface, ...shadows.floating }, goButton: { width: 44, height: 44, borderRadius: radii.round, alignItems: "center", justifyContent: "center", backgroundColor: colours.primary },
  recent: { gap: 2 }, recentHead: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, recentTitle: { color: colours.text, fontFamily: fonts.extraBold, fontSize: 16 }, clearText: { color: colours.primary, fontFamily: fonts.extraBold, fontSize: 12 }, resultScroll: { maxHeight: 230 }, recentRow: { minHeight: 46, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colours.border }, suggestionRow: { minHeight: 46, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colours.border }, suggestionCopy: { flex: 1, gap: 1 }, recentText: { flex: 1, color: colours.text, fontFamily: fonts.regular, fontSize: 14 }, suggestionArea: { color: colours.muted, fontFamily: fonts.regular, fontSize: 11 }, noSuggestions: { minHeight: 46, paddingTop: 13, color: colours.muted, fontFamily: fonts.regular, fontSize: 13 }, closeSearch: { position: "absolute", top: -56, right: 16, width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radii.round, backgroundColor: colours.surface }
});
