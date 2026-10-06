import { parseSouthAfricanDeparture } from "@knogo/core";
import { createElement } from "react";
import { fonts, radii, sizes, space, useTheme } from "../theme";

export function DeparturePicker({ value, onChange }: { value: Date; onChange: (value: Date) => void }) {
  const { colours } = useTheme();
  const localValue = (date: Date) => new Date(date.getTime() + 7200000).toISOString().slice(0, 16);
  return createElement("input", {
    type: "datetime-local", "aria-label": "Departure date and time, South Africa",
    value: localValue(value), min: localValue(new Date()),
    onChange: (event: { target: { value: string } }) => {
      const [date, time] = event.target.value.split("T");
      const parsed = parseSouthAfricanDeparture(date ?? "", time ?? "");
      if (parsed) onChange(parsed);
    },
    style: { boxSizing: "border-box", width: "100%", minWidth: 0, minHeight: sizes.control, padding: space.md, border: `1px solid ${colours.controlBorder}`, borderRadius: radii.control, backgroundColor: colours.control, color: colours.text, fontFamily: fonts.regular, fontSize: 16 }
  });
}
