# R0 trip preview setup

## Hosted state, 2 October 2026

The user authorised trip deployment on 2 October. The trip-only migration is applied to project ivzofixdjcgkwalfzmmy and trip-planner v1 is ACTIVE. The function checks the app's publishable/anon key in its body; platform JWT verification is off so guest planning works. This key is public, not account authentication. Global caps bound provider usage but do not prevent quota depletion by abuse.

Chrome dashboard access allowed configuration of ORS_FREE_TIER_CONFIRMED=true and localhost/127.0.0.1:8081 origins without reading the ORS key. Both provider rows are enabled at 100 per UTC day / 10 per rolling minute. The user confirms no payment details; the Supabase organisation shows FREE. No upgrades or billing changes were made. Account-specific commercial-release terms remain a pre-release review item.

Hosted tests: Menlyn search returns HTTP 200. A route between public Pretoria coordinates returns HTTP 200, 8,171.1 outbound metres, 853.9 outbound seconds, 7,349 return metres and 132 path points. Missing app key returns 401; an unapproved Origin returns 403. Database permissions confirm anon/authenticated cannot execute the reservation RPC and service_role can. Counters recorded one address and two route reservations. No reports or live-status records were changed.

apps/mobile/.env.local contains EXPO_PUBLIC_TRIP_API_URL. Restart Expo to load it, then test UI/maps on device. Provider HTTP tests do not confirm map rendering or GPS permissions. Five handler tests cover admission and quota failures; root TypeScript passes.

The provider FAQ confirms quotas reset 24 hours after the first request, with a sliding 60-second minute limit. KNOGO's UTC-day cap can allow at most 200 calls within that provider window, below the shown 2,000 directions / 3,000 geocoding allowance when the key is not used elsewhere. Source: https://giscience.github.io/openrouteservice/v9.10.0/frequently-asked-questions

Security advisor review: the three trip tables have RLS with no user policies by design. Existing authenticated report/kitchen RPC and password-protection notices were not changed. Their review remains in the release path. Informational RLS notice: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

The sections below record the preparation and deployment procedure. Statements that deployment had not run describe the preparation state; this hosted-state section supersedes them.

## Scope

Android testing uses react-native-maps in Expo Go. Browser testing uses Leaflet 1.9.4 with OpenStreetMap tiles. openrouteservice supplies addresses, road distance, duration and outbound route coordinates. There is no Mapbox integration, billing setup, paid fallback or deployment in this change.

R0 means staying on accounts without payment details and accepting service limits, not unlimited hosting. Supabase function and database allowances also apply. Do not upgrade the Supabase plan for this feature.

## Code behaviour

The adapter uses api.heigit.org/openrouteservice/v2/directions and api.heigit.org/pelias/v1/search. The provider's 28 April 2026 announcement retires api.openrouteservice.org during 2-6 November 2026. Existing keys work on the replacement endpoints. Account quotas shown in the dashboard apply to api.heigit.org. Source: https://ask.openrouteservice.org/t/deprecating-api-openrouteservice-org-in-favour-of-api-heigit-org/7912

- Requests happen on Search address or Estimate trip, not on each keystroke.
- Device coordinates remain in request memory. They are not saved to Supabase or analytics. The routing provider receives the origin and destination to calculate the route; the tile provider sees the requested map area.
- Only a provider-returned road path is drawn. No straight-line substitute is used for distance or fuel cost.
- A return route consumes another route request. If unavailable, the existing estimate labels its doubled-distance assumption; the map shows only the outbound path.
- Map loading is bounded. Failure removes the map container and offers Retry map. Route figures remain available if only tiles fail.
- Native loading waits for onMapLoaded, not just onMapReady. Expo Go phone testing is still required.
- Fuel price and consumption come from the user's Settings when no price feed is configured. Missing inputs never become R0 estimates.
- The provider key stays in an Edge Function secret. EXPO_PUBLIC variables must never contain it or the service-role key.

## User steps

1. Create an openrouteservice account at https://account.heigit.org/. Do not add payment details or choose a paid plan.
2. Check the account's plan, route and geocoding allowances, commercial-use terms and attribution requirements. The account screen is the authority. Record the allowance before enabling requests. Never enable a paid fallback.
3. Create an API key. Put it in Supabase Dashboard > Edge Functions > Secrets as ORS_API_KEY. Do not paste it into chat, commit it or put it in Expo variables.
4. After the plan check, add ORS_FREE_TIER_CONFIRMED=true and TRIP_ALLOWED_ORIGINS=http://localhost:8081,http://127.0.0.1:8081. Add other development origins only when needed.
5. Review and apply only `supabase/migrations/20261001221614_trip_provider_caps.sql` for this feature. It supplies `reserve_trip_provider_call` and the `knogo_trip_private` cap tables. It does not require or change the trust/reporting migration. Do not run a blanket migration push while unrelated migrations remain pending.
6. Deploy trip-planner with gateway JWT verification disabled for this anonymous planning endpoint. Browser origins are checked in the function; CORS is not authentication. Server reservations bound total provider usage. The endpoint can still be exhausted by abuse, which stops estimates rather than creating paid requests.
7. After confirming the quota reset period and terms, enable routes and addresses in `knogo_trip_private.provider_limits`. Both have ceilings of 100 per UTC day and 10 per rolling minute. Reduce them if the account allowance requires it. Leave `knogo_private.provider_limits` and Gemini unchanged. These are shared application caps, not per-user allowances.
8. In apps/mobile/.env.local add EXPO_PUBLIC_TRIP_API_URL=https://YOUR_PROJECT.supabase.co/functions/v1/trip-planner. Preserve the existing Supabase configuration. Restart Metro to load it.
9. In Settings, enter consumption in L/100 km and your pump price in rand per litre. Then open a place > Plan your trip, choose the origin and tap Estimate trip.

These deployment steps are not run by this implementation. Project access, plan confirmation, the key and hosted schema readiness are still required.

## Migration review, 2 October 2026

User screenshots show Directions 2,000 per quota period / 40 per minute and Geocoding 3,000 per quota period / 100 per minute. The reset period and plan name are not shown. The user confirms no payment details were added. This is not confirmation of all account terms; requests stay disabled.

The trip migration has no dependencies on places, reports, confirmations, live status, venue claims or Gemini. The Edge Function uses its reservation RPC rather than the trust migration's RPC. RLS is enabled on its three tables; PUBLIC, anon and authenticated have no access. Only service_role receives RPC execution. The definer function has an empty search path and schema-qualified references. A per-provider row lock serialises reservations. Failed provider calls consume their reservation; quota rejections do not. No origin, address, account, key or route is stored in these tables.

In-memory Postgres QA passes for standalone creation, permissions, disabled defaults, hard ceilings, minute and day rejection, UTC day reset without bypassing the minute window, reapplication without counter resets and disabling requests. PGlite runs in one process; simultaneous requests across hosted database connections remain a release QA item. The migration is repeatable, but `IF NOT EXISTS` does not validate an unknown pre-existing table definition: inspect any conflicting objects before deploying.

Kill switch after deployment: set both trip provider rows to enabled=false, or set ORS_FREE_TIER_CONFIRMED=false. Do not delete counters as rollback; that would reset usage. This pass has made no hosted changes.

## QA

- Try an address in Pretoria, then device location. Deny permission and check address entry still works.
- Check one-way and return estimates, departure changes, route shape, kilometres and fuel maths.
- Check browser attribution remains visible and Android map gestures do not block scrolling.
- Disconnect the network, try again, then reconnect. Failed maps must not leave a blank container. Failed routes must not leave an old estimate.
- Disable the provider rows and confirm requests fail without calling ORS. Restore only the reviewed limits.
- Check small/large phones, both themes and text scaling in Expo Go.
- Check ORS dashboard usage against KNOGO reservations. Count return requests as separate calls.

## Map hosting limits

The trip planner no longer includes a route map. Leaflet and its stylesheet have been removed. Branch selection keeps its map.

OSM tiles must retain attribution and normal HTTP caching. No offline download, bulk fetching, scraping or proxy hiding the app identity. Access has no SLA and can be withdrawn. Recheck tile hosting before public release. A Google Maps key and its own release setup are required for Android builds outside Expo Go.

Sources: https://operations.osmfoundation.org/policies/tiles/ ; https://leafletjs.com/ ; https://docs.expo.dev/versions/v57.0.0/sdk/map-view/ ; https://openrouteservice.org/restrictions/ ; https://supabase.com/docs/guides/functions/secrets
