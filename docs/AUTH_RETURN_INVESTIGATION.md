# Sign-In Return Investigation

## Evidence, 4 October 2026

- ConfirmScreen now uses email/password account access after collecting report answers. Venue access retains its email-link flow.
- The callback accepts email-link tokens and Google PKCE codes. Google account returns do not submit reports; report returns restore answers for review.
- PlacesContext restores and refreshes stored sessions, but cannot recognise a sign-in if no callback reaches the app.
- The app declares the `knogo` scheme. Expo Go does not register that scheme as KNOGO's own application.
- Email/password methods are exposed through Settings and reporting. Registration without session tokens remains pending confirmation, not signed in.
- Google code exchange, browser cancellation and duplicate callback handling are implemented. The provider is disabled in hosted Supabase, so its control remains gated.
- Refresh callers share one request. A response from before sign-out cannot restore the session, and an old failed refresh cannot clear a replacement session.
- All 218 repository tests, 213 mobile tests, core/mobile TypeScript checks and Android export pass. No account test has been run.

These findings do not prove which redirect the user's email used. Hosted Auth settings were checked: email is enabled, email confirmation is required and Google is disabled. Redirect allowlists and phone returns still need verification.

## Required Work

- Use one account flow from Settings, reporting and venue access, preserving report answers.
- Support Supabase email/password sessions and signup confirmation without treating an unconfirmed signup as a signed-in session.
- Add Google through Supabase Auth, using code exchange with PKCE and provider secrets in Supabase only.
- Define return handling and cancellation, plus session persistence and refresh tests.
- Configure the Google OAuth client and Supabase provider/redirect allowlist before a real Google account test.
- Test native Google return in a development build rather than claim Expo Go supports the OAuth flow.
- Keep browsing and trip estimates available without sign-in.

## Sources

[Supabase Google sign-in](https://supabase.com/docs/guides/auth/social-login/auth-google) explains provider setup and PKCE callback exchange.

[Expo authentication](https://docs.expo.dev/guides/authentication/) states that Expo Go cannot test OAuth/OpenID Connect apps through a custom app scheme and recommends a development build. This gate does not prevent testing email/password requests in Expo Go.
