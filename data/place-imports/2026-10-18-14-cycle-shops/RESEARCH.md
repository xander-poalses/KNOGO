# Non-Mall Cycle Shops

Status: applied and verified.

- Hot Spot Cycles: operator contact/hours and retail inventory verified; Waze business pin matches Windsor Road, Faerie Glen. Shop 3B on operator page preferred over the supplier's shop 2 search excerpt. Workshop services not asserted without source evidence.
- Lynnwood Cyclery: operator's Willow Way Centre address, phone, services and weekly hours verified. Operator address configuration supplies its pin. Business name does not establish suburb; centre locality is Die Wilgers, cross-checked against its Waze centre listing. Added locality beneath Pretoria instead of mislabelling the shop as Lynnwood suburb.
- Both are Shops / bicycle_shop, with no group inferred from bicycle brands. Lynnwood's service centre and bike fitting are secondary services, not evidence it is a sport facility or automotive garage.
- Fourteen opening days including two sourced Sunday closures. Bike drop-off from 07:00 stays separate from 09:00 general opening. Holiday exceptions stored as notes, not copied over normal weekly hours.
- Specialized dealer URL redirected to a US-geolocated generic locator; its US shop data was rejected.
- This batch must insert new records only. Do not upsert existing listings or touch the cancelled FNB update. Stage inactive, verify sources/contacts/pins/hours, then activate these two IDs only. Guard duplicate identity and the 100 MB growth cap.

Validation and assert checks passed; all 11 importer tests pass. The reviewed staging SQL contains inserts only, without upsert/update/delete statements. It inserted two inactive places, 14 opening rows and Die Wilgers beneath Pretoria. Database readback matched identities, contacts, sources, dates, service details and coordinates within 1e-10 degrees. Activation checked full staged rows/hours before changing activity for these two IDs and inserting unknown live statuses.

Final readback: 166 places, 161 active, 97 groups. Database 14,371,987 bytes; growth 401,408 bytes (0.401 MB), below the 100 MB cap. There are 44 active non-test places without hours. FNB's full-record fingerprint is unchanged. No accounts or community reports read or changed. Physical entrance accuracy, service acceptance and holiday exceptions need confirmation by the place.
