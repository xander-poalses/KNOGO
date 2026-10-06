import { getCloseTime, getPlaceActionLinks, type Place } from "@knogo/core";
import { useLocalSearchParams } from "expo-router";
import { useRouter } from "expo-router";
import { ChevronRight, Clock3, ExternalLink, MapPin } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { HapticPressable as Pressable } from "../components/HapticPressable";
import { PlaceSheet } from "../components/PlaceSheet";
import { BranchMap } from "../components/BranchMap";
import { PlaceLogo } from "../components/PlaceLogo";
import { ActionButton, BackButton, Body, Notice, Page, Title } from "../components/Ui";
import { VirtualizedGrid } from "../components/VirtualizedGrid";
import { usePlaces } from "../state/PlacesContext";
import { fonts, shadows, sizes, space, useTheme, useThemeStyles, type ThemeColours } from "../theme";
import { getCheckPresentation } from "../statusPresentation";

export function GroupScreen() {
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const { groupSlug } = useLocalSearchParams<{ groupSlug: string }>();
  const { placeGroups, places } = usePlaces();
  const group = placeGroups.find((item) => item.slug === groupSlug);
  const branches = useMemo(() => places.filter((place) => place.groupId === group?.id), [group?.id, places]);
  const [selected, setSelected] = useState<Place | null>(null);

  if (!group) return <Page><BackButton label="Back to explore" /><Notice title="Group not found" message="This group is not in the current list." /></Page>;
  return (
    <>
      <VirtualizedGrid
        data={branches}
        columns={1}
        keyExtractor={(branch) => branch.id}
        empty={<Notice title="No branches available" />}
        header={<><BackButton label="Back to explore" /><View style={styles.head}><Text style={styles.eyebrow}>Group</Text><Title>{group.name}</Title>{group.description ? <Body muted>{group.description}</Body> : null}<Text style={styles.branchCount}>{branches.length} branches</Text></View>{branches.length ? <BranchMap branches={branches} selectedId={selected?.id} onSelect={setSelected} /> : null}<View style={styles.sectionHead}><Text style={styles.sectionTitle}>All branches</Text><Text style={styles.sectionCount}>{branches.length}</Text></View></>}
        renderTile={(branch, width) => <BranchRow branch={branch} width={width} onPress={() => setSelected(branch)} />}
      />
      <BranchSheet place={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function BranchRow({ branch, width, onPress }: { branch: Place; width: number; onPress: () => void }) {
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  return <Pressable accessibilityLabel={`${branch.name}, ${branch.area}, ${getCheckPresentation(branch.currentStatus).summary}`} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.branchRow, { width }, pressed && styles.pressed]}>
    <PlaceLogo id={branch.id} name={branch.groupName ?? branch.name} uri={branch.logoUrl} fallback="surface" style={styles.branchLogo} />
    <View style={styles.branchCopy}>
      <Text numberOfLines={2} style={styles.branchName}>{branch.name}</Text>
      <Text numberOfLines={1} style={styles.branchArea}>{branch.area}</Text>
      <View style={styles.branchMeta}><BranchStatus place={branch}/><Text style={styles.branchHours}>{getCloseTime(branch.openingHours)}</Text></View>
    </View>
    <ChevronRight color={colours.muted} size={20} />
  </Pressable>;
}

function BranchStatus({ place, detail = false }: { place: Place; detail?: boolean }) {
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const check = getCheckPresentation(place.currentStatus);
  return <Text accessibilityLabel={check.summary} style={[detail ? styles.sheetStatus : styles.branchStatus, { color: check.tone === "neutral" ? colours.muted : colours[check.tone] }]}>{detail ? check.summary : check.label}</Text>;
}

function BranchSheet({ place, onClose }: { place: Place | null; onClose: () => void }) {
  const router = useRouter();
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const [linkError, setLinkError] = useState("");
  useEffect(() => { setLinkError(""); }, [place?.id]);
  if (!place) return null;
  const directions = getPlaceActionLinks(place).find(action => action.type === "directions");
  return <PlaceSheet visible title={place.name} onClose={onClose}>
    <BranchStatus place={place} detail/>
    <View style={styles.metaRow}><MapPin color={colours.muted} size={15}/><Text style={styles.meta}>{place.area} / {place.address}</Text></View>
    <View style={styles.metaRow}><Clock3 color={colours.muted} size={15}/><Text style={styles.meta}>{getCloseTime(place.openingHours)}</Text></View>
    <ActionButton label="View branch" tone="green" onPress={() => { onClose(); router.push({ pathname: "/restaurants/[placeId]", params: { placeId: place.id } }); }}/>
    {directions ? <ActionButton label="Directions" tone="light" icon={<ExternalLink color={colours.text} size={17}/>} onPress={() => { setLinkError(""); void Linking.openURL(directions.url).catch(() => setLinkError("Directions could not open. Try again or use the branch address.")); }}/> : null}
    {linkError ? <Text accessibilityRole="alert" style={styles.meta}>{linkError}</Text> : null}
  </PlaceSheet>;
}

const createStyles = (colours: ThemeColours) => StyleSheet.create({
  page: { gap: space.md }, pressed: { opacity: 0.78 }, head: { gap: 7 }, eyebrow: { color: colours.primary, fontFamily: fonts.extraBold, fontSize: 12, textTransform: "uppercase" }, branchCount: { color: colours.muted, fontFamily: fonts.semibold, fontSize: 13 },
  sectionHead: { minHeight: 50, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colours.border }, sectionTitle: { paddingBottom: 6, color: colours.text, fontFamily: fonts.extraBold, fontSize: 23 }, sectionCount: { paddingBottom: 6, color: colours.muted, fontFamily: fonts.extraBold, fontSize: 18 }, branchGrid: { flexDirection: "row", flexWrap: "wrap", gap: 3 },
  branchRow: { minHeight: 104, padding: 10, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: colours.border, borderRadius: 8, backgroundColor: colours.surface }, branchLogo: { width: 84, height: 84, borderRadius: 4 }, branchCopy: { minWidth: 0, flex: 1, gap: 4 }, branchName: { paddingBottom: 2, color: colours.text, fontFamily: fonts.extraBold, fontSize: 17, lineHeight: 21 }, branchArea: { color: colours.muted, fontFamily: fonts.regular, fontSize: 12 }, branchMeta: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, branchStatus: { color: colours.primary, fontFamily: fonts.extraBold, fontSize: 10, textTransform: "uppercase" }, branchHours: { color: colours.muted, fontFamily: fonts.regular, fontSize: 10 },
  sheetOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: colours.overlay }, sheet: { padding: 18, gap: 11, borderTopRightRadius: 12, borderTopLeftRadius: 12, backgroundColor: colours.background, ...shadows.floating }, sheetHead: { minHeight: sizes.touch, alignItems: "center" }, sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: colours.border }, close: { position: "absolute", right: 0, top: 0, width: sizes.touch, height: sizes.touch, alignItems: "center", justifyContent: "center" }, sheetStatus: { color: colours.primary, fontFamily: fonts.extraBold, fontSize: 11, textTransform: "uppercase" }, sheetTitle: { paddingBottom: 4, color: colours.text, fontFamily: fonts.extraBold, fontSize: 31, lineHeight: 36 }, metaRow: { flexDirection: "row", alignItems: "center", gap: 6 }, meta: { flex: 1, color: colours.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 }, sheetActions: { flexDirection: "row", gap: 8 }, viewBranch: { minHeight: 50, flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 999, borderWidth: 1, borderColor: colours.border }, viewBranchText: { color: colours.text, fontFamily: fonts.extraBold, fontSize: 13 }, direction: { minHeight: 50, flex: 1, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 999, backgroundColor: colours.primary }, directionText: { color: colours.background, fontFamily: fonts.extraBold, fontSize: 13 }
});
