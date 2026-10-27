// Imports
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { PlaceSheet } from "./PlaceSheet";
import { ActionButton } from "./Ui";
import { FeedbackToast } from "./FeedbackToast";
import { usePlaces } from "../state/PlacesContext";
import { captureEvent, disableTelemetry, enableTelemetry } from "../telemetry";
import { fonts, useThemeStyles, type ThemeColours } from "../theme";

// Components
export function TelemetryGate({ children }: { children: ReactNode }) {
  const { settings, settingsLoaded, updateSettings } = usePlaces();
  const styles = useThemeStyles(createStyles);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const saving = useRef(false);
  useEffect(() => {
    if (settingsLoaded && settings.telemetryConsent === "granted") { enableTelemetry(); captureEvent("app_opened"); }
    else disableTelemetry();
  }, [settingsLoaded, settings.telemetryConsent]);
  const choose = async (telemetryConsent: "granted" | "denied") => {
    if (!settingsLoaded || saving.current) return;
    saving.current = true; setBusy(true); setError("");
    try { await updateSettings({ ...settings, telemetryConsent }); }
    catch { setError("KNOGO could not save your choice. Diagnostics stay off. Try again."); }
    finally { saving.current = false; setBusy(false); }
  };
  return <>{children}<PlaceSheet title="Help improve KNOGO?" visible={settingsLoaded && settings.telemetryConsent === "unset"} onClose={() => void choose("denied")}>
    <Text style={styles.body}>KNOGO can send crash details, feature-use events, step timings and app/build versions. Screen recording stays off. We do not send your email, searches, location, report answers or source links.</Text>
    <ActionButton label="Allow diagnostics" tone="green" disabled={busy} onPress={() => void choose("granted")}/>
    <ActionButton label="Not now" tone="light" disabled={busy} onPress={() => void choose("denied")}/>
    <FeedbackToast message={error} onDismiss={() => setError("")}/>
  </PlaceSheet></>;
}

// Styles
const createStyles = (colours: ThemeColours) => StyleSheet.create({ body: { color: colours.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 } });
