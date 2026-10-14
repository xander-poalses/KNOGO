# KNOGO User Test

Planned for 11 or 12 October 2026. Do not start until Codex confirms the test
build and backend are running. Use only the test venue and test accounts.
Never submit invented reports to a public venue or add payment details.

Tell the tester the tasks, not which buttons to press. Note where they hesitate
or ask for help. They can stop at any point. No purchases are needed.

## Facilitator Setup

These addresses were running on the development PC on 11 October. Recheck
them before the test; this note does not prove that they are running tomorrow.
Do not use these localhost addresses on a phone or another computer.

- Account/report app: http://localhost:8083/
- KNOGO Test Venue: http://localhost:8083/restaurants/milestone-browser-venue
- Testing email inbox: http://127.0.0.1:54324/
- Trip preview: http://localhost:8081/restaurants/cappuccinos-menlyn

Use a browser on the development PC. The account/report app uses Docker;
confirmation emails stay in its testing inbox, not the tester's email account.
Choose an unused address ending in `@example.test` and a test-only password.
Do not reuse a password from another account. Record no credentials or email
confirmation URLs in the observations.

The trip preview uses the existing hosted catalogue and route service. Keep
it signed out and use it only for the trip task. Never create accounts or
submit invented reports in that preview. The two previews use different
backends; signing in on one is not expected to sign in on the other.

Gemini is not demonstrated yet. Tell the tester that the review may be
unavailable. Do not coach them on what the receipt means or claim the test
is evidence of a Gemini request. Feedback on that state is still useful.

## Supplied Scenarios

For the reporting task, give the tester this invented observation:

> You phoned the test venue. The person answering said it is open and the
> kitchen is serving. You did not check busyness, walk-ins, card payments or
> power. Record only those observations.

For the trip task, use Gautrain Hatfield Station as the starting place,
7.5 L/100 km consumption and a R23/litre price override. These are test
inputs, not a claim about a vehicle or current pump prices. Compare one-way
and return estimates. Do not request the tester's device location.

For the connection-failure task, have Codex set only the test browser tab
offline after the report has been saved. Try checking its review, then
restore the connection and retry the read. Do not turn off the PC's network
or ask the tester to submit the saved report again. If tab-only offline
control is unavailable, record that task as not tested.

## Tasks

1. Find the test venue and open its page. Explain what you think its status means.
2. Find listed hours and recent reports. Explain the difference between listed
   hours and a community report.
3. Start a report while signed out. Choose a check method and answer only what
   the test scenario provides. Skip checks you did not make.
4. Create a test account, use the testing inbox to confirm, and return to your
   draft. Check that sign-in alone did not submit it. Review and submit once.
5. Explain the review receipt. If review is unavailable, explain whether you
   think the report was saved. Do not treat Gemini's review as proof of truth.
6. Reopen the place and check the report remains recorded. Sign out, reload
   and check that the app does not show you as signed in.
7. Plan a trip using the supplied test origin. Set consumption and a test
   price override. Explain the distance, fuel estimate and assumptions.
8. Try a connection failure using the scenario supplied by Codex. Explain
   what happened and how you would recover without repeating a saved report.

## Record

- Test date and build/branch:
- Browser or phone, device and viewport:
- Which services were running, unavailable or mocked:
- Tasks completed without help:
- Tasks needing help, with the tester's words:
- Errors or unclear labels:
- Keyboard, scrolling, text-size or focus issues:
- What the tester expected versus what happened:
- Changes needed, priority and follow-up test:

No observations have been recorded yet. Do not include passwords, email links,
tokens or personal account details in the notes or screenshots.
