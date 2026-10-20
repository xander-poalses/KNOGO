# Fuel data setup and source review

Updated 19 October 2026. KNOGO now has code for a shared daily DMPR source check. Hosted activation and proof are recorded below. No paid provider, trial, billing account or API key is used. Prices are not bundled as defaults.

## DMPR Integration

The server reads the [DMPR index](https://www.dmpr.gov.za/Branches/Petroleum-Resources/Fuel-Prices), follows its reviewed ZIP link and reads the breakdown DOCX table. It does not use Gemini, Search grounding, PDF OCR or spreadsheet formulas. The October source download returned HTTP 200, 576,486 bytes, SHA-256 `7443da1f8f54d6a975eadf025aef7dadbc8e9e856b1409ae03a1654c637637ea`. The parsed document hash is `e52a7dcdca53b3156ecd934d555cca232a98caac52ec1bbc44dd38798ac0efb8`.

The [terms checked on 19 October](https://www.dmpr.gov.za/Terms-Conditions) permit reproduction without payment for non-commercial use with accuracy, acknowledgement, source URL and copyright status. The chosen breakdown document identifies the government source and contains no third-party copyright notice in its price text. This test integration copies numeric facts, not document files, photos, logos or third-party CEF publications. It makes no transmission to Gemini. Attribution appears in trip details. This is the source-use basis for this non-commercial test release, not permission to monetise or reuse third-party material. Review rights before commercial launch or switching documents.

- POST `/functions/v1/fuel-prices`, with no payload, reads and requests the daily check. GET only reads. Guests need no sign-in. The app uses its existing Supabase URL and public key; no new phone environment settings.
- The database owns the SAST date and permits one claim per day across accounts. Background work continues after the response. Failure does not enable same-day retry.
- Upstream limits: three redirects, 15 seconds per fetch, 60 seconds total, 2 MiB index, 10 MiB ZIP, 64 entries, 20 MiB declared expansion, 2 MiB selected XML/document. Actual selected output is counted too. Only the reviewed HTTPS source hosts/paths are accepted.
- Six references: petrol 93/95 inland/coastal and diesel 50/500 ppm inland. The breakdown does not supply coastal diesel; KNOGO never derives it from a zone or transport difference. Diesel is wholesale, not a pump quote.
- Feed and cache version 2 accepts an explicit null expiry. The source has no expiry; freshness is bounded to 48 hours since the last successful source check. A future announcement never becomes an automatic reference before its effective date. An old reference is not extended after a failed check.
- One private singleton stores at most two publications with six rows each, dates, hashes and one error code. No daily archive, ZIP, raw document, prompt, account, trip origin or location is saved.
- App entry/foreground requests the shared check. Visible price consumers poll GET at five-second intervals for at most 90 seconds; stop on background/unmount/completion/failure. Reference prices remain visible while checking. No reference while pending: `Getting prices`; failure: `Price unavailable`. Manual price entry always works and overrides references.

The historical provider audit below records rejected alternatives, not active connections. Legacy `EXPO_PUBLIC_FUEL_*` custom-feed settings are no longer used by the mobile adapter. Do not use the version-1 examples below for this endpoint.

### Hosted Proof

Enabled on KNOGO project `ivzofixdjcgkwalfzmmy` on 19 October 2026. Migration `20261019202911_background_fuel_prices`, Edge function `fuel-prices` version 1. Two guest POSTs returned pending; background source work finished after those responses in about three seconds. A later GET returned six prices in effect from 7 October and `updateState: idle`. Repeated POSTs retained the same attempt timestamp, proving no same-day upstream rerun. One private state row, one publication, 989 bytes for the stored publication value at this check. There is no growing archive.

The production core client accepted this hosted response and used inland petrol 95 at R30.25/litre in a memory-only calculation: 8 km at 7.5 L/100 km yielded R18.15. No user preferences were changed. Hosted checks confirmed anon cannot claim and authenticated cannot finish. The security advisor returned no finding for fuel objects; existing report/auth advisories remain outside this change.

Verification: 306 root tests, 509 mobile tests, eight Deno tests, disposable fuel SQL QA and root/core/mobile TypeScript checks passed. Browser planner opened without a fuel error. Android hardware, a next-calendar-day trigger and accounts on two physical devices have not been tested. The guest endpoint has no account-specific path; no tester passwords were needed.

To try: reload the development app. In Settings fuel setup, choose grade/region and consumption; leave price override blank to use the reference. An override wins. No APK rebuild is needed because these changes add no native module. A standalone build without Metro needs its JS update or rebuild through the existing release process.

## Sources checked

| Source | Published access and price | Coverage and units | Unresolved before use |
| --- | --- | --- | --- |
| [FulTank](https://fultank.co.za/fuel-api/) | 14-day trial, 100 requests; Starter ZAR 69/month, 2,000 requests/month; Business ZAR 499/month, 10,000 requests/month. | Example covers petrol 93/95 and diesel 50/500 ppm, inland/coastal, with a dated reference. Decimal strings need a documented unit mapping. | Payment requirements, overage behaviour, redistribution and cache rights. [Terms](https://fultank.co.za/legal/) describe best-effort API availability but do not supply a cache allowance. No adoption approved. |
| [Fuel SA](https://api.fuelsa.co.za/) | 14-day trial without a credit card; ZAR 59 per 1,000 requests/month thereafter. | All four grades, Reef/Coast. Diesel is marked wholesale. | Response units/effective dates, quotas after exhaustion, billing and redistribution/cache terms. No adoption approved. |
| [zaref](https://zaref.dev/docs/fuel-price-api) | USD 0.005/call for the price series; history USD 0.01/call. | Documentation says rand/litre, source/effective date, petrol retail and diesel wholesale. | Trial/free allowance, payment requirements, caps/overages, all-grade response and cache/redistribution rights. Pricing page could not be retrieved. No adoption approved. |
| [SA Fuel API author announcement](https://www.linkedin.com/posts/morney-d-4bb1b9227_south-africa-deserves-a-free-public-fuel-activity-7469610374971965440-QZRl) | Author describes free reads without an API key and an open-source project. | Announcement names petrol 93/95 and diesel, with inland/coastal history. | V2 docs at the linked workers.dev URL and shortened repository links could not be retrieved. Neither licence, source-data rights, diesel grade/basis nor request limits have been verified. Not connected. |
| [DMPR](https://www.dmpr.gov.za/Terms) | Website publications, not a confirmed JSON API. | The earlier [DMRE history PDF](https://www.dmre.gov.za/Portals/0/Resources/Fuel%20Prices%20Adjustments/Fuel%20Prices%20Per%20Zone/2026/April%202026/Fuel-Price-History.pdf) specifies cents/litre, but is a history source, not a complete current feed. | DMRE's landing page points to DMPR. Terms reserve content rights; a right to redistribute/cache the needed data has not been established. No scraping feed has been adopted. |

The price column is a published offer, not a completed account/billing check. Trials are not permanent free tiers. For a future server refresh once a day, a 30-day month means 30 upstream requests, not one upstream request per app user. At the published prices that would fit FulTank Starter's ZAR 69/month or Fuel SA's ZAR 59/month allowance, or represent USD 0.15 in zaref per-call usage before any account minimum, tax or other charge. These are estimates, not authorisation. Do not enrol without approval and the unresolved checks.

## Implemented contract

### Free API recheck, 4 October 2026

The [V2 docs](https://sa-fuel-api.guerillagardeningkzn.workers.dev/docs) returned HTTP 200 through a direct request after the browsing tool failed. They state free GET access without registration or a key, with 100 requests per 15 minutes per IP. No expiry is stated. The docs give no overage billing or cache/redistribution permission. A server refresh once per day would use 30 reads in a 30-day month; published read cost is ZAR 0. No account or payment details were supplied.

One GET to `/v1/prices/latest` returned September 2026 data with seven grade/region values, including both diesel grades but no petrol 93 coastal value. `updatedAt` has no timezone, and the response supplies no effective start/end interval or source URL. The docs describe prices as retail without distinguishing diesel wholesale. Units, diesel basis, publication interval and rights still need evidence; a month or an update time is not a price-validity interval. The author's repository short link returned HTTP 403, so its licence remains unverified. The feed stays disabled. No supplied prices were bundled or connected to estimates.

The client accepts a KNOGO-normalised response, not a provider's example payload. A provider adapter/ingestion job remains to be implemented after access, rights, units and dates are confirmed.

The envelope requires `version: 1`, `currency: "ZAR"`, `unit: "ZAR/litre"` or `"cents/litre"`, and `records` containing one to eight rows. Each row requires:

- `grade`: petrol_93, petrol_95, diesel_50ppm or diesel_500ppm.
- `region`: inland or coastal, never inferred from GPS.
- `price`: a number greater than zero, in the envelope's unit. Cents divide by 100 in code.
- `kind`: retail_reference for petrol; wholesale_reference for diesel.
- `effectiveAt` and `effectiveUntil`: timezone-bearing timestamps defining the published interval. No inferred first-Wednesday expiry.
- `checkedAt`: the source check timestamp, not overwritten when restoring cache.
- `sourceUrl`: HTTPS source link without username/password credentials.
- `forecast: false`: forecasts are never used for an estimate based on prices in effect now.

Duplicate grade/region pairs, unsupported units, invalid dates, expired intervals, future prices/checks and malformed values reject the response. The current adapter does not silently pick one duplicate, copy petrol to a diesel grade or manufacture a coastal price.

The cache records version, feed identity, terms identity, receipt time and normalised records. The configured retention period and each price's published interval both apply. Refresh failure retains only an unexpired cache, without extending its timestamps. A changed feed or terms URL cannot reuse the old cache. Storage failure leaves price entry and a live response available, with a warning.

## Configuration gate

All are unset by default:

- `EXPO_PUBLIC_FUEL_API_URL`: public KNOGO-normalised HTTPS endpoint. Never put a provider key or paid provider URL containing credentials here.
- `EXPO_PUBLIC_FUEL_TERMS_URL`: verified terms or written permission reference.
- `EXPO_PUBLIC_FUEL_CACHE_MAX_AGE_SECONDS`: a positive integer matching the permitted retention period, capped by KNOGO at seven days. That cap is not a provider permission.
- `EXPO_PUBLIC_FUEL_DATA_TERMS_CONFIRMED`: false until price access, commercial use, display and device cache permission are verified. A flag cannot grant rights or approve spending.

Without every gate the client makes no feed request and reads no feed cache. Requests have a ten-second deadline and concurrent refreshes share one request. The mobile code sends no account, trip origin, search text or coordinates to the price feed.

The planner currently shows the disconnected-feed message and supports a device price override. Once data is configured it shows grade, region, source, effective interval, checked date and cache receipt date. Diesel remains a wholesale reference, not a pump-price promise. An override wins over the reference. Cost uses the stated price input, not an AI price or a forecast; a future departure is not a future price quote.

## Verification and remaining work

Eleven feed/cache tests cover configuration gates, units, grade/region/basis, forecasts, expiry, invalid/missing values, duplicates, cache identity/retention, live/cache loading, failure fallback, malformed cache, storage failure and timeout/request deduplication. Calculation tests remain separate.

Upstream ingestion, provider rights, enforced server request budgets, a hosted normalised endpoint and phone QA with actual reference data remain unfinished. No provider response is disguised as a working integration. Request source/cost approval only after completing the unresolved checks above.
