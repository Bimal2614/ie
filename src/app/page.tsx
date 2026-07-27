import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import {
  ArrowRight, ArrowUpRight, Check, Quote,
  Headphones, BookOpen, PenLine, Mic,
} from "lucide-react";
import { getCurrentUser } from "@/lib/dal";
import { EntryLoader } from "@/components/marketing/entry-loader";
import { PremiumCursor } from "@/components/marketing/premium-cursor";
import { CountUp } from "@/components/marketing/count-up";
import { LandingNav } from "@/components/marketing/landing-nav";
import { LandingHero } from "@/components/marketing/landing-hero";
import { Reveal, ScrollWords } from "@/components/marketing/motion";
import { LandingFooter } from "@/components/marketing/landing-footer";

export const metadata: Metadata = {
  title: "IELTS Practice Online — AI Band Scoring & Mock Tests | IELTSAce",
  description:
    "Practise IELTS online with instant AI band scores for Writing & Speaking, full-length mock tests, and 15,000+ Academic and General Training questions. Real band jumps, scored the way examiners mark.",
  keywords: [
    "IELTS practice", "IELTS test", "test IELTS", "IELTS practice test online", "IELTS online practice",
    "best IELTS platform", "IELTS preparation online", "IELTS mock test", "AI IELTS band score",
    "IELTS reading", "IELTS writing", "IELTS speaking", "IELTS listening",
    "IELTS writing checker", "IELTS speaking practice", "IELTS Academic practice",
    "IELTS General Training practice", "free IELTS practice test",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: "IELTS Practice Online with AI Band Scoring — IELTSAce",
    description: "Real IELTS band jumps, instant AI scoring for Writing & Speaking, and full mock tests across Academic & General Training.",
    siteName: "IELTSAce",
  },
  twitter: { card: "summary_large_image", title: "IELTS Practice Online with AI Band Scoring", description: "AI-scored Writing & Speaking, full mock tests, and 15,000+ IELTS questions." },
  robots: { index: true, follow: true },
};

/* ---- Content. Swap the `img` and numbers for real data before launch. ---- */

const RESULTS = [
  { img: "/test-1.png", name: "Priya S.", place: "Melbourne, AU", from: 6.5, to: 8.0, module: "Academic", quote: "The AI writing feedback showed me exactly why I was stuck at 6.5. Two weeks later I hit 8." },
  { img: "/test-2.png", name: "Ahmed R.", place: "Lahore, PK", from: 5.5, to: 7.0, module: "General", quote: "Recording speaking answers and getting an instant band changed everything for me." },
  { img: "/test-3.png", name: "Lucia M.", place: "Bogotá, CO", from: 7.0, to: 8.5, module: "Academic", quote: "Full mocks under real timing made the actual exam feel routine. No surprises." },
];

const STATS = [
  { to: 94, suffix: "%", label: "reach their target band within 6 weeks" },
  { to: 1.2, decimals: 1, prefix: "+", label: "average band gain, first to latest mock" },
  { to: 15000, suffix: "+", label: "exam-style questions, every task type" },
  { to: 120, suffix: "+", label: "countries preparing with IELTSAce" },
];

const METHOD = [
  { n: "01", title: "Diagnose", copy: "One short diagnostic places your band across all four skills and finds the exact question types costing you marks." },
  { n: "02", title: "Target", copy: "A focused plan drills your weak types first — not a generic syllabus, the specific gaps between you and your target." },
  { n: "03", title: "Score with AI", copy: "Every Writing and Speaking answer is graded on the four official band criteria in seconds, with what to fix next." },
  { n: "04", title: "Mock under pressure", copy: "Full four-section mocks on real 2026 timing, ending in a band report — so exam day is a repeat, not a shock." },
];

const SKILLS = [
  { label: "Listening", Icon: Headphones, copy: "40-question tests; audio plays once, exactly like exam day." },
  { label: "Reading", Icon: BookOpen, copy: "Academic & General passages with every official question type." },
  { label: "Writing", Icon: PenLine, copy: "Task 1 & 2 graded by AI on all four band criteria." },
  { label: "Speaking", Icon: Mic, copy: "Record Parts 1–3; instant band with pronunciation feedback." },
];

const FAQS = [
  { q: "What is the best platform to practise IELTS online?", a: "The best IELTS practice platform gives you instant, criteria-based band scores, full-length timed mock tests, and a large bank of exam-accurate questions for both Academic and General Training. IELTSAce combines AI band scoring for Writing and Speaking with 15,000+ questions and real 2026 exam timing across all four skills." },
  { q: "Can AI score my IELTS Writing and Speaking?", a: "Yes. IELTSAce scores Writing and Speaking on the four official IELTS band criteria and returns a band from 0–9 in seconds, with clear feedback on what to fix." },
  { q: "How can I improve my IELTS band score fast?", a: "Improve fastest by practising the specific question types you lose marks on, writing and speaking under timed conditions with instant band feedback, and sitting full mock tests weekly. Focused, criteria-based practice moves your band far faster than generic study." },
  { q: "Is IELTSAce good for both Academic and General Training?", a: "Yes. Every section includes dedicated Academic and General Training content, including General letters and Academic Task 1 visuals, so your practice matches the exam you're actually taking." },
  { q: "How many practice questions and mock tests are included?", a: "IELTSAce includes 15,000+ exam-style questions across every official IELTS task type and unlimited full-length mock tests, each timed to the real 2026 exam and scored with an AI band report." },
  { q: "How accurate is AI IELTS band scoring?", a: "AI band scoring evaluates the same criteria a human examiner uses and is calibrated to official IELTS band descriptors, giving a reliable, consistent estimate you can track between attempts." },
];

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="landing min-h-svh bg-paper text-ink">
      <PremiumCursor />
      <EntryLoader />
      <StructuredData />

      {/* Sticky header across the whole landing (transparent → solid on scroll) */}
      <LandingNav />

      {/* ══ Hero — dark, image-backed, one quiet entrance ══ */}
      <LandingHero />

      {/* ══ Results — the authority centrepiece: real band jumps ══ */}
      <section id="results" className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-20">
        <Reveal><Header eyebrow="Real results" title="Band jumps, not promises." lead="Students who practised the way examiners mark — and moved on with their lives." /></Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {RESULTS.map((r, i) => (
            <Reveal key={r.name} delay={i * 0.12} className="h-full">
            <figure className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-paper-elev">
              <Image src={r.img} alt={`${r.name} — IELTS result`} width={1000} height={680} className="aspect-[3/2] w-full object-cover" />
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ink-muted line-through">{r.from.toFixed(1)}</span>
                  <ArrowRight className="size-3.5 text-ink-muted" />
                  <span className="font-serif text-2xl tabular-nums text-green">{r.to.toFixed(1)}</span>
                  <span className="ml-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">{r.module}</span>
                </div>
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">
                  <Quote className="mb-1.5 size-4 text-brand/30" />
                  {r.quote}
                </blockquote>
                <figcaption className="mt-4 border-t border-line pt-3 text-sm">
                  <span className="font-semibold text-ink">{r.name}</span>
                  <span className="text-ink-muted"> · {r.place}</span>
                </figcaption>
              </div>
            </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══ DARK SHOWCASE — stats + method, a rounded near-black panel like auth ══ */}
      <section id="method" className="scroll-mt-20 px-4 py-8 sm:px-5">
        <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-[2rem] bg-paper-strong px-6 py-20 text-white sm:px-12 sm:py-24">
          {/* Stats — count-up, white serif on dark */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 border-b border-white/10 pb-14 lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="font-serif text-4xl tabular-nums text-white sm:text-5xl">
                  <CountUp to={s.to} decimals={s.decimals ?? 0} prefix={s.prefix ?? ""} suffix={s.suffix ?? ""} />
                </p>
                <p className="mt-2 max-w-[15rem] text-xs text-white/50">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Method */}
          <div className="pt-16">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green">The IELTSAce Method</p>
            <h2 className="font-serif mt-3 max-w-2xl text-3xl tracking-tight sm:text-4xl">
              Four steps between you and your target band.
            </h2>
            <p className="mt-3 max-w-xl text-white/55">
              Not more study hours — the specific gaps examiners mark you down for, closed one by one.
            </p>

            <div className="mt-12 divide-y divide-white/10 border-y border-white/10">
              {METHOD.map((m, i) => (
                <Reveal key={m.n} delay={i * 0.08} x={-24} y={0}>
                <div className="group grid gap-4 py-7 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-8">
                  <span className="font-serif text-4xl tabular-nums text-white/15 transition-colors group-hover:text-green sm:text-5xl">{m.n}</span>
                  <div className="sm:flex sm:items-baseline sm:gap-8">
                    <h3 className="w-40 shrink-0 text-xl font-semibold text-white">{m.title}</h3>
                    <p className="mt-1 max-w-xl text-sm text-white/55 sm:mt-0">{m.copy}</p>
                  </div>
                  <ArrowUpRight className="hidden size-5 text-white/25 transition-all group-hover:translate-x-1 group-hover:text-green sm:block" />
                </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ What you get — editorial: one feature image + a skills list ══ */}
      <section id="features" className="scroll-mt-20 border-y border-line bg-paper-elev">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-20 lg:grid-cols-2 lg:items-center">
          <Reveal x={-30} y={0} className="order-2 overflow-hidden rounded-2xl border border-line shadow-xl lg:order-1">
            <Image src="/test-6.png" alt="AI band scoring in the IELTSAce app" width={1280} height={720} className="h-auto w-full" />
          </Reveal>
          <Reveal x={30} y={0} delay={0.1} className="order-1 lg:order-2">
            <Header align="left" eyebrow="Scored like the real thing" title="AI band scoring on every criterion." lead="" />
            <p className="mt-4 max-w-md text-ink-soft">
              Writing and Speaking graded on Task Response, Coherence, Lexical Resource, Grammar,
              Fluency and Pronunciation — the exact criteria an examiner uses — in seconds.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {SKILLS.map(({ label, Icon, copy }) => (
                <div key={label} className="flex gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><Icon className="size-5" /></span>
                  <div>
                    <p className="text-sm font-semibold text-ink">{label}</p>
                    <p className="text-xs text-ink-muted">{copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ Reframe narrative — word-by-word scroll reveal (signature motion) ══ */}
      <section className="mx-auto w-full max-w-3xl px-5 py-24 text-center">
        <Reveal><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Why fluent speakers still miss their band</p></Reveal>
        <ScrollWords
          className="font-serif mt-5 text-2xl leading-relaxed text-ink sm:text-[1.85rem]"
          text="Fluent English alone rarely earns a Band 8. IELTS scores your Writing and Speaking against four precise criteria — and most test-takers never learn what examiners actually reward. Criteria-based practice, scored the way the real exam marks, is how you close that gap and reach your target band."
        />
      </section>

      {/* ══ Two paths — decision ══ */}
      <section className="border-y border-line bg-paper-elev">
        <div className="mx-auto grid w-full max-w-5xl gap-5 px-5 py-20 md:grid-cols-2">
          <Reveal x={-28} y={0} className="rounded-2xl border border-line bg-paper p-7">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Keep guessing</p>
            <ul className="mt-4 space-y-3 text-sm text-ink-soft">
              {["Re-book the test and hope the next attempt is different", "Random YouTube tips with no idea what's scoring", "Pay exam fees again for the same band"].map((t) => (
                <li key={t} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-muted/40" />{t}</li>
              ))}
            </ul>
          </Reveal>
          <Reveal x={28} y={0} delay={0.1} className="rounded-2xl border-2 border-brand bg-brand-soft/40 p-7">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand">Practise the way it&apos;s marked</p>
            <ul className="mt-4 space-y-3 text-sm text-ink">
              {["See your band on every answer, instantly", "Drill the exact question types costing you marks", "Walk in knowing you're already at your target"].map((t) => (
                <li key={t} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-green" />{t}</li>
              ))}
            </ul>
            <Link href="/signup" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-green-ink transition-[filter] hover:brightness-105">
              Start free <ArrowRight className="size-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ══ FAQ — SEO / AI-answer content ══ */}
      <section id="faq" className="mx-auto w-full max-w-3xl scroll-mt-20 px-5 py-20">
        <Header eyebrow="Questions, answered" title="Everything about practising IELTS online." lead="" />
        <div className="mt-10 divide-y divide-line">
          {FAQS.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left">
                <h3 className="text-base font-semibold text-ink">{f.q}</h3>
                <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line text-ink-muted transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ══ DARK CLOSE — shared CTA + footer ══ */}
      <LandingFooter />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Pieces
 * ------------------------------------------------------------------ */


function Header({ eyebrow, title, lead, align = "center" }: { eyebrow: string; title: string; lead: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">{eyebrow}</p>
      <h2 className="font-serif mt-3 text-3xl tracking-tight sm:text-4xl">{title}</h2>
      {lead && <p className="mt-3 text-ink-soft">{lead}</p>}
    </div>
  );
}


function StructuredData() {
  const json = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", name: "IELTSAce", description: "IELTS preparation platform with AI band scoring for Writing and Speaking, full mock tests, and 15,000+ Academic and General Training questions." },
      { "@type": "WebSite", name: "IELTSAce — IELTS Practice Online", description: "Practise IELTS online with AI band scoring and full mock tests." },
      { "@type": "FAQPage", mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    ],
  };
  // JSON-LD is data, not executable script — CSP script-src doesn't gate it, so
  // no nonce is needed. Omitting it keeps server/client identical (no hydration
  // mismatch — the browser would otherwise blank a nonce and differ from SSR).
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}
