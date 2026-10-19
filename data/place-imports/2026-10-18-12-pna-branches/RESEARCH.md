# PNA Branches

Status: applied and verified.

Source: https://www.pna.co.za/pna-locations/ (checked 18 October 2026). `source.html` retains the five branch cards, parsed with the installed HTML parser. No out-of-scope store cards retained.

- Update Castle Gate, The Grove and Woodlands; add Menlyn and Hazeldean under the existing PNA group. All five are in Pretoria East.
- Five weekly schedules: 35 opening rows. Castle Gate opens 08:00 on weekdays/Saturday. Menlyn closes 21:00 on Friday/Saturday. Do not substitute mall hours.
- Operator data-lat/data-lng values supply branch pins; they are not a guarantee of doorway accuracy. Operator directions links and prior centre pins retained.
- Woodlands operator shop 6 differs from mall shop 7. Prefer the operator, retain the conflict, and remove the former entrance/floor from current fields because they may belong to the other shop number.
- Grove's shop L86 stays from the mall. Operator address says Die Wilgers; Equestria region is retained with the discrepancy noted. Holiday hours remain unpublished.
- Yuppiechef's mobile locator exposed addresses but not weekly hours; its loading/reCAPTCHA content was not treated as verified schedules. Crazy Store locator still needs branch identification. No guessed hours imported.
- Existing activity, images, menus and report status must remain unchanged. New branches stage inactive until all 35 days, contacts, pins and group assignments pass database readback. 100 MB cap guards apply before and after writes.

Importer validation and batch assertions passed. Staged readback matched all 35 times, sources, dates, contacts, addresses, service details and expected activity. Coordinates matched within 1e-10 degrees, allowing Postgres JSON float formatting. Existing status hashes matched. After activation all five branches are active with seven days each; the two additions have unknown live status and confidence zero.

Totals: 164 places, 159 active, 97 groups. Database 14,363,795 bytes; growth 393,216 bytes (0.393 MB), below 100,000,000 bytes. There are 44 active non-test places without opening rows. No accounts, secrets or community reports read or changed.
