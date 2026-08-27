import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, X, ArrowRight, Headphones, BookOpen, PenLine, Mic, Monitor, RefreshCw, TrendingUp, type LucideIcon } from "lucide-react";
import { MarketingShell, PageHead } from "@/components/marketing/marketing-shell";
import { BANDS, BAND_SLUGS, type BandGuide } from "@/lib/band-content";
import { JsonLd } from "@/components/seo/json-ld";
import { KEYWORDS, breadcrumbJsonLd, courseJsonLd, faqJsonLd, pageMeta } from "@/lib/seo";
import { LONG_TAIL } from "@/lib/keywords";

type Params = { band: string };

export function generateStaticParams() {
  return BAND_SLUGS.map((band) => ({ band }));
}

function get(slug: string): BandGuide | undefined {
  return BANDS[slug];
}

const ICONS: Record<string, LucideIcon> = { listening: Headphones, reading: BookOpen, writing: PenLine, speaking: Mic };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { band } = await params;
  const b = get(band);
  if (!b) return {};
  return pageMeta({
    title: `How to Get Band ${b.band} in IELTS: Tips for Every Section`,
    description: `How to reach IELTS Band ${b.band}: the raw scores you need in Listening and Reading, what Writing and Speaking require, and what holds you one band below.`,
    path: `/ielts-band/${b.slug}`,
    keywords: [
      `IELTS band ${b.band}`,
      `how to get band ${b.band} in IELTS`,
      `band ${b.band} IELTS`,
      `IELTS band ${b.band} requirements`,
      `is band ${b.band} good IELTS`,
      ...KEYWORDS.bands,
      ...LONG_TAIL.bandTargets,
      ...LONG_TAIL.scoring,
    ],
  });
}

export default async function BandPage({ params }: { params: Promise<Params> }) {
  const { band } = await params;
  const b = get(band);
  if (!b) notFound();

  return (
    <MarketingShell>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "IELTS band scores", path: "/ielts-band-scores" },
          { name: `Band ${b.band}`, path: `/ielts-band/${b.slug}` },
        ])}
      />
      <JsonLd
        data={courseJsonLd({
          name: `How to get IELTS Band ${b.band}`,
          description: `The raw scores, skill-by-skill requirements and tactics needed to reach IELTS Band ${b.band}.`,
          path: `/ielts-band/${b.slug}`,
        })}
      />
      {/* The Q&A below is real page content first and a rich result second —
          the questions are the ones people actually type, so the answers earn
          the "People Also Ask" slot only because they answer them on the page. */}
      <JsonLd data={faqJsonLd(b.faqs)} />

      <Link href="/ielts-band-scores" className="text-sm font-medium text-brand hover:underline">← IELTS band scores explained</Link>

      <div className="mt-4">
        <PageHead
          eyebrow={`IELTS Band ${b.band}`}
          title={`How to get Band ${b.band} in IELTS`}
          lead={`Band ${b.band} is ${b.meaning} It is ${b.who}`}
        />
      </div>

      {/* What you need */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { k: "Overall", v: b.overall },
          { k: "Listening", v: b.raw.listening },
          { k: "Reading", v: b.raw.reading },
        ].map((x) => (
          <div key={x.k} className="rounded-2xl border border-line bg-paper-elev p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">{x.k}</p>
            <p className="mt-1 text-sm font-semibold text-ink">{x.v}</p>
          </div>
        ))}
      </div>

      {/* Per-skill */}
      <h2 className="mt-12 text-2xl font-semibold tracking-tight text-ink">What Band {b.band} takes, skill by skill</h2>
      <div className="mt-6 space-y-5">
        {b.skills.map((s) => {
          const Icon = ICONS[s.key];
          return (
            <article key={s.key} className="rounded-2xl border border-line bg-paper-elev p-6">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-paper-sunken text-ink-soft"><Icon className="size-5" /></span>
                <h3 className="text-lg font-semibold text-ink">{s.name}</h3>
              </div>
              <p className="mt-3 text-sm text-ink-soft">{s.takes}</p>
              <ul className="mt-3 space-y-2">
                {s.tips.map((t) => (
                  <li key={t} className="flex gap-2 text-sm text-ink-soft"><Check className="mt-0.5 size-3.5 shrink-0 text-green" />{t}</li>
                ))}
              </ul>
              <Link href={`/resources/${s.key}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
                Full {s.name} guide <ArrowRight className="size-4" />
              </Link>
            </article>
          );
        })}
      </div>

      {/* Common misses */}
      <div className="mt-10 rounded-2xl border border-line bg-paper-elev p-6">
        <h2 className="flex items-center gap-1.5 text-lg font-semibold text-ink"><X className="size-4 text-danger" /> Why people miss Band {b.band}</h2>
        <ul className="mt-3 space-y-2">
          {b.misses.map((m) => (
            <li key={m} className="flex gap-2 text-sm text-ink-soft"><X className="mt-0.5 size-3.5 shrink-0 text-danger" />{m}</li>
          ))}
        </ul>
      </div>

      {/* ── How long it takes ─────────────────────────────────────── */}
      <h2 className="mt-14 flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink">
        <TrendingUp className="size-5 text-brand" /> How long it takes to reach Band {b.band}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">
        Timelines assume focused, diagnosed practice rather than hours logged. The single biggest
        predictor of speed is whether you drill your weakest question types or simply repeat full
        mock tests without analysing them.
      </p>
      <div className="mt-6 space-y-4">
        {b.journey.map((j) => (
          <div key={j.from} className="rounded-2xl border border-line bg-paper-elev p-6 sm:flex sm:gap-7">
            <div className="shrink-0 sm:w-40">
              <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">From</p>
              <p className="font-serif text-xl text-ink">{j.from}</p>
              <p className="mt-1 text-sm font-semibold text-green">{j.weeks}</p>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft sm:mt-0">{j.focus}</p>
          </div>
        ))}
      </div>

      {/* ── Where this band gets you ──────────────────────────────── */}
      <h2 className="mt-14 text-2xl font-semibold tracking-tight text-ink">
        Is Band {b.band} enough for what you need?
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">
        Requirements are almost always stated <strong>per skill</strong>, not as an overall average.
        This is where most candidates misjudge their own score: an overall band that clears the bar
        with one skill below the per-skill minimum is refused.
      </p>
      <div className="mt-6 overflow-hidden rounded-2xl border border-line">
        {b.accepted.map((a, i) => (
          <div
            key={a.context}
            className={`p-6 sm:flex sm:gap-6 ${i > 0 ? "border-t border-line" : ""} ${
              a.enough === "partly" ? "bg-paper-sunken" : "bg-paper-elev"
            }`}
          >
            <div className="shrink-0 sm:w-52">
              <p className="text-sm font-semibold text-ink">{a.context}</p>
              <span
                className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  a.enough === "yes"
                    ? "bg-brand-soft text-brand"
                    : a.enough === "partly"
                      ? "bg-paper text-ink-muted"
                      : "bg-paper text-danger"
                }`}
              >
                {a.enough === "yes" ? "Meets it" : a.enough === "partly" ? "Depends on the skill split" : "Below the bar"}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft sm:mt-0">{a.detail}</p>
          </div>
        ))}
      </div>

      {/* ── 2026 format ───────────────────────────────────────────── */}
      <div className="mt-14 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-paper-elev p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <Monitor className="size-4 text-brand" /> What the on-screen test changes at Band {b.band}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{b.onScreen}</p>
          <Link href="/ielts-2026-changes" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
            What changed in IELTS in 2026 <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="rounded-2xl border border-line bg-paper-elev p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <RefreshCw className="size-4 text-brand" /> Using One Skill Retake to reach Band {b.band}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{b.retake}</p>
          <Link href="/ielts-band-score-calculator" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
            Work out your overall band <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>

      {/* ── FAQ ───────────────────────────────────────────────────── */}
      <h2 className="mt-14 text-2xl font-semibold tracking-tight text-ink">Band {b.band} questions, answered</h2>
      <div className="mt-5 divide-y divide-line border-y border-line">
        {b.faqs.map((f) => (
          <details key={f.q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left">
              <h3 className="text-base font-semibold text-ink">{f.q}</h3>
              <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line text-ink-muted transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{f.a}</p>
          </details>
        ))}
      </div>

      {/* Cross-links to other bands */}
      <div className="mt-10">
        <p className="text-sm font-semibold text-ink">Other band targets</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {BAND_SLUGS.filter((s) => s !== b.slug).map((s) => (
            <Link key={s} href={`/ielts-band/${s}`} className="rounded-full border border-line px-4 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-paper-sunken">
              Band {BANDS[s].band}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-12 flex flex-col items-center gap-4 rounded-2xl border border-line bg-paper-elev p-8 text-center">
        <h2 className="font-serif text-2xl tracking-tight">Practise your way to Band {b.band}.</h2>
        <p className="max-w-md text-sm text-ink-soft">AI band scoring, full mock tests, and 15,000+ questions, free to start.</p>
        <Link href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-green px-6 py-3 text-sm font-semibold text-green-ink transition-[filter] hover:brightness-105">
          Start practising free <ArrowRight className="size-4" />
        </Link>
      </div>
    </MarketingShell>
  );
}
