# Mobile Synchronisation Rules

**The source of truth for keeping the website, the backend and the Flutter app
in step.**

A website or backend change that affects mobile functionality is **not complete**
until the corresponding mobile change has shipped or is recorded here as pending.

---

## 1. The rule

When you change anything in the left column, you owe an entry in the ledger
(§6) *in the same pull request*.

| Change | Mobile impact |
| --- | --- |
| New / removed / modified candidate feature | screens, routes, gating |
| New / removed `/api/v1` endpoint | repository + DTO |
| Request or response **shape** change | freezed model, parser, tests |
| `src/db/schema.ts` enum change | Dart enum + `unknown` fallback |
| New `question_type` | a new input widget + grading family |
| New `SetLayout` kind | a new layout widget |
| `QUESTION_TYPES` metadata (instruction, presentation, family) | player behaviour |
| `rawToBand` / `overallBand` / `PASS_BAND` | display + band calculator fixtures |
| AI scoring prompt or `aiFeedback` shape | feedback renderer |
| `MOCK_MODULE_MINUTES` / timeline logic | clock + between-module cards |
| `grading.ts` | expectations in tests; display of `earned` vs `isCorrect` |
| `plans.ts` entitlements or prices | **usually none** — read off the wire; store products if a tier is added |
| `PlanBlock` codes | paywall branch |
| Validation schema (`validation.ts`) | field names the app maps `error.fields` onto |
| `errors.ts` code set | `ApiErrorCode` enum |
| Auth, session or token semantics | interceptors, storage |
| Media route paths or gating | audio/image client |
| Rate limits | retry/backoff copy |

### The three that look safe and are not

1. **An added enum value.** `question_type`, `section`, `user_plan` and
   `ApiErrorCode` all cross the wire as strings. A Dart enum without a fallback
   throws on an unknown value, so an added type crashes every installed build.
   **Every wire enum in the app parses with an `unknown` fallback**, and this is
   asserted by a test.
2. **A renamed response field.** The website's Server Action and the route
   handler share a *function*, not a shape — renaming a field in a returned
   object updates the website silently and breaks the app.
3. **A new required request field.** Old builds will not send it. It must be
   optional server-side for at least one release cycle.

---

## 2. Compatibility policy

- **Additive changes ship freely.** New optional response fields and new
  endpoints are safe; Dart models ignore unknown JSON keys by construction.
- **Breaking changes need a deprecation window.** Keep the old field alongside
  the new for ≥ 1 release, then remove it once telemetry shows the old build is
  below the support floor.
- **Support floor:** the newest release minus two minor versions, or 60 days,
  whichever is longer.
- **`GET /api/v1/openapi` must be regenerated** (`npm run api:spec`) whenever a
  schema changes. A parameter that is documented is, by construction, a
  parameter that is validated — so an undocumented parameter is a bug in both
  places.

---

## 3. Server-owned facts the app must never hard-code

Listed because each one has a tempting local shortcut:

| Fact | Where it comes from | Tempting mistake |
| --- | --- | --- |
| What a plan allows | `EntitlementsDto`, every session | shipping the plan matrix in Dart |
| Remaining quota | `usage.practiceRemaining` | counting submits locally |
| Price | store `ProductDetails` | rendering `listPrice` |
| Band | server | deriving one from accuracy |
| Correctness | submit response | marking locally for instant feedback |
| Time left in a module | `remainingSeconds` / `endsAt` | `DateTime.now()` |
| The next module | `advance` response | `fromIndex + 1` |
| Whether a scorer exists | `scorers` | assuming AI is always available |
| Instruction text | the group's `instruction` | a per-type constant |

`feature_audit.md` §9 reproduces the plan matrix **for reference only**. If the
app ever reads it at runtime, that is the bug.

---

## 4. Release-gating checks

Before any app release:

1. `npm run api:spec` and diff `public/openapi.json` against the snapshot the
   current Dart models were generated from.
2. Run the contract tests (`test_plan.md` §6) against staging.
3. Confirm `QUESTION_TYPES`, `SECTION_TYPES`, the three band tables and the
   `ApiErrorCode` set match their Dart mirrors — these are pinned by tests that
   fail loudly rather than by review.
4. Reconcile `mobile_gap_analysis.md` §E.

---

## 5. Cache invalidation

| Trigger | Drop |
| --- | --- |
| sign-out | every box for that user id |
| `GET /auth/session` returns a different `plan` | entitlement-dependent caches, paywall state |
| practice or mock submit | dashboard, history |
| `PATCH /me` changes `targetModule` | practice library, mock catalogue |
| app version change | everything (schema may have moved) |

**Audio is never cached to disk.** The media routes send
`private, no-store, max-age=0` deliberately — the recordings are the product, and
a disk copy is what `protected-media.ts` exists to prevent.

---

## 6. Change ledger

Every website/backend change with mobile impact. Newest first.

| Date | Feature | Change | Affected API | Mobile impact | Required mobile change | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-09-18 | Section practice | Open + submit endpoints added for `practice_sections` | `GET /api/v1/practice/sections/{id}`, `POST …/submit` (**new**) | Unblocks the primary content path | Section player + repository | Planned (Phase 3/8) |
| 2026-09-18 | Mock review | Per-module review exposed | `GET /api/v1/mock/sessions/{id}/review` (**new**) | Mock result drill-down | Review screen | Planned (Phase 3/9) |
| 2026-09-18 | Mock results | Completed-sittings list exposed | `GET /api/v1/mock/results` (**new**) | Results tab | Results list | Planned (Phase 3/9) |
| 2026-09-18 | Password recovery | Forgot/reset exposed as JSON | `POST /api/v1/auth/{forgot,reset}-password` (**new**) | Recovery in-app | Two screens + reset deep link | Planned (Phase 3/5) |
| 2026-09-18 | Practice palette | Attempted-set indices exposed | `GET /api/v1/practice/attempted-sets` (**new**) | Tick marks in the set palette | Palette widget | Planned (Phase 3/8) |
| 2026-09-18 | Payments | Mobile billing settled on `in_app_purchase`, not RevenueCat | `POST /api/v1/billing/iap/verify` (unchanged) | Purchase implementation | Store integration per `api_inventory.md` §11.2 | Decided — `mobile_gap_analysis.md` D1 |
| *(prior to this project)* | Mobile API | `/api/v1` introduced: 24 operations, bearer sessions, IAP verification, store webhooks | all | The app's entire surface | — | Shipped |
