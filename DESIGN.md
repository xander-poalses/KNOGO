# KNOGO Design System

## Product Job

KNOGO helps a person check whether a place is open, serving, and working before they leave. Discovery, maps, and distance are supporting filters. Live status is the first message and the first detail on each place.

## Interface Voice

- Use a work-focused community tone.
- State what KNOGO knows, when it was checked, and where the report came from.
- Do not claim that an estimated or unverified report is confirmed.
- Keep one main task per screen.
- Show schedule expectations as expectations, not community confirmations. Reports that pass the trust rules take priority; conflicting reports remain visible.
- Put sources and calculation assumptions behind details controls. Do not repeat missing-data labels across the place overview.
- A trip estimate defaults to device location and leaving now. Request location after a user asks for an estimate, not on screen load.

## Structure

- Use the tokens in `apps/mobile/src/theme.tsx` for colour, spacing, radii, shadows, and control sizes.
- Keep cards for place records, group records, and framed tools. Do not wrap page sections in cards.
- Use square image tiles for browse grids and detailed rows for search results.
- Keep buttons and inputs at least 44px high. Primary controls use 52px where space permits.
- Use bottom sheets for actions that do not need their own screen.
- Standalone containers and controls use the 26px corner token. Nested corners subtract their padding: sheets with 14px inset use 40px corners, check containers with 15px inset use 11px tiles, cards with 16px inset use 10px children, and segments with 4px inset use 22px children. Circles and checkbox indicators retain their geometry. The 66px navbar uses 33px corners and 28px selection corners inside its 5px padding. Web CSS uses the same base with inset calculations in its layout units.
- The Figma Status and Plan trip frames set the typography: DM Sans 26/38 headings and 44/53 status or cost totals. Sheet commands use 66px targets with 22/32 text; other commands keep their existing target size and use 16/24 text.
- Use `sheetInset` for fields and disclosures on sheets, with `surface` for check tiles. The two-column check grid grows with text. This framed status tool is the exception to the no-nested-cards rule.
- Report ages belong beside status. Put check evidence behind disclosures, retain conflict and expectation wording, and show only checks the app collects. Trip totals and listed-hours buffers require a calculated route; never use prototype numbers.
- Route previews reuse the branch map and its native-module guard. Keep map gestures in the expanded view and leave directions available when the map cannot load. Do not request location to display the destination.
- Keep headings within their content level. Add line height and bottom space for descenders.

## Interaction States

- CTA labels name the next action, use a verb and stay short where meaning allows. Keep one filled next-step command per task surface; options and disclosures use another treatment. Leave space around the command and place it after its inputs. Controls retain at least a 44px target and grow with text scaling.
- Action buttons announce busy state, show progress and reject repeat taps. Caller styles must not remove base sizing by replacing the style function. Do not use gradients or shadows just to signal clickability.

- WCAG 2.2 AA is the minimum for every change. Contrast tests do not replace keyboard, screen-reader, text-scaling and device checks.
- Text needs 4.5:1 contrast; large text needs 3:1. Controls, state indicators and focus rings need 3:1 where they convey meaning.
- Use `statusSurface` for the status band, `tripSurface` for trip controls and `sheetSurface` for sheets. Keep supporting content on `background`.
- Use headings, spacing and disclosure controls as well as colour. A tint must never imply that an expectation is a confirmed report.
- Status surfaces are neutral in both themes. Schedule expectations, missing checks and expired reports have no success or danger colour. Report-supported answers use green for working and red for a problem; conflicts use amber. Pair each with a label and shape, not colour alone. Brand green remains available for commands.
- Use `controlBorder` for input boundaries; `border` is for dividers. Check default, pressed and focused states in both themes.
- Web keyboard focus uses an outline. Text containers grow with font scaling; never clip a label to preserve a control height.

- Give every press target an accessibility role and label.
- Expose selected, expanded, disabled, busy, and invalid states where they apply.
- Use opacity for press feedback. Do not resize layout on press.
- Keep focus inside modal flows, restore it on close where the platform supports it, and support Android back.
- Do not place floating controls over place content.

## Mobile Rules

- Check layouts at 320, 375, 414, and 768px widths.
- Keep command labels on one line and scale short labels when needed.
- Keep status-bar and home-indicator safe areas clear.
- Never store or send discovery coordinates to Supabase.

## React Native Rules

- Use `expo-image` for app and remote images.
- Do not add colour, spacing, radius, or typography values inline. Add a named token first.
- Do not use web streaming APIs such as `response.body.getReader()` on Hermes.
- Do not measure a view in `onLayout` and start an animation from a `useEffect` chain.
- Keep storage reads out of component render paths.

## References

- [HeroUI](https://heroui.com/)
- [HeroUI Native composition](https://heroui.com/en/docs/native/getting-started/composition)
- [React Aria](https://react-aria.adobe.com/)
- [Avoid AI Code Slop in React Native](https://aimobilelauncher.com/blog/avoid-ai-code-slop-react-native-mobile)
