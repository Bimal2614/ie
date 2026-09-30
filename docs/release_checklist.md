# Release Checklist

Run in full before every store submission. Nothing here is optional; items marked
**R** have caused a real store rejection for apps of this shape.

---

## 1. Code quality

- [ ] `flutter analyze` — zero issues (`--fatal-infos`)
- [ ] `dart format --set-exit-if-changed lib test integration_test`
- [ ] `flutter test` green; coverage ≥ 80% with the weighting in `test_plan.md`
- [ ] Contract tests green against the current `public/openapi.json`
- [ ] Integration suite green on one Android and one iOS device
- [ ] No `TODO`, `FIXME`, `print()`, or commented-out code on the release branch
- [ ] No dead code; no duplicated logic
- [ ] Release builds succeed for **both** platforms

## 2. Configuration

- [ ] `API_BASE_URL` points at production
- [ ] Prod Firebase config in place for both platforms
- [ ] **No secret in the bundle** — grep the built artefact for private keys,
      client secrets and service-account material
- [ ] Debug logging, the Dio logger and any dev-only screen compiled out
- [ ] Cleartext HTTP absent from release (Android) and no ATS exception (iOS)
- [ ] Version name + build number bumped; build number never reused

## 3. Backend readiness

- [ ] Phase 3 endpoints live (`mobile_gap_analysis.md` §A)
- [ ] `GOOGLE_IOS_CLIENT_ID` / `GOOGLE_ANDROID_CLIENT_ID` set
- [ ] `APPLE_*` set and **`APPLE_ENVIRONMENT=Production`**
- [ ] `GOOGLE_PLAY_*` set; service account has **View financial data**
- [ ] Product ids match the store listings exactly
- [ ] App Store Server Notifications V2 -> `/api/webhooks/apple` verified
- [ ] Play RTDN -> `/api/webhooks/google` verified
- [ ] `npm run api:spec` re-run; diff reviewed

## 4. Security

- [ ] Token in the keychain / EncryptedSharedPreferences, never shared prefs
- [ ] HTTPS everywhere
- [ ] Hive boxes encrypted; **audio never written to disk**
- [ ] Crashlytics logs carry no password, token, receipt, essay text,
      transcript, email or phone
- [ ] A 401 clears the keychain and resets the provider scope
- [ ] Sign-out drops every cache keyed to that user id

## 5. Privacy and data

- [ ] Play **Data safety** form matches what the app actually transmits
- [ ] iOS **`PrivacyInfo.xcprivacy`** present, with required-reason API codes **R**
- [ ] Every third-party SDK ships its own privacy manifest and signature **R**
- [ ] Privacy policy and Terms reachable **in-app** and from the store listings **R**
- [ ] Account-deletion route stated in both listings **R**
- [ ] Permission purpose strings describe the actual purpose in plain words **R**

## 6. Store compliance

**Apple**
- [ ] **Sign in with Apple offered**, because Google sign-in is offered (§4.8) **R**
- [ ] No external payment path for subscriptions; no link to the web pricing
      page from the paywall (§3.1.1) **R**
- [ ] **Restore Purchases** present and working **R**
- [ ] Subscription screen states price, period, auto-renewal, and links to
      Terms and Privacy **R**
- [ ] No mention of Android, Google Play, or "web version" in the copy
- [ ] Demo account in App Review notes, pre-loaded with a plan and history **R**
- [ ] Review notes explain how to reach Speaking and Mock, and that the
      microphone is required
- [ ] Background modes justified; nothing declared that is unused **R**

**Google Play**
- [ ] Google Play Billing only for digital subscriptions **R**
- [ ] Target API level current
- [ ] App Bundle, Play App Signing enrolled
- [ ] `POST_NOTIFICATIONS` requested at the right moment, not on launch
- [ ] No sensitive permission without a declaration

## 7. Functional smoke — on a real device, both platforms

**Auth**
- [ ] Sign up; sign in; Google sign-in; Sign in with Apple
- [ ] Google sign-in prompts for a phone number
- [ ] Forgot -> email -> deep link -> reset -> **old sessions rejected**
- [ ] Kill and relaunch: session restored
- [ ] Signing in on the phone **does not** kill the browser session

**Practice**
- [ ] Library drill-down; module filter correct for the profile
- [ ] All seven layouts render; a merged-cell table is not malformed
- [ ] A `choices` completion shows a picker, not a text field
- [ ] A `wordBank` shows as a reference box
- [ ] Listening audio plays, seeks, and survives a headphone unplug
- [ ] Writing: count matches the grader; input stops at the cap
- [ ] Speaking: record, auto-stop, playback, upload; **submit blocked until the
      upload finishes**
- [ ] Submit -> marks match the website for the same answers
- [ ] A half-right "choose TWO" shows 1 / 2, not a cross

**Mock**
- [ ] Start; resume says "resuming where you left off"
- [ ] Autosave; kill the app; relaunch restores the draft
- [ ] Background past a module boundary -> correct module, lapse reported
- [ ] Finish a module early -> next opens immediately with full time
- [ ] **Move the device clock forward 2 h -> countdown unaffected**
- [ ] Finish -> result; W/S pending then filled; review drill-down works

**AI**
- [ ] Polling follows the schedule and stops at 2 minutes
- [ ] `unavailable` says so and does not offer a futile retry

**Subscription**
- [ ] Paywall shows the **store's** price
- [ ] Sandbox purchase -> verify -> acknowledge, in that order
- [ ] Restore works
- [ ] A receipt already on another account shows the conflict message
- [ ] An account subscribed on the website shows **no** purchase button

**General**
- [ ] Airplane mode: cached content, no crash, clean recovery
- [ ] Rotation and multitasking preserve answers
- [ ] TalkBack / VoiceOver through a full practice part
- [ ] Font at maximum: nothing clipped
- [ ] Dark mode across every screen
- [ ] 60 fps on the low-end Android through a Reading module

## 8. Store listing

- [ ] Screenshots for every required size, from the **current** build
- [ ] Description, keywords, category, content rating
- [ ] No unverifiable band-score promise in the copy (the platform's own
      language — "a close guide, not a promise" — applies to marketing too)
- [ ] Support URL and email live
- [ ] What's New written for users, not a changelog dump

## 9. Post-submission

- [ ] Staged rollout at 10% (Android)
- [ ] Crash-free sessions > 99.5% at 24 h
- [ ] No spike in `error.code` non-fatals
- [ ] Purchases verifying — check `subscriptions` and `transactions`
- [ ] `change_log.md` updated
- [ ] `mobile_gap_analysis.md` §E reconciled
- [ ] Release tagged and merged back to `main`
