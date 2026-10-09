import type { ConfirmationAnswer, ConfirmationType, ReportOutcome, ReportSource } from "@knogo/core";
import { reportValidationError } from "@knogo/core";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, ChevronRight } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { AccountForm } from "../components/AccountForm";
import { HapticPressable as Pressable } from "../components/HapticPressable";
import { ActionButton, Chip, BackButton, Notice, Page } from "../components/Ui";
import { usePlaces } from "../state/PlacesContext";
import { fonts, shadows, sizes, space, useTheme, useThemeStyles, type ThemeColours } from "../theme";
import { captureError, captureEvent } from "../telemetry";
import { mobileStorage } from "../storage";
import { FeedbackToast } from "../components/FeedbackToast";

type CheckStep = {
  type: ConfirmationType;
  question: string;
  helper: string;
  options: Array<{ label: string; value: string }>;
};

const steps: CheckStep[] = [
  { type: "open_status", question: "Is the place open?", helper: "Tell us what is happening now.", options: [{ label: "Yes, open", value: "open" }, { label: "No, closed", value: "closed" }] },
  { type: "kitchen_status", question: "Is the kitchen serving?", helper: "Tell us what is happening right now.", options: [{ label: "Yes, serving", value: "yes" }, { label: "No, not serving", value: "no" }] },
  { type: "busy_level", question: "How busy is it?", helper: "A quick read of the room is enough.", options: ["quiet", "normal", "busy", "packed"].map((value) => ({ label: value, value })) },
  { type: "walk_ins", question: "Are walk-ins welcome?", helper: "Optional", options: [{ label: "Yes, likely", value: "yes" }, { label: "No", value: "no" }] },
  { type: "card_machine", question: "Is the card machine working?", helper: "Optional", options: [{ label: "Yes, working", value: "yes" }, { label: "No", value: "no" }, { label: "Cash only", value: "cash_only" }] },
  { type: "backup_power", question: "What is the power status?", helper: "Optional", options: [{ label: "Normal", value: "normal" }, { label: "Limited", value: "limited" }, { label: "Closed", value: "closed" }] }
];

export function ConfirmScreen() {
  const { placeId, outcome, source } = useLocalSearchParams<{ placeId: string; outcome?: ReportOutcome; source?: ReportSource }>();
  return <VenueReportForm key={JSON.stringify([placeId, outcome, source])} />;
}

function VenueReportForm() {
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const { placeId, outcome: callbackOutcome, source: callbackSource } = useLocalSearchParams<{ placeId: string; outcome?: ReportOutcome; source?: ReportSource }>();
  const router = useRouter();
  const { places, loading: placesLoading, addConfirmations, authLoading, hasSupabaseConfig, session } = usePlaces();
  const place = places.find((item) => item.id === placeId);
  const [awaitingEmail, setAwaitingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState<ConfirmationAnswer[]>([]);
  const [reportSource, setReportSource] = useState<ReportSource | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const draftEdited = useRef(false);
  const [done, setDone] = useState(Boolean(callbackOutcome));
  const [outcome, setOutcome] = useState<ReportOutcome>(callbackOutcome ?? "pending");
  useEffect(() => {
    let active = true;
    void mobileStorage.readPendingReport().then(draft => {
      if (!active || done || draftEdited.current || !draft || draft.placeId !== placeId) return;
      const age = Date.now() - Date.parse(draft.createdAt);
      if (!Number.isFinite(age) || age < 0 || age >= 4 * 60 * 60 * 1000) return;
      setAnswers(draft.answers); setReportSource(draft.reportSource); setSourceUrl(draft.sourceUrl ?? "");
      setStep(6);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [placeId]);

  if (!place) return <Page><BackButton label="Back to explore" /><Notice title={placesLoading ? "Loading place" : "Place not found"} loading={placesLoading} /></Page>;
  if (authLoading) return <Page><BackButton label="Back to place" /><Notice title="Checking your account" loading /></Page>;

  const run = async (action: () => Promise<void>, fallback: string) => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      captureEvent("report_failed", { stage: session ? "report" : "auth" });
      captureError(cause, session ? "report" : "auth");
      setError(cause instanceof Error ? cause.message : fallback);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  if (hasSupabaseConfig && !session && awaitingEmail) {
    return (
        <Page contentContainerStyle={styles.centerPage}>
          <BackButton label="Back to place" />
          <View style={styles.card}>
            <Text style={styles.kicker}>Sign in to submit</Text>
            <Text style={styles.helper}>Your answers are saved on this device. Sign in, then review your report.</Text>
            <AccountForm reportPlaceId={place.id} onAuthenticated={() => setAwaitingEmail(false)}/>
            <ActionButton label="Back to my answers" tone="light" disabled={busy} onPress={() => setAwaitingEmail(false)} />
          </View>
        </Page>
    );
  }

  const submit = () => run(async () => {
    const validationError = reportValidationError({ answers, reportSource, sourceUrl });
    if (validationError) throw new Error(validationError);
    if (!reportSource) throw new Error("Choose how you checked this place.");
    await mobileStorage.writePendingReport({ placeId: place.id, answers, reportSource, sourceUrl: sourceUrl.trim() || undefined, createdAt: new Date().toISOString() });
    if (hasSupabaseConfig && !session) {
      setAwaitingEmail(true);
      return;
    }
    const result = await addConfirmations(place.id, answers, reportSource, sourceUrl);
    await mobileStorage.clearPendingReport().catch(() => undefined);
    setOutcome(result.outcome);
    setDone(true);
  }, "Could not save this check.");

  if (done) {
    const title = outcome === "conflict" ? "Reports disagree." : "Report received.";
    const message = outcome === "accepted"
      ? `Your observation about ${place.name} is recorded. It is not proof of availability.`
      : outcome === "conflict"
        ? "The checks include opposing reports. KNOGO keeps both sources visible rather than choosing a side."
        : "Thanks for being a lookout. Your check helps the community. It may need checks from others before the status changes.";
    const resultSource = reportSource ?? callbackSource;
    return <Page contentContainerStyle={styles.centerPage}><BackButton label="Back to place" /><View style={styles.done}><Check color={colours.primary} size={46} /><Text style={styles.title}>{title}</Text><Text style={styles.helper}>{message}</Text>{resultSource ? <Text style={styles.unverified}>Checked by {resultSource === "in_person" ? "a person at the venue" : resultSource === "phone" ? "phone" : "an online source"}.</Text> : null}<ActionButton label="Back to place" tone="green" onPress={() => router.replace({ pathname: "/restaurants/[placeId]", params: { placeId: place.id } })} /></View></Page>;
  }

  const current = steps[step];
  const choose = (value: string) => {
    draftEdited.current = true;
    setAnswers((currentAnswers) => [...currentAnswers.filter((answer) => answer.type !== current.type), { type: current.type, value }]);
  };
  const requiredComplete = answers.length > 0;
  const optionalAnswered = current && answers.some((answer) => answer.type === current.type);
  const total = showOptional ? 8 : 5;
  const progressStep = step === 6 ? total : step + 2;
  const sourceReady = reportSource !== null && (reportSource !== "online" || /^https?:\/\/[^\s/]+\.[^\s/]+/i.test(sourceUrl.trim()));

  return (
    <Page contentContainerStyle={styles.surveyPage}>
      <View style={styles.survey}>
        <View style={styles.surveyHeading}><BackButton label="Back to place" iconOnly/><Text style={styles.kicker}>{place.name}</Text></View>
        <View accessibilityRole="progressbar" accessibilityLabel="Report progress" accessibilityValue={{ min: 1, max: total, now: progressStep, text: `Step ${progressStep} of ${total}` }} style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressStep / total * 100}%` }]} />
        </View>
        <Text accessibilityLiveRegion="polite" style={styles.helper}>Step {progressStep} of {total}</Text>
        {step === -1 ? <>
        <Text accessibilityRole="header" style={styles.questionTitle}>How did you check?</Text>
        <Text style={styles.helper}>Be a meerkat lookout. Share what you checked; skip the rest.</Text>
        {hasSupabaseConfig && !session ? <Text style={styles.helper}>You can answer first. Sign-in is needed to submit.</Text> : null}
        <View accessibilityRole="radiogroup" accessibilityLabel="Check method" style={styles.sourceOptions}>{([['in_person', 'At the venue'], ['phone', 'By phone'], ['online', 'Online']] as Array<[ReportSource, string]>).map(([value, label]) => <Chip key={value} role="radio" label={label} selected={reportSource === value} disabled={busy} onPress={() => { draftEdited.current = true; setReportSource(value); setError(null); }} />)}</View>
        {reportSource === "online" ? <TextInput accessibilityLabel="Source website address" editable={!busy} style={styles.input} value={sourceUrl} onChangeText={(value) => { draftEdited.current = true; setSourceUrl(value); setError(null); }} placeholder="https://source-page.example" placeholderTextColor={colours.muted} autoCapitalize="none" autoCorrect={false} keyboardType="url" /> : null}
        <ActionButton label="Continue" tone="green" disabled={busy || !sourceReady} onPress={() => setStep(0)} />
        </> : step === 6 ? <>
          <Text accessibilityRole="header" style={styles.title}>Review your check</Text>
          {!requiredComplete ? <><Text style={styles.helper}>Add at least one observation.</Text><ActionButton label="Add a check" tone="light" onPress={() => setStep(0)}/></> : null}
          <Pressable accessibilityRole="button" accessibilityLabel="Edit check method" onPress={() => setStep(-1)} style={styles.reviewRow}><Text style={styles.helper}>Checked</Text><Text style={styles.optionText}>{reportSource === "in_person" ? "At the venue" : reportSource === "phone" ? "By phone" : "Online"}</Text><ChevronRight color={colours.muted} size={18}/></Pressable>
          {answers.map(answer => {
            const question = steps.find(item => item.type === answer.type);
            return <Pressable key={answer.type} accessibilityRole="button" accessibilityLabel={`Edit ${question?.question}`} onPress={() => setStep(steps.findIndex(item => item.type === answer.type))} style={styles.reviewRow}><View style={{ flex: 1 }}><Text style={styles.helper}>{question?.question}</Text><Text style={styles.optionText}>{question?.options.find(option => option.value === answer.value)?.label}</Text></View><ChevronRight color={colours.muted} size={18}/></Pressable>;
          })}
          <ActionButton label={busy ? "Submitting..." : hasSupabaseConfig && !session ? "Sign in to submit" : "Submit check"} tone="green" loading={busy} disabled={!requiredComplete || !sourceReady} onPress={() => void submit()}/>
          {!showOptional ? <ActionButton label="Add more checks" tone="light" onPress={() => { setShowOptional(true); setStep(3); }}/>:null}
        </> : <>
        <Text accessibilityRole="header" style={styles.questionTitle}>{current.question}</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel={current.question} style={styles.options}>
          {current.options.map((option) => {
            const selected = answers.some((answer) => answer.type === current.type && answer.value === option.value);
            return <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: selected, disabled: busy }} aria-checked={selected} aria-disabled={busy} disabled={busy} onPress={() => choose(option.value)} style={[styles.option, selected && styles.optionSelected]}><Text style={styles.optionText}>{option.label}</Text>{selected ? <Check color={colours.primary} size={20}/> : <View style={styles.radioRing}/>}</Pressable>;
          })}
        </View>
        <View style={styles.questionNavigation}>
          <View style={styles.navigationButton}><ActionButton label="Back" tone="light" disabled={busy} onPress={() => setStep(step - 1)}/></View>
          <View style={styles.navigationButton}><ActionButton label={step === 2 || step === 5 ? "Review check" : "Continue"} tone="green" disabled={busy || !optionalAnswered} onPress={() => setStep(step === 2 || step === 5 ? 6 : step + 1)} /></View>
        </View>
        <ActionButton label="Did not check" tone="light" disabled={busy} onPress={() => { draftEdited.current = true; setAnswers(value => value.filter(answer => answer.type !== current.type)); setStep(step === 2 || step === 5 ? 6 : step + 1); }} />
        {requiredComplete && step !== 2 && step !== 5 ? <ActionButton label="Review report" tone="light" disabled={busy} onPress={() => setStep(6)} /> : null}
        </>}
        <FeedbackToast message={error} onDismiss={() => setError(null)}/>
        {busy ? <Text style={styles.saving}>Saving check...</Text> : null}
      </View>
    </Page>
  );
}

const createStyles = (colours: ThemeColours) => StyleSheet.create({
  survey: { width: "100%", maxWidth: 560, alignSelf: "center", gap: space.sm },
  surveyHeading: { flexDirection: "row", alignItems: "center", gap: space.sm },
  questionTitle: { color: colours.text, fontFamily: fonts.extraBold, fontSize: 26, lineHeight: 33 },
  questionNavigation: { flexDirection: "row", gap: space.sm },
  navigationButton: { flex: 1, minWidth: 0 },
  surveyPage: { justifyContent: "flex-start", paddingTop: space.xs, paddingBottom: space.sm },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden", backgroundColor: colours.controlStrong },
  progressFill: { height: "100%", borderRadius: 3, backgroundColor: colours.primary },
  radioRing: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: colours.controlBorder },
  reviewRow: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: space.xs, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colours.border },
  flex: { flex: 1, backgroundColor: colours.background }, centerPage: { justifyContent: "center" },
  card: { width: "100%", maxWidth: 560, alignSelf: "center", padding: 18, gap: space.md, borderWidth: 1, borderColor: colours.border, borderRadius: 8, backgroundColor: colours.surface, ...shadows.floating },
  done: { width: "100%", maxWidth: 560, alignSelf: "center", alignItems: "center", gap: space.md },
  kicker: { color: colours.primary, fontFamily: fonts.extraBold, fontSize: 13 }, title: { paddingBottom: 4, color: colours.text, fontFamily: fonts.extraBold, fontSize: 32, lineHeight: 37 }, helper: { color: colours.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 }, unverified: { color: colours.muted, fontFamily: fonts.semibold, fontSize: 12, textAlign: "center" },
  input: { minHeight: 52, paddingHorizontal: 14, borderRadius: 8, backgroundColor: colours.control, borderWidth: 1, borderColor: colours.controlBorder, color: colours.text, fontFamily: fonts.regular, fontSize: 15 }, codeInput: { minHeight: 60, paddingHorizontal: 14, borderRadius: 8, backgroundColor: colours.control, borderWidth: 1, borderColor: colours.controlBorder, color: colours.text, fontFamily: fonts.extraBold, fontSize: 28, textAlign: "center" },
  error: { color: colours.closed, fontFamily: fonts.extraBold, fontSize: 13, lineHeight: 18 }, progress: { minHeight: 30, flexDirection: "row", alignItems: "center", gap: 8 }, dot: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colours.control, borderWidth: 1, borderColor: colours.border }, dotActive: { backgroundColor: colours.primary, borderColor: colours.primary }, dotText: { color: colours.muted, fontFamily: fonts.extraBold, fontSize: 11 }, dotTextActive: { color: colours.background },
  options: { gap: space.sm }, option: { minHeight: 54, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: colours.controlBorder, borderRadius: 8, backgroundColor: colours.control, ...shadows.card }, optionSelected: { borderColor: colours.primary, borderWidth: 2 }, optionText: { color: colours.text, fontFamily: fonts.extraBold, fontSize: 14, textTransform: "capitalize" }, submitGroup: { gap: space.sm, paddingTop: space.xs }, saving: { color: colours.primary, fontFamily: fonts.extraBold, fontSize: 13 }
  ,sourceLabel: { color: colours.text, fontFamily: fonts.extraBold, fontSize: 14 }, sourceOptions: { gap: space.sm }, sourcePill: { minHeight: sizes.touch, minWidth: sizes.touch, paddingVertical: space.xs, paddingHorizontal: 13, alignItems: "center", justifyContent: "center", borderRadius: 20, borderWidth: 1, borderColor: colours.controlBorder, backgroundColor: colours.control }, sourcePillSelected: { borderColor: colours.primary, backgroundColor: colours.primary }, sourcePillText: { color: colours.text, fontFamily: fonts.semibold, fontSize: 12 }, sourcePillTextSelected: { color: colours.background }
});
