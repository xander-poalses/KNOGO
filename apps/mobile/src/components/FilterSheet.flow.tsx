import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultFilters, mockPlaces, type PlaceCategory } from "@knogo/core";
import { FilterSheet } from "./FilterSheet";
import { captureEvent } from "../telemetry";
vi.mock("../telemetry", () => ({ captureEvent: vi.fn() }));

vi.mock("react-native", async () => {
  const { createElement } = await import("react");
  const box = ({ children }: any) => createElement("div", null, children);
  return { View: box, Text: box, ScrollView: box, useWindowDimensions: () => ({ height: 800, width: 400 }), AccessibilityInfo: { addEventListener: () => ({ remove() {} }) }, StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 } };
});
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
vi.mock("lucide-react-native", () => ({ ChevronDown: () => null, ChevronUp: () => null, X: () => null }));
vi.mock("../theme", () => ({ fonts: {}, radii: {}, shadows: {}, sizes: {}, space: {}, useTheme: () => ({ colours: {} }), useThemeStyles: (factory: (colours: object) => object) => factory({}) }));
vi.mock("./StagedModal", async () => {
  const { createElement } = await import("react");
  return { StagedModal: ({ visible, children }: any) => visible ? createElement("section", { role: "dialog" }, children) : null };
});
vi.mock("./HapticPressable", async () => {
  const { createElement } = await import("react");
  return { HapticPressable: ({ children, onPress, accessibilityLabel, accessibilityState }: any) => createElement("button", { onClick: onPress, "aria-label": accessibilityLabel, "aria-expanded": accessibilityState?.expanded }, children) };
});
vi.mock("./Ui", async () => {
  const { createElement } = await import("react");
  return {
    ActionButton: ({ label, onPress }: any) => createElement("button", { onClick: onPress }, label),
    Chip: ({ label, selected, onPress }: any) => createElement("button", { role: "checkbox", "aria-checked": Boolean(selected), onClick: onPress }, label),
    SearchField: ({ value, onChangeText, accessibilityLabel }: any) => createElement("input", { "aria-label": accessibilityLabel, value, onChange: (event: any) => onChangeText(event.target.value) })
  };
});

afterEach(cleanup);

function Harness({ category = "shops" }: { category?: PlaceCategory }) {
  const [filters, setFilters] = useState({ ...defaultFilters, query: "tools" });
  const types = ["bookshop", "supermarket", ...Array.from({ length: 10 }, (_, index) => `department_${index}`)];
  const places = types.map((placeType, index) => ({ ...mockPlaces[0], id: `branch-${index}`, category, placeType, cuisine: ["Books", "Tools"] }));
  return <><FilterSheet visible filters={filters} places={places} categories={[category]} areas={["Menlyn"]} cuisines={["Pizza"]} onChange={setFilters} onClose={() => {}}/><output aria-label="Selected filters">{JSON.stringify(filters)}</output></>;
}

describe("directory filter sheet", () => {
  it("records filter controls without sending selections or search text", () => {
    vi.mocked(captureEvent).mockClear();
    render(<Harness/>);
    expect(captureEvent).toHaveBeenCalledWith("filters_opened", { mode: "all", nearby: false });
    fireEvent.click(screen.getByRole("button", { name: "Place type: All types" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Bookshop" }));
    expect(captureEvent).toHaveBeenCalledWith("filter_changed", { field: "placeTypes", selected_count: 1 });
    fireEvent.click(screen.getByRole("button", { name: "Show results" }));
    expect(captureEvent).toHaveBeenCalledWith("filters_applied", expect.objectContaining({ selected_count: 1 }));
    expect(JSON.stringify(vi.mocked(captureEvent).mock.calls)).not.toMatch(/bookshop|tools|Menlyn/);
  });
  it("searches types, selects one and clears it without clearing the place query", () => {
    render(<Harness/>);
    fireEvent.click(screen.getByRole("button", { name: "Place type: All types" }));
    fireEvent.change(screen.getByLabelText("Search place types"), { target: { value: "book" } });
    expect(screen.queryByRole("checkbox", { name: "Supermarket" })).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: "Bookshop" }));
    expect(screen.getByRole("checkbox", { name: "Bookshop" }).getAttribute("aria-checked")).toBe("true");
    expect(JSON.parse(screen.getByLabelText("Selected filters").textContent!).placeTypes).toEqual(["bookshop"]);
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    const filters = JSON.parse(screen.getByLabelText("Selected filters").textContent!);
    expect(filters.placeTypes).toEqual([]);
    expect(filters.query).toBe("tools");
  });
  it.each([
    ["shops", "Departments"], ["automotive", "Services & fuel"], ["public_services", "Services"],
    ["entertainment", "Activities"], ["sport_outdoors", "Activities"]
  ] as const)("uses %s tags without food controls", (category, label) => {
    render(<Harness category={category}/>);
    expect(screen.queryByRole("button", { name: /^Cuisines:/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Listed hours after:/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: `${label}: Any` }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Tools" }));
    expect(JSON.parse(screen.getByLabelText("Selected filters").textContent!).tags).toEqual(["Tools"]);
  });
  it("keeps restaurant cuisines separate from directory tags", () => {
    render(<Harness category="restaurant"/>);
    expect(screen.getByRole("button", { name: "Cuisines: All cuisines" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Departments:/ })).toBeNull();
  });
  it("shows cuisines for the food aggregate without dining or service-tag controls", () => {
    render(<Harness category="food_drink"/>);
    fireEvent.click(screen.getByRole("button", { name: "Cuisines: All cuisines" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Pizza" }));
    expect(JSON.parse(screen.getByLabelText("Selected filters").textContent!).cuisines).toEqual(["Pizza"]);
    expect(screen.queryByRole("button", { name: /^Listed hours after:/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Services/ })).toBeNull();
  });
});
