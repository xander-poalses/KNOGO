import {
  defaultSettings,
  getCurrentStatus,
  mockPlaces,
  PLACE_CACHE_SCHEMA_VERSION,
  mergeRecentSearches,
  requestDiscoveryLocation,
  type Confirmation,
  type ConfirmationType,
  type ConfirmationAnswer,
  type Coordinates,
  type LocalSettings,
  type Place,
  type PlaceGroup,
  type ReportSource,
  type ReportSubmissionResult,
  type SupabaseSession
} from "@knogo/core";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as Location from "expo-location";
import { mobileStorage } from "../storage";
import { supabaseApi, useMockData } from "../supabase";
import { captureEvent } from "../telemetry";
import { useStatusClock } from "./useStatusClock";
import { completeGoogleCallback } from "../auth/googleSignIn";

type PlacesContextValue = {
  places: Place[];
  placeGroups: PlaceGroup[];
  confirmations: Confirmation[];
  savedPlaceIds: string[];
  settings: LocalSettings;
  settingsLoaded: boolean;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  dataSource: "live" | "cache" | "mock" | "none";
  lastUpdatedAt: string | null;
  cacheExpired: boolean;
  coordinates: Coordinates | null;
  locationPermission: "undetermined" | "granted" | "denied" | "unavailable";
  locationLoading: boolean;
  locationError: string | null;
  fallbackArea: string | null;
  recentSearches: string[];
  hasSupabaseConfig: boolean;
  session: SupabaseSession | null;
  authLoading: boolean;
  refresh: () => Promise<void>;
  refreshPlace: (placeId: string) => Promise<void>;
  requestNearby: () => Promise<Coordinates | null>;
  setFallbackArea: (area: string) => Promise<void>;
  addRecentSearch: (query: string) => Promise<void>;
  clearRecentSearches: () => Promise<void>;
  isSaved: (placeId: string) => boolean;
  toggleSaved: (placeId: string) => Promise<void>;
  sendEmailLink: (email: string, redirectTo: string) => Promise<void>;
  verifyEmailCode: (email: string, code: string) => Promise<void>;
  completeEmailLink: (url: string) => Promise<SupabaseSession>;
  adoptSession: (session: SupabaseSession) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<SupabaseSession>;
  requestPasswordRecovery: (email: string, redirectTo: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, redirectTo: string) => Promise<SupabaseSession | null>;
  signOut: () => Promise<void>;
  addConfirmations: (placeId: string, answers: ConfirmationAnswer[], reportSource: ReportSource, sourceUrl?: string) => Promise<ReportSubmissionResult>;
  updateSettings: (settings: LocalSettings) => Promise<void>;
};

const PlacesContext = createContext<PlacesContextValue | null>(null);

export function PlacesProvider({ children }: { children: ReactNode }) {
  const [places, setPlaces] = useState<Place[]>(useMockData ? mockPlaces : []);
  const [placeGroups, setPlaceGroups] = useState<PlaceGroup[]>([]);
  const [confirmations, setConfirmations] = useState<Confirmation[]>([]);
  const [savedPlaceIds, setSavedPlaceIds] = useState<string[]>([]);
  const [settings, setSettings] = useState<LocalSettings>(defaultSettings);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<PlacesContextValue["dataSource"]>(useMockData ? "mock" : "none");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [cacheExpired, setCacheExpired] = useState(false);
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const authRevision = useRef(0);
  const placeFetch = useRef<Promise<void> | null>(null);
  const placeRefreshes = useRef(new Map<string, Promise<void>>());
  const savedIds = useRef<string[]>([]);
  const savedRestore = useRef<Promise<void>>(Promise.resolve());
  const savedWrites = useRef<Promise<void>>(Promise.resolve());
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [locationPermission, setLocationPermission] = useState<PlacesContextValue["locationPermission"]>("undetermined");
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [fallbackArea, setFallbackAreaState] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const statusNow = useStatusClock(places);
  const currentPlaces = useMemo(() => places.map(place => ({ ...place, currentStatus: getCurrentStatus(place.currentStatus, statusNow) })), [places, statusNow]);

  const requestNearby = useCallback(async () => {
    setLocationLoading(true);
    setLocationError(null);
    try {
      const result = await requestDiscoveryLocation({
        hasServices: Location.hasServicesEnabledAsync,
        getPermission: async () => (await Location.getForegroundPermissionsAsync()).status,
        requestPermission: async () => (await Location.requestForegroundPermissionsAsync()).status,
        getCoordinates: async () => {
          const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          return { latitude: location.coords.latitude, longitude: location.coords.longitude };
        }
      });
      setLocationPermission(result.permission);
      setLocationError(result.error);
      setCoordinates(result.coordinates);
      return result.coordinates;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not find your location.";
      setLocationError(`${message} Choose an area instead.`);
      return null;
    } finally {
      setLocationLoading(false);
    }
  }, []);

  const loadRemote = useCallback((refresh = false, background = false) => {
    if (placeFetch.current) return placeFetch.current;
    const task = (async () => {
    if (useMockData) {
      setPlaces(mockPlaces);
      setDataSource("mock");
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (!supabaseApi.hasConfig) {
      setError("Supabase is not configured for this build.");
      setLoading(false);
      setRefreshing(false);
      return;
    }
    refresh ? setRefreshing(true) : setLoading(!background);
    setError(null);
    try {
      const next = await supabaseApi.fetchPlaceData();
      const fetchedAt = new Date().toISOString();
      setPlaces(next.places);
      setPlaceGroups(next.groups);
      setDataSource("live");
      setLastUpdatedAt(fetchedAt);
      setCacheExpired(false);
      await mobileStorage.writePlaceDataCache({
        schemaVersion: PLACE_CACHE_SCHEMA_VERSION,
        fetchedAt,
        places: next.places,
        groups: next.groups
      }).catch(() => undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load places.");
      const cached = await mobileStorage.readPlaceDataCache().catch(() => null);
      if (cached) {
        setPlaces(cached.cache.places);
        setPlaceGroups(cached.cache.groups);
        setDataSource("cache");
        setLastUpdatedAt(cached.cache.fetchedAt);
        setCacheExpired(cached.expired);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    })();
    placeFetch.current = task;
    const release = () => { if (placeFetch.current === task) placeFetch.current = null; };
    void task.then(release, release);
    return task;
  }, []);

  const refreshPlace = useCallback((placeId: string) => {
    const existing = placeRefreshes.current.get(placeId);
    if (existing) return existing;
    if (useMockData) return Promise.resolve();
    const task = (async () => {
      await placeFetch.current;
      const next = await supabaseApi.fetchPlace(placeId);
      setPlaces(current => next
        ? current.some(place => place.id === placeId) ? current.map(place => place.id === placeId ? next : place) : [...current, next]
        : current.filter(place => place.id !== placeId));
    })();
    placeRefreshes.current.set(placeId, task);
    const release = () => { if (placeRefreshes.current.get(placeId) === task) placeRefreshes.current.delete(placeId); };
    void task.then(release, release);
    return task;
  }, []);

  useEffect(() => {
    let active = true;
    void mobileStorage.readSettings().then((storedSettings) => {
      if (!active) return;
      setSettings(storedSettings);
      setSettingsLoaded(true);
    }).catch(() => {
      // A storage failure must not replace a saved diagnostics choice.
    });
    const restore = <T,>(read: Promise<T>, apply: (value: T) => void) => {
      void read.then(value => { if (active) apply(value); }).catch(() => undefined);
    };
    savedRestore.current = mobileStorage.readSavedPlaceIds().then(ids => {
      if (!active) return;
      savedIds.current = ids;
      setSavedPlaceIds(ids);
    }).catch(() => undefined);
    restore(mobileStorage.readConfirmations(), setConfirmations);
    restore(mobileStorage.readRecentSearches(), setRecentSearches);
    restore(mobileStorage.readFallbackArea(), setFallbackAreaState);
    void mobileStorage.readPlaceDataCache().catch(() => null).then(cached => {
      if (!active) return;
      if (cached && !useMockData) {
        setPlaces(cached.cache.places);
        setPlaceGroups(cached.cache.groups);
        setDataSource("cache");
        setLastUpdatedAt(cached.cache.fetchedAt);
        setCacheExpired(cached.expired);
        setLoading(false);
      }
      void loadRemote(false, Boolean(cached));
    });
    const restoreRevision = authRevision.current;
    Promise.resolve(supabaseApi.readSession()).then((storedSession) => {
      if (active && restoreRevision === authRevision.current) setSession(storedSession);
    }).catch(() => {
      // A failed restore must not replace an account action made while waiting.
    }).finally(() => {
      if (active) setAuthLoading(false);
    });
    return () => {
      active = false;
    };
  }, [loadRemote]);

  const value = useMemo<PlacesContextValue>(
    () => ({
      places: currentPlaces,
      placeGroups,
      confirmations,
      savedPlaceIds,
      settings,
      settingsLoaded,
      loading,
      refreshing,
      error,
      dataSource,
      lastUpdatedAt,
      cacheExpired,
      coordinates,
      locationPermission,
      locationLoading,
      locationError,
      fallbackArea,
      recentSearches,
      hasSupabaseConfig: supabaseApi.hasConfig && !useMockData,
      session,
      authLoading,
      refresh: () => loadRemote(true),
      refreshPlace,
      requestNearby,
      setFallbackArea: async (area) => {
        setFallbackAreaState(area);
        await mobileStorage.writeFallbackArea(area);
      },
      addRecentSearch: async (query) => {
        const clean = query.trim();
        if (!clean) return;
        const next = mergeRecentSearches(recentSearches, clean);
        setRecentSearches(next);
        await mobileStorage.writeRecentSearches(next);
      },
      clearRecentSearches: async () => {
        setRecentSearches([]);
        await mobileStorage.writeRecentSearches([]);
      },
      isSaved: (placeId) => savedPlaceIds.includes(placeId),
      toggleSaved: (placeId) => {
        const write = savedWrites.current.then(async () => {
          await savedRestore.current;
          const next = savedIds.current.includes(placeId)
            ? savedIds.current.filter(id => id !== placeId)
            : [...savedIds.current, placeId];
          await mobileStorage.writeSavedPlaceIds(next);
          savedIds.current = next;
          setSavedPlaceIds(next);
          captureEvent("place_saved", { saved: next.includes(placeId) });
        });
        savedWrites.current = write.catch(() => undefined);
        return write;
      },
      sendEmailLink: (email, redirectTo) => supabaseApi.sendEmailLink(email, redirectTo),
      requestPasswordRecovery: (email, redirectTo) => supabaseApi.requestPasswordRecovery(email, redirectTo),
      updatePassword: (password) => supabaseApi.updatePassword(password),
      signInWithEmail: async (email, password) => {
        const nextSession = await supabaseApi.signInWithEmail(email, password);
        authRevision.current += 1;
        setSession(nextSession);
        return nextSession;
      },
      registerWithEmail: async (email, password, redirectTo) => {
        const nextSession = await supabaseApi.registerWithEmail(email, password, redirectTo);
        if (nextSession) {
          authRevision.current += 1;
          setSession(nextSession);
        }
        return nextSession;
      },
      verifyEmailCode: async (email, code) => {
        const nextSession = await supabaseApi.verifyEmailCode(email, code);
        authRevision.current += 1;
        setSession(nextSession);
      },
      completeEmailLink: async (url) => {
        const nextSession = new URL(url).searchParams.has("code")
          ? await completeGoogleCallback(url)
          : await supabaseApi.completeEmailLink(url);
        authRevision.current += 1;
        setSession(nextSession);
        return nextSession;
      },
      adoptSession: async (nextSession) => {
        await mobileStorage.writeSession(nextSession);
        authRevision.current += 1;
        setSession(nextSession);
      },
      signOut: async () => {
        authRevision.current += 1;
        try { await supabaseApi.signOut(); }
        finally {
          setSession((current) => current?.refreshToken === session?.refreshToken ? null : current);
        }
      },
      addConfirmations: async (placeId, answers, reportSource, sourceUrl) => {
        if (!supabaseApi.hasConfig || useMockData) throw new Error("Reporting needs a connection to Supabase. Demo reports are not submitted.");
        let result: ReportSubmissionResult;
        try {
          result = await supabaseApi.submitConfirmations({ placeId, answers, reportSource, sourceUrl });
        } catch (cause) {
          setSession(await supabaseApi.readSession());
          throw cause;
        }
        const submitted = result.confirmations;
        const next = [...submitted, ...confirmations];
        setConfirmations(next);
        try {
          await refreshPlace(placeId);
        } catch {
          setError("Your report was received. Refresh to load the place status.");
        }
        await mobileStorage.writeConfirmations(next).catch(() => undefined);
        captureEvent("report_submitted", { outcome: result.outcome, answer_count: answers.length, source: reportSource });
        return result;
      },
      updateSettings: async (next) => {
        await mobileStorage.writeSettings(next);
        setSettings(next);
      }
    }),
    [authLoading, cacheExpired, confirmations, coordinates, currentPlaces, dataSource, error, fallbackArea, lastUpdatedAt, loadRemote, loading, locationError, locationLoading, locationPermission, placeGroups, places, recentSearches, refreshing, refreshPlace, requestNearby, savedPlaceIds, session, settings, settingsLoaded]
  );

  return <PlacesContext.Provider value={value}>{children}</PlacesContext.Provider>;
}

export function usePlaces() {
  const context = useContext(PlacesContext);
  if (!context) throw new Error("usePlaces must be used within PlacesProvider");
  return context;
}
