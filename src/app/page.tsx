import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  GraduationCap, ArrowRight, ArrowUpRight, Check, Quote,
  Headphones, BookOpen, PenLine, Mic, ShieldCheck,
} from "lucide-react";
import { getCurrentUser } from "@/lib/dal";
import { EntryLoader } from "@/components/marketing/entry-loader";
import { PremiumCursor } from "@/components/marketing/premium-cursor";
import { CountUp } from "@/components/marketing/count-up";

export const metadata: Metadata = {
  title: "IELTS Practice Online — AI Band Scoring & Mock Tests | IELTSAce",
  description:
    "Practise IELTS online with instant AI band scores for Writing & Speaking, full-length mock tests, and 15,000+ Academic and General Training questions. Real band jumps, scored the way examiners mark.",
  keywords: [
    "IELTS practice", "IELTS practice test online", "IELTS online practice", "best IELTS platform",
    "IELTS preparation online", "IELTS mock test", "AI IELTS band score", "IELTS writing checker",
    "IELTS speaking practice", "IELTS Academic practice", "IELTS General Training practice", "free IELTS practice test",
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
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <div className="landing min-h-svh bg-paper text-ink">
      <PremiumCursor />
      <EntryLoader />
      <StructuredData nonce={nonce} />
      <Nav />

      {/* ══ Hero — authority-led, asymmetric, no badge pill / glow / gradient word ══ */}
      <section className="border-b border-line">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-16 lg:grid-cols-[7fr_5fr] lg:items-center lg:py-24">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
              <span className="h-px w-8 bg-ink-muted/40" /> IELTS Academic &amp; General · 2026 format
            </p>

            <h1 className="reveal-line font-serif mt-5 text-[2.6rem] leading-[1.04] tracking-tight sm:text-6xl">
              <span style={{ ["--i" as string]: 0 }}>The band you&apos;re capable of,</span><br />
              <span style={{ ["--i" as string]: 1 }} className="text-brand">scored the way examiners mark.</span>
            </h1>

            <p className="mt-6 max-w-lg text-lg text-ink-soft">
              Instant AI band scores for Writing &amp; Speaking, full-length mock tests, and 15,000+
              Academic and General Training questions — the practice platform behind real band jumps.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="group inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition-colors hover:bg-brand-hover">
                Start practising free <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link href="#results" className="inline-flex items-center gap-2 rounded-lg border border-line bg-paper-elev px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-sunken">
                See real results
              </Link>
            </div>

            <div className="mt-8 flex items-center gap-3 text-sm text-ink-muted">
              <ShieldCheck className="size-4 text-green" /> No card required · free to start · scored in seconds
            </div>
          </div>

          {/* Proof artifact — a result, not a product screenshot. */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="overflow-hidden rounded-2xl border border-line bg-paper-elev shadow-2xl shadow-ink/10">
              <Image src="/test-5.png" alt="IELTS score report — sample result" width={920} height={1150} className="h-auto w-full" priority />
            </div>
            {/* Band chip, offset over the corner. */}
            <div className="absolute -bottom-4 -left-4 rounded-xl border border-line bg-paper-elev px-4 py-3 shadow-xl">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Overall band</p>
              <p className="font-serif text-3xl leading-none tabular-nums text-brand">8.5</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ Results — the authority centrepiece: real band jumps ══ */}
      <section id="results" className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-20">
        <Header eyebrow="Real results" title="Band jumps, not promises." lead="Students who practised the way examiners mark — and moved on with their lives." />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {RESULTS.map((r) => (
            <figure key={r.name} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-paper-elev">
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
          ))}
        </div>
      </section>

      {/* ══ DARK SHOWCASE — stats + method, a rounded near-black panel like auth ══ */}
      <section id="method" className="scroll-mt-20 px-4 py-8 sm:px-5">
        <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-[2rem] bg-[#0a0a0b] px-6 py-20 text-white sm:px-12 sm:py-24">
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
              {METHOD.map((m) => (
                <div key={m.n} className="group grid gap-4 py-7 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-8">
                  <span className="font-serif text-4xl tabular-nums text-white/15 transition-colors group-hover:text-green sm:text-5xl">{m.n}</span>
                  <div className="sm:flex sm:items-baseline sm:gap-8">
                    <h3 className="w-40 shrink-0 text-xl font-semibold text-white">{m.title}</h3>
                    <p className="mt-1 max-w-xl text-sm text-white/55 sm:mt-0">{m.copy}</p>
                  </div>
                  <ArrowUpRight className="hidden size-5 text-white/25 transition-all group-hover:translate-x-1 group-hover:text-green sm:block" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ What you get — editorial: one feature image + a skills list ══ */}
      <section id="features" className="scroll-mt-20 border-y border-line bg-paper-elev">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-20 lg:grid-cols-2 lg:items-center">
          <div className="order-2 overflow-hidden rounded-2xl border border-line shadow-xl lg:order-1">
            <Image src="/test-6.png" alt="AI band scoring in the IELTSAce app" width={1280} height={720} className="h-auto w-full" />
          </div>
          <div className="order-1 lg:order-2">
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
          </div>
        </div>
      </section>

      {/* ══ Reframe narrative — the un-AI, empathy angle ══ */}
      <section className="mx-auto w-full max-w-3xl px-5 py-20 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Why fluent speakers still miss their band</p>
        <p className="font-serif mt-5 text-2xl leading-relaxed text-ink sm:text-[1.75rem]">
          You&apos;ve studied for months. Friends say your English is strong. Yet the band comes
          back short — again. It&apos;s rarely your English. It&apos;s that IELTS rewards specific,
          criteria-driven answers, and no one shows you which ones. That&apos;s the gap we close.
        </p>
      </section>

      {/* ══ Two paths — decision ══ */}
      <section className="border-y border-line bg-paper-elev">
        <div className="mx-auto grid w-full max-w-5xl gap-5 px-5 py-20 md:grid-cols-2">
          <div className="rounded-2xl border border-line bg-paper p-7">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Keep guessing</p>
            <ul className="mt-4 space-y-3 text-sm text-ink-soft">
              {["Re-book the test and hope the next attempt is different", "Random YouTube tips with no idea what's scoring", "Pay exam fees again for the same band"].map((t) => (
                <li key={t} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-muted/40" />{t}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border-2 border-brand bg-brand-soft/40 p-7">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand">Practise the way it&apos;s marked</p>
            <ul className="mt-4 space-y-3 text-sm text-ink">
              {["See your band on every answer, instantly", "Drill the exact question types costing you marks", "Walk in knowing you're already at your target"].map((t) => (
                <li key={t} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-green" />{t}</li>
              ))}
            </ul>
            <Link href="/signup" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover">
              Start free <ArrowRight className="size-4" />
            </Link>
          </div>
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

      {/* ══ DARK CLOSE — CTA + footer, matching the auth panel ══ */}
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Pieces
 * ------------------------------------------------------------------ */

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-3.5">
        <span className="flex items-center gap-2 font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-brand text-white"><GraduationCap className="size-5" /></span>
          IELTSAce
        </span>
        <nav className="hidden items-center gap-8 text-[13px] font-medium text-ink-soft md:flex">
          <a href="#results" className="transition-colors hover:text-ink">Results</a>
          <a href="#method" className="transition-colors hover:text-ink">Method</a>
          <a href="#features" className="transition-colors hover:text-ink">Scoring</a>
          <a href="#faq" className="transition-colors hover:text-ink">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="rounded-lg px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink">Sign in</Link>
          <Link href="/signup" className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover">
            Get started <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function Header({ eyebrow, title, lead, align = "center" }: { eyebrow: string; title: string; lead: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">{eyebrow}</p>
      <h2 className="font-serif mt-3 text-3xl tracking-tight sm:text-4xl">{title}</h2>
      {lead && <p className="mt-3 text-ink-soft">{lead}</p>}
    </div>
  );
}

function Footer() {
  const cols = [
    { title: "Practice", links: ["Listening", "Reading", "Writing", "Speaking", "Mock tests"] },
    { title: "Platform", links: ["Sign in", "Get started", "The method", "FAQ"] },
  ];
  return (
    <footer className="mt-8 overflow-hidden rounded-t-[2.5rem] bg-[#0a0a0b] text-white">
      {/* Dark CTA — the auth-style closing moment */}
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-5 py-24 text-center">
        <h2 className="font-serif max-w-2xl text-3xl tracking-tight sm:text-5xl">
          Your target band is closer than the last attempt made it feel.
        </h2>
        <p className="max-w-xl text-white/55">Start free today — practise, get scored, and watch your band climb.</p>
        <Link href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-green px-6 py-3.5 text-sm font-semibold text-green-ink transition-transform hover:scale-[1.02]">
          Start practising free <ArrowRight className="size-4" />
        </Link>
      </div>

      {/* Footer columns */}
      <div className="mx-auto grid w-full max-w-6xl gap-8 border-t border-white/10 px-5 py-14 md:grid-cols-[1.6fr_1fr_1fr]">
        <div>
          <span className="flex items-center gap-2 font-semibold">
            <span className="grid size-8 place-items-center rounded-lg bg-white/10"><GraduationCap className="size-5" /></span>
            IELTSAce
          </span>
          <p className="mt-3 max-w-xs text-sm text-white/45">
            The complete IELTS preparation platform — AI band scoring, mock tests, and 15,000+
            questions for Academic &amp; General Training.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <p className="text-sm font-semibold text-white">{c.title}</p>
            <ul className="mt-3 space-y-2 text-sm text-white/45">
              {c.links.map((l) => <li key={l}><Link href="/signup" className="transition-colors hover:text-white">{l}</Link></li>)}
            </ul>
          </div>
        ))}
      </div>

      {/* Oversized wordmark */}
      <div className="overflow-hidden border-t border-white/10 px-4 pb-8 pt-10">
        <p className="font-serif select-none text-center leading-none tracking-tight text-white/[0.05]" style={{ fontSize: "clamp(3rem, 18vw, 16rem)" }}>IELTSAce</p>
        <p className="-mt-1 text-center text-[10px] uppercase tracking-[0.3em] text-white/30 sm:text-sm">The best way to practise IELTS online</p>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-5 py-6 text-xs text-white/35 sm:flex-row">
          <p>© {new Date().getFullYear()} IELTSAce · Practise IELTS online, smarter.</p>
          <p>IELTS is a trademark of its respective owners. This is an independent practice platform.</p>
        </div>
      </div>
    </footer>
  );
}

function StructuredData({ nonce }: { nonce?: string }) {
  const json = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", name: "IELTSAce", description: "IELTS preparation platform with AI band scoring for Writing and Speaking, full mock tests, and 15,000+ Academic and General Training questions." },
      { "@type": "WebSite", name: "IELTSAce — IELTS Practice Online", description: "Practise IELTS online with AI band scoring and full mock tests." },
      { "@type": "FAQPage", mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    ],
  };
  return <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}
