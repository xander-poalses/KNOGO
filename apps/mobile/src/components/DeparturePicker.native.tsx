import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { CalendarDays, Clock3 } from "lucide-react-native";
import { Platform, StyleSheet, Text, View } from "react-native";
import { fonts, space, useTheme } from "../theme";
import { ActionButton } from "./Ui";

export function DeparturePicker({ value, onChange }: { value: Date; onChange: (value: Date) => void }) {
  const { colours, isDark } = useTheme();
  if (Platform.OS === "ios") return <DateTimePicker value={value} mode="datetime" minimumDate={new Date()} timeZoneName="Africa/Johannesburg" themeVariant={isDark ? "dark" : "light"} onChange={(_, next) => { if (next) onChange(next); }}/ >;
  const choose = (mode: "date" | "time") => DateTimePickerAndroid.open({
    value, mode, is24Hour: true, timeZoneName: "Africa/Johannesburg",
    ...(mode === "date" ? { minimumDate: new Date() } : {}),
    onChange: (event, next) => { if (event.type === "set" && next) onChange(next); }
  });
  return <View style={styles.controls}>
    <ActionButton label={value.toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg", day: "numeric", month: "short" })} icon={<CalendarDays color={colours.text} size={19}/>} tone="light" onPress={() => choose("date")}/>
    <ActionButton label={value.toLocaleTimeString("en-ZA", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit", hour12: false })} icon={<Clock3 color={colours.text} size={19}/>} tone="light" onPress={() => choose("time")}/>
    <Text style={{ color: colours.muted, fontFamily: fonts.regular }}>South African time</Text>
  </View>;
}
const styles = StyleSheet.create({ controls: { gap: space.sm } });
