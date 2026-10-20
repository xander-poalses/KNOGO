import { defaultFilters, otherFilterValue, type Place, type PlaceCategory, type PlaceFilters } from "@knogo/core";
import { directoryFilterOptions, filterCapabilities } from "../filterContext";
import { ChevronDown, ChevronUp, X } from "lucide-react-native";
import { useEffect, useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { StagedModal } from "./StagedModal";
import { HapticPressable as Pressable } from "./HapticPressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts, radii, shadows, sizes, space, useTheme, useThemeStyles, type ThemeColours } from "../theme";
import { ActionButton, Chip, SearchField } from "./Ui";
import { DistanceSlider } from "./DistanceSlider";
const labels=(values:string[])=>values.map(value=>value===otherFilterValue?'Other':value).join(', ');

function Section({ title, summary, children, list = false, defaultOpen = false }: { title: string; summary: string; children: ReactNode; list?: boolean; defaultOpen?: boolean }) {
  const styles = useThemeStyles(createStyles);
  const { colours } = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={styles.section}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${title}: ${summary}`} accessibilityState={{ expanded: open }} aria-expanded={open} onPress={() => setOpen(current => !current)} style={styles.sectionHead}>
        <View style={styles.sectionCopy}><Text style={styles.sectionTitle}>{title}</Text><Text numberOfLines={1} style={styles.summary}>{summary}</Text></View>
        {open ? <ChevronUp color={colours.muted} size={18}/> : <ChevronDown color={colours.muted} size={18}/>}
      </Pressable>
      {open ? <View style={list ? styles.listContent : styles.chips}>{children}</View> : null}
    </View>
  );
}

export function FilterSheet({
  visible,
  filters,
  areas,
  cuisines,
  onChange,
  onClose,
  areasOnly = false,
  cuisinesOnly = false,
  categories = [],
  places = [],
  nearby = false
}: {
  visible: boolean;
  filters: PlaceFilters;
  areas: string[];
  cuisines: string[];
  onChange: (filters: PlaceFilters) => void;
  onClose: () => void;
  areasOnly?: boolean;
  cuisinesOnly?: boolean;
  categories?: PlaceCategory[];
  places?: Place[];
  nearby?: boolean;
}) {
  const [areaQuery, setAreaQuery] = useState("");
  const [typeQuery, setTypeQuery] = useState("");
  const [cuisineQuery, setCuisineQuery] = useState("");
  const [tagQuery, setTagQuery] = useState("");
  useEffect(() => { if (visible) { setAreaQuery(""); setTypeQuery(""); setCuisineQuery(""); setTagQuery(""); } }, [visible]);
  const insets = useSafeAreaInsets();
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const supported = filterCapabilities(categories);
  const allOptions = directoryFilterOptions(places, categories);
  const options = {...allOptions,types:allOptions.types.filter(type=>type.id.toLowerCase()!=='other'),tags:allOptions.tags.filter(tag=>tag.toLowerCase()!=='other')};
  const toggleMany = (key: "areas" | "cuisines" | "placeTypes" | "tags", value: string) => {
    const current = filters[key] ?? [];
    onChange({ ...filters, [key]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value] });
  };

  return (
    <StagedModal accessibilityLabel={areasOnly ? "Choose areas" : cuisinesOnly ? "Choose cuisines" : "Filters"} visible={visible} onRequestClose={onClose}>
      <View style={[styles.overlay, { paddingTop: 16 + insets.top }]}>
      <View accessibilityViewIsModal style={styles.modal}>
        <View style={styles.head}>
          <Text accessibilityRole="header" style={styles.title}>{areasOnly ? "Choose areas" : cuisinesOnly ? "Choose cuisines" : "Filters"}</Text>
          <Pressable accessibilityLabel={areasOnly ? "Close areas" : cuisinesOnly ? "Close cuisines" : "Close filters"} accessibilityRole="button" style={styles.close} onPress={onClose}>
            <X color={colours.ink} size={24} />
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: 48 + insets.bottom }]}>
          {nearby && !areasOnly && !cuisinesOnly ? <Section title="Distance" summary={filters.maxDistanceKm === 'other' ? 'Beyond 50 km' : `Within ${filters.maxDistanceKm ?? 25} km`} list defaultOpen><DistanceSlider value={typeof filters.maxDistanceKm==='number'?filters.maxDistanceKm:25} onCommit={maxDistanceKm=>onChange({...filters,maxDistanceKm})}/><Chip label="Other" selected={filters.maxDistanceKm==='other'} onPress={()=>onChange({...filters,maxDistanceKm:filters.maxDistanceKm==='other'?25:'other'})}/></Section> : null}
          {!areasOnly && !cuisinesOnly && places.length ? <Section title="Place type" summary={filters.placeTypes?.length ? labels(filters.placeTypes.map(id=>options.types.find(type=>type.id===id)?.label??id)) : "All types"} list>
            {options.types.length > 10 ? <SearchField value={typeQuery} onChangeText={setTypeQuery} placeholder="Search place types" accessibilityLabel="Search place types"/> : null}
            <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={styles.areaList}>
              {options.types.filter(type => type.label.toLowerCase().includes(typeQuery.trim().toLowerCase())).map(type => <View key={type.id} style={styles.areaRow}><Chip label={type.label} selected={filters.placeTypes?.includes(type.id)} onPress={() => toggleMany("placeTypes", type.id)}/></View>)}
              {!options.types.some(type => type.label.toLowerCase().includes(typeQuery.trim().toLowerCase())) ? <Text style={styles.empty}>No matches</Text> : null}
              <Chip label="Other" selected={filters.placeTypes?.includes(otherFilterValue)} onPress={()=>toggleMany('placeTypes',otherFilterValue)}/>
            </ScrollView>
          </Section> : null}
          {!areasOnly && !cuisinesOnly && options.tagLabel ? <Section title={options.tagLabel} summary={filters.tags?.length ? labels(filters.tags) : "Any"} list>
            {options.tags.length > 10 ? <SearchField value={tagQuery} onChangeText={setTagQuery} placeholder={`Search ${options.tagLabel.toLowerCase()}`} accessibilityLabel={`Search ${options.tagLabel.toLowerCase()}`}/> : null}
            <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={styles.areaList}>
              {options.tags.filter(tag => tag.toLowerCase().includes(tagQuery.trim().toLowerCase())).map(tag => <View key={tag} style={styles.areaRow}><Chip label={tag} selected={filters.tags?.includes(tag)} onPress={() => toggleMany("tags", tag)}/></View>)}
              {!options.tags.some(tag => tag.toLowerCase().includes(tagQuery.trim().toLowerCase())) ? <Text style={styles.empty}>No matches</Text> : null}
              <Chip label="Other" selected={filters.tags?.includes(otherFilterValue)} onPress={()=>toggleMany('tags',otherFilterValue)}/>
            </ScrollView>
          </Section> : null}
          {!areasOnly && !cuisinesOnly && supported.dining ? <>
          <Section title="Listed hours after" summary={filters.openAfter === "none" ? "Any time" : filters.openAfter === 'other' ? 'Other' : filters.openAfter}>
            {(["none", "20:00", "21:00"] as const).map((value) => (
              <Chip role="radio" key={value} label={value === "none" ? "Any time" : value} selected={filters.openAfter === value} onPress={() => onChange({ ...filters, openAfter: value })} />
            ))}
            <Chip role="radio" label="Other" selected={filters.openAfter==='other'} onPress={()=>onChange({...filters,openAfter:'other'})}/>
          </Section>
          <Section title="Busy level" summary={filters.busyLevel === "any" ? "Any" : filters.busyLevel}>
            {(["any", "quiet", "normal", "busy", "packed", "other"] as const).map((value) => (
              <Chip role="radio" key={value} label={value === "any" ? "Any" : value === 'other' ? 'Other' : value} selected={filters.busyLevel === value} onPress={() => onChange({ ...filters, busyLevel: value })} />
            ))}
          </Section>
          </> : null}
          {!cuisinesOnly ? <Section title="Areas" summary={filters.areas.length ? labels(filters.areas) : "All areas"} list defaultOpen={areasOnly}>
            <SearchField value={areaQuery} onChangeText={setAreaQuery} placeholder="Search areas" accessibilityLabel="Search areas" />
            <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={styles.areaList}>
              {areas.filter(area => area.toLowerCase()!=='other' && area.toLocaleLowerCase().includes(areaQuery.trim().toLocaleLowerCase())).map(area => <View key={area} style={styles.areaRow}><Chip label={area} selected={filters.areas.includes(area)} onPress={() => toggleMany("areas", area)}/></View>)}
              <Chip label="Other" selected={filters.areas.includes(otherFilterValue)} onPress={()=>toggleMany('areas',otherFilterValue)}/>
              {!areas.some(area => area.toLocaleLowerCase().includes(areaQuery.trim().toLocaleLowerCase())) ? <Text style={styles.empty}>No areas match your search.</Text> : null}
            </ScrollView>
          </Section> : null}
          {!areasOnly && supported.cuisines ? <Section title="Cuisines" summary={filters.cuisines.length ? labels(filters.cuisines) : "All cuisines"} list defaultOpen={cuisinesOnly}>
            <SearchField value={cuisineQuery} onChangeText={setCuisineQuery} placeholder="Search cuisines" accessibilityLabel="Search cuisines" />
            <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={styles.areaList}>
              {cuisines.filter(cuisine => cuisine.toLowerCase()!=='other' && cuisine.toLocaleLowerCase().includes(cuisineQuery.trim().toLocaleLowerCase())).map(cuisine => <View key={cuisine} style={styles.areaRow}><Chip label={cuisine} selected={filters.cuisines.includes(cuisine)} onPress={() => toggleMany("cuisines", cuisine)}/></View>)}
              <Chip label="Other" selected={filters.cuisines.includes(otherFilterValue)} onPress={()=>toggleMany('cuisines',otherFilterValue)}/>
              {!cuisines.some(cuisine => cuisine.toLocaleLowerCase().includes(cuisineQuery.trim().toLocaleLowerCase())) ? <Text style={styles.empty}>No cuisines match your search.</Text> : null}
            </ScrollView>
          </Section> : null}
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: space.md + insets.bottom }]}>
          <ActionButton label={areasOnly ? "Clear areas" : cuisinesOnly ? "Clear cuisines" : "Clear filters"} tone="light" onPress={() => onChange(areasOnly ? { ...filters, areas: [] } : cuisinesOnly ? { ...filters, cuisines: [] } : { ...defaultFilters, query: filters.query, ...(nearby ? {maxDistanceKm:25}: {}) })} />
          <ActionButton label="Show results" tone="green" onPress={onClose} />
        </View>
      </View>
      </View>
    </StagedModal>
  );
}

const createStyles = (colours: ThemeColours) => StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  modal: { width: "100%", maxWidth: 720, alignSelf: "center", maxHeight: "92%", backgroundColor: colours.surface, borderTopRightRadius: radii.sheet, borderTopLeftRadius: radii.sheet, overflow: "hidden", ...shadows.floating },
  head: { minHeight: 66, paddingHorizontal: space.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colours.border },
  title: { color: colours.text, fontFamily: fonts.extraBold, fontSize: 24, lineHeight: 32, paddingBottom: 2 },
  close: { width: sizes.touch, height: sizes.touch, alignItems: "center", justifyContent: "center" },
  content: { padding: space.md, gap: 0 },
  section: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colours.border },
  sectionHead: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: 12 },
  sectionCopy: { flex: 1, gap: 4 },
  summary: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colours.muted },
  listContent: { gap: space.sm, paddingBottom: space.md },
  sectionTitle: { color: colours.text, fontFamily: fonts.extraBold, fontSize: 15 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: space.md }
  , areaList: { maxHeight: 280 },
  areaRow: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colours.border, paddingVertical: 2 },
  empty: { padding: space.md, color: colours.muted, fontFamily: fonts.regular, fontSize: 14 },
  footer: { padding: 14, gap: space.sm, borderTopWidth: 1, borderTopColor: colours.border }
});
