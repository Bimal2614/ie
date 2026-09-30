# Scoring Rules

Every rule that turns an answer into a mark and a mark into a band, traced to
its implementation. **The mobile app implements none of this** — it renders what
the server computed. It is documented because the app must *display* the results
correctly, and because a change here is a `mobile_sync_rules.md` entry.

Sources: `src/lib/grading.ts`, `src/lib/ielts.ts`,
`src/app/actions/practice.ts`, `src/app/actions/section-practice.ts`,
`src/app/actions/mock.ts`, `src/lib/scoring/**`.

---

## 1. The two marking styles

| | Listening / Reading | Writing / Speaking |
| --- | --- | --- |
| Marked by | stored answer key | AI examiner |
| Column | `is_correct`, `raw_score` | `band`, `ai_feedback` |
| Timing | synchronously, at submit | asynchronously, after the response |
| Show | accuracy, "9 / 13" | band + criteria; **never accuracy** |

`isObjectiveSection(section)` and `isAiScored(section)` are the switches.
Anything reporting a score per section must branch on them: Writing and Speaking
never set `is_correct`, so showing accuracy for them reads as a permanent 0%.

---

## 2. Objective marking

### 2.1 Normalisation

```
norm(s) = String(s).trim().toLowerCase().replace(/\s+/g, " ")
```

IELTS marks case- and whitespace-insensitively. That is the whole of it — no
stemming, no fuzzy matching, no spelling correction.

### 2.2 Per family (`grade`)

| Family | Rule |
| --- | --- |
| `single` | `ans.index === ca.index` |
| `multi` | sorted `indices` arrays equal |
| `tfng` / `ynng` | `norm(ans.value) === norm(ca.value)` |
| `matching` | `String(ans.key) === String(ca.key)` — **case-sensitive**, because option keys are authored letters/romans |
| `completion` / `labelling` | `ca.any` contains a `norm`-equal entry; the given value is `ans.text ?? ans.key` |

**`any` is how spelling variants are data rather than a grader special case.**
IELTS marks `"four"` and `"4"` alike, and `"car park"` and `"carpark"` alike;
both live in the item's `any` list.

`labelling` reads `ans.key` as well as `ans.text` because a lettered labelling
task is answered by picking, not typing.

### 2.3 Marks, not right/wrong (`gradeMarks`)

"Questions 21 and 22 — choose TWO letters" is **one input worth two marks**, and
on the real answer sheet each letter is marked on its own.

```
multi:  given = unique(ans.indices); want = set(ca.indices)
        if want is empty            -> 0
        if given.length > want.size -> 0      // over-selection is invalid, not partial
        else                        -> min(count(given ∈ want), marks)
other:  grade() ? marks : 0
```

Two consequences the UI must honour:

- **`earned` and `isCorrect` are different questions.** One right letter of two
  earns 1 of 2 while `isCorrect` is `false`. Rendering a tick/cross loses the
  mark; render `earned / marks`.
- **Over-selection scores zero.** Choosing three letters when two were asked for
  is not partially correct, it is invalid — otherwise selecting every option
  would collect both marks.

### 2.4 What counts in the denominator

- **Every objective question in the set, answered or not.** Leaving a gap blank
  scores zero on test day, so `total` is the paper's, not "however many the
  candidate got round to".
- **Only answered items are persisted.** A row per untouched gap would count it
  as practised and drag the dashboard's accuracy down for questions nobody
  tried. `attempted` is reported separately so the UI can say "8 of 10
  answered".

---

## 3. Raw -> band conversion

`rawToBand(section, correct, module)`. Each row is `[minimum correct, band]`,
read top-down, first row cleared wins.

**Listening** (/40)

| ≥ | 39 | 37 | 35 | 32 | 30 | 26 | 23 | 18 | 16 | 13 | 10 | 6 | 4 | 3 | 2 | 1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| band | 9 | 8.5 | 8 | 7.5 | 7 | 6.5 | 6 | 5.5 | 5 | 4.5 | 4 | 3.5 | 3 | 2.5 | 2 | 1 |

**Academic Reading** (/40)

| ≥ | 39 | 37 | 35 | 33 | 30 | 27 | 23 | 19 | 15 | 13 | 10 | 8 | 6 | 4 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| band | 9 | 8.5 | 8 | 7.5 | 7 | 6.5 | 6 | 5.5 | 5 | 4.5 | 4 | 3.5 | 3 | 2.5 |

**General Training Reading** (/40)

| ≥ | 40 | 39 | 37 | 36 | 34 | 32 | 30 | 27 | 23 | 19 | 15 | 12 | 9 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| band | 9 | 8.5 | 8 | 7.5 | 7 | 6.5 | 6 | 5.5 | 5 | 4.5 | 4 | 3.5 | 3 |

General Training Reading needs **more** correct answers for the same band,
because the texts are easier. That is why it has its own table, and why
`module` is a parameter.

These are the widely-published Cambridge averages. The real paper is equated per
version, so the app's wording must present them as a close guide, not a promise.

**Where they apply:** a full mock only. `accuracyToBand()` exists for internal
ranking of a short practice set against a Writing band, and is explicitly
documented "do not show this to learners" — a band derived from a six-gap
practice set is a far weaker claim than a real one. **Practice screens show
accuracy; only mock results show a band.**

---

## 4. Overall band

```
overallBand([l, r, w, s]) = round(mean * 2) / 2
```

IELTS averages the four skills then reports to the nearest half band, with
**.25 and .75 rounding up** (6.25 -> 6.5, 6.75 -> 7). Doubling, rounding
half-up, and halving reproduces that exactly, including both round-up cases.

**At mock submit, only the objective bands exist.** `submitSitting` averages
whichever of Listening/Reading are present and stores that; Writing and Speaking
are `null` until the AI scorers land, and the overall is recomputed then. The
result screen must show an overall marked provisional while `pending > 0`.

---

## 5. AI band scoring

Queued by `scheduleAttemptScoring` (practice) / `scheduleMockScoring` (mock),
executed by `src/lib/scoring/score-attempt.ts` and `score-mock.ts`, with
`/api/cron/scoring` as the sweeper for batches a bounded `after()` could not
finish.

Guarded by **plan** (`checkAiScoring`) and **budget** (`tryConsumeAi`). Both are
re-checked at scoring time, not just at submit, because a subscription can lapse
in between. Every scorer is **idempotent** and skips rows that already carry a
band — which is what makes the retry path safe, and why polling and re-queuing
are different verbs.

`priorityScoring` (Premium) jumps the queue.

### Writing word cap

```
writingWordCap(taskType, wordLimitMin) = max((wordLimitMin ?? typeDefault) * 2, 300)
```

300 words for a 150-word Task 1, 500 for a 250-word Task 2. The AI examiner is
billed per word, and a real response never needs more. **The editor stops
accepting input at the same number**, so nobody is silently marked on half of
what they wrote. The floor of 300 means a section saved with a mistyped minimum
cannot quietly halve how anyone is marked.

`countWords` is `trim().split(/\s+/).length`, empty string -> 0. The count the
editor shows must be the count the grader uses; both come from this function.

---

## 6. `PASS_BAND`

`PASS_BAND = 6` — the usual minimum entry requirement, and the floor at which a
band-scored response counts as "right" in dashboard aggregates. It makes
"attempted vs right/wrong" meaningful across all four skills.

**Deliberately never written into `is_correct`.** That column records whether an
answer was factually right, and a threshold judgement would destroy the band's
resolution — 5.5 and 2.0 are not the same answer.

Distinct from `users.target_band`: clearing 6 makes a response correct; falling
short of the *target* is what "needs work" means on the focus card.

---

## 7. Mock paper arithmetic

- **Tally is in marks, not rows.** A paired MCQ is one input but two of the
  paper's 40 marks; counting rows reports a full Listening paper as 38.
- **Answers are keyed `"<practiceSectionId>:<sheetNumber>"`**; the answer key
  inside a part is keyed by the part's own numbering. `numberOffset` is applied
  once, where the two are matched.
- **Only attempted items are written.** A row per untouched gap would put 80
  blank answers in every report and count them as answered — but the tally still
  counts their marks in the denominator.
- **`submitSitting` is idempotent**: the update is scoped to `in_progress` and
  the result insert is `onConflictDoNothing`, so an expiry auto-submit and a
  candidate pressing Finish at the same moment cannot both write a report.

---

## 8. What the app must never do

1. Send a band, a score, or a verdict to the server. `POST /practice/submit`
   carries answers only; a response that accepted a score would let any
   candidate award themselves a 9.
2. Compute a band from accuracy for display. Practice shows accuracy.
3. Mark an answer locally, even to render instant feedback. Feedback comes from
   the submit response.
4. Show accuracy for Writing or Speaking.
5. Treat `band: null` as a failure without checking `pending` and `status` —
   `null` with `pending > 0` means "still marking", `null` with `pending == 0`
   means "could not be marked", and `status: "unavailable"` means it never will
   be.
6. Round or reformat a band. Bands arrive as `numeric(2,1)` strings — `"6.5"` —
   and are displayed as sent. Parsing to a double and reformatting is how
   `"7.0"` becomes `"7"`.
