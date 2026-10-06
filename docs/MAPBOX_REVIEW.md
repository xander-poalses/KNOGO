# Mapbox And The Place Screen

Checked 1 October 2026. No account, token, SDK, map request or billing method was added.

## Design Boundary

The Figma node `20:2` in file `tLpbhAkclI4JRGySQb0XX2` is the place-screen reference. Its header and weekly-hours layers are screenshots of existing KNOGO components and are reused as code, not embedded screenshots. The map is a reference image, not a branch map or an asset to ship.

The layout adds a name/area row, fuel/status summary and Glance/Expanded views. Reporting, evidence provenance and expiry remain separate from schedules. The trip planner publishes its computed estimate to the summary. No GPS request occurs on opening the screen. No example address, R24.61 price or unqualified Open status is copied from Figma.

The map is not connected. There is no blank container or map screenshot presented as an integration. Shop pricing is deferred in TODO.md.

## Access And Costs

- Native React Native Mapbox requires custom native code and a development build; it cannot run in Expo Go. Source: [rnmapbox install](https://rnmapbox.github.io/docs/install).
- Mobile Maps SDK has 25,000 monthly active users included, then USD4 per 1,000 in the next tier. Web GL JS has 50,000 map loads included, then USD5 per 1,000 in the next tier. These are map products, not routing/navigation/search allowances. Source: [Mapbox pricing](https://www.mapbox.com/pricing).
- Standard access uses pay-as-you-go billing and requires a payment method to upgrade. Automatic charging and no spending cap mean staying below a projected free allowance is not a guarantee of no spend. Sources: [sign-up](https://docs.mapbox.com/accounts/guides/demo-access/), [invoices](https://docs.mapbox.com/accounts/guides/invoices/).
- No-card demo access has provider-enforced usage and rate caps. All Mapbox API access stops when a cap is reached. Limits appear in the account Console and reset monthly while below the cap. The documentation calls it a demo trial but gives no fixed expiry or numeric caps; check the intended account before using it. Accounts are never upgraded automatically. The demo token cannot be rotated or deleted without upgrading. Source: [demo access](https://docs.mapbox.com/accounts/guides/demo-access/).
- Example beta usage: 50 Android testers using the map would be 50 MAUs; 50 testers opening a web map ten times a day for 30 days would be 15,000 loads. Both fit standard free map allowances, but cannot establish demo eligibility or prevent pay-as-you-go overage. Expected map cost at that standard usage is USD0, excluding every other product, tax and misuse.

## Before Connection

1. Choose no-card demo testing or approve pay-as-you-go exposure. Never add a card or upgrade as an implementation shortcut.
2. Record demo expiry, product availability and numeric caps from the account Console. No production claim should be based on demo access.
3. Choose an Android development build for native Mapbox. Confirm React Native 0.86 / Expo SDK 57 compatibility for the wrapper version before installing it. The existing Expo Go flows remain usable without the map.
4. Use a token and restrictions that match the platform. Keep download/secret tokens server-side. Do not expose a token that grants write access or assume a public token can enforce the no-spend rule.
5. Preserve map attribution and test load timeout, failure hiding, theme, gestures, safe areas and external directions. No location is requested until the user chooses it; no trip origin is stored in Supabase.
6. Routes and address search remain separately configured services. Do not infer a fuel distance from a straight line or a map screenshot. A route polyline requires provider geometry and permission to display it, neither of which is supplied by the current route contract.

## Remaining QA

No connected Mapbox map, device development build, route polyline, provider billing boundary or account limits have been tested. These remain gates, not working features.
