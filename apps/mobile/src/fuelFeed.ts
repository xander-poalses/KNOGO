import AsyncStorage from "@react-native-async-storage/async-storage";
import { createFuelFeed } from "@knogo/core";

export const fuelFeed = createFuelFeed({
  feedUrl: process.env.EXPO_PUBLIC_FUEL_API_URL ?? "",
  termsUrl: process.env.EXPO_PUBLIC_FUEL_TERMS_URL ?? "",
  maxCacheAgeSeconds: Number(process.env.EXPO_PUBLIC_FUEL_CACHE_MAX_AGE_SECONDS),
  termsConfirmed: process.env.EXPO_PUBLIC_FUEL_DATA_TERMS_CONFIRMED === "true"
}, AsyncStorage);
