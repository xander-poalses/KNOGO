// Imports
import { createVenueClaimHandler } from "../_shared/venueClaims.ts";
import { serverRpc } from "../_shared/server.ts";

// State and Helpers
const url = Deno.env.get("SUPABASE_URL") ?? "";
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(createVenueClaimHandler({
  origins: (Deno.env.get("VENUE_ALLOWED_ORIGINS") ?? "").split(",").map((value) => value.trim()).filter(Boolean),
  authenticate: async (token) => {
    if (!url || !key) throw new Error("configuration_missing");
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000)
    });
    if (response.status === 401 || response.status === 403) return null;
    if (!response.ok) throw new Error("auth_unavailable");
    const user = await response.json();
    if (typeof user?.id !== "string") return null;
    return { id: user.id, is_anonymous: user.is_anonymous === true };
  },
  rpc: (name, args) => serverRpc(url, key, name, args),
  delivery: null
}));
