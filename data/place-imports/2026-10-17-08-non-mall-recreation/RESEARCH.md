# Non-Mall Recreation: Batch 08

Applied 17 October 2026. Two Pretoria East additions outside malls, with 14 sourced opening days. No images or community status claims supplied.

| Place | Category and grouping | Evidence |
| --- | --- | --- |
| Thrashers Padel & Skate | Sport & Outdoors, sports centre; no chain group assigned for this single venue | [Operator site](https://thrashers.co.za/) supplies 241 Serene Street, phone, email and venue hours: Mon-Sat 06:00-22:00, Sun 06:00-20:00. [Skate page](https://thrashers.co.za/skate/) confirms activities and under-18 helmet rule. Its directions link resolves to `!3d-25.7890875!4d28.285009`; the camera longitude `28.2801381` is not the place pin. Do not treat lesson times or padel slot availability as opening hours. |
| Create Wolwespruit | Entertainment, pottery-painting studio; Create Ceramics brand group, not the Wolwespruit park group | [Operator site](https://www.createwolwespruit.co.za/) identifies Create Ceramics and names Wolwespruit/Red Barn in its title. It supplies the Wolwespruit address, daily 09:00-17:00 hours, activities and bookings. No Red Barn place is added because Irene is outside scope. The site's listed number is WhatsApp only; leave `phone` blank to avoid an unsupported call action. |

## Coordinate And Contact Limits

- Create's [contact page](https://www.createwolwespruit.co.za/contact/) embeds an address search for 501 Jochemus Street with a map camera centre, not a studio place pin. Reuse the host site's [published directions destination](https://wolwespruit.co.za/scripts.8138b9f4dcb5a4639c62.js), already checked for the trail park, and label it shared site-level accuracy. Do not fabricate an offset to avoid co-location.
- Create's inline email caption shows `info@createwolwespruit.co.za` but its `mailto` targets Red Barn. The footer supplies a matching Wolwespruit `mailto`. Use the footer value and record the conflict.
- Create's paint nights are event-specific and do not extend its daily schedule. Its cafe does not turn the primary pottery activity into a restaurant or justify kitchen reports.
- A search result for Create's blanket campaign lists other Gauteng locations, but the Instagram post could not be read in full. It is not the sole evidence for grouping; the venue's own Create Ceramics branding and Wolwespruit/Red Barn title supply the brand relationship. Legal ownership of every franchise is not asserted.

## Held Lead

[The Climbing Barn](https://climbingbarn.co.za/) gives weekday member access 11:00-20:00 and says non-members/functions use bookings. Its [climbing page](https://climbingbarn.co.za/climbing/) gives Plot 210 Korhaan Dirt Road, Mooiplaats. Do not treat the weekday member window as seven-day public walk-in hours. Mooiplaats is beyond the suburbs currently used in the import region list; the site's Pretoria East marketing alone is not sufficient boundary evidence for an import. Location and access still need review.

## Validation And Apply

Importer validation passed with zero errors and six warnings for omitted images/logos/menus. An assert-based check passed the 14-day expansion, brand grouping, WhatsApp-only contact, Thrashers place pin and before/after cap guards. No full Vitest/mobile run is claimed while workspace dependency restoration remains pending.

Checked both place IDs and the new group ID were absent, then staged inactive. Verified category/group matching, sourced hours, phone handling, coordinates and no kitchen rows. Activated after those checks. Both live-status rows are unknown with confidence zero; no source's "open now" label became a community report. Existing park/tenant records and reports were not changed.

After this batch: 162 places, 157 active, 97 groups. Database 14,249,107 bytes; growth 278,528 bytes (0.279 MB) since baseline. Import and activation include before/after cap guards at 113,970,579 bytes. Keep the guards if regenerating SQL.
