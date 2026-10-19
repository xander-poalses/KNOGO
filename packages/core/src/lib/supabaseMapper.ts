import type {
  BusyLevel,
  Confirmation,
  ConfirmationType,
  LiveStatus,
  OpeningHours,
  Place,
  PlaceCategory,
  PlaceGroup,
  PlaceFeature,
  StatusSource
} from "../types/place";
import { parseTrustSnapshot } from "../trust";
import { placeCategoryIds } from "../types/place";

export type SupabasePlaceRow = {
  id: string;
  slug: string;
  name: string;
  category_id: string;
  place_type?: string | null;
  source_url?: string | null;
  source_checked_at?: string | null;
  data_notes?: string | null;
  region_id: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  website: string | null;
  menu_url: string | null;
  features: string[] | null;
  tags: string[] | null;
  is_active: boolean;
  group_id?: string | null;
  image_url?: string | null;
  image_source_url?: string | null;
  image_attribution?: string | null;
  image_checked_at?: string | null;
  logo_url?: string | null;
  logo_source_url?: string | null;
  logo_checked_at?: string | null;
};

export type SupabasePlaceGroupRow = {
  id: string;
  slug: string;
  name: string;
  category_id: string;
  description: string | null;
  website: string | null;
  image_url: string | null;
  logo_url?: string | null;
  logo_source_url?: string | null;
  logo_checked_at?: string | null;
  tags: string[] | null;
  features: string[] | null;
  is_active: boolean;
};

export type SupabaseRegionRow = {
  id: string;
  name: string;
  slug: string;
  region_type: "country" | "province" | "municipality" | "city_town" | "suburb_area";
  parent_id: string | null;
  sort_order: number;
};

export type SupabaseHoursRow = {
  place_id: string;
  hours_type: "opening" | "kitchen";
  day_of_week: string;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
  sort_order: number;
};

export type SupabaseLiveStatusRow = {
  place_id: string;
  is_open: boolean | null;
  is_service_available: boolean | null;
  accepts_walk_ins: boolean | null;
  busy_level: string | null;
  has_backup_power: boolean | null;
  card_machine_working: boolean | null;
  last_confirmed_at: string | null;
  confidence_score: number | null;
  source: string | null;
  signal_confirmed_at?: Partial<Record<ConfirmationType, string>> | null;
  trust_snapshot?: import("../trust").TrustSnapshot | null;
};

export type SupabaseConfirmationRow = {
  id: string;
  place_id: string;
  confirmation_type: ConfirmationType;
  value: string;
  created_at: string;
  location_verified: boolean | null;
  user_id: string;
};

const busyLevels: BusyLevel[] = ["quiet", "normal", "busy", "packed", "unknown"];
const statusSources: StatusSource[] = ["official", "community", "business", "estimated", "unknown"];

function coerceCategory(value: string): PlaceCategory {
  return placeCategoryIds.includes(value as PlaceCategory) ? (value as PlaceCategory) : "restaurant";
}

function coerceBusyLevel(value: string | null): BusyLevel {
  return busyLevels.includes(value as BusyLevel) ? (value as BusyLevel) : "unknown";
}

function coerceSource(value: string | null): StatusSource {
  return statusSources.includes(value as StatusSource) ? (value as StatusSource) : "unknown";
}

function normalizeTime(value: string | null): string {
  return value ? value.slice(0, 5) : "";
}

function mapHours(rows: SupabaseHoursRow[]): OpeningHours[] {
  return [...rows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => ({
      day: row.day_of_week,
      openTime: normalizeTime(row.open_time),
      closeTime: normalizeTime(row.close_time),
      isClosed: row.is_closed
    }));
}

export function mapSupabaseConfirmation(row: SupabaseConfirmationRow): Confirmation {
  return {
    id: row.id,
    placeId: row.place_id,
    type: row.confirmation_type,
    value: row.value,
    createdAt: row.created_at,
    locationVerified: row.location_verified ?? false,
    source: "user"
  };
}

export function mapSupabasePlaceGroup(input: {
  group: SupabasePlaceGroupRow;
  branches: SupabasePlaceRow[];
}): PlaceGroup {
  return {
    id: input.group.id,
    slug: input.group.slug,
    name: input.group.name,
    category: coerceCategory(input.group.category_id),
    description: input.group.description ?? undefined,
    website: input.group.website ?? undefined,
    imageUrl: input.group.image_url ?? undefined,
    logoUrl: input.group.logo_url ?? undefined,
    logoSourceUrl: input.group.logo_source_url ?? undefined,
    logoCheckedAt: input.group.logo_checked_at ?? undefined,
    cuisine: input.group.tags ?? Array.from(new Set(input.branches.flatMap((branch) => branch.tags ?? []))),
    features: (input.group.features ?? Array.from(new Set(input.branches.flatMap((branch) => branch.features ?? [])))) as PlaceFeature[],
    branchIds: input.branches.map((branch) => branch.id)
  };
}

export function mapSupabasePlace(input: {
  place: SupabasePlaceRow;
  region?: SupabaseRegionRow;
  group?: SupabasePlaceGroupRow;
  hours: SupabaseHoursRow[];
  liveStatus?: SupabaseLiveStatusRow;
}): Place {
  const openingHours = mapHours(input.hours.filter((row) => row.hours_type === "opening"));
  const kitchenHours = mapHours(input.hours.filter((row) => row.hours_type === "kitchen"));
  const liveStatus = input.liveStatus;
  const currentStatus: LiveStatus = {
    isOpen: liveStatus?.is_open ?? null,
    isKitchenServing: liveStatus?.is_service_available ?? null,
    acceptsWalkIns: liveStatus?.accepts_walk_ins ?? null,
    busyLevel: coerceBusyLevel(liveStatus?.busy_level ?? null),
    hasBackupPower: liveStatus?.has_backup_power ?? null,
    cardMachineWorking: liveStatus?.card_machine_working ?? null,
    lastConfirmedAt: liveStatus?.last_confirmed_at ?? null,
    confidenceScore: liveStatus?.confidence_score ?? 0,
    source: coerceSource(liveStatus?.source ?? null),
    ...(liveStatus?.signal_confirmed_at ? { signalConfirmedAt: liveStatus.signal_confirmed_at } : {}),
    ...(liveStatus?.trust_snapshot != null ? { trust: parseTrustSnapshot(liveStatus.trust_snapshot) ?? { version: 1, claims: {} } } : {})
  };

  return {
    id: input.place.id,
    slug: input.place.slug,
    name: input.place.name,
    groupId: input.place.group_id ?? undefined,
    groupSlug: input.group?.slug,
    groupName: input.group?.name,
    category: coerceCategory(input.place.category_id),
    placeType: input.place.place_type ?? undefined,
    sourceUrl: input.place.source_url ?? undefined,
    sourceCheckedAt: input.place.source_checked_at ?? undefined,
    dataNotes: input.place.data_notes ?? undefined,
    area: input.region?.name ?? input.place.region_id,
    address: input.place.address,
    latitude: input.place.latitude,
    longitude: input.place.longitude,
    imageUrl: input.place.image_url ?? undefined,
    imageSourceUrl: input.place.image_source_url ?? undefined,
    imageAttribution: input.place.image_attribution ?? undefined,
    imageCheckedAt: input.place.image_checked_at ?? undefined,
    logoUrl: input.place.logo_url ?? input.group?.logo_url ?? undefined,
    logoSourceUrl: input.place.logo_source_url ?? input.group?.logo_source_url ?? undefined,
    logoCheckedAt: input.place.logo_checked_at ?? input.group?.logo_checked_at ?? undefined,
    cuisine: input.place.tags ?? [],
    phone: input.place.phone ?? undefined,
    website: input.place.website ?? undefined,
    menuUrl: input.place.menu_url ?? undefined,
    openingHours,
    kitchenHours: kitchenHours.length > 0 ? kitchenHours : undefined,
    features: (input.place.features ?? []) as PlaceFeature[],
    currentStatus
  };
}
