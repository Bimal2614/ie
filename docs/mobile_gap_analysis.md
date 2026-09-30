# Mobile Gap Analysis

Website vs. Flutter app, continuously. **No undocumented feature divergence is
allowed** — anything the app does not do that the website does must appear here
with a reason.

Last reconciled: **2026-09-18** (Phases 3–12).

Status key: `OPEN` · `IN PROGRESS` · `CLOSED` · `ACCEPTED` (a permanent,
justified divergence).

---

## A. Backend gaps — candidate features with no `/api/v1` endpoint

Found during Phase 1 by comparing the 24 shipped operations against every
candidate-facing website surface. **All seven were closed in Phase 3** by adding
thin route handlers that reuse the existing shared functions, in the style of the
handlers already there. No business rule was duplicated or invented — where a
shared function did not yet exist in a reusable form, the policy was moved into a
`server-only` module and the website's action rewired to call it, so there is one
implementation rather than two.

The spec at `GET /api/v1/openapi` now reports **30 paths / 34 operations**, up
from 24.

| # | Capability | Website surface | Shared function that already exists | New endpoint | Severity | Status |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | **Open a practice section** | `/section-practice/[id]` | `openSection()` + `toClientSection()` | `GET /api/v1/practice/sections/{id}` | **Critical** | **CLOSED** |
| A2 | **Submit a practice section** | `/section-practice/[id]` | `submitSectionPractice()` | `POST /api/v1/practice/sections/{id}/submit` | **Critical** | **CLOSED** |
| A3 | Mock per-module review | `/results/[id]` drill-down | `getMockSectionReview()` | `GET /api/v1/mock/sessions/{id}/review?section=` | High | **CLOSED** |
| A4 | Mock results list | `/results` | `getMockResults()` | `GET /api/v1/mock/results` | High | **CLOSED** |
| A5 | Forgot password | `/forgot-password` | `requestPasswordReset()` | `POST /api/v1/auth/forgot-password` | High | **CLOSED** |
| A6 | Reset password | `/reset-password` | `resetPassword()` | `POST /api/v1/auth/reset-password` | High | **CLOSED** |
| A7 | Attempted-set markers | `/practice/[section]/[type]` palette | `getAttemptedSets()` | `GET /api/v1/practice/attempted-sets` | Medium | **CLOSED** |

### Why A1/A2 are critical

`GET /api/v1/practice/library` walks sources -> books -> parts and then **stops**.
There is no way to open the part it just listed, and no way to submit one. Every
Cambridge book on the platform is stored in `practice_sections` and reachable
only through that path, so without A1/A2 the app ships with its main library
browsable and unusable.

The other practice path (`/api/v1/practice/sets`, over the older `question_sets`
table) works, but it is the *drill-by-question-type* surface, not the
*sit-a-real-part* surface. Both exist on the website and both are in scope.

| A8 | **Sign in with Apple** | n/a — the website offers Google only | none | `POST /api/v1/auth/apple` | **iOS release blocker** | OPEN |

### A8 — why this blocks an iOS release

App Store Review Guideline **4.8** requires an equivalent private login option
wherever an app offers a third-party social login. The app offers Google
sign-in, mirroring the website, so an iOS build needs Sign in with Apple.

There is no Apple identity path on the backend: no `/api/v1/auth/apple`, and no
Apple branch in `linkOrCreateGoogleAccount`. **A button that fails review is
worse than no button**, so the app currently ships without one and the Apple
button was removed from the sign-in screen rather than left as a dead control.

Two ways out, in order of preference:

1. **Add `POST /api/v1/auth/apple`**, mirroring the Google route: verify the
   identity token against Apple's JWKS, check the audience against the bundle
   id, then reuse the same link-or-create account path. About a day's work,
   and the correct answer.
2. **Hide Google sign-in on iOS.** Removes the obligation entirely, at the cost
   of the feature. Acceptable only as a stopgap.

Android is unaffected — Play has no equivalent rule.

### Deliberately not added

| Capability | Why not |
| --- | --- |
| Email verification resend | `/verify-email` is a GET link handler with no candidate-initiated action on the website either. Handled as a deep link — §C3 |
| Day-view history | The API deliberately returns a flat reverse-chronological list instead (`getRecentAttemptsFor`), because a phone opens on "what have I been doing". The day view is something the app builds on top of it, client-side |
| `getQuestionAnswers` / per-question history | A wide-screen analysis panel with no phone equivalent. §C5 |
| Any admin or partner endpoint | Out of scope, brief §21 |

---

## B. Platform gaps — things the website does that a phone cannot, or should not

| # | Item | Website | App | Status |
| --- | --- | --- | --- | --- |
| B1 | **Razorpay checkout** | Card/UPI through Razorpay Checkout | Apple IAP / Google Play Billing | `ACCEPTED` — Apple §3.1.1 and Google Play's Payments policy forbid an external payment flow for digital subscriptions. Both land on the same `subscriptions` table and the same `users.plan`, so the entitlement is identical whichever door it came through |
| B2 | Coupon codes | Partner wholesale codes at checkout | Not offered | `ACCEPTED` — a coupon is a Razorpay-side discount (`coupons.percent` feeds the order amount). Store products sit on fixed price tiers with no discount mechanism we control. A candidate with a coupon buys on the website; the plan then shows in the app |
| B3 | Passage text highlighting | Marker pen over `passageText` (`--marker` token exists) | Text is **selectable** (`SelectionArea`), but marks are not persisted | `OPEN` — the `marker` design token is ported and ready; persistence per attempt in Hive is the remaining work |
| B4 | Speaking answers over ~3.8 MB | Browser records WebM/Opus and the route transcodes with ffmpeg | 4 MB hard ceiling; a full 120 s Part 2 long turn is close to it | `OPEN` — raising it needs a presigned S3 PUT on the backend, not a bigger number: the platform request-body cap is not configurable. Mitigated by recording at exactly 16 kHz mono 16-bit and stopping at 125 s |
| B5 | Print / PDF of a result | Browser print | Native share sheet instead | `ACCEPTED` |
| B6 | Multiple simultaneous sessions | One web session + one per platform | Same — `X-Client-Platform` scopes them | `ACCEPTED` — this is the shipped design, not a gap. Omitting the header makes the app evict the candidate's browser session |

---

## C. Marketing and content pages

These exist to be indexed by search engines, which is not a job an app does.

| # | Page | Disposition |
| --- | --- | --- |
| C1 | `/about`, `/blog`, `/blog/[slug]`, `/faq`, `/contact`, `/resources/**`, `/templates`, `/ielts-2026-changes`, `/ielts-band/[band]`, `/ielts-band-scores` | `ACCEPTED` — not in the app. A "Learn" entry opens them in a Custom Tab / `SFSafariViewController` where a link is followed |
| C2 | `/ielts-band-score-calculator` | **Implemented natively.** `BAND_TABLES` is exported from `src/lib/ielts.ts` and is real utility offline. Values are mirrored in Dart **and covered by a test that fails if the two disagree** — see `test_plan.md` §3.4 |
| C3 | `/verify-email?token=` | **Deep link.** The app intercepts the universal link, opens the route in a Custom Tab, then calls `GET /api/v1/auth/session` to pick up `emailVerified: true` |
| C4 | `/privacy`, `/terms`, `/refunds` | **Required in-app** by both stores. Rendered in a Custom Tab from Settings, and linked from the paywall |
| C5 | `/history` calendar day view, per-question history panel | `OPEN` (Phase 12) — built client-side over `GET /api/v1/history`, which is the shape the API deliberately chose for a phone |
| C6 | `/pricing` marketing copy | `ACCEPTED` — the app's paywall is built from `GET /api/v1/billing/plans` + store `ProductDetails`, per store policy. The website's copy is not reproduced |

---

## D. Divergences from the brief

| # | Brief | Implementation | Reason |
| --- | --- | --- | --- |
| **D1** | §17 "Use RevenueCat for mobile subscriptions" | **`in_app_purchase`** | The backend verifies raw store handles (`transactionId` / `purchaseToken`) and `/api/webhooks/{apple,google}` are native store webhooks, not RevenueCat's. `docs/mobile-api.md` names `in_app_purchase`. Using RevenueCat would mean either extracting the underlying handle out of `purchases_flutter` to feed an endpoint that does not want it, or building a second parallel entitlement pipeline — both create a way for the app's idea of a subscription to drift from the website's. **Confirmed with the product owner, 2026-09-18.** `ACCEPTED` |
| D2 | §8 "Recommended stack … Freezed, GetIt" | Freezed + `json_serializable` yes; **Riverpod's own providers instead of GetIt** | Riverpod already is a compile-safe DI container. Adding GetIt gives two service locators and two lifetimes for the same objects. Brief §8 also says "do not introduce unnecessary dependencies". `ACCEPTED` |
| D3 | §11 "the mobile application must use the same scoring rules" | The app **displays** server-computed scores and never computes one | Stronger than parity: there is no second implementation to drift. The one exception is the standalone band calculator (C2), which is a public utility, not a scoring path, and is test-locked against the server tables. `ACCEPTED` |
| D4 | §20 "Coaching features" | **Not present on the platform** | Audited: no tutor, session, schedule, meeting-link or notes table in `src/db/schema.ts`; no coaching route or action. `partners` is an institution *billing* relationship (a class buys seats for students), not a tutoring surface, and its screens are partner-facing. Nothing to implement. `ACCEPTED` |
| D5 | §28 "Push notifications" | **Not implemented** | There is no backend send path at all: no `device_tokens` table, no sender, no FCM server key in `env.ts`. Registering a token the server cannot store, and cannot send to, would be dead code. The Android permission is declared so the capability is one release away. `OPEN` — needs `POST /api/v1/me/push-token` plus a sender before any client work is worth doing |
| D6 | §8 "Firebase Analytics / Crashlytics" | **Not wired** | No Firebase project is configured for this app and no analytics infrastructure exists on the platform today. `setup_guide.md` §5 documents the `flutterfire configure` step; the event list is in `architecture.md` §13. Adding the SDKs before a project exists would ship an app that fails to initialise. `OPEN` |

---

## E. Feature coverage tracker

Filled in as phases land. `—` = not started.

| Area | Website | App | Phase | Status |
| --- | --- | --- | --- | --- |
| Sign up / sign in / Google | ✅ | ✅ | 5 | **DONE** |
| Forgot / reset password | ✅ | ✅ | 5 | **DONE** |
| Session restore + resume revalidation | ✅ | ✅ | 5 | **DONE** |
| Google phone prompt | ✅ | ✅ | 5 | **DONE** |
| Sign in with Apple | n/a | ✗ | — | OPEN — §A8, iOS release blocker |
| Dashboard | ✅ | ✅ | 12 | **DONE** |
| Practice library (3-step drill-down) | ✅ | ✅ | 8 | **DONE** |
| Section-practice player | ✅ | ✅ | 8 | **DONE** |
| All 23 question types | ✅ | ✅ | 7 | **DONE** |
| All 7 layouts | ✅ | ✅ | 7 | **DONE** — `diagram` from the contract, since no content uses it |
| Writing editor + word cap | ✅ | ✅ | 8 | **DONE** |
| Speaking recorder + upload gating | ✅ | ✅ | 8 | **DONE** |
| AI score polling | n/a (server render) | ✅ | 10 | **DONE** |
| Mock catalogue | ✅ | ✅ | 9 | **DONE** |
| Mock player + server clock | ✅ | ✅ | 9 | **DONE** |
| Mock autosave / resume / lapse | ✅ | ✅ | 9 | **DONE** |
| Mock result + per-module review | ✅ | ✅ | 9 | **DONE** |
| History list + attempt review | ✅ | ✅ | 12 | **DONE** |
| Settings / profile / password | ✅ | ✅ | 12 | **DONE** |
| Subscription purchase + restore | ✅ (Razorpay) | ✅ (IAP) | 11 | **DONE** — B1 |
| Plan gating + paywall | ✅ | ✅ | 11 | **DONE** |
| Band calculator | ✅ | ✅ | 12 | **DONE** — C2 |
| Paginated question-type player | ✅ | ✅ | 8 | **DONE** |
| Passage highlighting | ✅ | partial | — | OPEN — B3 |
| Push notifications | n/a | ✗ | — | OPEN — D5 |
| Analytics / Crashlytics | n/a | ✗ | — | OPEN — D6 |
| Admin panel | ✅ | **excluded** | — | ACCEPTED |
| Partner panel | ✅ | **excluded** | — | ACCEPTED |

### Both practice surfaces are built

The website has two, and so does the app:

- `/section-practice/[id]` -> `/practice/part/:id`. Sit one real exam part.
  The primary path, and where every Cambridge book lives.
- `/practice/[section]/[type]` -> `/practice/drill/:section/:type`. Drill ONE
  task type across the library, one set per page, over the older
  `question_sets` table, with the attempted-set palette.

**Both render through the same `PartBody`.** The second table gives every
question a row of its own rather than a jsonb document of groups, so
`PracticeSet.asSectionQuestions` reshapes it into one group on the way in —
which is what keeps a question from behaving differently depending on which
door a candidate came through. The answer sheet works in exam numbers on both;
the drill's submit converts to question uuids once, at the boundary.

### Remaining work, in priority order

1. **Sign in with Apple** — §A8. Blocks an iOS release, not an Android one.
2. **Integration and golden tests** — `test_plan.md` §5 and §7. Need a seeded
   staging account and a device.
3. **Passage highlighting persistence** — §B3. The `marker` token is ported and
   text is already selectable.
4. **Push and analytics** — §D5, §D6. Both need backend work first.
