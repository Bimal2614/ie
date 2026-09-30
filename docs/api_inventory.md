# API Inventory

Every HTTP endpoint the IELTSVega mobile app talks to, traced from the route
handler through the shared function it calls to the tables it touches.

The machine-readable contract is at **`GET /api/v1/openapi`** (snapshot with
`npm run api:spec`, which writes `public/openapi.json`). This document is the
human one: it records the *behaviour* that a schema cannot — retry rules,
idempotency, why a field exists, and what the app must not infer.

- **Legend for status:** `LIVE` = shipped before this project. `NEW` = added in
  Phase 3 to close a parity gap (see `mobile_gap_analysis.md` §A).
- **Auth:** `Bearer` = `Authorization: Bearer <token>`; `none` = unauthenticated.
- Every request also sends `X-Client-Platform: ios | android`.

---

## 0. Transport rules that apply to every call

### 0.1 The envelope

```jsonc
{ "ok": true,  "data": { /* … */ } }
{ "ok": false, "error": { "code": "…", "message": "…",
                          "fields": {}, "retryAfterSec": 0, "plan": {} } }
```

`src/lib/api/respond.ts`. Branch on `ok`, then on `error.code` — **not** on the
HTTP status, which is a coarser view of the same information. `message` is
always safe to show a user verbatim.

### 0.2 The closed error set

`src/lib/api/errors.ts`. The app switches on these strings; two different 400s
that need two different screens are two codes here.

| `code` | HTTP | What the app does |
| --- | --- | --- |
| `unauthenticated` | 401 | clear the keychain, route to sign-in |
| `forbidden` | 403 | show the message; do not retry |
| `plan_required` | 402 | render the paywall from `error.plan` (a `PlanBlock`) |
| `validation_failed` | 422 | mark the inputs named in `error.fields` |
| `not_found` | 404 | empty state. **Also what somebody else's row returns** — never 403, which would confirm the id is real |
| `conflict` | 409 | show the message; do **not** re-prompt |
| `rate_limited` | 429 | back off by `error.retryAfterSec` (mirrored in `Retry-After`) |
| `payload_too_large` | 413 | shorten the input (recordings) |
| `service_unavailable` | 503 | retry **the same request unchanged** |
| `server_error` | 500 | generic failure screen with retry |

A 401 also carries `WWW-Authenticate: Bearer realm="ieltsvega"`, which is how a
genuine session expiry is told apart from a malformed header.

### 0.3 Caching

Every `/api/v1` response carries
`Cache-Control: no-store, no-cache, must-revalidate, private` and
`X-Content-Type-Options: nosniff`. The Dio client must not add an HTTP cache
over these. App-level caching is Hive-backed and keyed by user id
(`mobile_sync_rules.md` §5).

### 0.4 `PlanBlock` — the paywall payload

Attached as `error.plan` on every `plan_required`. Defined in `src/lib/plans.ts`
so both sides of the wire can read it.

```jsonc
{
  "blocked": true,
  "code": "section_locked" | "quota_exhausted" | "upgrade_required",
  "message": "You're on the Free plan. Writing and Speaking answers are …",
  "requiredPlan": "pro" | "premium",
  "upgradeHref": "/pricing",
  "used": 50,                      // quota_exhausted only
  "limit": 50,                     // quota_exhausted only
  "resetsAt": "2026-10-01T00:00:00.000Z"  // quota_exhausted only
}
```

The app renders `message` as the headline and `requiredPlan` as the button
target. It **does not** compose its own sentence: `upgradeHref` is a web path
and is mapped to the in-app paywall route, never opened in a browser.

---

## 1. Authentication

### 1.1 `POST /api/v1/auth/signup` — `LIVE`

Auth **none** · 201 Created · `src/app/api/v1/auth/signup/route.ts`
-> `registerAccount()` (`src/lib/auth/core.ts`) · tables `users`, `sessions`,
`audit_log`

**Request** — `signupSchema` (`src/lib/validation.ts`), the *same* schema the
website form uses:

```jsonc
{
  "name": "Asha Patel",            // trimmed, 2..80
  "email": "asha@example.com",     // trimmed, lowercased, RFC email, <=254
  "phone": "+91-9904529857",       // libphonenumber-validated, <=24
  "password": "…",                 // 6..128
  "targetModule": "academic"       // "academic" | "general", default academic
}
```

`phone` is one already-combined string (country code + national number). It is
checked with libphonenumber via `isValidStoredPhone`, which rejects far more
than a length check would. **The app must not reimplement this** — it renders
`error.fields.phone` from the server.

**Response 201** — `AuthResponseDto`:

```jsonc
{ "ok": true, "data": {
  "session": { "token": "…", "expiresAt": "…", "absoluteExpiresAt": "…" },
  "user": { /* UserDto, §1.7 */ },
  "entitlements": { /* EntitlementsDto, §1.8 */ }
}}
```

The profile and entitlements ship *with* the token so the app draws its first
screen from the sign-up response instead of firing two more requests behind a
spinner.

**Errors:** `validation_failed` (per-field), `conflict` (email taken),
`rate_limited`.

**Dart:** `SignupRequest`, `AuthResponse` · `AuthRepository.signup()`

---

### 1.2 `POST /api/v1/auth/login` — `LIVE`

Auth **none** · 200 · -> `authenticate()` · tables `users`, `sessions`,
`rate_limits`, `audit_log`

**Request** — `loginSchema`: `{ "email": "…", "password": "…" }`

**Response:** `AuthResponseDto`, exactly as §1.1.

**Errors:** `unauthenticated` (wrong credentials — deliberately identical for a
wrong password and an unknown email, via a constant-time anti-enumeration path),
`rate_limited` (the lockout ladder), `conflict` (deactivated account).

The throttling, the lockout ladder and the anti-enumeration path all live in
`authenticate()` and are shared with the website. **The app adds no client-side
attempt counter** — it would be a second, wrong copy of the ladder.

**Dart:** `LoginRequest`, `AuthResponse` · `AuthRepository.login()`

---

### 1.3 `POST /api/v1/auth/google` — `LIVE`

Auth **none** · 200 · -> `verifyGoogleIdToken()` -> `linkOrCreateGoogleAccount()`

**Request:** `{ "idToken": "<google id_token>" }` (max 8192)

This is the **`idToken`** from `google_sign_in`, *not* the access token — they
differ and only the id token is signed. There is no redirect, no `state` cookie
and no code exchange: the signature is the proof.

**Response:** `AuthResponseDto`.

**Errors:**
- `service_unavailable` — `GOOGLE_*_CLIENT_ID` unset. Show "try another way";
  do **not** tell the user their Google account failed.
- `conflict` — the Google account has no verified email.
- `unauthenticated` — the token did not verify.
- `rate_limited` — 30 per IP per 15 min.

A Google sign-up arrives with **no phone number** (Google's phone scope is
sensitive and not requested). The app must show the phone prompt when
`user.phone == null`; see §2.2.

**Dart:** `GoogleSignInRequest` · `AuthRepository.google()`

---

### 1.4 `GET /api/v1/auth/session` — `LIVE`

Auth **Bearer** · 200 · -> `touchSessionToken()`

**Call this on cold start and on every resume from background.** It answers both
questions a freshly-woken app has in one round trip: is the stored token still
valid (401 -> clear the keychain), and did anything change while we were away —
a plan bought on the website, a subscription that lapsed overnight, a profile
edited elsewhere.

It also **slides the 7-day idle window forward**. No new token is minted; the one
in the keychain simply lives longer, so there is nothing to store.

```jsonc
{ "ok": true, "data": { "user": { /* UserDto */ },
                        "entitlements": { /* EntitlementsDto */ } } }
```

**Dart:** `SessionRepository.revalidate()`

---

### 1.5 `POST /api/v1/auth/logout` — `LIVE`

Auth **Bearer (optional)** · **always 200** · -> `destroySessionToken()`

`{ "ok": true, "data": { "signedOut": true } }`

Never fails, even with a missing, expired or already-revoked token: an app that
cannot complete a logout is an app holding a token it has decided to stop using
but cannot get rid of. A 401 here would also be an oracle confirming which
tokens are live.

**Only this session dies.** The candidate's browser keeps its own — that is the
point of scoping sessions per client.

---

### 1.6 `POST /api/v1/auth/forgot-password` / `POST /api/v1/auth/reset-password` — `NEW`

Auth **none** · -> `requestPasswordReset()` / `resetPassword()`
(`src/app/actions/recovery.ts`) · tables `users`, `auth_tokens`, `sessions`

**Forgot** `{ "email": "…" }` -> `{ "ok": true, "data": { "sent": true } }`
**always**, whether or not the account exists. That uniform answer is the
anti-enumeration property and must not be "improved" into a useful error.
Throttled 5 per IP per hour.

**Reset** `{ "token": "…", "newPassword": "…" }` ->
`{ "ok": true, "data": { "reset": true, "signedOutEverywhere": true } }`

A reset **revokes every session on every device**, unlike a password *change*
(§2.3) which keeps them. The distinction is deliberate: a reset proves control
of the mailbox and is the path an attacker would use, so it clears everything; a
change is already authenticated by a live session plus the old password, and
revoking there would mostly punish the owner.

The app must therefore clear its keychain after a successful reset and route to
sign-in.

The emailed link points at `${APP_URL}/reset-password?token=…`. Deep-linked into
the app per `architecture.md` §8.

---

### 1.7 `UserDto`

`src/lib/api/dto.ts`. Built field by field, never spread from the row —
`users` also carries `passwordHash`, `failedLoginAttempts`, `lastLoginIp` and
`razorpayCustomerId`, none of which should reach a phone.

```jsonc
{
  "id": "uuid",
  "email": "asha@example.com",
  "name": "Asha Patel",
  "role": "user" | "admin" | "partner",
  "partnerId": "uuid" | null,
  "emailVerified": true,
  "phone": "+91-9904529857" | null,
  "targetModule": "academic" | "general",
  "targetBand": "7.0" | null,
  "examDate": "2026-11-14T00:00:00.000Z" | null,
  "plan": "free" | "pro" | "premium",
  "planExpiresAt": "…" | null,
  "storedPlan": "free" | "pro" | "premium"
}
```

- **`plan` is the entitlement right now**, already resolved against expiry by
  `effectivePlan()`. **Gate on this.**
- `storedPlan` is what the row says *before* expiry is applied. Support screens
  only. Gating on it would grant a lapsed subscription between the moment a
  period ends and the cron sweep's next run.
- All dates are ISO-8601 strings, converted explicitly so the Dart side can
  declare `DateTime` and be right.

**Dart:** `UserDto` (freezed), `plan` as a `PlanKey` enum.

---

### 1.8 `EntitlementsDto`

```jsonc
{
  "plan": "free",
  "label": "Free",
  "practiceSections": ["reading", "listening"],
  "monthlyPracticeAnswers": 50,     // null = unlimited
  "monthlyMockSittings": 0,         // null = unlimited
  "aiScoring": false,
  "priorityScoring": false,
  "advancedReports": false
}
```

Sent alongside the user **so the app can lock a tab without hard-coding the plan
matrix in Dart**. This matters more on mobile than on web: a web build ships the
moment entitlements change; an app build does not. The current matrix
(`src/lib/plans.ts`) is reproduced in `feature_audit.md` §9 for reference only —
**the app reads it off the wire.**

---

## 2. Account

### 2.1 `GET /api/v1/me` — `LIVE`

Auth **Bearer** · -> `planUsage()`

```jsonc
{ "ok": true, "data": {
  "user": { /* UserDto */ },
  "entitlements": { /* EntitlementsDto */ },
  "usage": {
    "plan": "free", "planLabel": "Free",
    "practiceUsed": 32,
    "practiceLimit": 50,            // null = unlimited
    "practiceRemaining": 18,        // null = unlimited
    "resetsAt": "2026-10-01T00:00:00.000Z",
    "sections": ["reading", "listening"],
    "aiScoring": false,
    "mocks": 0                      // null = unlimited
  }
}}
```

`usage` travels here rather than on a screen of its own because the app needs it
everywhere a paywall might appear. **The client never computes a remaining
quota — it renders one.**

### 2.2 `PATCH /api/v1/me` — `LIVE`

-> `updateProfileFor()` · `profileSchema`

```jsonc
{ "name": "…", "phone": "+91-…", "country": "India",
  "targetModule": "academic", "targetBand": "7.5", "examDate": "2026-11-14" }
```

`examDate` is `yyyy-mm-dd`; an **empty string clears it**. `targetBand` is one of
the eleven values in `TARGET_BANDS` (`"4.0"` … `"9.0"`).

Returns `{ user, entitlements }`. The user is **re-read**, not assembled from
the values just written, so a subscription a webhook applied a second earlier is
not clobbered.

This is also the endpoint behind the **Google phone prompt**: a Google sign-in
lands with `phone == null`, and the app blocks the shell on collecting one.

### 2.3 `POST /api/v1/me/password` — `LIVE`

`{ "currentPassword": "…", "newPassword": "…" }` -> `{ "changed": true }`

**The session survives**, on this client and on the others — see §1.6 for why.
`conflict` (not `validation_failed`) when the account is Google-only and has no
password to change.

---

## 3. Home

### 3.1 `GET /api/v1/dashboard` — `LIVE`

Auth **Bearer, candidates only** · -> `getDashboardStatsFor()` + `planUsage()` +
`recommendFocus()`

**One request, not five.** The web assembles this in a server component that can
await several queries without the user watching; an app doing the same over a
mobile network pays a full round trip for each and shows a different spinner
finishing at a different time for each.

```jsonc
{ "ok": true, "data": {
  "stats": {
    "todayAttempted": 12, "todayGraded": 12, "todayCorrect": 9, "todayAccuracy": 75,
    "totalAttempted": 840, "totalGraded": 812, "totalCorrect": 640, "totalAccuracy": 79,
    "currentStreak": 6, "longestStreak": 23,
    "sectionStats": {
      "listening": { "attempted": 0, "correct": 0, "graded": 0, "right": 0, "wrong": 0,
                     "avgBand": null, "accuracy": 0,
                     "practisedSets": 0, "availableSets": 0, "completion": 0 },
      "reading": { /* … */ }, "writing": { /* … */ }, "speaking": { /* … */ }
    },
    "recentMocks": [ { "id": "uuid", "module": "academic", "overallBand": "6.5",
                       "listeningBand": "7.0", "readingBand": "6.0",
                       "writingBand": null, "speakingBand": null,
                       "completedAt": "…" } ],
    "typeStats": [ { "section": "reading", "questionType": "matching_headings",
                     "attempted": 24, "correct": 14, "graded": 24,
                     "right": 14, "wrong": 10, "avgBand": null, "accuracy": 58 } ],
    "recentActivity": [ { "attemptId": "uuid", "section": "listening",
                          "questionType": "note_completion", "setTitle": "…",
                          "questions": 4, "correct": 3, "graded": 4,
                          "avgBand": null, "createdAt": "…" } ],
    "continueLast": { "section": "reading", "questionType": "true_false_notgiven",
                      "setTitle": "…", "createdAt": "…" } | null
  },
  "usage": { /* as §2.1 */ },
  "entitlements": { /* EntitlementsDto */ },
  "focus": {
    "weakestSection": { "key": "writing", "accuracy": 0, "attempted": 8,
                        "correct": 0, "band": 5.5, "gap": 1.5 } | null,
    "weakTypes": [ /* typeStats rows */ ],
    "targetBand": 7,
    "needsMorePractice": false
  }
}}
```

Notes the app must honour:

- `recentActivity` is **one entry per attempt**, not per question. A four-gap
  table submit is one thing the candidate did.
- `sectionStats.*.graded` / `.right` span both marking styles: objective rows
  carry `isCorrect`, band-scored rows count as right at `PASS_BAND` (6.0) or
  above. Without that, Writing and Speaking read as a permanent 0%.
- `avgBand` is the only meaningful signal for Writing and Speaking; `accuracy`
  is the only meaningful one for Listening and Reading. **Never show accuracy
  for a subjective section** (`isObjectiveSection()`).
- `focus` is sent as **data, not a rendered sentence**, so the app can style it
  and so changing the wording does not need an app release.

Returns `forbidden` for an admin or partner login — deliberately, since they
would otherwise get a convincing screen full of zeroes.

---

## 4. Practice — question-set path (`question_sets`)

### 4.1 `GET /api/v1/practice/sets` — `LIVE`

`?section=&questionType=&page=` · -> `getSetPaginatedFor()`

A **page is one set**: a passage and every question on it, or one recording and
its questions. That is the unit a candidate works through, which is why the
response carries `hasNextSet` rather than a total for the app to do arithmetic
on.

`section` is validated against `SECTION_ORDER`; `questionType` against the 23
keys of `QUESTION_TYPES`; `page` is 1-indexed, clamped to `1..10000` (an
unbounded `page` becomes an `OFFSET` Postgres will honour by walking a billion
rows).

```jsonc
{ "ok": true, "data": {
  "set": {
    "id": "uuid", "title": "…", "instructions": "…" | null,
    "section": "reading", "questionType": "matching_headings",
    "module": "academic" | "general" | "both",
    "passageText": "…" | null,
    "audioUrl": "/api/media/<setId>" | null,
    "imageUrl": "/api/media/<setId>/image" | null,
    "layout": { /* SetLayout, §6 */ } | null,
    "startNumber": 14,
    "estimatedMinutes": 20,
    "questions": [ {
      "id": "uuid", "questionType": "matching_headings",
      "prompt": "…" | null,
      "content": { "options": ["…"], "selectCount": 2,
                   "imageUrl": "/api/media/question/<id>/image" } | null,
      "wordLimitMin": null, "prepSeconds": null, "speakSeconds": null,
      "orderIndex": 0, "marks": 1,
      "promptAudioUrl": "/api/media/prompt/<questionId>" | null
    } ]
  },
  "totalSets": 12, "currentSetIndex": 3, "totalQuestions": 148,
  "hasNextSet": true, "hasPreviousSet": true
}}
```

Media is always **our gated path**, never `s3://` and never presigned — §7.

`not_found` when the section/type combination has no sets: the app asked for
something that does not exist, and an empty player would look like a set that
failed to load.

**Dart:** `PaginatedSetResult`, `PracticeSet`, `SetQuestion`

### 4.2 `POST /api/v1/practice/submit` — `LIVE`

-> `submitPracticeFor()` · tables `user_responses`

```jsonc
{ "setId": "uuid",
  "answers": { "<questionId>": { "index": 2 }, "<questionId>": { "text": "car park" } },
  "timeSpentSec": 412 }
```

**The band never comes from the client.** This sends answers; the server marks
the objective questions against the stored key and queues Writing and Speaking.

Answer shapes per family are in §6.4. The envelope is validated here; the
contents are stored as-is into a `jsonb` column, guarded at **200 keys / 256 KB**
inside `submitPracticeFor`.

```jsonc
{ "ok": true, "data": {
  "setId": "uuid", "attemptId": "uuid",
  "results": [ { "questionId": "uuid", "isCorrect": true, "marks": 1,
                 "correctAnswer": { "any": ["car park", "carpark"] },
                 "your": { "text": "carpark" }, "explanation": "…" } ],
  "correct": 7, "total": 10, "subjective": 0, "attempted": 8
}}
```

- `total` is the marks available across **every** objective question in the set,
  answered or not — leaving a question blank scores zero on test day.
- `attempted` is what the candidate actually touched, so the UI can say
  "8 of 10 answered".
- `isCorrect: null` means subjective (Writing/Speaking).
- **If `subjective > 0`, poll §5.2.**

`plan_required` (402) carrying a `PlanBlock` when the gate refuses — checked
*before* anything is graded or written.

### 4.3 `GET /api/v1/practice/attempted-sets` — `NEW`

`?section=&questionType=` -> `{ "setIndices": [0, 2, 5] }` ·
-> `getAttemptedSets()`

Which set indices the candidate has already completed, for the set palette's
tick marks. Zero-based, in paging order — the same order §4.1 pages by.

---

## 5. Practice — section path (`practice_sections`)

**This is the primary content path.** Every Cambridge book lives in
`practice_sections`: one row is one exam part (Listening Part 1, Reading Passage
2, Writing Task 1, Speaking Part 2), carrying its single shared stimulus as real
columns and its questions — grouped by task type, with the answer key — as one
`jsonb` document.

### 5.1 `GET /api/v1/practice/library` — `LIVE`

`?step=sources|books|parts` plus the step's own filters. Three steps behind one
route because they share their filters, their module resolution and their rate
guard.

**Module is resolved server-side from the session.** A candidate sits Academic
or General, never both. The optional `module` parameter only lets the UI look at
the other one deliberately; it cannot widen what a filter returns. The filter is
`module IN (theirs, 'both')`, not equality — Listening and Speaking are the same
paper in both modules and are stored once as `"both"`.

```
?step=sources&section=reading&module=academic
  -> { "sources": [ { "source": "cambridge", "label": "Cambridge",
                      "tests": 44, "parts": 528,
                      "sections": ["listening","reading","writing","speaking"] } ] }

?step=books&source=cambridge&section=reading
  -> { "books": [ { "key": "Cambridge 21::1", "book": "Cambridge 21",
                    "testNumber": 1, "label": "Cambridge 21 · Test 1",
                    "parts": 12, "questions": 82,
                    "sections": [ … ] } ] }

?step=parts&book=Cambridge%2021&testNumber=1&section=reading
  -> { "parts": [ { "id": "uuid", "sectionType": "reading", "partNumber": 2,
                    "title": "…", "questionTypes": ["matching_headings", … ],
                    "totalQuestions": 13, "startNumber": 14, "endNumber": 26,
                    "estimatedMinutes": 20, "hasAudio": false } ] }
```

`hasAudio` is presence, not a URL — the list only needs to draw a headphones
icon, and a URL is a private object location.

Omitting `testNumber` on `step=parts` means "every test in the book", which is a
real and distinct ask.

### 5.2 `GET /api/v1/practice/sections/{sectionId}` — `NEW`

-> `openSection()` -> `toClientSection()` · **answer key stripped**

The section player's payload. `toClientSection` rebuilds each item field by
field rather than spread-minus-`answer`, so a future answer-bearing field fails
to compile rather than silently shipping the mark scheme.

```jsonc
{ "ok": true, "data": {
  "id": "uuid", "sectionType": "listening",
  "book": "Cambridge 21", "testNumber": 1, "partNumber": 1,
  "title": "…", "instructions": "…" | null,
  "module": "both", "estimatedMinutes": 12,
  "audioUrl": "/api/practice/audio/<id>" | null,
  "passageText": null, "imageUrl": null,
  "startNumber": 1, "endNumber": 10, "totalQuestions": 10,
  "questions": { "groups": [ /* QuestionGroup, §6.3 */ ] }
}}
```

`transcript` is **never** sent — it is review-only material and, for a listening
part, it is the answers in prose. (It is also ~7 KB of the ~9.8 KB row, which is
why `openSection` names its columns.)

### 5.3 `POST /api/v1/practice/sections/{sectionId}/submit` — `NEW`

-> `submitSectionPractice()`'s shared core · tables `user_responses`

```jsonc
{ "answers": { "7": { "text": "library" }, "8": { "key": "C" } },
  "timeSpentSec": 640 }
```

**Answers are keyed by exam number** — the only id a `jsonb` item has. (Compare
§4.2, which keys by question uuid, and §9, which keys by `"<sectionId>:<n>"`.)

```jsonc
{ "ok": true, "data": {
  "attemptId": "uuid",
  "results": [ { "n": 7, "marks": 1, "questionType": "note_completion",
                 "isCorrect": true, "earned": 1,
                 "correctAnswer": { "any": ["library"] },
                 "your": { "text": "library" }, "explanation": "…" } ],
  "correct": 8, "total": 10, "subjective": 0
}}
```

`earned` differs from `isCorrect` for a paired "choose TWO letters": one right
letter of two earns 1 of 2, and `isCorrect` is false. **Show `earned`/`marks`,
not a tick.**

`plan_required` on the *part's own skill* — a Writing part cannot be submitted
from a plan that does not include Writing, however the candidate reached it.

### 5.4 `POST /api/v1/practice/recording` — `LIVE`

Auth **Bearer, candidates only** · **multipart**, field name `audio`

**The app must send 16 kHz mono 16-bit PCM WAV.** Flutter's `record` package
produces this natively on both platforms, and it is already the format the
scorer wants — so the server stores it as sent and never spawns ffmpeg. Anything
else reaches the no-ffmpeg branch and is refused, by design.

Limits: **4 MB** (kept under the 4.5 MB platform body ceiling so an oversized
answer gets a sentence a candidate can act on instead of a platform 413), and
**125 seconds** (`MAX_RECORDING_SECONDS`) — the 120-second Part 2 long turn plus
grace.

```jsonc
{ "ok": true, "data": { "audioUrl": "s3://…" } }
```

The returned `audioUrl` is an opaque handle the app puts into the answer as
`{ "recorded": true, "durationSec": 48, "audioUrl": "…" }`. It is **not**
playable and must never be rendered as a URL.

**Errors:**
- `plan_required` — checked *before the body is read*, so a free-tier candidate
  is told why without first uploading megabytes that were never going to be kept.
- `payload_too_large` — "record a shorter answer".
- `service_unavailable` with `retryAfterSec: 5` — the queue was full. **The same
  bytes will succeed shortly; this must not be reported as a bad recording.**

**Upload is asynchronous to the interview.** A speaking answer is reported to
the player the instant recording stops so the interview can move on, but it is
only *usable* once it carries an `audioUrl`. The app marks the answer
`pendingUpload: true` until then and **gates submit on
`anyUploadPending()`** — submitting earlier writes a row with no recording to
score, which is silent data loss the candidate is never told about.

---

## 6. The content contract

`src/lib/question-content.ts`. This is the part the Flutter renderer is built
around, and the part a schema cannot express.

### 6.1 Gaps

In the real exam the stimulus is shared and the **gaps are the questions**: a
summary paragraph with gaps 14–18 is one paragraph and five marks. So the
structure lives on the group as `layout`, and each item owns exactly one
numbered gap.

Gaps are written inline as `[[14]]`, referencing the item's **exam number**.
`parseGaps("up to [[14]] degrees")` -> `["up to ", Gap(14), " degrees"]`. The
Dart port must be byte-identical, including the regex `\[\[(\d+)\]\]`.

A gap that binds to nothing renders as literal `[[7]]` on screen — which is the
visible symptom of a numbering bug, and the reason `shiftLayoutGaps` exists.

### 6.2 The seven layouts (`SetLayout`)

| `kind` | Shape | Used by |
| --- | --- | --- |
| `inline_blanks` | `{ heading?, blocks: string[], choices?: {key,text}[] }` | sentence / summary completion |
| `notes` | `{ heading?, example?, groups: {title?, items: string[]}[], wordBank?: string[] }` | note completion |
| `table` | `{ heading?, columns: string[], rows: TableCell[][] }` | table completion |
| `form` | `{ heading?, rows: {label, value}[] }` | form completion |
| `flowchart` | `{ heading?, steps: string[], choices? }` | flow-chart completion |
| `diagram` | `{ heading?, imageUrl?, pins: {gap,x,y}[], choices? }` | diagram / plan / map labelling |
| `options` | `{ title, options: {key,text}[] }` | matching headings / features / endings / information |

Details the renderer must get right:

- **`choices` turns typing into picking.** On `inline_blanks`, `flowchart` and
  `diagram`, its presence means "complete this using the list of words A–H
  below" — a picker, not a text field. Without it, `inline_blanks` was
  mis-rendered as a matching task with each blank on its own row carrying a
  truncated sentence fragment.
- **`notes.wordBank` is a printed reference box, not a picker.** The candidate
  *writes the word out*; the entries are unlettered. The paper is unanswerable
  without it.
- **`notes.example` is the worked answer the paper gives away** before the
  questions start ("the Main Hall — seats ….200…."). Shown, never answered — it
  must look unlike the notes around it, or it reads as the first thing to fill in.
- **`table` cells carry `colSpan`/`rowSpan`.** A row carrying a merged cell holds
  *fewer* cells than the table has columns. That is the span doing its job, not a
  malformed row. `columns` may be empty when the paper prints no headings.
- **`diagram.pins` are percentages** of the image box, so they scale with it.

### 6.2a What the live corpus actually contains

Measured over all **1,035 live `practice_sections`** rows, because the type
catalogue and the content are not the same statement. Two results change the
renderer:

| Finding | Consequence |
| --- | --- |
| **`diagram` layout: 0 occurrences. Pins: 0.** | The pin renderer has no content to exercise it today |
| **All 26 `plan_map_diagram_labelling` groups use the `options` layout** | Map labelling is *an image on the part plus a lettered options box*, not tappable pins. The candidate matches "Harbor View Bookstore" to "Location A". Every one of those 26 parts carries an `imageUrl` |
| **`diagram_label_completion`: 0 occurrences** | Defined in the enum, unused in content |
| 964 groups have **no layout** | self-contained items (MCQ, TFNG, writing, speaking) are the majority |
| `options` 320 · `notes` 272 · `inline_blanks` 146 · `table` 63 · `flowchart` 34 · `form` 10 | build order |
| **510 of 1,035 parts have 2–4 groups** | the multi-group-per-stimulus case is ~49% of the library, not an edge case |
| 31 `inline_blanks` carry `choices` | the picker variant is real |
| 18 `notes` carry `example`; **1** carries `wordBank` | rare, still required |
| 4 tables carry `colSpan`/`rowSpan` | rare, still required |
| **161 items are worth more than 1 mark** | the paired "choose TWO" case is common — `earned / marks` matters |
| 739 items carry `promptAudioUrl`; 320 carry `audio` anchors | speaking prompts and replay-this-answer are both well covered |
| largest group: 11 items | |

**Answer-key shapes in use** — all five `CorrectAnswer` variants are live:
`any` 3,441 · `key` 1,675 · `value` 939 · `index` 786 · `indices` 161.

Note that map labelling is keyed as **`{"any": ["A"]}`**, not `{"key": "A"}`,
while the client sends `{"key": "A"}`. That works because `grade()` reads
`ans.text ?? ans.key` for the `labelling` family — which is exactly why that
fallback exists, and why it must be ported.

The pin renderer and `diagram_label_completion` are still built, since content
can add them at any time and the shapes are part of the contract — but they are
covered by synthetic fixtures rather than by real content, and that is recorded
in `test_plan.md` §2.

### 6.3 `QuestionGroup` / `QuestionItem`

A **group** is a run of consecutive questions sharing one task type and one
layout. One Cambridge part is typically 2–3 groups off a single stimulus:
Listening Part 1 of C21 Test 1 is a table completion for 1–6 and a note
completion for 7–10, off one 7-minute recording.

```jsonc
{ "questionType": "table_completion",
  "instruction": "Write ONE WORD AND/OR A NUMBER for each answer.",
  "from": 1, "to": 6,
  "layout": { /* SetLayout */ } | null,
  "audio": { "fromSec": 12.4, "toSec": 96.0 },
  "items": [ {
    "n": 3,
    "prompt": "…", "options": ["…"], "imageUrl": "…", "selectCount": 2,
    "marks": 1,
    "audio": { "fromSec": 41.2, "toSec": 48.9 },
    "explanation": "…",
    "wordLimitMin": 150, "wordLimitMax": null,
    "prepSeconds": 60, "speakSeconds": 120,
    "cueCard": { "topic": "…", "bullets": ["…"] },
    "promptAudioUrl": "/api/practice/prompt/<sectionId>/<n>"
  } ] }
```

- **`marks` defaults to 1.** "Questions 21 and 22 — choose TWO letters" is *one*
  selection scored out of two. Modelling it as two items puts two identical
  multi-selects on screen; modelling it as one 1-mark item silently loses a mark
  and breaks the numbering of everything after it.
- **`answer` is stripped** from every client payload.
- `audio` (on the group and on the item) is the stretch of recording the answer
  is spoken in, when the content knows it exactly — only generated audio carries
  it. It drives "replay this answer" in review.

### 6.4 Answer shapes and `isAnswered`

What the player collects, keyed by question id / exam number / `"<sectionId>:<n>"`
depending on the surface:

| Family | Shape |
| --- | --- |
| `single` | `{ "index": 2 }` |
| `multi` | `{ "indices": [0, 3] }` |
| `tfng` | `{ "value": "TRUE" }` |
| `ynng` | `{ "value": "YES" }` |
| `matching` | `{ "key": "C" }` |
| `completion`, `labelling` | `{ "text": "car park" }` (or `{ "key": "C" }` when lettered) |
| `writing` | `{ "text": "…", "words": 263 }` |
| `speaking` | `{ "recorded": true, "durationSec": 48, "audioUrl": "s3://…", "pendingUpload": false }` |

**`isAnswered` is shape-aware and must be ported exactly.** Emptying an input
does not delete its key: a gap cleared with backspace writes `{ "text": "" }`, a
matching slot cleared writes `{ "key": "" }`, a deselected choice writes `{}`.
Every one of those is `!= null`, so counting keys lights up answer-sheet numbers
whose box is visibly empty. And option A is `{ "index": 0 }`, so a blanket
truthiness test reads the first option of every question as unanswered.

### 6.5 `answerKey(scope, n)`

```
answerKey(sectionId, n) -> "<sectionId>:<n>"     // mock, section practice
answerKey(null, n)      -> "<n>"
```

A bare number collides **four ways** inside one mock paper: Listening and
Reading both run 1–40, and every Writing task and Speaking part starts again at
1. When the writer and the reader disagree on this key the failure is silent and
horrible — the answer sheet lights up as answered while the input the candidate
typed into shows nothing back. **One Dart function, used by both sides.**

### 6.6 Two numberings

Storage numbers an item **within its part** (Writing Task 2 is item 1 of part 2);
a mock paper numbers it **across the module** (question 2 of 2).

`sheetNumber = item.n + numberOffset`, where
`numberOffset = mockSection.startNumber - practiceSection.startNumber`.

Zero for Listening and Reading, which already number continuously. Non-zero for
Writing (1–2) and Speaking (1–11). `toClientMockPart` applies the shift on the
way out and `submitSitting` reverses it on the way in, so **no widget ever has to
remember which of the two it is holding.** `shiftLayoutGaps` moves the `[[n]]`
markers with them.

---

## 7. Media

Media is stored as `s3://bucket/<key>` in a private bucket. **Nothing on the
client ever learns that location.** Every read goes through one of our own
routes, which re-checks the session first. `src/lib/media-urls.ts` is the only
place an app media URL is written.

| Path | Serves | Mechanism |
| --- | --- | --- |
| `/api/practice/audio/{sectionId}` | listening audio for a part | **streamed**, ranged, 2 MB chunks |
| `/api/practice/image/{sectionId}` | figure / map / Task 1 visual | 302 to a 1-hour presigned URL |
| `/api/practice/prompt/{sectionId}/{n}` | examiner asking one speaking question | streamed |
| `/api/practice/recording/{answerRowId}` | the candidate's **own** recording | 302, owner-scoped |
| `/api/media/{setId}` · `/api/media/{setId}/image` | the same for `question_sets` | as above |
| `/api/media/question/{questionId}/image` | the chart one question is asked about | 302 |
| `/api/media/prompt/{questionId}` | examiner audio for a `questions` row | streamed |

Rules the app must follow:

1. **Send the bearer token.** These routes accept `Authorization: Bearer` *or*
   the session cookie (`apiUser()`), deliberately, so the website's `<audio>` and
   the app's player hit the same URL with the same gating rather than
   duplicating every ownership rule in a parallel `/api/v1/media`.
   `just_audio` accepts custom headers; pass them.
2. **Never send `Accept: text/html`.** Audio is gated by
   `isMediaElementRequest()`, which reads Fetch Metadata when present and
   otherwise falls back to "is this asking for HTML?". A Flutter client sends no
   `Sec-Fetch-*` headers, so it takes the fallback and passes — *unless* it asks
   for HTML.
3. **Recordings are private.** `/api/practice/recording/{id}` is keyed by the
   **answer row** id (`user_responses.id` for practice, `mock_test_answers.id`
   for a mock) and every lookup is filtered by the caller's own id. Somebody
   else's valid uuid is a 404, not a 200.
4. **No caching to disk.** Audio responses are `private, no-store, max-age=0` on
   purpose. The app must not persist them; see `mobile_sync_rules.md` §5.
5. Ranged requests are answered in **2 MB chunks** — `bytes=0-` returns the first
   chunk with a `Content-Range` giving the true length. The player asks for more
   as it needs it, exactly as it does when seeking.

---

## 8. Attempts and history

### 8.1 `GET /api/v1/history` — `LIVE`

`?limit=20&tzOffsetMinutes=-330` · -> `getRecentAttemptsFor()`

A flat reverse-chronological list, **deliberately not the website's shape**: the
web browses a day at a time from a calendar, which suits a wide screen and a
candidate looking for a particular session. A phone opens on "what have I been
doing" and scrolls.

**One row per attempt, not per answer** — a thirteen-gap passage is one entry
reading "9 / 13".

`tzOffsetMinutes` is as `Date.prototype.getTimezoneOffset()` reports it, so
**India is -330, not +330**. It has to come from the client because "today" is a
question about where the candidate is standing. Bounded to ±840.

```jsonc
{ "attempts": [ { "attemptId": "uuid", "questionType": "table_completion",
                  "setId": "uuid" | null, "setTitle": "…" | null,
                  "questions": 4, "correct": 3, "graded": 4,
                  "avgBand": null, "createdAt": "…" } ] }
```

### 8.2 `GET /api/v1/attempts/{attemptId}` — `LIVE`

-> `getAttemptDetailFor()` — the review screen: every question, what the
candidate answered, the right answer, the explanation, and the band with its AI
feedback where there is one. **The passage or recording comes with it**, because
reviewing a reading answer without the passage is not reviewing anything.

```jsonc
{ "attemptId": "uuid", "section": "listening",
  "questionType": "note_completion", "createdAt": "…",
  "correct": 3, "graded": 4,
  "items": [ { "responseId": "uuid", "questionId": "uuid" | null,
               "number": 7, "isCorrect": true, "marks": 1,
               "band": "7.0" | null, "rawScore": 1,
               "response": { "text": "library" },
               "audioUrl": "/api/practice/recording/<responseId>" | null,
               "transcript": "…" | null,
               "aiFeedback": { /* §10.3 */ } | null,
               "question": { "prompt": "…", "content": { … },
                             "correctAnswer": { "any": ["library"] },
                             "explanation": "…", "orderIndex": 6,
                             "wordLimitMin": null,
                             "prepSeconds": null, "speakSeconds": null } | null } ],
  "set": { "id": "uuid", "title": "…", "instructions": "…",
           "passageText": "…" | null, "audioUrl": "…" | null,
           "imageUrl": "…" | null, "layout": { … } | null,
           "startNumber": 1 } | null }
```

`question` is null once the question has been deleted (`question_id` is `SET
NULL`); review then falls back to a plain list. `questionType` and `section` are
denormalised onto the response row precisely so history survives content edits.

Owner-scoped; another candidate's attempt is indistinguishable from one that
does not exist.

### 8.3 `GET /api/v1/attempts/{attemptId}/score` — `LIVE`

**The endpoint the app needs and the website does not.** On the web, scoring runs
in `after()` and the finished band arrives with the next render. An app has no
such render: it gets a submit with `band: null` and must find out for itself.

```jsonc
{ "attemptId": "uuid",
  "status": "not_applicable" | "pending" | "scored" | "unavailable",
  "aiScored": true, "pending": 1, "total": 2,
  "scorers": { "writing": true, "speaking": false },
  "retryAfterSec": 3,
  "results": [ { "responseId": "uuid", "section": "writing",
                 "questionType": "writing_task2", "band": "6.5",
                 "isCorrect": null, "feedback": { /* §10.3 */ } } ] }
```

**Polling schedule** (the response carries `retryAfterSec` so nothing is
hard-coded): every 3 s for the first 30 s, then every 10 s, giving up at 2
minutes with whatever has arrived. A writing grade takes a few seconds; a
speaking call ~15 s; a full long turn ~40 s.

- `status: "unavailable"` **will never resolve** — every outstanding row needs a
  scorer this deployment has not got. Stop and say so. `scorers` says which.
  Without this the app would poll the full schedule and then offer a retry that
  cannot possibly succeed, leaving the candidate believing their answer failed
  when it was never gradeable.
- `aiScored: false` -> skip polling entirely.
- **This is a report, not a trigger.** Scoring was already queued by the submit.

### 8.4 `POST /api/v1/attempts/{attemptId}/score` — `LIVE`

Re-queue anything still unscored. A **separate verb precisely so that polling can
never spend AI budget.** `after()` is bounded by the route's max duration, so a
large batch can be cut off part-way; both scorers are idempotent and skip rows
that already carry a band, which is what makes the retry safe.

Nothing pending is a **success** (`{ "requeued": false, "pending": 0 }`), not a
conflict — an error would send the app into a retry loop over an attempt that is
already fully marked.

---

## 9. Mock tests

### 9.1 `GET /api/v1/mock` — `LIVE`

`?module=academic|general` -> `getMockCatalogue()`

```jsonc
{ "module": "academic",
  "tests": [ { "id": "uuid", "slug": "cambridge-19-test-2-academic",
               "title": "Cambridge 19 · Test 2", "description": null,
               "module": "academic", "book": "Cambridge 19", "testNumber": 2,
               "totalMinutes": 175, "totalQuestions": 82, "totalParts": 12,
               "parts": [ { "section": "listening", "count": 4, "minutes": 40 },
                          { "section": "reading", "count": 3, "minutes": 60 },
                          { "section": "writing", "count": 2, "minutes": 60 },
                          { "section": "speaking", "count": 3, "minutes": 15 } ],
               "inProgressSessionId": "uuid" | null,
               "attempts": 2, "bestBand": "6.5",
               "lastSessionId": "uuid" | null } ] }
```

**The paper is chosen, not assembled.** Nothing samples a content pool: two
candidates comparing notes on "Cambridge 19 · Test 2" are comparing the same
paper, so a band means the same thing across sittings.

`inProgressSessionId` is what turns the card's button into "Resume".

### 9.2 `POST /api/v1/mock` — `LIVE`

`{ "mockTestId": "uuid" }`

**201 = started · 200 = resumed.** Not decoration: a candidate who already has
this paper open gets their existing sitting back rather than a second one, and
the app needs to know which happened so it can say "resuming where you left off"
instead of dropping them into what looks like a fresh paper with answers already
in it.

`{ "sessionId": "uuid", "resumed": true }`

`plan_required` (mocks are paid), `conflict` (paper has no modules set up),
`not_found`.

### 9.3 `GET /api/v1/mock/sessions/{sessionId}` — `LIVE`

**The clock is the server's.**

```jsonc
{ "sessionId": "uuid", "mockTestId": "uuid",
  "title": "Cambridge 19 · Test 2", "module": "academic",
  "modules": [ { "section": "listening", "index": 0, "parts": 4,
                 "questions": 40, "minutes": 40 }, … ],
  "current": { "section": "listening", "index": 0, "minutes": 40,
               "parts": [ /* ClientMockPart[] */ ] },
  "remainingSeconds": 1737,
  "lapsedIndexes": [],
  "draftAnswers": { "<sectionId>:7": { "text": "library" } },
  "draftTimings": { "<sectionId>:7": 34 } }
```

- **Only the current module's content is loaded.** Shipping all twelve would put
  three reading passages and both writing prompts on the wire while the candidate
  is still on Listening — the exam equivalent of handing out every booklet at
  once.
- **`lapsedIndexes` names the modules whose bell went while the candidate was
  away** — backgrounded app, dead signal, a phone that slept. They are closed,
  not resumable, which is exactly what happens in the hall. Deliberately *not*
  "every module before the current one", which would leave the warning on screen
  for the rest of the paper.
- `conflict` when the paper is already handed in — the resource is real and the
  app should route to the result screen, not to an error.
- Loading a sitting whose clock has run out **auto-submits it** and returns
  `conflict`. An unattended paper is still collected at the end of the exam.

`ClientMockPart` is the same shape section practice renders, so the mock and
section practice go through one widget tree and cannot drift apart:

```jsonc
{ "id": "uuid", "sectionId": "uuid", "sectionType": "listening",
  "partNumber": 1, "moduleIndex": 0, "title": "…", "instructions": "…",
  "audioUrl": "/api/practice/audio/<sectionId>" | null,
  "passageText": null, "imageUrl": null,
  "startNumber": 1, "endNumber": 10, "totalQuestions": 10,
  "questions": { "groups": [ /* sheet-numbered, key stripped */ ] } }
```

### 9.4 `PUT /api/v1/mock/sessions/{sessionId}/progress` — `LIVE`

```jsonc
{ "answers": { "<sectionId>:7": { … } }, "timings": { "<sectionId>:7": 34 } }
-> { "sessionId": "uuid", "savedAt": "2026-09-18T10:42:11.004Z" }
```

**A draft, not a submission.** It cannot advance a module, hand the paper in, or
touch a sitting that is finished or somebody else's.

**PUT, not PATCH:** this *replaces* the draft with the client's current picture
of the module. Merging would make a deleted answer impossible to express.

Autosave every **~15 s**, after each answer change, and on
`AppLifecycleState.paused`. A browser tab is comparatively stable; a phone gets
backgrounded, loses signal in a lift, and is killed by the OS under memory
pressure. This endpoint is the difference between resuming a paper and losing an
hour of it. Idempotent, so a retry after a dropped connection is free.

`savedAt` is the **server's** time. Show that, never a locally stamped one — a
save time that disagrees with the countdown beside it is worse than none.

### 9.5 `POST /api/v1/mock/sessions/{sessionId}/advance` — `LIVE`

```jsonc
{ "fromIndex": 0, "answers": { … }, "timings": { … } }
```

**`fromIndex` is a claim, not an instruction.** It is the module the app believes
it is in, and the server checks it against its own clock. If the bell has already
gone, **the roll-over is the advance** and the module the clock is actually in
comes back instead. Without that check, a request landing milliseconds after a
deadline would advance from the module *after* the one being left, skipping a
whole hour of the paper.

```jsonc
{ "done": false, "current": { /* MockModuleView */ },
  "remainingSeconds": 3600, "lapsedIndexes": [] }
{ "done": true }
```

**Render what comes back. Never assume `fromIndex + 1`.**

`done: true` means that was the last module and the paper is submitted; objective
sections are already marked and the app moves to the result screen and polls
§9.7.

Finishing early **rebases** the rest of the plan to start now: the wait is given
back, the time is not. A candidate who finishes Reading twelve minutes early goes
straight into Writing, whose hour is still an hour, and the paper ends twelve
minutes sooner.

### 9.6 `POST /api/v1/mock/sessions/{sessionId}/finish` — `LIVE`

`{ "answers": { … }, "timings": { … } }` -> `{ "sessionId", "submitted": true }`

The early exit. `advance` on the final module does the same thing, so both land
in `submitSitting` and there is one place a paper is marked.

**Idempotent**, which matters on a phone: the write is scoped to a sitting still
`in_progress` and the result insert is `onConflictDoNothing`, so a retry after a
dropped connection cannot double-mark a paper or overwrite a finished one with a
stale draft.

### 9.7 `GET /api/v1/mock/sessions/{sessionId}/result` — `LIVE`

```jsonc
{ "sessionId": "uuid", "mockTestId": "uuid",
  "title": "Cambridge 19 · Test 2", "module": "academic",
  "completedAt": "…",
  "overallBand": "6.5",
  "bands": [ { "section": "listening", "band": "7.0", "raw": 30, "total": 40 },
             { "section": "reading",   "band": "6.0", "raw": 23, "total": 40 },
             { "section": "writing",   "band": null,  "raw": null, "total": null },
             { "section": "speaking",  "band": null,  "raw": null, "total": null } ],
  "pending": 2,
  "retryAfterSec": 5 }
```

`pending` travels **with** the bands so one request answers both "what did I get"
and "is anything still being marked". The distinction the app must draw:

| `band` | `pending` | Means |
| --- | --- | --- |
| `null` | `> 0` | still being marked — show a spinner |
| `null` | `0` | **could not be marked at all** — say so, offer retry |

That is exactly why the count is here rather than inferred from the nulls.

`overallBand` at submit is the mean of the **objective** bands only, rounded to
the nearest half; it is recomputed as the AI bands land.

### 9.8 `DELETE /api/v1/mock/sessions/{sessionId}` — `LIVE`

`{ "sessionId": "uuid", "abandoned": true }`

Scoped to the caller **and** to `in_progress`. `abandoned: false` means there was
nothing to abandon — reported, not thrown, because an app that asks twice has the
outcome it wanted both times.

### 9.9 `GET /api/v1/mock/sessions/{sessionId}/review?section=` — `NEW`

-> `getMockSectionReview()` — the per-module drill-down of a finished paper.

The answer key is read **from the content, not frozen into the answer row**: the
paper is a fixed definition, so the key that marked it is still there.
Unanswered items are **included**, so a review shows what was left blank rather
than quietly omitting it.

```jsonc
{ "section": "reading",
  "parts": [ { "sectionId": "uuid", "partNumber": 1, "title": "…",
               "instructions": "…", "questionType": "matching_headings",
               "passageText": "…", "audioUrl": null, "imageUrl": null,
               "layout": { /* gap-shifted to sheet numbers */ },
               "startNumber": 1,
               "items": [ { "key": "<sectionId>:3", "number": 3,
                            "prompt": "…", "content": { … },
                            "correctAnswer": { "key": "vi" },
                            "explanation": "…", "response": { "key": "iv" },
                            "isCorrect": false, "marks": 1, "earned": 0,
                            "band": null, "aiFeedback": null,
                            "timeSpentSec": 41,
                            "audioUrl": null, "transcript": null } ] } ] }
```

### 9.10 `GET /api/v1/mock/results` — `NEW`

-> `getMockResults()` — past completed sittings, newest first, for the Results
tab.

```jsonc
{ "results": [ { "sessionId": "uuid", "title": "Cambridge 19 · Test 2",
                 "module": "academic", "overallBand": "6.5",
                 "completedAt": "…" } ] }
```

### 9.11 The exam clock

`src/lib/mock-timing.ts`. **A frozen timeline, not a countdown.**

A sitting is planned once, as absolute instants per module, and every later
question is answered by asking that plan where `now` falls. Nothing pauses it:
closing the app, losing the connection or walking away spends exam time exactly
as it does in a real hall.

```
MOCK_MODULE_MINUTES = { listening: 40, reading: 60, writing: 60, speaking: 15 }
```

Deliberately **not** the officially quoted figures (`SECTIONS[x].durationMin`).
Listening is quoted as 30 because that is the recording's length; the paper-based
test then gives 10 minutes to transfer answers, so the module is 40. Speaking is
quoted as "11–14 minutes", so a fixed clock takes the top of the range plus a
margin.

Each module also carries one line of hall guidance (`MOCK_MODULE_NOTE`), shown
before it starts.

**What this means for the app:** start a paper, background it 5 minutes into
Listening, come back 50 minutes later, and you are 10 minutes into Reading with
Listening gone. The app renders that; it does not try to be kind about it.

---

## 10. AI evaluation

### 10.1 What is AI-scored

Only `section IN ('writing', 'speaking')`. Everything else is keyed and graded at
submit. `isAiScored(section)`.

### 10.2 The flow

1. Answers submitted -> row written with `band: null`, `scheduleAttemptScoring`
   queued.
2. Response returns immediately with `subjective > 0`.
3. App polls §8.3 (practice) or §9.7 (mock) on the documented schedule.
4. Bands and `aiFeedback` appear on the rows.
5. A cron sweeper (`/api/cron/scoring`) catches anything a bounded `after()` run
   could not finish.

**The app never scores anything and never re-implements a rubric.** It consumes
the authoritative backend result, which is what brief §15 asks for.

### 10.3 `aiFeedback`

An opaque `jsonb` criteria breakdown produced by the scorer
(`src/lib/writing/openai.ts`, `src/lib/speech/ielts-speaking.ts`). The Dart model
parses it **defensively** — a criterion the app does not recognise is rendered
generically rather than dropped, so a scorer change does not need an app release
to stop losing feedback. Shape in practice: per-criterion band plus comment
(Task Achievement / Response, Coherence & Cohesion, Lexical Resource, Grammatical
Range & Accuracy for Writing; Fluency & Coherence, Lexical Resource, Grammatical
Range & Accuracy, Pronunciation for Speaking), plus free-text suggestions.

### 10.4 Writing word caps

`writingWordCap(taskType, wordLimitMin)` = `max(min * 2, 300)` — 300 words for a
150-word Task 1, 500 for a 250-word Task 2. **The editor stops accepting input at
the same number**, so nobody is silently marked on half of what they wrote. A
candidate who pastes three thousand words is graded on the first 500 and the rest
is cut.

`countWords` is runs of non-whitespace — ported exactly, because the count the
editor shows must be the count the grader uses.

---

## 11. Billing

### 11.1 `GET /api/v1/billing/plans` — `LIVE`

```jsonc
{ "platform": "ios",
  "plans": [ { "plan": "pro", "label": "Pro",
               "entitlements": { /* EntitlementsDto */ },
               "productId": "com.ieltsvega.pro.monthly" | null,
               "purchasable": true,
               "listPrice": { "INR": { "priceCents": 129900,
                                       "listPriceCents": 199900 },
                              "USD": { "priceCents": 1500,
                                       "listPriceCents": 2300 } },
               "billingMonths": 1 } ],
  "currentPlan": "free",
  "alreadySubscribed": false }
```

**The price here is not the price the candidate pays.** On iOS and Android the
store owns pricing: products sit on fixed tiers that differ by storefront, and
the figure on the paywall must come from `ProductDetails` / `SKProduct`.
`listPrice` is a **fallback only**, for a store lookup that fails.

- Gate buttons on **`purchasable`** — a tier with no product id configured for
  this platform cannot be bought there, and a button that cannot complete is
  worse than no button.
- **Hide purchase entirely when `alreadySubscribed`.** A plan bought on the
  website counts. Charging twice for the same tier through a second provider is a
  refund request and, on iOS, a review rejection.

### 11.2 `POST /api/v1/billing/iap/verify` — `LIVE`

```jsonc
{ "store": "apple",  "transactionId": "…" }
{ "store": "google", "purchaseToken": "…" }
```

**Nothing about the purchase is taken from the app.** It supplies an opaque
handle; the server asks the store what that handle is actually worth — which
tier, which window, is it still live. A client that could name its own tier could
buy the cheapest product and claim Premium.

```jsonc
{ "plan": "premium", "entitledUntil": "2026-12-18T…",
  "renewed": false,
  "user": { /* refreshed UserDto */ },
  "entitlements": { /* EntitlementsDto */ } }
```

The user is **re-read** so the response carries the entitlement the *next*
request will see, not the stale copy this one authenticated with.

**Purchase sequence — the order is not negotiable:**

1. `GET /billing/plans` -> product ids for this platform
2. `ProductDetails` from the store -> **show the store's price**
3. complete the purchase with `in_app_purchase`
4. `POST /billing/iap/verify`
5. **only then** `completePurchase()` / acknowledge with the store

An unacknowledged Play purchase is **auto-refunded after three days**, so
acknowledging before our side has recorded anything is how a candidate ends up
charged with no plan — or refunded with one.

**Restore purchases** calls the same endpoint; it is idempotent. Renewals arrive
on their own via `/api/webhooks/apple` and `/api/webhooks/google`.

**Errors:**
- `conflict` "already linked to a different IELTSVega account" — **one store
  subscription belongs to one account, permanently.** The first account to verify
  a receipt owns it. Without that, one payment would buy unlimited Premium
  accounts. Show the message; do not retry.
- `conflict` "already on a newer subscription" — not an error the candidate
  caused, and their entitlement is intact. Say so rather than alarming them.
- `service_unavailable` (`retryAfterSec: 10`) — ours or the store's to fix. The
  app should retry rather than tell the candidate their payment failed. It did
  not.
- `validation_failed` — the purchase could not be verified.

---

## 12. Rate limits

| Guard | Scope | Applies to |
| --- | --- | --- |
| `guardGeneral(userId)` | per user | library, sets, history, mock start/finish, submits |
| `guardMedia(userId)` | per user | every media route |
| `rateLimit("login:google:ip:…", 30, 900)` | per IP | Google sign-in |
| `rateLimit("pwreset:ip:…", 5, 3600)` | per IP | forgot password |
| `tryConsumeAi(userId)` | per user | AI scoring budget |
| lockout ladder | per account + IP | password sign-in |

All surface as `rate_limited` with `retryAfterSec` **and** a real `Retry-After`
header. The Dio retry interceptor honours the header; the UI draws a countdown
from the body field.

---

## 13. Endpoint index

| # | Method | Path | Status | Auth |
| --- | --- | --- | --- | --- |
| 1 | POST | `/api/v1/auth/signup` | LIVE | none |
| 2 | POST | `/api/v1/auth/login` | LIVE | none |
| 3 | POST | `/api/v1/auth/google` | LIVE | none |
| 4 | GET | `/api/v1/auth/session` | LIVE | Bearer |
| 5 | POST | `/api/v1/auth/logout` | LIVE | optional |
| 6 | POST | `/api/v1/auth/forgot-password` | **NEW** | none |
| 7 | POST | `/api/v1/auth/reset-password` | **NEW** | none |
| 8 | GET | `/api/v1/me` | LIVE | Bearer |
| 9 | PATCH | `/api/v1/me` | LIVE | Bearer |
| 10 | POST | `/api/v1/me/password` | LIVE | Bearer |
| 11 | GET | `/api/v1/dashboard` | LIVE | candidate |
| 12 | GET | `/api/v1/history` | LIVE | Bearer |
| 13 | GET | `/api/v1/attempts/{id}` | LIVE | Bearer |
| 14 | GET | `/api/v1/attempts/{id}/score` | LIVE | Bearer |
| 15 | POST | `/api/v1/attempts/{id}/score` | LIVE | Bearer |
| 16 | GET | `/api/v1/practice/library` | LIVE | Bearer |
| 17 | GET | `/api/v1/practice/sets` | LIVE | Bearer |
| 18 | POST | `/api/v1/practice/submit` | LIVE | candidate |
| 19 | POST | `/api/v1/practice/recording` | LIVE | candidate |
| 20 | GET | `/api/v1/practice/attempted-sets` | **NEW** | Bearer |
| 21 | GET | `/api/v1/practice/sections/{id}` | **NEW** | Bearer |
| 22 | POST | `/api/v1/practice/sections/{id}/submit` | **NEW** | candidate |
| 23 | GET | `/api/v1/mock` | LIVE | candidate |
| 24 | POST | `/api/v1/mock` | LIVE | candidate |
| 25 | GET | `/api/v1/mock/sessions/{id}` | LIVE | candidate |
| 26 | DELETE | `/api/v1/mock/sessions/{id}` | LIVE | candidate |
| 27 | PUT | `/api/v1/mock/sessions/{id}/progress` | LIVE | candidate |
| 28 | POST | `/api/v1/mock/sessions/{id}/advance` | LIVE | candidate |
| 29 | POST | `/api/v1/mock/sessions/{id}/finish` | LIVE | candidate |
| 30 | GET | `/api/v1/mock/sessions/{id}/result` | LIVE | candidate |
| 31 | GET | `/api/v1/mock/sessions/{id}/review` | **NEW** | candidate |
| 32 | GET | `/api/v1/mock/results` | **NEW** | candidate |
| 33 | GET | `/api/v1/billing/plans` | LIVE | Bearer |
| 34 | POST | `/api/v1/billing/iap/verify` | LIVE | candidate |
| 35 | GET | `/api/v1/openapi` | LIVE | none |
| M1 | GET | `/api/practice/audio/{sectionId}` | LIVE | Bearer/cookie |
| M2 | GET | `/api/practice/image/{sectionId}` | LIVE | Bearer/cookie |
| M3 | GET | `/api/practice/prompt/{sectionId}/{n}` | LIVE | Bearer/cookie |
| M4 | GET | `/api/practice/recording/{answerRowId}` | LIVE | Bearer/cookie |
| M5 | GET | `/api/media/{setId}` | LIVE | Bearer/cookie |
| M6 | GET | `/api/media/{setId}/image` | LIVE | Bearer/cookie |
| M7 | GET | `/api/media/question/{questionId}/image` | LIVE | Bearer/cookie |
| M8 | GET | `/api/media/prompt/{questionId}` | LIVE | Bearer/cookie |
