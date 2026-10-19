# Hot Spot Photo

Status: held, not applied. The user requires permission before use.

- Used Google Images with the exact place query `Hot Spot Cycles Pretoria`. First visible result in this session was Bicycle South's shop photo, not the logo shown as the next result.
- Opened the preview and read the displayed full-resolution image URL. Source page Open Graph metadata matches that URL and declares image/jpeg.
- Image/source URLs, credit and check date only; no binary image upload to Supabase, no logo fields changed, no changes to hours, contact, location or community reports. Existing non-photo fields and status/hours fingerprints are guarded.
- Source page was updated in 2017. Photo does not establish the shop's current layout. Reuse permission is not verified; Google ranking and attribution do not clear copyright.
- Expo Image uses `cachePolicy=none`, documented on Android/iOS/web. Missing/failed photo requests retain the existing initial. A loaded image is not actively cleared by a connectivity monitor; failed URLs retry after the card remounts or its URL changes. Android network transitions remain unverified.
- Discovery list/grid tiles use branch photos. Multi-branch group tiles retain an initial, since a branch photo must not imply every location looks the same. Source credit/link is behind About this listing.

The write returned an expired request-state error. Readback confirmed the full place record, hours and status remain unchanged, with all photo fields null. No retry made. The user answered: "Hold until permission is confirmed". Do not run `update.sql` or write this photo URL without verified reuse permission. Credit alone does not authorise use.

Four photo-component tests, two list/grid caller tests and two credit/link tests cover the change. Five image/caller regressions and two credit regressions failed before implementation and pass afterwards. Full mobile suite: 471 tests across 39 files; mobile TypeScript passes. No Android image/network-transition verification is claimed.

Browser fallback check: Shops query Hot Spot returns one result, retains its H initial and switches list/grid without captured console errors. No actual-photo or browser offline-transition claim: database URL remains null pending the reuse decision.
