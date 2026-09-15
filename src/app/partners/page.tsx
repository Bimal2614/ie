import Link from "next/link";
import { ArrowRight, BadgePercent, LineChart, Mail, Users, Wallet } from "lucide-react";

import { MarketingShell, PageHead } from "@/components/marketing/marketing-shell";
import { Reveal } from "@/components/marketing/motion";
import { PartnerApplicationForm } from "@/components/marketing/partner-application-form";
import { SUPPORT_EMAIL } from "@/lib/brand-links";
import { pageMeta } from "@/lib/seo";

/**
 * /partners — the public front door to the partner programme.
 *
 * NOT /partner, which is the panel a class signs into. This page is for the
 * institutes that do not have one yet, so it is the only thing on the site that
 * explains what a partner IS before asking anyone to apply: the wholesale rate,
 * the roster, the paying-on-a-student's-behalf.
 *
 * The form below creates nothing — see src/app/actions/partner-apply.ts. That is
 * why the copy talks about applying and about us replying, never about an
 * account being ready. The account is real work an admin does afterwards, and
 * writing a cheque the next screen cannot cash is the one thing a landing page
 * must not do.
 */

export const metadata = pageMeta({
  title: "IELTS Partner Programme for Coaching Institutes",
  description:
    "Partner with IELTSVega: wholesale plan pricing for your coaching institute, one panel to enrol students and pay for them, and live band scores for each.",
  path: "/partners",
  keywords: [
    "IELTS partner programme",
    "IELTS coaching institute software",
    "IELTS platform for institutes",
    "bulk IELTS practice licences",
    "IELTS reseller",
  ],
});

const BENEFITS = [
  {
    Icon: BadgePercent,
    title: "A wholesale rate, not a list price",
    body: "Every partner gets its own rate on every plan we sell. You see what a seat costs you and what it costs everyone else, on the same screen, before you buy.",
  },
  {
    Icon: Users,
    title: "Enrol students in seconds",
    body: "Create an account for a candidate from your panel and hand them the login. No invite emails to chase, no sign-up form for them to get wrong.",
  },
  {
    Icon: LineChart,
    title: "See who is actually practising",
    body: "One roster with every student's plan, attempts, mock tests and average band — so a class review is a page you open, not a week of asking.",
  },
  {
    Icon: Wallet,
    title: "You pay, they practise",
    body: "Buy a plan on a student's behalf and it activates on their account immediately. Their access runs for exactly as long as it was paid for.",
  },
];

const FAQS = [
  {
    q: "What does it cost to become a partner?",
    a: "Nothing. There is no joining fee and no minimum. You pay only for the plans you buy for your students, at your partner rate.",
  },
  {
    q: "How long does approval take?",
    a: "We reply to every application within one business day. Once we have agreed your rate, your panel and login are set up the same day.",
  },
  {
    q: "Do my students need to pay anything?",
    a: "Not if you are buying for them. A plan you pay for activates on the student's own account, and they never see a payment screen.",
  },
  {
    q: "Can students keep their account if they leave my class?",
    a: "Yes. The account belongs to the candidate. Whatever plan was paid for runs its full term regardless of what happens to the partnership.",
  },
];

export default function PartnersPage() {
  return (
    <MarketingShell width="wide">
      <Reveal>
        <PageHead
          eyebrow="Partner programme"
          title="Run your IELTS classes on our platform."
          lead="Coaching institutes, tutors and study-abroad consultancies use IELTSVega to give every candidate exam-accurate practice and AI band scoring, at a rate built for buying in bulk. Tell us about your class and we'll set you up."
        />
      </Reveal>

      {/*
        The form first, with what a partner gets beside it.

        THE PITCH SITS NEXT TO THE FORM RATHER THAN ABOVE IT, so the reason to
        apply is still on screen while someone is typing — a benefits grid above
        the fold is scrolled past and gone by the time it would do any
        persuading. On a phone the columns stack and the panel lands under the
        form, which is the right order there: a visitor who reached a form on a
        400px screen has already decided to read it.
      */}
      <div id="apply" className="mt-12 scroll-mt-28 lg:grid lg:grid-cols-[1.3fr_1fr] lg:items-start lg:gap-10">
        <Reveal>
          <PartnerApplicationForm />
        </Reveal>

        {/*
          The dark slab, which is the site's existing language for "this is the
          important part" — the landing hero, the auth showcase and the footer
          all use it. Sticky on desktop so the four reasons stay put alongside a
          form that is taller than they are.
        */}
        <Reveal delay={0.1} className="mt-8 lg:sticky lg:top-28 lg:mt-0">
          <div className="overflow-hidden rounded-3xl bg-paper-strong p-7 text-white">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-white/40">
              What partners get
            </p>

            <ul className="mt-6 space-y-5">
              {BENEFITS.map((b) => (
                <li key={b.title} className="flex gap-3.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-brand-soft">
                    <b.Icon className="size-4.5" strokeWidth={1.75} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{b.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/50">{b.body}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* The objection everyone arrives with, answered in the panel. */}
            <div className="mt-7 rounded-2xl bg-green p-5 text-green-ink">
              <p className="text-base font-semibold leading-tight">No joining fee, no minimum.</p>
              <p className="mt-1.5 text-sm leading-relaxed text-green-ink/75">
                You pay for the plans you buy for your students, at your rate. Nothing else.
              </p>
            </div>

            <p className="font-mono mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] uppercase tracking-wider text-white/35">
              <span>Academic + General</span>
              <span className="text-white/15">/</span>
              <span>15,000+ questions</span>
              <span className="text-white/15">/</span>
              <span>Full mocks</span>
            </p>
          </div>
        </Reveal>
      </div>

      {/* Q&A, below the fold where a reader goes looking for it. */}
      <div className="mt-16">
        <h2 className="font-serif text-2xl tracking-tight text-ink sm:text-3xl">Common questions</h2>
        <dl className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
          {FAQS.map((f) => (
            <div key={f.q} className="bg-paper-elev p-6">
              <dt className="font-medium text-ink">{f.q}</dt>
              <dd className="mt-1.5 text-sm text-ink-soft">{f.a}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* The two ways in that are not the form. */}
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-paper-elev p-6">
          <p className="font-semibold text-ink">Already a partner?</p>
          <p className="mt-1.5 text-sm text-ink-soft">
            Sign in to your panel to enrol students and buy plans.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-line bg-paper-sunken px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper"
          >
            Partner log in <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="rounded-2xl border border-line bg-paper-elev p-6">
          <p className="font-semibold text-ink">Rather talk it through first?</p>
          <p className="mt-1.5 text-sm text-ink-soft">
            Email us and we&apos;ll answer before you fill anything in.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-line bg-paper-sunken px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper"
          >
            <Mail className="size-4" /> {SUPPORT_EMAIL}
          </a>
        </div>
      </div>
    </MarketingShell>
  );
}
