# Change Log

Every change made for the IELTSVega mobile app, on either side of the wire.
Newest first. Format per `mobile_app_migration_plan.md` §3 and brief §38.

---

## 2026-09-18 — Phases 4–13: the Flutter application

**Change** Built the IELTSVega app in `mobileapp/` — Flutter 3.38.2 / Dart
3.10.0, 73 library files, `flutter analyze` clean, **246 tests passing**, and a
**debug APK that builds** (`app-dev-debug.apk`).

### What it does

| Area | Built |
| --- | --- |
| Auth | Sign up, sign in, native Google, session restore, resume revalidation, forgot/reset, phone prompt for Google accounts, sign-out |
| Dashboard | Exam countdown, today, streak, per-skill breakdown, coverage, recent mocks, recent activity, focus card, allowance meter |
| Practice — sit a part | 3-step library drill-down, the section player, submit, inline review |
| Practice — drill a type | One set per page over `question_sets`, with the attempted-set palette |
| Question types | All 23, across all nine input families |
| Layouts | All seven, including merged-cell tables, the notes word bank and worked example, and `choices` turning typing into picking |
| Writing | Editor with the live count, the hard cap at `max(min*2, 300)`, and every writing aid off |
| Speaking | Prep timer, speak limit with auto-stop, 16 kHz mono PCM WAV recording, upload with retry, **submit gated on the upload landing** |
| AI evaluation | The poller, with all four outcomes distinguished, plus defensive `aiFeedback` rendering |
| Mock tests | Catalogue, server clock, autosave, advance, finish, resume, lapse announcement, result, per-module review |
| Results & history | Attempt list grouped by day, full attempt review, mock results tab |
| Subscription | Store catalogue, purchase, **verify before acknowledge**, restore, paywall from `PlanBlock`, feature gating |
| Profile | Edit, password change, subscription panel, theme, legal links, band calculator |

### Decisions inside the build

| Decision | Reason |
| --- | --- |
| **One `PartBody` renders practice, the drill and the mock** | The server maintains that property with `toClientMockPart`; the app honours it with one widget tree. Three renderers is how a question behaves differently depending on which door a candidate came through |
| **`ExamClock` ticks a monotonic `Stopwatch`**, never `DateTime.now()` | A device clock is changeable from the settings screen. Made injectable so a test can prove it |
| **`AnswerSheet.scope` is mutable** | A mock module holds several parts and shows one at a time. One sheet holds the whole module — what is autosaved and handed in — and the scope follows the part on screen. A sheet per part would submit the module incomplete |
| **The answer-sheet ticks come from a shape-aware `isAnswered`** | A cleared gap keeps its key. Counting keys lights up numbers whose box is visibly empty, and `{index: 0}` is option A |
| **No Apple button on the sign-in screen** | The backend has no Apple identity path, and a button that fails review is worse than none. Recorded as an iOS release blocker — `mobile_gap_analysis.md` §A8 |
| **Band tables are mirrored and test-locked** | The calculator is genuinely useful offline. The tables are pinned against `src/lib/ielts.ts` by a test that fails if they drift |
| **Gaps render inline via `WidgetSpan`** | A gap on its own row turns a summary into a list of fragments, which is not what the paper prints |

### Tests

201, weighted to what an escaped bug costs a candidate:

- **The content engine** — `parseGaps` against every edge (leading, trailing,
  adjacent, malformed), `gapsIn`, `shiftLayoutGaps` per layout kind, and the
  `notes` group **title** that carries a gap.
- **`isAnswered`**, row by row: `{index: 0}` is answered, `{text: ""}` is not,
  `{key: ""}` is not, a recording is.
- **Upload gating** — one pending upload anywhere blocks submit.
- **Band tables** — every row boundary in all three tables, plus `.25` and
  `.75` rounding up and General never flattering against Academic.
- **The exam clock** — including that advancing elapsed time is the only input.
- **The score poller** — stops on settled, never retries `unavailable`, backs
  off on a transient network failure, propagates a settled one.
- **Enum degradation** — an unrecognised question type, section or status maps
  to `unknown` rather than throwing, which is what stops an added server enum
  crashing every installed build.

**Website impact** None. The app consumes the API and changes nothing on the
site.

**API impact** None beyond Phase 3.

**Documentation** `mobile_gap_analysis.md` §E rewritten against what now
exists; §A8 (Apple sign-in), D5 (push) and D6 (analytics) added as open items
with the work each needs.

### Three bugs the tests caught before a device did

1. **Every table-completion part would have crashed.** The table header row used
   `CrossAxisAlignment.stretch` inside a scroll view, which asserts
   "BoxConstraints forces an infinite height". 63 groups in the live library use
   the `table` layout.
2. **Option rows could not be tapped on their text.** `SelectableText` consumes
   the tap gesture, so the row's `InkWell` never fired — a candidate had to hit
   the letter badge or the padding to answer. Replaced with plain `Text`;
   selection belongs to the passage, which is where it is actually needed.
3. **An HTML error page was reported as "No connection".** Dio's JSON
   transformer throws on a non-JSON body *before* the envelope is unwrapped, so
   a proxy error page surfaced as a transport failure and sent the candidate
   chasing their wifi. The client now decodes the body itself and hands a
   non-envelope response to the branch written for it.

Two build failures were also fixed: `record` 5.x pins a Linux implementation
that does not match the platform interface it declares (and the front-end
compiles every federated implementation, so it broke an **Android** build),
and `androidx.core` 1.17 requires `compileSdk 36`.

### Known gaps, all recorded

- **Sign in with Apple** — iOS release blocker, §A8.
- **Push notifications and analytics** — no backend send path and no Firebase
  project exist, so client work would be dead code. §D5, §D6.
- **Passage highlighting** — text is selectable; marks are not yet persisted. §B3.
- **Integration and golden tests** — specified in `test_plan.md` §5 and §7, not
  yet written. They need a seeded staging account and a device.

---

## 2026-09-18 — Phase 3: backend gap closure

**Change** Added the seven `/api/v1` endpoints from `mobile_gap_analysis.md` §A,
and moved four pieces of policy into `server-only` modules so each has one
implementation with two front doors.

New routes:

| Method | Path |
| --- | --- |
| GET | `/api/v1/practice/sections/{sectionId}` |
| POST | `/api/v1/practice/sections/{sectionId}/submit` |
| GET | `/api/v1/practice/attempted-sets` |
| GET | `/api/v1/mock/results` |
| GET | `/api/v1/mock/sessions/{sessionId}/review` |
| POST | `/api/v1/auth/forgot-password` |
| POST | `/api/v1/auth/reset-password` |

New `server-only` modules, each now the single implementation of a rule the
website and the app share:

| Module | Holds | Website caller rewired to it |
| --- | --- | --- |
| `src/lib/section-grading.ts` | grading one practice part | `actions/section-practice.ts` |
| `src/lib/mock-review.ts` | per-module review, past sittings | `actions/mock.ts` |
| `src/lib/practice-progress.ts` | attempted-set indices | `actions/questions.ts` |
| `src/lib/auth/recovery-core.ts` | password recovery policy | `actions/recovery.ts` |

**Reason** Five candidate-facing capabilities had no JSON endpoint; the most
serious was section practice, where `GET /api/v1/practice/library` browsed the
Cambridge catalogue and then dead-ended with no way to open or submit a part.

**Why `server-only` rather than more `…For(userId)` exports.** Everything
exported from a `"use server"` module is a callable endpoint whose arguments the
client supplies, so a user-taking function exported from one can be handed
somebody else's identity. `src/app/actions/mock.ts` already says so in a comment
beside its scoring wrappers. Rather than add five more such exports, the new
policy lives in `server-only` modules that no client can address, and each has
two callers that establish the user their own way — a cookie session on the
website, a bearer token in the route handler.

**Website impact** Behaviour unchanged. Four action modules now delegate instead
of holding the implementation; their exported signatures and types are the same,
so `section-player.tsx`, `section-body.tsx` and the results pages are untouched.

**Mobile impact** Unblocks Phases 5, 8 and 9.

**API impact** `GET /api/v1/openapi` goes from 24 to **34 operations across 30
paths**; `public/openapi.json` regenerated.

**Tests** `npx tsc --noEmit` clean; `eslint` clean on every changed file. Routes
smoke-tested against a running dev server: correct JSON envelope and error code
for unauthenticated, bad-input, and bad-token cases on all seven; `openSection`
+ `toClientSection` verified against live content (no answer key, no transcript,
no `s3://`, gated media path).

**Documentation** `api_inventory.md` §13 marks the seven `NEW`;
`mobile_gap_analysis.md` §A all `CLOSED`; `mobile_sync_rules.md` ledger carries
each one.

### Content-corpus findings (measured, not assumed)

Surveyed all 1,035 live `practice_sections`. Two results change the renderer and
are recorded in `api_inventory.md` §6.2a:

- The **`diagram` layout is used by nothing** — zero occurrences, zero pins. All
  26 `plan_map_diagram_labelling` groups use the **`options`** layout instead: a
  map image on the part plus a lettered options box, matched by prompt. The
  tappable-pin renderer therefore has no production content behind it.
- **`diagram_label_completion` appears in no live content at all.**
- **510 of 1,035 parts carry 2–4 question groups** against one stimulus, so the
  multi-group case is about half the library rather than an edge case.
- **161 items are worth more than one mark**, so `earned / marks` display is a
  common path, not a rarity.
- All five `CorrectAnswer` shapes are live: `any` 3,441 · `key` 1,675 ·
  `value` 939 · `index` 786 · `indices` 161. Map labelling is keyed `{"any":
  ["A"]}` while the client sends `{"key": "A"}` — which is precisely why
  `grade()` reads `ans.text ?? ans.key` for the `labelling` family.

---

## 2026-09-18 — Phase 2: documentation

**Change** Created the mobile documentation set from a full read of the Next.js
source: `mobile_app_migration_plan.md`, `feature_audit.md`, `api_inventory.md`,
`scoring_rules.md`, `mobile_sync_rules.md`, `mobile_gap_analysis.md`,
`architecture.md`, `setup_guide.md`, `test_plan.md`, `deployment_guide.md`,
`release_checklist.md`, and this file.

**Reason** The Documentation-First Rule: a feature is documented before it is
implemented. Also Phase 1's findings needed somewhere authoritative to live —
notably the two conflicts between the brief and the shipped implementation.

**Website impact** None.
**Mobile impact** Defines the build.
**API impact** None yet; §A of the gap analysis specifies seven new endpoints for
Phase 3.
**Tests** None yet; `test_plan.md` specifies them.
**Documentation** All eleven documents created. `docs/mobile-api.md` (pre-existing)
is unchanged and remains the backend's own statement of intent; the new documents
cite it rather than restating it.

**Decisions recorded**

| # | Decision | Rationale |
| --- | --- | --- |
| D1 | `in_app_purchase`, **not** RevenueCat | The backend verifies raw store handles and the webhooks are the native store's. RevenueCat would need either a fragile handle extraction or a second entitlement pipeline. Confirmed with the product owner |
| D2 | Riverpod for DI; no GetIt | Riverpod is already a compile-safe container; two locators means two lifetimes for the same objects |
| D3 | The app computes no scores | Stronger than parity — there is no second implementation to drift. The band calculator is the one mirror, and it is test-locked |
| D4 | No coaching feature | Audited: no tutor/session/schedule table, route or action exists. The homepage states the platform is "not a coaching course" |
| D5 | Add the seven missing `/api/v1` routes | Section practice is the primary content path and its library currently dead-ends |

**Notable findings from Phase 1**

- The `/api/v1` surface is 24 operations, built on "one policy, two front doors":
  the website's Server Action and the route handler call the same `…For(user, …)`
  function, so the app cannot end up with different rules.
- The content model is document-shaped: one `practice_sections` row is one exam
  part, carrying 2–3 question **groups** against one shared stimulus. The player
  must render multiple groups per stimulus.
- Two numbering systems meet in a mock (`item.n` within a part vs the answer
  sheet), reconciled by `numberOffset`; gaps in a layout must be shifted with it.
- The mock clock is a frozen server-side timeline, not a countdown.
- Media is proxied, never presigned, and gated partly by Fetch Metadata — which
  constrains the HTTP headers the audio client may send.
- A speaking answer is only usable once its upload lands; submitting earlier is
  silent data loss that has happened before.

---

## Earlier (pre-project, for context)

| Commit | Change | Mobile relevance |
| --- | --- | --- |
| `252f11c` | Google ID token verification and IAP handling | `POST /api/v1/auth/google`, `POST /api/v1/billing/iap/verify`, the store webhooks |
| `f2e3903` | Transactions ledger and revenue tracking | Server-side only; no app surface |
| `ea4711e` | `PARTNER_DEFAULT_PLAN` for partner components | Partner panel — out of scope |
| `fb9cd25` | Speaking recording handling; content-stats caching | `ingestRecording`, `getTypeTotals` behind `/practice/sets` |
| `6c6727d` | `formatDate` utility | Web presentation only |
