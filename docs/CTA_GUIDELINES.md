# KNOGO CTA Checks

Reference: [Fireart's mobile CTA article](https://fireart.studio/blog/how-to-design-a-powerful-cta-button-for-a-mobile-application/).

## Rules

- Name the action and outcome: Search, Submit check, Estimate my trip, Open directions and Save fuel details.
- Give the current task one filled primary command. Use surface buttons for alternatives and text commands for disclosures.
- Use existing theme tokens, not a new CTA palette. Green identifies the action; it does not prove a venue is open.
- Keep actions near their inputs or result. Do not add another floating button above the navigation bar.
- Keep shared action buttons at 52 pixels or more in height and touch targets at 44 by 44 or more. Allow growth with text scaling; never clip a label to keep a height.
- Separate controls with the existing spacing scale. Preserve search, keyboard and safe-area layouts.
- Show loading labels and a spinner, prevent repeat taps, keep answers after failure and show success only after acceptance.
- Expose busy, disabled and selected states to accessibility APIs. Use an outline for web focus without changing layout dimensions.

The article's shadow and gradient examples are options, not requirements. KNOGO keeps its filled and outlined controls. Its example minimum sizes are not a WCAG compliance certificate.

## Changes In This Pass

- Shared ActionButton adds focus and hover feedback, keeping caller event handlers and loading protection.
- Report-source selectors increase from 40 to 44 pixels minimum height, add vertical padding for text scaling and use the control-boundary token.
- Report commands name the outcome: Submit check, Add more checks and Skip and submit.
- Tests cover rendered web focus, hover, selection and busy/disabled behaviour. Existing theme tests check text at 4.5:1 and control boundaries/focus at 3:1 in both themes.

## Remaining Device Checks

- Check main flows at 320, 375, 414 and 768 pixels, including text scaling and keyboard visibility.
- Check TalkBack announcements, focus order and CTA reachability on Android.
- Confirm error and success states against the configured backend, not just component tests.

This pass is not an app-wide WCAG AA sign-off. Contrast tests and component tests cannot prove device layout, screen-reader behaviour or every route.
