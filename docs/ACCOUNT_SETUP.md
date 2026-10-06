# Account Setup And QA

## What Is Ready

Hosted settings checked on 4 October 2026: email enabled, signup enabled,
email auto-confirm off, Google disabled. The mobile Google enablement flag
is absent. These are configuration checks, not a completed sign-in test.

Settings, reporting and venue access use the same email/password form. Signup can remain pending
email confirmation. Google callback code is implemented but gated off while
the provider is disabled. Tests do not replace signing in with an account.

## Google Setup

1. Open Google Auth Platform in your Google Cloud project. Set the KNOGO name,
   support email and audience. If the audience is in testing, add your testers.
2. Request only `openid`, email and profile access. Create a Web application
   OAuth client for KNOGO's Supabase browser flow.
3. In Supabase, open Authentication, then the Google provider. Copy its callback
   URL into Google's authorised redirect URIs. Add `http://localhost:8081` to
   Google's authorised JavaScript origins for browser QA.
4. Paste the client ID and secret into Supabase's Google provider settings and
   enable it. Do not put the secret in Expo, source files or chat.
5. In Supabase Authentication URL Configuration, allow KNOGO's callback returns.
   Development patterns are `knogo://auth/callback**`,
   `http://localhost:8081/auth/callback**` and
   `http://127.0.0.1:8081/auth/callback**`. The suffix permits KNOGO's account
   and report-review query parameters. Remove localhost entries for release
   and review production patterns before publication.

Provider credentials and callback configuration follow the
[Supabase Google guide](https://supabase.com/docs/guides/auth/social-login/auth-google).
No provider changes or purchases have been made by this implementation.

## Enable The App Control

After provider setup, add this to `apps/mobile/.env.local`:

```dotenv
EXPO_PUBLIC_GOOGLE_AUTH_ENABLED=true
```

Restart Metro. This flag is not a secret. It does not enable the provider in
Supabase and must not be used to pretend provider setup is complete.

Use a development build for Google on Android. Expo Go cannot test OAuth with
KNOGO's app scheme. Email/password requests can be tested in Expo Go.
See [Expo authentication](https://docs.expo.dev/guides/authentication/).

## Account QA

- Sign in with a confirmed email/password account in Settings. Restart KNOGO
  and check the account email remains. Sign out and restart; it must be absent.
- Register a test account. No session should appear until Supabase confirms
  the email. Do not disable email confirmation to get around delivery failures.
- Cancel Google access. Stay in KNOGO without a new session or published report.
- Complete Google access. Check the account appears in Supabase Auth and KNOGO.
- Start a report while signed out. After access, review the restored answers
  and submit once. Account access alone must not publish the report.
- Test sign-out with the connection removed. KNOGO must handle the failure
  without showing tokens, credentials or a crash.
- Open Represent this venue while signed out. Sign in with a password or the
  configured Google provider. Return to that venue's access check, not a
  community draft. Account registration and Google callbacks retain the venue
  target. Account access alone must never deliver a venue verification code.

Email delivery setup, redirect verification, Google credentials and phone QA
remain release gates. No account was created during code verification.
