import type { Place } from "../types/place";
import { validTripPoint } from "../tripApi";

export type PlaceActionLink = { type: "directions" | "call" | "website" | "menu"; label: string; url: string };

function webLink(value?: string): string | null {
  if (typeof value !== "string") return null;
  const link = value.trim();
  if (/[\u0000-\u0020\u007f]/.test(link)) return null;
  try {
    const url = new URL(link);
    return ["https:", "http:"].includes(url.protocol) && url.hostname && !url.username && !url.password ? link : null;
  } catch { return null; }
}

function phoneLink(value?: string): string | null {
  if (typeof value !== "string" || !/^\+?[\d ()-]+$/.test(value.trim())) return null;
  const number = value.trim().replace(/[ ()-]/g, "");
  return /^\+?\d{7,15}$/.test(number) ? `tel:${number}` : null;
}

export function getPlaceActionLinks(place: Place): PlaceActionLink[] {
  const call = phoneLink(place.phone);
  const website = webLink(place.website);
  const menu = webLink(place.menuUrl);
  return [
    ...(validTripPoint(place) ? [{ type: "directions" as const, label: "Directions", url: `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}` }] : []),
    ...(call ? [{ type: "call" as const, label: "Call", url: call }] : []),
    ...(website ? [{ type: "website" as const, label: "Website", url: website }] : []),
    ...(menu ? [{ type: "menu" as const, label: "Menu", url: menu }] : [])
  ];
}
