import type { Place } from "./types/place";
import { compareArrivalWithHours } from "./trip";
import { getCurrentStatus } from "./utils/status";
import { trustClaimLabel } from "./trust";

export type PlaceOutlook = {
  label: string;
  basis: "schedule" | "report" | "conflict" | "unlisted";
  positive: boolean | null;
  detail: string;
};

// Expectations are presentation only. They never become live-status answers.
export function getPlaceOutlook(place: Place, now = new Date()) {
  const status = getCurrentStatus(place.currentStatus, now);
  const outlook = (kitchen: boolean): PlaceOutlook => {
    const type = kitchen ? "kitchen_status" : "open_status";
    const claim = status.trust?.claims[type];
    if (claim?.state === "disagree") return { label: "Reports differ", basis: "conflict", positive: null, detail: "Check with the venue before leaving. Reports do not agree." };
    if (claim && claim.state !== "unknown") return {
      label: trustClaimLabel(type, claim), basis: "report",
      positive: kitchen ? status.isKitchenServing : status.isOpen,
      detail: claim.reportedAt ?? ""
    };
    const hours = kitchen && place.kitchenHours?.length ? place.kitchenHours : place.openingHours;
    const schedule = compareArrivalWithHours(now, hours);
    const detail = kitchen && !place.kitchenHours?.length
      ? "Expected from trading hours. Kitchen hours are not published. This is not a status check."
      : "Based on listed hours, not a status check.";
    if (schedule.state === "within") return { label: kitchen ? "Service expected" : "Expected open", basis: "schedule", positive: true, detail };
    if (schedule.state === "outside") return { label: kitchen ? "Outside service hours" : "Expected closed", basis: "schedule", positive: false, detail };
    return { label: kitchen ? "Check service with the venue" : "Check before leaving", basis: "unlisted", positive: null, detail: "Hours are not listed for this time. Contact the venue to check." };
  };
  return { trading: outlook(false), kitchen: outlook(true) };
}
