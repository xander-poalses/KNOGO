# KNOGO

Know before you go.

KNOGO helps people check whether a place is open, serving and functioning before
making the trip. Opening hours can say a business is open while its doors are
closed, its kitchen has stopped serving or a disruption has affected its service.
KNOGO brings community observations, their sources and trip fuel estimates into
the decision to leave home.

The project covers businesses and services people visit in person. Restaurants,
bars and fast-food outlets are the starting scope, with other categories forming
part of the product direction.

Created by Xander Poalses at Open Window for DV300 and UX300.

<!-- Add Xander's mockups and photos here when supplied. Include alt text. -->


## Features

- Discover places by category, area and search.
- Browse venue groups and choose a branch.
- View opening hours, service information and community reports.
- Submit observations with a visit, phone call or online source.
- Save places for another visit.
- Estimate trip fuel costs using route information and vehicle preferences.
- Review report assessments.
- Manage account access and appearance settings.

Accounts, reports, routing and AI need backend and provider configuration.
The browser preview below uses mock data to explore the interface.

## How reporting works

KNOGO treats reports as evidence. The trust rules consider report age,
agreement, account history and assessment results. Opposing evidence remains
visible, and venue disputes do not delete community reports.

Google Gemini assesses reporting patterns for signs of coordination or abuse.
It does not determine whether a venue is open or whether a person is telling the
truth. Application rules control the outcome. An unavailable or inconclusive
assessment cannot establish a community closure.

The trust implementation requires its backend migrations and worker setup.
See [community rules](docs/COMMUNITY_RULES.md) for thresholds and deployment caveats.

## Technology

| Layer | Technology |
| --- | --- |
| Android app | Expo, React Native and Expo Router |
| Browser interfaces | React Native Web and a separate React/Vite app |
| Language | TypeScript |
| Accounts and storage | Supabase Auth and PostgreSQL |
| Backend services | Supabase database functions and Edge Functions |
| Report assessment | Google Gemini |
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
