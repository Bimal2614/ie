# Flutter Architecture

Flutter **3.38.2** / Dart **3.10.0** (the toolchain installed in this
environment). Clean Architecture, feature-first.

---

## 1. The governing constraint

**An app build sits in review for days and on old handsets for months.**

Everything below follows from that. Anything the client hard-codes about a plan,
a price, a band table, a rubric or a quota is wrong the first time it changes,
and stays wrong for months. So:

> The server says what is allowed. The app draws what it is told.

The app holds **no business rules**. It holds *presentation* rules — how to
render a table layout, how to tick a countdown, when to autosave — and those are
the ones worth testing hard.

---

## 2. Layers

```
presentation   widgets, screens, Riverpod notifiers
     │ depends on ↓
domain         entities, repository interfaces, pure logic (gap parser, isAnswered)
     ↑ implements
data           DTOs (freezed), repository impls, Dio client, Hive stores
```

Dependencies point **inward**. `domain` imports nothing from `data` or
`presentation` and has no Flutter import at all, which is what lets the content
engine be unit-tested without a widget binding.

**One deviation, stated plainly:** DTOs and entities are the same freezed classes
where the wire shape is already the shape the UI wants — which is most of this
API, because `src/lib/api/dto.ts` was written for exactly that. A hand-written
mapper between two identical records is ceremony that adds a place to be wrong.
Where they genuinely differ (the mock timeline, the question document) there is a
real mapper with real tests.

---

## 3. Project layout

```
mobileapp/
├── lib/
│   ├── main.dart                    # thin: flavour → bootstrap
│   ├── bootstrap.dart               # Firebase, Hive, error zone, ProviderScope
│   ├── core/
│   │   ├── config/                  # AppFlavor, Env, feature flags
│   │   ├── constants/
│   │   ├── errors/                  # ApiException, ApiErrorCode, failure mapping
│   │   ├── network/                 # Dio, interceptors, ApiResponse<T>, retry
│   │   ├── storage/                 # SecureTokenStore, HiveBoxes, CacheStore
│   │   ├── routing/                 # GoRouter, guards, deep links
│   │   ├── theme/                   # tokens, ColorScheme, TextTheme, section accents
│   │   ├── analytics/               # Analytics facade, Crashlytics, event names
│   │   └── utils/
│   ├── shared/
│   │   ├── widgets/                 # buttons, cards, chips, states, skeletons
│   │   ├── models/                  # PlanKey, SectionKey, QuestionTypeKey, PlanBlock
│   │   └── extensions/
│   └── features/
│       ├── auth/            {data,domain,presentation}
│       ├── dashboard/
│       ├── practice/                # both paths + the shared player
│       │   ├── data/
│       │   ├── domain/
│       │   │   ├── content/         # ← the IELTS content engine
│       │   │   └── ...
│       │   └── presentation/
│       │       ├── players/         # question widgets, one per InputFamily
│       │       └── layouts/         # one per SetLayout kind
│       ├── mock_test/
│       ├── results/
│       ├── history/
│       ├── subscription/
│       ├── profile/
│       └── settings/
├── test/                            # unit + widget, mirroring lib/
├── integration_test/
└── assets/
```

**No `listening/`, `reading/`, `writing/`, `speaking/` feature folders.** The
brief's example lists them, but the domain does not work that way: a section is
not a feature, it is a `SectionKey` on content that flows through one player.
Four near-identical feature folders would be four copies of the same widget tree
drifting apart — which is precisely the bug `toClientMockPart` exists to prevent
on the server ("the result matches `ClientGroup`/`ClientSectionView`, so the mock
and section practice render through exactly the same component and cannot drift
apart"). Brief §9 says not to create folders merely because they appear in the
example.

Similarly there is no `ai_evaluation/` feature: AI evaluation is not a screen,
it is a polling behaviour attached to a submitted attempt. It lives in
`results/domain/score_poller.dart`, used by both practice and mock.

And no `coaching/` — the platform has none (`mobile_gap_analysis.md` D4).

---

## 4. State and DI — Riverpod only

Riverpod 2 with `riverpod_generator`. **No GetIt** (`mobile_gap_analysis.md` D2):
Riverpod already is a compile-safe DI container with lifetimes, overrides and
scoping, and adding a second service locator means two lifetimes for the same
objects.

| Kind | Use |
| --- | --- |
| `Provider` | pure dependencies (Dio, repositories, clocks) |
| `FutureProvider` / `AsyncNotifier` | server-backed reads |
| `Notifier` | local UI state (a player's answer map) |
| `.family` | parameterised reads (`attemptProvider(attemptId)`) |
| `.autoDispose` | anything screen-scoped; **off** for the mock sitting, which must survive navigation |

`ProviderScope` is rebuilt on sign-out so no previous user's state can leak into
the next session.

---

## 5. Networking

`Dio` + interceptors, in order:

1. **Headers** — `Authorization: Bearer`, `X-Client-Platform: ios|android`
   (mandatory; omitting it evicts the user's browser session), `Accept:
   application/json`.
2. **Envelope** — unwraps `{ok, data}` / `{ok, error}` into
   `ApiResponse<T>`/`ApiException`. **Branches on `ok`, then `error.code` —
   never on the HTTP status.**
3. **Auth** — a single `unauthenticated` handler: clear keychain, reset scope,
   route to sign-in. One place, so a 401 can never be handled two ways.
4. **Retry** — `service_unavailable` and network errors only, honouring
   `Retry-After`. **Never** retries a non-idempotent POST that is not documented
   as idempotent. `iap/verify`, `finish` and `progress` are idempotent by design
   and *are* retried.
5. **Logging** — debug only, with `Authorization`, passwords and receipts
   redacted.

```dart
sealed class ApiResult<T> { }
final class Ok<T>    extends ApiResult<T> { final T data; }
final class Err<T>   extends ApiResult<T> { final ApiException e; }
```

`ApiErrorCode` is a Dart enum mirroring the closed set in `src/lib/api/errors.ts`,
with an `unknown` fallback so a new server code degrades to a generic message
instead of a crash.

**Timeouts** connect 10 s, receive 30 s — except `finish` (60 s, it marks a whole
paper) and `recording` (60 s, an upload on mobile data).

**Cancellation** every repository call takes an optional `CancelToken`; screen
disposal cancels.

---

## 6. Persistence

| Store | Contents | Encryption |
| --- | --- | --- |
| `flutter_secure_storage` | session token, `absoluteExpiresAt` | Keychain / EncryptedSharedPreferences |
| Hive `cache_<userId>` | last-good dashboard, history, catalogue, library | `HiveAesCipher` |
| Hive `drafts_<userId>` | in-flight answers, writing drafts, highlights | `HiveAesCipher` |
| — | **audio** | **never persisted** |

Every box is keyed by user id and dropped on sign-out. Audio is deliberately not
cached: the routes send `no-store` because the recordings *are* the product, and
a disk copy is exactly what `protected-media.ts` was written to prevent.

---

## 7. Routing

GoRouter, declarative, with a `redirect` driven by an auth `Listenable`.

```
/splash  /onboarding
/auth/{sign-in,sign-up,forgot-password,reset-password}
/  (shell: dashboard | practice | mock | history | profile)
/practice/library
/practice/library/{source}/{book}
/practice/section/:sectionId
/practice/:section/:type            (paginated set player)
/practice/result/:attemptId
/mock
/mock/session/:sessionId            (full-screen, no shell, exit guarded)
/mock/result/:sessionId
/mock/result/:sessionId/review/:section
/history  /history/:attemptId
/paywall  /paywall/plans
/settings/{profile,password,subscription,notifications,about}
```

**Guards:** unauthenticated -> `/auth/sign-in`; authenticated on an auth route ->
`/`; `user.phone == null` -> phone sheet; an active mock session blocks
navigation away from `/mock/session/:id` except through Finish or Abandon.

---

## 8. Deep links

`https://ieltsvega.com/*` as Universal Links (iOS) and App Links (Android).

| Web URL | Action |
| --- | --- |
| `/reset-password?token=` | `/auth/reset-password` |
| `/verify-email?token=` | Custom Tab, then `GET /auth/session` to pick up `emailVerified` |
| `/results/:id` | `/mock/result/:id` |
| `/history/:id` | `/history/:id` |
| `/pricing` | `/paywall` (**never** a browser — store policy) |
| anything else | Custom Tab / `SFSafariViewController` |

`assetlinks.json` and `apple-app-site-association` are served from the Next.js
app's `public/` — see `deployment_guide.md`.

---

## 9. Theme

Ported verbatim from `src/app/globals.css`, which is the single source of truth
for the brand. HSL triples become Dart `Color`s in `core/theme/tokens.dart`, with
a light and a dark map.

**Typeface: Inter, one across the whole app** — the CSS deliberately resolves
`--font-heading`, `--font-body`, `--font-mono` and `--font-serif` all to Inter so
there is a single font on landing, auth and dashboard. Bundled as an asset, not
fetched, so the first frame is not a font swap.

**Colour discipline, quoted from the source so it is not re-invented:**

> BLUE (`--brand`): links, nav, text-links, secondary/utility buttons, focus
> rings, active/selected.
> GREEN (`--green`): the ONE primary "go" CTA per surface, highlight cards, and
> success.
> Everything else stays monochrome (ink on paper).

| Token | Light | Dark |
| --- | --- | --- |
| `bg` | `hsl(39 38% 97%)` paper-warm | `hsl(222 47% 6%)` |
| `bgElev` | `hsl(0 0% 100%)` | `hsl(222 32% 10%)` |
| `bgSunken` | `hsl(39 30% 94%)` | `hsl(222 32% 8%)` |
| `surfaceStrong` | `hsl(222 47% 11%)` | — |
| `ink` | `hsl(222 47% 11%)` | `hsl(210 20% 96%)` |
| `inkSoft` | `hsl(215 25% 27%)` | `hsl(215 16% 75%)` |
| `inkMuted` | `hsl(215 16% 47%)` | `hsl(215 16% 60%)` |
| `line` | `hsl(220 13% 82%)` | `hsl(217 19% 22%)` |
| `brand` | `hsl(218 81% 32%)` | `hsl(218 90% 60%)` |
| `green` | `hsl(142 71% 45%)` | same |
| `accent` | `hsl(38 92% 50%)` | same |
| `success` | `hsl(158 64% 35%)` | same |
| `warning` | `hsl(32 95% 44%)` | same |
| `danger` | `hsl(0 72% 47%)` | same |
| `marker` | `hsl(48 96% 74%)` | `hsl(45 88% 32%)` |

**Section accents** — the same four-colour system the website uses:

| Section | Colour | Soft |
| --- | --- | --- |
| Listening | `hsl(258 63% 59%)` violet | `hsl(270 80% 96%)` |
| Reading | `hsl(38 100% 59%)` amber | `hsl(48 100% 95%)` |
| Writing | `hsl(82 55% 43%)` lime | `hsl(78 65% 95%)` |
| Speaking | `hsl(209 100% 57%)` blue | `hsl(214 100% 96%)` |

**Radii** 4 / 6 / 10 / 14 / 18 / pill. **Elevation** the five shadow tokens,
approximated as `BoxShadow` lists — Material's `elevation` is not used, because
it would not match the web.

The **marker** token deserves its own note: it exists because
`--warning-soft` at 95% lightness is a tint you have to hunt for, and "a marker
pen that leaves nothing visible is not a study tool". It inverts in dark mode
rather than being reused, since a pale wash would be a white block on a dark
page.

---

## 10. The content engine

`features/practice/domain/content/` — a pure-Dart port of
`src/lib/question-content.ts`, with **no Flutter import**, so it is unit-testable
in isolation. This is the highest-risk code in the app and gets the deepest
tests.

```
segment.dart        Segment = String | Gap; parseGaps(); GAP_RE
layout.dart         sealed SetLayout: InlineBlanks|Notes|Table|Form|Flowchart|Diagram|Options
question.dart       SectionQuestions, QuestionGroup, QuestionItem
answer.dart         Answer, isAnswered(), isUploadPending(), anyUploadPending()
answer_key.dart     answerKey(scope, n), numberFromKey(key)
numbering.dart      shiftLayoutGaps(layout, offset)
```

Every one of these is a **behavioural port, not a reimplementation**: the Dart
must produce the same output as the TypeScript for the same input, and
`test_plan.md` §3.1 pins that with shared fixtures extracted from real content.

`isAnswered` in particular is shape-aware and must be copied exactly — the
TypeScript carries a comment explaining that a naive version "left the answer
sheet lighting up numbers whose box was visibly empty", and that option A is
`{index: 0}` so a truthiness test reads the first option of every question as
unanswered.

Rendering maps one layout kind to one widget and one `InputFamily` to one input
widget, so **the mock and section practice share the entire tree** — the same
property the server maintains with `toClientMockPart`.

---

## 11. The exam clock

```dart
class ExamClock {
  ExamClock.fromServer(int remainingSeconds)
    : _anchor = remainingSeconds, _sw = Stopwatch()..start();
  int get remaining => max(0, _anchor - _sw.elapsed.inSeconds);
}
```

**Never `DateTime.now()`.** A device clock can be changed from the settings
screen, and a timed exam that trusts it is not a timed exam. The anchor is
re-taken from the server on every `GET session`, `advance` and resume, so drift
cannot accumulate.

On resume from background the app **re-fetches the sitting** rather than
extrapolating — the server may have rolled the module over, or closed the paper.

---

## 12. Error presentation

| Code | UI |
| --- | --- |
| `unauthenticated` | silent sign-out + sign-in screen |
| `plan_required` | paywall sheet built from `error.plan` |
| `validation_failed` | per-field inline errors from `error.fields` |
| `rate_limited` | non-blocking banner with a countdown |
| `service_unavailable` | inline retry; auto-retried once |
| `conflict` | dialog with the message; **no re-prompt** |
| `not_found` | empty state |
| `payload_too_large` | contextual ("record a shorter answer") |
| `server_error` | generic failure + retry; reported to Crashlytics |

`error.message` is always safe to show verbatim and is preferred over any string
the app invents — it is the same sentence the website shows, which means support
only ever has one wording to explain.

Every screen implements loading / success / empty / error, and every list has a
skeleton.

---

## 13. Analytics and crash reporting

Firebase Analytics + Crashlytics. Events: `app_open`, `sign_up`, `login`,
`practice_started/completed`, `mock_started/module_advanced/completed`,
`question_attempted`, `ai_evaluation_requested/received`,
`subscription_started/restored/cancelled`, `paywall_shown` (with the
`PlanBlock.code`), `upload_failed`, `score_unavailable`.

**Never logged:** passwords, tokens, receipts, recordings, transcripts, essay
text, email, phone. `FlutterError.onError` and `PlatformDispatcher.onError` go to
Crashlytics; API failures are recorded as non-fatals with method, path and
`error.code` — **never the body**, which can carry a candidate's essay.

---

## 14. Performance

- `const` constructors everywhere; `select()` to avoid whole-object rebuilds.
- Lazy lists for the library, history and question lists; a Reading passage is
  one long scroll and gets `SelectionArea` + a single `RichText`.
- Audio pre-buffers the current part only.
- Images through `cached_network_image` with the auth header, memory-capped.
- Autosave is debounced (15 s / on change), never per keystroke.
- Target 60 fps; jank budget verified with a timeline trace on a low-end Android
  during a Reading module.
