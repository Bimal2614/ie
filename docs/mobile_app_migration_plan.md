# IELTSVega Mobile — Migration Plan

**Status:** Phase 2 (documentation) complete. Implementation begins at Phase 3.
**Target:** a production-ready Flutter application in `mobileapp/` with complete
user-facing feature parity with the IELTSVega website.

---

## 1. What already exists (and therefore what this is not)

This is **not** a port of a web codebase to Dart, and it is not a new backend.

The Next.js application at the repository root already exposes a first-class
JSON API for the app at **`/api/v1`**, built on the principle stated in
`docs/mobile-api.md`:

> **One policy, two front doors.** Anything a candidate can do lives in a
> function that takes an already-authenticated user and returns a result. The
> website's Server Action renders that result as form state; the route handler
> renders it as JSON.

That principle is visible everywhere in the source: `submitPracticeFor`,
`getDashboardStatsFor`, `getSetPaginatedFor`, `getRecentAttemptsFor`,
`updateProfileFor` and `startMockFor` are all `…For(user, …)` variants that the
website and the API both call. There is exactly one grading loop, one plan gate,
one lockout ladder and one exam clock.

**The mobile app therefore implements no business rules of its own.** It renders
what the server says. Concretely:

| The app never | because |
| --- | --- |
| computes a band | `band` comes from `rawToBand` / the AI scorers, server-side |
| computes a remaining quota | `planUsage()` returns `practiceRemaining` |
| decides what a plan allows | `EntitlementsDto` is sent with every session |
| keeps an authoritative exam clock | `endsAt` / `remainingSeconds` are the server's |
| marks an objective answer | `gradeMarks()` runs on submit |
| states its own subscription tier | the store receipt is verified server-side |

The single most important consequence: **an app build sits in review for days and
on old handsets for months.** Anything the client hard-codes about a plan, a
price, a band table or a rubric is wrong the first time it changes. The server
says what is allowed; the app draws what it is told.

---

## 2. Decisions taken before implementation

These were conflicts between the brief and the shipped implementation. The
Source-of-Truth Rule was applied: the implementation wins, and the brief is
recorded as a documented divergence.

### 2.1 Payments — `in_app_purchase`, not RevenueCat

**Decision: use the `in_app_purchase` package.** Recorded in
`mobile_gap_analysis.md` §D1 as a deliberate divergence from brief §17.

The backend verifies **raw store handles**: `POST /api/v1/billing/iap/verify`
takes an Apple `transactionId` or a Play `purchaseToken` and asks the store
itself what that handle is worth (`src/lib/payments/iap/apple.ts`,
`src/lib/payments/iap/google.ts`). Renewals arrive on `/api/webhooks/apple` and
`/api/webhooks/google` — **native store webhooks, not RevenueCat webhooks**.
`docs/mobile-api.md` instructs the app to use `in_app_purchase` by name.

Introducing RevenueCat would mean either extracting the underlying store handle
out of `purchases_flutter` to feed an endpoint that does not want it, or writing
a second, parallel entitlement pipeline on the backend. Both add a way for the
app's idea of a subscription to drift from the website's — which is the one
thing the billing design is built to prevent.

### 2.2 Missing `/api/v1` endpoints — added, not worked around

**Decision: add the missing route handlers**, each a thin translation of an
existing shared function, in the exact style of the 24 handlers already there.
No business rule is duplicated or invented.

Five candidate-facing capabilities had no JSON endpoint. The most serious is
**section practice**: `GET /api/v1/practice/library` browses
sources -> books -> parts and then dead-ends, because there is no way to *open*
or *submit* a part. That is the primary content path on the website — every
Cambridge book is stored in `practice_sections` — so without it the app would
ship with its main library unreachable. See `mobile_gap_analysis.md` §A.

### 2.3 Sequencing — documentation first, phased reporting

Per the brief's Documentation-First Rule, every document in this folder was
written from the source before any Dart was written, and is updated as part of
each phase rather than afterwards.

---

## 3. Phases

| # | Phase | Deliverable | Gate |
| --- | --- | --- | --- |
| 1 | Analysis | Source read end to end: API layer, actions, content model, scoring, plans, timing, media, design tokens | done |
| 2 | Documentation | The eleven documents in `docs/` | done |
| 3 | Backend gap closure | The `/api/v1` routes listed in `mobile_gap_analysis.md` §A | `npm run check` passes |
| 4 | Flutter foundation | Project, flavours, DI, Dio + interceptors, error mapping, secure storage, router, theme | `flutter analyze` clean |
| 5 | Authentication | Sign-up, sign-in, Google, session restore, resume revalidation, forgot/reset, sign-out | integration test green |
| 6 | Design system | Tokens from `globals.css`, typography, buttons, cards, chips, states, skeletons | golden tests |
| 7 | IELTS content engine | `SectionQuestions` model, seven layouts, gap parser, nine input families | unit tests on every family |
| 8 | Practice | Library drill-down, section player, paginated set player, submit, review | integration test |
| 9 | Mock tests | Catalogue, server clock, autosave, advance, finish, resume, lapse, result | integration test |
| 10 | AI evaluation | Recording upload, score polling, feedback rendering, `unavailable` handling | integration test |
| 11 | Subscriptions | Plans, store lookup, purchase, verify, restore, gating, paywall from `PlanBlock` | integration test |
| 12 | Profile, progress, history, notifications | Dashboard, history, attempt review, settings, FCM, deep links | widget tests |
| 13 | Test suite | Unit / widget / golden / integration to the coverage target | `flutter test` green |
| 14 | Parity audit | Website vs app, screen by screen | `feature_audit.md` fully ticked |
| 15 | Gap closure | Everything found in 14 | `mobile_gap_analysis.md` has no unexplained critical gap |
| 16 | Release prep | Signing, store metadata, privacy, data safety | `release_checklist.md` complete |

---

## 4. Scope boundary

**In scope** — every surface a `role = "user"` candidate can reach: auth,
dashboard, practice (both paths), section practice, mock tests, results, history
and attempt review, settings, pricing and purchase.

**Out of scope, deliberately:**

- **The admin panel** (`src/app/admin/**`, `src/components/admin/**`) — excluded
  by brief §21. `requireApiAdmin` exists but the app never calls it.
- **The partner panel** (`src/app/partner/**`, `/verify-students`) — an
  institution-facing surface for a `role = "partner"` login.
  `requireApiCandidate` turns those accounts away from the candidate endpoints
  by design: "an admin and a partner have no practice history, no streak and no
  plan, and every candidate endpoint would answer them with a
  convincing-looking empty object."
- **Marketing and SEO pages** (`/about`, `/blog`, `/faq`, `/resources`,
  `/templates`, `/ielts-band/*`, `/ielts-2026-changes`, `/contact`) — these
  exist to be indexed by search engines, which is not a job an app does.
  The three that carry real in-app utility (the band calculator and the legal
  pages) are handled per `mobile_gap_analysis.md` §C.
- **Razorpay checkout** — store policy forbids it in-app for digital goods. The
  website keeps it; the app uses the store. Both land on the same
  `subscriptions` table and the same `users.plan`.

---

## 5. Risks carried into implementation

| Risk | Mitigation |
| --- | --- |
| Speaking upload is capped at 4 MB by the serverless body ceiling; a full 120-second Part 2 long turn at 16 kHz mono PCM is ~3.8 MB and close to it | Record at exactly 16 kHz mono 16-bit; stop at `MAX_RECORDING_SECONDS` (125); surface `payload_too_large` as "record a shorter answer". Raising it needs a presigned S3 PUT on the backend, not a bigger number — tracked in `mobile_gap_analysis.md` §B4 |
| Media routes gate on Fetch Metadata (`isMediaElementRequest`), which fails **open** only when no `Sec-Fetch-*` header is present **and** `Accept` is not `text/html` | The audio client must never send `Accept: text/html`. Asserted by an integration test against a real route |
| Device clock drift breaking a timed exam | Never `DateTime.now()` for a countdown; anchor to `remainingSeconds` at receipt and tick a monotonic `Stopwatch` |
| AI scoring never resolving because a provider key is unset | `GET /attempts/{id}/score` returns `status: "unavailable"` plus `scorers: {writing, speaking}` — stop polling and say so |
| Backgrounded or OS-killed app losing an hour of a mock | Autosave to `PUT …/progress` every 15 s, on every answer change, and on `AppLifecycleState.paused` |
| Session eviction between web and app | `X-Client-Platform` on **every** request. Without it the app's session counts as a web one and evicts the candidate's browser session, permanently |
