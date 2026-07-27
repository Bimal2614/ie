import type { Metadata } from "next";
import { Flame, CalendarClock, ListChecks, Target, Zap } from "lucide-react";
import { SECTION_ORDER } from "@/lib/ielts";
import { requireUser } from "@/lib/dal";
import { getDashboardStats } from "@/app/actions/dashboard";
import { recommendFocus } from "@/lib/dashboard";
import { StatTile } from "@/components/dashboard/ui";
import { FocusNext } from "@/components/dashboard/focus-next";
import { SectionPerformance } from "@/components/dashboard/section-performance";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { MockResults } from "@/components/dashboard/mock-results";

export const metadata: Metadata = { title: "Dashboard · IELTSAce", robots: { index: false } };

export default async function DashboardPage() {
  const user = await requireUser();
  const stats = await getDashboardStats();
  const firstName = user.name.split(" ")[0];
  const focus = recommendFocus(stats);

  const examDate = user.examDate ? new Date(user.examDate) : null;
  const daysUntilExam = examDate
    ? Math.max(0, Math.ceil((examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-muted">Dashboard</p>
          <h1 className="mt-1.5 font-semibold text-4xl tracking-tight text-ink">Welcome back, {firstName}.</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {stats.currentStreak > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-elev px-3 py-1.5 text-sm text-ink-soft">
              <Flame className="size-4 text-ink-muted" /> {stats.currentStreak}-day streak
            </span>
          )}
          {daysUntilExam !== null && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-elev px-3 py-1.5 text-sm text-ink-soft">
              <CalendarClock className="size-4 text-ink-muted" /> Exam in{" "}
              <span className="font-semibold text-ink">{daysUntilExam}d</span>
            </span>
          )}
        </div>
      </header>

      {/* What you've done — questions and consistency, the metrics that move a band. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Questions today" value={stats.todayAttempted} sub={`${stats.todayCorrect} correct`} icon={<Zap className="size-4 text-ink-muted" />} />
        <StatTile label="Total completed" value={stats.totalAttempted} sub={`${stats.totalCorrect} correct`} icon={<ListChecks className="size-4 text-ink-muted" />} />
        <StatTile label="Overall accuracy" value={`${stats.totalAccuracy}%`} sub="all-time" icon={<Target className="size-4 text-ink-muted" />} />
        <StatTile label="Day streak" value={stats.currentStreak} sub={`best ${stats.longestStreak}`} icon={<Flame className="size-4 text-ink-muted" />} />
      </div>

      {/* What to do next */}
      <FocusNext focus={focus} />

      {/* Practise by section */}
      <SectionPerformance sectionStats={stats.sectionStats} />

      {/* Recent activity + mock results */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentActivity items={stats.recentActivity} />
        <MockResults mocks={stats.recentMocks} />
      </div>

      {/* Mono spec strip — a quiet auth-style close. */}
      <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] uppercase tracking-wider text-ink-muted">
        <span>{stats.totalCorrect} correct</span>
        <span className="text-line">/</span>
        <span>{SECTION_ORDER.length} skills</span>
        <span className="text-line">/</span>
        <span className="capitalize">{user.targetModule} training</span>
      </div>
    </div>
  );
}
