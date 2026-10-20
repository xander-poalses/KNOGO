# Background Fuel Prices

Status: implemented and enabled for non-commercial tests on 19 October 2026. Hosted source work, daily lock and client parsing/calculation verified. No Gemini call, paid provider or billing change. Device and next-calendar-day checks remain; see `docs/FUEL_DATA_SETUP.md`.

## Intent

Check South African fuel publications every day. The first person opening KNOGO triggers the day's check for everyone, without a sign-in requirement. Fetch and extraction happen on the server, not on the phone or the user's PC. Users see prices, not a Gemini workflow. Show exactly `Getting prices` when there is no price to show and a read/update is in progress.

The user requires no spending. Keep billing off; do not subscribe to a data service, start a trial, enable Google Search grounding or change Gemini models. Source access, rights and existing project capacity must be verified before activation. No claim of unlimited capacity or government-source uptime is made.

## Existing Code To Reuse

- `packages/core/src/fuelFeed.ts`: feed validation, unit conversion and device caching.
- `packages/core/src/trip.ts`: grades, regions, reference types, overrides and trip calculations.
- `apps/mobile/src/fuelFeed.ts`: client adapter and configuration gate.
- `apps/mobile/src/state/FuelContext.tsx`: app-wide price state and preferences.
- `apps/mobile/src/components/TripPlanner.tsx`: price selection and estimate updates.
- Existing Supabase Edge worker, server RPC and atomic provider-quota patterns. Keep report processing and its limits working.

The current client refreshes prices during a trip request, not when the app opens. It also accepts only a configured JSON feed with published start/end timestamps. A government document is not such a feed: a server ingestion path is required.

## Server Flow

1. On app entry/foreground, fetch KNOGO's shared price snapshot without blocking navigation, sign-in or place loading. Coalesce overlapping reads within a client.
2. The server derives the date using `Africa/Johannesburg`. A database lock allows one refresh claim per date across devices and accounts. The client cannot supply a date, source URL, model, price or force flag that bypasses it.
3. Return any usable stored prices plus a bounded update state. The claimed update continues through the server's supported background-task mechanism after the response. Closing the app does not cancel the server work, though server execution limits and outages can still stop it.
4. Fetch the configured government index and the relevant publication using fixed source rules. Bound download size, redirect count, execution time and decompression size. Allow only reviewed HTTPS hosts, including each redirect destination. Do not follow arbitrary links or search the web through Gemini.
5. Hash the document bytes. If the document is unchanged and the prior extraction remains usable, update the successful source-check time without another Gemini call. Never use a page timestamp or HTTP success alone as evidence that prices are current.
6. Source inspection found a structured Word table inside the ZIP. Parse that table with code, with no Gemini request. Match its headings, dates, units, grades and regions; reject a changed or ambiguous layout. Do not silently fall back to a model or another provider.
7. Validate parsed rows before publishing. Numeric values, units, grade/region mapping and effective dates must agree with the retrieved table and index. Reject ambiguity, forecasts, unsupported values and partial replacement that would hide a validation failure. Do not send account details, location, reports or profiles upstream.
8. Commit the validated snapshot atomically. Preserve a bounded pending snapshot for an announced future effective date; serve it only when that date arrives. This must not require another visitor or Gemini call at midnight.
9. Record only the last attempt, last successful check, source hashes/URLs, state and error code. Do not retain a daily job archive, full documents, prompts or provider transcripts in Supabase.

One claimed refresh run and at most one Gemini extraction request per South African day. No automatic retry or client refresh may create a second extraction that day. A failed or interrupted run becomes eligible again the next day; this favours the user's request cap over same-day recovery. Manual intervention would need a separate decision, not an exposed app bypass.

The first implementation makes zero Gemini calls and does not touch report-review quotas or secrets. Any later model fallback needs a separate decision and must share the project's aggregate ceilings. Do not enable billing or silently switch model/provider.

## Price Meaning And Validity

- Supported grades remain petrol 93/95 and diesel 50/500 ppm; regions remain inland/coastal.
- Petrol is a retail reference. Diesel is a wholesale reference, not a claim about a garage's pump price. Never fabricate a grade/region pair absent from the source.
- Keep the source URL and effective date with each value, with attribution available from the price details. Do not copy logos, images or a whole government document into the app.
- An announcement of a price change is not the effective date. Do not apply increases or decreases before they take effect.
- Do not invent an end date from an expected first Wednesday. If the document says a price applies until replaced, support that explicitly in the shared record contract, with a separate checked-at freshness rule. Update the parser, cache version and every consumer together; do not weaken existing validation by supplying a fabricated expiry.
- Retain only the active set, the next announced set and the singleton refresh state. Replace superseded sets; bound the number of rows independently of user count. Keep document hashes only while needed to interpret those sets.
- A failed check must not refresh `checkedAt`. A price that cannot be established as in effect must not be labelled current or used as an automatic trip-price reference. The previous amount may be labelled as last checked; manual price entry remains available.
- Keep the user's price override ahead of any reference price. Never overwrite a fuel grade, region, consumption figure or override while refreshing.

## User Experience

- With a price already available: keep it visible during a background check. Replace it in place only after validation. No modal, toast announcing Gemini, progress page or app-start blocker.
- Without a price: show `Getting prices` in the price area while loading. This is not the route-loading state; distance and route work remain usable without a fuel amount.
- Bound refresh-status polling and stop on completion, failure, timeout, app backgrounding or unmount. Only screen-visible consumers need to poll. Polling is a snapshot read, not another upstream request.
- If there is still no usable reference after failure: stop the loading state and show `Price unavailable`, keeping price entry available. Never leave `Getting prices` running indefinitely.
- Keep source/date and diesel-basis details accessible without making the main trip screen text-heavy. Do not claim that yesterday's unchecked price was verified today.

## Security And Scope

Use private state and server-only claim/finish functions with explicit grants and empty search paths. Public clients can read the price snapshot and request the bounded daily check, but cannot write prices, reset the date/lease, choose upstream URLs or obtain provider credentials. Protect the public trigger against repeated work and bound its response, including for guests.

Keep Gemini's existing `GEMNINI_API_KEY` spelling server-side. Do not browse credentials, read secret values through tools or request passwords/keys in chat. Do not add another scheduler, provider account, dashboard, fuel history feature or trust-policy change as part of this task. Preserve unrelated work in the checkout.

## Activation Gates And Evidence

Before activation, check publication ownership and reuse terms, including third-party CEF material, automated retrieval, attribution and device cache. Non-commercial permission is not permission for a monetised release. No transmission to Gemini is needed for this implementation.

Source inspection on 19 October 2026: the index's `https://bit.ly/4rPpgud` resolves to `https://www.dmpr.gov.za/API/Evotiva-UserFiles/FileActionsServices/DownloadFile?ItemId=3501&ModuleId=2305&TabId=154`. A bounded HTTPS GET returned HTTP 200 and 576,486 bytes. HEAD returns 405. The archive has nine entries: five DOCX, one XLSX and three PDF files. `Breakdown of Prices October 2026.docx` contains a Word table with four petrol rows (93/95 inland/coastal), two diesel rows (500/50 ppm inland), and other products to ignore. Dates are 07 October 2026 and amounts are cents/litre. The workbook identifies petrol as pump prices and diesel as wholesale prices; its zone amounts are not interchangeable with broad region references. Do not derive coastal diesel by subtracting a transport differential or silently choosing a zone. The breakdown does not publish an expiry, so open-ended validity plus a source-freshness limit is required. Inspection proves retrieval and structure, not permission for every use or future source availability.

Tests must cover concurrent first opens, the SAST date boundary, no same-day bypass/retry, unchanged document hashes, shared provider caps, invalid source/redirects, timeouts and size limits, malformed extraction, wrong units, petrol/diesel basis, future changes, open-ended validity, failure without timestamp extension, overrides, bounded storage and loading-state cleanup.

Use disposable SQL tests before hosted migrations. Verify public read/write boundaries, one shared refresh across accounts, a server update after the initiating app closes, and the visible price after validation. Mocks are not source/provider/device proof. Keep activation disabled if source rights, retrieval, free-tier capacity or validation cannot be established.

## Sources Checked On 19 October 2026

- [DMPR fuel publications](https://www.dmpr.gov.za/Branches/Petroleum-Resources/Fuel-Prices): index and dated announcements; not a JSON feed or a guaranteed availability contract.
- [DMPR terms](https://www.dmpr.gov.za/Terms-Conditions): non-commercial reuse conditions and attribution; third-party rights are excluded.
- [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing): Gemini 3.5 Flash-Lite Standard input/output has a free tier; Search grounding is not listed as available on that free tier. Do not enable it for this design.
- [Supabase background tasks](https://supabase.com/docs/guides/functions/background-tasks): supported background work has execution limits; closing the app and server uptime are separate concerns.

Execution and remaining checks: `docs/superpowers/plans/2026-10-19-fuel-execution.md` and `docs/FUEL_DATA_SETUP.md`.
