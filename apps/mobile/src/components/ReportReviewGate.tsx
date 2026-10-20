import { reportReviewNoticeVersion } from "@knogo/core";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { supabaseApi } from "../supabase";
import { fonts, space, useThemeStyles, type ThemeColours } from "../theme";
import { ActionButton, BackButton, Chip, Notice, Page } from "./Ui";
import { FeedbackToast } from "./FeedbackToast";

export function ReportReviewGate({ accountId, children }: { accountId: string; children: ReactNode }) {
  return <AccountNotice key={accountId}>{children}</AccountNotice>;
}

function AccountNotice({ children }: { children: ReactNode }) {
  const styles = useThemeStyles(createStyles);
  const [accepted, setAccepted] = useState(false);
  const [adult, setAdult] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const active = useRef(true);
  useEffect(() => {
    let current = true; active.current = true; setLoading(true); setError(null);
    void supabaseApi.readReportReviewNotice().then(value => { if (current) setAccepted(value.accepted); })
      .catch(() => { if (current) setError("Could not load the report notice. Check your connection and try again."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; active.current = false; };
  }, [retry]);
  const accept = async () => {
    if (!adult || saving) return;
    setSaving(true); setError(null);
    try {
      await supabaseApi.acceptReportReviewNotice({ version: reportReviewNoticeVersion, adultConfirmed: true });
      if (active.current) setAccepted(true);
    } catch { if (active.current) setError("Could not save the report notice. Try again."); }
    finally { if (active.current) setSaving(false); }
  };
  if (accepted) return children;
  return <Page><BackButton label="Back to place" iconOnly />{loading ? <Notice title="Checking report access" loading /> : <View style={styles.content}>
    <Text accessibilityRole="header" style={styles.title}>Before you report</Text>
    <Text style={styles.body}>Reporting is for testers aged 18 or over. Gemini checks report patterns, not whether a report is true.</Text>
    <Text style={styles.body}>Google receives coded answers and timing patterns, not your email, location or source links. Its unpaid service may use this data to improve its products, with human review.</Text>
    <Text style={styles.body}>KNOGO removes report details after 24 hours during cleanup. Your account keeps a contribution count.</Text>
    <Chip label="I am 18 or over and agree to this use" selected={adult} disabled={saving} onPress={() => setAdult(value => !value)} />
    <ActionButton label="Agree and continue" tone="green" disabled={!adult || saving} loading={saving} onPress={() => void accept()} />
    {error ? <ActionButton label="Reload notice" tone="light" onPress={() => setRetry(value => value + 1)} /> : null}
  </View>}<FeedbackToast message={error} onDismiss={() => setError(null)} /></Page>;
}

const createStyles=(colours:ThemeColours)=>StyleSheet.create({
  content:{width:"100%",maxWidth:560,alignSelf:"center",gap:space.md},
  title:{fontFamily:fonts.extraBold,fontSize:26,lineHeight:33,color:colours.text},
  body:{fontFamily:fonts.regular,fontSize:14,lineHeight:21,color:colours.muted}
});
