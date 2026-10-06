export type PlaceCategory =
  | "restaurant"
  | "quick_bites"
  | "bar"
  | "pharmacy"
  | "cafe"
  | "hardware"
  | "vet"
  | "petrol_station"
  | "government_office";

export type Area = {
  name: string;
  slug: string;
};

export type BusyLevel = "quiet" | "normal" | "busy" | "packed" | "unknown";
export type ConfidenceLevel = "high" | "medium" | "low" | "unknown";
export type StatusSource = "official" | "community" | "business" | "estimated" | "unknown";

export type PlaceFeature =
  | "outdoor_seating"
  | "family_friendly"
  | "wheelchair_accessible"
  | "backup_power"
  | "card_payments"
  | "late_night"
  | "walk_ins"
  | "takeaway"
  | "bar"
  | "halaal_friendly"
  | "vegan_options"
  | "pet_friendly";

export type OpeningHours = {
  day: string;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
};

export type LiveStatus = {
  isOpen: boolean | null;
  isKitchenServing: boolean | null;
  acceptsWalkIns: boolean | null;
  busyLevel: BusyLevel;
  hasBackupPower: boolean | null;
  cardMachineWorking: boolean | null;
  lastConfirmedAt: string | null;
  confidenceScore: number;
  source: StatusSource;
  signalConfirmedAt?: Partial<Record<ConfirmationType, string>>;
  trust?: import("../trust").TrustSnapshot;
};

export type Place = {
  id: string;
  name: string;
  slug: string;
  groupId?: string;
  groupSlug?: string;
  groupName?: string;
  category: PlaceCategory;
  area: string;
  address: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  imageSourceUrl?: string;
  imageAttribution?: string;
  imageCheckedAt?: string;
  logoUrl?: string;
  logoSourceUrl?: string;
  logoCheckedAt?: string;
  cuisine: string[];
  phone?: string;
  website?: string;
  menuUrl?: string;
  openingHours: OpeningHours[];
  kitchenHours?: OpeningHours[];
  features: PlaceFeature[];
  currentStatus: LiveStatus;
};

export type PlaceGroup = {
  id: string;
  name: string;
  slug: string;
  category: PlaceCategory;
  description?: string;
  website?: string;
  imageUrl?: string;
  logoUrl?: string;
  logoSourceUrl?: string;
  logoCheckedAt?: string;
  cuisine: string[];
  features: PlaceFeature[];
  branchIds: string[];
};

export type ConfirmationType =
  | "open_status"
  | "kitchen_status"
  | "busy_level"
  | "walk_ins"
  | "card_machine"
  | "backup_power";

export type Confirmation = {
  id: string;
  placeId: string;
  type: ConfirmationType;
  value: string;
  createdAt: string;
  locationVerified: boolean;
  source: "user" | "business";
};

export type ReportSource = "in_person" | "phone" | "online";
export type ReportOutcome = "pending" | "accepted" | "conflict";

export type ReportSubmissionResult = {
  reportId: string;
  outcome: ReportOutcome;
  acceptedSignals: ConfirmationType[];
  confirmations: Confirmation[];
};

export type PlaceFilters = {
  query: string;
  areas: string[];
  openNow: boolean;
  openAfter: "none" | "20:00" | "21:00";
  kitchenServing: boolean;
  walkIns: boolean;
  busyLevel: BusyLevel | "any";
  backupPower: boolean;
  cardWorking: boolean;
  cuisines: string[];
  /** @deprecated Stored filter compatibility only; scores do not filter claims. */
  confidence?: ConfidenceLevel | "any";
};
