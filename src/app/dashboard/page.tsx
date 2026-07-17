import type { Metadata } from "next";
import Link from "next/link";
import {
  Headphones, BookOpen, PenLine, Mic, Trophy, ArrowRight, Flame,
  Target, CalendarClock, TrendingUp, BarChart3, CheckCircle,
  Clock, Zap, Activity,
} from "lucide-react";
import { requireUser } from "@/lib/dal";
import { getDashboardStats } from "@/app/actions/dashboard";
import { SECTIONS, QUESTION_TYPES, type SectionKey, type QuestionTypeKey } from "@/lib/ielts";
import { LocalTime } from "@/components/history/local-time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard · IELTSAce",
  robots: { index: false },
};

const SECTION_CARDS = [
  { key: "listening" as SectionKey, icon: Headphones },
  { key: "reading" as SectionKey, icon: BookOpen },
  { key: "writing" as SectionKey, icon: PenLine },
  { key: "speaking" as SectionKey, icon: Mic },
] as const;

/**
 * Section colour comes from the design tokens, never a raw Tailwind palette.
 * These stay as literal maps because Tailwind only sees class names it can read
 * in the source — `bg-section-${accent}` built at runtime is invisible to it.
 */
const SECTION_TILE: Record<SectionKey, string> = {
  listening: "chip-listening",
  reading: "chip-reading",
  writing: "chip-writing",
  speaking: "chip-speaking",
};

const SECTION_BAR: Record<SectionKey, string> = {
  listening: "bg-section-listening",
  reading: "bg-section-reading",
  writing: "bg-section-writing",
  speaking: "bg-section-speaking",
};

const SECTION_RING: Record<SectionKey, string> = {
  listening: "hover:ring-section-listening/40",
  reading: "hover:ring-section-reading/40",
  writing: "hover:ring-section-writing/40",
  speaking: "hover:ring-section-speaking/40",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const stats = await getDashboardStats();
  const firstName = user.name.split(" ")[0];

  const examDate = user.examDate ? new Date(user.examDate) : null;
  const daysUntilExam = examDate
    ? Math.max(0, Math.ceil((examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="space-y-8">
      {/* ── Hero greeting ── */}
      <div className="surface overflow-hidden p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="display flex items-center gap-2 text-2xl">
              Hi {firstName}
              {stats.currentStreak > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-sm font-bold text-accent-hover">
                  <Flame className="h-4 w-4" />
                  {stats.currentStreak} day{stats.currentStreak !== 1 ? "s" : ""}
                </span>
              )}
            </h1>
            <p className="text-sm text-ink-muted mt-1">Here&apos;s your IELTS prep at a glance.</p>
          </div>
          {daysUntilExam !== null && (
            <div className="flex items-center gap-2 rounded-xl bg-paper-sunken px-4 py-2.5">
              <CalendarClock className="h-5 w-5 text-brand" />
              <div>
                <p className="text-xs text-ink-muted">Exam in</p>
                <p className="display text-lg">{daysUntilExam} days</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Today's stats ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={<Zap className="h-4 w-4 text-accent" />}
          label="Today's questions"
          value={stats.todayAttempted}
          sub={`${stats.todayCorrect} correct`}
        />
        <StatTile
          icon={<Target className="h-4 w-4 text-brand" />}
          label="Today's accuracy"
          value={`${stats.todayAccuracy}%`}
          sub={stats.todayAttempted > 0 ? `${stats.todayCorrect}/${stats.todayAttempted}` : "—"}
        />
        <StatTile
          icon={<Clock className="h-4 w-4 text-section-listening" />}
          label="Time today"
          value={`${stats.todayTimeMin}m`}
          sub="minutes studied"
        />
        <StatTile
          icon={<Flame className="h-4 w-4 text-accent-hover" />}
          label="Streak"
          value={stats.currentStreak}
          sub={`Best: ${stats.longestStreak} day${stats.longestStreak !== 1 ? "s" : ""}`}
        />
      </div>

      {/* ── Overall progress ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={<BarChart3 className="h-4 w-4 text-success" />}
          label="Total questions"
          value={stats.totalAttempted}
          sub={`${stats.totalCorrect} correct`}
        />
        <StatTile
          icon={<TrendingUp className="h-4 w-4 text-brand" />}
          label="Overall accuracy"
          value={`${stats.totalAccuracy}%`}
          sub="all-time"
        />
        <div className="stat-tile">
          <span className="stat-label">Target band</span>
          <span className="stat-value">{user.targetBand ?? "—"}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Module</span>
          <span className="stat-value capitalize">{user.targetModule}</span>
        </div>
      </div>

      {/* ── Section performance ── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
            Section performance
          </h2>
          <Link href="/practice" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
            All practice <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SECTION_CARDS.map(({ key, icon: Icon }) => {
            const sec = SECTIONS[key];
            const s = stats.sectionStats[key];
            return (
              <Link
                key={key}
                href={`/practice/${key}`}
                className={cn(
                  "surface group p-5 ring-2 ring-transparent transition-all hover:shadow-md",
                  SECTION_RING[key],
                )}
              >
                <div className="mb-3 flex items-center gap-3">
                  {/* Section colour lives in the icon tile — not a left rail. */}
                  <div className={cn("grid size-10 place-items-center rounded-lg", SECTION_TILE[key])}>
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-ink">{sec.label}</p>
                    <p className="text-xs text-ink-muted">{s.attempted} attempted</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-muted">Accuracy</span>
                    <span className="font-semibold text-ink">{s.accuracy}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-paper-sunken">
                    <div
                      className={cn("h-2 rounded-full transition-all", SECTION_BAR[key])}
                      style={{ width: `${s.accuracy}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-ink-muted">
                    {s.correct}/{s.attempted} correct
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Question type breakdown ── */}
      {stats.typeStats.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-muted">
            Question type breakdown
          </h2>
          <div className="surface overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-paper-sunken text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Section</th>
                  <th className="px-4 py-3 text-right">Attempted</th>
                  <th className="px-4 py-3 text-right">Correct</th>
                  <th className="px-4 py-3 text-right">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {stats.typeStats.map((t) => {
                  const meta = QUESTION_TYPES[t.questionType as QuestionTypeKey];
                  const secInfo = SECTIONS[t.section as SectionKey];
                  return (
                    <tr key={`${t.section}-${t.questionType}`} className="border-b border-line last:border-0 hover:bg-paper-sunken/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-ink">{meta?.label ?? t.questionType}</td>
                      <td className="px-4 py-3 text-ink-muted">{secInfo?.label ?? t.section}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-ink-muted">{t.attempted}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-success">{t.correct}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold",
                          t.accuracy >= 80 ? "bg-success-soft text-success" :
                          t.accuracy >= 50 ? "bg-warning-soft text-warning" :
                          "bg-danger-soft text-danger",
                        )}>
                          {t.accuracy}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Recent activity ── */}
      {stats.recentActivity.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-muted">
            Recent activity
          </h2>
          <div className="surface divide-y divide-line">
            {stats.recentActivity.map((a) => {
              const meta = QUESTION_TYPES[a.questionType as QuestionTypeKey];
              const secInfo = SECTIONS[a.section as SectionKey];
              const scored = a.graded > 0;
              const allRight = scored && a.correct === a.graded;
              return (
                <Link
                  key={a.attemptId}
                  href={`/history/${a.attemptId}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-paper-sunken"
                >
                  <div
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-full",
                      !scored
                        ? "bg-info-soft text-info"
                        : allRight
                          ? "bg-success-soft text-success"
                          : "bg-danger-soft text-danger",
                    )}
                  >
                    {!scored ? (
                      <Clock className="h-4 w-4" />
                    ) : allRight ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Activity className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {meta?.label ?? a.questionType}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {secInfo?.label ?? a.section}
                      {a.setTitle && ` · ${a.setTitle}`}
                      {` · ${a.questions} question${a.questions !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {scored ? (
                      <span
                        className={cn(
                          "font-mono text-xs font-semibold tabular-nums",
                          allRight ? "text-success" : "text-danger",
                        )}
                      >
                        {a.correct}/{a.graded}
                      </span>
                    ) : a.avgBand !== null ? (
                      <span className="font-mono text-xs font-semibold text-info">
                        Band {a.avgBand.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-muted">Pending</span>
                    )}
                    <p className="text-[10px] text-ink-muted">
                      <LocalTime
                        value={a.createdAt.toISOString()}
                        options={{ hour: "2-digit", minute: "2-digit" }}
                      />
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Recent mock tests ── */}
      {stats.recentMocks.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-muted">
            Mock test results
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {stats.recentMocks.map((m) => (
              <div key={m.id} className="surface p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="chip capitalize">{m.module}</span>
                  {m.completedAt && (
                    <span className="text-xs text-ink-muted">
                      {new Date(m.completedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-2 text-center">
                  <BandCell label="L" value={m.listeningBand} />
                  <BandCell label="R" value={m.readingBand} />
                  <BandCell label="W" value={m.writingBand} />
                  <BandCell label="S" value={m.speakingBand} />
                  <BandCell label="OA" value={m.overallBand} highlight />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Mock test CTA ── */}
      <section className="surface flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand">
            <Trophy className="size-5" />
          </span>
          <div>
            <p className="font-semibold text-ink">Take a full mock test</p>
            <p className="text-sm text-ink-muted">All four sections, real timing, scaled band report.</p>
          </div>
        </div>
        <Link
          href="/mock-tests"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-brand-hover"
        >
          <Target className="h-4 w-4" /> Start mock test
        </Link>
      </section>
    </div>
  );
}

/* ── Helper components ── */

function StatTile({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub: string }) {
  return (
    <div className="stat-tile">
      <span className="stat-label flex items-center gap-1.5">{icon} {label}</span>
      <span className="stat-value">{value}</span>
      <span className="text-xs text-ink-muted">{sub}</span>
    </div>
  );
}

function BandCell({ label, value, highlight }: { label: string; value: string | null; highlight?: boolean }) {
  return (
    <div className={cn("rounded-lg py-2", highlight ? "bg-brand-soft" : "bg-paper-sunken")}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className={cn("text-lg font-bold", highlight ? "text-brand" : "text-ink", !value && "text-ink-muted")}>
        {value ?? "—"}
      </p>
    </div>
  );
}
