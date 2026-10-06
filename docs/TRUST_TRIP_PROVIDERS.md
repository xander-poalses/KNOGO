# Provider review and configuration

Checked 1 October 2026. No services have been purchased, activated or deployed. No paid account or automatic billing is authorised. The integration code defaults to disabled.

### Hosted State Checked 4 October 2026

The statement above describes the initial review. A later user-authorised
trip-only deployment is present: `trip-planner` version 2 is ACTIVE, and both
route/address cap rows are enabled at 100/day and 10/minute. The trust
migration, risk queue and venue-claim tables are absent. Gemini, venue-code
delivery and fuel ingestion are not verified as hosted integrations.
No provider request, deployment or purchase was made in this read-only check.
The historical setup notes below are not proof of current provider terms.

## Routes and starting-address search

Candidate: openrouteservice. Screenshots supplied on 2 October 2026 show 2,000 directions per quota period and 40/minute; geocoding shows 3,000 per quota period and 100/minute. The reset period and plan name are not visible. The user confirms no payment details were added. Commercial use, quota renewal and account terms still need confirmation before enabling requests.

Sources: [plans](https://account.heigit.org/info/plans), [provider forum confirmation of Standard limits](https://ask.openrouteservice.org/t/pricing-plan-from-the-api/5806), [restrictions](https://openrouteservice.org/restrictions/), [attribution](https://openrouteservice.org/attribution/).

No payment setup is authorised. At a provider or KNOGO limit, planning returns an error and does not retry using a paid provider. The trip-only migration caps routes and addresses at 100 requests per UTC day and 10 per rolling minute each, disabled until configured. A return route uses another request. The earlier trust migration's provider controls are not used by trip-planner; Gemini retains those controls.

The current pricing page redirects to an account application that did not expose plan text to the research tool. Confirm the account's current plan, commercial use and payment requirements before activation; do not treat the historical forum limits as an account-level guarantee. No departure-sensitive traffic prediction is supplied by this adapter. The planner labels duration as an estimate.

Server variables: `ORS_API_KEY`, `ORS_FREE_TIER_CONFIRMED=true`, `TRIP_ALLOWED_ORIGINS` (comma-separated exact web origins). Enable the `routes` and `addresses` rows in `knogo_trip_private.provider_limits` only after the account check. The function uses `reserve_trip_provider_call`, keeps trip origins in request memory and returns `Cache-Control: no-store`. It does not save coordinates in the database. See `ZERO_COST_TRIP_SETUP.md` for the independent migration and review.

Mobile: `EXPO_PUBLIC_TRIP_API_URL` points to the `trip-planner` function URL. It is not a secret. The provider key and service-role key must never be Expo variables. The function needs platform configuration for anonymous invocation; no app sign-in is required. Deployment and gateway configuration have not been done.

## Gemini report-risk assessment

### Recheck, 5 October 2026

Google's [model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite)
still lists this identifier as stable with structured outputs. The
[pricing page](https://ai.google.dev/gemini-api/docs/pricing) lists Standard
free input/output and paid USD 0.30/million input and USD 2.50/million output.
No account quota, billing state or provider request was checked.

The [unpaid-service terms](https://ai.google.dev/gemini-api/terms) permit human
review and product improvement and prohibit submitting sensitive, confidential
or personal information. HMAC identifiers are not proof that a report-pattern
dataset meets that condition. Data review and user approval remain required.

[Rate-limit documentation](https://ai.google.dev/gemini-api/docs/rate-limits)
states quotas are per project and daily resets use Pacific time. KNOGO's
The pending `reserve_provider_call` migration now checks a rolling 25-hour
reservation window as well as its UTC counter and rolling minute cap.
This covers a Pacific quota day including daylight-saving transitions; it
does not prove the project's allowance. In-memory SQL tests cover rollover
rejection, window expiry and pruning. Before enabling, verify the project's
RPM, TPM and RPD, other project usage and billing state, then set caps within
that allowance. Exhaustion must retain uncertainty. This change is not deployed.
No billing, model switch, terms acceptance or integration was activated.

Candidate model: `gemini-3.5-flash-lite`, configurable through `GEMINI_RISK_MODEL`. The [model list](https://ai.google.dev/gemini-api/docs/models) lists it as stable; [structured output](https://ai.google.dev/gemini-api/docs/structured-output) supplies JSON-schema output. Validate the returned JSON after generation as implemented, rather than trusting schema generation alone.

[Pricing](https://ai.google.dev/gemini-api/docs/pricing): free input/output within the free tier. Paid Standard text pricing is USD 0.30/million input tokens and USD 2.50/million output tokens. For 50 assessments/day at an assumed 10,000 input and 256 output tokens each, paid-equivalent usage would be about USD 0.182/day or USD 5.46/30 days. This is a planning estimate, not permission to incur it. The actual free quota is account/model dependent and must be checked in AI Studio; no universal free-request count is claimed. No billing-enabled project is authorised.

KNOGO caps assessment requests at 50/day and five per rolling minute. Reduce these limits if the account's free allowance is lower; these are product caps, not a claim about Google's quota. The adapter sends at most 100 structured observations, no grounding calls, and requests at most 256 output tokens. Exhausted provider or KNOGO quota becomes unknown risk. An unavailable assessment, failed reservation or an insufficient-context reason cannot strengthen negative claims.

Reservations are server-only. A row lock serialises checks across requests, and the rolling window does not reset at a minute or day boundary. Rejected requests do not consume a day reservation. A reservation consumed before a provider failure is not refunded. Counters contain provider names, timestamps and counts, not accounts, addresses or coordinates. These controls do not prevent depletion of a public planning allowance by abuse; per-device admission controls remain to be tested before release.

[Terms](https://ai.google.dev/gemini-api/terms) and the pricing page state that unpaid-service input/output can be used to improve Google's products. Data is HMAC-pseudonymised, but this is not a claim of anonymisation. Confirm whether these terms are acceptable before using production reports. No emails, phone numbers, coordinates, source URLs, free text or location trails are sent. Keep `GEMINI_FREE_TIER_CONFIRMED` false until the account and terms checks are done.

Server variables: `GEMINI_API_KEY`, `GEMINI_RISK_MODEL`, `GEMINI_FREE_TIER_CONFIRMED`, `RISK_PSEUDONYM_SECRET`, `RISK_WORKER_SECRET`, plus platform-provided `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. The worker endpoint requires its secret, not a mobile token. Report insertion now queues assessment, with leases and at most three attempts. The worker drains at most three jobs per invocation. [Queue setup](RISK_QUEUE_SETUP.md) describes scheduling, Vault and verification. No scheduler or provider access is deployed; automatic hosted delivery remains unverified. Individual reports do not depend on owner review.

## Venue SMS or voice OTP

No permanent free provider has been verified. Twilio Verify is not a free service: [pricing](https://www.twilio.com/en-us/verify/pricing) lists USD 0.05 per successful verification plus channel charges. South African delivery prices must be obtained from its country/channel pricing before estimating a total. A trial is not a permanent free tier. Message attempts may cost money even without a successful verification.

For 100 successful verifications, the base fee alone would be USD 5, before South African SMS/voice delivery. Payment requirements, any trial expiry and spend-stop controls need a country/account check. No account, messaging or provider adoption is authorised. The claim database now includes delivery reservation, attempt leases, expiry, phone-source versions and representative revocation. The authenticated Edge handler and mobile controls have tests and remain undeployed, with delivery disabled. [Venue verification](VENUE_VERIFICATION.md) records the boundaries and tests. OTP delivery remains unimplemented. No user can receive a venue code through this work yet.

Verification will use only a number in `knogo_private.venue_phone_sources`, with an independent HTTPS source, checked date and server enablement. The claimant cannot supply a receiving number. There are no seeded phone sources or verified representatives. Access to a venue phone is not proof of legal ownership. Updates and disputes cannot delete community evidence.

## South African fuel data

Candidate source: the Department of Mineral and Petroleum Resources fuel-price publications. [Published price breakdown](https://www.dmre.gov.za/Portals/0/Resources/Fuel%20Prices%20Adjustments/Fuel%20Prices%20Per%20Zone/2025/September%202025/Breakdown-of-Prices.pdf) is a source-format example, not a current price. The publications use cents/litre for fuel; application estimates use ZAR/litre, requiring division by 100. Diesel reference data is wholesale, not guaranteed pump pricing.

A machine-readable feed with verified current effective dates, all requested grades/regions and rights to redistribution/cache has not been confirmed. No historic values are shipped as current and no fabricated feed is wired. A gated normalised client, versioned cache, period/unit validation and planner source/date UI are implemented and tested. Upstream ingestion, rights confirmation and the hosted normalised feed remain pending. [Fuel source review and setup](FUEL_DATA_SETUP.md) records provider prices, trial limits, unanswered billing/rights questions and the contract. The planner currently accepts a user's price override. It shows missing price as missing, never R0. Forecast and expired records are rejected.

The user does not need to buy a fuel service at this point. More source/rights research is required before choosing one.
