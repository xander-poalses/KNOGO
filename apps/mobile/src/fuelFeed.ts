import AsyncStorage from "@react-native-async-storage/async-storage";
import { createFuelFeed } from "@knogo/core";
import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra as { supabaseUrl?: string; supabasePublishableKey?: string } | undefined;
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || extra?.supabaseUrl || "";
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || extra?.supabasePublishableKey || "";

export const fuelFeed = createFuelFeed({
  feedUrl: url ? `${url.replace(/\/$/, "")}/functions/v1/fuel-prices` : "",
  termsUrl: "https://www.dmpr.gov.za/Terms-Conditions",
  maxCacheAgeSeconds: 48 * 3600,
  termsConfirmed: true
}, AsyncStorage, (input, init) => fetch(input, { ...init, headers: { ...init?.headers, apikey: key } }));
