# Android Storage Audit

Checked: 7 October 2026.

## Findings

- The mobile assets folder contains 9 files totalling 3,200,745 bytes. This is
  not an APK size estimate: Metro includes referenced assets, not this entire
  folder by default.
- The largest asset is `community-meerkats.png` at 955,707 bytes.
- `react-native-maps` supports branch selection in GroupScreen. Removing it
  would remove that feature. The route preview components have no caller.
- Cappuccinos' bundled JPEG now uses memory caching instead of requesting
  another disk cache. Remote photos still use memory/disk caching.
- Development tooling is included in a development build. Its size is not
  representative of a release build.
- The generated Android project defaults to release minification and resource
  shrinking off. Enable and test these through Expo build configuration before
  preparing a release, rather than editing generated Gradle files.
- A debug APK can include libraries for multiple processor architectures. A
  device-targeted build and Play Store app bundle need separate measurement.

## Verification Still Needed

Android Studio, SDK and Java 21 were found on this PC. Expo prebuild completed.
The first Gradle debug build downloaded Gradle 9.3.1 but stopped reporting
progress during startup. It was cancelled without producing an APK. No app was
installed. Build troubleshooting is required before APK measurements.

- APK compressed size and ZIP entry breakdown.
- Installed app size on the phone, including native libraries.
- Data/cache growth after browsing and a cache-clear action that preserves
  accounts, report drafts, saved places and preferences.
- Release build checks after minification and resource shrinking.

No hosted database or billing settings were changed for this audit.
