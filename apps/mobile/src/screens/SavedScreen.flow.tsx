import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockPlaces } from "@knogo/core";
import { SavedScreen } from "./SavedScreen";
const mocks = vi.hoisted(() => ({ width: 375, remove: vi.fn() }));
vi.mock("react-native", () => ({ useWindowDimensions: () => ({ width: mocks.width }) }));
vi.mock("../state/PlacesContext", () => ({ usePlaces: () => ({ places: [mockPlaces[0]], savedPlaceIds: [mockPlaces[0].id], isSaved: () => true, toggleSaved: mocks.remove, refresh: vi.fn() }) }));
vi.mock("../components/PlaceCards", () => ({ ExplorePlaceTile: ({ place, layout, allowRemove, onToggleSaved }: any) => <div data-layout={layout}>{place.name}{allowRemove ? <button onClick={() => onToggleSaved(place.id)}>Remove from saved</button> : null}</div> }));
vi.mock("../components/VirtualizedGrid", () => ({ VirtualizedGrid: ({ data, columns, header, renderTile }: any) => <main data-columns={columns}>{header}{data.map((item: any) => <div key={item.id}>{renderTile(item, 300)}</div>)}</main> }));
vi.mock("../components/Ui", () => {
  const text = ({ children, title }: any) => <span>{children || title}</span>;
  return { CacheNotice: () => null, Eyebrow: text, Notice: text, Skeleton: () => null, Title: text, ActionButton: ({ label, onPress }: any) => <button onClick={onPress}>{label}</button> };
});
beforeEach(() => { mocks.width = 375; vi.clearAllMocks(); });
afterEach(cleanup);
describe("saved layouts", () => {
  it("uses a phone list and exposes removal", () => {
    const view = render(<SavedScreen/>);
    expect(view.container.querySelector("main")?.getAttribute("data-columns")).toBe("1");
    expect(screen.queryByRole("button", { name: "Show grid" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Remove from saved" }));
    expect(mocks.remove).toHaveBeenCalledWith(mockPlaces[0].id);
  });
  it("retains the tablet grid option but switches back to a list on phones", () => {
    mocks.width = 768; const view = render(<SavedScreen/>);
    fireEvent.click(screen.getByRole("button", { name: "Show grid" }));
    expect(view.container.querySelector("main")?.getAttribute("data-columns")).toBe("3");
    mocks.width = 320; view.rerender(<SavedScreen/>);
    expect(view.container.querySelector("main")?.getAttribute("data-columns")).toBe("1");
  });
});
