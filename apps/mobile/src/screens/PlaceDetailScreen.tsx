import {
  featureLabel,
  formatRelativeTime,
  getCurrentStatus,
  getPlaceActionLinks,
  getPlaceOutlook,
  getWeeklyHours,
  trustClaimLabel,
  type PlaceActionLink,
  type TrustClaim,
} from "@knogo/core";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  CircleX,
  Clock3,
  ExternalLink,
  Globe,
  Heart,
  MapPin,
  MoreHorizontal,
  Navigation,
  Phone,
  TriangleAlert,
  UtensilsCrossed,
} from "lucide-react-native";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AppState, Linking, StyleSheet, Text, View } from "react-native";
import { HapticPressable as Pressable } from "../components/HapticPressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActionButton, BackButton, Notice, Page } from "../components/Ui";
import { PlaceSheet } from "../components/PlaceSheet";
import { TripPlanner } from "../components/TripPlanner";
import { usePlaces } from "../state/PlacesContext";
import {
  fonts,
  radii,
  shadows,
  sizes,
  space,
  useTheme,
  useThemeStyles,
  type ThemeColours,
} from "../theme";
import { captureEvent } from "../telemetry";
import { getOutlookTone, type StatusTone } from "../statusPresentation";

export function PlaceDetailScreen() {
  const { placeId } = useLocalSearchParams<{ placeId: string }>();
  const router = useRouter();
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { places, loading, isSaved, toggleSaved, refreshPlace } = usePlaces();
  const [reportRefreshError, setReportRefreshError] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [practicalOpen, setPracticalOpen] = useState(false);
  const [sheet, setSheet] = useState<
    "status" | "hours" | "trip" | "details" | null
  >(null);
  const [now, setNow] = useState(() => new Date());
  const place = places.find((item) => item.id === placeId);
  const refreshReports = useCallback(async () => {
    try { await refreshPlace(placeId); setReportRefreshError(false); }
    catch { setReportRefreshError(true); }
  }, [placeId, refreshPlace]);
  useFocusEffect(useCallback(() => {
    void refreshReports();
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") void refreshReports();
    });
    return () => subscription.remove();
  }, [refreshReports]));
  useEffect(() => {
    if (place)
      captureEvent("place_opened", {
        category: place.category,
        grouped: Boolean(place.groupId),
      });
  }, [place?.id]);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(new Date());
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);
  if (!place)
    return (
      <Page>
        <BackButton label="Back to explore" />
        <Notice
          title={loading ? "Loading place" : "Place not found"}
          loading={loading}
          message={loading ? undefined : "This place is not in the current list."}
        />
      </Page>
    );

  const status = getCurrentStatus(place.currentStatus, now);
  const actions = getPlaceActionLinks(place);
  const outlook = getPlaceOutlook(place, now);
  const tradingTone = getOutlookTone(outlook.trading);
  const kitchenTone = getOutlookTone(outlook.kitchen);
  const practicalChecks: Array<[string, string, boolean | null]> = [
    [
      "Walk-ins",
      trustClaimLabel("walk_ins", status.trust?.claims.walk_ins),
      status.trust ? status.acceptsWalkIns : null,
    ],
    [
      "Card machine",
      trustClaimLabel("card_machine", status.trust?.claims.card_machine),
      status.trust ? status.cardMachineWorking : null,
    ],
    [
      "Power",
      trustClaimLabel("backup_power", status.trust?.claims.backup_power),
      status.trust ? status.hasBackupPower : null,
    ],
  ];
  if (status.trust && status.busyLevel !== "unknown")
    practicalChecks.push([
      "Busy level",
      trustClaimLabel("busy_level", status.trust.claims.busy_level),
      null,
    ]);
  return (
    <>
      <Page
        contentContainerStyle={[
          styles.placePage,
          { paddingBottom: 164 + insets.bottom },
        ]}
      >
        <View style={styles.topBar}>
          <BackButton label="Back" iconOnly />
          <View style={styles.identity}>
            <Text accessibilityRole="header" style={styles.title}>
              {place.name}
            </Text>
            <View style={styles.metaRow}>
              <MapPin color={colours.muted} size={16} />
              <Text style={styles.meta}>{place.area}</Text>
            </View>
          </View>
          <Pressable
            accessibilityLabel={
              isSaved(place.id) ? "Remove from saved" : "Save place"
            }
            accessibilityRole="button"
            accessibilityState={{ selected: isSaved(place.id) }}
            aria-pressed={isSaved(place.id)}
            onPress={() => void toggleSaved(place.id)}
            style={styles.save}
          >
            <Heart
              color={colours.text}
              fill={isSaved(place.id) ? colours.primary : "transparent"}
              size={22}
            />
          </Pressable>
        </View>
        <View style={styles.overview}>
          <Text
            accessibilityRole="header"
            style={[
              styles.outlookTitle,
              tradingTone !== "neutral" && { color: colours[tradingTone] },
            ]}
          >
            {outlook.trading.label}
          </Text>
          {outlook.kitchen.basis === "report" ||
          outlook.kitchen.basis === "conflict" ||
          outlook.trading.positive !== false ? (
            <View style={styles.kitchenLine}>
              <StatusIcon
                tone={kitchenTone}
                scheduled={outlook.kitchen.basis === "schedule"}
                colours={colours}
              />
              <Text
                style={[
                  styles.kitchenText,
                  kitchenTone !== "neutral" && { color: colours[kitchenTone] },
                ]}
              >
                {outlook.kitchen.label}
              </Text>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View recent reports"
            aria-expanded={sheet === "status"}
            onPress={() => { setSheet("status"); void refreshReports(); }}
            style={styles.basisButton}
          >
            <Text style={styles.confirmed}>
              View recent reports
            </Text>
            <ChevronRight color={colours.muted} size={16} />
          </Pressable>
        </View>
        <View style={styles.dashboard}>
          <ActionButton
            label="Leave a report"
            tone="green"
            icon={<CheckCircle2 color={colours.background} size={19} />}
            onPress={() =>
              router.push({
                pathname: "/confirm/[placeId]",
                params: { placeId: place.id },
              })
            }
          />
          <View style={styles.toolGrid}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View listed hours"
              onPress={() => setSheet("hours")}
              style={({ pressed }) => [
                styles.tool,
                pressed && styles.sharePressed,
              ]}
            >
              <Clock3 color={colours.primary} size={24} />
              <Text style={styles.toolTitle}>Listed hours</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Plan your trip"
              onPress={() => setSheet("trip")}
              style={({ pressed }) => [
                styles.tool,
                pressed && styles.sharePressed,
              ]}
            >
              <Navigation color={colours.primary} size={24} />
              <Text style={styles.toolTitle}>Plan your trip</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View place information"
            onPress={() => setSheet("details")}
            style={styles.practicalToggle}
          >
            <MapPin color={colours.muted} size={18} />
            <Text style={[styles.practicalTitle, styles.toolCopy]}>
              Place information
            </Text>
            <ChevronRight color={colours.muted} size={18} />
          </Pressable>
        </View>
      </Page>
      <Pressable
        accessibilityLabel="Contact and directions"
        accessibilityRole="button"
        aria-expanded={actionsOpen}
        onPress={() => setActionsOpen(true)}
        style={({ pressed }) => [
          styles.floatingContact,
          { bottom: 92 + insets.bottom },
          pressed && styles.sharePressed,
        ]}
      >
        <MoreHorizontal color={colours.text} size={24} />
        <Text style={styles.floatingLabel}>Contact</Text>
      </Pressable>
      <PlaceSheet
        visible={sheet === "status"}
        title="Status & checks"
        onClose={() => setSheet(null)}
      >
        <View style={styles.reportSummary}>
          {reportRefreshError ? <Notice title="Could not refresh reports" message="Showing the last loaded reports." actionLabel="Try again" onAction={() => void refreshReports()} /> : null}
          <Text style={styles.reportHeading}>Community reports</Text>
          <StatusRow
            label="Open"
            value={trustClaimLabel("open_status", status.trust?.claims.open_status)}
            state={outlook.trading.basis === "report" ? outlook.trading.positive : null}
            conflict={outlook.trading.basis === "conflict"}
          />
          <ClaimEvidence claim={status.trust?.claims.open_status} now={now} />
          <StatusRow
            label="Kitchen serving"
            value={trustClaimLabel("kitchen_status", status.trust?.claims.kitchen_status)}
            state={outlook.kitchen.basis === "report" ? outlook.kitchen.positive : null}
            conflict={outlook.kitchen.basis === "conflict"}
          />
          <ClaimEvidence
            claim={status.trust?.claims.kitchen_status}
            now={now}
          />
        </View>
        {outlook.trading.basis !== "report" && outlook.trading.basis !== "conflict" ? (
          <View style={styles.scheduleNote}>
            <Clock3 color={colours.muted} size={20} />
            <View style={styles.toolCopy}>
              <Text style={styles.practicalTitle}>{outlook.trading.label}</Text>
              <Text style={styles.confirmed}>{outlook.trading.detail}</Text>
            </View>
          </View>
        ) : null}
        <View style={styles.practicalSection}>
          <Pressable accessibilityRole="button" accessibilityLabel="Practical checks" accessibilityState={{ expanded: practicalOpen }} aria-expanded={practicalOpen} onPress={() => setPracticalOpen(value => !value)} style={styles.practicalToggle}>
            <Text style={[styles.practicalTitle, styles.toolCopy]}>Practical checks</Text>
            <ChevronRight color={colours.muted} size={18} style={{ transform: [{ rotate: practicalOpen ? "90deg" : "0deg" }] }} />
          </Pressable>
          {practicalOpen ? <View style={styles.practicalRows}>
            {practicalChecks.map(([label, value, state], index) => {
              const claim =
                status.trust?.claims[
                  (
                    [
                      "walk_ins",
                      "card_machine",
                      "backup_power",
                      "busy_level",
                    ] as const
                  )[index]
                ];
              return (
                <View key={label}>
                  <StatusRow
                    label={label}
                    value={value}
                    state={state}
                    conflict={claim?.state === "disagree"}
                  />
                  <ClaimEvidence claim={claim} now={now} />
                </View>
              );
            })}
          </View> : null}
        </View>
        <Text style={styles.practicalSummary}>Reports describe a check, not a guarantee.</Text>
        <ActionButton
          label="Leave a report"
          tone="green"
          onPress={() => {
            setSheet(null);
            router.push({ pathname: "/confirm/[placeId]", params: { placeId: place.id } });
          }}
        />
      </PlaceSheet>
      <PlaceSheet
        visible={sheet === "hours"}
        title="Listed hours"
        onClose={() => setSheet(null)}
      >
        <HoursComparison
          opening={place.openingHours}
          kitchen={place.kitchenHours}
        />
        <Text style={styles.confirmed}>
          Published schedules are not a check that the place is working now.
        </Text>
      </PlaceSheet>
      <PlaceSheet
        visible={sheet === "trip"}
        title="Plan your trip"
        onClose={() => setSheet(null)}
      >
        {sheet === "trip" ? <TripPlanner key={place.id} place={place} /> : null}
      </PlaceSheet>
      <PlaceSheet
        visible={sheet === "details"}
        title="Place information"
        onClose={() => setSheet(null)}
      >
        <Text style={styles.meta}>{place.address}</Text>
        {place.groupSlug && place.groupName ? (
          <Pressable
            accessibilityLabel={`View all ${place.groupName} branches`}
            accessibilityRole="link"
            onPress={() => {
              setSheet(null);
              router.push({
                pathname: "/restaurants/groups/[groupSlug]",
                params: { groupSlug: place.groupSlug! },
              });
            }}
          >
            <Text style={styles.groupLink}>
              Part of {place.groupName} / View all branches
            </Text>
          </Pressable>
        ) : null}
        {place.features.length ? (
          <Section title="Features">
            <View style={styles.features}>
              {place.features.map((feature) => (
                <Text key={feature} style={styles.feature}>
                  {featureLabel(feature)}
                </Text>
              ))}
            </View>
          </Section>
        ) : null}
        <Pressable
          accessibilityRole="link"
          onPress={() => {
            setSheet(null);
            router.push({
              pathname: "/venue/[placeId]",
              params: { placeId: place.id },
            });
          }}
          style={styles.dataIssue}
        >
          <Text style={styles.dataIssueText}>Represent this venue</Text>
        </Pressable>
        <Pressable
          accessibilityRole="link"
          onPress={() => {
            setSheet(null);
            router.push({
              pathname: "/support",
              params: { placeId: place.id },
            });
          }}
          style={styles.dataIssue}
        >
          <Text style={styles.dataIssueText}>
            Report wrong place information
          </Text>
        </Pressable>
      </PlaceSheet>
      <ActionSheet
        visible={actionsOpen}
        onClose={() => setActionsOpen(false)}
        actions={actions}
        contactMissing={!actions.some((action) => action.type === "call" || action.type === "website")}
      />
    </>
  );
}

function actionIcon(type: PlaceActionLink["type"], colours: ThemeColours) {
  if (type === "directions")
    return <Navigation color={colours.text} size={20} />;
  if (type === "call") return <Phone color={colours.text} size={20} />;
  if (type === "website") return <Globe color={colours.text} size={20} />;
  return <UtensilsCrossed color={colours.text} size={20} />;
}

function ActionSheet({
  visible,
  onClose,
  actions,
  contactMissing,
}: {
  visible: boolean;
  onClose: () => void;
  actions: PlaceActionLink[];
  contactMissing: boolean;
}) {
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const [error, setError] = useState<string | null>(null);
  return (
    <PlaceSheet
      visible={visible}
      title="Contact & directions"
      onClose={onClose}
    >
      {actions.map((action) => (
        <Pressable
          accessibilityRole="button"
          key={action.label}
          onPress={() => {
            setError(null);
            void Linking.openURL(action.url)
              .then(onClose)
              .catch(() =>
                setError(
                  "Could not open this link. Try again or use another option.",
                ),
              );
          }}
          style={styles.actionRow}
        >
          {actionIcon(action.type, colours)}
          <Text style={styles.actionText}>{action.label}</Text>
          <ExternalLink color={colours.muted} size={17} />
        </Pressable>
      ))}
      {error ? (
        <Text accessibilityRole="alert" style={styles.linkError}>
          {error}
        </Text>
      ) : null}
      {contactMissing ? (
        <Text style={styles.contactMissing}>Contact details not listed</Text>
      ) : null}
    </PlaceSheet>
  );
}

function StatusIcon({
  tone,
  scheduled = false,
  colours,
}: {
  tone: StatusTone;
  scheduled?: boolean;
  colours: ThemeColours;
}) {
  const Icon =
    tone === "success"
      ? CheckCircle2
      : tone === "closed"
        ? CircleX
        : tone === "warning"
          ? TriangleAlert
          : scheduled
            ? Clock3
            : CircleHelp;
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Icon
        color={tone === "neutral" ? colours.muted : colours[tone]}
        size={18}
      />
    </View>
  );
}

function StatusRow({
  label,
  value,
  state,
  conflict = false,
}: {
  label: string;
  value: string;
  state: boolean | null;
  conflict?: boolean;
}) {
  const styles = useThemeStyles(createStyles);
  const { colours } = useTheme();
  const tone: StatusTone = conflict
    ? "warning"
    : state === true
      ? "success"
      : state === false
        ? "closed"
        : "neutral";
  const displayValue = value === "Status unknown" ? "No recent check" : value;
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${displayValue}`}
      style={styles.checkRow}
    >
      <Text style={styles.checkLabel}>{label}</Text>
      <StatusIcon tone={tone} colours={colours} />
      <Text
        style={[
          styles.checkValue,
          { color: tone === "neutral" ? colours.muted : colours[tone] },
        ]}
      >
        {displayValue}
      </Text>
    </View>
  );
}

function ClaimEvidence({ claim, now }: { claim?: TrustClaim; now: Date }) {
  const styles = useThemeStyles(createStyles);
  const evidence =
    claim?.evidence.filter(
      (item) =>
        Date.parse(item.expiresAt) > now.getTime() &&
        Date.parse(item.reportedAt) <= now.getTime(),
    ) ?? [];
  return (
    <View>
      {evidence.map((item) => (
        <Text key={item.id} style={styles.confirmed}>
          {item.source === "venue"
            ? "Verified venue representative"
            : `Community / ${item.checkedBy?.replaceAll("_", " ") ?? "check method not listed"}`}
          :
          {` reports ${item.value.replaceAll("_", " ")} / ${formatRelativeTime(item.reportedAt, now)} / expires ${new Date(item.expiresAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg" })}`}
        </Text>
      ))}
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const styles = useThemeStyles(createStyles);
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function formatHours(hours?: {
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}) {
  if (!hours || (!hours.isClosed && (!hours.openTime || !hours.closeTime)))
    return "Not published";
  return hours.isClosed ? "Closed" : `${hours.openTime}-${hours.closeTime}`;
}

function HoursComparison({
  opening,
  kitchen,
}: {
  opening: Array<{
    day: string;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }>;
  kitchen?: Array<{
    day: string;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }>;
}) {
  const styles = useThemeStyles(createStyles);
  const today = new Date()
    .toLocaleDateString("en-ZA", {
      weekday: "short",
      timeZone: "Africa/Johannesburg",
    })
    .slice(0, 3)
    .toLowerCase();
  const hasKitchen = Boolean(kitchen?.length);
  const hasOpening = opening.length > 0;
  return (
    <View style={styles.hoursSection}>
      {hasOpening || hasKitchen ? (
        <>
          <View style={styles.hoursColumns}>
            <Text style={[styles.dayHead, !hasKitchen && styles.dayHeadWide]}>
              Day
            </Text>
            <Text
              style={[
                styles.hoursColumnHead,
                !hasKitchen && styles.hoursColumnWide,
              ]}
            >
              Trading
            </Text>
            {hasKitchen ? (
              <Text style={styles.hoursColumnHead}>Kitchen</Text>
            ) : null}
          </View>
          {getWeeklyHours(opening, kitchen).map((row) => {
            const current = row.day.toLowerCase() === today;
            const trading = formatHours(row.opening);
            const serving = formatHours(row.kitchen);
            return (
              <View
                accessible
                accessibilityLabel={`${row.day}${current ? ", today" : ""}. Trading: ${trading}.${hasKitchen ? ` Kitchen: ${serving}.` : ""}`}
                key={row.day}
                style={[styles.hoursRow, current && styles.hoursRowToday]}
              >
                <Text
                  style={[
                    styles.dayCell,
                    !hasKitchen && styles.dayCellWide,
                    current && styles.todayText,
                  ]}
                >
                  {current ? "Today" : row.day}
                </Text>
                <Text
                  style={[
                    styles.hoursCell,
                    !hasKitchen && styles.hoursCellWide,
                    trading === "Not published" && styles.neutral,
                  ]}
                >
                  {trading}
                </Text>
                {hasKitchen ? (
                  <Text
                    style={[
                      styles.hoursCell,
                      serving === "Not published" && styles.neutral,
                    ]}
                  >
                    {serving}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </>
      ) : null}
      {!hasOpening ? (
        <Text style={styles.hoursNote}>Trading hours not published.</Text>
      ) : null}
      {!hasKitchen ? (
        <Text style={styles.hoursNote}>Kitchen hours not published.</Text>
      ) : null}
    </View>
  );
}

const createStyles = (colours: ThemeColours) =>
  StyleSheet.create({
    // Hallmark critique: P5 H4 E4 S5 R5 V4. Existing tokens and hours; no map or cost invented.
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colours.border,
    },
    identity: { flex: 1, minWidth: 0, gap: 2 },
    save: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    placePage: { gap: 0 },
    dashboard: { paddingTop: space.sm, gap: space.md },
    toolGrid: { flexDirection: "row", gap: space.sm },
    tool: {
      flex: 1,
      minWidth: 0,
      minHeight: 88,
      justifyContent: "center",
      gap: space.sm,
      padding: space.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colours.border,
      borderRadius: radii.surface,
      backgroundColor: colours.surface,
    },
    toolTitle: {
      color: colours.text,
      fontFamily: fonts.extraBold,
      fontSize: 16,
      lineHeight: 23,
    },
    toolHint: {
      color: colours.muted,
      fontFamily: fonts.regular,
      fontSize: 12,
      lineHeight: 18,
    },
    toolCopy: { flex: 1 },
    floatingContact: {
      position: "absolute",
      right: space.md,
      minHeight: sizes.control,
      paddingHorizontal: space.md,
      flexDirection: "row",
      alignItems: "center",
      gap: space.sm,
      borderRadius: radii.round,
      backgroundColor: colours.elevated,
      ...shadows.floating,
    },
    floatingLabel: {
      color: colours.text,
      fontFamily: fonts.extraBold,
      fontSize: 14,
      lineHeight: 20,
    },
    linkError: {
      color: colours.closed,
      fontFamily: fonts.medium,
      fontSize: 14,
      lineHeight: 21,
    },
    signalLabel: { flexDirection: "row", alignItems: "center", gap: space.xs },
    sharePressed: { opacity: 0.92 },
    overview: {
      gap: space.sm,
      marginHorizontal: -space.md,
      paddingHorizontal: space.md,
      paddingTop: space.md,
      paddingBottom: space.xs,
      backgroundColor: colours.statusSurface,
    },
    summaryLabel: {
      color: colours.muted,
      fontFamily: fonts.medium,
      fontSize: 12,
      lineHeight: 17,
    },
    outlookTitle: {
      color: colours.text,
      fontFamily: fonts.extraBold,
      fontSize: 28,
      lineHeight: 36,
      paddingBottom: 4,
    },
    kitchenLine: { flexDirection: "row", alignItems: "center", gap: 8 },
    kitchenText: {
      flex: 1,
      fontFamily: fonts.medium,
      fontSize: 16,
      lineHeight: 24,
      color: colours.text,
    },
    statusCommands: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      flexWrap: "wrap",
    },
    basisButton: {
      minHeight: 52,
      paddingHorizontal: space.md,
      marginTop: space.xs,
      borderRadius: radii.surface,
      backgroundColor: colours.surface,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 6,
    },
    evidenceDetails: { gap: 8 },
    reportSummary: { gap: space.xs },
    reportHeading: {
      color: colours.text,
      fontFamily: fonts.semibold,
      fontSize: 18,
      lineHeight: 25,
    },
    scheduleNote: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.sm,
      padding: space.md,
      borderRadius: radii.surface,
      backgroundColor: colours.elevated,
    },
    shareCheck: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minHeight: 44,
    },
    hoursToggle: {
      minHeight: 64,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colours.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colours.border,
    },
    viewTabs: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 8,
    },
    viewTab: {
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: 12,
      borderRadius: 6,
    },
    viewTabSelected: { backgroundColor: colours.primarySoft },
    viewTabText: {
      fontFamily: fonts.medium,
      color: colours.muted,
      fontSize: 14,
      lineHeight: 21,
    },
    viewTabTextSelected: { color: colours.text },
    expandedDetails: { gap: 12 },
    heroImage: {
      height: 190,
      marginHorizontal: -16,
      marginTop: -16,
      borderTopRightRadius: 8,
      borderTopLeftRadius: 8,
    },
    heroTop: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    status: {
      color: colours.success,
      fontFamily: fonts.extraBold,
      fontSize: 11,
      textTransform: "uppercase",
      borderLeftWidth: 3,
      borderLeftColor: colours.success,
      paddingLeft: 7,
    },
    statusUnknown: { color: colours.muted, borderLeftColor: colours.muted },
    confidence: {
      color: colours.success,
      fontFamily: fonts.semibold,
      fontSize: 11,
      borderBottomWidth: 1,
      borderBottomColor: colours.success,
      paddingBottom: 3,
    },
    confirmed: {
      color: colours.muted,
      fontFamily: fonts.medium,
      fontSize: 14,
      lineHeight: 21,
    },
    title: {
      paddingBottom: 4,
      color: colours.text,
      fontFamily: fonts.extraBold,
      fontSize: 24,
      lineHeight: 30,
    },
    groupLink: {
      minHeight: 44,
      paddingVertical: 10,
      color: colours.primary,
      fontFamily: fonts.extraBold,
      fontSize: 12,
    },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    meta: {
      flex: 1,
      color: colours.muted,
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 18,
    },
    mainChecks: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colours.border,
    },
    statusClosed: { color: colours.closed, borderLeftColor: colours.closed },
    checkRow: {
      minHeight: 48,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colours.border,
    },
    checkLabel: {
      flex: 1,
      color: colours.text,
      fontFamily: fonts.semibold,
      fontSize: 14,
      lineHeight: 20,
    },
    checkValue: {
      flex: 1,
      textAlign: "right",
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 20,
    },
    practicalSection: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colours.border,
    },
    practicalToggle: {
      minHeight: 56,
      paddingVertical: 9,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    practicalCopy: { flex: 1, gap: 3 },
    practicalTitle: {
      color: colours.text,
      fontFamily: fonts.semibold,
      fontSize: 14,
      lineHeight: 20,
    },
    practicalSummary: {
      color: colours.muted,
      fontFamily: fonts.regular,
      fontSize: 12,
      lineHeight: 18,
    },
    practicalRows: { paddingBottom: 8 },
    good: { color: colours.success },
    bad: { color: colours.closed },
    neutral: { color: colours.muted },
    hoursNote: {
      paddingTop: 10,
      color: colours.muted,
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 21,
    },
    contactMissing: {
      paddingVertical: 12,
      color: colours.muted,
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 21,
    },
    reportButton: {
      minHeight: 64,
      paddingHorizontal: 14,
      paddingVertical: 11,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      borderRadius: 8,
      backgroundColor: colours.primary,
    },
    reportButtonPressed: { opacity: 0.76 },
    reportCopy: { flex: 1, gap: 2 },
    reportTitle: {
      color: colours.background,
      fontFamily: fonts.extraBold,
      fontSize: 14,
    },
    reportText: {
      color: colours.background,
      fontFamily: fonts.regular,
      fontSize: 11,
      lineHeight: 15,
      opacity: 0.86,
    },
    dataIssue: {
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    dataIssueText: {
      color: colours.muted,
      fontFamily: fonts.semibold,
      fontSize: 12,
      textDecorationLine: "underline",
    },
    sectionTitle: {
      paddingBottom: 10,
      color: colours.text,
      fontFamily: fonts.extraBold,
      fontSize: 24,
      lineHeight: 30,
    },
    hoursSection: { gap: 0 },
    hoursColumns: {
      minHeight: 34,
      paddingHorizontal: 10,
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: colours.border,
    },
    dayHead: {
      width: "22%",
      color: colours.muted,
      fontFamily: fonts.extraBold,
      fontSize: 12,
      textTransform: "uppercase",
    },
    dayHeadWide: { width: "50%" },
    hoursColumnHead: {
      width: "39%",
      color: colours.muted,
      fontFamily: fonts.extraBold,
      fontSize: 12,
      textTransform: "uppercase",
    },
    hoursColumnWide: { width: "50%" },
    hoursRow: {
      minHeight: 46,
      paddingHorizontal: 10,
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colours.border,
    },
    hoursRowToday: {
      marginVertical: 3,
      borderBottomWidth: 0,
      borderRadius: 8,
      backgroundColor: colours.primarySoft,
    },
    dayCell: {
      width: "22%",
      color: colours.muted,
      fontFamily: fonts.semibold,
      fontSize: 14,
    },
    dayCellWide: { width: "50%" },
    todayText: { color: colours.primary, fontFamily: fonts.extraBold },
    hoursCell: {
      width: "39%",
      color: colours.text,
      fontFamily: fonts.medium,
      fontSize: 14,
    },
    hoursCellWide: { width: "50%" },
    features: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
    feature: {
      minHeight: 29,
      paddingHorizontal: 10,
      paddingTop: 6,
      color: colours.muted,
      fontFamily: fonts.regular,
      fontSize: 11,
      backgroundColor: colours.featureTint,
      borderRadius: 999,
    },
    fab: {
      position: "absolute",
      right: 18,
      width: 56,
      height: 56,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 28,
      backgroundColor: colours.primary,
      ...shadows.floating,
    },
    sheetOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: colours.overlay,
    },
    sheet: {
      padding: 18,
      gap: 4,
      borderTopRightRadius: 12,
      borderTopLeftRadius: 12,
      backgroundColor: colours.sheetSurface,
      ...shadows.floating,
    },
    sheetHead: { minHeight: 44, alignItems: "center" },
    sheetHandle: {
      width: 42,
      height: 4,
      borderRadius: 2,
      backgroundColor: colours.border,
    },
    close: {
      position: "absolute",
      top: 0,
      right: 0,
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    sheetTitle: {
      paddingBottom: 8,
      color: colours.text,
      fontFamily: fonts.extraBold,
      fontSize: 27,
    },
    actionRow: {
      minHeight: 54,
      paddingHorizontal: 4,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colours.border,
    },
    actionText: {
      flex: 1,
      color: colours.text,
      fontFamily: fonts.extraBold,
      fontSize: 15,
    },
  });
