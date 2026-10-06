import type { Confirmation, Place } from "../types/place";

export function applyConfirmation(place: Place, confirmation: Confirmation): Place {
  if (place.id !== confirmation.placeId) return place;

  const currentStatus = { ...place.currentStatus };
  currentStatus.lastConfirmedAt = confirmation.createdAt;
  currentStatus.source = "community";
  currentStatus.confidenceScore = Math.min(96, Math.max(currentStatus.confidenceScore, 62) + 8);

  if (confirmation.type === "kitchen_status") {
    if (confirmation.value === "yes") currentStatus.isKitchenServing = true;
    if (confirmation.value === "no") currentStatus.isKitchenServing = false;
  }
  if (confirmation.type === "open_status") {
    if (confirmation.value === "open") currentStatus.isOpen = true;
    if (confirmation.value === "closed") {
      currentStatus.isOpen = false;
      currentStatus.isKitchenServing = false;
    }
  }
  if (confirmation.type === "busy_level" && ["quiet", "normal", "busy", "packed"].includes(confirmation.value)) {
    currentStatus.busyLevel = confirmation.value as Place["currentStatus"]["busyLevel"];
  }
  if (confirmation.type === "walk_ins") currentStatus.acceptsWalkIns = confirmation.value === "yes";
  if (confirmation.type === "card_machine") currentStatus.cardMachineWorking = confirmation.value === "yes";
  if (confirmation.type === "backup_power") currentStatus.hasBackupPower = confirmation.value === "normal";

  return { ...place, currentStatus };
}
