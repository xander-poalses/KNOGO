import Constants from "expo-constants";
import { createSupabaseApi } from "@knogo/core";
import { mobileStorage } from "./storage";
import { testerBuild, testerFeedbackEnabled } from "./testing";

const extra = Constants.expoConfig?.extra as
  | { supabaseUrl?: string; supabasePublishableKey?: string }
  | undefined;

export const useMockData = process.env.EXPO_PUBLIC_USE_MOCK_DATA === "true";

export const supabaseApi = createSupabaseApi({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL || extra?.supabaseUrl,
  publishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || extra?.supabasePublishableKey,
  venueClaimUrl: process.env.EXPO_PUBLIC_VENUE_CLAIM_API_URL,
  allowGuestReporting: testerBuild,
  allowTesterFeedback: testerFeedbackEnabled,
  sessionStorage: {
    read: mobileStorage.readSession,
    write: mobileStorage.writeSession,
    clear: mobileStorage.clearSession
  }
});
