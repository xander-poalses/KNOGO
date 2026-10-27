import AsyncStorage from "@react-native-async-storage/async-storage";
import { sessionStorage } from "./sessionStorage";
import {
  defaultSettings,
  legacyStorageKeys,
  parsePlaceDataCache,
  storageKeys,
  type Confirmation,
  type LocalSettings,
  type PlaceDataCache,
  type SupabaseSession,
  type ConfirmationAnswer,
  type ReportSource,
  createFuelStorage
} from "@knogo/core";

export type PendingReport = {
  placeId: string;
  answers: ConfirmationAnswer[];
  reportSource: ReportSource;
  sourceUrl?: string;
  createdAt: string;
};

function parsePendingReport(value: unknown): PendingReport | null {
  if (!value || typeof value !== "object") return null;
  const draft = value as Partial<PendingReport>;
  if (typeof draft.placeId !== "string" || !/^[a-z0-9][a-z0-9_-]{0,199}$/.test(draft.placeId)
    || typeof draft.createdAt !== "string" || !Number.isFinite(Date.parse(draft.createdAt))
    || !["in_person", "phone", "online"].includes(draft.reportSource ?? "")
    || (draft.sourceUrl !== undefined && (typeof draft.sourceUrl !== "string" || draft.sourceUrl.length > 2000))
    || !Array.isArray(draft.answers) || draft.answers.length < 1 || draft.answers.length > 6) return null;
  const allowed: Record<string, string[]> = {
    open_status: ["open", "closed"], kitchen_status: ["yes", "no"],
    busy_level: ["quiet", "normal", "busy", "packed"], walk_ins: ["yes", "no"],
    card_machine: ["yes", "no", "cash_only"], backup_power: ["normal", "limited", "closed"]
  };
  const types = new Set<string>();
  for (const answer of draft.answers) {
    if (!answer || typeof answer !== "object" || typeof answer.type !== "string"
      || !Object.hasOwn(allowed, answer.type) || !allowed[answer.type].includes(answer.value)
      || types.has(answer.type)) return null;
    types.add(answer.type);
  }
  return draft as PendingReport;
}

function parseStoredSession(value: unknown): SupabaseSession | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const session = value as Partial<SupabaseSession>;
  const credential = (field: unknown): field is string => typeof field === "string" && field.length > 0 && !/[\s\u0000-\u001f\u007f]/.test(field);
  if (!credential(session.accessToken) || !credential(session.refreshToken) || !credential(session.userId)
    || typeof session.email !== "string" || /[\u0000-\u001f\u007f]/.test(session.email)
    || (session.expiresAt !== undefined && (!Number.isSafeInteger(session.expiresAt) || session.expiresAt < 0))) return null;
  return {
    accessToken: session.accessToken, refreshToken: session.refreshToken,
    userId: session.userId, email: session.email, expiresAt: session.expiresAt ?? 0,
    ...(session.isAnonymous === true ? { isAnonymous: true } : {})
  };
}

async function readJson<T>(key: string, fallback: T, legacyKey?: string, failureMode: "fallback" | "throw" = "fallback"): Promise<T> {
  try {
    const current = await AsyncStorage.getItem(key);
    const legacy = current || !legacyKey ? null : await AsyncStorage.getItem(legacyKey);
    const raw = current ?? legacy;
    if (legacy && legacyKey) {
      await AsyncStorage.setItem(key, legacy);
      await AsyncStorage.removeItem(legacyKey);
    }
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (cause) {
    if (failureMode === "throw") throw cause;
    return fallback;
  }
}

export const mobileStorage = {
  ...createFuelStorage(AsyncStorage),
  readSavedPlaceIds: () => readJson<string[]>(storageKeys.savedPlaceIds, [], legacyStorageKeys.savedPlaceIds),
  writeSavedPlaceIds: (value: string[]) => AsyncStorage.setItem(storageKeys.savedPlaceIds, JSON.stringify(value)),
  readConfirmations: () => readJson<Confirmation[]>(storageKeys.confirmations, [], legacyStorageKeys.confirmations),
  writeConfirmations: (value: Confirmation[]) => AsyncStorage.setItem(storageKeys.confirmations, JSON.stringify(value)),
  readSettings: async () => ({
    ...defaultSettings,
    ...(await readJson<Partial<LocalSettings>>(storageKeys.settings, defaultSettings, legacyStorageKeys.settings, "throw"))
  }),
  writeSettings: (value: LocalSettings) => AsyncStorage.setItem(storageKeys.settings, JSON.stringify(value)),
  readSession: async () => {
    const raw = await sessionStorage.read();
    if (!raw) return null;
    try { return parseStoredSession(JSON.parse(raw)); } catch { return null; }
  },
  writeSession: (value: SupabaseSession) => sessionStorage.write(JSON.stringify(value)),
  clearSession: () => sessionStorage.clear(),
  readPlaceDataCache: async () => {
    const raw = await readJson<unknown>(storageKeys.placeDataCache, null);
    const parsed = parsePlaceDataCache(raw);
    if (!parsed && raw !== null) await AsyncStorage.removeItem(storageKeys.placeDataCache).catch(() => undefined);
    return parsed;
  },
  writePlaceDataCache: (value: PlaceDataCache) => AsyncStorage.setItem(storageKeys.placeDataCache, JSON.stringify(value)),
  readRecentSearches: () => readJson<string[]>(storageKeys.recentSearches, []),
  writeRecentSearches: (value: string[]) => AsyncStorage.setItem(storageKeys.recentSearches, JSON.stringify(value)),
  readFallbackArea: () => AsyncStorage.getItem(storageKeys.fallbackArea),
  writeFallbackArea: (value: string) => AsyncStorage.setItem(storageKeys.fallbackArea, value),
  readPendingReport: async () => {
    const raw = await readJson<unknown>(storageKeys.pendingReport, null);
    const draft = parsePendingReport(raw);
    if (!draft && raw !== null) await AsyncStorage.removeItem(storageKeys.pendingReport).catch(() => undefined);
    return draft;
  },
  writePendingReport: (value: PendingReport) => AsyncStorage.setItem(storageKeys.pendingReport, JSON.stringify(value)),
  clearPendingReport: () => AsyncStorage.removeItem(storageKeys.pendingReport)
};
