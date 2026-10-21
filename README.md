# KNOGO

Know before you go.

<img src="docs/media/KnogoMockup1.png" alt="KNOGO mockup showing the home screen and a place's opening status on two phones" width="100%">

KNOGO helps people check whether a place is open, serving and functioning before
making the trip. Opening hours can say a business is open while its doors are
closed, its kitchen has stopped serving or a disruption has affected its service.
KNOGO brings community observations, their sources and trip fuel estimates into
the decision to leave home.

The directory covers Food & Drink, Shops, Cars & Garages, Public Services,
Entertainment, and Sport & Outdoors. The catalogue is centred on Pretoria East.
Listed hours are expectations; community checks are observations, not guarantees.

Created by Xander Poalses at Open Window for DV300 and UX300.

[Features](#features) | [Reporting](#how-reporting-works) | [Trip planning](#trip-planning) | [Code](#inside-the-code) | [Setup](#get-started) | [Documentation](#documentation)

## Project video

<video src="https://github.com/user-attachments/assets/b11d7e23-af80-480a-86d3-e479a36f1fa8" controls muted playsinline></video>

[Watch the promo (59 seconds)](docs/media/knogo-launch-59s.mp4).

## Features

<img src="docs/media/KnogoMockup2.png" alt="KNOGO Explore mockup showing place categories and the nearby search entry point" width="100%">

| Feature | What it provides |
| --- | --- |
| Discovery | Search by place, area or category, then filter results |
| Branches | Browse venue groups and choose the branch you intend to visit |
| Status & checks | Distinguish listed hours from opening and service reports |
| Community reporting | Submit a check made in person, by phone or online |
| Saved places | Keep places for another visit |
| Trip planning | Estimate fuel use and cost from a route and vehicle preferences |
| Account & appearance | Manage access and choose system, light or dark appearance |

Accounts, reports, routing and AI need backend and provider configuration.
The browser preview below uses mock data to explore the interface.

## How reporting works

<img src="docs/media/KnogoMockup3.png" alt="KNOGO community-reporting mockup showing the opening-status question on a phone held in two hands" width="100%">

KNOGO treats reports as evidence. The trust rules consider report age,
agreement, account history and assessment results. Opposing evidence remains
visible, and venue disputes do not delete community reports.

Google Gemini assesses reporting patterns for signs of coordination or abuse.
It does not determine whether a venue is open or whether a person is telling the
truth. Application rules control the outcome. An unavailable or inconclusive
assessment cannot establish a community closure.

The trust implementation requires its backend migrations and worker setup.
See [community rules](docs/COMMUNITY_RULES.md) for thresholds and deployment caveats.

The survey follows what the contributor can check:

1. Choose in person, phone or online. Online checks need a source URL.
2. Answer whether the place is open.
3. A Closed answer goes to review. Phone and online checks also go to review
   without asking service questions.
4. In-person Open checks can include kitchen, busy-level and other service checks.
5. Review the answers and submit. A received report is not a guarantee of a status change.

## Trip planning

<img src="docs/media/KnogoMockup4.png" alt="KNOGO trip-planning mockup showing a route, fuel-cost estimate and status-check sheet" width="100%">

Plan a route, compare arrival with listed hours and estimate fuel use from your
vehicle's consumption. Set a fuel grade and region, or use a price override.
Missing inputs stay unset rather than becoming a guessed cost.

Fuel estimates use route data and calculations in the app, **not Gemini**.
Gemini's role is report-risk assessment. Diesel reference prices are wholesale,
not a promise of pump prices. Arrival within listed hours is not confirmation
that the venue will be open when you get there.

## Inside the code

The shared TypeScript package keeps product rules outside the screens. These
excerpts show three of those rules; the linked files provide their context.

### Only keep answers the contributor can know

Changing to phone/online or reporting Closed removes service answers from the
report, including answers left in a restored draft.

Source: [`packages/core/src/reportDraft.ts`](packages/core/src/reportDraft.ts#L6-L9).

<img src="docs/media/reportDraftsLine5-8Snap.png" alt="TypeScript excerpt filtering phone, online and Closed reports to opening-status answers" width="100%">

<details>
<summary>Read or copy the code</summary>

```typescript
export function getApplicableReportAnswers(answers: ConfirmationAnswer[], reportSource: ReportSource | null): ConfirmationAnswer[] {
  const openingOnly = reportSource !== "in_person" || answers.some(answer => answer.type === "open_status" && answer.value === "closed");
  return openingOnly ? answers.filter(answer => answer.type === "open_status") : answers;
}
```

</details>

### Calculate fuel without inventing inputs

Without consumption there is no litres estimate. Without a price there is no
cost estimate. Validation keeps invalid numbers out of the calculation.

Source: [`packages/core/src/trip.ts`](packages/core/src/trip.ts#L28-L32).

<img src="docs/media/tripLine28-32Snap.png" alt="TypeScript excerpt estimating litres and rand cost while leaving missing consumption or price unset" width="100%">

<details>
<summary>Read or copy the code</summary>

```typescript
export function estimateFuel(kilometres: number, consumption: number | null, price: number | null) {
  if (!Number.isFinite(kilometres) || kilometres < 0 || !positiveNumber(consumption, 100)) return { litres: null, costZar: null };
  const litres = kilometres / 100 * consumption!;
  return { litres, costZar: positiveNumber(price) ? litres * price! : null };
}
```

</details>

### Define the evidence rules

Evidence expiry, account thresholds and disagreements are handled in
[`packages/core/src/trust.ts`](packages/core/src/trust.ts). These are product
rules, not percentages of certainty supplied by AI.

Source: [`packages/core/src/trust.ts`](packages/core/src/trust.ts#L29-L36).

<img src="docs/media/trustLine29-36Snap.png" alt="Trust-rule settings: four-hour evidence lifetime, three accounts, 24-hour account age, 15-minute span and two check methods" width="100%">

<details>
<summary>Read or copy the code</summary>

```typescript
export const trustRules = {
  version: 1,
  evidenceLifetimeMs: 4 * 60 * 60 * 1000,
  negativeAccountCount: 3,
  negativeAccountAgeMs: 24 * 60 * 60 * 1000,
  negativeSpanMs: 15 * 60 * 1000,
  negativeSourceCount: 2
} as const;
```

</details>

## Technology

| Layer | Technology |
| --- | --- |
| Android app | Expo, React Native and Expo Router |
| Browser interfaces | React Native Web and a separate React/Vite app |
| Language | TypeScript |
| Accounts and storage | Supabase Auth and PostgreSQL |
| Backend services | Supabase database functions and Edge Functions |
| Report assessment | Google Gemini |
| Maps | Mapbox on native, Google Maps in Expo web |
| Motion and touch feedback | Reanimated, Gesture Handler and Expo Haptics |
| Typography and icons | DM Sans and Lucide |

## Get started

Use Git, Node.js and pnpm `12.3.4`, as specified in `package.json`.
The project has been run on Windows with Node.js `22.15.0`.
These commands use PowerShell.

### Browser preview

```powershell
git clone https://github.com/xander-poalses/KNOGO.git
cd KNOGO
pnpm install --frozen-lockfile
$env:EXPO_PUBLIC_USE_MOCK_DATA = 'true'
pnpm --dir apps/mobile exec expo start --web --localhost --port 8083
```

Open the URL printed by Expo to explore the mobile interface in your browser.
Choose another port if `8083` is occupied. Mock mode does not exercise accounts,
report submissions, route providers or AI.

### Android app

Install KNOGO's development APK, then run from the repository root:

```powershell
pnpm mobile
```

Keep your phone and PC on the same Wi-Fi and open the development server in
KNOGO. Use the development build rather than Expo Go. The APK needs Metro to
run; it is not a standalone release.

See [Android build and device setup](apps/mobile/README.md) for APK build
commands, SDK requirements, maps and Google sign-in configuration.

### Backend configuration

Create `apps/mobile/.env.local` from
[`apps/mobile/.env.example`](apps/mobile/.env.example). Set the backend URL,
publishable key and `EXPO_PUBLIC_USE_MOCK_DATA=false`.

If you used the browser preview, remove its shell override before restarting Expo:

```powershell
Remove-Item Env:EXPO_PUBLIC_USE_MOCK_DATA -ErrorAction SilentlyContinue
```

Use the publishable key in the app. Keep provider keys, worker secrets and
service-role keys on the server. Do not commit `.env.local` or credentials.

A phone cannot reach your PC through `127.0.0.1`: that address points to the
phone itself. Use a backend URL the device can reach.

Backend setup is documented by service:

- [Accounts and authentication](docs/ACCOUNT_SETUP.md)
- [Reports and database checks](docs/CHECKIN_SETUP_AND_QA.md)
- [Gemini assessment worker](docs/RISK_QUEUE_SETUP.md)
- [Trip estimates](docs/ZERO_COST_TRIP_SETUP.md)
- [Fuel data](docs/FUEL_DATA_SETUP.md)

The migration history needs catalogue seeds between some migrations.
`supabase db reset` alone does not reproduce the development database.
Use a test database for fixtures and avoid resetting the hosted database.

### Vite web app

The repository also contains a React/Vite app in `src`:

```powershell
pnpm dev
```

This starts the Vite interface. Use the Expo browser command to explore
the mobile account, report and settings screens.

## Development checks

Run from the repository root:

```powershell
pnpm test
pnpm test:mobile-flow
pnpm typecheck:core
pnpm typecheck:mobile
pnpm exec tsc -b
```

These cover application logic, mobile flows and TypeScript. Device behaviour,
provider access and backend integration require their own checks.
See the [tester guide](docs/DV300_TESTER_GUIDE.md) for tasks and observations.

## Project structure

| Folder | Purpose |
| --- | --- |
| `apps/mobile` | Expo app, device configuration and mobile setup |
| `packages/core` | Types, validation, trust rules, API clients and fuel calculations |
| `src` | React/Vite interface |
| `supabase/migrations` | Database structure, permissions and functions |
| `supabase/functions` | Trip, report assessment and venue-claim handlers |
| `scripts` | Catalogue tools and verification scripts |
| `docs` | Service setup, design decisions and project evidence |
| `data/place-imports` | Catalogue imports and their documentation |

## Documentation

- [Project and design handoff](docs/KNOGO_PROJECT_HANDOFF.md): product context,
  fonts, colours, spacing, components, motion and implementation notes.
- [Feature handover](docs/KNOGO_FEATURE_HANDOVER.md): feature inventory and delivery context.
- [Privacy](docs/PRIVACY.md) and [community rules](docs/COMMUNITY_RULES.md):
  data handling, provider disclosures and report policy.
- [Release checklist](docs/RELEASE_CHECKLIST.md): checks needed before a release.

KNOGO is in beta. The Expo app and Vite interface do not have feature or design
parity. Mockups show the product, not proof that every provider is configured.

## Author and credits

Xander Poalses, student number 241322, Open Window.

Developed for DV300 and UX300. DV300 lecturer: Tsungai Katsuro.
The project uses Expo, React Native, Supabase, Google Gemini, DM Sans and Lucide.
Dependency versions are recorded in the workspace manifests and lockfile.

## Licence

This repository does not include a project licence. Third-party dependencies
and assets retain their own licences and ownership.

Promo music usage rights have not been verified. Confirm them before publishing
the video.
