# Mall Coverage Ledger

Research in progress, not a claim that every tenant has been imported. Pretoria East only. User confirmed Irene is deferred.

| Mall | Directory / source | Research state | Import state |
| --- | --- | --- | --- |
| Menlyn Park | https://www.menlynpark.co.za/stores/ | Tenant fetch still returned a browser challenge on 17 October. Clicks and PNA operator pages provide weekly hours, shop numbers and map pins. Exclusive Books locator verifies LF51/phone but no hours. | Existing food tenants; Clicks and PNA active with seven opening days each. Other retail tenants pending. |
| Menlyn Maine Central Square | https://www.centralsquare.co.za/store-directory/ | Directory and contact/tenant pages rechecked. Repeated sections and conflicting numbers require operator cross-checks. Clicks and Absolute Pets operator schedules verified; centre directions link supplies centre pin. | Clicks and Absolute Pets active from batch 07 with seven opening days each. Further tenants pending. |
| Woodlands Boulevard | https://woodlandsboulevard.co.za/shops | Directory now reports 154 results. Initial seven tenant schedules plus Absolute Pets operator hours and 22 tenant schedules checked through batch 09; centre directions supply a shared pin. Coming-soon / refurbishment listings excluded. | Builders plus 33 further additions active, including shops, Plush Carwash, Tiger Wheel & Tyre and The Fun Company. Three added tenants still lack hours; other directory tenants remain in scope. |
| Castle Gate / Lifestyle | https://castlegate.co.za/castle-gate---stores | Both precinct directories read. Gym, Dis-Chem and PNA operator pages supply weekly hours; mall directory does not supply tenant hours. | 21 additions active: 20 shops and Planet Fitness. Dis-Chem/PNA hours and service evidence updated through batch 12. Food tenants and further businesses remain in scope. |
| The Grove Mall | https://www.thegrovemall.co.za/the-grove-mall---stores | Both directory pages read. Directory has names, phones and shop numbers but no tenant hours; operator schedules checked for Absolute Pets, Clicks and PNA. Centre map widget supplies GPS. | 26 additions active across shops, entertainment, sport and the FNB Home Affairs counter. Absolute Pets, Clicks and PNA now have seven opening days. Counter hours and eligibility remain unverified; not all tenants imported. |
| Parkview | https://parkviewshopping.co.za/shop | Directory and contact page read on 17 October. Centre map and hours verified; branch pages verify Clicks and PostNet Woodhill. Several directory phones repeat the centre number. IndyKart has an undated relocation notice. | Existing Stoetbul and Nando's Woodhill. Centre, Clicks and PostNet active from batch 06, each with seven sourced opening days. Gym, independent shops and other tenants remain in scope. |
| Brooklyn Mall | Source discovery pending | Pending | Pending |
| Lynnwood Bridge | https://lynnwoodbridge.co.za/lynnwood-bridge---restaurants | Existing food source; retail directory still needs review | Pending |
| Hazeldean Square | https://www.hazeldeansquare.co.za/hazeldean-retail-square---stores | Existing food source; PNA operator locator checked for shop 18, weekly hours, contact and map pin. Rest of retail directory still needs review. | PNA active from batch 12; other retail tenants pending. |
| Atterbury Value Mart | Source discovery pending | Pending | Pending |
| Silver Oaks / Silver Lakes centres | Source discovery pending | Pending | Pending |
| Irene Village Mall | Outside current boundary | Deferred by user | Do not import |

## Rules

- Link a tenant to its business brand, not to the mall as a business group.
- Keep branch-specific phones and source conflicts visible. A call-centre number is not a branch phone.
- Store a sourced centre pin as centre-level accuracy; never fabricate offsets for tenants.
- Do not infer tenant hours from centre hours, or holiday hours from weekday schedules.
- Classify only supported place types. Record exclusions or missing evidence rather than forcing banks, medical practices and unrelated services into the wrong category.
- Expand beyond malls for garages, workshops, public services and sport/outdoors. A mall tenant list alone does not fulfil category coverage.

## Castle Gate Selection Notes

- Batch 04 covers Builders, Checkers, Dis-Chem, Freedom of Movement, Oasis Water, Pick n Pay Clothing, The Crazy Store, Wellness Warehouse, Woolworths, Wordsworth Books, Destinations by Frasers, Eskort, Expert Kloppers, Food Lover's Market, Mambo's, Mr Price Home, PNA, UNIQ, Weylandts, Yuppiechef and Planet Fitness.
- ATM entries are not separate places in this import. Banking, medical, optical and salon services have no agreed category here and were not forced into Shops or Public Services.
- Checkers' 021 number and Pick n Pay Clothing's 011 number remain in provenance only, not the branch phone field, pending confirmation of scope.
- Existing food tenants are preserved for the later 67-record audit. The directory lists further food tenants and boutiques that still need classification / chain checks; this batch does not claim full tenant coverage.
- Erasmus Park added as a suburb beneath Pretoria to match the centre's published address. Earlier Erasmuskloof assignments are not automatically changed.

## Woodlands Research Notes

- Batch 12 cross-checked PNA against its operator locator. Weekly hours agree, but shop 6 differs from the mall's shop 7. Operator value used with both sources retained; old entrance/floor no longer presented as current.

- The directory reports 153 store results. It marks Burnt Studios as coming soon, and PEP Home and Pringle as closed for refurbishment. Do not import these as active trading branches without further checks.
- Source page "open now / closed now" labels are not community reports and must not populate live status.
- Tenant pages can supply branch hours and shop numbers. Prefer those to applying centre hours to all stores.
- Absolute Pets operator locator supplies shop 227, weekly hours and a different phone from the centre directory. Batch 07 applied the update and retained the previous phone/source in provenance.
- Batch 09 updated 22 tenant schedules and shop/entrance details, retaining chain groups and centre-level pins. Outdoor Warehouse closes earlier than the centre; The Fun Company closes later.
- Checkers' tenant page publishes 22:00-22:00 for every day; do not infer 24-hour trading. Pick n Pay Clothing returned SSO-only content. Toys R Us has a directory card but no matching URL in the centre sitemap. These three remain without hours pending source checks.

## Parkview Research Notes

- [Centre contact page](https://parkviewshopping.co.za/contact) links a Google place pin at `-25.8183141,28.3034427`; use the place coordinates, not the camera centre. Centre hours: Mon-Fri 09:00-18:00, Sat-Sun 09:00-17:00.
- [Clicks Parkview](https://clicks.co.za/store/Parkview/1664) publishes Mon-Fri 09:00-18:00, Sat 09:00-17:00, Sun 09:00-15:00. Branch pharmacy details are separate from the shop phone.
- [PostNet Woodhill](https://www.postnet.co.za/stores/woodhill/5c69211b55c8c661d10beaaa) is shop G153 here. The operator's Parkview-named branch is in Johannesburg and must not be imported for this centre.
- [IndyKart](https://indykart.co.za/our-tracks/parkview-shopping-centre/) announces Parkview closing 9 November and Woodlands reopening 21 November, without a year. Hold until the current location is resolved.
- [Virgin Active Moreleta Park](https://www.virginactive.co.za/gyms/moreleta-park) confirms its Parkview Lifestyle Centre address and phone, but the fetched page exposes today's hours only. Do not derive opening hours from the class timetable or off-peak membership window.
- Other chains and independent shops remain unimported. The older Flower Market Shopify page does not establish current hours or a branch phone. Directory cards returning to the home page are not branch-specific sites.
- Absolute Pets operator locator confirms G83, seven opening days and `012 004 1197`; active as a chain branch from batch 07.

## Menlyn And Menlyn Maine Research Notes

- [Clicks Menlyn Park](https://clicks.co.za/store/Menlyn-Park/365) supplies `-25.782714,28.274678`, shop LF72, branch contacts and store/pharmacy hours. Clinic hours and its first/last Saturday exception are separate.
- [Clicks Menlyn Maine](https://clicks.co.za/store/Menlyn-Maine/1805) supplies `-25.7855519,28.2804201`, branch contacts and seven opening days.
- [Absolute Pets operator locator](https://www.absolutepets.com/pet-stores/locator) supplies Menlyn Maine G14a and hours that differ from the centre's tenant page: weekday close 19:00, not 18:00; Sunday open 09:00, not 08:00. Conflict retained in batch 07 provenance.
- Central Square's [contact directions link](https://www.centralsquare.co.za/contact-us/) resolves to centre place coordinates `-25.78506,28.28117`. These are not a shop entrance and are labelled centre-level.
- The [Exclusive Books operator directory](https://exclusivebooks.co.za/pages/find-a-store) confirms Menlyn Park LF51 and `012 361 6188`. Do not copy its footer support hours into the store schedule. The mall's tenant page could not be verified beyond its challenge page.
