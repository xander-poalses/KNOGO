// Imports
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import type { SupabaseSession } from "@knogo/core";
import { mobileStorage } from "../storage";

// State and Helpers
const extra = Constants.expoConfig?.extra as { supabaseUrl?: string; supabasePublishableKey?: string } | undefined;
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || extra?.supabaseUrl;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || extra?.supabasePublishableKey;
export const googleSignInEnabled = process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED === "true" && Boolean(url && key);
export const googleSignInSupported = Platform.OS === "web" || Constants.executionEnvironment !== "storeClient";
// Types
type GoogleRequest = { url: string; redirectTo: string; flowId: string | null };
let client: SupabaseClient | null = null;
const exchanges = new Map<string, Promise<SupabaseSession>>();

// Functions
function getClient() {
  if (!url || !key) throw new Error("Account access is not configured.");
  if (Platform.OS !== "web") {
    const crypto = globalThis.crypto ?? {} as globalThis.Crypto;
    if (!crypto.getRandomValues) Object.defineProperty(crypto, "getRandomValues", { value: Crypto.getRandomValues });
    if (!crypto.subtle) Object.defineProperty(crypto, "subtle", { value: {
      digest: (algorithm: string, data: BufferSource) => {
        if (algorithm !== "SHA-256") throw new Error("Unsupported digest.");
        return Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data);
      }
    } });
    if (!globalThis.crypto) Object.defineProperty(globalThis, "crypto", { value: crypto });
  }
  client ??= createClient(url, key, { auth: {
    flowType: "pkce", autoRefreshToken: false, detectSessionInUrl: false,
    persistSession: true, storageKey: "knogo.oauth",
    storage: {
      getItem: key => key.endsWith("-code-verifier") ? AsyncStorage.getItem(key) : Promise.resolve(null),
      setItem: (key, value) => key.endsWith("-code-verifier") ? AsyncStorage.setItem(key, value) : Promise.resolve(),
      removeItem: key => key.endsWith("-code-verifier") ? AsyncStorage.removeItem(key) : Promise.resolve()
    }
  }, global: { fetch: async (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try { return await fetch(input, { ...init, signal: controller.signal }); }
    finally { clearTimeout(timer); }
  } } });
  return client;
}

export async function prepareGoogleSignIn(reportPlaceId?: string, venuePlaceId?: string): Promise<GoogleRequest> {
  if (!googleSignInEnabled) throw new Error("Google sign-in is not configured.");
  if (!googleSignInSupported) throw new Error("Google sign-in needs a KNOGO development build.");
  const redirectTo = Linking.createURL("auth/callback", { queryParams: venuePlaceId ? { venue: venuePlaceId } : reportPlaceId
    ? { intent: "review", placeId: reportPlaceId } : { intent: "account" } });
  const { data, error } = await getClient().auth.signInWithOAuth({ provider: "google", options: {
    redirectTo, skipBrowserRedirect: true, queryParams: { prompt: "select_account" }
  } });
  if (error || !data.url || new URL(data.url).searchParams.get("code_challenge_method") !== "s256") {
    throw new Error("Could not prepare Google sign-in. Try again.");
  }
  return { url: data.url, redirectTo, flowId: data.flowId ?? null };
}

export function completeGoogleCallback(callbackUrl: string, flowId?: string | null): Promise<SupabaseSession> {
  const params = new URL(callbackUrl).searchParams;
  const code = params.get("code");
  if (params.has("error") || !code) return Promise.reject(new Error("Google sign-in did not finish. Try again."));
  const existing = exchanges.get(code);
  if (existing) return existing;
  const exchange = (async () => {
    const { data, error } = await getClient().auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
    if (error || !data.session) throw new Error("Google sign-in expired or could not be verified. Try again.");
    const returned = data.session;
    const session: SupabaseSession = { accessToken: returned.access_token, refreshToken: returned.refresh_token,
      userId: returned.user.id, email: returned.user.email ?? "", expiresAt: returned.expires_at ?? Math.floor(Date.now() / 1000) + returned.expires_in };
    await mobileStorage.writeSession(session);
    return session;
  })();
  exchanges.set(code, exchange);
  void exchange.finally(() => { setTimeout(() => exchanges.delete(code), 30_000); }).catch(() => undefined);
  return exchange;
}

export async function openGoogleSignIn(request: GoogleRequest): Promise<SupabaseSession | null> {
  const result = await WebBrowser.openAuthSessionAsync(request.url, request.redirectTo);
  if (result.type !== "success") return null;
  const expected = new URL(request.redirectTo), returned = new URL(result.url);
  if (expected.protocol !== returned.protocol || expected.host !== returned.host || expected.pathname !== returned.pathname) {
    throw new Error("Google sign-in returned to a different address. Try again.");
  }
  return completeGoogleCallback(result.url, request.flowId);
}

export const completeBrowserAuthPopup = () => WebBrowser.maybeCompleteAuthSession();
