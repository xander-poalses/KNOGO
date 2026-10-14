# KNOGO

Know before you go.

KNOGO combines community service reports with trip fuel estimates. People can
check a place, leave an observation with its source, and plan the fuel budget
before leaving. Reports are evidence, not guarantees. Gemini assesses reporting
patterns, not whether a venue is open or a person is telling the truth.

Built for the DV300 milestone on 14 October 2026. Deployment and shop pricing
are on hold. This branch is work in progress, not a release.

## Run The App

Use Node.js and the pnpm version in `package.json` (`12.3.4`). The milestone
checks ran with Node `22.15.0` on Windows. From the repository root:

```powershell
pnpm install --frozen-lockfile
```

For a browser preview with mock data and no backend/provider calls:

```powershell
$env:EXPO_PUBLIC_USE_MOCK_DATA = 'true'
pnpm --dir apps/mobile exec expo start --web --localhost --port 8083
```

Use the URL printed by Expo. If the port is occupied, choose another. This
preview is not proof of authentication, stored reports, routing or Gemini.

For backend tests, use `apps/mobile/.env.example` as the configuration shape
for an ignored `.env.local`. Set the backend URL and publishable key for the
testing environment, and set `EXPO_PUBLIC_USE_MOCK_DATA=false`. Remove the
shell mock override or open another terminal. Restart Expo after changing env.
Never use invented reports against the hosted catalogue.

The browser runs the Expo mobile UI. The separate Vite web app lives in `src`;
`pnpm dev` starts that app, not the Expo settings/report screens.

For Expo Go, `pnpm mobile` starts Metro on the LAN. Your phone must be able to
reach Metro and the backend. `127.0.0.1` on the phone is the phone itself, not
your PC. Google sign-in with KNOGO's callback scheme requires a development
build; a browser or Expo Go preview does not prove that device flow.

## Testing Backend

The milestone uses Supabase through Docker on the PC, with Mailpit for email
confirmation. It is a database of its own, not a copy of the hosted users or
reports. No SMTP purchase or billing activation is needed for that inbox.

Setup is not yet a one-command replay: catalogue seeds are needed between some
older migrations. Do not assume `supabase db reset` recreates the milestone
state, and never reset the hosted database. After the Docker update on
11 October, the test containers and account/report API checks passed again.

Use `supabase/seed_milestone_test.sql` only in the test backend. Keep provider
keys, worker secrets and service-role keys server-side. The app receives only
the publishable key. `.env.local`, credentials, logs and test artifacts are
ignored by Git.

## Checks

```powershell
pnpm test
pnpm test:mobile-flow
pnpm typecheck:core
pnpm typecheck:mobile
pnpm exec tsc -b
```

On 11 October: 254 core/browser tests and 404 mobile tests passed. Root and
mobile TypeScript passed. These checks do not prove provider access, Android,
email delivery on the hosted service or WCAG conformance.

Database checks use an installed PGlite module, selected by
`KNOGO_PGLITE_MODULE`, and never connect to the hosted project:

```powershell
node scripts/region-migration-qa.mjs
node scripts/checkin-database-qa.mjs
node scripts/trip-database-qa.mjs
```

`scripts/milestone-local-qa.mjs` is a Docker API integration test. It refuses
any backend other than `http://127.0.0.1:54321`, uses invented accounts and
requires the test fixtures and Mailpit. Do not change that guard for hosted QA.

## Project Layout

| Folder | Purpose |
| --- | --- |
| `apps/mobile` | Expo app: accounts, places, reporting, trips and settings |
| `packages/core` | Shared types, validation, trust rules, API clients and fuel arithmetic |
| `src` | Vite web app |
| `supabase/migrations` | Database structure, permissions and RPCs |
| `supabase/functions` | Trip, report-risk and venue-claim server handlers |
| `scripts` | Catalogue tools and database/API QA |
| `docs` | Setup, milestone evidence, work board and remaining gates |

## Milestone Evidence

- [Goal and acceptance checks](docs/DV300_MILESTONE_GOAL.md)
- [Execution ledger](docs/DV300_MILESTONE_PROGRESS.md)
- [Evidence, ERD comparison, API list and work board](docs/DV300_MILESTONE_EVIDENCE.md)
- [Tester tasks and observation template](docs/DV300_TESTER_GUIDE.md)
- [Community rules](docs/COMMUNITY_RULES.md)
- [Account setup](docs/ACCOUNT_SETUP.md)
- [Risk worker setup](docs/RISK_QUEUE_SETUP.md)

Screenshots count instead of Figma, as confirmed on 11 October. Report and trip
captures are in `docs/evidence`. The trip demo used the existing hosted endpoint;
account/report tests used Docker. Outside-user feedback, Gemini setup, remaining
device/accessibility checks and the rehearsal remain gates.
No mock response counts as the Gemini demonstration. No spending, merge or
deployment follows from this README.
