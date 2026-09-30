# Test Plan

**Status: 246 tests passing** — unit and widget. Integration and golden suites
are specified here and not yet written; they need a seeded staging account and
a device, which are the two things not available in this environment.

**Target: ≥ 80% meaningful coverage, weighted to business-critical logic.**
Coverage is a by-product, not the goal — a test that asserts a getter returns
what was assigned raises the number and catches nothing.

Ranked by what an escaped bug actually costs a candidate:

1. **Silent data loss** — an answer that disappears, a recording submitted with
   no audio, an hour of a mock lost.
2. **A wrong mark** — a score that does not match the website's.
3. **A wrong entitlement** — a paywall where there should not be one, or none
   where there should.
4. Everything else.

---

## 1. Layers

| Layer | Tool | Scope |
| --- | --- | --- |
| Unit | `flutter_test` | content engine, parsers, models, repositories, clocks, state |
| Widget | `flutter_test` | question inputs, layouts, timers, recorder, result cards |
| Golden | `golden_toolkit` | stable components, light + dark, 3 text scales |
| Integration | `integration_test` | end-to-end flows on a device |
| Contract | `flutter_test` + fixtures | Dart models vs the real OpenAPI snapshot |

Fakes are hand-written against the repository interfaces (`mocktail` where a
stub is genuinely simpler). HTTP is faked at `DioAdapter`, not at the repository,
so the interceptor chain — envelope unwrapping, error mapping, retry — is under
test rather than bypassed.

---

## 2. Fixtures

`test/fixtures/` holds **real payloads**, not invented ones: captured from a dev
server and scrubbed. Inventing a `SectionQuestions` document is how you end up
testing a shape the server never sends.

Required:
- one part per layout kind (7), including a table with `colSpan`/`rowSpan`, a
  `notes` with `example` + `wordBank`, and an `inline_blanks` **with** and
  **without** `choices`
- one part per `InputFamily` (9)
- a multi-group part (table 1–6 + notes 7–10 off one recording)
- a full mock sitting with a non-zero `numberOffset` on Writing and Speaking
- every `PlanBlock` code
- every `ApiErrorCode`
- `aiFeedback` for Writing and for Speaking

**Two fixtures are necessarily synthetic**, and are labelled as such: the
`diagram` layout and `diagram_label_completion` appear **nowhere** in the 1,035
live parts (`api_inventory.md` §6.2a). They are built from the contract rather
than captured, so their tests prove the renderer honours the shape — not that it
matches production content, because there is none to match.

The real map-labelling fixture is an `options` layout over a part-level
`imageUrl`, keyed `{"any": ["A"]}` against a client answer of `{"key": "A"}` —
the case that exercises `grade()`'s `ans.text ?? ans.key` fallback.

---

## 3. Unit tests

### 3.1 The content engine — the deepest tests in the app

| Case | Expected |
| --- | --- |
| `parseGaps("up to [[14]] degrees")` | `["up to ", Gap(14), " degrees"]` |
| gap at string start / end / adjacent gaps | no empty literal segments |
| text with no gap | one literal segment |
| malformed `[[x]]`, `[[ 14 ]]` | left as literal text |
| `gapsInLayout` per kind | every gap, in document order |
| `notes` group **title** carrying a gap | included — a real Cambridge layout |
| `diagram` pins | numbers come from `pin.gap`, not from text |
| `shiftLayoutGaps(l, 0)` | identity, same instance |
| `shiftLayoutGaps` per kind | every `[[n]]` moved; `options` untouched |
| `answerKey("abc", 7)` / `answerKey(null, 7)` | `"abc:7"` / `"7"` |
| `numberFromKey("abc:7")` | `7` |

**`isAnswered` gets its own table** — every row here is a bug that shipped or was
prevented:

| Answer | Expected | Why |
| --- | --- | --- |
| `null`, `{}` | false | |
| `{index: 0}` | **true** | option A; a truthiness test reads this as unanswered |
| `{indices: []}` | false | |
| `{indices: [0]}` | true | |
| `{text: ""}`, `{text: "   "}` | **false** | a gap cleared with backspace keeps its key |
| `{text: "a"}` | true | |
| `{key: ""}` | **false** | a matching slot cleared by tapping it |
| `{recorded: true}` | true | a recording is an answer by existing |

`isUploadPending` / `anyUploadPending`: a `pendingUpload: true` answer anywhere
blocks submit.

### 3.2 Models and enums

- Every DTO round-trips against its fixture.
- **Unknown enum values degrade, never throw** — an unrecognised
  `question_type`, `section`, `plan` or error code maps to `unknown`. This is
  the test that stops an added server enum from crashing every installed build.
- `numeric(2,1)` bands stay **strings**: `"7.0"` must not become `"7"`.
- Nullable-vs-absent is distinguished where it matters (`band: null` is not the
  same as no key).

### 3.3 Repositories

- `{ok:true}` -> `Ok`; `{ok:false}` -> `Err` with the right code.
- **Branching is on `error.code`, not the status** — a 402 whose body says
  `plan_required` and a 402 with a different code go different ways.
- `retryAfterSec` and the `Retry-After` header both honoured.
- `service_unavailable` retries; `conflict` does not.
- A cancelled token stops in flight.
- HTML (a proxy error page) produces a clean failure, not a `FormatException`
  pointing at `<!DOCTYPE`.

### 3.4 Band calculator

The one place the app mirrors server arithmetic (`mobile_gap_analysis.md` C2).
**A fixture generated from `src/lib/ielts.ts` is checked in, and the test fails
if the Dart tables disagree** — including the boundary of every row in all
three tables and the General-vs-Academic difference. `overallBand` is asserted
on the two round-up cases: 6.25 -> 6.5 and 6.75 -> 7.

### 3.5 Exam clock

- `remaining` counts down from the server anchor.
- **Moving the device clock forward does not change it.**
- Re-anchoring on `advance` replaces rather than accumulates.
- Never negative.

### 3.6 Score poller

- 3 s for 30 s, then 10 s, stop at 2 minutes.
- `status: "unavailable"` -> **stop immediately**, no retry offered.
- `aiScored: false` -> never polls at all.
- `retryAfterSec` from the response overrides the default.
- Backgrounding pauses; resume re-fetches.

### 3.7 Subscription state

- `purchasable: false` -> no button.
- `alreadySubscribed: true` -> purchase hidden entirely.
- Verify is called **before** `completePurchase`.
- A failed verify leaves the purchase **unacknowledged**.
- Restore is idempotent across repeats.
- `conflict` (receipt on another account) shows the message and does not retry.

---

## 4. Widget tests

| Area | Cases |
| --- | --- |
| `single` / `multi` | selection, deselection, `selectCount` cap enforced |
| `tfng` / `ynng` | three states, clearing |
| `matching` | option bank, assign, reassign, clear |
| `completion` | typed entry; **picker when `choices` is present** |
| `labelling` | pin tap, percentage positioning at several sizes |
| `table` layout | `colSpan`/`rowSpan`; **a short row is correct, not malformed** |
| `notes` layout | `example` rendered as given-not-answerable; `wordBank` as a reference box, not a picker |
| `inline_blanks` | gaps inline with text, not on their own rows |
| Writing editor | live count matches `countWords`; input **stops** at the cap |
| Speaking recorder | prep -> speak -> stop; auto-stop at `speakSeconds`; **submit blocked while `pendingUpload`** |
| Countdown | ticks, warns, does not go negative |
| Answer sheet | lights only genuinely answered numbers |
| Result card | `earned / marks` for a half-right pair, not a tick |
| Paywall | renders each `PlanBlock` code |
| Empty / error / loading | every list |

---

## 5. Golden tests

Light and dark, text scale 1.0 / 1.3 / 2.0, phone and tablet: dashboard cards,
band result card, all seven layouts, the question inputs, the paywall, the
between-modules card. Goldens are regenerated only with an intended visual
change, and the diff is reviewed.

---

## 6. Contract tests

Run against `public/openapi.json`, regenerated by `npm run api:spec`.

- Every endpoint the app calls exists in the spec with the method it uses.
- Every field a Dart model requires is present and of the declared type.
- `ApiErrorCode` matches `errors.ts` exactly.
- `QUESTION_TYPES` (23) and `SECTION_TYPES` match `ielts.ts`.

This is the mechanism behind `mobile_sync_rules.md` §4: a server shape change
fails a test rather than an app store review.

---

## 7. Integration tests

Against a seeded staging account.

| # | Flow | Asserts |
| --- | --- | --- |
| I1 | Sign up -> dashboard | 201, token in secure storage, dashboard drawn from the signup response |
| I2 | Sign in -> kill -> relaunch | session restored without a re-login |
| I3 | Wrong password ×N | the server's lockout message, no client-side counter |
| I4 | Forgot -> reset deep link -> sign in | old token rejected; **signed out everywhere** |
| I5 | Library drill-down -> open part | 3 steps, module filter correct |
| I6 | Reading part -> submit -> review | marks match the server; unanswered shown |
| I7 | Listening part with audio | bearer header accepted, ranged playback, seek |
| I8 | Writing -> submit -> poll -> band | `band: null` then a band; cap enforced |
| I9 | Speaking -> record -> upload -> submit | **submit blocked until upload completes**; band arrives |
| I10 | Free account -> Writing | `plan_required`, paywall from `error.plan` |
| I11 | Quota exhausted | "50 / 50" and the reset date, from `error.plan` |
| I12 | Start mock -> answer -> kill app -> relaunch | draft restored from `draftAnswers` |
| I13 | Mock, background past a module boundary | correct module on return; `lapsedIndexes` reported |
| I14 | Mock, finish a module early | next module opens immediately with its full time |
| I15 | Mock -> finish -> result | objective bands present, W/S pending, then filled |
| I16 | Resume a paper already open | 200 + `resumed: true`, "resuming where you left off" |
| I17 | Abandon then restart | fresh sitting, clean clock |
| I18 | Purchase (sandbox) | verify before acknowledge; entitlement reflected |
| I19 | Restore purchases | idempotent; no double entitlement |
| I20 | Receipt already on another account | `conflict` message, no retry loop |
| I21 | Airplane mode mid-practice | cached content, queued autosave, clean recovery |
| I22 | Device clock moved forward 2 h mid-mock | countdown unaffected |

---

## 8. Manual / device matrix

Android 10 (low-end, 3 GB) · Android 14 · Android 15 tablet ·
iPhone SE (small) · iPhone 15 · iPad.

Manual passes: microphone denied then granted from Settings; a phone call during
a recording; audio route change (headphones unplugged mid-listening); OS kill
during a mock; system font at maximum; TalkBack and VoiceOver through a full
practice part; light/dark switch mid-session.

---

## 9. CI

On every PR: `flutter analyze` (fatal-infos), `dart format --set-exit-if-changed`,
`flutter test --coverage`, contract tests, coverage threshold.
Nightly: integration tests on Firebase Test Lab (Android) and a macOS runner
(iOS), plus a `flutter build` for both platforms.
