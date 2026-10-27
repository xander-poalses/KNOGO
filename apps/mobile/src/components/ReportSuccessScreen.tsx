// Imports
import type { ReactNode } from "react";
import { Image } from "expo-image";
import { Stack } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import reportSuccess from "../../assets/report-success.svg";
import { fonts, useThemeStyles, type ThemeColours } from "../theme";
import { ReceiptMotion } from "./Motion";
import { ActionButton } from "./Ui";
import { FeedbackToast } from "./FeedbackToast";

// Components
export function ReportSuccessScreen({ onDone, notification, conflict = false }: { onDone: () => void; notification?: ReactNode; conflict?: boolean }) {
  const insets = useSafeAreaInsets();
  const styles = useThemeStyles(createStyles);
  return <>
    <Stack.Screen options={{ headerShown: false }}/>
    <ScrollView contentContainerStyle={[styles.screen, { paddingTop: insets.top + 39, paddingBottom: insets.bottom + 31 }]}>
      {notification}{conflict ? <FeedbackToast message="Reports disagree." detail="The checks include opposing reports. KNOGO keeps both sources visible rather than choosing a side."/> : null}
      <View style={styles.message}>
        <ReceiptMotion><Image source={reportSuccess} contentFit="contain" accessible={false} style={styles.check}/></ReceiptMotion>
        <Text accessibilityRole="header" style={styles.title}>Report submitted</Text>
        <Text style={styles.body}>Thank you for submitting your report. You helping the community inspires the community to help you</Text>
      </View>
      <ActionButton label="DONE" tone="green" size="large" onPress={onDone}/>
    </ScrollView>
  </>;
}

// Styles
const createStyles = (colours: ThemeColours) => StyleSheet.create({
  screen: { flexGrow: 1, width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 14, backgroundColor: colours.background, minHeight: 440 },
  message: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingTop: 97, paddingBottom: 32, paddingHorizontal: 12 },
  check: { width: 100, height: 100 },
  title: { fontFamily: fonts.extraBold, fontSize: 26, lineHeight: 38, color: colours.text, textAlign: "center", marginTop: 11 },
  body: { maxWidth: 342, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colours.text, textAlign: "center", marginTop: 2 }
});
