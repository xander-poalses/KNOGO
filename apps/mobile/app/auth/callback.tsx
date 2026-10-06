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

const popupHandled = completeBrowserAuthPopup().type === "success";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const { addConfirmations, completeEmailLink } = usePlaces();
  const [error, setError] = useState<string | null>(null);
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
        if (mounted.current) router.replace({ pathname: "/confirm/[placeId]", params: { placeId: finished.draft.placeId, outcome: finished.result.outcome, source: finished.draft.reportSource } });
      } catch (cause) {
        if (mounted.current) setError(cause instanceof Error ? cause.message : "Could not finish signing in.");
      }
    };
    void finish();
  }, [callbackUrl, router]);

  if (!error) return <Page contentContainerStyle={styles.center}><Notice title="Finishing sign-in" loading /></Page>;
  return <Page contentContainerStyle={styles.center}><View style={styles.content}><AlertCircle color={colours.closed} size={32} /><Text style={styles.title}>The link did not work.</Text><Text style={styles.body}>{error}</Text><ActionButton label="Return to KNOGO" tone="green" onPress={() => router.replace("/")} /></View></Page>;
}

const createStyles = (colours: ThemeColours) => StyleSheet.create({
  center: { justifyContent: "center" },
  content: { width: "100%", maxWidth: 520, alignSelf: "center", gap: space.md },
  title: { color: colours.text, fontFamily: fonts.extraBold, fontSize: 28, lineHeight: 34, paddingBottom: 3 },
  body: { color: colours.muted, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 }
});
