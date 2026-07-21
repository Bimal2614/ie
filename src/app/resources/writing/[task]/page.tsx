import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, X, ListOrdered, PenLine, MessageSquareQuote, BookMarked, ExternalLink } from "lucide-react";
import { LandingNav } from "@/components/marketing/landing-nav";
import { LandingFooter } from "@/components/marketing/landing-footer";
import { WRITING_GUIDES, type WritingGuide } from "@/lib/study-writing";

type Params = { task: string };

export function generateStaticParams() {
  return [{ task: "task-1" }, { task: "task-2" }];
}

function get(task: string): WritingGuide | undefined {
  return WRITING_GUIDES[task as "task-1" | "task-2"];
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { task } = await params;
  const g = get(task);
  if (!g) return {};
  return {
    title: `IELTS ${g.title} — All Question Types, Templates & Band 9 Model Answers (2026) | IELTSAce`,
    description: `${g.tagline} Every ${g.title} question type with how to answer, a plan, structure, useful language, common mistakes and a full Band 9 sample answer.`,
    alternates: { canonical: `/resources/writing/${g.task}` },
  };
}

export default async function WritingTaskGuide({ params }: { params: Promise<Params> }) {
  const { task } = await params;
  const g = get(task);
  if (!g) notFound();

  const other = g.task === "task-1" ? "task-2" : "task-1";

  return (
    <div className="min-h-svh bg-paper text-ink">
      <LandingNav alwaysSolid />

      <main className="mx-auto w-full max-w-4xl px-5 pb-20 pt-28 sm:pt-32">
        <Link href="/resources/writing" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
          <ArrowLeft className="size-4" /> IELTS Writing
        </Link>

        {/* Header */}
        <header className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">IELTS {g.title} · 2026</p>
          <h1 className="font-serif mt-3 text-4xl tracking-tight sm:text-5xl">{g.tagline}</h1>
          <p className="mt-4 max-w-2xl text-ink-soft">{g.intro}</p>
        </header>

        {/* Format */}
        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
          {g.format.map((f) => (
            <div key={f.label} className="bg-paper-elev px-4 py-4">
              <dt className="text-xs font-medium uppercase tracking-wider text-ink-muted">{f.label}</dt>
              <dd className="mt-1 text-sm font-semibold text-ink">{f.value}</dd>
            </div>
          ))}
        </dl>

        {/* Criteria + general strategy */}
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <section className="rounded-2xl border border-line bg-paper-elev p-6">
            <h2 className="text-lg font-semibold text-ink">How it&apos;s marked</h2>
            <ul className="mt-4 space-y-3">
              {g.criteria.map((c) => (
                <li key={c.name} className="text-sm">
                  <span className="font-semibold text-ink">{c.name}.</span>{" "}
                  <span className="text-ink-soft">{c.detail}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-line bg-paper-elev p-6">
            <h2 className="text-lg font-semibold text-ink">General strategy</h2>
            <ul className="mt-4 space-y-2.5">
              {g.generalStrategy.map((s) => (
                <li key={s} className="flex gap-2.5 text-sm text-ink-soft">
                  <Check className="mt-0.5 size-4 shrink-0 text-green" />
                  {s}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Question types */}
        <h2 className="mt-14 text-2xl font-semibold tracking-tight text-ink">Question types</h2>
        <div className="mt-6 space-y-8">
          {g.types.map((t) => (
            <article key={t.slug} id={t.slug} className="scroll-mt-24 rounded-2xl border border-line bg-paper-elev p-6 sm:p-7">
              <h3 className="text-xl font-semibold text-ink">{t.name}</h3>
              <p className="mt-1.5 text-sm text-ink-soft">{t.what}</p>

              {/* How to answer */}
              <Sub icon={<ListOrdered className="size-4" />} label="How to answer">
                <ol className="space-y-2.5">
                  {t.howToAnswer.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-ink-soft">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </Sub>

              {/* Plan + structure */}
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div className="rounded-xl bg-paper-sunken p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Plan (before you write)</p>
                  <p className="mt-2 text-sm text-ink-soft">{t.plan}</p>
                </div>
                <div className="rounded-xl bg-paper-sunken p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Structure</p>
                  <ol className="mt-2 space-y-1 text-sm text-ink-soft">
                    {t.structure.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </div>
              </div>

              {/* Useful language + mistakes */}
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div className="rounded-xl border border-line p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Useful language</p>
                  <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
                    {t.usefulLanguage.map((u) => <li key={u} className="leading-relaxed">{u}</li>)}
                  </ul>
                </div>
                <div className="rounded-xl border border-line p-4">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    <X className="size-3.5 text-danger" /> Common mistakes
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
                    {t.mistakes.map((m) => (
                      <li key={m} className="flex gap-2"><X className="mt-0.5 size-3.5 shrink-0 text-danger" />{m}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Sample question + Band 9 model */}
              <Sub icon={<MessageSquareQuote className="size-4" />} label="Sample question">
                <p className="rounded-xl border border-line bg-paper p-4 text-sm italic leading-relaxed text-ink-soft">
                  {t.sample.question}
                </p>
                <div className="mt-4 rounded-xl border-2 border-green bg-green-soft/30 p-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-green px-2.5 py-0.5 text-xs font-semibold text-green-ink">{t.sample.band}</span>
                    <span className="text-xs font-medium uppercase tracking-wider text-ink-muted">Model answer</span>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink">{t.sample.modelAnswer}</p>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Why it scores</p>
                  <ul className="mt-2 space-y-1.5">
                    {t.sample.whyItScores.map((w) => (
                      <li key={w} className="flex gap-2 text-sm text-ink-soft"><Check className="mt-0.5 size-3.5 shrink-0 text-green" />{w}</li>
                    ))}
                  </ul>
                </div>
              </Sub>
            </article>
          ))}
        </div>

        {/* References */}
        <section className="mt-12 rounded-2xl border border-line bg-paper-elev p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <BookMarked className="size-5 text-ink-soft" /> References &amp; further reading
          </h2>
          <p className="mt-1 text-sm text-ink-muted">Authoritative IELTS sources used to align this guide.</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {g.references.map((r) => (
              <li key={r.href}>
                <a href={r.href} target="_blank" rel="noopener noreferrer" className="group block rounded-xl border border-line p-3 transition-colors hover:bg-paper-sunken">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-brand">
                    {r.label} <ExternalLink className="size-3.5" />
                  </span>
                  <span className="mt-1 block text-xs text-ink-muted">{r.note}</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-ink-muted">
            IELTS is jointly owned by the British Council, IDP: IELTS Australia and Cambridge University Press &amp; Assessment. IELTSAce is an independent practice platform.
          </p>
        </section>

        {/* Cross-link to the other task */}
        <div className="mt-10 flex justify-center">
          <Link href={`/resources/writing/${other}`} className="inline-flex items-center gap-2 rounded-lg border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-sunken">
            <PenLine className="size-4" /> Now study {other === "task-1" ? "Task 1" : "Task 2"}
          </Link>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

function Sub({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">
        {icon} {label}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}
