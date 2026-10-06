import type { PlaceOutlook } from "@knogo/core";
export { getCheckPresentation } from "@knogo/core";

export type StatusTone = "neutral" | "success" | "warning" | "closed";

export function getOutlookTone(outlook: Pick<PlaceOutlook, "basis" | "positive">): StatusTone {
  if (outlook.basis === "conflict") return "warning";
  if (outlook.basis !== "report" || outlook.positive === null) return "neutral";
  return outlook.positive ? "success" : "closed";
}
