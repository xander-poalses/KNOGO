import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockPlaces, type Place, type PlaceGroup, type TrustClaim } from "@knogo/core";
import { ExplorePlaceTile, GroupCard, PlaceCard } from "./PlaceCards";

vi.mock("expo-router", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("lucide-react-native", () => ({ ChevronRight: () => null, Clock3: () => null, Heart: () => null, MapPin: () => null }));
vi.mock("./PlaceLogo", () => ({ PlaceLogo: () => null }));
vi.mock("../theme", () => ({
  fonts: {}, radii: {}, space: {},
  useTheme: () => ({ colours: {} }),
  useThemeStyles: (factory: (value: object) => object) => factory({})
}));
vi.mock("react-native", async () => {
  const { createElement } = await import("react");
  return {
    StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
    Text: ({ children }: any) => createElement("span", null, children),
    View: ({ children, accessibilityLabel }: any) => createElement("div", { "aria-label": accessibilityLabel }, children),
    Pressable: ({ children, accessibilityLabel, onPress }: any) => createElement("button", { "aria-label": accessibilityLabel, onClick: onPress }, children)
  };
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

const base = mockPlaces[0];
const group: PlaceGroup = { id: "group", slug: "group", name: "Test group", category: "restaurant", cuisine: [], features: [], branchIds: [base.id] };
function withClaim(claim: TrustClaim): Place {
  const evidence = [{ id: "report", actorId: "report", type: "open_status" as const, value: claim.value!, source: "community" as const,
    checkedBy: "phone" as const, reportedAt: claim.reportedAt!, expiresAt: claim.expiresAt! }];
  return { ...base, currentStatus: { ...base.currentStatus, trust: { version: 1, claims: { open_status: { ...claim, evidence } } } } };
}

describe("trust claims across discovery cards", () => {
  it("does not present legacy practical booleans as report claims", () => {
    render(<PlaceCard place={{ ...base, currentStatus: { ...base.currentStatus, cardMachineWorking: false, hasBackupPower: true } }} saved={false} onToggleSaved={() => {}}/>);
    expect(screen.queryByText("Issue")).toBeNull();
    expect(screen.queryByText("Backup")).toBeNull();
    expect(screen.getAllByText("Status unknown")).toHaveLength(5);
  });
  it("shows branch counts rather than implying the franchise is open", () => {
    render(<GroupCard group={group} branches={[base]}/>);
    expect(screen.getByRole("button", { name: "Test group, choose from 1 branches" })).toBeTruthy();
    expect(screen.queryByText(/reported open/i)).toBeNull();
  });
  it("retains a qualified closure, source and expiry without a standalone Closed label", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-04T11:00:00Z"));
    const place = withClaim({ state: "likely_negative", value: "closed", reportedAt: "2026-10-04T10:00:00Z", expiresAt: "2026-10-04T14:00:00Z", evidence: [], rule: "test" });
    render(<PlaceCard place={place} saved={false} onToggleSaved={() => {}}/>);
    expect(screen.getByText(/Likely closed\. Community.*checked.*expires/)).toBeTruthy();
    expect(screen.queryByText("Closed", { exact: true })).toBeNull();
  });
  it("removes an expired indication from tile text and its accessible name", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-04T14:00:00Z"));
    const place = withClaim({ state: "community_indication", value: "open", reportedAt: "2026-10-04T10:00:00Z", expiresAt: "2026-10-04T14:00:00Z", evidence: [], rule: "test" });
    render(<ExplorePlaceTile place={place} width={320} layout="list" saved={false} onToggleSaved={() => {}}/>);
    expect(screen.getByText("No recent check")).toBeTruthy();
    expect(screen.getByRole("button", { name: `${place.name}, ${place.area}, Status unknown` })).toBeTruthy();
    expect(screen.queryByText("Community reports open")).toBeNull();
  });
});
