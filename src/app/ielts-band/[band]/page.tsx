import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, X, ArrowRight, Headphones, BookOpen, PenLine, Mic, type LucideIcon } from "lucide-react";
import { MarketingShell, PageHead } from "@/components/marketing/marketing-shell";
import { BANDS, BAND_SLUGS, type BandGuide } from "@/lib/band-content";

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
  return {
    title: `How to Get Band ${b.band} in IELTS — Tips for Every Section (2026) | IELTSAce`,
    description: `A practical guide to reaching IELTS Band ${b.band}: the scores you need, what each of Listening, Reading, Writing and Speaking requires, and the top tips to get there.`,
    alternates: { canonical: `/ielts-band/${b.slug}` },
    keywords: [`ielts band ${b.band}`, `how to get band ${b.band} in ielts`, `band ${b.band} ielts`, "ielts tips", "ielts band score"],
  };
}

export default async function BandPage({ params }: { params: Promise<Params> }) {
  const { band } = await params;
  const b = get(band);
  if (!b) notFound();

  return (
    <MarketingShell>
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
        <p className="max-w-md text-sm text-ink-soft">AI band scoring, full mock tests, and 15,000+ questions — free to start.</p>
        <Link href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-green px-6 py-3 text-sm font-semibold text-green-ink transition-[filter] hover:brightness-105">
          Start practising free <ArrowRight className="size-4" />
        </Link>
      </div>
    </MarketingShell>
  );
}
