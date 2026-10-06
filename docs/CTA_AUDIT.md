# KNOGO CTA Review

Reference: [Fireart mobile CTA article](https://fireart.studio/blog/how-to-design-a-powerful-cta-button-for-a-mobile-application/).

## Rules

- Labels name the action and its outcome. Prefer one to three words where meaning permits.
- Use one filled next-step command per task surface. Keep alternatives outlined or as disclosures.
- Keep 44px touch targets, with 52px height for main commands. Let labels grow with text scaling.
- Put submission after the answers and estimation after the trip controls.
- Keep space around commands. Use KNOGO tokens, not added shadows or gradients.
- Pair colour with labels, icons and state. Preserve focus outlines, progress, disabled state and repeat-tap guards.
- Keep haptics on commands, not on modal backdrops.

## Source Review: 4 October 2026

`Ui.tsx` already supplies sizing, focus, hover, press and busy feedback.
Reporting uses Submit check and an outlined Add more checks alternative.
Trip planning uses Estimate my trip, then Open directions after an estimate.
Fuel setup uses Save fuel setup with an outlined Clear fuel setup alternative.
These labels retain their meaning rather than being shortened to fit a word count.

Venue and trip sheets now show the backdrop before the sheet entrance. Reduced-motion
settings skip the entrance. Closing cancels animations; reopening starts from the beginning.

## Verification Limits

All 228 mobile tests and mobile TypeScript checks pass. Browser checks cover
hours and trip sheet opening, closing and focus return. The venue dashboard
was inspected at 320px in dark mode; its commands remain within the viewport.

Component tests and contrast tests do not establish app-wide WCAG conformance.
Phone checks for touch, text scaling, TalkBack, keyboard, safe areas and haptics remain.
Search, filters, branch details and diagnostics consent now use the same
backdrop-first sequence as venue/trip sheets. Search retains its overlay token.
The branch and consent sheets reuse PlaceSheet's scrolling, header and safe
areas. Consent only takes effect after its device-storage write succeeds.
Branch selection, search routing and filter selection were checked in Chrome.
Search/filter/branch sheets have no horizontal overflow at 320/375/414/768px;
the filter and branch close controls measure 44x44px and stay within the viewport.
