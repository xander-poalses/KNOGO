# KNOGO DV300 Milestone Goal

Created: 8 October 2026
Milestone check: Wednesday, 14 October 2026
Preparation target: Tuesday, 13 October 2026
Final hand-in: Wednesday, 28 October 2026

## Objective

Prepare KNOGO for the DV300 milestone check with demonstrated account access,
persisted community reports, a Gemini assessment flow, trip fuel estimates,
tests and assessment evidence. Spend no money. Defer deployment.

This document is the target for the milestone goal. Creating this document does
not create or resume an agent goal.

## Source And Interpretation

Source: `C:/Users/poals/Downloads/DV300_Milestone_Agreement.xlsx - Xander Poalses.pdf`.

The agreement identifies KNOGO, Social Impact and Gemini. Its AI integration row
has a marking weight of 20%. The user clarified that "40%" in the deliverable
column means implementation progress expected at the milestone, not a marking
weight or a requirement to complete the AI system.
Deployment is a stretch item with a weight of 0%.

Pitch: https://docs.google.com/presentation/d/18Fr0PjLR-n4Z3PlgLj2EydsXB89LjRv0qC_Qwd9mI7Q/edit

The pitch was read on 8 October. Slide 6 names three roles: visitor (reads without
an account), community reporter (submits evidence), and venue representative
(posts updates and disputes reports). Slide 12 is titled "Proposed ER Diagram";
its diagram still needs visual inspection before comparing entities and links.

The user confirms the frontend was designed through code, not Figma. Use app
captures, theme tokens and the pitch's brand/wireframe slides as design evidence.
The agreement names Figma/screens; whether code-based captures satisfy that item
needs lecturer acceptance. Do not claim a Figma deliverable exists.

## Constraints

- No spending, paid subscriptions, billing activation or usage-based charges.
- Check provider terms, quotas and account eligibility before enabling services.
- Do not create hosted projects or branches without approval and a cost check.
- Do not weaken hosted authentication to work around testing limits.
- Do not delete hosted accounts or reports without approval of the scope.
- Keep credentials server-side where required. Never expose service-role keys,
  provider secrets, passwords or session tokens in evidence.
- Keep report sources and disagreements visible. A Gemini assessment is not
  proof that a venue is open, closed or providing a service.
- Do not use account ownership as proof that a report is true.
- Keep changes scoped to the milestone. Preserve the branch map and its library.
- Do not start deployment work or add shop pricing.
- Use WCAG AA as the accessibility target. Do not claim conformance from code
  inspection alone; record what was tested and what remains untested.

## Scope

### Must

- Explore places and open a place screen.
- Sign up, confirm email where required, sign in and sign out.
- Enforce the pitch roles: visitor, community reporter and venue representative.
- Draft, review and submit a community report with its source.
- Persist and read reports through the backend/database.
- Send report input through the backend to Gemini and show the assessment in UI.
- Validate Gemini output and handle loading, rejection and service failures.
- Demonstrate a trip distance and fuel estimate with its assumptions.
- Prepare design, project-management, test and planning evidence.

### Nice

- Install and test an Android development build, including Google sign-in.
- Use Docker/Supabase on the PC for repeatable account and report testing.
- Measure the APK and installed storage after the build works.

These items support testing, but must not consume the time needed for the
assessment requirements. A browser demo does not prove phone behaviour.

### Future

- Shop pricing.
- App-store release and deployment.
- Monetisation and provider upgrades.
- Design changes that do not resolve a milestone flow problem.

## Status Rules

Use these states in the table:

- `Not assessed`: no milestone audit has established its status.
- `Missing`: required implementation or evidence is absent.
- `Needs verification`: code or evidence exists but the acceptance check has not passed.
- `Blocked`: progress needs approval, credentials, terms acceptance or a tool fix.
- `Demonstrated`: the acceptance check passed and evidence is recorded.

An implementation, automated test or historical claim alone does not establish
end-to-end demonstration. Update rows as checks happen. Record the date, commit
or working-tree state and environment for evidence.

## Assessment Checklist

| Requirement | Weight | Acceptance Check | Evidence | Status |
| --- | ---: | --- | --- | --- |
| Project management | 5% | Repository, README and commit history exist; board has a prioritised backlog. | Repo link, history, board capture. | Not assessed |
| Scope confirmation | 5% | Must / Nice / Future list is frozen; changes since pitch have reasons. | Scope list and pitch comparison. | Not assessed |
| UI design | 10% | App screens apply KNOGO branding and address pitch feedback; confirm acceptance of code-based design evidence. | App captures, theme tokens and pitch design slides; no Figma claim. | Needs verification |
| Frontend | 15% | Navigate home, account, place/report, AI result and trip flow; check layout at phone and desktop widths. | Demo and captures. | Not assessed |
| Backend/API | 10% | Backend runs and UI calls at least one MVP endpoint; routes are documented. | Demo and route list or Postman collection. | Not assessed |
| Database | 10% | Schema is compared with ERD; create/read works with persisted report data. | ERD, schema and reload demo. | Not assessed |
| Authentication/roles | 5% | Signup, login and logout work; pitch roles restrict actions server-side. | Test-account demo and access checks. | Not assessed |
| Gemini integration | 20% | User report input reaches Gemini through the backend and its response appears in KNOGO; keys stay server-side. | End-to-end demo and implementation references. | Not assessed |
| AI reliability | 5% | Prompt/request documented; loading, failure and output validation demonstrated. | Prompt notes, tests and failure demo. | Not assessed |
| Testing | 5% | Core flow checked; bug log exists; someone outside the project tried the flow. | Test results, bug log and usability notes. | Not assessed |
| Risks/challenges | 5% | Pitch risks compared with what occurred, resolutions and remaining blockers. | Risk notes and verbal update. | Not assessed |
| Weeks 3-4 plan | 5% | Remaining work prioritised through 28 October, including tests, refinement and deployment. | Board or roadmap. | Not assessed |
| Deployment stretch | 0% | Deferred for this goal; record the absence of a deployment. | No launch claim. | Deferred |

Weights total 100%. The planning evidence must include deployment for final
hand-in even though this milestone goal does not execute deployment.

## Work Order

### 1. Audit And Freeze

- Inspect implementation, configuration, tests and existing documentation.
- Populate the checklist with evidence rather than assuming completion.
- Check the three pitch roles, inspect the ERD slide, and record code-based
  design evidence and scope changes.
- Identify the path from report input to Gemini result.
- Log cost, privacy and authentication blockers before enabling requests.

### 2. Prove Gemini

- Check Gemini access, quota, billing state and terms for the intended input.
- Use synthetic reports for testing. Do not send account details or precise
  device location to Gemini without establishing a need and privacy handling.
- Verify the backend request, prompt, output schema and UI result.
- Demonstrate invalid input, malformed output and service failure handling.
- Do not substitute a mock response for the required Gemini demonstration.

### 3. Prove Accounts And Reports

- Check signup, confirmation return, login, logout and session restoration.
- Check that failed signup does not claim email delivery or authentication.
- Check role restrictions at the backend, not just by hiding buttons.
- Submit a report and prove persistence after reload.
- Check that authentication returns to review without auto-submitting a draft.
- Use a testing backend if hosted email limits block verification; do not
  disable confirmation in the hosted environment as a shortcut.

### 4. Verify Trip And UI

- Demonstrate distance/fuel estimate inputs, result and assumptions.
- Check loading/error recovery and keyboard/text-scaling behaviour.
- Keep the Android build investigation bounded. Record a blocker if it prevents
  phone testing; continue requirements that can be demonstrated in the browser.

### 5. Assemble Evidence And Rehearse

- Record test environment and date; remove credentials from captures.
- Have someone outside the project try the flow by Monday, 12 October.
- Record tasks, observed problems and follow-up fixes; do not invent feedback.
- Prepare the board, API list, ERD comparison, prompt notes and risk update.
- Rehearse the demo on Tuesday, 13 October. Verify everything claimed in it.

## Demo Sequence

1. Show the scope, repository, board and app design evidence.
2. Demonstrate account creation/confirmation, sign-in and role restrictions.
3. Choose a place and draft a report with a source.
4. Review and submit; show Gemini's assessment and its limits.
5. Reload and show persisted report data.
6. Demonstrate a trip fuel estimate.
7. Demonstrate a failure case and recovery.
8. Sign out and show remaining risks and the plan to final hand-in.

Prepare test accounts and synthetic data ahead of the rehearsal. State which
services are local, hosted or mocked. Only the Gemini flow backed by a real
provider response satisfies the AI demonstration requirement.

## User Actions When Needed

- Confirm whether app captures and code-based design evidence satisfy the design
  item. The pitch link, roles and meaning of "40%" are already established.
- Complete provider sign-in, credentials entry or terms acceptance if required.
- Arrange an outside tester and provide their observations.
- Install the APK and test device behaviour if the build is available.

The agent must first check what it can do before assigning a task to the user.
Requests must state what is needed, why, and whether any cost could occur.

## Existing References

- `docs/ACCOUNT_SETUP.md`
- `docs/AUTH_RETURN_INVESTIGATION.md`
- `docs/CHECKIN_SETUP_AND_QA.md`
- `docs/COMMUNITY_RULES.md`
- `docs/RISK_QUEUE_SETUP.md`
- `docs/TRUST_AND_TRIP_IMPLEMENTATION.md`
- `docs/TRUST_TRIP_PROVIDERS.md`
- `docs/MOBILE_SIZE_AUDIT.md`
- `MyProblems.txt`

Treat these as investigation starting points, not proof of completion.

## Completion Gate

Mark the milestone goal complete only when all weighted rows are demonstrated,
the evidence can be accessed, the demo has been rehearsed and the user has the
remaining-work plan. If a requirement remains blocked, report it and keep the
goal incomplete. Do not claim readiness solely because the deadline is near.

## Evidence And Blocker Log

Append entries as work proceeds:

| Date | Requirement | Check / Evidence Path | Environment | Outcome / Next Action |
| --- | --- | --- | --- | --- |
| 8 October 2026 | Milestone planning | This document | Repository | Checklist created; implementation audit pending. |
