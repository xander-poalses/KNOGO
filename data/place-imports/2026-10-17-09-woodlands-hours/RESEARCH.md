# Woodlands Hours: Batch 09

Applied 17 October 2026. Updates only: 22 existing branches and 154 opening-day rows. No groups, images, kitchen hours or community reports added.

## Sources

Read each tenant's own Opening Times section, not the site header, Similar Stores cards or an open-now label. All pages also match the branch phone already stored. The tenant pages supply ground-floor shop numbers and entrances. Coordinates remain the documented centre pin; no doorway accuracy is asserted.

| Place | Tenant source | Weekly hours |
| --- | --- | --- |
| Baby City Woodlands | https://woodlandsboulevard.co.za/shop/baby-city | Mon-Sat 09:00-19:00; Sun 09:00-17:00 |
| Bargain Books Woodlands | https://woodlandsboulevard.co.za/shop/bargain-books | Mon-Sat 09:00-19:00; Sun 09:00-17:00 |
| Cape Union Mart Woodlands | https://woodlandsboulevard.co.za/shop/cape-union-mart | Mon-Sat 09:00-19:00; Sun 09:00-17:00 |
| Dis-Chem Woodlands | https://woodlandsboulevard.co.za/shop/dis-chem | Mon-Sat 09:00-19:00; Sun 09:00-17:00 |
| Edgars Woodlands | https://woodlandsboulevard.co.za/shop/edgars | Mon-Sat 09:00-19:00; Sun 09:00-17:00 |
| Exclusive Books Woodlands | https://woodlandsboulevard.co.za/shop/exclusive-books | Mon-Sat 09:00-19:00; Sun 09:00-17:00 |
| Freedom of Movement Woodlands | https://woodlandsboulevard.co.za/shop/freedom-of-movement | Mon-Sat 09:00-19:00; Sun 09:00-17:00 |
| iStore Woodlands | https://woodlandsboulevard.co.za/shop/istore | Mon-Sat 09:00-19:00; Sun 09:00-17:00 |
| Le Creuset Woodlands | https://woodlandsboulevard.co.za/shop/le-creuset | Mon-Sat 09:00-19:00; Sun 09:00-17:00 |
| Mr Price Home Woodlands | https://woodlandsboulevard.co.za/shop/mr-price-home | Mon-Sat 09:00-19:00; Sun 09:00-17:00 |
| Mr Price Sport Woodlands | https://woodlandsboulevard.co.za/shop/mr-price-sport | Mon-Sat 09:00-19:00; Sun 09:00-17:00 |
| Mr Price Weekend Woodlands | https://woodlandsboulevard.co.za/shop/mr-price-weekend | Mon-Sat 09:00-19:00; Sun 09:00-17:00 |
| MTN Woodlands | https://woodlandsboulevard.co.za/shop/mtn | Mon-Sat 09:00-19:00; Sun 09:00-17:00 |
| Outdoor Warehouse Woodlands | https://woodlandsboulevard.co.za/shop/outdoor-warehouse | Mon-Fri 09:00-18:00; Sat 09:00-17:00; Sun 09:00-15:00 |
| PEP Woodlands | https://woodlandsboulevard.co.za/shop/pep | Mon-Sat 09:00-19:00; Sun 09:00-17:00 |
| PNA Woodlands | https://woodlandsboulevard.co.za/shop/pna | Mon-Sat 09:00-19:00; Sun 09:00-17:00 |
| Telkom Woodlands | https://woodlandsboulevard.co.za/shop/telkom | Mon-Sat 09:00-19:00; Sun 09:00-17:00 |
| The Crazy Store Woodlands | https://woodlandsboulevard.co.za/shop/the-crazy-store | Mon-Sat 09:00-19:00; Sun 09:00-17:00 |
| The Fun Company Woodlands | https://woodlandsboulevard.co.za/shop/the-fun-company | Mon-Sat 10:00-23:00; Sun 10:00-22:00 |
| Vodacom Shop Woodlands | https://woodlandsboulevard.co.za/shop/vodacom-shop | Mon-Sat 09:00-19:00; Sun 09:00-17:00 |
| Woolworths Woodlands | https://woodlandsboulevard.co.za/shop/woolworths | Mon-Sat 09:00-19:00; Sun 09:00-17:00 |
| Yuppiechef Woodlands | https://woodlandsboulevard.co.za/shop/yuppiechef | Mon-Sat 09:00-19:00; Sun 09:00-17:00 |

Dis-Chem's schedule is retail trading hours, not a promise about clinic or pharmacy services. Holiday changes remain unverified. Tenant pages sometimes supply centre or staff email addresses; no such addresses are added to branch contacts.

## Held Hours

- Checkers: https://woodlandsboulevard.co.za/shop/checkers publishes 22:00-22:00 for all seven days, while a related-store card differs. This is not evidence of 24-hour trading. The operator directory returned Cape Town defaults, not this branch. Keep hours unset until the conflict is resolved.
- Pick n Pay Clothing: the tenant page at https://woodlandsboulevard.co.za/shop/pick-n-pay-clothing returned only Hyprop SSO on two attempts. Do not apply mall hours as a substitute.
- Toys R Us / Babies R Us: its directory card exists, but no matching tenant URL appeared in the centre sitemap. The South African operator locator needs a branch-specific result. US Woodlands matches are excluded.

## Apply Rules

The update must require all 22 IDs to exist, remain active, match the captured records and have no opening rows. Before/after database size must remain below 113,970,579 bytes (baseline plus the user's 100 MB cap). Do not regenerate SQL without restoring its guards. No activation is needed for existing records.

Use importer validation and an assert-based batch check. Full Expo, browser and Vitest checks remain pending dependency restoration; this batch changes directory data only.

## Verification

Importer validation passed: zero errors, 44 warnings for omitted photos and menus. Assert checks passed for all 22 prior identities, groups, map pins, tags and features; every imported day matches its tenant source. Guards passed before and after the update, including all prior record hashes and live-status hashes.

Database recheck confirms 22 active updated places with seven opening days each, matching source URLs/dates, shop numbers and entrances. All 22 live-status hashes are unchanged. The three held records still have no opening rows and retain their previous source date.

Totals remain 162 places, 157 active and 97 groups. Database 14,331,027 bytes; growth 360,448 bytes (0.360 MB) from the 13,970,579-byte baseline. Active non-test places without opening days dropped from 70 to 48.
