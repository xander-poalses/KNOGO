# Venue phone verification

## Implementation state

The pending trust migration now includes the claim lifecycle and its authorisation checks. The functions have been exercised in the disposable Postgres test database. No migration, phone source, representative or messaging provider has been configured in the hosted project.

The `venue-claim` Edge handler, client API and mobile venue screen are implemented. The screen is reached through Represent this venue on a place page. SMS/voice delivery remains to be implemented. This document does not claim that a user can receive a code in KNOGO yet. Messaging remains behind the cost-approval gate in `TRUST_TRIP_PROVIDERS.md`.

## Phone source

`knogo_private.venue_phone_sources` holds the E.164 number, an independent HTTPS source URL, checked date, source version and enablement flag. It is not accessible to app users. The claimant cannot enter or replace a receiving number through the claim functions.

Sources must be checked within 180 days and cannot have a checked date from the future. This is a product rule, not evidence of ownership. All source rows default to disabled. A number/source/enablement change rotates the source version and revokes existing representatives. Updating the checked date for the same source does not extend a representative's 90-day lifetime.

Verification proves access to that phone at the time of the code check. It is not proof of legal ownership or permission to speak for every branch in a franchise.

## Server lifecycle

The four lifecycle RPCs are executable only by `service_role`. The Edge handler validates the caller's Supabase access token against Auth and derives the user ID from that result. Anonymous Auth accounts are rejected. The handler rejects `userId`, `phone`, `verified` flags, delivery references and other fields supplied outside its request contract.

1. `start_venue_claim(placeId, userId, channel)` checks the account, blocked-account status, venue/source and rate limits. It reserves a challenge and returns the server-held phone to the server handler only. Channels are SMS or voice.
2. The handler requests delivery from an approved provider. `attach_venue_claim_delivery(challengeId, userId, reference)` records the provider's reference. Passing null marks delivery failure. Failed deliveries still count against request limits.
3. `begin_venue_claim_verification(challengeId, userId)` checks ownership, delivery, source version, expiry and attempts. It consumes one attempt and reserves a one-minute verification lease before calling the provider.
4. The handler checks the submitted code with the provider. `finish_venue_claim_verification(challengeId, userId, attemptId, verified)` accepts only the lease for that challenge/account. A provider failure or mismatch must pass false. Only a provider approval may pass true.

No raw code is stored in these tables. A consumed challenge cannot be reused. If the handler crashes, its lease times out and another attempt may be made within the attempt limit. A stale callback or missing attempt ID cannot create a representative.

## Product limits

- Three delivery requests per account per 24 hours.
- Three requests to the same phone per rolling hour, across venues and accounts; ten per 24 hours.
- A one-minute resend cooldown per account/venue.
- Challenges expire after ten minutes. At most five provider code checks per challenge.
- Representative access expires after 90 days. Publishing checks current phone-source validity, active venue, account blocking and revocation.

These limits bound requests but are not a spend authorisation or provider budget. A provider-wide spend stop and approved country/channel pricing are still needed before delivery can be enabled.

## Updates and disputes

Representatives publish through `publish_venue_update`. They cannot delete reports. Venue statements keep their own timestamp/expiry and are labelled as representative statements. Opposing usable community/venue evidence produces Reports disagree. Phone-source revocation stops treating a representative's statements as current verified claims; the records remain in the database for diagnosis.

## Tests completed

Database tests cover server-only grants, missing sources, stale/disabled sources, a receiving number from KNOGO's source, another account's challenge, missing verification IDs, repeat checks, five-attempt exhaustion, provider delivery failure, challenge expiry, changed phone rejection, representative revocation and account/phone rate limits. The update/dispute tests still preserve community rows and reject report deletion.

Nine HTTP-boundary tests cover missing/invalid/anonymous callers, body overrides, disabled delivery, held-number use, masked responses, delivery failure, code mismatch, provider/database agreement, origins, methods, body limits and provider timeout. Provider exceptions and timeouts finish the lease with false. Replies never include a provider reference or the complete phone number. There is no automatic delivery retry.

Tests pass a provider result only in test adapters and the disposable database. This is not a bypass or a test-code route in the app. Hosted Auth validation, real provider verification, the signed-in mobile flow and phone testing remain unverified.

Client tests cover disabled messaging, authenticated requests without identity/phone overrides, endpoint errors, rejected verification, caller-scoped access, publishing/disputes with the caller's JWT and malformed access responses. The email return test confirms venue sign-in does not read, submit or clear a saved community draft.

The disposable database checks `read_venue_access`: the verified caller sees their dates, another account sees no access, and anon cannot execute the RPC. It exposes no phone number. Publishing still checks access on the server, independent of the screen's state.

Browser QA checked the signed-out screen in both themes, no horizontal overflow at 320/375/414/768 pixels, the place entry link and return-to-place navigation. No email or code was sent. Representative publishing has not been browser-tested against a configured provider and hosted database. The Android export and 122 unit tests passed during this pass; core/mobile TypeScript checks also passed.

## Endpoint setup, not deployed

`venue-claim/index.ts` reads platform-provided `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. `VENUE_ALLOWED_ORIGINS` is a comma-separated list of exact web origins. Native requests have no Origin header but still require a validated access token. The service-role key stays in the function, never in Expo.

`EXPO_PUBLIC_VENUE_CLAIM_API_URL` is the mobile function URL, not a secret. It is unset in the current build. Without it, the screen explains that phone-code delivery is unavailable; it does not invent a receiving number or code. Existing representatives can still check access and publish using the authenticated database RPCs once the migration is applied. Venue sign-in uses the shared email/password AccountForm. Google remains gated by provider setup. Registration and Google callbacks retain the venue target and do not submit a community draft. See `ACCOUNT_SETUP.md`; hosted account and messaging tests remain open.

The POST contract is either `{ "action": "start", "placeId": "branch-id", "channel": "sms" }` (or voice), or `{ "action": "verify", "challengeId": "uuid", "code": "six digits" }`. The body limit is 4 KiB, including streamed bodies. Responses are marked no-store. There is no publish/delete action in this endpoint.

The production entry point passes `delivery: null`. Until an approved provider adapter and spend stop are implemented, both actions return 503 and reserve no challenge. No environment flag enables mock delivery. Provider checks have a ten-second deadline; late results cannot grant access through the handler. A future adapter must also cancel its HTTP request and must not retry delivery after this deadline.

Supabase reported the KNOGO project as INACTIVE during the submit investigation on 1 October 2026. No restore, migration or deployment was performed. Restoring the project will not install this endpoint or the pending migration.
# Account Boundary Check, 4 October 2026

The pending trust migration requires an existing non-anonymous Supabase Auth account for report submission, venue claim start, verification lease and completion, and ongoing representative access. Supabase anonymous Auth users carry the authenticated database role, so a role or user-ID check alone is not enough. Old anonymous evidence is excluded from public trust and risk context. Signed-out browsing remains available.

The disposable Postgres suite reproduced the submission bypass before this change. It now checks anonymous and missing-account rejection, old anonymous evidence exclusion, verification-time account changes and withdrawal of representative access/evidence after an account becomes anonymous. This does not prove deployment or hosted behaviour. No hosted migration, code delivery or account change was made.
