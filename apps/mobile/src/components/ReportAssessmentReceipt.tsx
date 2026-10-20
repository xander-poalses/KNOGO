import type { ReportAssessment } from "@knogo/core";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { supabaseApi } from "../supabase";
import { fonts, space, useThemeStyles, type ThemeColours } from "../theme";
import { ActionButton } from "./Ui";
import { FeedbackToast } from "./FeedbackToast";

export function ReportAssessmentReceipt({ reportId, onReviewed }: { reportId: string; onReviewed?: () => void }) {
  const styles = useThemeStyles(createStyles);
  const [assessment, setAssessment] = useState<ReportAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const reviewed=useRef(onReviewed);
  reviewed.current=onReviewed;

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline=Date.now()+120_000;
    const next=()=>{ if(active && Date.now()+5_000<=deadline) timer=setTimeout(()=>void read(),5_000); };
    const read = async () => {
      setLoading(true);
      try {
        const result = await supabaseApi.readReportAssessment(reportId);
        if (!active) return;
        setAssessment(result);
        setError(null);
        if (result.state === "complete") reviewed.current?.();
        if (result.state === "queued" || result.state === "reviewing") next();
      } catch (cause) {
        if (active) {
          const missing=cause instanceof Error && cause.message==="Your report assessment is not available.";
          setError(missing?"Review details are no longer available.":"Review could not load. Check your connection and try again.");
          if(!missing) next();
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void read();
    return () => { active = false; clearTimeout(timer); };
  }, [reportId, refresh]);

  const state = assessment?.state;
  const title = state === "complete" ? "Gemini review complete" : state === "queued" ? "Waiting for review" : state === "reviewing" ? "Review in progress" : state === "expired" ? "Review window ended" : state === "unavailable" ? "Review unavailable" : loading ? "Checking review" : "Review not loaded";
  const message = state === "complete"
    ? assessment?.risk === "low" ? "No pattern flagged. This does not prove the report." : "More community checks needed. This is not a verdict on your report."
    : assessment?.reason === "quota" ? "Waiting for review capacity. It will retry without you."
    : assessment?.reason === "setup" ? "Review setup needs attention. Your report was received."
    : assessment?.reason === "disabled" ? "Reviews are switched off. Your report was received."
    : assessment?.reason === "notice" ? "This report predates the review notice. It will not be sent to Google."
    : state === "queued" || state === "reviewing" ? "You can leave this screen."
    : state === "expired" ? "Report details are removed after 24 hours during cleanup."
    : "Community checks still count.";

  return <View style={styles.section}>
    <View accessibilityLiveRegion="polite" accessibilityState={{ busy: loading }}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
    {state === "complete" && assessment?.assessedAt ? <Text style={styles.time}>Reviewed {new Date(assessment.assessedAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}</Text> : null}
    {state === "queued" && assessment?.retryAt ? <Text style={styles.time}>Retry after {new Date(assessment.retryAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}</Text> : null}
    {state !== "complete" && state !== "expired" ? <ActionButton label={loading ? "Checking review..." : "Check review"} tone="light" loading={loading} onPress={() => setRefresh(value => value + 1)} /> : null}
    <FeedbackToast message={error} onDismiss={() => setError(null)} />
  </View>;
}

const createStyles = (colours: ThemeColours) => StyleSheet.create({
  section: { width: "100%", borderTopWidth: StyleSheet.hairlineWidth, borderColor: colours.border, paddingTop: space.md, gap: space.sm },
  title: { color: colours.text, fontFamily: fonts.semibold, fontSize: 18, lineHeight: 25 },
  message: { color: colours.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, marginTop: space.xs },
  time: { color: colours.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 }
});
