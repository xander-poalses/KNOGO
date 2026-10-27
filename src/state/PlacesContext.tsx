import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type React from "react";
import { toast } from "sonner";
import { applyConfirmation, getCurrentStatus, mockPlaces } from "@knogo/core";
import { useStatusClock } from "./useStatusClock";
import { fetchSupabasePlace, fetchSupabasePlaceGroups, fetchSupabasePlaces, hasSupabaseConfig, submitSupabaseConfirmation } from "../lib/supabaseApi";
import type { Confirmation, ConfirmationType, Place, PlaceGroup } from "@knogo/core/types/place";
import {
  readConfirmations,
  readSavedPlaceIds,
  readSettings,
  writeConfirmations,
  writeSavedPlaceIds,
  writeSettings,
  type LocalSettings
} from "../utils/storage";

type PlacesContextValue = {
  places: Place[];
  placeGroups: PlaceGroup[];
  confirmations: Confirmation[];
  savedPlaceIds: string[];
  settings: LocalSettings;
  isSaved: (placeId: string) => boolean;
  toggleSaved: (placeId: string) => void;
  addConfirmation: (placeId: string, type: ConfirmationType, value: string) => Promise<void>;
  refreshPlace: (placeId: string) => Promise<void>;
  updateSettings: (settings: LocalSettings) => void;
};

const PlacesContext = createContext<PlacesContextValue | null>(null);

export function PlacesProvider({ children }: { children: React.ReactNode }) {
  const [places, setPlaces] = useState<Place[]>(mockPlaces);
  const [placeGroups, setPlaceGroups] = useState<PlaceGroup[]>([]);
  const [confirmations, setConfirmations] = useState<Confirmation[]>(readConfirmations);
  const [savedPlaceIds, setSavedPlaceIds] = useState<string[]>(readSavedPlaceIds);
  const [settings, setSettings] = useState<LocalSettings>(readSettings);
  const statusNow = useStatusClock(places);
  const currentPlaces = useMemo(() => places.map(place => ({ ...place, currentStatus: getCurrentStatus(place.currentStatus, statusNow) })), [places, statusNow]);
  const refreshPlace=useCallback(async(placeId:string)=>{
    if(!hasSupabaseConfig)return;
    const place=await fetchSupabasePlace(placeId);
    if(place)setPlaces(current=>current.map(item=>item.id===placeId?place:item));
  },[]);

  useEffect(() => {
    let cancelled = false;

    if (!hasSupabaseConfig) return undefined;

    Promise.all([fetchSupabasePlaces(), fetchSupabasePlaceGroups()])
      .then(([nextPlaces, nextGroups]) => {
        if (!cancelled) {
          setPlaces(nextPlaces);
          setPlaceGroups(nextGroups);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Could not load Supabase places. Falling back to local data.", error);
        toast.error("Places could not refresh", { id: "places-load", description: "Showing demo data. Reports may be out of date.", duration: Infinity });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (settings.theme !== "system") {
      document.documentElement.dataset.theme = settings.theme;
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applySystemTheme = () => {
      document.documentElement.dataset.theme = media.matches ? "dark" : "light";
    };

    applySystemTheme();
    media.addEventListener("change", applySystemTheme);
    return () => media.removeEventListener("change", applySystemTheme);
  }, [settings.theme]);

  const value = useMemo<PlacesContextValue>(
    () => ({
      places: currentPlaces,
      placeGroups,
      confirmations,
      savedPlaceIds,
      settings,
      refreshPlace,
      isSaved: (placeId) => savedPlaceIds.includes(placeId),
      toggleSaved: (placeId) => {
        const saved = savedPlaceIds.includes(placeId);
        setSavedPlaceIds((current) => {
          const next = current.includes(placeId) ? current.filter((id) => id !== placeId) : [...current, placeId];
          writeSavedPlaceIds(next);
          return next;
        });
        toast.success(saved ? "Removed from saved" : "Place saved", { id: `saved-${placeId}` });
      },
      addConfirmation: async (placeId, type, value) => {
        const fallbackConfirmation: Confirmation = {
          id: `${placeId}-${type}-${Date.now()}`,
          placeId,
          type,
          value,
          createdAt: new Date().toISOString(),
          locationVerified: false,
          source: "user"
        };
        const confirmation = hasSupabaseConfig
          ? await submitSupabaseConfirmation({ placeId, type, value })
          : fallbackConfirmation;

        setConfirmations((current) => {
          const next = [confirmation, ...current];
          writeConfirmations(next);
          return next;
        });
        setPlaces((current) => current.map((place) => applyConfirmation(place, confirmation)));
      },
      updateSettings: (nextSettings) => {
        setSettings(nextSettings);
        writeSettings(nextSettings);
      }
    }),
    [confirmations, currentPlaces, placeGroups, places, refreshPlace, savedPlaceIds, settings]
  );

  return <PlacesContext.Provider value={value}>{children}</PlacesContext.Provider>;
}

export function usePlaces() {
  const context = useContext(PlacesContext);
  if (!context) throw new Error("usePlaces must be used within PlacesProvider");
  return context;
}
