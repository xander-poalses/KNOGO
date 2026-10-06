# KNOGO mobile

The Android app uses Expo SDK 57, Expo Router and React Native 0.86.

## Run

From the workspace root:

```powershell
pnpm install
pnpm mobile
```

Scan the QR code with the Expo Go SDK 57 build on a phone connected to the same network.

## Supabase

Create `apps/mobile/.env.local` from `.env.example` and set the project URL and publishable key. Do not use a secret or service-role key in the app.

For branch maps in the browser build, set `EXPO_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` to a Google Maps JavaScript API key restricted to KNOGO's web origins and that API. Expo Go uses `react-native-maps` and does not need this browser key.

## Checks

```powershell
pnpm typecheck:core
pnpm typecheck:mobile
pnpm --dir apps/mobile exec expo install --check
npx --prefix apps/mobile expo-doctor
```
