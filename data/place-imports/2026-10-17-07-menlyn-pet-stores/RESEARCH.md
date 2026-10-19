# Menlyn And Pet Stores: Batch 07

Applied 17 October 2026. Four additions and two updates, all in Pretoria East. Existing Clicks and Absolute Pets groups are reused; no mall becomes the parent group of its tenants. Six schedules expand to 42 opening days.

## Sources And Decisions

| Record | Source | Decision |
| --- | --- | --- |
| Clicks Menlyn Park | https://clicks.co.za/store/Menlyn-Park/365 | Operator supplies shop LF72, address, phone, map data attributes and seven opening days. Store/pharmacy and clinic hours differ. Keep the first/last Saturday clinic exception in service details, not the weekly shop schedule. |
| Clicks Menlyn Maine | https://clicks.co.za/store/Menlyn-Maine/1805 | Operator supplies address, shop/pharmacy phones, map data attributes and seven opening days. Its own pin is used rather than copying the centre's pin. |
| Absolute Pets Menlyn Maine | https://www.absolutepets.com/pet-stores/locator | Operator supplies G14a, address, phone and weekly hours. Prefer it to https://www.centralsquare.co.za/absolute-pets/ where weekday closing and Sunday opening differ. Both sources are recorded. Centre pin comes from the directions link on https://www.centralsquare.co.za/contact-us/ and resolves to the place coordinates `-25.78506,28.28117`, not a shop entrance. |
| Absolute Pets Parkview | https://www.absolutepets.com/pet-stores/locator | Operator supplies G83, Pretoria address, phone and weekly hours. Centre map source: https://parkviewshopping.co.za/contact. |
| Absolute Pets The Grove | https://www.absolutepets.com/pet-stores/locator | Fill seven previously unpublished opening days. Prefer the operator's `012 004 1190` to the mall directory's `067 003 9358`; preserve the prior value and source in service details. Retain shop L76 and the existing sourced centre pin. |
| Absolute Pets Woodlands | https://www.absolutepets.com/pet-stores/locator | Fill seven previously unpublished opening days and add shop 227. Prefer the operator's `012 804 1224` to the mall directory's `010 023 0624`; preserve the prior value and source. Retain the sourced centre pin. Saturday and public holiday schedules differ from other branches. |

## Further Leads

- The same Absolute Pets locator provides complete weekly store schedules for Faerie Glen (shop 12, Faerie Glen Shopping Centre, `012 004 1196`) and Hazeldean (shop 2, Hazeldean Square, 1 Silverlakes Road, `012 004 2155`). Coordinates still need source checks before import. Hazeldean's pet spa has separate hours and must not inherit store hours.
- The locator's Boardwalk branch is in Summerstrand, Gqeberha, not Pretoria East. Exclude it despite the familiar centre name. Other branches outside the boundary are not import candidates.
- https://exclusivebooks.co.za/pages/find-a-store confirms Menlyn Park shop LF51 and `012 361 6188`, but does not publish branch opening hours. Its footer contact hours belong to support, not the store. The Menlyn Park tenant page returned a browser challenge, so its search snippet is not treated as a verified full page.
- Central Square's directory has repeated sections and conflicting numbers, including a SPAR entry reusing Pick n Pay's phone. Verify individual tenant/operator pages. Do not import directory entries as verified merely because the page loaded.

## Validation And Apply

Restored only the missing `csv-parse` 6.1.0 dependency from the npm registry after checking its archive SHA512 against the lockfile. No package version changed. The importer then validated this batch with zero errors and 12 warnings for omitted images/menus. Generated SQL was reviewed and given before/after database cap guards, a no-existing-new-ID guard and an expected-source/phone guard for both updates. Preserve those guards if regenerating.

PowerShell checks passed: six unique place IDs, JSON service details, Clicks/Absolute Pets group references, one source/date per schedule and seven non-duplicated opening days per place (42 total). An assert-based importer check also passed clinic exceptions, prior-phone provenance, image preservation, no deletion and cap guards. The full Vitest suite was not rerun: its packages still need the workspace restore.

Staged four inactive additions while both existing branches stayed active. Database checks confirmed seven opening days per record, no kitchen rows, matching source/date fields and matching group categories. Activated the additions after those checks. Before/after live-status fingerprints for both existing branches match, and all new status rows remain unknown with confidence zero. No community report rows were read or changed.

After this batch: 160 places, 155 active, 96 groups. Database 14,232,723 bytes; growth 262,144 bytes since baseline, below the 100 MB cap. No generated SQL was applied without its staging checks.

No images supplied here. Photo loading, filters and UI redesigns remain in the goal. No new community status claims are created by website hours or a source's "open now" label.
