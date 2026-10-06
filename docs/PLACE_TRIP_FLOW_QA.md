# Place And Trip Flow QA

## Flow

The place opens with a schedule expectation or a report. Schedule text does not change the database or live status. Report thresholds, conflicts and expiry still use the trust model.

Tap **Estimate my trip** to request location and calculate a trip leaving now. The result shows distance, drive time, arrival and fuel cost when fuel inputs exist. Without fuel inputs it shows drive time and offers fuel setup in a sheet. No map is rendered.

**From** opens an address sheet. Select a result to estimate from it. **Leaving** opens departure options. Changing the date/time updates arrival from the accepted route without another provider request. Android uses the system date and time controls.

## Automated Checks

- `pnpm.cmd test`
- `pnpm.cmd test:mobile-flow`
- `pnpm.cmd typecheck:core`
- `pnpm.cmd typecheck:mobile`

Flow tests mock phone permission, GPS, network responses and storage. They test the component's state and commands, not the Android picker or screen rendering.

## Phone Pass

- [ ] Keep Explore, search, a branch sheet and Saved open across a report expiry. The expired claim must stop affecting text, colour and result selection without a fetch. Repeat after leaving the app in the background.
- [ ] Check source, check time and expiry through branch details and venue evidence disclosures. Legacy answers without a trust snapshot must not appear as accepted report claims in search cards.
- [ ] After estimating, open Hours at arrival. Check time remaining until trading closes, the kitchen comparison, missing service hours and a trip arriving after midnight.
- [ ] Check CTA loading states on estimate, save fuel, sign-in, submit report and venue verification. A request announces busy, shows progress and accepts no repeat tap. Back and optional-detail controls remain separate from the filled command.

- [ ] Open a place. Check **Expected open** during listed hours, and the schedule explanation on tap.
- [ ] Check a place with reports. An accepted report takes priority. A conflict does not become a schedule claim.
- [ ] Tap **Estimate my trip**. Grant location permission. No address or time input should be needed.
- [ ] Deny location on another install. Choose a starting address and select a result. The estimate should run without another submit.
- [ ] Change from an address to **Use my location**. Confirm the chosen address is not reused.
- [ ] Change departure using the Android date and time controls. Return to **Leave now**.
- [ ] Add fuel use and price per litre in the fuel sheet. The cost should update without another route request.
- [ ] Toggle return fuel. The first return calculation fetches a return leg; subsequent toggles reuse it.
- [ ] Check quota or connection failure. No cost, zero-distance or invented result should appear.
- [ ] Open and close every sheet with Android back. Check keyboard, navigation bar, text scaling and screen reader labels.
- [ ] Check Light and Dark themes and save/unsave. No floating command should cover the estimate button.

## Surface And Accessibility Checks

On 2 October the place screen gained status, trip and sheet surface roles. The palette has 130 contrast checks, covering text at 4.5:1 and control/focus indicators at 3:1 in both themes, including press feedback. Browser layout checks passed at 320, 375, 414 and 768px. Input focus and sheet keyboard cycling were checked. Android export and type checks passed.

- [ ] Run TalkBack through status, trip controls, expanded details and sheets.
- [ ] Increase phone text size and check every label, hours row and sheet.
- [ ] Check focus return and hardware back on the phone.
- [ ] Complete the app-wide WCAG 2.2 AA audit before release. Token contrast checks are not a compliance certificate.

## Data And Routing Limits

Listed hours are not proof of service. When kitchen hours are absent, service expectation is based on trading hours, not invented kitchen-hour records. This basis is available on tap.

Routes have no live-traffic guarantee. Fuel results depend on the user's car and price inputs. Source, expiry, wholesale-price caveats, return assumptions and location handling remain in **How estimates work**.

The trip service allows web origins on localhost/127.0.0.1 port 8081. A preview on another port can test layout and sheets, but its routing calls are rejected until that origin is approved. Do not weaken the admission checks to bypass this.
# Return-leg regression checks, 4 October 2026

Selecting return fuel requests a one-way route from the venue to the accepted origin. It preserves outbound distance, duration and departure, and does not request GPS again. Switching return off/on reuses an accepted return leg. A failed return request retains the outbound estimate and labels the doubled-distance fuel fallback in the estimate surface. Switching return off removes that fallback. Repeat taps cannot add another pending request.

Three added component tests cover unchanged arrival with a different return duration/distance, failed return with retained outbound directions and labelled fallback, and repeat-tap protection. The existing reuse test now checks reverse endpoints and a one-way request. All 175 mobile tests and mobile TypeScript passed. These component mocks do not prove phone permissions, provider routing or rendered layouts.

Android export also passed: 3,874 modules and 49 assets in `apps/mobile/.expo/return-leg-export`. Sentry still warns that organisation/project configuration is missing. No provider calls or deployments were needed for these tests.

## Browser and provider pass, 4 October 2026

Chrome at localhost:8081 loaded after a navigation timeout; inspecting the existing tab showed the app, so no server was restarted. Diagnostics were declined before testing. This pass used the app's configured data and route service, not a mocked browser response.

- Home search for Stoetbul showed branch suggestions. Selecting Parkview opened `/restaurants/stoetbul-parkview`.
- At 375px the venue showed a schedule-labelled Expected closed, with a disclosure saying listed hours are not a check and kitchen hours are not published. The main surface and trip sheet were inspected in Light and Dark.
- Saved Parkview, opened Saved and removed that test save. Explore category selection opened restaurant results. No report or email was sent.
- Settings saved test inputs of 7.5 L/100 km, petrol 95, inland and R23/litre. A page reload restored the consumption and price; the values were cleared afterwards. The theme was returned to System and viewport override reset.
- Address search for the public landmark Menlyn Pretoria returned a provider result. Selecting it estimated an outbound trip to Parkview: 6.7 km, 13 minutes and arrival 13:59 SA time. Selecting return fuel completed a reverse route without changing the displayed arrival. The switch became checked after the request completed; the automation's immediate checked-state assertion ran before that asynchronous update, so state was inspected rather than clicking again.
- The planner fuel sheet accepted 7.5 L/100 km and R23/litre test inputs. It showed R21.55 there-and-back fuel. The details sheet exposed 12.5 km fuel distance and 0.94 litres (rounded display values). These are test inputs and a route response, not reference fuel prices or a promise about traffic.
- The route page's document width equalled viewport width at 320, 375, 414 and 768px. This is page-width evidence, not proof that every child or scaled text fits.
- Reporting entry exposed answer text but no button role before the fix. Theme choices lacked checked state in the web DOM despite selection colour. Added answer roles and web ARIA states for answers, source choices, themes, shared chips and action-button loading/disabled states. The sign-in email input now has a label.
- After reload, Light/Dark radio checked state and chip pressed state were present. Enter on Yes, open advanced to kitchen status. Completing the required draft and submitting without a check source showed an alert; it did not proceed to sign-in or a report write. Returned through Back to place.

Two added tests render the installed React Native Web controls rather than native-component mocks, checking busy/disabled commands and chip selection. All 187 mobile tests and mobile TypeScript passed. Screenshots: `apps/mobile/.expo/venue-flow-light-oct4.jpg`, `venue-flow-dark-oct4.jpg` and `trip-live-dark-oct4.jpg` (the last captures the calculation disclosure sheet). Hardware back, Android permissions, keyboard and text scaling remain phone gates. Hosted trust aggregation, venue messaging and Gemini were not tested or deployed.

Android export after these fixes passed: 3,874 modules, 49 assets, `apps/mobile/.expo/browser-qa-export`. Sentry organisation/project setup remains unset.
