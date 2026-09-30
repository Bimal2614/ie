# Setup Guide

Getting the IELTSVega Flutter app running against a local or staging backend.

---

## 1. Prerequisites

| Tool | Version | Note |
| --- | --- | --- |
| Flutter | **3.38.2** stable | `flutter --version` |
| Dart | **3.10.0** | bundled |
| Node | 20+ | for the backend |
| Xcode | 16+ | iOS; macOS only |
| Android Studio | Ladybug+ | SDK 35, NDK as pinned by the Gradle config |
| CocoaPods | 1.15+ | iOS |

```bash
flutter doctor -v      # must be clean for the platforms you target
```

---

## 2. Run the backend

The app talks to the same Next.js app in this repository.

```bash
npm install
cp .env.example .env.local     # then fill it in — see §4
npm run dev                    # http://localhost:3000
npm run api:spec               # snapshots public/openapi.json (server must be up)
```

**A simulator or emulator cannot reach `localhost`.**

| Target | Base URL |
| --- | --- |
| Android emulator | `http://10.0.2.2:3000` |
| iOS simulator | `http://localhost:3000` |
| Physical device | your machine's LAN IP, e.g. `http://192.168.1.20:3000` |

A physical device also needs cleartext HTTP allowed **in the dev flavour only** —
`usesCleartextTraffic` on Android and an ATS exception on iOS, both scoped to the
debug configuration so they can never reach a release build.

> **Database note.** `DATABASE_URL` and the `--staging` content scripts point at
> the *same* Neon database. There is no separate staging environment, so treat
> any write as production-adjacent.

---

## 3. Run the app

```bash
cd mobileapp
flutter pub get
dart run build_runner build --delete-conflicting-outputs   # freezed + riverpod + json

flutter run --flavor dev     --dart-define-from-file=env/dev.json
flutter run --flavor staging --dart-define-from-file=env/staging.json
flutter run --flavor prod    --dart-define-from-file=env/prod.json
```

Re-run `build_runner` after touching any `@freezed`, `@riverpod` or
`@JsonSerializable` class. `dart run build_runner watch -d` during active work.

---

## 4. Configuration

### 4.1 App side — `mobileapp/env/*.json`

**Not committed.** `env/example.json` is, and CI writes the real files from
secrets.

```jsonc
{
  "API_BASE_URL": "http://10.0.2.2:3000",
  "APP_ENV": "dev",
  "SENTRY_ENABLED": false,
  "GOOGLE_IOS_CLIENT_ID": "…apps.googleusercontent.com",
  "GOOGLE_ANDROID_SERVER_CLIENT_ID": "…apps.googleusercontent.com"
}
```

**Nothing secret goes in here.** No API secrets, no private keys, no backend
credentials, no store service-account keys — anything shipped in an app bundle
is readable. Google *client ids* are public identifiers by design and are fine;
client **secrets** are not and never appear.

Read through one typed `Env` class using `String.fromEnvironment`, so a missing
value fails at startup with a named error rather than as a null later.

### 4.2 Backend side — `.env.local`

Only the keys the app needs beyond what the website already requires. All are
optional: unset means the feature is **off**, not broken.

```bash
APP_URL=http://localhost:3000

# Native Google Sign-In — one OAuth client per platform, same Google Cloud
# project as GOOGLE_CLIENT_ID. Verification accepts only these audiences.
GOOGLE_IOS_CLIENT_ID=
GOOGLE_ANDROID_CLIENT_ID=

# App Store Server API (receipt verification)
APPLE_ISSUER_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY=          # the .p8 contents
APPLE_BUNDLE_ID=
APPLE_ENVIRONMENT=Sandbox   # Production | Sandbox

# Google Play Developer API
GOOGLE_PLAY_PACKAGE_NAME=
GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PLAY_PRIVATE_KEY=

# Product ids per tier
APPLE_IAP_PRODUCT_PRO=
APPLE_IAP_PRODUCT_PREMIUM=
GOOGLE_IAP_PRODUCT_PRO=
GOOGLE_IAP_PRODUCT_PREMIUM=
```

Two footguns worth stating up front:

- The Play service account needs **View financial data** granted in the Play
  Console, not merely project access. Without it verification fails in a way that
  looks like a bad purchase token.
- On Android, when the app passes the **web** `GOOGLE_CLIENT_ID` as its
  `serverClientId` (the recommended wiring), the `id_token` is audienced to the
  *web* client, not the Android one. Both audiences are accepted, so either
  setup works — but only if the matching env var is set.

---

## 5. Firebase

Two projects, or one project with two app registrations — dev/staging and prod.

```bash
dart pub global activate flutterfire_cli
flutterfire configure --project=ieltsvega-dev  --out=lib/firebase_options_dev.dart
flutterfire configure --project=ieltsvega-prod --out=lib/firebase_options_prod.dart
```

`google-services.json` goes under `android/app/src/<flavor>/`;
`GoogleService-Info.plist` into the matching Xcode configuration. **Both are
gitignored**; CI writes them from secrets.

---

## 6. Flavours

| Flavour | App id | Name | Backend |
| --- | --- | --- | --- |
| dev | `com.ieltsvega.app.dev` | IELTSVega Dev | localhost |
| staging | `com.ieltsvega.app.stg` | IELTSVega Stg | staging URL |
| prod | `com.ieltsvega.app` | IELTSVega | ieltsvega.com |

Distinct application ids so all three install side by side on one handset — which
is what makes a "does this reproduce on prod?" check a ten-second job.

---

## 7. Permissions

| Permission | Platform | Needed for | Declared |
| --- | --- | --- | --- |
| Microphone | both | Speaking | `NSMicrophoneUsageDescription`, `RECORD_AUDIO` |
| Notifications | both | reminders | `POST_NOTIFICATIONS` (API 33+), iOS runtime prompt |
| Internet | Android | everything | `INTERNET` |

The purpose strings are user-facing and are reviewed by Apple. They say what the
microphone is for in plain terms — "to record your spoken answers so they can be
scored by our AI examiner" — not "to use the microphone".

---

## 8. Common tasks

```bash
flutter analyze
dart format --set-exit-if-changed lib test
flutter test
flutter test --coverage && genhtml coverage/lcov.info -o coverage/html
flutter test integration_test/ -d <device>
flutter test --update-goldens          # only after an intended visual change
flutter build apk    --flavor prod --dart-define-from-file=env/prod.json
flutter build appbundle --flavor prod --dart-define-from-file=env/prod.json
flutter build ipa    --flavor prod --dart-define-from-file=env/prod.json
```

---

## 9. Troubleshooting

| Symptom | Cause |
| --- | --- |
| Every request 401s | `Authorization` missing, or the token was stored in shared preferences and lost |
| Signing in on the phone kills the browser session | **`X-Client-Platform` is not being sent.** Sessions are single-occupancy per client |
| Audio 404s with a valid token | the client is sending `Accept: text/html`; `isMediaElementRequest` refuses it |
| Audio 401s | the bearer header is not on the audio request — `just_audio` needs it passed explicitly |
| Google sign-in returns `service_unavailable` | `GOOGLE_*_CLIENT_ID` unset on the backend. Ours, not the user's |
| Recording refused | not 16 kHz mono 16-bit PCM WAV, or over 4 MB / 125 s |
| Countdown drifts or jumps | something is using `DateTime.now()` instead of the server anchor |
| Answer sheet ticks an empty box | `isAnswered` was not ported shape-aware |
| A gap renders as literal `[[7]]` | the layout was not gap-shifted by `numberOffset` |
| Score polling never ends | `status: "unavailable"` was not handled |
| `build_runner` conflicts | `dart run build_runner build --delete-conflicting-outputs` |
