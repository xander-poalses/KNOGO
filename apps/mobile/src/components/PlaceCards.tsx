import {
  featureLabel,
  getCloseTime,
  type Place,
  type PlaceGroup
} from "@knogo/core";
import { useRouter } from "expo-router";
import { ChevronRight, Clock3, Heart, MapPin } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { HapticPressable as Pressable } from "./HapticPressable";
import { fonts, radii, space, useTheme, useThemeStyles, type ThemeColours } from "../theme";
import { PlaceLogo } from "./PlaceLogo";
import { PlaceImage } from "./PlaceImage";
import { getCheckPresentation } from "../statusPresentation";

function signalTone(tone: ReturnType<typeof getCheckPresentation>["tone"], styles: ReturnType<typeof createStyles>) {
  if (tone === "success") return styles.good;
  if (tone === "closed") return styles.bad;
  if (tone === "warning") return styles.warning;
  return styles.neutral;
}

export function PlaceCard({ place, saved, onToggleSaved }: { place: Place; saved: boolean; onToggleSaved: (id: string) => void }) {
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const router = useRouter();
  const trading = getCheckPresentation(place.currentStatus);
  const signals = ([ ["Walk-ins", "walk_ins"], ["Vibe", "busy_level"], ["Power", "backup_power"], ["Card", "card_machine"] ] as const).map(([label, type]) => {
    const check = getCheckPresentation(place.currentStatus, type);
    return { label, value: check.label, summary: check.summary, tone: signalTone(check.tone, styles) };
  });
  const open = () => router.push({ pathname: "/restaurants/[placeId]", params: { placeId: place.id } });

  return (
    <View style={styles.card}>
      <View style={styles.topline}>
        <Text style={[styles.confirmed, signalTone(trading.tone, styles)]}>{trading.summary}</Text>
      </View>
      <Text style={styles.name}>{place.name}</Text>
      <View style={styles.metaRow}>
        <MapPin color={colours.muted} size={14} />
        <Text numberOfLines={2} style={styles.meta}>{place.area} / {place.cuisine.join(", ")}</Text>
      </View>
      <View style={styles.metaRow}>
        <Clock3 color={colours.muted} size={14} />
        <Text style={styles.meta}>{getCloseTime(place.openingHours)}</Text>
      </View>
      <View style={styles.signals}>
        {signals.map((signal) => (
          <View accessible accessibilityLabel={`${signal.label}: ${signal.summary}`} key={signal.label} style={styles.signal}>
            <Text style={styles.signalLabel}>{signal.label}</Text>
            <Text style={[styles.signalValue, signal.tone]}>{signal.value}</Text>
          </View>
        ))}
      </View>
      <View style={styles.features}>
        {place.features.slice(0, 2).map((feature) => <Text key={feature} style={styles.feature}>{featureLabel(feature)}</Text>)}
      </View>
      <View style={styles.actions}>
        <Pressable accessibilityLabel={`View ${place.name} details`} accessibilityRole="button" onPress={open} style={({ pressed }) => [styles.detailsButton, pressed && styles.pressed]}><Text style={styles.detailsText}>View details</Text></Pressable>
      </View>
    </View>
  );
}

export function GroupCard({ group, branches }: { group: PlaceGroup; branches: Place[] }) {
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const router = useRouter();
  const openGroup = () => branches.length === 1 ? router.push({ pathname: "/restaurants/[placeId]", params: { placeId: branches[0].id } }) : router.push({ pathname: "/restaurants/groups/[groupSlug]", params: { groupSlug: group.slug } });
  return (
    <Pressable
      accessibilityLabel={`${group.name}, choose from ${branches.length} branches`}
      accessibilityRole="button"
      onPress={openGroup}
      style={({ pressed }) => [styles.groupCard, pressed && styles.pressed]}
    >
      <View style={styles.groupCopy}>
        <Text style={styles.groupKicker}>{branches.length} {branches.length === 1 ? "branch" : "branches"}</Text>
        <Text style={styles.name}>{group.name}</Text>
        <Text style={styles.meta}>{group.cuisine.join(" / ")}</Text>
      </View>
      <ChevronRight color={colours.primary} size={22} />
    </Pressable>
  );
}

export function ExplorePlaceTile({ place, width, saved, onToggleSaved, distance, onPress, layout = "list", allowRemove = false }: { place: Place; width: number; saved: boolean; onToggleSaved: (id: string) => void; distance?: string | null; onPress?: (place: Place) => void; layout?: "grid" | "list"; allowRemove?: boolean }) {
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const router = useRouter();
  const open = () => onPress ? onPress(place) : router.push({ pathname: "/restaurants/[placeId]", params: { placeId: place.id } });
  const trading = getCheckPresentation(place.currentStatus);
  const metadata = [place.name.trim().toLocaleLowerCase().endsWith(place.area.trim().toLocaleLowerCase()) ? null : place.area, distance].filter(Boolean).join(" / ");
  if (layout === "list") return <View style={[styles.resultRow, { width }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${place.name}, ${place.area}, ${trading.summary}`} onPress={open} style={({ pressed }) => [styles.resultMain, pressed && styles.pressed]}>
      <PlaceImage id={place.id} name={place.name} uri={place.imageUrl} style={styles.resultLogo}/>
      <View style={styles.resultCopy}><Text style={styles.resultName}>{place.name}</Text>{metadata ? <Text style={styles.resultMeta}>{metadata}</Text> : null}<Text style={[styles.resultStatus, signalTone(trading.tone, styles)]}>{trading.tone === "neutral" ? "No recent check" : trading.label}</Text></View>
    </Pressable>
    {allowRemove && saved ? <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${place.name} from saved`} onPress={() => onToggleSaved(place.id)} style={styles.resultSave}><Heart color={colours.primary} fill={colours.primary} size={20}/></Pressable> : null}
  </View>;
  return (
    <View style={[styles.exploreTile, { width }]}>
      <Pressable accessibilityLabel={`${place.name}, ${trading.summary}, ${place.area}`} accessibilityRole="button" onPress={open} style={({ pressed }) => [styles.exploreMain, pressed && styles.pressed]}>
        <PlaceImage id={place.id} name={place.name} uri={place.imageUrl} style={styles.gridLogo} />
        <View style={[styles.exploreCopy]}>
          <Text style={styles.exploreName}>{place.name}</Text>
          {metadata ? <Text style={styles.exploreArea}>{metadata}</Text> : null}
          <Text style={[styles.resultStatus, signalTone(trading.tone, styles)]}>{trading.label}</Text>
        </View>
      </Pressable>
      {allowRemove && saved ? <Pressable
        accessibilityLabel={`Remove ${place.name} from saved`}
        accessibilityRole="button"
        accessibilityState={{ selected: saved }}
        hitSlop={8}
        onPress={() => onToggleSaved(place.id)}
        style={styles.exploreSave}
      >
        <Heart color={colours.white} fill={saved ? colours.primary : colours.unsavedHeart} size={17} />
      </Pressable> : null}
    </View>
  );
}

export function ExploreGroupTile({ group, branches, width = 196, distance, layout = "grid" }: { group: PlaceGroup; branches: Place[]; width?: number; distance?: string | null; layout?: "grid" | "list" }) {
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const router = useRouter();
  const openGroup = () => branches.length === 1 ? router.push({ pathname: "/restaurants/[placeId]", params: { placeId: branches[0].id } }) : router.push({ pathname: "/restaurants/groups/[groupSlug]", params: { groupSlug: group.slug } });
  if (branches.length === 1) return <ExplorePlaceTile place={branches[0]} width={width} saved={false} onToggleSaved={() => undefined} distance={distance} layout={layout}/>;
  if (layout === "list") return <Pressable accessibilityRole="button" accessibilityLabel={`${group.name}, choose a branch`} onPress={() => router.push({ pathname: "/restaurants/groups/[groupSlug]", params: { groupSlug: group.slug } })} style={({ pressed }) => [styles.resultRow, styles.resultGroup, { width }, pressed && styles.pressed]}>
    <PlaceLogo name={group.name} style={styles.resultLogo}/>
    <View style={styles.resultCopy}><Text style={styles.resultName}>{group.name}</Text><Text style={styles.resultMeta}>{[...new Set(branches.map(branch => branch.area))].slice(0, 2).join(" · ")}{distance ? ` · ${distance}` : ""}</Text><Text style={styles.resultGroupAction}>Choose a branch</Text></View>
  </Pressable>;
  return (
    <Pressable
      onPress={openGroup}
      accessibilityLabel={`${group.name}, choose a branch`}
      accessibilityRole="button"
      style={({ pressed }) => [styles.exploreGroup, { width }, pressed && styles.pressed]}
    >
      <PlaceLogo name={group.name} style={styles.gridLogo} />
      <View style={[styles.exploreCopy]}>
        <Text style={styles.exploreName}>{group.name}</Text>
        <Text style={styles.exploreArea}>{branches.length} branches</Text>
        <Text style={styles.resultGroupAction}>Choose a branch</Text>
      </View>
    </Pressable>
  );
}

const createStyles = (colours: ThemeColours) => StyleSheet.create({
  resultRow: { minHeight: 104, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colours.border, backgroundColor: colours.surface },
  resultMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16, paddingHorizontal: 12 },
  resultGroup: { gap: 14, paddingVertical: 16, paddingHorizontal: 12 },
  resultLogo: { width: 64, height: 64, flexShrink: 0, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colours.border },
  resultCopy: { flex: 1, gap: 4, paddingRight: 4 },
  resultName: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 23, color: colours.text },
  resultMeta: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colours.muted },
  resultStatus: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 },
  resultGroupAction: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, color: colours.primary },
  resultSave: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: 4 },
  card: { gap: space.sm, padding: 16, borderWidth: 1, borderColor: colours.border, borderRadius: radii.surface, backgroundColor: colours.surface },
  pressed: { opacity: 0.92 },
  topline: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  confirmed: { flex: 1, color: colours.muted, fontFamily: fonts.extraBold, fontSize: 10, textTransform: "uppercase" },
  confidence: { fontFamily: fonts.semibold, fontSize: 11, paddingBottom: 3, borderBottomWidth: 1, borderBottomColor: colours.border },
  name: { maxWidth: 290, paddingBottom: 4, color: colours.text, fontFamily: fonts.extraBold, fontSize: 27, lineHeight: 30 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  meta: { flex: 1, color: colours.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 17 },
  signals: { flexDirection: "row", flexWrap: "wrap", gap: 0 },
  signal: { width: "50%", minHeight: 52, paddingTop: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colours.border },
  signalLabel: { color: colours.text, fontFamily: fonts.extraBold, fontSize: 10, textTransform: "uppercase" },
  signalValue: { marginTop: 3, fontFamily: fonts.regular, fontSize: 13, textTransform: "capitalize" },
  good: { color: colours.success },
  warning: { color: colours.warning },
  bad: { color: colours.closed },
  neutral: { color: colours.muted },
  features: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  feature: { minHeight: 28, paddingHorizontal: 10, paddingTop: 6, borderRadius: 999, backgroundColor: colours.featureTint, color: colours.muted, fontFamily: fonts.regular, fontSize: 11 },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailsButton: { minHeight: 46, flex: 1, alignItems: "center", justifyContent: "center", borderRadius: radii.control, backgroundColor: colours.primary },
  detailsText: { color: colours.background, fontFamily: fonts.extraBold, fontSize: 13 },
  saveButton: { width: 46, height: 46, alignItems: "center", justifyContent: "center" },
  groupCard: { minHeight: 126, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: colours.border, borderRadius: radii.surface, backgroundColor: colours.surface },
  groupCopy: { flex: 1, gap: 6 },
  groupKicker: { color: colours.primary, fontFamily: fonts.extraBold, fontSize: 11, textTransform: "uppercase" }
  ,
  exploreTile: { overflow: "hidden", borderRadius: radii.tile, backgroundColor: colours.elevated },
  exploreTileList: { borderWidth: 1, borderColor: colours.border, borderRadius: radii.surface, backgroundColor: colours.surface },
  exploreMain: { flex: 1 },
  gridLogo: { width: "100%", aspectRatio: 1.5, backgroundColor: colours.surface },
  tileLetter: { position: "absolute", right: 5, top: -20, color: colours.imageTextGhost, fontFamily: fonts.extraBold, fontSize: 96, lineHeight: 112 },
  fill: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  listLogo: { position: "absolute", top: 0, bottom: 0, left: 0, width: 132 },
  exploreStatus: { position: "absolute", top: 7, left: 7, minHeight: 22, paddingHorizontal: 7, flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 11 },
  exploreStatusOnLogo: { backgroundColor: colours.overlay },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colours.openDot },
  statusDotClosed: { backgroundColor: colours.closedDot },
  statusDotUnknown: { backgroundColor: colours.muted },
  exploreStatusText: { color: colours.white, fontFamily: fonts.semibold, fontSize: 9 },
  exploreSave: { position: "absolute", zIndex: 1, top: 1, right: 1, width: 44, height: 44, alignItems: "center", justifyContent: "center", backgroundColor: colours.surface, borderRadius: 8 },
  exploreCopy: { padding: 12, gap: 4, backgroundColor: colours.surface },
  exploreCopyList: { top: 0, right: 44, bottom: 0, left: 148, justifyContent: "center", gap: 7 },
  exploreName: { color: colours.text, fontFamily: fonts.semibold, fontSize: 17, lineHeight: 23 },
  exploreArea: { color: colours.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  exploreNameList: { color: colours.text, fontSize: 18, lineHeight: 22, textShadowRadius: 0 },
  exploreAreaList: { color: colours.muted, fontSize: 12, textShadowRadius: 0 },
  listStatus: { color: colours.primary, fontFamily: fonts.extraBold, fontSize: 10, textTransform: "uppercase", textShadowRadius: 0 },
  exploreGroup: { overflow: "hidden", borderRadius: radii.tile, backgroundColor: colours.elevated },
  exploreGroupList: { borderWidth: 1, borderColor: colours.border, borderRadius: radii.surface, backgroundColor: colours.surface },
  groupLetter: { position: "absolute", right: 6, top: -28, color: colours.imageTextGhostSoft, fontFamily: fonts.extraBold, fontSize: 132, lineHeight: 150 },
  exploreGroupName: { color: colours.white, fontFamily: fonts.extraBold, fontSize: 25, lineHeight: 28, textShadowColor: colours.overlay, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  exploreGroupNameList: { color: colours.text, fontSize: 21, lineHeight: 25, textShadowRadius: 0 },
  exploreGroupKicker: { color: colours.white, textShadowColor: colours.overlay, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }
});
