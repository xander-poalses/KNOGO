import { buildDiscoveryItems, defaultFilters, directoryCategories, filterPlaces, formatDistance, getCuisineOptions, type PlaceCategory } from "@knogo/core";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowRight, Bike, Car, ChevronDown, Clapperboard, Landmark, LayoutGrid, List, MapPin, ShoppingBag, SlidersHorizontal, Store, UtensilsCrossed } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { HapticPressable as Pressable } from "../components/HapticPressable";
import { FilterSheet } from "../components/FilterSheet";
import { ExploreGroupTile, ExplorePlaceTile } from "../components/PlaceCards";
import { BackButton, Chip, CacheNotice, Notice, Page, SearchField, Skeleton } from "../components/Ui";
import { VirtualizedGrid } from "../components/VirtualizedGrid";
import { usePlaces } from "../state/PlacesContext";
import { fonts, radii, space, useTheme, useThemeStyles, type ThemeColours } from "../theme";
import { getCheckPresentation } from "../statusPresentation";
import { contextualFilters } from "../filterContext";

type ExploreLayout = "list" | "grid";

const exploreLayoutKey = "knogo.explore.layout";

function useExploreLayout() {
  const { width } = useWindowDimensions();
  const [layout, setLayoutState] = useState<ExploreLayout>("list");
  useEffect(() => { void AsyncStorage.getItem(exploreLayoutKey).then((value) => {
    if (value === "list" || value === "grid") setLayoutState(value);
  }); }, []);
  const setLayout = (value: ExploreLayout) => {
    setLayoutState(value);
    void AsyncStorage.setItem(exploreLayoutKey, value);
  };
  return [width < 768 ? "list" : layout, setLayout] as const;
}

const categories = directoryCategories;
const categoryIcons = [UtensilsCrossed, ShoppingBag, Car, Landmark, Clapperboard, Bike];

export function BrowseScreen() {
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { q, nearby } = useLocalSearchParams<{ q?: string; nearby?: string }>();
  const query = q?.trim() ?? "";
  const { places, placeGroups, isSaved, toggleSaved, coordinates, locationLoading, requestNearby } = usePlaces();
  const openItems = useMemo(() => buildDiscoveryItems(places.filter((place) => getCheckPresentation(place.currentStatus).reportedOpen), placeGroups, coordinates).slice(0, 6), [coordinates, placeGroups, places]);
  const tileWidth = width < 768 ? Math.min(width, 720) - space.md * 2 : Math.floor((Math.min(width, 720) - 35) / 2);

  if (query) return <GlobalSearchResults initialQuery={query} />;
  if (nearby === "1") return <NearbyResultsScreen />;

  const openNearby = async () => {
    if (!coordinates) await requestNearby();
    router.push({ pathname: "/restaurants", params: { nearby: "1" } });
  };

  return (
    <Page contentContainerStyle={styles.pickerPage}>
      <View style={styles.header}><Text accessibilityRole="header" style={styles.pickerTitle}>Explore</Text></View>
      <Pressable accessibilityLabel="Check places near me" accessibilityRole="button" accessibilityState={{ busy: locationLoading, disabled: locationLoading }} disabled={locationLoading} onPress={() => void openNearby()} style={({ pressed }) => [styles.nearbyButton, pressed && styles.pressed]}><MapPin color={colours.primary} size={18} /><Text style={styles.nearbyText}>{locationLoading ? "Finding you..." : coordinates ? "Show status near me" : "Check places near me"}</Text></Pressable>
      <View style={styles.rule} />
      {categories.map((category, index) => {
        const Icon = categoryIcons[index];
        return (
        <Pressable accessibilityLabel={`Check ${category.title}`} accessibilityRole="button" key={category.id} onPress={() => router.push({ pathname: "/restaurants/category/[venueType]", params: { venueType: category.id, q: q ?? "" } })} style={({ pressed }) => [styles.category, pressed && styles.pressed]}>
          <View style={styles.categoryCopy}><Icon color={colours.primary} size={24} />
            <Text style={styles.categoryTitle}>{category.title}</Text>
            <ArrowRight color={colours.muted} size={18} />
          </View>
        </Pressable>
      ); })}
      {openItems.length ? <View style={styles.statusSection}><View style={styles.statusHead}><View><Text style={styles.statusTitle}>Status now</Text><Text style={styles.statusMeta}>{coordinates ? "Status near your location" : "Community and business updates"}</Text></View><Store color={colours.primary} size={20} /></View><View style={styles.statusGrid}>{openItems.map((item) => item.kind === "group" ? <ExploreGroupTile key={`group-${item.id}`} group={item.group} branches={item.branches} width={tileWidth} layout={width < 768 ? "list" : "grid"} /> : <ExplorePlaceTile key={`place-${item.id}`} place={item.place} width={tileWidth} layout={width < 768 ? "list" : "grid"} saved={isSaved(item.id)} onToggleSaved={(id) => void toggleSaved(id)} />)}</View></View> : null}
    </Page>
  );
}

function GlobalSearchResults({ initialQuery }: { initialQuery: string }) {
  const { width } = useWindowDimensions();
  const rowWidth = Math.min(width, 720) - space.md * 2;
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const router = useRouter();
  const { places, placeGroups, isSaved, toggleSaved, loading, refreshing, error, dataSource, lastUpdatedAt, cacheExpired, refresh } = usePlaces();
  const [query, setQuery] = useState(initialQuery);
  const filteredPlaces = useMemo(() => filterPlaces(places, { ...defaultFilters, query }), [places, query]);
  const groups = useMemo(
    () => placeGroups
      .map((group) => ({ group, branches: filteredPlaces.filter((place) => place.groupId === group.id) }))
      .filter(({ branches }) => branches.length),
    [filteredPlaces, placeGroups]
  );
  const singles = filteredPlaces.filter((place) => !place.groupId);
  const resultCount = groups.length + singles.length;

  return (
    <Page refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colours.primary} />}>
      <BackButton label="Back to home" />
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.resultText}>Search results</Text>
        <SearchField value={query} onChangeText={setQuery} />
      </View>
      <View style={styles.resultHead}>
        <Pressable accessibilityRole="button" onPress={() => router.replace("/restaurants")}><Text style={styles.resultText}>Choose a category</Text></Pressable>
        <Text style={styles.resultCount}>{resultCount} {resultCount === 1 ? "result" : "results"}</Text>
      </View>
      {dataSource === "cache" ? <CacheNotice fetchedAt={lastUpdatedAt} expired={cacheExpired} onRetry={() => void refresh()} /> : null}
      {loading && !places.length ? <><Skeleton /><Skeleton /></> : null}
      {error && !places.length ? <Notice title="Could not load live places" message={error} actionLabel="Try again" onAction={() => void refresh()} /> : null}
      {!loading && (!error || dataSource === "cache") && !filteredPlaces.length ? <Notice title="No matches yet" message="Try another place, area, or cuisine." /> : null}
      {groups.map(({ group, branches }) => <ExploreGroupTile key={group.id} group={group} branches={branches} width={rowWidth} layout="list"/>)}
      {singles.map(place => <ExplorePlaceTile key={place.id} place={place} saved={isSaved(place.id)} onToggleSaved={id => void toggleSaved(id)} width={rowWidth} layout="list"/>)}
    </Page>
  );
}

export function BrowseResultsScreen() {
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const { venueType, q } = useLocalSearchParams<{ venueType: PlaceCategory; q?: string }>();
  const legacyFood = [{ id: "restaurant", title: "Restaurants", members: ["restaurant"] }, { id: "quick_bites", title: "Quick Bites", members: ["quick_bites"] }, { id: "bar", title: "Bars", members: ["bar"] }] as const;
  const category = [...categories, ...legacyFood].find((item) => item.id === venueType) ?? categories[0];
  const { places, placeGroups, isSaved, toggleSaved, loading, refreshing, error, dataSource, lastUpdatedAt, cacheExpired, refresh } = usePlaces();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [layout, setLayout] = useExploreLayout();
  const { width: viewportWidth } = useWindowDimensions();
  const [filters, setFilters] = useState({ ...defaultFilters, query: q ?? "" });
  useEffect(() => { setFilters({ ...defaultFilters, query: q ?? "" }); }, [category.id, q]);
  const categoryPlaces = useMemo(() => places.filter((place) => (category.members as readonly PlaceCategory[]).includes(place.category)), [category.id, places]);
  const serviceCategories = useMemo(() => [...new Set(categoryPlaces.map(place => place.category))], [categoryPlaces]);
  const filteredPlaces = useMemo(() => filterPlaces(categoryPlaces, contextualFilters(filters, serviceCategories)), [categoryPlaces, filters, serviceCategories]);
  const areas = useMemo(() => [...new Set(categoryPlaces.map((place) => place.area))].sort(), [categoryPlaces]);
  const cuisines = useMemo(() => getCuisineOptions(categoryPlaces), [categoryPlaces]);
  const items = useMemo(() => buildDiscoveryItems(filteredPlaces, placeGroups, null), [filteredPlaces, placeGroups]);
  const resultCount = items.length;
  const areaHeading = filters.areas.length === 0 ? "Places to check" : filters.areas.length === 1 ? `Places in ${filters.areas[0]}` : `${filters.areas.length} areas selected`;

  return (
    <>
      <VirtualizedGrid
        data={items}
        columns={layout === "list" ? 1 : 3}
        roundedList={layout === "list"}
        keyExtractor={(item) => `${item.kind}-${item.id}`}
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        empty={!loading && (!error || dataSource === "cache") ? <Notice title="No matches yet" message="Try fewer filters or another category." /> : undefined}
        header={<><BackButton label="Choose category" /><View style={styles.header}>
          <Text accessibilityRole="header" style={styles.eyebrow}>{category.title}</Text>
          <SearchField value={filters.query} onChangeText={(query) => setFilters({ ...filters, query })} />
        </View>
        <Pressable accessibilityLabel="Open filters" accessibilityRole="button" onPress={() => setFiltersOpen(true)} style={styles.filterLauncher}><SlidersHorizontal color={colours.text} size={18} /><Text style={styles.filterText}>Filters</Text><ChevronDown color={colours.muted} size={18} /></Pressable>
        <View style={styles.resultHead}><Text style={styles.resultText}>{areaHeading}</Text><View style={styles.resultActions}><Text style={styles.resultCount}>{resultCount}</Text>{viewportWidth >= 768 ? <Pressable accessibilityLabel={layout === "list" ? "Show three-column grid" : "Show list"} accessibilityRole="button" onPress={() => setLayout(layout === "list" ? "grid" : "list")} style={styles.layoutButton}>{layout === "list" ? <LayoutGrid color={colours.text} size={19} /> : <List color={colours.text} size={20} />}</Pressable> : null}</View></View>
        {dataSource === "cache" ? <CacheNotice fetchedAt={lastUpdatedAt} expired={cacheExpired} onRetry={() => void refresh()} /> : null}
        {loading && !places.length ? <><Skeleton /><Skeleton /></> : null}
        {error && !places.length ? <Notice title="Could not load live places" message={error} actionLabel="Try again" onAction={() => void refresh()} /> : null}
        </>}
        renderTile={(item, width) => item.kind === "group"
          ? <ExploreGroupTile group={item.group} branches={item.branches} width={width} layout={layout} />
          : <ExplorePlaceTile place={item.place} width={width} saved={isSaved(item.id)} onToggleSaved={(id) => void toggleSaved(id)} layout={layout} />}
      />
      <FilterSheet places={categoryPlaces} categories={serviceCategories} visible={filtersOpen} filters={filters} areas={areas} cuisines={cuisines} onChange={setFilters} onClose={() => setFiltersOpen(false)} />
    </>
  );
}

function NearbyResultsScreen() {
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const { places, placeGroups, isSaved, toggleSaved, loading, refreshing, error, dataSource, lastUpdatedAt, cacheExpired, coordinates, locationLoading, locationError, fallbackArea, requestNearby, setFallbackArea, refresh } = usePlaces();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [layout, setLayout] = useExploreLayout();
  const { width: viewportWidth } = useWindowDimensions();
  const [filters, setFilters] = useState({ ...defaultFilters });
  const areas = useMemo(() => [...new Set(places.map((place) => place.area))].sort(), [places]);
  const cuisines = useMemo(() => getCuisineOptions(places), [places]);
  const selectedAreas = coordinates ? [] : filters.areas.length ? filters.areas : fallbackArea ? [fallbackArea] : [];
  const serviceCategories = useMemo(() => [...new Set(places.map(place => place.category))], [places]);
  const filteredPlaces = useMemo(() => filterPlaces(places, contextualFilters({ ...filters, areas: selectedAreas }, serviceCategories)), [filters, places, selectedAreas.join("|"), serviceCategories]);
  const items = useMemo(() => buildDiscoveryItems(filteredPlaces, placeGroups, coordinates), [coordinates, filteredPlaces, placeGroups]);

  return (
    <>
      <VirtualizedGrid
        data={items}
        columns={layout === "list" ? 1 : 3}
        roundedList={layout === "list"}
        keyExtractor={(item) => `${item.kind}-${item.id}`}
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        header={<><BackButton label="Back to explore" /><View style={styles.header}><Text accessibilityRole="header" style={styles.resultsTitle}>{coordinates ? "Nearby" : "Choose an area"}</Text><SearchField value={filters.query} onChangeText={(query) => setFilters({ ...filters, query })} /></View>
        {!coordinates ? <View style={styles.locationPanel}>
          <Pressable disabled={locationLoading} onPress={() => void requestNearby()} style={styles.locationButton}><MapPin color={colours.white} size={17} /><Text style={styles.locationButtonText}>{locationLoading ? "Finding you..." : "Use my location"}</Text></Pressable>
          {locationError ? <Text style={styles.locationError}>{locationError}</Text> : null}
          <ScrollView horizontal style={styles.areaRailViewport} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.areaRail}>{areas.map((area) => { const active = selectedAreas.includes(area); return <Chip role="radio" key={area} label={area} selected={active} onPress={() => { setFilters({ ...filters, areas: [area] }); void setFallbackArea(area); }} />; })}</ScrollView>
        </View> : null}
        <Pressable accessibilityLabel="Open filters" accessibilityRole="button" onPress={() => setFiltersOpen(true)} style={styles.filterLauncher}><SlidersHorizontal color={colours.text} size={18} /><Text style={styles.filterText}>Filters</Text><ChevronDown color={colours.muted} size={18} /></Pressable>
        <View style={styles.resultHead}><Text style={styles.resultText}>{coordinates ? "Places" : selectedAreas[0] ?? "Pretoria East"}</Text><View style={styles.resultActions}><Text style={styles.resultCount}>{items.length}</Text>{viewportWidth >= 768 ? <Pressable accessibilityLabel={layout === "list" ? "Show three-column grid" : "Show list"} accessibilityRole="button" onPress={() => setLayout(layout === "list" ? "grid" : "list")} style={styles.layoutButton}>{layout === "list" ? <LayoutGrid color={colours.text} size={19} /> : <List color={colours.text} size={20} />}</Pressable> : null}</View></View>
        {dataSource === "cache" ? <CacheNotice fetchedAt={lastUpdatedAt} expired={cacheExpired} onRetry={() => void refresh()} /> : null}
        {loading && !places.length ? <><Skeleton /><Skeleton /></> : null}
        {error && !places.length ? <Notice title="Could not load places" message={error} actionLabel="Try again" onAction={() => void refresh()} /> : null}
        </>}
        renderTile={(item, width) => item.kind === "group"
          ? <ExploreGroupTile group={item.group} branches={item.branches} width={width} distance={formatDistance(item.distanceKm)} layout={layout} />
          : <ExplorePlaceTile place={item.place} width={width} distance={formatDistance(item.distanceKm)} saved={isSaved(item.id)} onToggleSaved={(id) => void toggleSaved(id)} layout={layout} />}
      />
      <FilterSheet places={places} categories={serviceCategories} visible={filtersOpen} filters={filters} areas={areas} cuisines={cuisines} onChange={setFilters} onClose={() => setFiltersOpen(false)} />
    </>
  );
}

const createStyles = (colours: ThemeColours) => StyleSheet.create({
  pickerPage: { paddingTop: space.lg }, header: { gap: space.sm }, eyebrow: { color: colours.primary, fontFamily: fonts.extraBold, fontSize: 13 },
  pickerTitle: { maxWidth: 340, paddingBottom: 8, color: colours.text, fontFamily: fonts.extraBold, fontSize: 38, lineHeight: 45 }, resultsTitle: { maxWidth: 330, paddingBottom: 8, color: colours.text, fontFamily: fonts.extraBold, fontSize: 36, lineHeight: 43 },
  pickerCopy: { maxWidth: 350, color: colours.muted, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 }, nearbyButton: { minHeight: 46, alignSelf: "flex-start", paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1, borderColor: colours.border, borderRadius: radii.round, backgroundColor: colours.surface }, nearbyText: { color: colours.primary, fontFamily: fonts.extraBold, fontSize: 12 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: colours.border }, category: { overflow: "hidden", borderWidth: 1, borderColor: colours.border, borderRadius: radii.surface, backgroundColor: colours.surface },
  categoryCopy: { padding: 15, minHeight: 72, flexDirection: "row", alignItems: "center", gap: 14 }, live: { color: colours.primary, fontFamily: fonts.extraBold, fontSize: 11, textTransform: "uppercase" },
  categoryTitle: { flex: 1, color: colours.text, fontFamily: fonts.extraBold, fontSize: 20, lineHeight: 26 }, categoryFoot: { flexDirection: "row", alignItems: "center", gap: 12 }, categoryBody: { flex: 1, color: colours.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 18 },
  foodImage: { width: "100%", aspectRatio: 16 / 9, borderRadius: radii.surface, backgroundColor: colours.elevated }, filterLauncher: { minHeight: 52, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: radii.control, backgroundColor: colours.surface, borderWidth: 1, borderColor: colours.border },
  filterText: { flex: 1, color: colours.text, fontFamily: fonts.extraBold, fontSize: 15 }, resultHead: { minHeight: 55, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colours.border },
  resultActions: { flexDirection: "row", alignItems: "center", gap: 8 }, layoutButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colours.controlBorder, borderRadius: radii.control, backgroundColor: colours.surface },
  resultText: { color: colours.text, fontFamily: fonts.extraBold, fontSize: 21, paddingBottom: 2 }, resultCount: { color: colours.text, fontFamily: fonts.extraBold, fontSize: 22, paddingBottom: 4 }, pressed: { opacity: 0.82 },
  sectionHint: { paddingBottom: 6, color: colours.muted, fontFamily: fonts.regular, fontSize: 11 },
  areaRailViewport: { height: 48, flexGrow: 0, flexShrink: 0 },
  areaRail: { height: 48, gap: 8, alignItems: "center" },
  railTitle: { paddingTop: 4, color: colours.text, fontFamily: fonts.extraBold, fontSize: 15 },
  groupRail: { gap: 8 },
  exploreGrid: { flexDirection: "row", flexWrap: "wrap", gap: 3 }
  ,
  locationPanel: { gap: 9, paddingVertical: 4 },
  locationButton: { minHeight: 48, paddingHorizontal: 16, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 999, backgroundColor: colours.primary },
  locationButtonText: { color: colours.white, fontFamily: fonts.extraBold, fontSize: 13 },
  locationError: { color: colours.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  statusSection: { gap: 11, paddingTop: space.sm }, statusHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, statusTitle: { paddingBottom: 4, color: colours.text, fontFamily: fonts.extraBold, fontSize: 24, lineHeight: 30 }, statusMeta: { color: colours.muted, fontFamily: fonts.regular, fontSize: 12 }, statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 3 }
});
