# Public Service Evidence Holds

Checked 18 October 2026. No new places or hours imported from these leads. Snippets are not full-page verification.

| Place | Evidence | Decision / next check |
| --- | --- | --- |
| Shere customer care walk-in centre | [Council Region 6](https://www.tshwane.gov.za/?page_id=10059) gives 43 Struben Road, Shere AH and 012 358 9999. [Waze branch listing](https://www.waze.com/live-map/directions/za/gp/shere/city-of-tshwane-shere-municipality?to=place.ChIJMRCK3i5clR4RmO2Ex01RY9U) gives 34 Struben Road, 012 358 3064 and Mon-Fri 08:00-15:15. | Hold import: street-number conflict unresolved. Council number is the call centre, not a verified branch line. Do not copy Waze hours onto the council address until location identity is resolved. |
| Glenstantia Library | Waze confirms a Glenstantia Library pin in Constantia Park but publishes no weekly hours/contact on the fetched page. Library Technology Guides gives 510 Chopin Street and a record last updated June 2018; operational facts are not current verification. Search excerpts for Friends of Glenstantia use 012 358 3112 and a council email; older sources use 012 998 6210. The Weebly hours excerpt refers to a 2013-era change. | Hold import: current contact and weekly hours need confirmation. The Facebook page could not be fetched through the connector. No closed weekends inferred, no old hours imported. Do not bulk harvest Library Technology Guides: its page requires permission for systematic extraction. |
| Home Affairs at FNB The Grove | [FNB operator page](https://www.fnb.co.za/ways-to-bank/branch.html) now fetched in full. It names Lynnwood (Grove Mall), gives booking/payment/collection guidance and account criteria, but not exact counter hours. Replacement guidance conflicts on documents and does not name Grove individually for walk-ins. | Proposed guidance update saved in batch 13, not applied. User questioned the SQL write; do not retry without approval of its fields. Counter hours remain unset. |

## Retrieval References

- Council Region 6: full page read; Shere address verified against its table.
- Shere Waze: scrape `01a1500e-eb13-7249-9ba1-9c504daf6fbc`; full branch text read, not its open-now label.
- Glenstantia Waze: full branch text and raw page read; no opening schedule present.
- Library Technology Guides: one reference page read, not harvested or imported. Its 2018 update date prevents treating contact details as verified for 2026.
- FNB: scrape `01a15010-6b65-7645-a4ae-f2c3b9f78b47`; operator guidance retained in batch 13 evidence, with contradictions recorded.

Remaining public-service research includes libraries, licensing and postal counters in Pretoria East. Region 6 also contains places beyond this task's boundary; a Region 6 address alone is not permission to import it.
