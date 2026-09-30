# Deployment Guide

Building, signing and shipping the IELTSVega app.

---

## 1. Versioning

`pubspec.yaml` -> `version: <semver>+<build>`. Semver is user-facing; the build
number is monotonic per store and never reused. CI sets it from the run number:

```bash
flutter build appbundle --flavor prod \
  --dart-define-from-file=env/prod.json \
  --build-name=1.2.0 --build-number=$CI_RUN
```

---

## 2. Android

### 2.1 Signing

Upload key in a keystore held **only** in CI secrets. `key.properties` is
gitignored and written at build time.

```properties
storeFile=upload-keystore.jks
storePassword=${ANDROID_STORE_PASSWORD}
keyAlias=upload
keyPassword=${ANDROID_KEY_PASSWORD}
```

Enrol in **Play App Signing**: Google holds the app signing key, you hold the
upload key. Losing the upload key is then recoverable; losing an app signing key
is not.

### 2.2 Release config

- `minSdk 23`, `targetSdk 35`, `compileSdk 35`
- R8 with shrinking + resource shrinking; keep rules for Firebase, Dio/OkHttp,
  `record`, `just_audio` and every freezed/json model touched by reflection
- `android:usesCleartextTraffic` **absent** from release — it exists in the dev
  flavour only
- App Bundle, not APK

### 2.3 Data safety

Declared in the Play Console and kept in step with what the app actually sends
(`release_checklist.md` §5):

| Data | Collected | Purpose | Shared |
| --- | --- | --- | --- |
| Email, name, phone | yes | account | no |
| Audio recordings | yes | AI scoring | processed by the scoring provider |
| App activity (answers, scores) | yes | the product | no |
| Crash logs, diagnostics | yes | stability | Firebase |
| Purchase history | yes | entitlement | store |

Encrypted in transit; account deletion is available on request via the support
route stated in the listing.

### 2.4 Billing

`com.android.billingclient` via `in_app_purchase_android`. Products created in
the Play Console, ids matching `GOOGLE_IAP_PRODUCT_*` exactly. Licence testers
added for sandbox.

**The Play service account needs "View financial data"**, not just project
access, or verification fails in a way that looks like a bad purchase token.

---

## 3. iOS

### 3.1 Signing

App Store Connect API key in CI; Fastlane `match` (or manual profiles) for the
distribution certificate and provisioning profiles, one per flavour.

### 3.2 Capabilities

- In-App Purchase
- Push Notifications (+ the APNs key uploaded to Firebase)
- Associated Domains — `applinks:ieltsvega.com`
- Background Modes: **audio only** if playback must continue when the screen
  locks during a Listening module. Nothing else; an unjustified background mode
  is a review rejection.

### 3.3 Info.plist

`NSMicrophoneUsageDescription` must say what the microphone is *for* in plain
words — "to record your spoken answers so they can be scored by our AI examiner"
— not "to use the microphone". Apple rejects the latter.

`ITSAppUsesNonExemptEncryption = false` (HTTPS only, no custom crypto).

### 3.4 Privacy manifest

`PrivacyInfo.xcprivacy` is **required**. Declare collected data types to match
§2.3, and the required-reason APIs actually used (`UserDefaults`,
`FileTimestamp`, `SystemBootTime`, `DiskSpace`) with their reason codes.
Third-party SDKs must ship their own manifests and signatures — check after every
dependency bump.

---

## 4. Deep links

Served from the Next.js app's `public/`:

- `https://ieltsvega.com/.well-known/assetlinks.json` — package name + release
  **app signing** SHA-256 (the Play-held key, not the upload key). This is the
  single most common App Links mistake.
- `https://ieltsvega.com/.well-known/apple-app-site-association` — served as
  `application/json`, **no** `.json` extension, no redirect.

Verify with:

```bash
adb shell pm verify-app-links --re-verify com.ieltsvega.app
adb shell pm get-app-links com.ieltsvega.app
```

---

## 5. Backend prerequisites

The app cannot ship until the backend has:

- [ ] The Phase 3 endpoints live (`mobile_gap_analysis.md` §A)
- [ ] `GOOGLE_IOS_CLIENT_ID` / `GOOGLE_ANDROID_CLIENT_ID`
- [ ] `APPLE_*` verification keys, `APPLE_ENVIRONMENT=Production`
- [ ] `GOOGLE_PLAY_*` service account with **View financial data**
- [ ] `APPLE_IAP_PRODUCT_*` / `GOOGLE_IAP_PRODUCT_*` matching the store ids
- [ ] App Store Server Notifications V2 -> `/api/webhooks/apple`
- [ ] Play RTDN (Pub/Sub) -> `/api/webhooks/google`
- [ ] `public/openapi.json` regenerated and matching the shipped models

**`APPLE_ENVIRONMENT` is the one to get wrong.** Left at `Sandbox` in
production, `activateFromStore` refuses real purchases with
`sandbox_in_production` and every paying customer sees "that purchase could not
be verified".

---

## 6. Release process

1. Cut `release/x.y.z` from `main`.
2. `mobile_sync_rules.md` §4 release-gating checks.
3. CI: analyze, format, test, contract, coverage.
4. Build both platforms with the prod flavour.
5. Internal testing (Play) + TestFlight internal.
6. Smoke the checklist in `release_checklist.md` §7 on real devices, **including
   a sandbox purchase and a restore**.
7. Closed testing / TestFlight external, ~48 h.
8. Submit. Android via a **staged rollout** at 10% -> 50% -> 100%.
9. Watch Crashlytics crash-free sessions (target > 99.5%) and the billing
   dashboards for 72 h.
10. Tag, update `change_log.md`, merge back to `main`.

---

## 7. Rollback

- **Android:** halt the staged rollout immediately; publish a fixed build. A
  release cannot be un-published for users who already have it, which is why the
  rollout starts at 10%.
- **iOS:** remove from sale, or expedite a fix. There is no rollback.
- **Server-side mitigation is usually faster than either.** Because the app
  renders what the server says, a bad entitlement, a broken paywall or a wrong
  focus message can often be fixed by changing the response — with no app
  release at all. That is the payoff for keeping business rules off the client.

---

## 8. Monitoring

Crashlytics (crash-free sessions, top issues, non-fatal API failures by
`error.code`), Analytics funnels (install -> signup -> first practice ->
first mock -> purchase), store vitals (ANR, wake-lock, excessive wakeups), and
the backend's own daily report (`/api/cron/daily-report`), which already covers
scoring failures and subscription state.
