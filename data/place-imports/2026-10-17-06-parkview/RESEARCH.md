# Parkview Batch 06

Checked 17 October 2026. Pretoria East only. Four records selected with published weekly hours, contact routes and map evidence: three at Parkview plus a stand-alone trail park. No images or community status claims supplied in this batch.

| Record | Identity and grouping | Evidence |
| --- | --- | --- |
| Parkview Shopping Centre | Ungrouped centre; not a parent business group for tenants | [Contact page](https://parkviewshopping.co.za/contact): 24 Garsfontein Road, phone, weekly centre hours and map pin. The `!3d`/`!4d` pin is used rather than the map camera centre. |
| Clicks Parkview | Existing Clicks group | [Branch page](https://clicks.co.za/store/Parkview/1664): Pretoria address, shop and pharmacy phones, seven opening days. Sunday 15:00 closing differs from the centre's 17:00 closing. |
| PostNet Woodhill | New PostNet group; privately operated courier/printing counter, not a government office | [Operator page](https://www.postnet.co.za/stores/woodhill/5c69211b55c8c661d10beaaa): shop G153, address, phone, seven opening days, public holiday closure and operator map pin. Do not confuse with PostNet Parkview at 54 Tyrone Avenue in Johannesburg. |
| Wolwespruit MTB and Trail Park | Ungrouped park; its tenants are separate businesses | [Park page](https://wolwespruit.co.za/): street address, weekly park/trail hours, public holiday opening, activities, pass requirements and email. The location map's [published script](https://wolwespruit.co.za/scripts.8138b9f4dcb5a4639c62.js) links directions to `-25.8100821,28.263422`; trail polyline coordinates were not used. The park's phone is labelled emergency and is not stored as a general enquiry phone. |

## Held And Remaining Leads

- [Parkview tenant directory](https://parkviewshopping.co.za/shop) lists chains and independent tenants, but links tenant cards back to the home page. Several unrelated entries repeat the centre's `086 133 5435` number. Do not use those as branch phones.
- [IndyKart Parkview](https://indykart.co.za/our-tracks/parkview-shopping-centre/) publishes weekly hours, booking requirements, minimum height and a cashless rule. It also says Parkview closes on 9 November and reopens at Woodlands on 21 November, without a year. Hold the record until the relocation date/location is resolved. Do not use the directory listing alone as proof it is still at Parkview.
- [Virgin Active Moreleta Park](https://www.virginactive.co.za/gyms/moreleta-park) confirms Shop 11, lower level, Parkview Lifestyle Centre and `012 493 7216`. Facilities include pools, classes and children's facilities. Scrape exposes only today's hours, not a weekly schedule; no hours inferred from class times or off-peak membership access. No record imported yet.
- Parkview Flower Market appears in the centre directory. [Its older Shopify page](https://parkview-flower-market.myshopify.com/pages/about-us) identifies the basement but provides no weekly hours; its Google Plus link indicates the page needs corroboration. The directory's phone is the centre number. Hold branch phone, hours and independent/chain classification for follow-up.
- Other retail tenants remain in scope. This batch does not claim full Parkview coverage.

## Import Checks

Staged inactive, verified four records and 28 opening days, then activated. Existing Clicks branches, community reports and other businesses were preserved. Total database: 14,208,147 bytes; growth: 237,568 bytes since baseline. Catalogue: 156 places, 151 active, 96 groups.

Importer validation: zero errors, 11 warnings for omitted images/logos/menus. Ten importer tests pass. Cap checks and the no-existing-place guard were added after SQL generation; preserve them if regenerating. The activation SQL checks four inactive sourced records and 28 sourced opening days. No community status was inferred from a website: all four new live-status rows are unknown with confidence zero.

The stop threshold is 113,970,579 database bytes, equal to the original baseline plus the 100 MB growth cap. Both import and activation enforce it before and after their writes.
