import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { render } from "../testRender";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyFuelPreferences } from "@knogo/core";
import { FuelPreferencesForm } from "./FuelPreferencesForm";

vi.mock("lucide-react-native", () => ({ Check: () => null, ChevronDown: () => null, X: () => null }));
vi.mock("../theme", () => ({ fonts: {}, radii: {}, useTheme: () => ({ colours: {} }), useThemeStyles: (factory: (value: object) => object) => factory({}) }));
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
  it.each(["0", "-1", "1001", "NaN", "Infinity"])("names the price field and bounds for %s", async price => {
    const onSave = vi.fn();
    render(<FuelPreferencesForm preferences={emptyFuelPreferences} onSave={onSave}/>);
    enter("Price override (R/litre)", price);
    fireEvent.click(screen.getByRole("button", { name: "Save fuel setup" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Price override must be above R0 and no more than R1,000 per litre.");
    expect(onSave).not.toHaveBeenCalled();
  });
  it.each([["L/100 km", "101", "Consumption must be above 0 and no more than 100 L/100 km."], ["km/l", "0.5", "Consumption must be at least 1 km/l."]])("explains the consumption bounds in %s", async (unit, value, message) => {
    const onSave = vi.fn();
    render(<FuelPreferencesForm preferences={emptyFuelPreferences} onSave={onSave}/>);
    fireEvent.click(screen.getByRole("radio", { name: unit }));
    enter(`Consumption (${unit})`, value);
    fireEvent.click(screen.getByRole("button", { name: "Save fuel setup" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", message);
    expect(onSave).not.toHaveBeenCalled();
  });
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
  it("accepts km/l and stores its L/100 km equivalent without a tank calculator", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<FuelPreferencesForm preferences={emptyFuelPreferences} onSave={onSave}/>);
    expect(screen.queryByRole("tab", { name: "Tank-fill calculation" })).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "km/l" }));
    enter("Consumption (km/l)", "12,5");
    fireEvent.click(screen.getByRole("button", { name: "Save fuel setup" }));
    await screen.findByText("Fuel setup saved on this device.");
    expect(onSave.mock.calls[0][0]).toMatchObject({ grade: null, region: null, priceOverrideZarPerLitre: null });
    expect(onSave.mock.calls[0][0].consumptionLPer100Km).toBeCloseTo(8, 10);
    expect(onSave.mock.calls[0][0].consumptionUnit).toBe("km_per_litre");
  });
  it('hides region selection when the shared location resolves a reference region',()=>{
    render(<FuelPreferencesForm preferences={emptyFuelPreferences} onSave={vi.fn()} automaticRegion="inland"/>);
    expect(screen.queryByRole('button',{name:/Reference-price region/})).toBeNull();
    expect(screen.queryByText(/Diesel reference prices/)).toBeNull();
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
