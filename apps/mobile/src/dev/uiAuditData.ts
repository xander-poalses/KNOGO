import { mockPlaces, type Place } from "@knogo/core";

export const auditStates = ["demo", "worst", "empty", "one", "huge"] as const;
export type AuditState = typeof auditStates[number];

export function uiAuditPlaces(state: AuditState): Place[] {
  const demo = mockPlaces.slice(0, 8).map((place, index) => ({ ...place, id: `audit-${index}`, slug: `audit-${index}`, imageUrl: undefined }));
  if (state === "demo") return demo;
  if (state === "empty") return [];
  const names = [
    "Pretoria East Community Sports and Recreation Centre, Waterkloof Ridge",
    "WaterkloofRidgeAutomotiveDiagnosticsAndServiceCentre",
    "J",
    "Café São João · Đặng Thị Ngọc Hân",
    "🍽️ The Kitchen",
    "王秀英 茶馆",
    "نور الهدى مطعم",
    " "
  ];
  const worst = demo.map((place, index) => ({
    ...place,
    name: names[index % names.length],
    area: index === 2 ? "" : "Moreleta Park, Pretoria East",
    address: "Shop G128, Waterkloof Ridge Community Shopping and Recreation Centre, Solomon Mahlangu Drive, Pretoria East",
    cuisine: index === 2 ? [] : ["Mediterranean and Middle Eastern", "South African and Mediterranean fusion", "Breakfast", "Coffee", "Bakery", "Pizza", "Vegan", "Grill", "Seafood", "Halaal", "Takeaway", "Dessert"],
    imageUrl: index === 0 ? "/__ui_audit_missing_image__.png" : undefined,
    phone: undefined,
    website: "https://example.com/venues/pretoria-east/community-shopping-and-recreation-centre/opening-hours-and-visitor-information",
    dataNotes: "Hours and entrances need confirmation with the place before travelling. ".repeat(20),
    openingHours: index === 2 ? [] : place.openingHours,
    features: index === 2 ? [] : place.features,
    currentStatus: { ...place.currentStatus, lastConfirmedAt: index === 3 ? "1970-01-01T00:00:00Z" : index === 4 ? new Date(Date.now() + 86_400_000).toISOString() : place.currentStatus.lastConfirmedAt }
  }));
  if (state === "one") return worst.slice(0, 1);
  if (state === "huge") return Array.from({ length: 1000 }, (_, index) => ({ ...worst[index % worst.length], id: `audit-${index}`, slug: `audit-${index}` }));
  return worst;
}
