import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { AlertCircle } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ActionButton, Notice, Page } from "../../src/components/Ui";
import { mobileStorage } from "../../src/storage";
import { finishEmailReport } from "../../src/auth/finishEmailReport";
import { usePlaces } from "../../src/state/PlacesContext";
import { fonts, space, useTheme, useThemeStyles, type ThemeColours } from "../../src/theme";
import { completeBrowserAuthPopup } from "../../src/auth/googleSignIn";
import { isRecoveryCallback } from "@knogo/core";
import { PasswordResetForm } from "../../src/components/PasswordResetForm";

const popupHandled = completeBrowserAuthPopup().type === "success";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const { addConfirmations, completeEmailLink } = usePlaces();
  const [error, setError] = useState<string | null>(null);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const callbackUrl = Linking.useURL();
  const started = useRef(false);
  const mounted = useRef(false);
  const handlers = useRef({ addConfirmations, completeEmailLink });
  handlers.current = { addConfirmations, completeEmailLink };

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    if (popupHandled || callbackUrl) return;
    const timer = setTimeout(() => setError("No sign-in return was received. Open Settings and sign in with your password."), 10_000);
    return () => clearTimeout(timer);
  }, [callbackUrl]);

  useEffect(() => {
    if (popupHandled || !callbackUrl || started.current) return;
    started.current = true;
    const finish = async () => {
      try {
        const finished = await finishEmailReport({
          url: callbackUrl,
          completeEmailLink: (url) => handlers.current.completeEmailLink(url),
          readDraft: mobileStorage.readPendingReport,
          clearDraft: mobileStorage.clearPendingReport,
          submit: (draft) => handlers.current.addConfirmations(draft.placeId, draft.answers, draft.reportSource, draft.sourceUrl)
        });
        if (finished.kind === "recovery") {
          if (mounted.current) setRecoveryReady(true);
          return;
        }
        if (finished.kind === "venue") {
          if (mounted.current) router.replace({ pathname: "/venue/[placeId]", params: { placeId: finished.placeId } });
          return;
        }
        if (finished.kind === "account") {
          if (mounted.current) router.replace("/settings");
          return;
        }
        if (finished.kind === "recheck") {
          if (mounted.current) router.replace({ pathname: "/confirm/[placeId]", params: { placeId: finished.draft.placeId } });
          return;
        }
      } catch (cause) {
        const status = (cause as { status?: number } | null)?.status;
        let expired = status === 401;
        try { const url = new URL(callbackUrl); expired ||= url.searchParams.get("error_code") === "otp_expired" || new URLSearchParams(url.hash.slice(1)).get("error_code") === "otp_expired"; } catch { /* Invalid URLs use the connection fallback. */ }
        if (mounted.current) setError(status === 429 ? "Too many attempts. Wait before opening the link again." : expired ? "This link has expired. Request another link." : "This link could not finish. Check your connection, then reopen the link.");
      }
    };
    void finish();
  }, [callbackUrl, router]);

  let reportPlaceId: string | null = null;
  try { const id = callbackUrl ? new URL(callbackUrl).searchParams.get("placeId") : null; if (id && /^[a-z0-9][a-z0-9_-]{0,199}$/.test(id)) reportPlaceId = id; } catch { /* A failed link can still request recovery. */ }
  const requestLink = () => router.replace({ pathname: "/auth/recover", params: reportPlaceId ? { placeId: reportPlaceId } : {} });
  if (recoveryReady) return <Page contentContainerStyle={styles.center}><PasswordResetForm onRequestLink={requestLink} onComplete={() => { void mobileStorage.readPendingReport().then(draft => { if (draft && reportPlaceId === draft.placeId) router.replace({ pathname: "/confirm/[placeId]", params: { placeId: draft.placeId } }); else router.replace("/settings"); }).catch(() => router.replace("/settings")); }}/></Page>;
  if (!error) return <Page contentContainerStyle={styles.center}><Notice title="Finishing sign-in" loading /></Page>;
  return <Page contentContainerStyle={styles.center}><View style={styles.content}><AlertCircle color={colours.closed} size={32} /><Text style={styles.title}>The link did not work.</Text><Text style={styles.body}>{error}</Text>{callbackUrl && isRecoveryCallback(callbackUrl) ? <ActionButton label="Request another link" tone="green" onPress={requestLink}/> : null}<ActionButton label="Return to KNOGO" tone="light" onPress={() => router.replace("/settings")} /></View></Page>;
}

const createStyles = (colours: ThemeColours) => StyleSheet.create({
  center: { justifyContent: "center" },
  content: { width: "100%", maxWidth: 520, alignSelf: "center", gap: space.md },
  title: { color: colours.text, fontFamily: fonts.extraBold, fontSize: 28, lineHeight: 34, paddingBottom: 3 },
  body: { color: colours.muted, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 }
});
