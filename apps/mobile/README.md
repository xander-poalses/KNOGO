# KNOGO mobile

The Android app uses Expo SDK 57, Expo Router and React Native 0.86.

## Run

From the workspace root:

```powershell
pnpm install
pnpm mobile
```

Install KNOGO's development APK on your Android phone. Keep the phone and PC on the same Wi-Fi, then open the development server in KNOGO. Do not open it in Expo Go.

JavaScript and TypeScript edits reload through Metro. Changes to native dependencies or Expo native configuration need an APK rebuild. The development APK needs Metro; it is not a release for testers without access to your PC.

If Mapbox's native module is missing, the branch screen shows an install message instead of crashing at launch. Install an APK built with the Mapbox plugin, then open KNOGO rather than Expo Go. Reloading Metro cannot add native code to an installed APK.

## Build on Windows

Android Studio, its JDK and the Android SDK must be installed, with Windows long-file-path support enabled. On this PC, `LongPathsEnabled` was changed from `0` to `1` with Windows administrator approval for the build. From `apps/mobile/android`:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
.\gradlew.bat :app:assembleDebug --init-script ../android-build.gradle '-PreactNativeArchitectures=arm64-v8a,armeabi-v7a'
```

The APK is `app/build/outputs/apk/debug/app-debug.apk`. Download it on the phone and install it; a USB cable and an Expo account are not required. This APK targets ARM phones, not x86 emulators.

The init script places CMake output in the repository's ignored `.codex-artifacts/android-cxx` folder. This avoids Windows path limits in pnpm's dependency folders without moving the repo or editing dependencies.

If the `android` directory does not exist, run `pnpm --dir apps/mobile exec expo prebuild --platform android --no-install` from the workspace root before building. Do not use `--clean` over native edits.

## Supabase

Create `apps/mobile/.env.local` from `.env.example` and set the project URL and publishable key. Do not use a secret or service-role key in the app.

Android and iOS branch maps use Mapbox. Set `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` in `.env.local` to a map token, never a server or download secret. This token is bundled into the app, not stored in Supabase secrets. Install an APK rebuilt with the Mapbox plugin before loading this code. Expo Go keeps its placeholder; without a token or when the map fails, the branch list remains usable. Mapbox attribution stays visible and SDK telemetry is disabled. Do not add a payment method for the test account; trial usage limits still apply.

Do not use `127.0.0.1` as the phone's Supabase URL: it points at the phone, not your PC. Use the KNOGO Supabase project URL for this testing setup.

## Checks

`patches/expo-router@57.0.19.patch` defers initial-link state updates until the navigation container mounts. It covers Expo issue #47659; review it when changing the router version. The native-link regression tests cover resolution before mount, after mount and after unmount, including auth callback parameters.

```powershell
pnpm typecheck:core
pnpm typecheck:mobile
pnpm --dir apps/mobile exec expo install --check
npx --prefix apps/mobile expo-doctor
```
