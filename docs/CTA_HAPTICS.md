# CTA Touch Feedback

`HapticPressable` wraps the existing React Native Pressable without changing its style, children, ref, event or navigation behaviour. All 18 production files using Pressable now import this wrapper. Shared ActionButton, Chip and BackButton therefore receive feedback without an additional pulse. The return-fuel switch uses the same helper.

Android uses `expo-haptics` Segment_Frequent_Tick through the device haptic engine. iOS uses selection feedback. There is no repeated pattern, success fanfare, vibration on loading completion or vibration while typing. The browser helper does nothing. A device may stay silent if its hardware cannot make this effect or system settings suppress feedback.

Feedback happens on an accepted press, not on touch-down, so scrolling across a control does not trigger it. Disabled and busy controls do not run their action or feedback. Inaccessible sheet backdrops stay silent. Native rejection or a missing module does not block the command. The wrapper preserves stopPropagation on save controls.

The installed Expo SDK recommends expo-haptics ~57.0.2. Installation added this range without upgrading Expo or pnpm.

Tests cover one pulse before an action, unavailable controls, backdrops, nested save propagation, Android/iOS selection, native rejection and synchronous failure. Hardware intensity remains a phone QA item.

Verification on 4 October 2026: 199 mobile tests pass, mobile TypeScript passes and the Android export completes with 3,879 modules and 49 assets. The export is at apps/mobile/.expo/haptics-export. Sentry release configuration remains unset. No phone session or haptic intensity check is claimed.

Reference: [Expo Haptics](https://docs.expo.dev/versions/latest/sdk/haptics/).
