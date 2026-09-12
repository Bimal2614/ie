/**
 * The published legal documents: Terms of Use, Privacy Policy, Refund Policy.
 *
 * These are the REAL, live documents, not templates. Every factual claim in
 * them is checked against the code that implements it, and that is the only
 * thing that makes them safe to publish — a privacy policy describing
 * processing the app does not do is as much of a liability as one that omits
 * processing it does. Where a statement here has a counterpart in the codebase,
 * the counterpart is named below, so the next person to change the behaviour can
 * see that this file has to move with it:
 *
 *   cookie name, session TTLs .... lib/session.ts (SESSION_COOKIE, *_TTL_MS)
 *   the analytics tags ........... components/analytics/analytics.tsx
 *   the sub-processor list ....... .env.example (the service blocks)
 *   prices, plan limits .......... lib/plans.ts (PLANS)
 *   cancel-at-cycle-end .......... lib/payments/billing.ts
 *   what a partner can see ....... app/partner/students/[id]/page.tsx
 *   the fields we store .......... db/schema.ts (users, sessions, audit_log, …)
 *
 * The one thing NOT derivable from the code is the operator's registered
 * identity, so it lives in `OPERATOR` as data, with every mention in the prose
 * generated from it.
 *
 * Prices and plan limits are NOT typed out here. They are read from lib/plans.ts
 * — the same source the pricing page quotes — because the refund policy and the
 * pricing page disagreeing about what a term costs is the one contradiction on
 * this site with a straightforward legal consequence.
 */

import {
  OFFERED_PLANS,
  PLANS,
  PLAN_KEYS,
  billingPeriodLabel,
  formatPrice,
  priceFor,
  type PlanKey,
} from "@/lib/plans";

/* ─────────────────────────────── Operator identity ───────────────────────── */

/**
 * Who publishes these documents.
 *
 * `legalName: null` is a supported, shippable state and NOT a placeholder: the
 * documents then bind "IELTSVega", the name the service trades and takes money
 * under, which is enforceable in its own right. Set it to the registered name
 * the day the entity exists and all three documents upgrade themselves.
 *
 * `city`/`state` only narrow the venue clause. With them, jurisdiction is
 * exclusive to those courts — worth having, since it decides where you would
 * have to show up. Without them the clause falls back to the courts of India
 * generally, which is valid but leaves venue open.
 */
export const OPERATOR = {
  /** Registered name, e.g. "Vega Learning Private Limited". Null until incorporated. */
  legalName: null as string | null,
  /** Corporate Identity Number / LLPIN. Shown beside the legal name when set. */
  cin: null as string | null,
  /** GSTIN. Shown in the billing and tax notes when set. */
  gstin: null as string | null,
  /** Exclusive-jurisdiction venue. BOTH must be set to narrow the clause. */
  city: null as string | null,
  state: null as string | null,
  country: "India",
  /** Support, privacy and grievance inbox. Mirrors brand-links.SUPPORT_EMAIL. */
  email: "hello@ieltsvega.com",
  site: "www.ieltsvega.com",
  /** Named grievance contact, as the IT Rules and E-Commerce Rules ask for. */
  grievanceOfficer: "The Grievance Officer, IELTSVega",
} as const;

const BRAND = "IELTSVega";
const CONTACT = OPERATOR.email;

/** How the operator is named in prose: the registered entity if there is one. */
const COMPANY: string = OPERATOR.legalName ?? BRAND;

/** The clause that introduces the operator at the top of each document. */
const OPERATOR_INTRO: string = OPERATOR.legalName
  ? `${OPERATOR.legalName}${OPERATOR.cin ? ` (CIN ${OPERATOR.cin})` : ""}, trading as ${BRAND}`
  : BRAND;

/** The venue half of the governing-law clause. */
const VENUE: string =
  OPERATOR.city && OPERATOR.state
    ? `the courts at ${OPERATOR.city}, ${OPERATOR.state} shall have exclusive jurisdiction`
    : `the courts of ${OPERATOR.country} shall have jurisdiction`;

const TAX_ID = OPERATOR.gstin ? ` (GSTIN ${OPERATOR.gstin})` : "";

/* ───────────────────────── Facts read from the product ───────────────────── */

/**
 * The price table in the Refund Policy, built from PLANS rather than typed out.
 *
 * "Term" comes from `billingPeriodLabel`, so a plan whose `billingMonths`
 * changes cannot leave the policy quoting the old term. Free renders as "—"
 * because "forever" is not a refundable term.
 */
const PRICE_ROWS: string[][] = PLAN_KEYS.map((plan: PlanKey) => {
  const months = PLANS[plan].billingMonths;
  return [
    PLANS[plan].label,
    // billingPeriodLabel gives "month" / "3 months" / "forever"; only a real
    // term belongs in a refund table, and a one-month term reads as "1 month".
    months <= 0 ? "—" : months === 1 ? "1 month" : billingPeriodLabel(plan),
    formatPrice(priceFor(plan, "INR"), "INR"),
    formatPrice(priceFor(plan, "USD"), "USD"),
  ];
});

/** "50 practice answers a month across Reading and Listening" — from the Free tier. */
const FREE_ALLOWANCE: string = (() => {
  const free = PLANS.free;
  const skills = free.practiceSections
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join(" and ");
  const answers = free.monthlyPracticeAnswers;
  return answers === null
    ? `unlimited practice answers across ${skills}`
    : `${answers} practice answers a month across ${skills}`;
})();

/** "Pro for one month, Premium for 3 months" — the terms actually on sale. */
const PAID_TERMS: string = OFFERED_PLANS.map((plan) => {
  const months = PLANS[plan].billingMonths;
  return `${PLANS[plan].label} for ${months === 1 ? "one month" : billingPeriodLabel(plan)}`;
}).join(", ");

/** The skills and features a paid plan adds, named from the tier that has them. */
const PAID_ONLY: string = (() => {
  const free = new Set<string>(PLANS.free.practiceSections);
  const gated = PLANS.pro.practiceSections
    .filter((s) => !free.has(s))
    .map((s) => s[0].toUpperCase() + s.slice(1));
  return gated.join(", ");
})();

/* ─────────────────────────────── Types ───────────────────────────────────── */

export type LegalTable = { columns: string[]; rows: string[][] };

/**
 * Rendered in a fixed order — intro paragraphs, table, bullets, closing note,
 * callout — so a section cannot be built that reads out of sequence. `note` is
 * what a paragraph AFTER a list needs; there is deliberately no way to
 * interleave further, because a legal section that needs that wants splitting.
 */
export type LegalSection = {
  heading: string;
  /** Stable anchor for deep links (e.g. /privacy#cookies). Slugged if omitted. */
  id?: string;
  paragraphs?: string[];
  table?: LegalTable;
  bullets?: string[];
  note?: string[];
  /** A highlighted aside. Reserved for what the reader must not miss. */
  callout?: string;
};

export type LegalDoc = {
  key: "terms" | "privacy" | "refunds";
  title: string;
  /** One line under the H1 saying what the document governs. */
  lead: string;
  updated: string;
  effective: string;
  intro: string;
  sections: LegalSection[];
};

const UPDATED = "12 September 2026";
const EFFECTIVE = "12 September 2026";

/** Stable anchor for a section — its explicit `id`, else a slug of its heading. */
export function sectionId(s: LegalSection): string {
  return (
    s.id ??
    s.heading
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  );
}

/* ─────────────────────────────── Terms of Use ────────────────────────────── */

export const TERMS: LegalDoc = {
  key: "terms",
  title: "Terms of Use",
  lead: `The agreement between you and ${COMPANY}: your account, your subscription, what our AI band scores are and are not, and who owns what.`,
  updated: UPDATED,
  effective: EFFECTIVE,
  intro: `These Terms of Use ("Terms") form a binding agreement between you and ${OPERATOR_INTRO} ("we", "us", "our"), governing your access to ${OPERATOR.site} and the ${BRAND} practice platform (together, the "Service"). By creating an account, subscribing, or otherwise using the Service, you accept these Terms and the Privacy Policy, which forms part of them. If you do not accept them, do not use the Service.`,
  sections: [
    {
      heading: "1. Who we are",
      id: "who-we-are",
      paragraphs: [
        OPERATOR.legalName
          ? `The Service is operated by ${OPERATOR.legalName}${OPERATOR.cin ? `, CIN ${OPERATOR.cin}` : ""}, a company registered in ${OPERATOR.country} and trading as ${BRAND}. Notices, requests and grievances reach us at ${CONTACT}.`
          : `The Service is operated from ${OPERATOR.country} under the trading name ${BRAND}. Notices, requests and grievances reach us at ${CONTACT}, which is monitored on business days.`,
        `${BRAND} is an independent preparation platform. IELTS is jointly owned by the British Council, IDP: IELTS Australia and Cambridge University Press & Assessment. We are not affiliated with, authorised by, endorsed by or connected to any of them, and nothing on the Service is an official IELTS product or an official IELTS result.`,
      ],
    },
    {
      heading: "2. Eligibility and age",
      id: "eligibility",
      paragraphs: [
        `You must be 18 or older to open an account on your own behalf. If you are 16 or 17, you may use the Service only with the consent of a parent or legal guardian, who accepts these Terms with you and is responsible for your use of it. Where the law requires verifiable parental consent for a person under 18 — as India's Digital Personal Data Protection Act, 2023 does — we may ask for it, and may suspend the account until it is given.`,
        `The Service is not directed at children under 16, and we do not knowingly create accounts for them.`,
      ],
    },
    {
      heading: "3. Your account",
      id: "your-account",
      paragraphs: [
        `You can sign up with an email address and password, or with Sign in with Google. Either way, one account belongs to one individual.`,
      ],
      bullets: [
        "Give accurate details — including a working email address, since verification, password resets and billing notices go there — and keep them current.",
        "Keep your password and your email inbox secure. You are responsible for everything done under your account.",
        "Do not share, sell, lend or transfer your account, or let anyone else practise on it. Accounts are personal and non-transferable.",
        `Tell us at ${CONTACT} as soon as you suspect unauthorised use.`,
        "Repeated failed sign-in attempts lock an account temporarily. That protects you rather than penalising you, and it clears by itself.",
      ],
    },
    {
      heading: "4. Acceptable use",
      id: "acceptable-use",
      paragraphs: [
        "The practice bank is the substance of what you are paying for, and these limits are what keep it available. You must not:",
      ],
      bullets: [
        "Copy, scrape, crawl, bulk-download, republish, resell or redistribute any passage, question, audio, transcript, answer key, model answer or report from the Service, in any medium — including in a course, coaching class, app or social post of your own.",
        "Use automated means — scripts, bots, headless browsers, extensions — to access the Service, or circumvent any rate limit, usage cap or plan gate.",
        "Share credentials, resell access, or run a class, batch or group from a single account. Institutions and coaching centres must use a partner account.",
        "Probe, scan, reverse-engineer, decompile or interfere with the Service, its security or its infrastructure, or try to reach data that is not yours.",
        "Upload anything unlawful, defamatory, hateful, obscene, infringing or malicious, or any recording containing another person's voice without their consent.",
        "Impersonate anyone, or use anything from the Service to mislead another party about an IELTS score.",
      ],
    },
    {
      heading: "5. Fair use, rate limits and enforcement",
      id: "fair-use",
      paragraphs: [
        `The Service applies per-minute, per-day and per-account limits, most tightly on AI scoring, because every evaluation costs us real money at a third-party provider. Ordinary preparation never reaches them. Repeatedly exceeding them is treated as abuse: it is logged, and an account that continues after the limit has been applied may be deactivated automatically.`,
        `If we suspend or deactivate your account for a breach of these Terms, you lose access without a refund for the rest of the term. If we have got it wrong, write to us — a person will look at it, and we will restore both the account and the time you lost.`,
      ],
    },
    {
      heading: "6. Plans, billing and renewals",
      id: "billing",
      paragraphs: [
        `The Free plan needs no payment. Paid plans are sold as fixed terms — ${PAID_TERMS} — and billed in advance through Razorpay, our payment gateway. Candidates in India are billed in Indian rupees; candidates elsewhere are quoted in US dollars. The amount shown on the pricing page at the moment of checkout is the amount charged, inclusive of any tax we are required to collect${TAX_ID}. Card and UPI details are handled by Razorpay and never reach us.`,
        `Paid plans renew automatically at the end of each term, at the then-current price, until you cancel. You can cancel auto-renewal yourself at any time from Settings: cancellation takes effect at the end of the term you have already paid for, so you keep full access until then and are not charged again.`,
        `We may change prices. A change never affects a term you have already paid for — it applies from your next renewal, and if the price you pay is going up we will email you before that renewal. Promotional prices apply for the term stated and renew at the standard price unless we say otherwise.`,
        `If a renewal payment is declined we may retry it and will email you. When a paid term expires unpaid, the account simply reverts to the Free plan. Refunds are governed by our Refund Policy.`,
      ],
    },
    {
      heading: "7. AI band scores and feedback",
      id: "ai-scores",
      paragraphs: [
        `Writing answers are scored by a large language model. Speaking recordings are transcribed and assessed by an automated speech-evaluation service. Both return a band estimate and written feedback against the four official IELTS criteria.`,
        `These are practice estimates produced by software. They are not IELTS results, they are not produced or reviewed by an IELTS examiner, and they carry no standing with the British Council, IDP: IELTS Australia, Cambridge University Press & Assessment, or any university, employer or immigration authority. Only the official test partners can award an IELTS band.`,
        `An automated score can be wrong in either direction and can differ from the band you receive in a real test. Treat it as a signal for where to work next, not as a prediction. We give no warranty as to the accuracy of any band estimate or feedback, and we do not guarantee any score, outcome, visa, admission or improvement. Decisions you take on the strength of a practice score — including when to book your test — are yours.`,
      ],
      callout: `No score on ${BRAND} is an official IELTS score. Where a band actually matters for an application, sit the real test.`,
    },
    {
      heading: "8. Intellectual property",
      id: "ip",
      paragraphs: [
        `Everything we provide — practice passages, questions, audio, answer keys, explanations, model answers, band descriptor commentary, lessons, reports, software, design, and the ${BRAND} name and logo — is owned by ${COMPANY} or licensed to us, and protected by copyright and other laws. Your subscription buys a personal, non-exclusive, non-transferable, revocable licence to use it for your own exam preparation, and grants no other right. Nothing in it transfers ownership.`,
        `Third-party marks, including IELTS, belong to their respective owners and are used only to describe what the Service prepares you for.`,
      ],
    },
    {
      heading: "9. Your content",
      id: "your-content",
      paragraphs: [
        `Your answers — essays, letters, Speaking recordings and the transcripts of them — remain yours. You grant us a worldwide, royalty-free licence to store, process, transcribe, score and display them back to you, and to pass them to the sub-processors named in our Privacy Policy, strictly so that we can provide the Service to you, support you, and keep it secure and working. That licence ends when the content is deleted.`,
        `You confirm that you have the right to submit what you submit, and that a recording you upload is of your own voice.`,
        `We do not publish your answers, sell them, or use them as marketing material. We do not train our own models on them, and the providers we send them to are engaged to process them for us, not for themselves.`,
      ],
    },
    {
      heading: "10. Availability and changes to the Service",
      id: "availability",
      paragraphs: [
        `We work to keep the Service available, but we do not promise uninterrupted or error-free operation — maintenance, third-party outages and faults happen. We may add, change or withdraw features, content and question sets as the exam format and our content evolve; where a change materially reduces what a paid plan offers, we will tell subscribers.`,
        `To the fullest extent the law allows, the Service is provided "as is" and "as available", without warranties of any kind, express or implied, including implied warranties of merchantability, fitness for a particular purpose and non-infringement.`,
      ],
    },
    {
      heading: "11. Limitation of liability",
      id: "liability",
      paragraphs: [
        `To the maximum extent permitted by law, we are not liable for indirect, incidental, special, punitive or consequential loss, or for lost profits, lost opportunity, exam or visa outcomes, wasted test fees, or loss or corruption of data, arising from or connected with your use of the Service — whether or not we were warned such loss was possible.`,
        `Our total liability for all claims, in aggregate, is limited to the amount you actually paid us in the twelve months before the event giving rise to the claim, or ₹5,000 (or its equivalent) if you have paid us nothing.`,
        `Nothing here excludes liability that cannot lawfully be excluded, including for fraud, for death or personal injury caused by negligence, or any right you hold under consumer protection law.`,
      ],
    },
    {
      heading: "12. Indemnity",
      id: "indemnity",
      paragraphs: [
        `You agree to indemnify us against claims, losses and reasonable costs arising from your breach of these Terms, your misuse of the Service, or content you submit that infringes someone else's rights.`,
      ],
    },
    {
      heading: "13. Termination",
      id: "termination",
      paragraphs: [
        `You may stop using the Service at any time, cancel auto-renewal from Settings, and ask us to delete your account and data by emailing ${CONTACT} from your account address. Deletion is permanent: your practice history, scores and recordings go with it and cannot be restored.`,
        `We may suspend or terminate your access — with notice where that is practical — if you breach these Terms, if your use puts the Service or other candidates at risk, if payment is not made, or if the law requires it. The sections that by their nature should outlast the agreement do: intellectual property, liability, indemnity and governing law.`,
      ],
    },
    {
      heading: "14. Changes to these Terms",
      id: "changes",
      paragraphs: [
        `We may update these Terms, and the "last updated" date above always identifies the current version. For a material change we will give notice in the Service or by email before it takes effect, and for subscribers such a change takes effect no earlier than the next renewal. Continuing to use the Service after a change takes effect means you accept it; if you do not, cancel and stop using the Service.`,
      ],
    },
    {
      heading: "15. Governing law and disputes",
      id: "governing-law",
      paragraphs: [
        `These Terms are governed by the laws of ${OPERATOR.country}, without regard to conflict-of-law rules, and ${VENUE}. If you are a consumer resident elsewhere, this does not deprive you of the protection of the mandatory consumer law of your country of residence, or of any right that law gives you to bring proceedings there.`,
        `Before starting formal proceedings, please write to us at ${CONTACT}. Nearly everything is resolved faster that way, and grievances have a route of their own (below).`,
      ],
    },
    {
      heading: "16. General",
      id: "general",
      bullets: [
        "These Terms, with the Privacy Policy and Refund Policy, are the entire agreement between us about the Service.",
        "If any provision is held unenforceable, the rest stands, and that provision is read down to the minimum extent needed to make it valid.",
        "Our not enforcing a provision is not a waiver of it.",
        "You may not assign these Terms. We may assign them to a successor in a merger, acquisition or reorganisation.",
        "Neither party is liable for a failure caused by events beyond its reasonable control.",
        "These Terms are written in English, and the English text governs if they are translated.",
      ],
    },
    {
      heading: "17. Grievances and contact",
      id: "contact",
      paragraphs: [
        `For anything at all — support, billing, a complaint about content, a takedown request, or a data request — email ${CONTACT}. Please write from your account email address so we can identify you, and include enough detail for us to act.`,
        `${OPERATOR.grievanceOfficer} handles grievances, in line with India's Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 and the Consumer Protection (E-Commerce) Rules, 2020. We acknowledge a grievance within 48 hours of receiving it and resolve it within 30 days.`,
      ],
    },
  ],
};

/* ─────────────────────────────── Privacy Policy ──────────────────────────── */

export const PRIVACY: LegalDoc = {
  key: "privacy",
  title: "Privacy Policy",
  lead: "Exactly what we collect, every company we send it to, how long we keep it, and how to get it back or have it erased.",
  updated: UPDATED,
  effective: EFFECTIVE,
  intro: `This Privacy Policy explains how ${OPERATOR_INTRO} handles your personal data when you use ${OPERATOR.site}. ${OPERATOR.legalName ? `${OPERATOR.legalName} is` : "We are"} the data fiduciary under India's Digital Personal Data Protection Act, 2023 and the data controller under the UK and EU GDPR. It is written to be read rather than survived: if anything here is unclear, email ${CONTACT} and we will explain it.`,
  sections: [
    {
      heading: "1. The short version",
      id: "summary",
      bullets: [
        "We collect what an account needs, what practice produces, and what keeps the account secure. Nothing for advertising.",
        "Your essays go to one AI provider and your Speaking recordings to another, to be scored. Nobody else receives them.",
        "We use Google Analytics and Microsoft Clarity, and Clarity records how a pointer moves through our pages. You can switch both off without losing anything.",
        "We never sell your data, never give it to advertisers, and never train our own models on your answers.",
        `One email — ${CONTACT} — gets you a copy of your data, a correction, or permanent deletion.`,
      ],
    },
    {
      heading: "2. Data we collect",
      id: "data-we-collect",
      paragraphs: [
        "Everything below is either given by you, produced by your use of the Service, or recorded automatically for security. We collect no special-category data, and we ask for no identity document or photograph.",
      ],
      table: {
        columns: ["Category", "What it includes", "Why we hold it"],
        rows: [
          [
            "Account",
            "Name, email address, whether that email is verified, contact phone number, and either a bcrypt hash of your password or your Google account identifier if you use Sign in with Google. We never hold the password itself.",
            "To create and secure your account, and to contact you about it.",
          ],
          [
            "Study profile",
            "Target module (Academic or General Training), target band, planned exam date, country, profile picture. All optional except the module.",
            "To show the right content, price in your currency, and pace your preparation.",
          ],
          [
            "Practice content",
            "Your written answers, your Speaking audio recordings, the transcripts made from them, your Reading and Listening responses, the AI band estimates, the criterion-by-criterion feedback, and your attempt and mock test history.",
            "To score your work, show your history and track progress. This is the Service.",
          ],
          [
            "Billing",
            "Plan, term expiry, your Razorpay customer identifier, and a ledger row per payment — amount, currency, status, timestamps. Card and UPI details go straight to Razorpay; we never see or store them.",
            "To give you the plan you bought, and to keep lawful books of account.",
          ],
          [
            "Security and audit",
            "IP address and browser user-agent at sign-in and per session, sign-in and sign-out events, failed-attempt counts and temporary lock state, password change times, and a deactivation reason if an account is disabled.",
            "To detect and stop unauthorised access and abuse, and to show you your own active sessions.",
          ],
          [
            "Usage analytics",
            "Pages viewed, features used, device, approximate city-level location derived from IP, and — through Microsoft Clarity — a replay of pointer movement, clicks and scrolling on our pages.",
            "To find where the Service confuses people, and fix it.",
          ],
        ],
      },
    },
    {
      heading: "3. Why we are allowed to process it",
      id: "legal-basis",
      paragraphs: [
        "The GDPR requires us to name a legal basis for each purpose; the DPDP Act relies on consent or on certain legitimate uses. In both cases what we rely on is:",
      ],
      bullets: [
        "Performance of our contract with you — running your account, storing your practice, scoring your answers, taking payment, giving support. Without this processing there is no Service.",
        "Our legitimate interests — securing accounts, preventing abuse and fraud, keeping the platform reliable, and reading aggregate usage to improve it. We weigh these against your rights and use the least data that works.",
        "Your consent — analytics and session replay, optional profile details, and any marketing email. You can withdraw consent at any time, and doing so does not affect what was lawful before.",
        "Legal obligation — keeping tax and accounting records, and answering lawful requests.",
      ],
    },
    {
      heading: "4. How we use it",
      id: "how-we-use",
      bullets: [
        "Provide practice, mock tests, AI band scoring and criterion feedback.",
        "Maintain your account, history, progress reports and active sessions.",
        "Take payment, manage renewals and cancellations, and handle refunds.",
        "Send service email you cannot opt out of while you hold an account: email verification, password reset and change notices, receipts, and notices about your subscription or these policies.",
        "Send study tips and product news only if you asked for them. Every such email carries an unsubscribe link.",
        "Answer your support messages.",
        "Detect, investigate and stop abuse, scraping, account sharing and fraud.",
        "Understand in aggregate which parts of the Service work, and repair the parts that do not.",
      ],
      note: [
        "We make no decision about you by purely automated means that has a legal or similarly significant effect. An AI band estimate affects nothing but your own practice, and no automated score is used to deny you the Service. Deactivation for repeated rate-limit abuse is automated but reversible — write to us and a person will review it.",
      ],
    },
    {
      heading: "5. Who we share it with",
      id: "sub-processors",
      paragraphs: [
        "We do not sell personal data, and we share none of it with advertisers or data brokers. We use the providers below to run the platform. Each processes data only on our instructions, for the purpose named, under its own data processing terms.",
      ],
      table: {
        columns: ["Provider", "What it processes", "Where"],
        rows: [
          [
            "Vercel Inc.",
            "Hosts and serves the application. Every request passes through it, so it processes your IP address and request metadata in transit.",
            "United States, and its global edge network",
          ],
          [
            "Neon Inc. (managed PostgreSQL)",
            "The database of record: account, study profile, answers, transcripts, scores, billing ledger and audit log.",
            "United States",
          ],
          [
            "Amazon Web Services (S3)",
            "Stores your Speaking audio recordings in a private bucket, reachable only by short-lived presigned link.",
            "United States (us-east-1)",
          ],
          [
            "Automated speech evaluation provider",
            "Receives a presigned link to a single Speaking recording, transcribes it, and returns pronunciation, fluency and band assessment. The audio is fetched straight from storage and does not pass back through our servers.",
            "Outside India",
          ],
          [
            "Automated writing evaluation provider",
            "Receives your Writing Task 1 and Task 2 answers and returns a band estimate with criterion feedback. Sent over an API whose inputs the provider does not use to train its models.",
            "United States",
          ],
          [
            "Razorpay Software Private Limited",
            "Takes payment and runs subscriptions. Receives your name, email, phone and payment instrument, which it — not we — stores.",
            "India",
          ],
          [
            "Google LLC (Sign in with Google)",
            "When you choose it, Google confirms your identity and passes us your name, email address and account identifier.",
            "United States",
          ],
          [
            "Google Analytics 4 (Google LLC)",
            "Aggregate usage analytics: pages, events, device, approximate location from IP.",
            "United States",
          ],
          [
            "Microsoft Clarity (Microsoft Corporation)",
            "Session replay and heatmaps: pointer movement, clicks and scrolling on our pages.",
            "United States",
          ],
          [
            "Email delivery provider (SMTP)",
            "Delivers transactional email — verification, password reset, receipts, service notices.",
            "Varies by provider",
          ],
        ],
      },
      note: [
        "We may also disclose data where the law compels it, to establish or defend a legal claim, or to a successor in a merger or acquisition — in which case this policy continues to apply to it. We will tell you before any such transfer takes effect.",
      ],
    },
    {
      heading: "6. Cookies",
      id: "cookies",
      paragraphs: [
        "A cookie is set on this site for one of three reasons: to keep you signed in, to finish a sign-in or a payment you started, or — for the two analytics tools — to count and replay visits. We run no advertising, retargeting or cross-site tracking cookies, and no ad network has a tag on this site.",
      ],
      table: {
        columns: ["Cookie", "Set by", "Purpose", "Lifetime"],
        rows: [
          [
            "__Host-ielts_session",
            "Us — strictly necessary",
            "Keeps you signed in. Holds a random opaque token, of which only a SHA-256 hash is stored on our servers, so the cookie cannot be reconstructed from our database. HttpOnly, Secure, SameSite=Lax, and carries the __Host- prefix so no subdomain or script can reach it.",
            "Expires after 7 days unused, and always after 30 days. Cleared on sign-out.",
          ],
          [
            "g_oauth_state",
            "Us — strictly necessary",
            "Written only when you choose Sign in with Google, and only for the length of that redirect. It holds a random value that Google hands back to us, which is how we know the sign-in returning to us is the one you started rather than a forged request. HttpOnly, and says nothing about you.",
            "10 minutes",
          ],
          [
            "_ga, _ga_*",
            "Google Analytics",
            "Distinguishes visitors and sessions for aggregate reporting.",
            "Up to 2 years",
          ],
          [
            "_clck, _clsk, CLID, ANONCHK, MR, SM",
            "Microsoft Clarity",
            "Ties a session replay and heatmap data to a returning browser.",
            "1 day to 1 year, depending on the cookie",
          ],
          [
            "Razorpay checkout cookies",
            "Razorpay",
            "Set on razorpay.com rather than on this site, when the payment window opens. They carry your checkout session and Razorpay's own fraud checks, and are governed by Razorpay's privacy policy, not this one. The checkout script loads only when you start a payment — it is on no other page of the site.",
            "Set and controlled by Razorpay",
          ],
        ],
      },
      bullets: [
        "To refuse the analytics cookies: block third-party cookies or add an exception for this site in your browser settings, use a content blocker, or install Google's official Analytics opt-out add-on. Nothing about the Service changes if you do.",
        "The two strictly-necessary cookies cannot be refused while you are signing in or signed in — sign out, or browse without an account, to be rid of them. Neither carries any information about you: one is a random token, the other a random anti-forgery value.",
        "We honour Global Privacy Control and Do Not Track signals where the provider supports them, and in any case we do not use cookies to build an advertising profile of you.",
      ],
    },
    {
      heading: "7. Data kept in your browser",
      id: "browser-storage",
      paragraphs: [
        "Separately from cookies, the Service keeps a few things in your own browser's local and session storage. These are not cookies: they are never attached to a request, never sent to us, and cannot be read from our servers. Clearing your browser's data for this site removes all of them.",
      ],
      table: {
        columns: ["What is stored", "Why", "Kept until"],
        rows: [
          [
            "Your draft answers to a practice set",
            "So that a refresh, a dropped connection or a closed tab does not cost you work you have already typed.",
            "The set is submitted, or you clear site data",
          ],
          [
            "The page of a set you last had open",
            "So you resume where you stopped instead of at the beginning.",
            "You clear site data",
          ],
          [
            "Your exam text size",
            "So the reading size you chose persists between sittings.",
            "You clear site data",
          ],
          [
            "Your Listening playback volume",
            "So audio starts at the level you last set.",
            "You clear site data",
          ],
          [
            "The position of the passage/questions divider",
            "So the split you dragged in the exam view is still there next time.",
            "You clear site data",
          ],
          [
            "Whether the opening animation has played",
            "So it does not replay on every page you visit.",
            "You close the tab",
          ],
        ],
      },
      callout:
        "Your unsubmitted drafts sit in your own browser, not on our servers. On a shared or public computer, sign out and clear the site's data when you finish — that is what removes them.",
    },
    {
      heading: "8. International transfers",
      id: "transfers",
      paragraphs: [
        `Most providers above operate in the United States, so your data is transferred out of ${OPERATOR.country} and, if you are in the EEA or UK, out of those areas. We rely on the European Commission's Standard Contractual Clauses (with the UK Addendum where relevant) or the provider's certification under the EU–US Data Privacy Framework, together with encryption in transit and at rest, and we send only what each provider needs to do its job.`,
        "Ask us and we will tell you which safeguard covers a specific provider.",
      ],
    },
    {
      heading: "9. If an institution created your account",
      id: "partners",
      paragraphs: [
        "Some candidates are enrolled by a coaching centre, school or agent holding a partner account that pays for their access. If yours was, that institution can see your name, email address, phone number, how many attempts you have made and your band scores, and it can create or suspend your access. It cannot listen to your Speaking recordings or read your individual answers.",
        "We act on the institution's instructions for the enrolment itself, and the institution is responsible for having told you it was enrolling you. If you would rather it did not see your results, ask us to detach the account: it becomes an ordinary personal account and keeps your history.",
      ],
    },
    {
      heading: "10. How long we keep it",
      id: "retention",
      table: {
        columns: ["Data", "Kept for"],
        rows: [
          [
            "Account, study profile, practice answers, recordings, transcripts and scores",
            "As long as your account exists. Deleted when you ask us to delete the account.",
          ],
          [
            "Sign-in sessions",
            "Expire automatically after 7 days idle or 30 days absolute, whichever comes first. Deleted at once on sign-out or when you revoke a session.",
          ],
          [
            "Email verification and password reset tokens",
            "Single use, expiring shortly after being issued, and stored only as a hash.",
          ],
          [
            "Security and audit events",
            "Up to 12 months, so unauthorised access can be investigated; then deleted.",
          ],
          [
            "Payment ledger and invoices",
            "As long as tax and accounting law requires books of account to be kept — up to 8 years in India. These rows survive account deletion because the law requires it, reduced to what a record of payment needs.",
          ],
          [
            "Analytics and session replay",
            "Per the provider's own retention: up to 14 months in Google Analytics, up to 30 days in Microsoft Clarity.",
          ],
        ],
      },
      note: [
        "Encrypted backups roll over on their own schedule, so deleted data can persist in a backup for a short period after deletion, until it is overwritten.",
      ],
    },
    {
      heading: "11. Your rights",
      id: "your-rights",
      paragraphs: [
        `Wherever you live, we honour the following. Email ${CONTACT} from your account address; we reply within 30 days, and charge nothing.`,
      ],
      bullets: [
        "Access — a copy of the personal data we hold about you, including your practice history.",
        "Correction — fix anything inaccurate. Most of it you can edit yourself in Settings.",
        "Erasure — permanent deletion of your account, answers, recordings and scores. We will tell you what we must keep for tax purposes, and why.",
        "Portability — your data in a machine-readable format.",
        "Withdraw consent — switch off analytics, marketing email or optional profile fields at any time.",
        "Object or restrict — ask us to stop or limit processing that rests on our legitimate interests.",
        "Nominate — under the DPDP Act, name someone to exercise these rights for you if you die or become incapable of exercising them.",
        "Complain — to us first, please; and to your data protection authority if we fail you, whether that is the Data Protection Board of India, the UK Information Commissioner's Office, or your EEA supervisory authority.",
      ],
      callout:
        "Deletion is irreversible. Once your practice history and recordings are erased we cannot bring them back, so export anything you want to keep before you ask.",
    },
    {
      heading: "12. Security",
      id: "security",
      bullets: [
        "Passwords are stored only as bcrypt hashes, never in plain text or any reversible form.",
        "Session tokens are random, opaque, stored only as SHA-256 hashes, carry both an idle and an absolute expiry, and can be revoked.",
        "All traffic is served over HTTPS, under a strict Content Security Policy with a per-request nonce.",
        "Speaking recordings sit in a private bucket and are reachable only through short-lived presigned links.",
        "Repeated failed sign-ins lock an account temporarily, rate limits cap how fast any account can be used, and security-relevant events are logged.",
        "Access to production data is limited to those who need it.",
      ],
      note: [
        `No system is perfectly secure and we do not claim otherwise. If a breach affects your personal data we will notify you and the relevant authority as the law requires — under the DPDP Act and the CERT-In directions in India, and within 72 hours under the GDPR. If you think you have found a vulnerability, please report it privately to ${CONTACT} and give us the chance to fix it.`,
      ],
    },
    {
      heading: "13. Children",
      id: "children",
      paragraphs: [
        "The Service is for candidates aged 18 and over, and for 16- and 17-year-olds with a parent or guardian's consent. We do not knowingly collect data from anyone under 16, we do not track or profile a child for advertising, and we serve no behavioural advertising to anyone. If you believe a child has given us data, email us and we will delete it.",
      ],
    },
    {
      heading: "14. Changes to this policy",
      id: "changes",
      paragraphs: [
        "We keep this page current, and the date above tells you which version you are reading. If a change materially affects how we use your data we will tell you in the Service or by email before it takes effect, and where consent is the basis we rely on, we will ask for it again.",
      ],
    },
    {
      heading: "15. Contact and grievances",
      id: "contact",
      paragraphs: [
        `Email ${CONTACT} with any privacy request or question. Write from your account address, and say what you would like us to do.`,
        `${OPERATOR.grievanceOfficer} is our grievance contact for the purposes of India's Information Technology Rules, 2021 and the Digital Personal Data Protection Act, 2023, at the same address. We acknowledge within 48 hours and resolve within 30 days.`,
      ],
    },
  ],
};

/* ─────────────────────────────── Refund Policy ───────────────────────────── */

export const REFUNDS: LegalDoc = {
  key: "refunds",
  title: "Refund Policy",
  lead: "A 7-day refund on your first paid term if the platform is not for you, and a plain account of when it does not apply.",
  updated: UPDATED,
  effective: EFFECTIVE,
  intro: `This Refund Policy applies to every subscription bought on ${OPERATOR.site} and forms part of our Terms of Use. It is written so that you can tell, before you pay, exactly where you stand afterwards.`,
  sections: [
    {
      heading: "1. Try it before you pay",
      id: "free-plan",
      paragraphs: [
        `The Free plan needs no card and does not expire. It gives you ${FREE_ALLOWANCE}, so you can judge the question bank, the interface and the timing for yourself. It does not include AI band scoring, ${PAID_ONLY} or mock tests — those are what a paid plan is for.`,
        "Because that plan exists, we expect you to have tried it before subscribing, which makes the refund below a safety net rather than a trial.",
      ],
    },
    {
      heading: "2. The 7-day refund",
      id: "window",
      paragraphs: [
        "If a paid plan turns out not to be right for you, ask within 7 days of your first payment on the account and we will refund it in full, provided you have not substantially consumed what you bought. In practice that means both of:",
      ],
      bullets: [
        "fewer than 3 AI-scored evaluations used — Writing submissions or Speaking recordings that came back with a band, and",
        "no full mock test completed.",
      ],
      callout:
        "Ask even if you are over that line. If you were charged for something you did not mean to buy, or the platform genuinely did not work for you, we would rather sort it out than stand behind a threshold.",
    },
    {
      heading: "3. What a term costs",
      id: "prices",
      paragraphs: ["So there is no doubt about the amount at stake:"],
      table: {
        columns: ["Plan", "Term", "Price in India", "International price"],
        rows: PRICE_ROWS,
      },
      bullets: [
        `The price shown at checkout is what is charged, inclusive of any tax we are required to collect${TAX_ID}. A struck-through figure is the standard price, not a price anyone is charged.`,
        "Candidates billed in India pay in rupees; everyone else is quoted in US dollars. A refund is made in the currency and to the instrument you paid with, and we cannot cover exchange-rate movement or a bank charge between the two dates.",
      ],
    },
    {
      heading: "4. How to request one",
      id: "how-to-request",
      paragraphs: [`Email ${CONTACT} from your account email address within the window, with:`],
      bullets: [
        "the account email address you subscribed with,",
        "the Razorpay payment or order id from your receipt, if you have it, and",
        "one line on what went wrong — not a justification, just so we can fix it.",
      ],
    },
    {
      heading: "5. How long it takes",
      id: "timeline",
      bullets: [
        "We acknowledge your request within 48 hours.",
        "We decide within 5 business days and tell you either way, with a reason if we decline.",
        "An approved refund is issued through Razorpay to your original payment method. Razorpay and your bank then take 5–10 business days for the money to appear — usually faster for UPI and cards — and we cannot speed up that leg.",
        "Paid access ends when the refund is issued and the account reverts to the Free plan. Your practice history stays, so nothing you have already done is lost.",
      ],
    },
    {
      heading: "6. When a refund is not available",
      id: "exclusions",
      bullets: [
        "Requests made more than 7 days after the first payment on the account.",
        "Terms in which you have already had 3 or more AI-scored evaluations or completed a mock test — the value was delivered.",
        "Renewal charges. You can cancel auto-renewal at any time from Settings, and we email before any price rise, so a renewal you forgot is not by itself refundable.",
        "A second or later refund on the same account, or an account we conclude is being cycled to reuse the refund window.",
        "The unused remainder of a term. We do not pro-rate, because you keep full access to the end of a term you have paid for.",
        "Accounts terminated for a breach of our Terms of Use.",
        "Access bought for you by a coaching centre, school or agent on a partner account — ask them; their agreement with us governs it.",
        "Dissatisfaction with a band estimate. AI scores are practice estimates by design and we say so before you buy; they are not, and cannot be, an official IELTS result.",
      ],
      note: [
        "Two things we refund in every case, inside the window or outside it: a duplicate charge for the same term, and a charge you did not authorise. Tell us and we return it without argument.",
      ],
    },
    {
      heading: "7. Cancelling instead",
      id: "cancelling",
      paragraphs: [
        "Cancelling and refunding are different things. Cancel auto-renewal in Settings and you keep everything you paid for until the term ends, and are never charged again — no email to us, no waiting. If you already know you do not want another term, cancel the moment you decide, and there is nothing to refund.",
      ],
    },
    {
      heading: "8. Failed or interrupted payments",
      id: "failed-payments",
      paragraphs: [
        "If money left your account but the plan did not activate, do not pay again — email us with the payment id. Razorpay sometimes reports a single charge to us more than once, and our records are keyed so that one payment can only ever grant one term. A genuine duplicate is refunded in full.",
      ],
    },
    {
      heading: "9. Your statutory rights",
      id: "statutory-rights",
      paragraphs: [
        "This policy sits on top of the law, never instead of it. Nothing here limits a cancellation or refund right you hold as a consumer where you live — including the right of withdrawal for distance contracts in the EEA and UK, and rights under India's Consumer Protection Act, 2019. Where the law gives you more than this policy does, the law wins.",
      ],
    },
    {
      heading: "10. Grievances and contact",
      id: "contact",
      paragraphs: [
        `Refund questions, and anything you are unhappy with, go to ${CONTACT}.`,
        `If a refund decision is not resolved to your satisfaction, escalate it to ${OPERATOR.grievanceOfficer} at the same address. In line with the Consumer Protection (E-Commerce) Rules, 2020, we acknowledge a grievance within 48 hours and resolve it within 30 days.`,
      ],
    },
  ],
};

export const LEGAL_BY_KEY = { terms: TERMS, privacy: PRIVACY, refunds: REFUNDS } as const;
