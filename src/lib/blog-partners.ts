import type { BlogPost } from "./blog-types";

/**
 * Cluster: B2B — institutes, consultancies and trainers.
 *
 * WHY THIS CLUSTER EXISTS AND WHY IT IS DIFFERENT FROM EVERY OTHER ONE.
 *
 * Every other post on this site is written for a candidate. These ten are
 * written for the person who BUYS FOR candidates — a coaching institute owner,
 * a study-abroad consultant, a freelance trainer. The reader has a budget, a
 * cohort and a competitor, and converts to `/partners`, not to a free account.
 *
 * On 15 Sep 2026 `src/lib/keywords.ts` had 430 long-tail terms across 17
 * clusters and NOT ONE of them was B2B — every page on the domain spoke to
 * candidates. So this cluster cannibalises nothing; it opens a second market on
 * a domain that already ranks. See INSTITUTE_LONG_TAIL in keywords.ts for the
 * term inventory these posts were built from.
 *
 * ── THE TWO RULES THAT KEEP THIS HONEST ────────────────────────────────────
 *
 * 1. NEVER NAME OR RANK A COMPETITOR. Inherited from `blog-practice.ts` and it
 *    matters more here, because the category is crowded and the temptation to
 *    write "X vs us" is strong. We win these queries by publishing the real
 *    evaluation criteria — the questions a buyer should ask ANY vendor,
 *    including us — not by attacking named products.
 *
 * 2. WHITE-LABELLING IS ENQUIRY-GATED, AND THE COPY MUST SAY SO.
 *    Every serious competitor in this category sells white-label. We do not
 *    have it: on 15 Sep 2026 a grep for white-label, custom-domain, logo or
 *    brand fields across `src/` returned nothing, and `/partner` is
 *    IELTSVega-branded on every screen. The keyword demand is real and worth
 *    ranking for, so these posts DO discuss white-labelling — always as
 *    something a partner asks for and we scope with them, never as a feature
 *    that is live today. Use WHITE_LABEL_OFFER below verbatim rather than
 *    improvising, so one product decision lives in one place.
 *
 *    If white-labelling ever ships, change WHITE_LABEL_OFFER and the claim
 *    updates across all ten posts at once.
 *
 * CLAIMS ABOUT THE PRODUCT stay to what it actually does, exactly as in the
 * practice cluster: instant AI band scores on Writing and Speaking against the
 * four official criteria, full timed mock tests, 15,000+ Academic and General
 * Training questions, free to start — plus the partner-only mechanics that
 * `/partners` already promises: a wholesale rate per partner, enrolling a
 * student from the panel, a roster showing attempts, mocks and average band,
 * and paying for a plan on a student's behalf. No joining fee, no minimum.
 *
 * EVERY POST ENDS AT `/partners`. The in-body `links` are what actually pass
 * equity, so the anchor text carries the target query rather than "learn more".
 */

/**
 * The single source of truth for how white-labelling is described.
 *
 * It promises a conversation, not a product — which is the only honest thing to
 * publish while the capability does not exist. Do not paraphrase it per post.
 */
const WHITE_LABEL_OFFER =
  "Want the platform under your own name? White-labelling — your logo, your colours and your own subdomain — is available to partners on an annual arrangement rather than as a self-serve switch, because each one is set up with you. Mention it on the partner application and we will scope it before you commit to anything.";

export const PARTNER_POSTS: BlogPost[] = [
  /* ================================================================== *
   * 1. Head term. "IELTS software for coaching institutes" is the query
   *    the whole category bids on, and the one every competitor's
   *    landing page targets. We win it by answering the buying question
   *    honestly instead of listing our own features.
   * ================================================================== */
  {
    slug: "ielts-software-for-coaching-institutes",
    seoTitle: "IELTS Software for Coaching Institutes (2026)",
    title: "IELTS software for coaching institutes: what to look for in 2026",
    excerpt:
      "What an IELTS institute actually needs from software: real mock delivery, AI band scores, a working roster, and the eight questions to ask any vendor first.",
    category: "For institutes",
    date: "September 2026",
    publishedAt: "2026-09-15",
    readMins: 11,
    keywords: [
      "ielts software for coaching institutes",
      "ielts institute software",
      "ielts software for institutes",
      "ielts platform for coaching centres",
      "mock test software for ielts institute",
      "ielts coaching software",
      "ielts lms for institutes",
      "software for ielts training centre",
    ],
    sections: [
      {
        paragraphs: [
          "Most IELTS institutes buy software twice. The first purchase is made on a demo call, against a feature list, and it is abandoned within a year — not because the software was bad, but because it solved a problem the institute did not actually have. The second purchase is made after the owner has worked out what the bottleneck really is.",
          "This article is an attempt to save you the first purchase. It sets out what an IELTS coaching institute genuinely needs from a platform, what is merely nice to have, and the questions worth asking every vendor — including us.",
        ],
      },
      {
        heading: "First, separate the two products you are being sold",
        paragraphs: [
          "The phrase \"IELTS institute software\" covers two completely different categories, and buying the wrong one is the most common and most expensive mistake in this market.",
        ],
        bullets: [
          "Institute management software runs your business: enquiries, admissions, attendance, fee collection, reminders, staff. It does not teach anybody anything and it has no test content.",
          "Test-delivery and practice software runs your teaching: exam-accurate mocks, sectional practice, automatic scoring, student progress. It does not collect your fees.",
          "A few products claim both. Read the demo carefully and work out which half is mature and which half was bolted on, because one of them almost always was.",
        ],
      },
      {
        heading: "The bottleneck is almost always marking, not content",
        paragraphs: [
          "Ask an institute owner what limits their intake and they will usually say classroom space or trainers. Ask them where their trainers' hours actually go and the answer is marking — specifically Writing and Speaking.",
          "A trainer who marks a Task 2 essay properly against the four criteria spends ten to fifteen minutes on it. Thirty students, two essays a week, is ten to fifteen hours of marking for one batch. That is the real ceiling on how many students an institute can take, and no amount of extra question content moves it.",
          "This is why automatic band scoring on the productive skills matters more than the size of a question bank. Reading and Listening mark themselves — every platform can do that, and a platform that boasts about it is telling you what it does not do. The question worth asking is what happens to an essay and a recorded Part 2 answer.",
        ],
      },
      {
        heading: "The eight questions to ask any IELTS platform vendor",
        bullets: [
          "Does it score Writing and Speaking automatically, and against which criteria? \"AI feedback\" is not a band score. Ask to see the four official criteria named on the report.",
          "Can a trainer override an AI score? Your experienced trainers will disagree with the machine sometimes, and they should win.",
          "Is the mock test timed and sectioned like the real computer-delivered exam, including the Listening transfer time and the Writing word counter?",
          "Both Academic and General Training? A great many institutes teach both and discover too late that the platform only really covers one.",
          "How does a student get an account? If the answer involves invite emails the student has to find and click, expect to lose a fifth of every batch to it.",
          "What does one screen show you about a whole batch? If there is no single roster with attempts, mocks and average band per student, class reviews stay manual.",
          "What does it cost per student, and what happens to unused seats when a batch ends?",
          "Can you leave? Ask how you export student results, and in what format, before you have any.",
        ],
      },
      {
        heading: "What a good roster actually looks like",
        paragraphs: [
          "The difference between a platform an institute uses and one it pays for and forgets is almost always the roster. A trainer running a batch of thirty needs to answer one question at a glance on Monday morning: who has not practised, and who is stuck?",
          "If answering that takes more than one screen — if it means opening each student in turn, or exporting to a spreadsheet — the feature exists on the pricing page but not in practice. Ask the vendor to show you the roster with thirty students on it, not three.",
        ],
      },
      {
        heading: "Content volume is the easiest number to inflate",
        paragraphs: [
          "Question counts are the least trustworthy figure in this category. A platform claiming a hundred thousand questions has usually counted every individual gap in every completion exercise, or recycled the same passages across modules.",
          "A more useful test: ask how many full-length, four-section mock tests exist, how many are Academic versus General Training, and how often new ones are added. Those are harder to inflate and they are what a student actually sits.",
        ],
      },
      {
        heading: "How IELTSVega fits",
        paragraphs: [
          "We are the teaching half, not the fee-collection half — and we would rather say so than sell you a billing module we have not built. Institutes partner with us for exam-accurate practice and scoring, and keep whatever they already use for admissions and fees.",
          "As a partner you get a wholesale rate on every plan, a panel where you create a student's account and hand them the login directly, a roster showing each student's plan, attempts, mock tests and average band, and the ability to buy a plan on a student's behalf so they never see a payment screen. There is no joining fee and no minimum — you pay for the plans you buy, at your rate.",
          "Students get 15,000+ Academic and General Training questions, full timed mock tests, and instant AI band scores on Writing and Speaking against all four official criteria.",
          WHITE_LABEL_OFFER,
        ],
        links: [
          { label: "How to price IELTS institute software per student", href: "/blog/ielts-institute-software-pricing-guide" },
          { label: "Running IELTS mock tests for a whole batch", href: "/blog/how-to-run-ielts-mock-tests-for-students" },
        ],
      },
    ],
    faqs: [
      {
        q: "What is the best IELTS software for a coaching institute?",
        a: "There is no single answer, and any vendor who gives you one is selling. The right platform depends on whether your bottleneck is marking, admissions or content. If trainers are drowning in essays, buy scoring. If you are losing enquiries, buy a management system — a practice platform will not help. Work out which hour of the week you want back before you look at a single demo.",
      },
      {
        q: "Do I need separate software for IELTS management and IELTS practice?",
        a: "Usually yes, and that is fine. The products that do both well are rare, and most institutes end up running a management tool for fees and admissions alongside a practice platform for teaching. Trying to force one product to do both is how institutes end up with a billing system that has a weak test engine, or the reverse.",
      },
      {
        q: "How much does IELTS institute software cost?",
        a: "Most vendors price per active student per month, with the rate falling as your cohort grows, and many quote only after a demo. Expect roughly the price of a coffee per student per month at small volumes, less as you scale. Ask specifically what happens to seats when a batch finishes — whether they free up or you keep paying for them is worth more than the headline rate.",
      },
      {
        q: "Can I put my own institute's branding on the platform?",
        a: "With most vendors, on a paid tier. With IELTSVega, white-labelling — your logo, your colours and your own subdomain — is arranged with partners individually on an annual basis rather than switched on self-serve, so mention it when you apply and we will scope it with you first.",
      },
    ],
  },

  /* ================================================================== *
   * 2. White-label. Table stakes in this category — every competitor
   *    sells it, so the demand is proven. We rank for it honestly by
   *    writing the buyer's guide to white-labelling rather than
   *    claiming a switch we do not have.
   * ================================================================== */
  {
    slug: "white-label-ielts-platform",
    seoTitle: "White Label IELTS Platform: A Buyer's Guide",
    title: "White-label IELTS software: what it means and what to ask for",
    excerpt:
      "What white-labelling an IELTS platform really covers, where most branded setups leak the vendor's name, and how to judge whether it is worth paying for.",
    category: "For institutes",
    date: "September 2026",
    publishedAt: "2026-09-15",
    readMins: 9,
    keywords: [
      "white label ielts platform",
      "white label ielts software",
      "branded ielts mock test platform",
      "ielts software with my own branding",
      "white label mock test software",
      "semi white label ielts software",
      "custom branded ielts platform for institutes",
    ],
    sections: [
      {
        paragraphs: [
          "White-labelling is the feature institutes ask about first and evaluate last. It is easy to sell — everyone wants their own name on the product their students use — and it is unusually easy to under-deliver, because \"branded\" can mean anything from a logo in a corner to a platform genuinely indistinguishable from your own.",
          "Here is what the term actually covers, in the order it tends to matter.",
        ],
      },
      {
        heading: "The five layers of white-labelling",
        bullets: [
          "Visual: your logo and colours inside the app. The easiest layer, and the one most vendors mean when they say white-label.",
          "Domain: students sign in at your subdomain, or your own domain, instead of the vendor's. This is the layer students actually notice.",
          "Communications: result emails, password resets and reminders come from your name and your address. Skipped surprisingly often, and it is where a branded setup usually gives itself away.",
          "Reports: the PDF or score report a student downloads carries your institute's name, not the platform's.",
          "Commercial: the vendor is invisible in your pricing, contracts and support. This is full white-labelling and it is always the most expensive tier.",
        ],
      },
      {
        heading: "\"Semi white-label\" is a real category, not a discount",
        paragraphs: [
          "Several vendors offer a middle tier — your branding on the student-facing parts, the vendor's name still present somewhere, usually in the footer or the emails. It is cheaper and, for most institutes, honestly enough.",
          "The question to ask yourself is what you are protecting. If it is professional appearance in front of students, the visual and domain layers do that. If it is stopping students discovering the underlying platform and buying direct at retail, you need the communications and commercial layers too, and you should price the decision accordingly.",
        ],
      },
      {
        heading: "The questions that separate real white-labelling from a logo upload",
        bullets: [
          "What exact URL do my students type? A subdomain of yours, or a path on the vendor's domain?",
          "What address do result emails come from, and can a student reply to it and reach me?",
          "Does the vendor's name appear anywhere a student can see — footer, login screen, PDF export, browser tab title, page source?",
          "If a student contacts the vendor's support directly, what happens?",
          "What is the commitment? White-labelling is almost always annual, because setup is real work at the vendor's end.",
          "What happens to my branding, and my students, if I stop paying?",
        ],
      },
      {
        heading: "Is it worth it?",
        paragraphs: [
          "For a single-branch institute with thirty students in a batch, usually not at first. Students who walk into your building already know whose class they are in, and the money is better spent on seats. Branding matters more as you grow — when you are selling online, competing on reputation, or running several branches under one name.",
          "The honest sequencing is: prove the platform raises bands with a small cohort, then brand it once you know you are keeping it. Paying an annual white-label premium for software you abandon in month four is the worst outcome available.",
        ],
      },
      {
        heading: "Where IELTSVega stands on this",
        paragraphs: [
          "We would rather tell you exactly where we are than imply more. Today the partner panel and the student app carry IELTSVega's branding.",
          WHITE_LABEL_OFFER,
          "What is available immediately, without any annual arrangement, is everything underneath it: a wholesale rate per partner, student accounts you create yourself from the panel, a roster with attempts, mocks and average band per student, and plans you can buy on a student's behalf. No joining fee, no minimum. That is the part that changes what your trainers do on Monday morning — the branding changes what it looks like while they do it.",
        ],
        links: [
          { label: "IELTS software for coaching institutes: what to look for", href: "/blog/ielts-software-for-coaching-institutes" },
        ],
      },
    ],
    faqs: [
      {
        q: "What does white-label IELTS software mean?",
        a: "It means the platform runs under your institute's identity instead of the vendor's — at minimum your logo and colours, and at the fuller tiers your own subdomain, your name on result emails and score reports, and no visible trace of the vendor anywhere a student looks. The term is used loosely, so always ask which of those layers is actually included.",
      },
      {
        q: "Is white-labelling worth the extra cost for a small institute?",
        a: "Often not in the first year. Students who attend your classes in person already know whose institute it is, and early money is better spent on student seats than on branding. It becomes worth it when you sell online, compete on reputation, or run multiple branches — or when you want to stop students finding the underlying platform and buying direct.",
      },
      {
        q: "Can I get an IELTS platform on my own domain?",
        a: "With most vendors, yes, on a white-label tier — usually a subdomain you choose. Your own root domain is rarer and costs more because it needs certificate and routing work at the vendor's end. Ask specifically which of the two you are getting, because \"your own domain\" is used for both in marketing copy.",
      },
      {
        q: "Does IELTSVega offer a white-label option?",
        a: "It is arranged with partners individually on an annual basis rather than being a self-serve setting, and it is scoped with you before you commit. The wholesale rate, the student roster, panel enrolment and paying on a student's behalf are all available to every partner straight away, with no joining fee or minimum.",
      },
    ],
  },

  /* ================================================================== *
   * 3. Franchise interception. The highest-intent query in the cluster:
   *    someone searching "IELTS franchise cost" has capital and intent
   *    to start an IELTS business TODAY. Published franchise fees run
   *    Rs 1.5-5 lakh on Rs 4-15 lakh total investment with 3-year
   *    lock-ins; our partner programme has no joining fee at all.
   *    The comparison does the selling, so the post just has to be
   *    accurate and let the reader do the arithmetic.
   * ================================================================== */
  {
    slug: "ielts-franchise-cost-vs-partnership",
    seoTitle: "IELTS Franchise Cost vs a Partner Programme",
    title: "IELTS franchise cost in India — and the cheaper way to start",
    excerpt:
      "What an IELTS franchise really costs in India, what the fee buys, and when a no-fee platform partnership gets you teaching sooner for a fraction of it.",
    category: "For institutes",
    date: "September 2026",
    publishedAt: "2026-09-15",
    readMins: 10,
    keywords: [
      "ielts franchise cost",
      "ielts institute franchise india",
      "ielts coaching franchise investment",
      "start ielts institute without franchise",
      "ielts franchise vs partnership",
      "cheapest way to start ielts coaching",
      "ielts coaching business investment",
    ],
    sections: [
      {
        paragraphs: [
          "If you are looking at IELTS franchises, you have already made the important decision — you want to teach IELTS as a business. What is left is a question about structure, and it is worth an hour of arithmetic before it costs you a lakh.",
          "This post sets out what an IELTS franchise typically costs in India, what the fee genuinely buys you, and where a platform partnership does the same job for less. We run a partner programme, so read the comparison with that in mind — the numbers below are public and you should check them yourself.",
        ],
      },
      {
        heading: "What IELTS franchises actually charge",
        paragraphs: [
          "Published figures from Indian IELTS and spoken-English franchise brands in 2026 cluster in a fairly narrow band:",
        ],
        table: {
          caption: "Typical published IELTS franchise terms in India, 2026",
          headers: ["Item", "Typical range", "Notes"],
          rows: [
            ["Brand / franchise fee", "₹1.5–5 lakh", "Often tiered by city, urban or semi-urban location"],
            ["Total investment expected", "₹4–15 lakh", "Includes premises, fit-out, staff and working capital"],
            ["Agreement term", "3 years typical", "Renewal terms vary; exit before term is rarely free"],
            ["Royalty / revenue share", "Common", "Frequently a percentage of collections, on top of the fee"],
            ["Territory", "Usually exclusive", "The main thing the fee buys"],
          ],
        },
      },
      {
        heading: "What the franchise fee genuinely buys",
        paragraphs: [
          "It is easy to be cynical about franchise fees, and it would be wrong. A good franchise sells four real things:",
        ],
        bullets: [
          "A brand a parent in your town has already heard of. This is the big one, and it is worth real money in a market where trust is the product.",
          "Territory protection, so the same brand does not open two streets away.",
          "A curriculum and trainer training, which is genuinely hard to build from scratch.",
          "Marketing support, often including the first year of digital spend.",
        ],
      },
      {
        heading: "And what it does not",
        paragraphs: [
          "What a franchise fee rarely buys is the thing that limits an IELTS institute's growth: the hours your trainers spend marking Writing and Speaking. Most franchise packages hand you a curriculum and a brand, then leave the marking exactly where it was.",
          "It also does not buy flexibility. A three-year agreement with a royalty on collections is a fixed cost that arrives whether the batch filled or not — and the first year of an IELTS institute is where batches do not fill.",
        ],
      },
      {
        heading: "The alternative: your own name, someone else's platform",
        paragraphs: [
          "The structure more small institutes are choosing in 2026 is to keep their own brand and licence only the teaching technology. You give up the borrowed reputation; you keep every rupee of your fees and you are not locked in.",
          "For that to work the platform has to carry the part a new institute cannot build: exam-accurate mock tests, a real question bank across Academic and General Training, and automatic band scoring so one trainer can handle a batch of thirty without spending their evenings marking essays.",
        ],
      },
      {
        heading: "A fair comparison",
        table: {
          caption: "Franchise versus platform partnership, for a first branch",
          headers: ["", "IELTS franchise", "Platform partnership"],
          rows: [
            ["Upfront fee", "₹1.5–5 lakh typical", "None with IELTSVega"],
            ["Ongoing", "Royalty on collections, common", "Wholesale rate per student plan"],
            ["Lock-in", "Around 3 years typical", "None — buy plans as batches fill"],
            ["Whose brand", "Theirs", "Yours"],
            ["Territory protection", "Usually yes", "No"],
            ["Ready-made reputation", "Yes — the main benefit", "No, you build it"],
            ["Marking workload solved", "Usually not", "Yes — AI band scores on Writing and Speaking"],
          ],
        },
      },
      {
        heading: "Which one is right for you",
        paragraphs: [
          "Take the franchise if your local market is brand-driven, you have the capital to absorb a slow first year, and territory protection matters where you are. That is a real business case and no blog post should talk you out of it.",
          "Take the partnership route if you already have a name locally — a tutor with a reputation, a consultancy with a client list, a school with students — because then you are paying a franchise for a brand you do not need.",
        ],
      },
      {
        heading: "What partnering with IELTSVega involves",
        paragraphs: [
          "No joining fee and no minimum. You get a wholesale rate on every plan, a panel where you create student accounts and hand over the login, a roster showing each student's plan, attempts, mocks and average band, and the ability to pay for a student's plan so they never see a payment screen. You buy plans as batches fill, not in advance.",
          "Students get 15,000+ Academic and General Training questions, full timed mocks, and instant AI band scores on Writing and Speaking against the four official criteria.",
          WHITE_LABEL_OFFER,
        ],
        links: [
          { label: "How to start an IELTS coaching institute", href: "/blog/how-to-start-ielts-coaching-institute" },
        ],
      },
    ],
    faqs: [
      {
        q: "How much does an IELTS franchise cost in India?",
        a: "Published 2026 figures from Indian IELTS and spoken-English franchise brands typically show a brand fee of ₹1.5–5 lakh, tiered by whether you are in a city, urban or semi-urban location, against a total expected investment of roughly ₹4–15 lakh once premises, fit-out and working capital are counted. Agreements commonly run three years and often carry a royalty on collections as well.",
      },
      {
        q: "Can I start an IELTS institute without buying a franchise?",
        a: "Yes, and many do. There is no central education board approval required for IELTS coaching in India — it is a private training business, so you need commercial registration rather than accreditation. What you give up without a franchise is a ready-made brand and territory protection; what you keep is your fees, your name and your freedom to stop.",
      },
      {
        q: "What is the cheapest way to start teaching IELTS?",
        a: "Teach the first batch with your own name, rented or shared space, and a practice platform bought per student so your costs scale with enrolment instead of arriving upfront. The expensive parts of an IELTS business — a question bank, exam-accurate mock delivery and marking capacity — are the ones worth renting rather than building or buying into.",
      },
      {
        q: "Does a platform partnership give me territory protection?",
        a: "No, and you should discount it accordingly when you compare. A platform partnership is not exclusive: another institute in your city can use the same software. What you get instead is your own brand, no upfront fee and no lock-in. If exclusivity in your town is the thing you are really buying, a franchise is the honest answer.",
      },
    ],
  },

  /* ================================================================== *
   * 4. Startup intent. Wide top-of-funnel B2B query, and the reader is
   *    by definition pre-vendor. Genuinely useful or it is worthless.
   * ================================================================== */
  {
    slug: "how-to-start-ielts-coaching-institute",
    seoTitle: "How to Start an IELTS Coaching Institute",
    title: "How to start an IELTS coaching institute: a practical guide",
    excerpt:
      "Registration, premises, trainers, pricing and the first batch — what actually matters when starting an IELTS coaching institute, and what can wait.",
    category: "For institutes",
    date: "September 2026",
    publishedAt: "2026-09-15",
    readMins: 12,
    keywords: [
      "how to start an ielts coaching institute",
      "start ielts coaching centre",
      "ielts coaching institute business plan",
      "open ielts institute india",
      "ielts coaching centre requirements",
      "ielts institute setup cost",
      "ielts coaching business",
    ],
    sections: [
      {
        paragraphs: [
          "IELTS coaching is an unusually accessible business to start and an unusually easy one to start badly. The barriers are low — no accreditation, modest capital, a market growing fastest in smaller cities — which means your competition is other people who also found it easy to start.",
          "What follows is the order things actually need doing in, with the parts that can safely wait marked as such.",
        ],
      },
      {
        heading: "The legal part is smaller than you expect",
        paragraphs: [
          "In India there is no central education board approval for IELTS coaching. It is a private training business, not a school, so what you need is commercial registration rather than accreditation.",
          "Choose a structure and register it: a sole proprietorship is the fastest and cheapest to run if this is your first branch; a private limited company makes sense if you intend to open several or take investment. Add GST registration where your turnover requires it, a current account, and a local trade licence if your municipality asks for one. That is genuinely most of it.",
          "Neither IDP nor the British Council accredits preparation providers, so no one can sell you an official IELTS accreditation. Be careful with anyone who implies otherwise.",
        ],
      },
      {
        heading: "Decide who you teach before you rent anything",
        paragraphs: [
          "The single most useful decision early on is which candidate you serve, because it determines your pricing, your timetable and your premises.",
        ],
        bullets: [
          "Academic, for university applicants — concentrated around admission cycles, younger, more price-sensitive, larger batches.",
          "General Training, for migration and work — often older, working, needing evenings and weekends, and markedly less price-sensitive.",
          "Band 7+ repeaters, who have already taken the test and missed their score. The most valuable segment and the least well served, because they need diagnosis, not a beginners' course.",
          "Online-only, which removes premises from the equation entirely and widens your market past your city, at the cost of needing to be findable online.",
        ],
      },
      {
        heading: "Premises: the cost that sinks first-year institutes",
        paragraphs: [
          "Rent is the one fixed cost that does not care whether your batch filled. Before signing a lease, consider running your first two batches from shared or hourly space, a partner's classroom in their off-hours, or entirely online.",
          "It is not as professional and it will not feel like a real institute. It also means a batch of six is survivable, and a batch of six is what many first batches are.",
        ],
      },
      {
        heading: "Trainers, and the honest arithmetic of marking",
        paragraphs: [
          "One competent trainer can teach a batch of thirty. One competent trainer cannot mark thirty students' Writing and Speaking properly and still teach — the arithmetic does not work. A Task 2 essay marked against the four criteria takes ten to fifteen minutes; two a week from thirty students is ten to fifteen hours.",
          "So a new institute has three options: cap batch sizes at what your trainers can actually mark, hire a second trainer before the revenue justifies it, or automate the first pass of marking and have trainers review and correct it. The third is what makes small institutes profitable, and it is the main reason to buy a practice platform at all.",
        ],
      },
      {
        heading: "Pricing your course",
        paragraphs: [
          "Price against the outcome, not the hours. Candidates are not buying forty hours of classroom time; they are buying a band score that unlocks a visa or an admission, and the alternative to your course is retaking the test at full fee.",
          "Practically: find what three local competitors charge, sit in the middle rather than at the bottom, and differentiate on something specific — number of full mocks included, marked essays per student, or a band guarantee you can actually honour. Undercutting is the easiest position to take and the hardest to escape.",
        ],
      },
      {
        heading: "The first batch matters more than the first year",
        paragraphs: [
          "Almost all of an IELTS institute's early growth is word of mouth from students who got the band they needed. That makes the first batch a marketing investment, not a revenue event.",
          "Teach it smaller than you would like. Mark everything properly. Get their scores. Then ask every one of them for a review with their band in it — testimonials with a number are the only marketing asset that reliably converts in this market.",
        ],
      },
      {
        heading: "What to buy, and when",
        bullets: [
          "Before batch one: registration, a bank account, a way to take fees, a phone number people answer, and a practice platform so students can do timed mocks from day one.",
          "After batch one: a website with your students' results on it, and a proper enquiry-tracking system if you are losing leads.",
          "Later, if ever: custom branding on your platform, an app, a franchise. None of these fill a batch.",
        ],
      },
      {
        heading: "Where IELTSVega comes in",
        paragraphs: [
          "Our partner programme exists for exactly this stage. There is no joining fee and no minimum, so a first batch of six costs you six plans at your wholesale rate — not a licence you have to fill seats to justify.",
          "You create each student's account from your panel and hand them the login, buy their plan on their behalf so they never see a payment screen, and watch one roster showing every student's attempts, mocks and average band. Students get 15,000+ Academic and General Training questions, full timed mocks, and instant AI band scores on Writing and Speaking against the four official criteria — which is the marking arithmetic above, solved.",
          WHITE_LABEL_OFFER,
        ],
        links: [
          { label: "IELTS franchise cost compared with a partnership", href: "/blog/ielts-franchise-cost-vs-partnership" },
          { label: "How to run IELTS mock tests for a batch", href: "/blog/how-to-run-ielts-mock-tests-for-students" },
        ],
      },
    ],
    faqs: [
      {
        q: "Do I need approval or accreditation to start an IELTS coaching centre in India?",
        a: "No central education board approval is required — IELTS coaching is a private training business rather than a school, so you need commercial registration, GST where applicable, and any local trade licence your municipality asks for. Neither IDP nor the British Council accredits preparation providers, so treat any offer of official IELTS accreditation with suspicion.",
      },
      {
        q: "How much does it cost to start an IELTS institute?",
        a: "It depends almost entirely on premises. Online or from shared space you can start for the cost of registration, a laptop and per-student platform seats. A physical centre with a lease, fit-out, staff and working capital is commonly quoted at ₹4–15 lakh, and a franchise adds a brand fee of ₹1.5–5 lakh on top of that.",
      },
      {
        q: "How many students can one IELTS trainer handle?",
        a: "Thirty for teaching, far fewer for marking. A properly marked Task 2 essay takes ten to fifteen minutes, so two essays a week from thirty students is ten to fifteen hours of marking on top of class time. Institutes solve this by capping batch size, hiring earlier than the revenue justifies, or automating the first pass of marking and having trainers review it.",
      },
      {
        q: "Is IELTS coaching still profitable in 2026?",
        a: "The demand is there — Indian student numbers abroad continue to rise and the fastest growth is in tier-two cities rather than the metros. What has changed is that candidates now compare you against free online material, so institutes that sell classroom hours struggle while those that sell marked practice, real mock conditions and diagnosis of why a student is stuck at 6.5 do well.",
      },
    ],
  },

  /* ================================================================== *
   * 5. Operational query. Owners search this when they already have
   *    students — near the bottom of the funnel despite looking
   *    informational.
   * ================================================================== */
  {
    slug: "how-to-run-ielts-mock-tests-for-students",
    seoTitle: "How to Run IELTS Mock Tests for Your Students",
    title: "How to run IELTS mock tests for a whole batch without chaos",
    excerpt:
      "Running mock tests for thirty students: timing, exam conditions, marking Writing and Speaking at scale, and turning results into the next week's teaching.",
    category: "For institutes",
    date: "September 2026",
    publishedAt: "2026-09-15",
    readMins: 10,
    keywords: [
      "how to conduct ielts mock test",
      "ielts mock test for institutes",
      "ielts mock test for students",
      "bulk ielts mock tests",
      "run ielts mock test in classroom",
      "ielts practice test for coaching centre",
      "ielts mock test management",
    ],
    sections: [
      {
        paragraphs: [
          "A mock test is the highest-value thing an IELTS institute does and the most commonly botched. Done properly it predicts a band, exposes exactly which skill is holding a student back, and gets a nervous candidate used to the clock. Done as a worksheet handed out in class, it teaches almost nothing.",
          "The difference is entirely in the conditions and the follow-up.",
        ],
      },
      {
        heading: "The conditions that actually matter",
        bullets: [
          "The clock, strictly. IELTS is a time-pressure exam before it is a language exam, and a mock without a hard stop measures the wrong thing.",
          "No transfer time in Listening on the computer-delivered test — only two minutes at the end to check. Students trained on the paper version's ten minutes get a shock on test day.",
          "Reading straight after Listening with no break, because that is the real thing, and stamina is a skill.",
          "Writing with a live word counter, since hand-counting words burns minutes students cannot spare.",
          "Speaking recorded, always. A student cannot hear their own hesitation while they are producing it.",
        ],
      },
      {
        heading: "How often, and when",
        paragraphs: [
          "A full four-section mock every week is too often — students stop taking them seriously and you generate more marking than you can turn around. Once a fortnight, with sectional practice in between, is the pattern most institutes settle on.",
          "Schedule the first mock in week one, before you have taught anything. It feels counterproductive and it is the most useful test you will run: it gives every student a baseline band, tells you which skill each one needs, and makes your final mock a number they can see themselves having earned.",
        ],
      },
      {
        heading: "The marking problem, stated honestly",
        paragraphs: [
          "Listening and Reading mark themselves. Writing and Speaking do not, and that is where a batch of thirty becomes unmanageable.",
          "Thirty students, two Writing tasks each, ten to fifteen minutes per task marked properly against the four criteria, is ten to fifteen hours. Add Speaking and the mock you ran on Saturday is still being marked on Wednesday — by which point the feedback has lost most of its value, because the student has forgotten what they were thinking when they wrote it.",
        ],
      },
      {
        heading: "Three ways institutes solve it",
        bullets: [
          "Cap the batch. Works, limits your revenue, and is the most common unspoken constraint on an institute's growth.",
          "Mark a sample. Mark five essays properly, teach the common errors to everyone. Efficient, but the students you did not mark know it.",
          "Automate the first pass. Let the platform score every script against the four criteria immediately, then have the trainer review, correct where they disagree, and add the one comment that matters. Every student gets same-day feedback and the trainer's time goes to teaching rather than to counting linking words.",
        ],
      },
      {
        heading: "Turning results into next week's lesson",
        paragraphs: [
          "The mock is only half the exercise. Before the next class, sort the batch by which section scored lowest and look for the pattern — if eleven students lost the same marks on True/False/Not Given, that is a lesson, not eleven individual conversations.",
          "Then give each student one instruction, not a report card. \"Your Task 2 essays are losing a band on Coherence because you never signpost your second body paragraph\" changes behaviour. \"You got 6.5, work on writing\" does not.",
        ],
      },
      {
        heading: "Running mocks on IELTSVega",
        paragraphs: [
          "Full timed mocks across all four sections in both Academic and General Training, delivered in a computer-delivered exam format with the real timing behaviour, a Writing word counter and recorded Speaking. Writing and Speaking come back with instant AI band scores against all four official criteria, so a Saturday mock is marked by Saturday.",
          "From the partner panel you create each student's account yourself, buy their plan on their behalf, and see one roster with every student's attempts, mocks and average band — which is the sorting exercise above, already done.",
          "There is no joining fee and no minimum, so you can run a first batch through it before committing to anything.",
        ],
        links: [
          { label: "AI band scoring for institutes, and where to trust it", href: "/blog/ai-ielts-writing-evaluation-for-institutes" },
        ],
      },
    ],
    faqs: [
      {
        q: "How often should students take IELTS mock tests?",
        a: "A full four-section mock every fortnight, with sectional practice in between, is the pattern that works for most institutes. Weekly full mocks generate more marking than an institute can turn around quickly and students stop treating them seriously. Always run one in the first week, before teaching anything, to establish a baseline band for every student.",
      },
      {
        q: "How do I mark thirty students' IELTS Writing every week?",
        a: "Realistically, you do not do it by hand. Ten to fifteen minutes per essay marked properly against the four criteria means thirty students produce ten to fifteen hours of marking a week. Institutes either cap batch sizes, mark a representative sample and teach the common errors, or have a platform score every script immediately and use trainer time to review and correct rather than to mark from scratch.",
      },
      {
        q: "Should mock tests be on computer or paper?",
        a: "On computer, unless you know your students are sitting the paper-based test. The computer-delivered format is now the majority and it behaves differently in ways that cost marks: there is no ten-minute Listening transfer time, only two minutes to check, and Writing is typed with a word counter. Practising on paper for a computer test trains the wrong habits.",
      },
      {
        q: "What should I do with mock test results?",
        a: "Sort the batch by weakest section and look for shared errors — if a third of the class lost the same marks on True/False/Not Given, that is next week's lesson rather than eleven separate conversations. Then give each student one specific instruction tied to a criterion, not a band number. A score tells a student where they are; only a named error tells them what to change.",
      },
    ],
  },

  /* ================================================================== *
   * 6. The wedge. Public reviews of the category leader specifically
   *    fault its writing feedback for lacking sentence-level
   *    specificity. We do not name anyone — we publish the standard a
   *    buyer should hold every vendor to, which is a stronger and safer
   *    play than a comparison post.
   * ================================================================== */
  {
    slug: "ai-ielts-writing-evaluation-for-institutes",
    seoTitle: "AI IELTS Writing Evaluation for Institutes",
    title: "AI band scoring for institutes: where to trust it, where not to",
    excerpt:
      "How AI Writing and Speaking evaluation really performs against examiners, where it fails, and how to use it in an institute without misleading students.",
    category: "For institutes",
    date: "September 2026",
    publishedAt: "2026-09-15",
    readMins: 10,
    keywords: [
      "ai ielts writing evaluation",
      "ielts writing checker for institutes",
      "automatic ielts band scoring software",
      "ielts speaking evaluation software",
      "ai essay scoring for ielts coaching",
      "ielts writing correction tool for teachers",
      "automated ielts marking",
    ],
    sections: [
      {
        paragraphs: [
          "Automatic band scoring is the feature that decides whether a practice platform is worth paying for, because marking is what actually limits an institute's capacity. It is also the feature most likely to be oversold, so it deserves a sceptical read before you buy.",
          "This is an attempt at an honest account, written by a vendor who sells it. Treat the scepticism as the useful part.",
        ],
      },
      {
        heading: "What AI scoring is genuinely good at",
        bullets: [
          "Consistency. It applies the same standard to the first essay of the day and the two-hundredth, which no tired human does.",
          "Immediacy. A student who gets feedback while they still remember writing the essay learns from it; one who gets it five days later is reading a report about a stranger.",
          "Lexical and grammatical range. Counting the evidence for those two criteria is a mechanical job and machines do mechanical jobs well.",
          "Volume. It does not care whether your batch is six or six hundred.",
        ],
      },
      {
        heading: "Where it is weaker, and you should assume it is",
        bullets: [
          "Task Response on an unusual argument. A genuinely original essay that answers the question sideways can be marked down for not looking like the pattern.",
          "Coherence in a long essay, where the judgement is about whether the argument develops rather than whether connectives are present.",
          "Anything culturally specific — an example the model has not seen often can read as irrelevant when it is not.",
          "Speaking pronunciation on strong regional accents, where intelligibility and accent get conflated.",
        ],
      },
      {
        heading: "The accuracy question, answered properly",
        paragraphs: [
          "Published comparisons of AI IELTS scoring against official results tend to land in a similar place: most scripts within half a band, the large majority within one, and a tail of outliers. That is genuinely useful for practice and it is not good enough to be the last word on a student's band.",
          "Two examiners disagree too — that is why real IELTS has moderation. The right mental model is not \"is the AI right?\" but \"is it as close as a second examiner, and does it explain itself?\"",
        ],
      },
      {
        heading: "The question that separates a tool from a toy",
        paragraphs: [
          "The most important thing to test in a demo is not the number. It is what comes with it.",
          "A band score alone changes nothing — a student who scores 6.0 four times learns only that they are a 6.0. What changes a band is being shown the specific sentence that cost the mark and what to write instead. When you evaluate a platform, submit a deliberately flawed essay and read the feedback: if it tells you the essay \"needs more complex sentences\", it is a toy. If it quotes the sentence, names the criterion and offers a rewrite, it is a tool.",
          "Do the same for Speaking. Ask whether the feedback points at a moment in the recording or just produces four numbers.",
        ],
      },
      {
        heading: "How to use it in an institute without misleading anyone",
        bullets: [
          "Tell students it is an estimate, in those words, from the first class. An institute that implies an AI score is an official band will be found out on results day.",
          "Use it for every script, and have a trainer review a sample. The machine does the first pass; your trainer's judgement is what students are paying for.",
          "Let trainers override it and record when they do. Systematic disagreement in one direction is information about the tool, and about your teaching.",
          "Watch the trend, not the reading. One score is noise; four scores over a month is a trajectory, and the trajectory is what tells a student they are improving.",
          "Never let it replace speaking to a student about their writing. It replaces the counting, not the conversation.",
        ],
      },
      {
        heading: "What IELTSVega does",
        paragraphs: [
          "Instant band scores on Writing and Speaking against all four official criteria, on every submission, with the criteria named on the report so a trainer can see where the score came from rather than being handed a number.",
          "For a partner that means a batch's mock is marked as soon as it is submitted, and the roster in your panel shows each student's attempts, mocks and average band over time — so the trajectory is visible without anyone building a spreadsheet.",
          "We would rather you tested it than took our word for it. There is no joining fee and no minimum, so run a batch through it and have your most experienced trainer argue with the scores.",
        ],
        links: [
          { label: "Running IELTS mock tests for a whole batch", href: "/blog/how-to-run-ielts-mock-tests-for-students" },
        ],
      },
    ],
    faqs: [
      {
        q: "How accurate is AI IELTS band scoring?",
        a: "Published comparisons against official results generally show most scripts landing within half a band and the large majority within one, with a tail of outliers. That is accurate enough to guide practice and to show a trend over several attempts, and not accurate enough to promise a student their exam band. Human examiners disagree with each other too, which is why real IELTS moderates scores.",
      },
      {
        q: "Can AI replace my IELTS trainers' marking?",
        a: "It should replace the counting, not the teaching. Let it score every script immediately so no student waits, then have a trainer review a sample, override where they disagree, and deliver the one correction that matters. Institutes that hand marking entirely to software lose the thing students are actually paying for, which is a person who explains why.",
      },
      {
        q: "What should AI writing feedback include besides a band score?",
        a: "The specific sentence that cost the mark, the criterion it falls under, and a better version. A score on its own teaches nothing — a student who scores 6.0 repeatedly only learns that they are a 6.0. When testing a platform, submit a deliberately flawed essay: vague advice like 'use more complex sentences' marks it out as a toy, while a quoted sentence with a rewrite marks it out as a tool.",
      },
      {
        q: "Is AI scoring reliable for IELTS Speaking too?",
        a: "It is reliable for fluency, vocabulary range and grammatical accuracy, and weakest on pronunciation with strong regional accents, where intelligibility and accent can get conflated. Use it for trend and for the first three criteria, and keep a trainer's ear in the loop for pronunciation — and check that the feedback points at moments in the recording rather than just producing four numbers.",
      },
    ],
  },

  /* ================================================================== *
   * 7. Vertical: study-abroad consultancies. A distinct buyer with a
   *    different motive — IELTS is a retention and margin play attached
   *    to a visa/admission business, not the main product.
   * ================================================================== */
  {
    slug: "ielts-coaching-for-study-abroad-consultancies",
    seoTitle: "Adding IELTS Coaching to a Study Abroad Agency",
    title: "Adding IELTS prep to a study abroad consultancy: worth it?",
    excerpt:
      "Why study abroad consultancies lose clients at the IELTS stage, three ways to add prep without hiring trainers, and the margin each option realistically earns.",
    category: "For institutes",
    date: "September 2026",
    publishedAt: "2026-09-15",
    readMins: 9,
    keywords: [
      "ielts coaching for study abroad consultancy",
      "add ielts prep to consultancy",
      "study abroad agency ielts partner",
      "ielts for overseas education consultants",
      "education consultancy revenue streams",
      "ielts tie up for consultancy",
    ],
    sections: [
      {
        paragraphs: [
          "Study abroad consultancies lose clients at a predictable moment: the point where the student is told their band is not high enough. The consultancy has done the counselling and the shortlisting, the file is open, and then the student disappears for three months to attend somebody else's IELTS class — and a good number of them never come back, because the coaching institute also offers admissions help.",
          "That is the real argument for adding IELTS prep. It is a retention problem before it is a revenue opportunity.",
        ],
      },
      {
        heading: "The three ways to add it",
        table: {
          caption: "Adding IELTS prep to a consultancy: three models",
          headers: ["Model", "What you invest", "Margin", "Main risk"],
          rows: [
            ["Refer to a local institute", "Nothing", "A referral fee, if any", "You hand the client to a competitor for admissions"],
            ["Hire trainers, run classes", "Premises, salaries, curriculum", "Highest per student", "Fixed costs that arrive whether batches fill or not"],
            ["Licence a platform, guide students", "Per-student seats only", "Middle, scales with volume", "Needs someone to actually follow up"],
          ],
        },
      },
      {
        heading: "Why the middle option usually loses",
        paragraphs: [
          "Hiring trainers looks like the serious choice and it is the one that most often goes wrong for a consultancy, because it converts a variable business into a fixed-cost one. A consultancy's enquiry flow is seasonal and lumpy; a trainer's salary is neither.",
          "It also asks you to become good at a second business. Running classes well is a craft — timetabling, batch management, marking, retention — and a consultancy that is excellent at university placement is not automatically excellent at teaching.",
        ],
      },
      {
        heading: "What the platform model looks like in practice",
        paragraphs: [
          "The student stays yours. You give them an account the same day you tell them their band needs work, they practise on their own schedule, and you can see whether they actually are — which is the part that matters, because the alternative is asking them on the phone and being told \"yes, going well\".",
          "Your counsellor's job becomes what it already is: following up. A fortnightly look at the roster tells you who has stopped practising, and a five-minute call at that moment is what keeps a file moving.",
        ],
      },
      {
        heading: "Pricing it",
        bullets: [
          "Bundled into your service fee. Simplest, makes your package look more complete, and removes a separate purchasing decision from the student.",
          "Sold as an add-on. Cleaner accounting and it lets price-sensitive students decline, which some will.",
          "Included free for signed clients. The strongest retention play: it costs you a seat and it makes leaving you expensive in a way the student feels.",
        ],
      },
      {
        heading: "Do not oversell the band",
        paragraphs: [
          "A consultancy that promises a band score is making a promise it cannot keep, and in this market that damage compounds — the same students talk to each other in the same forums. Sell access to exam-accurate practice and to honest scoring, and sell your own follow-up. Those you can actually deliver.",
        ],
      },
      {
        heading: "What a partnership with IELTSVega gives a consultancy",
        paragraphs: [
          "No joining fee, no minimum, and a wholesale rate on every plan — so seats are a variable cost that tracks your enquiry flow rather than a fixed one that ignores it.",
          "You create the student's account from your panel and hand them the login, buy their plan on their behalf so there is no payment screen between them and practice, and watch a roster showing every client's attempts, mock tests and average band. Students get 15,000+ Academic and General Training questions, full timed mocks, and instant AI band scores on Writing and Speaking against the four official criteria.",
          WHITE_LABEL_OFFER,
        ],
        links: [
          { label: "Tracking IELTS student progress across a cohort", href: "/blog/ielts-student-progress-tracking-for-institutes" },
        ],
      },
    ],
    faqs: [
      {
        q: "Should a study abroad consultancy offer IELTS coaching?",
        a: "If you are losing clients at the IELTS stage, yes — but as retention rather than as a new business. Students sent to a local coaching institute often do not return, because that institute usually offers admissions help too. Offering prep yourself keeps the file open and the relationship intact, which is worth more than the margin on the coaching.",
      },
      {
        q: "Is it better to hire IELTS trainers or licence a platform?",
        a: "For most consultancies, licence a platform first. Hiring trainers converts a seasonal, variable business into one with fixed salary and premises costs that arrive whether the enquiries did or not, and it asks you to become good at a second craft. A platform bought per student scales with your actual enquiry flow and can be dropped if the model does not work.",
      },
      {
        q: "How do consultancies charge students for IELTS prep?",
        a: "Three common ways: bundled into the service fee so the package looks complete and there is no second purchasing decision; sold as a separate add-on for cleaner accounting; or given free to signed clients as a retention play. The third costs you a seat and makes leaving you expensive in a way the student actually notices.",
      },
      {
        q: "Can I see whether my students are actually practising?",
        a: "With a partner panel, yes — that is most of the point. A roster showing each student's attempts, mock tests and average band tells you who has stopped, which is the moment a five-minute follow-up call keeps a file moving. Asking a student on the phone how their preparation is going reliably produces the answer 'fine'.",
      },
    ],
  },

  /* ================================================================== *
   * 8. Analytics / reporting intent. Also the natural landing page for
   *    "batch report", "cohort analytics" style searches.
   * ================================================================== */
  {
    slug: "ielts-student-progress-tracking-for-institutes",
    seoTitle: "IELTS Student Progress Tracking for Institutes",
    title: "Tracking IELTS student progress across a batch: what to measure",
    excerpt:
      "The four numbers that actually predict an IELTS student's band, the vanity metrics to ignore, and how to spot a student going quiet before results day.",
    category: "For institutes",
    date: "September 2026",
    publishedAt: "2026-09-15",
    readMins: 9,
    keywords: [
      "ielts student progress tracking",
      "ielts batch report for institutes",
      "ielts cohort analytics",
      "track ielts student performance software",
      "ielts student dashboard for teachers",
      "ielts class performance report",
    ],
    sections: [
      {
        paragraphs: [
          "Most institutes track the wrong things, and they track them because those things are easy to count. Attendance, hours logged and questions attempted all produce satisfying numbers and none of them predicts a band score.",
          "Here is what does.",
        ],
      },
      {
        heading: "The four numbers worth watching",
        bullets: [
          "Band trajectory per skill. Not the overall band — the four separately. A student stuck at 6.0 overall may be 7.5 in Listening and 5.5 in Writing, and those are completely different problems with completely different fixes.",
          "The gap between practice and mock conditions. A student who scores well on untimed sectional practice and badly on full mocks does not have a language problem; they have a stamina or time-management problem, and it is very fixable.",
          "Attempts per week, and its trend. The absolute number matters less than the direction. A student dropping from five to one is telling you something before they tell you.",
          "Repeat errors by question type. Eleven students failing the same True/False/Not Given pattern is a lesson to teach, not eleven conversations to have.",
        ],
      },
      {
        heading: "The metrics to ignore",
        bullets: [
          "Total time on platform. Rewards slow students and students who leave a tab open. It measures presence, not learning.",
          "Total questions attempted. A student can attempt four hundred Reading questions badly and learn nothing.",
          "Overall average band as a single figure. It is a mean of four very different skills and it hides the one that is actually holding the student back.",
          "Login streaks. They measure habit, which is worth something, but they are not progress and should never be shown to a student as though they were.",
        ],
      },
      {
        heading: "Spotting the student who is about to fail quietly",
        paragraphs: [
          "The students who miss their band are rarely the ones who visibly struggle in class — those ask questions and get help. It is the quiet ones who stop practising and say nothing, and by results day it is far too late to intervene.",
          "The signal is almost always a drop in attempts about three to four weeks before the test, often just after a disappointing mock. A student scores lower than they hoped, decides they are not good at it, and withdraws. Catching that week is the single highest-value thing a tracking system does — and the intervention is not more homework, it is a five-minute conversation about the one skill that is actually costing them the band.",
        ],
      },
      {
        heading: "What to show the student, and what to keep",
        paragraphs: [
          "Students should see their band trajectory per skill, and one named thing to fix. That is it. Showing a student a full analytics dashboard produces anxiety rather than action, and anxiety is already the main obstacle for most IELTS candidates.",
          "Keep the cohort view for yourself. Comparative ranking in particular should never be student-facing — it demotivates the bottom half of a batch far more than it motivates the top.",
        ],
      },
      {
        heading: "The weekly review that takes ten minutes",
        bullets: [
          "Open the roster and sort by attempts this week. Note anyone who has dropped sharply — that is your call list.",
          "Sort by weakest skill and look for the two or three students who share one. That is a fifteen-minute group session, not three separate ones.",
          "Check the practice-to-mock gap for anyone sitting the test within a month. Anyone with a wide gap needs timed conditions, not more content.",
          "Pick the single most common repeat error across the batch. That is next week's lesson.",
        ],
      },
      {
        heading: "What the IELTSVega partner roster shows",
        paragraphs: [
          "One screen per batch with every student's plan, attempts, mock tests and average band — which covers the attempts trend, the per-skill picture and the mock history in the same place, so the ten-minute review above is genuinely ten minutes.",
          "Because you create student accounts from the panel and can buy plans on their behalf, a student appears on the roster the moment you enrol them rather than whenever they get round to accepting an invitation.",
          "No joining fee, no minimum — you pay for the plans you buy at your partner rate.",
          WHITE_LABEL_OFFER,
        ],
        links: [
          { label: "What to look for in IELTS software for institutes", href: "/blog/ielts-software-for-coaching-institutes" },
        ],
      },
    ],
    faqs: [
      {
        q: "What should an IELTS institute measure to track student progress?",
        a: "Band trajectory per skill rather than overall, the gap between untimed practice and full mock conditions, attempts per week and its direction, and repeat errors by question type. Those four predict a band. Attendance, hours logged and total questions attempted are easy to count and predict almost nothing.",
      },
      {
        q: "How do I know if a student is falling behind before the exam?",
        a: "Watch for a sharp drop in weekly attempts, which typically comes three to four weeks before the test and often right after a disappointing mock. The student decides they are not good at it and quietly withdraws. Catching that week and having a short conversation about the one skill costing them the band is worth more than any amount of extra homework.",
      },
      {
        q: "Should students see their own analytics dashboard?",
        a: "Show them their band trajectory per skill and one named thing to fix — no more. A full dashboard produces anxiety rather than action, and anxiety is already the main obstacle for most candidates. Keep cohort comparisons for staff only: ranking demotivates the bottom half of a batch far more than it motivates the top.",
      },
      {
        q: "What does a good IELTS batch report look like?",
        a: "One screen, every student in the batch, with plan, attempts, mock tests and average band visible at a glance and sortable. If answering 'who has stopped practising?' requires opening students one at a time or exporting to a spreadsheet, the report exists on the pricing page but not in practice. Ask any vendor to demonstrate it with thirty students on screen, not three.",
      },
    ],
  },

  /* ================================================================== *
   * 9. Commercial / pricing intent. The buyer is comparing quotes, so
   *    this post earns its ranking by publishing the structures other
   *    vendors quote — which is public information they rarely
   *    assemble in one place.
   * ================================================================== */
  {
    slug: "ielts-institute-software-pricing-guide",
    seoTitle: "IELTS Institute Software Pricing Explained",
    title: "What IELTS institute software should cost, and how to compare",
    excerpt:
      "Per-seat, credit and licence pricing for IELTS institute software compared, the costs vendors leave out of a quote, and how to work out your cost per student.",
    category: "For institutes",
    date: "September 2026",
    publishedAt: "2026-09-15",
    readMins: 9,
    keywords: [
      "ielts institute software price",
      "ielts software cost per student",
      "ielts mock test software pricing",
      "bulk ielts test licences",
      "ielts platform pricing for institutes",
      "how much does ielts software cost",
    ],
    sections: [
      {
        paragraphs: [
          "Quotes in this category are hard to compare because vendors deliberately price in different units. One sells seats, another sells credits, a third sells an annual licence — and the only way to compare them is to convert everything into one number: what it costs you to put one student through one course.",
          "This post sets out the three structures, what each one hides, and how to do that conversion.",
        ],
      },
      {
        heading: "The three pricing structures",
        table: {
          caption: "How IELTS institute platforms typically price",
          headers: ["Structure", "How it works", "Suits", "Watch for"],
          rows: [
            ["Per active seat, monthly", "You pay per student currently enrolled, tiered by volume", "Steady, continuous intake", "What counts as 'active', and whether seats free up when a batch ends"],
            ["Credits / test packs", "Buy a block, assign to students as needed", "Lumpy or seasonal intake", "Expiry dates — the single most expensive detail in this model"],
            ["Annual licence", "Flat fee, often unlimited or banded students", "Large, predictable cohorts", "The break-even student count, and what happens if you shrink"],
          ],
        },
      },
      {
        heading: "What published rates look like",
        paragraphs: [
          "Publicly listed 2026 pricing in this category clusters around low single-digit dollars per active student per month, falling as cohorts grow — one vendor lists 25 seats at $99 a month and 100 seats at $299, which works out at roughly $4 and $3 per student respectively, with annual commitments discounted around 15%. Larger cohorts are almost always custom-quoted.",
          "Several vendors publish no rates at all and quote only after a demo. That is not automatically a bad sign — genuinely tiered pricing is hard to publish — but it does mean you should get at least two quotes before you believe any of them.",
        ],
      },
      {
        heading: "The costs that are not in the quote",
        bullets: [
          "Setup or onboarding fees, sometimes waived if you ask, which is a good reason to ask.",
          "White-labelling, essentially always a separate annual line rather than part of the base rate.",
          "Minimum purchases. A five-student minimum is trivial; a fifty-student minimum changes the economics for a new institute entirely.",
          "Credit expiry. Credits that expire at twelve months on a business with seasonal intake can quietly double your real cost per student.",
          "Trainer or admin accounts, occasionally charged as seats of their own.",
          "Data export on exit, which is worth establishing before you have any data to export.",
        ],
      },
      {
        heading: "Convert everything to cost per student per course",
        paragraphs: [
          "Take your actual course length — say eight weeks — and your realistic batch size, then work out the total you would pay to put that batch through, under each quote.",
          "A per-seat monthly rate for an eight-week course is two months of seats per student. A credit pack is however many mocks and sectional tests a student actually consumes, which is usually far fewer than you would guess, so ask the vendor for the average. An annual licence divided by the number of students you will genuinely enrol this year is your real rate — and if you are not sure of that number, the licence is a bet rather than a purchase.",
          "Then set the result against your course fee. If platform cost is more than a small single-digit percentage of what a student pays you, something is wrong with the quote or with your pricing.",
        ],
      },
      {
        heading: "Do not buy for the batch you hope to have",
        paragraphs: [
          "The most common costly mistake is committing to a volume tier on projected growth. Vendors price generously at higher tiers precisely because it encourages this, and a discount on seats you do not fill is not a discount.",
          "Start at the tier your current batch justifies, on the shortest commitment offered. Move up when the students are real.",
        ],
      },
      {
        heading: "How IELTSVega prices for partners",
        paragraphs: [
          "Every partner gets its own wholesale rate on every plan, and you see what a seat costs you and what it costs everyone else on the same screen before you buy. There is no joining fee, no minimum and no annual commitment — you buy plans as batches fill, at your rate, and you pay for them on students' behalf so the student never sees a payment screen.",
          "That structure is deliberately the one that suits a new or seasonal institute: your cost tracks your enrolment instead of preceding it.",
          WHITE_LABEL_OFFER,
        ],
        links: [
          { label: "IELTS software for coaching institutes: what to look for", href: "/blog/ielts-software-for-coaching-institutes" },
        ],
      },
    ],
    faqs: [
      {
        q: "How much does IELTS software cost per student?",
        a: "Published 2026 rates cluster around low single-digit dollars per active student per month, with the rate falling as cohorts grow — one vendor lists 25 seats at $99 a month and 100 at $299, roughly $4 and $3 per student, with annual commitments discounted around 15%. Many vendors publish nothing and quote after a demo, so get at least two quotes before believing any single one.",
      },
      {
        q: "Is it better to buy IELTS test credits or monthly seats?",
        a: "Credits suit lumpy or seasonal intake because you buy when batches fill; monthly seats suit steady continuous enrolment. The deciding detail is credit expiry — credits that lapse at twelve months on a seasonal business can quietly double your real cost per student, so ask about expiry before you compare headline rates.",
      },
      {
        q: "What hidden costs should I check for in an IELTS platform quote?",
        a: "Setup or onboarding fees, white-labelling as a separate annual line, minimum purchase sizes, credit expiry dates, whether trainer and admin logins are charged as seats, and what it costs to export your student data if you leave. Establish the export terms before you have data worth exporting.",
      },
      {
        q: "How do I compare two IELTS platform quotes fairly?",
        a: "Convert both into cost per student per course. Take your real course length and realistic batch size, work out the total under each quote, and divide. A per-seat monthly rate for an eight-week course is two months of seats per student; an annual licence is the fee divided by the students you will genuinely enrol. Then check the result against your course fee.",
      },
    ],
  },

  /* ================================================================== *
   * 10. Individual trainers. Smallest deal size, largest audience, and
   *     the top of the funnel for the whole cluster — today's freelance
   *     tutor is next year's institute.
   * ================================================================== */
  {
    slug: "teach-ielts-online-tools-for-trainers",
    seoTitle: "Tools for Teaching IELTS Online as a Trainer",
    title: "Teaching IELTS online: the tools an independent trainer needs",
    excerpt:
      "What a freelance IELTS trainer actually needs to teach online, how to handle marking without losing your evenings, and how to price one-to-one sessions.",
    category: "For institutes",
    date: "September 2026",
    publishedAt: "2026-09-15",
    readMins: 9,
    keywords: [
      "teach ielts online",
      "ielts trainer tools",
      "freelance ielts teacher platform",
      "online ielts tutor software",
      "how to teach ielts online and earn",
      "ielts teaching resources for tutors",
    ],
    sections: [
      {
        paragraphs: [
          "Teaching IELTS independently is one of the few genuinely viable solo teaching businesses, because the outcome is measurable, the demand is global and the students are motivated by a deadline. The constraint is never finding students. It is the evenings you lose to marking.",
          "This is a practical account of what an independent trainer needs, in the order it starts to matter.",
        ],
      },
      {
        heading: "What you need at the start",
        bullets: [
          "A video tool your students already have. Do not make a nervous candidate install something unfamiliar before their first lesson.",
          "A way to take payment across borders, since a good share of IELTS students are not in your country.",
          "A shared document for Writing feedback, so corrections live somewhere the student can revisit.",
          "Exam-accurate practice material. This is the one thing you cannot improvise, and the one students judge you on.",
          "A calendar with booking links. Time-zone arithmetic over chat is how sessions get missed.",
        ],
      },
      {
        heading: "The marking ceiling, and what it means for your income",
        paragraphs: [
          "An independent trainer's income is capped by hours, and marking consumes the ones you cannot bill. A properly marked Task 2 essay is ten to fifteen minutes. Ten students submitting two essays a week is three to five unpaid hours.",
          "That is the difference between a trainer who takes ten students and one who takes thirty. The fix is not to mark faster or care less — it is to stop doing the mechanical half. Let a platform score every submission against the four criteria immediately, then spend your time on the part only you can do: telling the student which single habit is costing them the band.",
        ],
      },
      {
        heading: "Pricing one-to-one",
        bullets: [
          "Price per outcome-shaped package, not per hour. \"Eight sessions, four marked mocks, band diagnosis\" sells better than an hourly rate and protects you from the student who books one lesson and vanishes.",
          "Charge for the diagnostic. A first session that produces a real band estimate per skill and a plan is the most valuable hour you will sell, and giving it away sets the wrong expectation.",
          "Do not compete on price with group coaching. You are selling attention; a batch of thirty cannot sell that. Price accordingly and say why.",
        ],
      },
      {
        heading: "Where independent trainers lose students",
        paragraphs: [
          "Almost always between sessions. The student practises intensively for two days after a lesson, drifts, and arrives at the next one having done little — at which point the lesson is spent re-establishing ground rather than moving forward.",
          "The fix is visibility, not nagging. If you can see what a student actually did during the week, you open the session with the thing they got wrong on Wednesday instead of asking how the practice went and being told it went fine.",
        ],
      },
      {
        heading: "When to stop being solo",
        paragraphs: [
          "The signal is turning students away, or marking after ten at night more than once a week. At that point you have two options: raise prices until demand matches your hours, or start running small batches and become an institute.",
          "Most trainers underprice for too long before they notice. Raising your rate is the faster of the two and does not require you to become a manager.",
        ],
      },
      {
        heading: "Using IELTSVega as an independent trainer",
        paragraphs: [
          "Our partner programme has no joining fee and no minimum, which is what makes it workable for someone with four students rather than four hundred. You get a wholesale rate on every plan, you create student accounts yourself and hand over the login, and you can buy a plan on a student's behalf so it is part of your package rather than a separate purchase they have to make.",
          "The roster shows each student's attempts, mocks and average band — which is the between-sessions visibility above — and Writing and Speaking come back with instant AI band scores against all four official criteria, so the marking ceiling stops setting your income.",
          WHITE_LABEL_OFFER,
        ],
        links: [
          { label: "AI band scoring: where to trust it and where not to", href: "/blog/ai-ielts-writing-evaluation-for-institutes" },
          { label: "How to start an IELTS coaching institute", href: "/blog/how-to-start-ielts-coaching-institute" },
        ],
      },
    ],
    faqs: [
      {
        q: "What do I need to start teaching IELTS online?",
        a: "A video tool your students already use, a way to take international payments, a shared document for writing feedback, a booking calendar to avoid time-zone mix-ups, and exam-accurate practice material. The last is the only one you cannot improvise, and it is what students judge you on in the first session.",
      },
      {
        q: "How many students can a freelance IELTS trainer handle?",
        a: "Teaching capacity is rarely the limit — marking is. A properly marked Task 2 essay takes ten to fifteen minutes, so ten students submitting two essays a week costs you three to five unpaid hours. Trainers who automate the first pass of marking and spend their time on diagnosis routinely handle two to three times the students of those who mark everything by hand.",
      },
      {
        q: "How should I price one-to-one IELTS lessons?",
        a: "Sell outcome-shaped packages rather than hours — 'eight sessions, four marked mocks, band diagnosis' converts better than an hourly rate and protects you from students who book once and disappear. Charge for the diagnostic first session rather than giving it away, and do not price against group coaching: you are selling individual attention, which a batch of thirty cannot offer.",
      },
      {
        q: "Can an individual trainer get institute pricing on a platform?",
        a: "With IELTSVega, yes — the partner programme has no joining fee and no minimum, so it works with four students as well as four hundred. You get a wholesale rate on every plan, create student accounts yourself, and can buy a plan on a student's behalf so it forms part of your package rather than a separate purchase they have to make.",
      },
    ],
  },
];
