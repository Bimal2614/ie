import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, X, ArrowLeft, ListOrdered, MessageSquareQuote, BookMarked, ExternalLink } from "lucide-react";
import { LandingNav } from "@/components/marketing/landing-nav";
import { LandingFooter } from "@/components/marketing/landing-footer";
import { STUDY, STUDY_BY_KEY, type StudySection } from "@/lib/study-content";

type Params = { section: string };

export function generateStaticParams() {
  // Writing has its own dedicated section (/resources/writing) with per-task
  // deep guides, so it's excluded from this generic renderer.
  return STUDY.filter((s) => s.key !== "writing").map((s) => ({ section: s.key }));
}

function get(section: string): StudySection | undefined {
  const s = STUDY_BY_KEY[section as StudySection["key"]];
  return s && s.key !== "writing" ? s : undefined;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { section } = await params;
  const s = get(section);
  if (!s) return {};
  const n = s.name.toLowerCase();
  return {
    title: `IELTS ${s.name} — Strategies, Worked Examples & Tips (2026) | IELTSAce`,
    description: `Master IELTS ${s.name}: ${s.tagline} How to answer every question type, dos and don'ts, worked examples with answers explained, and band-boosting tips.`,
    alternates: { canonical: `/resources/${s.key}` },
    keywords: [`IELTS ${n}`, `${n} IELTS`, `IELTS ${n} practice`, `IELTS ${n} tips`, `IELTS ${n} test`, `how to improve IELTS ${n}`],
  };
}

export default async function SectionGuide({ params }: { params: Promise<Params> }) {
  const { section } = await params;
  const s = get(section);
  if (!s) notFound();

  const isSpeaking = s.key === "speaking";

  return (
    <div className="min-h-svh bg-paper text-ink">
      <LandingNav alwaysSolid />

      <main className="mx-auto w-full max-w-4xl px-5 pb-20 pt-28 sm:pt-32">
        <Link href="/resources" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
          <ArrowLeft className="size-4" /> All study materials
        </Link>

        {/* Header */}
        <header className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">IELTS {s.name} · 2026</p>
          <h1 className="font-serif mt-3 text-4xl tracking-tight sm:text-5xl">{s.tagline}</h1>
          <p className="mt-4 max-w-2xl text-ink-soft">{s.overview}</p>
        </header>

        {/* Format grid */}
        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
          {s.format.map((f) => (
            <div key={f.label} className="bg-paper-elev px-4 py-4">
              <dt className="text-xs font-medium uppercase tracking-wider text-ink-muted">{f.label}</dt>
              <dd className="mt-1 text-sm font-semibold text-ink">{f.value}</dd>
            </div>
          ))}
        </dl>

        {/* Push your band up */}
        <section className="mt-8 rounded-2xl border border-line bg-paper-elev p-6">
          <h2 className="text-lg font-semibold text-ink">How to push your {s.name} band up</h2>
          <ul className="mt-4 space-y-3">
            {s.bandTips.map((t) => (
              <li key={t} className="flex gap-2.5 text-sm text-ink-soft">
                <Check className="mt-0.5 size-4 shrink-0 text-green" />
                {t}
              </li>
            ))}
          </ul>
        </section>

        {/* Task types */}
        <h2 className="mt-14 text-2xl font-semibold tracking-tight text-ink">
          {isSpeaking ? "The three parts" : "Question types"}
        </h2>
        <div className="mt-6 space-y-8">
          {s.topics.map((t) => (
            <article key={t.slug} id={t.slug} className="scroll-mt-24 rounded-2xl border border-line bg-paper-elev p-6 sm:p-7">
              <h3 className="text-xl font-semibold text-ink">{t.name}</h3>
              <p className="mt-1.5 text-sm text-ink-soft">{t.what}</p>

              {/* How to answer */}
              <div className="mt-5">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  <ListOrdered className="size-4" /> How to answer
                </p>
                <ol className="mt-3 space-y-2.5">
                  {t.howToAnswer.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-ink-soft">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Dos & Don'ts */}
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div className="rounded-xl border border-line p-4">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-ink"><Check className="size-4 text-green" /> Do</p>
                  <ul className="mt-3 space-y-2 text-sm text-ink-soft">
                    {t.dos.map((d) => <li key={d} className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-green" />{d}</li>)}
                  </ul>
                </div>
                <div className="rounded-xl border border-line p-4">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-ink"><X className="size-4 text-danger" /> Don&apos;t</p>
                  <ul className="mt-3 space-y-2 text-sm text-ink-soft">
                    {t.donts.map((d) => <li key={d} className="flex gap-2"><X className="mt-0.5 size-3.5 shrink-0 text-danger" />{d}</li>)}
                  </ul>
                </div>
              </div>

              {/* Useful language (speaking) */}
              {t.usefulLanguage && t.usefulLanguage.length > 0 && (
                <div className="mt-5 rounded-xl bg-paper-sunken p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Useful language</p>
                  <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
                    {t.usefulLanguage.map((u) => <li key={u}>{u}</li>)}
                  </ul>
                </div>
              )}

              {/* Worked example */}
              <div className="mt-6">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  <MessageSquareQuote className="size-4" /> Worked example
                </p>
                {t.example.context && (
                  <p className="mt-3 whitespace-pre-line rounded-xl border border-line bg-paper p-4 text-sm italic leading-relaxed text-ink-soft">
                    {t.example.context}
                  </p>
                )}
                <p className="mt-3 text-sm font-medium text-ink">{t.example.prompt}</p>
                <div className="mt-3 rounded-xl border-2 border-green bg-green-soft/30 p-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-green px-2.5 py-0.5 text-xs font-semibold text-green-ink">
                      {t.example.band ?? "Answer"}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink">{t.example.answer}</p>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {t.example.explanation.map((e) => (
                    <li key={e} className="flex gap-2 text-sm text-ink-soft"><Check className="mt-0.5 size-3.5 shrink-0 text-green" />{e}</li>
                  ))}
                </ul>
              </div>

              {/* Tips */}
              {t.tips && t.tips.length > 0 && (
                <div className="mt-5 space-y-2">
                  {t.tips.map((tip) => (
                    <p key={tip} className="rounded-xl bg-brand-soft/50 p-3 text-sm text-ink-soft">{tip}</p>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>

        {/* References */}
        <section className="mt-12 rounded-2xl border border-line bg-paper-elev p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <BookMarked className="size-5 text-ink-soft" /> References &amp; further reading
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {s.references.map((r) => (
              <li key={r.href}>
                <a href={r.href} target="_blank" rel="noopener noreferrer" className="group block rounded-xl border border-line p-3 transition-colors hover:bg-paper-sunken">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-brand">{r.label} <ExternalLink className="size-3.5" /></span>
                  <span className="mt-1 block text-xs text-ink-muted">{r.note}</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-ink-muted">
            IELTS is jointly owned by the British Council, IDP: IELTS Australia and Cambridge University Press &amp; Assessment. IELTSAce is an independent practice platform.
          </p>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
