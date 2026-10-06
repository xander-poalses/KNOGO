# KNOGO Place Imports

Copy `_template` into a dated batch folder. Keep one place per row in `places.csv` and one group per row in `groups.csv`. Hours may use one row per day or ranges such as `Mon-Fri`; validation expands each place to seven opening days.

Use `|` between values in `features` and `tags`. Keep source links and the date checked in each row. New imports are always inactive.

```powershell
pnpm places:validate data/place-imports/2026-08-example
pnpm places:generate data/place-imports/2026-08-example
pnpm places:activate data/place-imports/2026-08-example
```

Review `generated/review.md` before applying `generated/import.sql`. Apply `generated/activate.sql` only after checking the inactive records.
