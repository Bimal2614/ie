# Feature Audit

Every user-facing IELTSVega feature, audited from the source. One section per
feature area, each recording purpose, website location, flow, APIs, business
rules, validation, errors, auth, plan requirements, mobile requirements and
implementation status.

Audience: whoever builds or reviews the Flutter app. Status is updated as phases
land; `mobile_gap_analysis.md` §E is the roll-up.

Legend — **Status:** `—` not started · `WIP` · `DONE`.

---

## 1. Authentication

### 1.1 Sign up

**Purpose** Create a candidate account and land inside the app.
**Website** `/signup` · `src/app/(auth)/signup/page.tsx`
**Screens (app)** `SignUpScreen` -> `DashboardScreen`
**Flow** name, email, phone, password, target module -> submit -> signed in.
**API** `POST /api/v1/auth/signup` (201)
**Validation** `signupSchema`: name 2–80; email RFC, lowercased, ≤254; phone
libphonenumber-validated via `isValidStoredPhone`; password 6–128;
`targetModule ∈ {academic, general}`.
**Business rules**
- 201 with the session, not a bounce back to a login form — a candidate who has
  just typed their details should be inside the app.
- The response bundles `user` + `entitlements`, so the first screen draws from
  it with no extra request.
- Phone is one combined string (`+91-9904529857`); the app's country picker and
  national-number field join client-side, exactly as `PhoneField` does on the
  web. **The app does not reimplement the validity rule** — it renders
  `error.fields.phone`.
**Errors** `validation_failed` (per-field), `conflict` (email taken),
`rate_limited`.
**Auth** none · **Plan** none
**Mobile** Country picker defaulting from device locale; inline per-field errors;
password visibility toggle; `TextInputAction.next` chain; Crashlytics must never
receive the password.
**Status** —

### 1.2 Sign in

**Website** `/login` · **API** `POST /api/v1/auth/login`
**Business rules** Throttling, the lockout ladder and the constant-time
anti-enumeration path all live in `authenticate()` and are shared with the
website. A wrong password and an unknown email are deliberately
indistinguishable. **The app adds no client-side attempt counter** — it would be
a second, wrong copy of the ladder.
**Errors** `unauthenticated`, `rate_limited` (honour `retryAfterSec`), `conflict`
(deactivated).
**Mobile** Remember email (not password); biometric unlock gates re-entry to a
token already in the keychain, it is not a second credential.
**Status** —

### 1.3 Google sign-in

**Website** `/api/auth/google` redirect + callback
**App** native `google_sign_in` -> `POST /api/v1/auth/google` with the **`idToken`**
(not the access token).
**Business rules** Once verified, account handling is byte-for-byte the website's
— literally the same `linkOrCreateGoogleAccount`. A Google account arrives with
**no phone number** (the scope is sensitive and not requested), so the app must
prompt; see 1.6.
**Errors** `service_unavailable` (client ids unset — say "try another way", not
"your Google account failed"), `conflict` (unverified Google email),
`unauthenticated`, `rate_limited` (30/IP/15 min).
**Mobile** Needs `GOOGLE_IOS_CLIENT_ID` / `GOOGLE_ANDROID_CLIENT_ID`; Sign in
with Apple is **required by App Store §4.8** wherever a third-party social login
is offered — tracked in `release_checklist.md`.
**Status** —

### 1.4 Session lifecycle

**API** `GET /api/v1/auth/session` on cold start **and on every resume**.
**Business rules**
- Tokens are the same opaque, revocable, SHA-256-hashed-at-rest session tokens
  the website puts in a cookie: same table, same expiries, same revocation. Only
  the transport differs.
- Returned **once**; only the hash is kept. Store in the platform keychain
  (`flutter_secure_storage`), **never** shared preferences.
- Sliding 7-day idle expiry, plus a hard `absoluteExpiresAt`. `session` slides
  the window without minting a new token, so there is nothing to re-store.
- **`X-Client-Platform` on every request.** Sessions are single-occupancy *per
  client*; without the header the app's session counts as a web one and evicts
  the candidate's browser session, and vice versa, forever.
- A 401 anywhere clears the keychain and routes to sign-in.
**Mobile** One Dio interceptor attaches the token and the platform header; one
place turns a 401 into a sign-out.
**Status** —

### 1.5 Forgot / reset password

**Website** `/forgot-password`, `/reset-password?token=`
**API** `POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password`
— **both NEW** (`mobile_gap_analysis.md` A5/A6).
**Business rules**
- Forgot **always** returns ok, whether or not the account exists. That uniform
  answer is the anti-enumeration property; it must not be "improved".
- 5 requests per IP per hour.
- A reset **revokes every session on every device**. A password *change* (3.3)
  does not. The reset proves control of the mailbox and is the path an attacker
  would use; the change is already authenticated by a live session plus the old
  password, and revoking there would mostly punish the owner.
- The app must clear its keychain after a successful reset.
**Mobile** The emailed link is a universal/app link into `ResetPasswordScreen`.
**Status** —

### 1.6 Phone prompt for Google accounts

**Website** app-shell prompt using `phoneSchema`
**API** `PATCH /api/v1/me`
**Business rule** Fill-only on the web action: it will not overwrite an existing
number, so a stale tab or crafted POST cannot clobber one set in Settings.
**Mobile** Blocking sheet on the shell when `user.phone == null`.
**Status** —

### 1.7 Email verification

**Website** `/verify-email?token=` (GET link handler; no candidate-initiated
resend exists on the website either).
**Mobile** Universal link -> Custom Tab -> `GET /api/v1/auth/session` to pick up
`emailVerified: true`. `mobile_gap_analysis.md` C3.
**Status** —

### 1.8 Sign out

**API** `POST /api/v1/auth/logout` — **always 200**, even with a missing or
already-revoked token. Only this session dies; the browser keeps its own.
**Mobile** Clear keychain, clear Hive caches for that user id, reset Riverpod
container, route to sign-in. Do these **regardless of the response**.
**Status** —

---

## 2. Dashboard

**Purpose** "What have I done, how am I doing, what next."
**Website** `/dashboard` · **API** `GET /api/v1/dashboard` (one request, not five)
**Auth** candidate only — an admin or partner is refused rather than shown a
convincing screen of zeroes.

**Cards**

| Card | Source | Rule |
| --- | --- | --- |
| Exam countdown | `user.examDate` | hidden when null |
| Today | `todayAttempted/Graded/Correct/Accuracy` | |
| Streak | `currentStreak`, `longestStreak` | computed in SQL (gaps-and-islands) over distinct UTC days |
| Section breakdown | `sectionStats` | **accuracy for L/R, `avgBand` for W/S** — never accuracy for a subjective section |
| Coverage | `practisedSets / availableSets` | counted in **sets**, the unit the library is browsed in |
| Recent mocks | `recentMocks` | a `null` band means still marking or unmarkable |
| Recent activity | `recentActivity` | **one entry per attempt**, not per question |
| Continue | `continueLast` | deep-links to the player |
| Focus | `focus` | sent as **data, not a sentence**, so wording changes need no app release |
| Usage | `usage` | "18 of 50 answers left this month" |

**Business rules** `graded`/`right` span both marking styles: objective rows
carry `isCorrect`, band-scored rows count as right at `PASS_BAND` (6.0).
`focus.needsMorePractice` is true until a type has `MIN_GRADED_FOR_WEAK` (5)
graded responses — one unlucky set should not outrank a type practised fifty
times.
**Mobile** Pull-to-refresh; shimmer skeletons; cached last-good payload per user
id for instant paint, then revalidate.
**Status** —

---

## 3. Profile and settings

**Website** `/settings` · **API** `GET`/`PATCH /api/v1/me`,
`POST /api/v1/me/password`

### 3.1 Profile
`name`, `phone`, `country`, `targetModule`, `targetBand`, `examDate`.
`examDate` is `yyyy-mm-dd`; **empty string clears it**. `targetBand` is one of
the eleven `TARGET_BANDS` values. The response **re-reads** the user so a
subscription a webhook applied a second earlier is not clobbered.

### 3.2 Target module
Changing it re-filters the practice library and the mock catalogue immediately —
both resolve the module server-side from the profile.

### 3.3 Password change
Current password required. **Sessions survive**, here and on other clients.
`conflict` (not `validation_failed`) for a Google-only account with no password.

### 3.4 Subscription panel
`plan`, `planLabel`, `planExpiresAt`, usage. Manage/cancel deep-links to the
**store's** subscription settings, as both stores require; the app cannot cancel
on the user's behalf.

### 3.5 App-only settings
Theme (light/dark/system — both palettes exist in `globals.css`), notification
preferences, downloaded-audio cache size + clear, legal links
(`/privacy`, `/terms`, `/refunds` — required in-app by both stores),
sign out, delete account (support route; no self-serve deletion exists).
**Status** —

---

## 4. Practice — question-type path

**Purpose** Drill one task type across the library.
**Website** `/practice` -> `/practice/[section]` -> `/practice/[section]/[type]`,
plus `/practice/set/[id]`
**API** `GET /api/v1/practice/sets`, `POST /api/v1/practice/submit`,
`GET /api/v1/practice/attempted-sets` (NEW)

**Flow** pick section -> pick type -> paginated player, one **set** per page ->
answer -> submit -> inline result -> next set.

**Business rules**
- A page is one set: a passage and every question on it. `hasNextSet` rather
  than a page count, because that is the unit worked through.
- `page` is clamped to `1..10000`.
- `SECTION_TYPES` decides which types a section offers; a type can appear in
  two sections (`multiple_choice_single` is in both Listening and Reading).
- **Instruction trimming.** `practiceInstruction()` strips the leading rubric
  that only restates a control already on screen ("Choose the correct letter, A,
  B or C" above radio buttons). What survives is the part that is real
  information and appears nowhere else — "Write ONE WORD ONLY for each answer" —
  which **varies per group inside one paper**, so it cannot be replaced by a
  rule the UI knows. A candidate who never sees it is marked wrong for something
  the paper told them and the app did not. Governed by
  `PRACTICE_INSTRUCTIONS_HIDDEN`; **the mock keeps everything**, deliberately.
- `showsInstruction()` hides the line entirely for `speaking_part1` and
  `speaking_part3`.
- `hasSideStimulus()` decides two-column vs one: Reading (passage) and Writing
  Task 1 (chart) get a side stimulus; Task 2, Listening and Speaking do not.
**Plan** `checkPracticeAccess` — section must be in `practiceSections`, and the
monthly answer allowance must not be spent. A submit that **starts** under the
limit is allowed to finish over it: a set is indivisible work, and refusing it
halfway would throw away answers already written.
**Mobile** Side-by-side becomes tabs or a draggable split on a phone; two
columns on a tablet. Answer state survives rotation and backgrounding.
**Status** —

---

## 5. Practice — section path (the primary content path)

**Purpose** Sit one real exam part from a real book.
**Website** `/section-practice` -> `/section-practice/[id]`
**API** `GET /api/v1/practice/library` (3 steps), `GET /api/v1/practice/sections/{id}`
(NEW), `POST /api/v1/practice/sections/{id}/submit` (NEW)

**Flow** source -> book + test -> part -> player -> submit -> result -> review.

**Business rules**
- One row = one exam part, carrying its single shared stimulus as columns and
  its questions as one `jsonb` document of **groups**. A Cambridge part is
  typically 2–3 groups off one stimulus — C21 Test 1 Listening Part 1 is a table
  completion for 1–6 and a note completion for 7–10 off one 7-minute recording.
  **The player must render multiple groups against one stimulus.**
- Module filter is `module IN (theirs, 'both')`, not equality: Listening and
  Speaking are the same paper in both modules and stored once as `"both"`.
  Equality would hide three quarters of the library.
- Answers are keyed by **exam number**.
- `transcript` is never sent to the player — it is the answers in prose.
- The answer key is stripped by `toClientSection`, which rebuilds each item field
  by field so a future answer-bearing field fails to compile rather than shipping
  the mark scheme.
**Plan** gated on the **part's own skill**, however the candidate reached it.
**Mobile** The 3-step drill-down is a single screen with breadcrumbs. The
player is the **same widget tree the mock uses** — that is what keeps them from
drifting.
**Status** —

---

## 6. Question types (23) and layouts (7)

All 23 `QUESTION_TYPES` must render. Grouped by `InputFamily`, which is what
decides how an answer is collected and graded.

| Family | Types | Widget | Answer |
| --- | --- | --- | --- |
| `single` | `multiple_choice_single` | radio list | `{index}` |
| `multi` | `multiple_choice_multiple` | checkbox list capped at `selectCount` | `{indices}` |
| `tfng` | `true_false_notgiven` | 3-way segmented | `{value}` |
| `ynng` | `yes_no_notgiven` | 3-way segmented | `{value}` |
| `matching` | `matching_information`, `matching_headings`, `matching_features`, `matching_sentence_endings` | option bank + per-prompt picker | `{key}` |
| `completion` | `sentence_completion`, `summary_completion`, `note_completion`, `table_completion`, `flowchart_completion`, `form_completion`, `short_answer` | inline gap field (or picker when `choices` present) | `{text}` / `{key}` |
| `labelling` | `diagram_label_completion`, `plan_map_diagram_labelling` | pinned image, tap a pin | `{text}` / `{key}` |
| `writing` | `writing_task1_academic`, `writing_task1_general`, `writing_task2` | editor + live word count + cap | `{text, words}` |
| `speaking` | `speaking_part1`, `speaking_part2`, `speaking_part3` | recorder | `{recorded, durationSec, audioUrl, pendingUpload}` |

Layouts and their traps are specified in `api_inventory.md` §6.2 — `choices`
turning typing into picking, `wordBank` being a printed box rather than a picker,
`example` being a given answer, table `colSpan`/`rowSpan` meaning a short row is
correct, diagram pins being percentages.

**Presentation** `speaking_part1` and `speaking_part3` are `"sequential"`: one
question at a time, because they are a live interview and seeing all seven at
once lets a candidate rehearse, which the real test never allows. Everything
else is `"stacked"`.

**Status** —

---

## 7. Writing

**Types** `writing_task1_academic` (chart, 150+), `writing_task1_general`
(letter, 150+), `writing_task2` (essay, 250+).
**Business rules**
- Word count is `countWords` — runs of non-whitespace. **The count the editor
  shows must be the count the grader uses**, so it is the same function.
- The editor **stops accepting input** at `writingWordCap()` = `max(min*2, 300)`.
  Nobody is silently marked on half of what they wrote.
- Task 1 shows its chart beside the editor (`hasSideStimulus`); Task 2 is one
  column.
- Submit returns `band: null`; poll for it.
- Drafts autosave locally per set/part id, and to `PUT …/progress` inside a mock.
**Plan** Writing requires a plan with `aiScoring` (Pro or above). A free-tier
candidate is told **before** writing, not after — handing out an unscored essay
is worse than withholding the task.
**Mobile** Keyboard-aware scroll; word count pinned above the keyboard; no
autocorrect-induced silent edits after submit; cap enforced by a
`TextInputFormatter`, with a clear "graded to N words" note.
**Status** —

---

## 8. Speaking

**Parts** 1 (interview, sequential, 45 s), 2 (cue card: 60 s prep + 120 s speak),
3 (discussion, sequential, 60 s).
**Business rules**
- Parts 1 and 3 are an interview: on test day the question is **heard, never
  read**, so the player plays `promptAudioUrl` with the text hidden. Part 2
  carries the topic line only — its cue card stays on screen throughout, exactly
  as the printed card does.
- Record **16 kHz mono 16-bit PCM WAV**. Anything else is refused.
- Upload immediately on stop; the interview moves on while it runs.
- The answer is marked `pendingUpload` until `audioUrl` arrives, and
  **submit is gated on `anyUploadPending()`**. This is not hypothetical: a
  seven-question Part 1 lost its last answer exactly this way, because the final
  question is the one you submit immediately after speaking, with no further
  question to cover the upload.
- `service_unavailable` on upload means the queue was full — **retry the same
  bytes**, do not report a bad recording.
- 4 MB / 125 s ceiling.
**Permissions** `NSMicrophoneUsageDescription`, `RECORD_AUDIO`. A denied
permission shows an explanatory sheet with a settings deep link, not a crash.
**Plan** requires `aiScoring`; checked **before the body is read**, so a
free-tier candidate is not made to upload megabytes first.
**Mobile** Live waveform + timer; auto-stop at `speakSeconds`; playback before
moving on; upload progress + retry; audio session configured so recording ducks
other audio and survives a phone call interruption.
**Status** —

---

## 9. Plans, gating and paywall

**Current matrix** (`src/lib/plans.ts`) — **reference only; the app reads this
off the wire as `EntitlementsDto`**:

| | Free | Pro | Premium |
| --- | --- | --- | --- |
| Practice answers / month | 50 | unlimited | unlimited |
| Sections | Reading, Listening | all four | all four |
| AI scoring | ✗ | ✓ | ✓ |
| Mock sittings / month | 0 | unlimited | unlimited |
| Priority scoring | ✗ | ✗ | ✓ |
| Advanced reports | ✗ | ✗ | ✓ |
| Term | — | 1 month | 3 months |
| Price | — | ₹1,299 / $15 | ₹2,499 / $30 |

Free is Reading and Listening because those are keyed and graded locally and
cost nothing to serve; Writing and Speaking are the AI-scored ones, and handing
them out unscored would be worse than withholding them.

**Gates** `checkPracticeAccess`, `checkAiScoring`, `checkMockAccess`,
`checkAdvancedReports` — each returns a `PlanBlock`, never throws, so the reason
survives to the screen.
**Quota** answers per **calendar month**, UTC, reset on the 1st.
**Mobile** The paywall is built from `error.plan` + `GET /billing/plans` + store
`ProductDetails`. `upgradeHref` is a web path and is mapped to the in-app route,
never opened in a browser.
**Status** —

---

## 10. Subscriptions

**Website** Razorpay Checkout · **App** Apple IAP / Google Play Billing
(`mobile_gap_analysis.md` B1, D1).
**API** `GET /api/v1/billing/plans`, `POST /api/v1/billing/iap/verify`

**Sequence** plans -> store `ProductDetails` (**show the store's price**) ->
purchase -> verify -> **only then** acknowledge. An unacknowledged Play purchase
is auto-refunded after three days.

**Rules**
- Gate buttons on `purchasable`; hide purchase entirely when `alreadySubscribed`
  — a plan bought on the website counts, and charging twice is a refund request
  and an iOS rejection.
- Verify is **idempotent**; "Restore purchases" calls the same endpoint.
- **One store subscription belongs to one account, permanently.** The first
  account to verify a receipt owns it; a second is refused with `conflict`.
  Without it, one payment would buy unlimited Premium accounts.
- Renewals arrive via the store webhooks, not the app.
- `listPrice` is a **fallback only** — store price tiers vary by storefront.
**Mobile** Restore button (required by both stores); pending/deferred purchases
handled; a purchase that completes while the app is backgrounded is verified on
next launch from the purchase stream.
**Status** —

---

## 11. Mock tests

**Website** `/mock-tests`, `/mock-test/[id]`, `/results`, `/results/[id]`
**API** §9 of `api_inventory.md`.

**Structure** one paper = 12 parts: Listening 1–4, Reading 1–3, Writing 1–2,
Speaking 1–3. The definition points at the same `practice_sections` rows the
library uses, so a content fix reaches practice and the mock together.

**Rules the app must reproduce exactly**

| Rule | Consequence |
| --- | --- |
| The paper is **chosen, not assembled** | two candidates comparing "Cambridge 19 · Test 2" compare the same paper |
| The clock is a **frozen timeline**, server-side | background it 5 min into Listening, return 50 min later -> 10 min into Reading, Listening gone |
| `MOCK_MODULE_MINUTES` = 40/60/60/15 | **not** the quoted 30/60/60/14 — Listening includes 10 min transfer time, Speaking takes the top of its range plus margin |
| Only the **current module** is loaded | never ship all twelve parts |
| `fromIndex` is a **claim** | render what `advance` returns; never assume `+1` |
| Early finish **rebases** | the wait is given back, the time is not |
| `lapsedIndexes` | say what the bell cost, only for modules actually missed |
| 201 vs 200 on start | "resuming where you left off" vs a fresh paper |
| Autosave is a **draft** | PUT replaces, so a deleted answer is expressible |
| Finish is **idempotent** | a retry cannot double-mark |
| Expiry auto-submits on next load | an unattended paper is still collected |

**Mobile** Countdown anchored to `remainingSeconds` at receipt, ticked with a
monotonic `Stopwatch` — never `DateTime.now()`. Autosave every 15 s, on every
answer change, and on `paused`. `WillPopScope`/`PopScope` guard against leaving
mid-module. Screen wake-lock during a module. `MOCK_MODULE_NOTE` shown on the
between-modules card.
**Plan** mocks are paid (`checkMockAccess`).
**Status** —

---

## 12. Results and review

**Website** `/results`, `/results/[id]` + per-module drill-down; `/history`,
`/history/[id]`
**API** `GET /api/v1/mock/results` (NEW), `/mock/sessions/{id}/result`,
`/mock/sessions/{id}/review` (NEW), `/history`, `/attempts/{id}`,
`/attempts/{id}/score`

**Rules**
- **`band: null` + `pending > 0`** = still marking. **`band: null` +
  `pending == 0`** = could not be marked. **Say different things.**
- `status: "unavailable"` never resolves — stop polling, offer the retry only
  when `scorers` says a scorer exists.
- Review includes **unanswered** items, so a candidate sees what they left blank.
- Review carries the stimulus — reviewing a reading answer without the passage
  is not reviewing anything.
- A speaking review carries the candidate's own recording **and the transcript**;
  the transcript is what explains a band they will not recognise.
- The mock answer key is read from the content, not frozen into the answer row.
**Mobile** Band cards with the section accent; criteria breakdown from
`aiFeedback` parsed defensively — an unrecognised criterion renders generically
rather than being dropped; share sheet instead of print.
**Status** —

---

## 13. History

**Website** calendar day view · **App** flat reverse-chronological list, which is
what `GET /api/v1/history` deliberately returns, with the day view built
client-side on top.
**Rules** one row per **attempt** ("9 / 13"); `tzOffsetMinutes` is
`getTimezoneOffset()` so **India is −330**, bounded to ±840 so it cannot be used
to mine another day's rows.
**Status** —

---

## 14. Media

See `api_inventory.md` §7. The four rules the app lives by: send the bearer
token; never `Accept: text/html`; recordings are owner-scoped; do not persist
audio (`no-store` is deliberate — the recordings *are* the product).
**Status** —

---

## 15. Notifications

FCM registration, permission (iOS opt-in, Android 13+ `POST_NOTIFICATIONS`), tap
routing, deep links. **No backend send path exists yet** — no `device_tokens`
table, no sender (`mobile_gap_analysis.md` D5). Local notifications cover
practice and mock reminders in the meantime, so the feature is useful on day one
and needs no client change when a sender lands.
**Status** —

---

## 16. Excluded

| Area | Reason |
| --- | --- |
| Admin panel | brief §21 |
| Partner panel, `/verify-students` | institution-facing; `requireApiCandidate` refuses those accounts by design |
| Marketing / SEO pages | exist to be indexed; `mobile_gap_analysis.md` §C |
| Razorpay checkout | store policy |
| **Coaching** | **does not exist on this platform.** No tutor/session/schedule/meeting table, route or action; the homepage says "an online practice platform, not a coaching course". `partners` is an institution *billing* relationship. `mobile_gap_analysis.md` D4 |
