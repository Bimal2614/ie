import { ArrowRight, Check, Quote } from "lucide-react";
import type {
  StoredSpeakingFeedback,
  StoredSpeakingUnscorable,
} from "@/lib/scoring/speaking-feedback";

/**
 * The AI examiner's report for one spoken answer.
 *
 * A band on its own is not feedback — "pronunciation 6" gives a candidate
 * nothing to practise. The scorer returns, per criterion, the official band
 * descriptor clause the answer matched, evidenced strengths and issues quoting
 * the candidate's own words with a correction and a drill for each, and exactly
 * what blocks the next half-band. All of it is shown, because that is the whole
 * reason to run an AI examiner rather than a stopwatch.
 *
 * Two shapes reach this file. `SpeakingAnalysis` renders answers scored by the
 * current service; `LegacySpeakingAnalysis` renders the flat criteria + stats
 * that SpeechSuper wrote before the switch, so a candidate's history does not
 * go blank at the changeover. Nothing new is ever written in the legacy shape.
 */

/* ---------------------------------------------------------------- current -- */

/** Plain-English rendering of the codes for an answer that couldn't be graded. */
const ERROR_NOTES: Record<string, string> = {
  TEMPLATE_DETECTED:
    "This answer sounded like a memorised template rather than a response to the question. Examiners mark templates down heavily. Answer in your own words, even if it is less polished.",
  MEMORISED_ANSWER:
    "This sounded like a pre-learned answer. In the real test a memorised response is penalised, so practise responding to the question you are actually asked.",
  OFF_TOPIC:
    "This answer did not address the question that was asked. Read the question again and make sure your first sentence responds to it directly.",
  TOO_SHORT:
    "This answer was too short to assess properly. Aim to extend each answer with a reason and an example.",
  NOT_ENGLISH: "Parts of this answer were not in English, so it could not be assessed as IELTS speech.",
  UNINTELLIGIBLE:
    "Too much of this recording could not be made out. Check your microphone and the background noise, then record it again.",
};

/**
 * The caveat banner for an answer the scorer flagged.
 *
 * Reads BOTH places a flag can appear. The service lifts a criterion's error to
 * the top-level `errors` array "for a UI banner", but a criterion can also carry
 * one that was never lifted — and reading only the array meant an answer marked
 * off-topic or memorised on one criterion showed a confident band with no
 * explanation at all. They are merged and de-duplicated by code here.
 */
export function SpeakingErrorNotes({ fb }: { fb: StoredSpeakingFeedback }) {
  const seen = new Set<string>();
  const flags: { key: string; code: string; detail: string | null; quote: string | null }[] = [];

  for (const e of fb.errors) {
    if (seen.has(e.code)) continue;
    seen.add(e.code);
    flags.push({ key: `top-${e.code}`, code: e.code, detail: e.detail, quote: e.quote });
  }
  for (const c of fb.criteria) {
    if (!c.error || seen.has(c.error)) continue;
    seen.add(c.error);
    flags.push({
      key: `${c.id}-${c.error}`,
      code: c.error,
      detail: c.errorDetail ?? null,
      quote: c.errorQuote ?? null,
    });
  }

  // A non-Latin script in the transcript is measured rather than judged, so it
  // can be true without NOT_ENGLISH having been raised. Worth its own line: the
  // candidate needs to know an answer partly in another language cannot score.
  const notEnglish = fb.isEnglish === false && !seen.has("NOT_ENGLISH");

  if (flags.length === 0 && !notEnglish) return null;

  return (
    <div className="mt-3 space-y-2">
      {flags.map((f) => (
        <div key={f.key} className="rounded-lg bg-warning-soft px-3 py-2">
          <p className="text-xs text-warning">{ERROR_NOTES[f.code] ?? f.detail ?? f.code}</p>
          {f.quote && <p className="mt-1 text-xs italic text-warning/80">“{f.quote}”</p>}
        </div>
      ))}
      {notEnglish && (
        <div className="rounded-lg bg-warning-soft px-3 py-2">
          <p className="text-xs text-warning">{ERROR_NOTES.NOT_ENGLISH}</p>
        </div>
      )}
    </div>
  );
}

/**
 * An answer that can never be scored — the scorer heard no speech in it.
 *
 * Shown INSTEAD of a band. Without this the row simply has no band, which reads
 * as "still scoring" and leaves the candidate waiting on a result that is not
 * coming.
 */
export function SpeakingUnscorableNote({ fb }: { fb: StoredSpeakingUnscorable }) {
  return (
    <p className="mt-3 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
      {fb.unscorable.reason === "no_speech"
        ? "We couldn't hear any speech in this recording, so it couldn't be scored. Check that the right microphone is selected, then record the answer again."
        : "This recording couldn't be read, so it couldn't be scored. Please record the answer again."}
    </p>
  );
}

export function SpeakingAnalysis({ fb }: { fb: StoredSpeakingFeedback }) {
  return (
    <div className="mt-3 rounded-xl border border-line bg-paper-elev p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          AI examiner analysis
        </p>
        {fb.overall.bandLabel && (
          <p className="text-xs text-ink-muted">
            Band {fb.overall.band.toFixed(1)}: {fb.overall.bandLabel}
          </p>
        )}
      </div>

      {fb.overall.summary && (
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">{fb.overall.summary}</p>
      )}

      {/* Only worth saying when it is true — a normal answer grades all four. */}
      {fb.overall.isPartial && (
        <p className="mt-2 text-xs text-ink-muted">
          Some criteria could not be graded from this answer, so the overall band is based on fewer
          than four.
        </p>
      )}

      {/* Relevance and topic development are judged against the question, so a
          band produced without one is weaker than it looks. Say so. */}
      {!fb.promptKnown && (
        <p className="mt-2 text-xs text-ink-muted">
          The question wasn&apos;t available to the scorer, so relevance to the topic isn&apos;t
          reflected in this band.
        </p>
      )}

      <Delivery d={fb.delivery} />

      <div className="mt-4 space-y-3">
        {fb.criteria.map((c) => (
          <CriterionCard key={c.id} c={c} />
        ))}
      </div>

      {fb.actionPlan.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            What to practise first
          </p>
          <ol className="mt-2 space-y-2">
            {fb.actionPlan.map((a) => (
              <li key={`${a.priority}-${a.criterionId}`} className="rounded-lg bg-paper-sunken p-3">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-xs tabular-nums text-ink-muted">
                    {a.priority}.
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-ink">{a.action}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {a.criterionName}
                      {a.reason ? `${a.reason}` : ""}
                    </p>
                    {a.drill && (
                      <p className="mt-1 text-xs italic text-ink-soft">Try: “{a.drill}”</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Which models produced this. Small, but it is what turns "the AI said 6"
          into something a support request can actually be traced from. */}
      {fb.meta.requestId && (
        <p className="mt-4 font-mono text-[10px] text-ink-muted">
          {fb.meta.judgeModel}
          {fb.meta.transcriptionModel ? ` · ${fb.meta.transcriptionModel}` : ""} · ref{" "}
          {fb.meta.requestId}
        </p>
      )}
    </div>
  );
}

const SEVERITY_STYLE: Record<string, string> = {
  high: "bg-danger-soft text-danger",
  medium: "bg-warning-soft text-warning",
  low: "bg-paper-sunken text-ink-muted",
};

function CriterionCard({ c }: { c: StoredSpeakingFeedback["criteria"][number] }) {
  const graded = c.status === "graded" && c.band !== null;

  return (
    <div className="rounded-lg border border-line p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">{c.name}</p>
        <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-sm font-semibold tabular-nums text-brand">
          {graded ? c.band!.toFixed(1) : ""}
        </span>
      </div>

      {/* NOT `statusReason` verbatim. That field carries the service's own
          operator diagnostics — a real one reads "Pronunciation needs decodable
          audio; install ffmpeg for non-WAV uploads", which tells a test-taker
          nothing and leaks someone else's deployment problem onto their report.
          The raw text stays in ai_feedback for us to debug from. */}
      {!graded && (
        <p className="mt-1.5 text-xs text-ink-muted">
          This criterion couldn&apos;t be assessed from this recording, so it
          isn&apos;t included in the overall band.
        </p>
      )}
      {c.summary && <p className="mt-1.5 text-sm text-ink-soft">{c.summary}</p>}

      {/* The official wording this answer matched — what justifies the band, and
          the difference between a number and an examiner's reasoning. */}
      {c.descriptorMatched && (
        <p className="mt-2 border-l-2 border-line pl-2 text-xs italic text-ink-muted">
          {c.descriptorMatched}
        </p>
      )}

      {/* Pronunciation is estimated from delivery on the prosody engine rather
          than measured sound by sound. Presenting an estimate as a measurement
          would be the one dishonest thing in this whole report. */}
      {c.measuredAtPhonemeLevel === false && (
        <p className="mt-2 text-xs text-ink-muted">
          Estimated from intonation, stress and rhythm rather than measured sound by sound.
        </p>
      )}

      {c.strengths.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {c.strengths.map((s) => (
            <li key={s.id} className="flex gap-1.5 text-xs text-ink-soft">
              <Check className="mt-0.5 size-3 shrink-0 text-green" />
              <span>
                {s.point}
                {s.evidence.quote && (
                  <span className="mt-0.5 block italic text-ink-muted">
                    “{s.evidence.quote}”
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {c.issues.length > 0 && (
        <ul className="mt-2 space-y-2">
          {c.issues.map((issue) => (
            <li key={issue.id} className="rounded-lg bg-paper-sunken p-2.5">
              <div className="flex flex-wrap items-baseline gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${
                    SEVERITY_STYLE[issue.severity] ?? SEVERITY_STYLE.low
                  }`}
                >
                  {issue.severity}
                </span>
                <p className="text-xs font-semibold text-ink">{issue.label}</p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">{issue.explanation}</p>

              {issue.evidence.quote && (
                <p className="mt-1.5 flex gap-1.5 text-xs">
                  <Quote className="mt-0.5 size-3 shrink-0 text-ink-muted" />
                  <span className={issue.correction ? "text-danger" : "text-ink-muted"}>
                    {issue.evidence.quote}
                  </span>
                </p>
              )}
              {issue.correction && (
                <p className="mt-1 flex gap-1.5 text-xs text-ink">
                  <ArrowRight className="mt-0.5 size-3 shrink-0 text-green" />
                  {issue.correction}
                </p>
              )}
              {issue.improvement.advice && (
                <p className="mt-1.5 text-xs text-ink-muted">
                  {issue.improvement.advice}
                  {issue.improvement.example && (
                    <span className="mt-0.5 block italic text-ink-soft">
                      e.g. “{issue.improvement.example}”
                    </span>
                  )}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {(c.nextBand.blockers.length > 0 || c.nextBand.actions.length > 0) && (
        <div className="mt-2.5 border-t border-line pt-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            {c.nextBand.target !== null
              ? `To reach band ${c.nextBand.target.toFixed(1)}`
              : "To reach the next band"}
          </p>
          {c.nextBand.blockers.length > 0 && (
            <ul className="mt-1 space-y-1">
              {c.nextBand.blockers.map((b) => (
                <li key={b} className="text-xs text-ink-muted">
                  {b}
                </li>
              ))}
            </ul>
          )}
          {c.nextBand.actions.length > 0 && (
            <ul className="mt-1.5 space-y-1">
              {c.nextBand.actions.map((a) => (
                <li key={a} className="flex gap-1.5 text-xs text-ink-soft">
                  <ArrowRight className="mt-0.5 size-3 shrink-0 text-brand" />
                  {a}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The measured facts about how the answer was delivered.
 *
 * Measurements, not judgements — the same numbers the fluency grader was given.
 * `midClausePauseCount` is called out on its own because pausing INSIDE a clause
 * (searching for language) rather than at a boundary (normal rhythm) is the
 * clearest single divider between band 6 and band 7.
 */
function Delivery({ d }: { d: StoredSpeakingFeedback["delivery"] }) {
  const rows: { label: string; value: string }[] = [
    { label: "Words", value: `${d.wordCount} in ${d.answerSeconds.toFixed(1)}s` },
    {
      label: "Pace",
      value: `${d.wordsPerMinute} wpm · ${d.articulationRate} wpm speaking`,
    },
    {
      label: "Pauses",
      value: `${d.pauseCount} · ${d.midClausePauseCount} mid-sentence · longest ${d.longestPause.toFixed(1)}s`,
    },
    {
      label: "Speech ratio",
      value: `${Math.round(d.speechRatio * 100)}% of the recording`,
    },
    {
      label: "Fillers & repeats",
      value: `${d.fillerCount} filler${d.fillerCount === 1 ? "" : "s"} · ${d.repetitionCount} repetition${d.repetitionCount === 1 ? "" : "s"}`,
    },
  ];

  return (
    <div className="mt-3 rounded-lg border border-line bg-paper-sunken p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
        How you delivered it
      </p>
      <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-xs text-ink-muted">{r.label}</dt>
            <dd className="font-mono text-xs tabular-nums text-ink-soft">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ----------------------------------------------------------------- legacy -- */

/**
 * What SpeechSuper stored in `aiFeedback`, before the switch.
 *
 * Kept for one reason: attempts scored under the old provider are still in a
 * candidate's history, and dropping this would silently blank their feedback.
 * Nothing writes this shape any more.
 */
export type LegacySpeakingFeedback = {
  criteria?: {
    fluencyCoherence?: number;
    lexicalResource?: number;
    grammar?: number;
    pronunciation?: number;
  };
  relevance?: number | null;
  speed?: number | null;
  warning?: unknown;
  promptKnown?: boolean;
  stats?: {
    pronunciation?: { good?: number | null; fair?: number | null; poor?: number | null };
    grammar?: { accurateSentencePct?: number | null; errorCount?: number | null };
    vocabulary?: {
      words?: number | null;
      uniqueWords?: number | null;
      academicWords?: string[];
      cefr?: Record<string, number>;
    };
    fluency?: { pauses?: number | null; liaisons?: number | null; lossOfPlosion?: number | null };
    pauseFillers?: Record<string, number>;
    effectiveSpeechSec?: number | null;
    durationSec?: number | null;
    rhythm?: number | null;
    weakWords?: { word: string; score: number }[];
  };
};

/**
 * Turn the old scorer's warning into something a candidate can act on.
 *
 * A flagged take still came back with a numeric band attached, so without this a
 * silent or off-topic recording reads as a confident low score.
 */
function legacyWarningNote(warning: unknown): string | null {
  if (warning === null || warning === undefined) return null;
  const raw = typeof warning === "string" ? warning : (JSON.stringify(warning) ?? "");
  if (!raw || raw === "{}" || raw === "[]" || raw === '""') return null;
  if (raw.includes("2001")) {
    return "We could barely hear a response in this recording. Check your microphone, then record the answer again.";
  }
  if (raw.includes("2002")) {
    return "This answer may not have addressed the question that was asked.";
  }
  return "The scorer flagged this recording, so treat the band below as approximate.";
}

export function LegacySpeakingAnalysis({ fb }: { fb: LegacySpeakingFeedback }) {
  const caveat = legacyWarningNote(fb.warning);
  const criteria = fb.criteria;

  return (
    <>
      {caveat && (
        <p className="mt-3 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">{caveat}</p>
      )}
      {fb.stats && <LegacyDeliveryDetail stats={fb.stats} />}
      {criteria && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["Fluency", criteria.fluencyCoherence],
            ["Lexical", criteria.lexicalResource],
            ["Grammar", criteria.grammar],
            ["Pronunciation", criteria.pronunciation],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg bg-paper-sunken p-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-ink-muted">{label}</p>
              <p className="display text-lg tabular-nums text-ink">{String(value ?? "")}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/** The numbers behind the four bands, as the old provider measured them. */
function LegacyDeliveryDetail({ stats }: { stats: NonNullable<LegacySpeakingFeedback["stats"]> }) {
  const pron = stats.pronunciation;
  const vocab = stats.vocabulary;
  const gram = stats.grammar;
  const flu = stats.fluency;
  const weak = stats.weakWords ?? [];
  const fillers = Object.entries(stats.pauseFillers ?? {});
  const cefr = Object.entries(vocab?.cefr ?? {}).sort(([a], [b]) => a.localeCompare(b));

  const rows: { label: string; value: string }[] = [];
  if (
    pron &&
    (pron.good ?? pron.fair ?? pron.poor) !== null &&
    (pron.good ?? pron.fair ?? pron.poor) !== undefined
  ) {
    rows.push({
      label: "Words spoken clearly",
      value: `${pron.good ?? 0}% good · ${pron.fair ?? 0}% fair · ${pron.poor ?? 0}% poor`,
    });
  }
  if (gram?.accurateSentencePct !== null && gram?.accurateSentencePct !== undefined) {
    rows.push({
      label: "Grammatical sentences",
      value: `${gram.accurateSentencePct}%${gram.errorCount != null ? ` · ${gram.errorCount} error${gram.errorCount === 1 ? "" : "s"}` : ""}`,
    });
  }
  if (vocab?.words != null) {
    rows.push({
      label: "Vocabulary",
      value: `${vocab.words} words, ${vocab.uniqueWords ?? "?"} unique`,
    });
  }
  if (flu?.pauses != null) {
    rows.push({
      label: "Pauses",
      value: `${flu.pauses}${fillers.length > 0 ? ` · ${fillers.map(([k, n]) => `"${k}" ×${n}`).join(", ")}` : ""}`,
    });
  }
  if (stats.effectiveSpeechSec != null && stats.durationSec != null) {
    rows.push({
      label: "Speaking time",
      value: `${stats.effectiveSpeechSec.toFixed(1)}s of ${stats.durationSec.toFixed(1)}s`,
    });
  }

  if (rows.length === 0 && weak.length === 0 && cefr.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg border border-line bg-paper-sunken p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
        Why this band
      </p>

      {rows.length > 0 && (
        <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
          {rows.map((r) => (
            <div key={r.label} className="flex flex-wrap items-baseline justify-between gap-2">
              <dt className="text-xs text-ink-muted">{r.label}</dt>
              <dd className="font-mono text-xs tabular-nums text-ink-soft">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {cefr.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] uppercase tracking-wider text-ink-muted">
            Word difficulty (CEFR)
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {cefr
              .filter(([, pct]) => pct > 0)
              .map(([level, pct]) => (
                <span
                  key={level}
                  className="rounded bg-paper-elev px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-ink-soft"
                >
                  {level} {pct}%
                </span>
              ))}
          </div>
        </div>
      )}

      {(vocab?.academicWords ?? []).length > 0 && (
        <p className="mt-2 text-xs text-ink-soft">
          <span className="text-ink-muted">Academic words used: </span>
          {(vocab?.academicWords ?? []).join(", ")}
        </p>
      )}

      {weak.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] uppercase tracking-wider text-ink-muted">
            Practise these words
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {weak.map((w, i) => (
              <span
                key={`${w.word}-${i}`}
                className="rounded bg-danger-soft px-1.5 py-0.5 font-mono text-[10px] text-danger"
              >
                {w.word} {w.score}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
