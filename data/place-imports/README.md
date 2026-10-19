# KNOGO Place Imports

Copy `_template` into a dated batch folder. Keep one place per row in `places.csv` and one group per row in `groups.csv`. Hours may use one row per day or ranges such as `Mon-Fri`; validation expands each place to seven opening days.

If hours are not published, set `hours_status=unpublished`, explain the gap in `data_notes` and supply no opening rows. Use `hours_status=partial` for one to six sourced days. Missing days are unknown, not closed. Imports upsert supplied hours without deleting other days.

Expansion categories require `place_type` (snake_case). Optional columns: `data_notes` and `service_details` (a JSON object for sourced services, bookings and access). The importer stores `source_url`, `source_checked_at` and `map_url` in the database, including source fields on hours and groups. Leave pictures out when not needed; updates preserve existing image fields when none are supplied.

Tenants may share a published mall pin only when every co-located row has `data_notes` and `service_details` with the same `shopping_centre`, `coordinate_precision=shopping_centre` and a valid `coordinate_source` URL. Do not invent per-shop offsets. Keep the shop number in the address where the directory supplies one.

Use `|` between values in `features` and `tags`. Keep source links and the date checked in each row. New imports are always inactive.

```powershell
pnpm places:validate data/place-imports/2026-08-example
pnpm places:generate data/place-imports/2026-08-example
pnpm places:activate data/place-imports/2026-08-example
```

Review `generated/review.md` before applying `generated/import.sql`. Apply `generated/activate.sql` only after checking the inactive records.
