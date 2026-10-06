import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyFuelPreferences } from "@knogo/core";
import { FuelPreferencesForm } from "./FuelPreferencesForm";

vi.mock("lucide-react-native", () => ({ Check: () => null, ChevronDown: () => null }));
vi.mock("../theme", () => ({ fonts: {}, useTheme: () => ({ colours: {} }), useThemeStyles: (factory: (value: object) => object) => factory({}) }));
vi.mock("./Ui", async () => {
  const { createElement } = await import("react");
  return {
    ActionButton: ({ label, onPress, disabled, loading }: any) => createElement("button", { onClick: onPress, disabled: disabled || loading }, label),
    Chip: ({ label, onPress, selected, role = "checkbox", disabled }: any) => createElement("button", { onClick: onPress, disabled, role: role === "checkbox" ? role : "button", "aria-checked": selected, "aria-pressed": selected }, label)
  };
});
vi.mock("react-native", async () => {
  const { createElement } = await import("react");
  const box = ({ children, accessibilityRole }: any) => createElement("div", { role: accessibilityRole }, children);
  return {
    View: box, Text: box, StyleSheet: { create: (value: unknown) => value },
    Pressable: ({ children, onPress, accessibilityRole, accessibilityLabel, accessibilityState = {}, disabled }: any) => createElement("button", { onClick: onPress, disabled, role: accessibilityRole, "aria-label": accessibilityLabel, "aria-checked": accessibilityState.checked, "aria-selected": accessibilityState.selected, "aria-expanded": accessibilityState.expanded }, children),
    TextInput: ({ accessibilityLabel, value, onChangeText, editable }: any) => createElement("input", { "aria-label": accessibilityLabel, value, disabled: !editable, onChange: (event: any) => onChangeText(event.target.value) })
  };
});
afterEach(cleanup);
const enter = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("fuel setup form", () => {
  it("saves dashboard use, grade, region and a decimal-comma price without an account", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<FuelPreferencesForm preferences={emptyFuelPreferences} onSave={onSave}/>);
    enter("Consumption (L/100 km)", "7,5");
    enter("Price override (R/litre)", "23,10");
    fireEvent.click(screen.getByRole("button", { name: "Fuel grade: Not set" }));
    fireEvent.click(screen.getByRole("radio", { name: "Diesel 50 ppm" }));
    fireEvent.click(screen.getByRole("button", { name: "Reference-price region: Not set" }));
    fireEvent.click(screen.getByRole("radio", { name: "Coastal" }));
    fireEvent.click(screen.getByRole("button", { name: "Save fuel setup" }));
    await screen.findByText("Fuel setup saved on this device.");
    expect(onSave).toHaveBeenCalledWith({ consumptionLPer100Km: 7.5, grade: "diesel_50ppm", region: "coastal", priceOverrideZarPerLitre: 23.1 });
  });
  it("requires two full tank fills before calculating consumption", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<FuelPreferencesForm preferences={emptyFuelPreferences} onSave={onSave}/>);
    fireEvent.click(screen.getByRole("tab", { name: "Tank-fill calculation" }));
    enter("Kilometres between fills", "500"); enter("Litres used to fill again", "35");
    fireEvent.click(screen.getByRole("button", { name: "Save fuel setup" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Save fuel setup" }));
    await screen.findByText("Fuel setup saved on this device.");
    expect(onSave.mock.calls[0][0]).toMatchObject({ grade: null, region: null, priceOverrideZarPerLitre: null });
    expect(onSave.mock.calls[0][0].consumptionLPer100Km).toBeCloseTo(7, 10);
  });
  it("allows clearing after invalid draft values", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<FuelPreferencesForm preferences={{ ...emptyFuelPreferences, consumptionLPer100Km: 7 }} onSave={onSave} allowClear/>);
    enter("Consumption (L/100 km)", "-2");
    fireEvent.click(screen.getByRole("button", { name: "Clear fuel setup" }));
    await screen.findByText("Fuel setup cleared.");
    expect(onSave).toHaveBeenCalledWith(emptyFuelPreferences);
    expect((screen.getByLabelText("Consumption (L/100 km)") as HTMLInputElement).value).toBe("");
  });
  it("does not call a failed save successful and keeps the draft for retry", async () => {
    const onSave = vi.fn().mockRejectedValueOnce(new Error("Storage full")).mockResolvedValue(undefined);
    render(<FuelPreferencesForm preferences={emptyFuelPreferences} onSave={onSave}/>);
    enter("Consumption (L/100 km)", "7.5");
    fireEvent.click(screen.getByRole("button", { name: "Save fuel setup" }));
    await screen.findByText("Could not save on this device. Try again.");
    expect((screen.getByLabelText("Consumption (L/100 km)") as HTMLInputElement).value).toBe("7.5");
    fireEvent.click(screen.getByRole("button", { name: "Save fuel setup" }));
    await screen.findByText("Fuel setup saved on this device.");
    expect(onSave).toHaveBeenCalledTimes(2);
  });
  it("blocks repeat saves while a write is pending", async () => {
    let finish!: () => void;
    const onSave = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    render(<FuelPreferencesForm preferences={emptyFuelPreferences} onSave={onSave} allowClear/>);
    const button = screen.getByRole("button", { name: "Save fuel setup" });
    fireEvent.click(button); fireEvent.click(button);
    fireEvent.click(screen.getByRole("button", { name: "Clear fuel setup" }));
    expect(onSave).toHaveBeenCalledOnce();
    finish();
    await screen.findByText("Fuel setup saved on this device.");
  });
});
