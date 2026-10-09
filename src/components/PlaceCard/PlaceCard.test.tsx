import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { mockPlaces, resolveTrust } from "@knogo/core";
import { PlaceCard } from "./PlaceCard";
import { StatusBadge } from "../Badges/StatusBadge";

afterEach(() => { cleanup(); vi.useRealTimers(); });
function RoutePath() { return <output data-testid="route">{useLocation().pathname}</output>; }

describe("website trust cards", () => {
  it("does not display confidence or legacy practical answers as proof", () => {
    render(<MemoryRouter><PlaceCard place={mockPlaces[0]} saved={false} onToggleSaved={() => {}}/></MemoryRouter>);
    expect(screen.queryByText(/confidence/i)).toBeNull();
    expect(screen.queryByText("Working", { exact: true })).toBeNull();
    expect(screen.getAllByText("No recent check")).toHaveLength(5);
  });
  it("retains source/time/expiry and qualifies a negative community indication", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-04T13:00:00Z"));
    const trust = resolveTrust([0, 1, 2].map(index => ({
      id: `report-${index}`, actorId: `account-${index}`, type: "open_status" as const, value: "closed", source: "community" as const,
      checkedBy: index === 1 ? "phone" as const : "in_person" as const, accountCreatedAt: "2026-09-01T12:00:00Z", risk: "low" as const,
      reportedAt: index === 1 ? "2026-10-04T12:20:00Z" : "2026-10-04T12:00:00Z", expiresAt: "2026-10-04T16:00:00Z"
    })), Date.now());
    render(<MemoryRouter><PlaceCard place={{ ...mockPlaces[0], currentStatus: { ...mockPlaces[0].currentStatus, trust } }} saved={false} onToggleSaved={() => {}}/></MemoryRouter>);
    expect(screen.getByText(/Likely closed\. Community.*checked.*expires/)).toBeTruthy();
    expect(screen.queryByText("Closed", { exact: true })).toBeNull();
  });
  it("does not turn the card's Save keyboard action into navigation", () => {
    const save = vi.fn();
    render(<MemoryRouter initialEntries={["/saved"]}><PlaceCard place={mockPlaces[0]} saved={false} onToggleSaved={save}/><RoutePath/></MemoryRouter>);
    const button = screen.getByRole("button", { name: "Save place" });
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.click(button);
    expect(save).toHaveBeenCalledWith(mockPlaces[0].id);
    expect(screen.getByTestId("route").textContent).toBe("/saved");
  });
  it("keeps a badge neutral when only a legacy closed boolean exists", () => {
    render(<StatusBadge status={{ ...mockPlaces[0].currentStatus, isOpen: false, confidenceScore: 99 }}/>);
    const badge = screen.getByText("No recent check");
    expect(badge.className).not.toMatch(/closed/);
    expect(badge.getAttribute("aria-label")).toBe("No recent check");
  });
});
