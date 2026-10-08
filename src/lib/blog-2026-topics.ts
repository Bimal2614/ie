import type { BlogPost } from "./blog-types";

/**
 * Cluster: rising / newly-searched IELTS queries (2026).
 *
 * These target the questions that started spiking as IELTS moved to computer
 * delivery and as test-centre demand outran supply — "ielts centres near me",
 * "ielts slot booking", "ielts one skill retake", "ielts vs pte vs duolingo",
 * "ielts score for canada pr". They are logistics- and decision-intent posts:
 * the reader is not practising yet, they are working out what to book, where,
 * for how much, and to what score. Each one ends by handing that reader the
 * practice product.
 *
 * Facts with an expiry date (fees, per-country availability, visa thresholds)
 * are always written with a "check the official source" hedge, because they
 * change on a schedule we do not control and a stale number is worse than no
 * number. Rules quoted here reflect the 2026 test year.
 */
export const TOPIC_POSTS_2026: BlogPost[] = [
  /**
   * Timely policy post (8 Oct 2026) — DHS/ICE notice of proposed rulemaking
   * "Optional Practical Training Fees" (FR Doc 2026-20660, Docket
   * ICEB-2026-0100, RIN 1653-AB01), published in the Federal Register 8 Oct
   * 2026. PROPOSED ONLY: comments close 9 Nov 2026, no final rule, no
   * effective date. A final rule would take effect 60 days after publication
   * and apply to DSO recommendations dated on or after that date. Update on
   * the final rule, any change to the amounts, or litigation.
   */
  {
    slug: "us-opt-fee-70000-proposed-rule-2026",
    seoTitle: "$70,000 OPT Fee: Who Pays, and Does It Apply to You?",
    title: "Will you have to pay $70,000 for OPT? The proposed US rule explained",
    excerpt:
      "DHS has proposed a $70,000 fee for OPT and $30,000 for STEM OPT. It is not law yet. Who would pay, who is exempt, and what 2027 starters should do now.",
    category: "Requirements",
    date: "October 2026",
    publishedAt: "2026-10-08",
    readMins: 7,
    keywords: [
      "opt fee 2026",
      "$70,000 opt fee",
      "who pays the opt fee",
      "opt fee proposed rule",
      "stem opt fee $30,000",
      "is the opt fee final",
      "opt fee already on opt",
      "opt fee master's 2027",
      "pre-completion opt fee",
      "f1 opt new rules 2026",
      "ielts score for us student visa",
    ],
    sections: [
      { paragraphs: [
        "Short answer: not yet, and maybe never. On 8 October 2026 the US Department of Homeland Security proposed that universities pay $70,000 the first time they recommend an F-1 student for Optional Practical Training (OPT), and $30,000 for each later period, including the STEM OPT extension. It is a proposal open for public comment, not a rule. Nobody pays anything today.",
        "The school, not the student, would be the one billed. DHS says openly, though, that schools may pass the cost on to students or employers, so in practice it could land on you. This post covers what the proposal says, who it would and would not catch, when it could realistically start, and what to do if you are planning a US degree.",
      ] },
      { heading: "What DHS proposed", paragraphs: [
        "The proposal is a notice of proposed rulemaking from Immigration and Customs Enforcement, part of DHS, published in the Federal Register on 8 October 2026 (document 2026-20660, docket ICEB-2026-0100). It would add an OPT fee to the federal regulations that govern F-1 students.",
        "DHS gives two reasons: fighting OPT fraud, citing investigations into employers that did not exist or had no staff on site, and protecting US workers. It set the first fee at a level it describes as comparable to the H-1B fee, so that OPT is not used as a cheaper route around it. DHS also states that without these fees it may shut the OPT program down entirely. That is a statement of position in the proposal, not a separate plan with a date.",
      ] },
      { heading: "How much, and for which kind of OPT", paragraphs: [
        "The fee is charged when your school's designated school official (DSO) recommends you for OPT, not when you change employer. It applies per student, not per job.",
      ], table: {
        caption: "Fees in the DHS proposed rule of 8 October 2026 (Federal Register 2026-20660). Proposed only. None of these fees is charged today. Check federalregister.gov and your school's international office before acting.",
        headers: ["Situation", "Fee the school would pay", "Notes"],
        rows: [
          ["First OPT recommendation of any kind", "$70,000", "One-time, per student. Pre-completion counts as your first OPT"],
          ["STEM OPT 24-month extension", "$30,000", "Charged as a subsequent OPT"],
          ["Post-completion OPT after pre-completion OPT", "$30,000", "So pre plus post would total $100,000, against $70,000 for post-completion only"],
          ["OPT at a second degree level (e.g. master's after a US bachelor's)", "$30,000 as proposed", "DHS is also considering charging $70,000 again at each new level, and has asked for comments on it"],
          ["Curricular Practical Training (CPT)", "No fee", "Not covered by this proposal. DHS says it is watching CPT"],
          ["Already on approved OPT, or recommended before the effective date", "No fee", "But a new OPT request made after the effective date would be charged"],
        ],
      } },
      { heading: "Who would pay", paragraphs: [
        "Your university pays DHS, before the DSO can enter the OPT recommendation in SEVIS. If the school has not paid, the DSO cannot recommend you and USCIS may not approve your work permit (the EAD). Your own I-765 application and its USCIS fee stay as they are.",
        "The proposal places no limit on where the school finds the money. DHS says schools may charge it to the F-1 student, spread it across all students, or ask employers to cover it. It also expects schools to become more selective and to recommend fewer students. So the realistic outcomes range from a university absorbing the fee for strong STEM candidates, to a university passing the full amount on, to a university not recommending a student at all.",
        "A refund is possible only if you never receive the OPT work permit. SEVP decides case by case, the decision cannot be appealed, and once the EAD is issued the fee is not refunded under any circumstances.",
      ] },
      { heading: "Is it law? When could it start?", paragraphs: [
        "No. As of 8 October 2026 this is a proposal. The process from here: public comments close on 9 November 2026, then DHS must consider the comments and publish a final rule, which may differ from the proposal or never appear. A final rule would take effect 60 days after it is published, and the fee would apply to OPT recommendations dated on or after that day.",
        "No date has been given for a final rule. Counting only the minimum steps, comment period plus 60 days, the earliest the fee could bite is early 2027, and only if DHS finalises quickly. Large, contested rules usually take longer, and universities, which would pay the fee directly, are well placed to challenge a final rule in court. A court challenge is not guaranteed to happen or to succeed, so plan as though it might apply.",
      ] },
      { heading: "If you are already on OPT or about to apply", paragraphs: [
        "If you already hold an OPT work permit, or your DSO's recommendation is dated before a final rule takes effect, the fee would not apply to that OPT period. Under the proposal, your school would not have to pay for OPT that is already approved or already recommended.",
        "The catch is the next step. If you are on post-completion OPT now and later apply for the STEM OPT extension after the rule takes effect, that extension is a new recommendation, and as proposed your school would owe $30,000 for it. If that applies to you, ask your international office how it would handle it. Nothing has to be decided while the rule is only proposed.",
      ] },
      { heading: "If you start a US degree in 2027", paragraphs: [
        "This is the group with most at stake. A master's that starts in fall 2027 usually ends in 2029, so if a final rule is adopted, it would almost certainly be in force by the time your OPT is recommended. Before you accept an offer, ask the university in writing whether it would pay the fee, pass it on, or limit OPT recommendations.",
        "Two details in the proposal matter for planning. First, taking pre-completion OPT during your degree would make your post-completion OPT a \"subsequent\" period, adding $30,000 on top of $70,000. Second, if you plan a US bachelor's and then a US master's, DHS is weighing whether to charge the full $70,000 again at the second level. The final rule will settle both. Until then, treat OPT as a cost to budget for, not a free right after graduation.",
      ] },
      { heading: "What happens next", paragraphs: [
        "Anyone can comment on the proposal at regulations.gov by searching for docket ICEB-2026-0100. Comments close on 9 November 2026, as shown on the Federal Register page for document 2026-20660. DHS must consider the comments before it publishes a final rule. Comments that include data, such as what OPT meant for your career or your university's numbers, carry more weight than opinions.",
        "We will update this post when a final rule is published, if the amounts change, or if a court acts. Check the date at the top before relying on it.",
      ] },
      { heading: "What this does NOT change: your English requirement", paragraphs: [
        "The proposal is about work after study, not about getting in. It does not change the F-1 visa, university admission or English testing. The US has no single visa-level IELTS score. Your university sets its own minimum, usually 6.5 to 7.0 for graduate programs and around 6.0 to 6.5 for undergraduate, and your I-20 records whether you met it.",
        "Where it may change your plans is the choice of country. If US post-study work becomes expensive, some applicants will compare other countries' post-study work routes, each with its own English requirement. The UK Graduate Route, for example, is due to fall from two years to 18 months for applications made from 1 January 2027. Sitting one test that is accepted in all of them, and scoring high enough for the strictest, keeps your options open while the US rule is decided.",
      ], links: [
        { label: "IELTS vs TOEFL: which one US universities prefer", href: "/blog/ielts-vs-toefl" },
        { label: "IELTS vs PTE vs Duolingo: which test is accepted where", href: "/blog/ielts-vs-pte-vs-duolingo" },
        { label: "How long you can stay on an F-1 visa now the 4-year rule is blocked", href: "/blog/us-f1-duration-of-status-rule-blocked-2026" },
        { label: "IELTS band score calculator", href: "/ielts-band-score-calculator" },
      ] },
      { heading: "What to do now", bullets: [
        "Already on OPT: carry on. Nothing is charged while the rule is a proposal, and approved OPT would not be charged if it is adopted.",
        "Planning STEM OPT after a final rule could be in force: ask your international office now whether it would pay the $30,000 or pass it on.",
        "Starting a US degree in 2027: ask each university in writing how it would handle the fee before you accept an offer, and include it in your budget.",
        "Think twice before taking pre-completion OPT if a final rule might apply to you, because as proposed it turns your post-completion OPT into a second, charged period.",
        "Do not pay anyone who says they collect an \"OPT fee\". Under the proposal only your university pays DHS, and no fee exists yet.",
        "Settle your English score early. It is the one part of the plan no rule change will touch, and a higher band widens your choice of countries if the US becomes too costly.",
      ] },
    ],
    faqs: [
      { q: "Do international students have to pay the $70,000 OPT fee?", a: "Not directly, and not yet. Under the 8 October 2026 proposal the university pays DHS, but DHS says schools may pass the cost on to students or employers. No fee is charged today because the rule has not been finalised." },
      { q: "Is the OPT fee already law?", a: "No. It is a proposed rule published on 8 October 2026, with public comments open until 9 November 2026. DHS must publish a final rule before anything changes, and that would take effect 60 days after publication. No date has been given." },
      { q: "Does the fee apply to STEM OPT?", a: "Yes, as proposed. The STEM OPT 24-month extension counts as a subsequent OPT period, so the school would pay $30,000 for it, on top of the $70,000 paid for the student's first OPT." },
      { q: "If I did OPT after my bachelor's, would my master's OPT cost $70,000 again?", a: "As proposed, a later OPT recommendation costs $30,000. But DHS is also considering charging the full $70,000 again at each new degree level and has asked for public comment, so the final rule could go either way." },
      { q: "Does pre-completion OPT count as my first OPT?", a: "Yes. Under the proposal the first OPT recommendation of any kind triggers the $70,000 fee, so pre-completion followed by post-completion OPT would cost the school $100,000 in total, against $70,000 for post-completion only." },
      { q: "Has the IELTS score for US universities changed because of this?", a: "No. The proposal is only about work after study. Universities still set their own English minimums, usually IELTS 6.5 to 7.0 for graduate programs, and the F-1 visa itself is unchanged." },
    ],
  },
  /**
   * Timely policy post (24 Sep 2026) — DHS final rule ending "duration of
   * status" for F/J/I (Federal Register 2026-14439, 17 July 2026), due in force
   * 15 September 2026, BLOCKED by a nationwide preliminary injunction in the
   * District of Massachusetts on 14 September 2026. Nothing in the rule is in
   * force. Written so it stays true whether the injunction holds, is appealed
   * or is lifted; update on every court step. Updated 2 Oct 2026: notice of
   * appeal to the First Circuit filed 30 Sep 2026 (D. Mass. ECF 53, 1st Cir.
   * No. 26-2112); no stay sought as of 2 Oct; injunction still in force.
   */
  {
    slug: "us-f1-duration-of-status-rule-blocked-2026",
    seoTitle: "F-1 Visa 4-Year Limit Blocked: How Long Can You Stay?",
    title: "How long can you stay on an F-1 visa now the 4-year rule is blocked?",
    excerpt:
      "A court has blocked the rule that would have capped F-1 stays at four years. What is in force today, what changes if it returns, and what to do now.",
    category: "Requirements",
    date: "September 2026",
    publishedAt: "2026-09-24",
    updatedAt: "2026-10-02",
    readMins: 6,
    keywords: [
      "f1 visa new rules 2026",
      "duration of status rule blocked",
      "how long can you stay in the us on an f1 visa",
      "f1 4 year limit",
      "f1 duration of status injunction",
      "duration of status appeal",
      "duration of status rule first circuit",
      "f1 extension of stay i-539",
      "f1 grace period 30 days",
      "f1 transfer rules 2026",
      "ielts score for us student visa",
    ],
    sections: [
      { paragraphs: ["Short answer: for now, as long as your program lasts and you keep your status, exactly as before. On 14 September 2026, one day before it was due to start, a federal judge in Massachusetts blocked the Department of Homeland Security rule that would have capped F-1 admission at four years. Duration of status, the system that ties your stay to your studies rather than to a fixed date, is still the rule.", "The block is a preliminary injunction, not the end of the case. The rule itself still exists, the government has appealed, and the court has not yet decided the case in full. So the useful question is not only what applies today, but what would change for you if the rule came back. This post covers both, and it will be updated as the case moves."] },
      { heading: "What the court did", paragraphs: ["Judge F. Dennis Saylor IV of the US District Court for the District of Massachusetts granted a nationwide preliminary injunction on 14 September 2026. It stops DHS and Immigration and Customs Enforcement from implementing or enforcing the rule while the lawsuit continues. The judge found that the challengers, a coalition of higher-education groups, were likely to succeed in arguing that the rule broke the Administrative Procedure Act, the law that governs how federal agencies make regulations.", "Because the order is nationwide, it protects every F-1 and J-1 student, not only those at the universities that sued."] },
      { heading: "Is the 4-year rule in force?", paragraphs: ["No. As of 2 October 2026 no part of it is in force. Students are still admitted for duration of status, shown as \"D/S\" on the I-94, and you can stay as long as you are enrolled, making normal progress and following the terms of your status, plus the existing 60-day grace period after you finish.", "One thing to watch: the DHS Study in the States summary of the rule still describes it without mentioning the injunction. That page describes the rule as written, not what is in force. Your school's international office is the best day-to-day source."] },
      { heading: "What the rule would change if it comes back", paragraphs: ["If the injunction is lifted on appeal or the government wins the case, these are the provisions that would apply. None of them apply today."], table: {
        caption: "Provisions of the DHS final rule published 17 July 2026 (Federal Register 2026-14439), all blocked by the 14 September 2026 injunction. Check studyinthestates.dhs.gov and your school's international office before acting on any of them.",
        headers: ["Issue", "Today (duration of status)", "Under the blocked rule"],
        rows: [
          ["How long you are admitted", "For as long as you are enrolled and maintain status", "Until the program end date on your I-20, capped at four years"],
          ["Grace period after your program", "60 days", "30 days"],
          ["Needing more time", "Your school extends the I-20", "Updated I-20 plus Form I-539 filed with USCIS, with a fee and biometrics, or leave and re-enter"],
          ["Changing major or level (graduate students)", "Allowed with your school's approval", "Not allowed, except in limited circumstances"],
          ["Transferring university (graduate students)", "Allowed", "Not allowed, except in limited circumstances"],
          ["Transferring or changing major (undergraduates)", "Allowed", "Not in the first academic year"],
          ["English language programs", "No fixed overall limit", "24 months in total"],
        ],
      } },
      { heading: "If you are already in the US", paragraphs: ["Do nothing new. You do not need to file Form I-539 or request a fixed-date I-94. Keep your enrolment full-time, keep your I-20 current, and speak to your designated school official before changing program, school or level, as you always should.", "Even under the blocked rule, students already here on duration of status would have been allowed to stay until their current program end date, up to four years, plus 60 days, without filing anything. Those who had filed for OPT or STEM OPT on time would not have needed a separate extension. Existing students were never the hardest-hit group."] },
      { heading: "If you start in spring or fall 2027", paragraphs: ["This is the group with the most at stake. If the injunction holds, you will be admitted for duration of status like everyone before you. If it is overturned before you enter, you would be admitted to the end date on your I-20, capped at four years, and a graduate student would lose the ability to transfer or switch programs freely.", "In practice that matters most for PhD students, whose programs often run past four years, and for anyone who might want to change course after arriving. If you already have an I-20 and a visa appointment, nothing about the appointment changes: the visa itself is the same F-1, and the rule governs how long you are admitted at the border, not whether you get the visa."], links: [{ label: "The proposed $70,000 OPT fee and what it means for 2027 starters", href: "/blog/us-opt-fee-70000-proposed-rule-2026" }] },
      { heading: "What happens next", paragraphs: ["On 30 September 2026 the government filed a notice of appeal against the injunction with the US Court of Appeals for the First Circuit (case number 26-2112). Filing an appeal does not bring the rule back. The injunction stays in force while the appeal is heard, unless the government asks for a stay and a court grants one. As of 2 October 2026 the government had not asked for a stay.", "The case also continues in the district court in Massachusetts, which scheduled a status conference for 2 October 2026. Any of these steps can change the answer above, so check the date at the top of this post."] },
      { heading: "What this does NOT change: your English requirement", paragraphs: ["The court case is about how long you can stay, not how you qualify. Nothing in the rule or the injunction touches English testing. The US has no single visa-level IELTS score. Your university sets its own minimum, usually 6.5 to 7.0 for graduate programs and around 6.0 to 6.5 for undergraduate, and your I-20 records whether you have met it. The consular officer can still ask you questions in English at the interview.", "One provision does have an English-learning angle. If the rule returns, English language programs would be capped at 24 months in total. If you plan to do an intensive English course before your degree, raising your IELTS band before you travel shortens the time you need in that program, and it may let you skip it altogether."], links: [
        { label: "IELTS vs TOEFL: which one US universities prefer", href: "/blog/ielts-vs-toefl" },
        { label: "IELTS exam fee in the USA", href: "/blog/ielts-exam-fee-usa" },
        { label: "IELTS band score calculator", href: "/ielts-band-score-calculator" },
      ] },
      { heading: "What to do now", bullets: ["If you are in the US on F-1: carry on as normal and do not file anything because of this rule.", "If you start in 2027: keep your plans, but check with your university's international office before you travel, because the answer can change between your offer and your arrival.", "If you are a PhD applicant with a program longer than four years, ask your school now how it would handle an extension of stay if the rule came back.", "Do not pay anyone to file an I-539 \"to be safe\". There is nothing to file while the injunction stands.", "Get your English score settled early. It is the one part of the application that no court case will change, and a stronger band gives you more universities to choose from."] },
      { heading: "Sources", paragraphs: ["Checked on 2 October 2026. Court cases move quickly, so check the date at the top of this post."], links: [
        { label: "Federal Register: DHS final rule ending duration of status (17 July 2026)", href: "https://www.federalregister.gov/documents/2026/07/17/2026-14439/establishing-a-fixed-time-period-of-admission-and-an-extension-of-stay-procedure-for-nonimmigrant" },
        { label: "Study in the States (DHS): quick facts on the final rule", href: "https://studyinthestates.dhs.gov/final-rule-establishing-a-fixed-time-period-of-admission-and-an-extension-of-stay-procedure-quick" },
        { label: "NAFSA: the legal challenge and the 14 September injunction", href: "https://www.nafsa.org/legal-defense-DS" },
        { label: "CourtListener: district court docket, Presidents' Alliance v. DHS (No. 1:26-cv-13799)", href: "https://www.courtlistener.com/docket/74661796/presidents-alliance-on-higher-education-and-immigration-v-united-states/" },
        { label: "AIP FYI: court temporarily blocks the duration of status rule", href: "https://www.aip.org/fyi/court-temporarily-blocks-rule-ending-duration-of-status-for-international-students" },
      ] },
    ],
    faqs: [
      { q: "How long can you stay in the US on an F-1 visa?", a: "For as long as you are enrolled in your program and maintain your status, plus a 60-day grace period after you finish. This is called duration of status. A DHS rule that would have capped admission at four years was blocked by a federal court on 14 September 2026, so duration of status still applies." },
      { q: "Is the F-1 4-year limit in effect?", a: "No. The rule was due to take effect on 15 September 2026 but was blocked nationwide by a preliminary injunction the day before. It stays blocked while the lawsuit continues. The government has appealed, but the injunction stays in place while the appeal is heard unless a court orders otherwise." },
      { q: "Has the government appealed the duration of status ruling?", a: "Yes. The government filed a notice of appeal with the First Circuit Court of Appeals on 30 September 2026. The appeal does not lift the injunction by itself, so duration of status still applies unless a court grants a stay or overturns the ruling." },
      { q: "Do I need to file Form I-539 for an extension of stay?", a: "No, not while the injunction stands. Form I-539 extensions were part of the blocked rule. Your school keeps extending your I-20 as it did before." },
      { q: "Is the F-1 grace period 60 or 30 days?", a: "It is 60 days. The blocked rule would have cut it to 30 days for new admissions, but that provision is not in force." },
      { q: "Can I transfer universities on an F-1 visa in 2026?", a: "Yes, under the normal transfer process with your current and new schools. The blocked rule would have stopped most graduate students from transferring, but it is not in force." },
      { q: "Has the IELTS score for a US student visa changed?", a: "No. There is no visa-level IELTS minimum for the F-1. Each university sets its own score, and neither the rule nor the court ruling changed any English test requirement." },
    ],
  },
  /**
   * Timely policy post (18 Sep 2026) — the dependants announcement of
   * 17 September 2026. High, sudden intent ("can I bring my wife on an
   * Australian student visa"), and nothing on the site answered it.
   *
   * Originally written as an ANNOUNCEMENT with no start date. It became law
   * on 2 October 2026 (see the 3 Oct note below).
   *
   * Revised 24 Sep 2026 (content-research/2026-09-24-australia-student-visa-
   * dependants.md): added the Temporary Graduate (485) half of the change,
   * which the speech states in so many words; stopped claiming research
   * master's is exempt, since only PhDs were named; added subsequent entrants,
   * South Asia, spouse work rights and a country comparison. The page-one
   * results for "can i bring my wife on australia student visa" were all
   * pre-announcement pages still saying yes.
   *
   * Updated 3 Oct 2026 (news/drafts/2026-10-03-australia-student-visa-
   * dependants-ban-2026-in-force.md): in force 2 Oct 2026 for applications
   * lodged on or after that day (F2026L01347, F2026L01348, F2026L01349).
   * ASEAN list read from reg 1222(5A) via the explanatory statement;
   * Timor-Leste counts as Pacific-regional. Subsequent entrants barred with
   * NO exemptions (Home Affairs family-members page). Still announced only:
   * the 485 family change, the 12-month provider-transfer bar and the July
   * 2027 transfer visa.
   */
  {
    slug: "australia-student-visa-dependants-ban-2026",
    seoTitle: "Australia Student Visa New Rules 2026: Spouse & Dependents",
    title: "Australia student visa 2026: can you still bring your spouse?",
    excerpt:
      "Since 2 October 2026 most students in Australia cannot bring a partner or children. Who is exempt, the new onshore rules, and why IELTS is unaffected.",
    category: "Requirements",
    date: "September 2026",
    publishedAt: "2026-09-18",
    updatedAt: "2026-10-03",
    readMins: 12,
    keywords: [
      "australia student visa spouse",
      "australia student visa dependants",
      "australia student dependent visa new rules",
      "can i bring my wife on australia student visa",
      "australia student visa family ban 2026",
      "australia student visa new rules 2026",
      "australia student visa 500 dependent",
      "485 visa dependants 2026",
      "ielts score for australia student visa",
      "study in australia 2026",
    ],
    sections: [
      { paragraphs: ["Short answer: for most people, no, not any more. The change announced by Home Affairs and Immigration Minister Tony Burke on 17 September 2026 is now law. The Migration Amendment (Student Visa Reform) Regulations 2026 were made on 1 October and took effect on 2 October 2026. For any Student (subclass 500) visa application lodged on or after that day, your partner and dependent children, the secondary applicants in visa terms, can only be included if you fall into one of a few exempt groups.", "What counts is the date you apply, not the date you are granted. Applications lodged on or before 1 October 2026 are assessed under the old rules. The same regulation also changed who can apply for a student visa from inside Australia, covered below. Always confirm the position on the Department of Home Affairs website on the day you lodge."] },
      { heading: "What was actually announced", paragraphs: ["The dependants change is one part of a wider migration package aimed at cutting net overseas migration from roughly 292,000 a year to 245,000 in 2026-27 and 225,000 in 2027-28. The measures that affect students and graduates:"], bullets: ["Most student visas will no longer permit secondary applicants, so a partner or child cannot be included in the application.", "The same restriction applies to the Temporary Graduate (subclass 485) visa, so staying on after your degree will not be a route to bringing family over either.", "Changing your education provider or your course will require a new student visa application, rather than a variation of the one you hold.", "You will generally only be able to continue studying in Australia by moving up a qualification level, for example bachelor's to master's. Sideways moves between institutions and drops to a lower qualification are being blocked as \"visa hopping\".", "Visitor visas used for short English-language or vocational courses of three months or less will carry a \"no further stay\" condition.", "Second- and third-year Working Holiday visas move to a ballot with regional work requirements."] },
      { heading: "Who can still bring family", paragraphs: ["The exemptions are set out in the regulation and in a ministerial instrument made alongside it. They depend on what you study and who funds or sends you, not on your relationship."], table: {
        caption: "Exemptions in force from 2 October 2026 under the Student Visa Reform Regulations and LIN 26/087. Confirm on immi.homeaffairs.gov.au before lodging.",
        headers: ["Student", "Can include partner / children?", "Basis"],
        rows: [
          ["Doctoral (PhD) students", "Yes", "Named class in the ministerial instrument"],
          ["Master's by research", "No", "Only doctoral degrees are named"],
          ["Defence or DFAT-sponsored students (Australian government)", "Yes", "Written into the regulation"],
          ["Course fully funded by a foreign government", "Yes", "Named class in the ministerial instrument"],
          ["Pacific nationals, including Timor-Leste", "Yes", "Passport from a Pacific-regional country"],
          ["ASEAN nationals", "Yes", "Passport from an ASEAN member country"],
          ["Everyone else: undergraduate, coursework master's, VET, ELICOS", "No", "The great majority of student visa applicants"],
          ["Family already in Australia on your student visa", "Yes, in your next application", "Protected if they held that visa on 2 October, or had applied before it and were granted after"],
          ["Temporary Graduate (485) holders", "Not changed yet", "Announced on 17 September but not in the 2 October regulation"],
        ],
      } },
      { heading: "When did it start?", paragraphs: ["The new rules started on 2 October 2026. The regulation was made by the Governor-General on 1 October, registered the same day, and applies to visa applications made on or after its start. Because it was made as a regulation, it did not need a vote in parliament, which is why it arrived about two weeks after the announcement. Two parts of the original package are not in it: the change for Temporary Graduate (subclass 485) visas, and the 12-month bar on changing provider with a new transfer visa planned for July 2027. Treat those as announced but not yet in force."] },
      { heading: "If your family is already in Australia", paragraphs: ["Families already here are protected. If your partner or child held a student visa as your family member on 2 October 2026, they can be included again when you apply for your next student visa. The same applies if they had applied before 2 October and were granted afterwards, and to a child born in Australia after 2 October to a student who already held a student visa. Your current visa, and theirs, is not affected by the change."] },
      { heading: "Can you still add your partner later?", paragraphs: ["No, and this rule has no exemptions. Since 2 October 2026 family members cannot be added to a student visa after it has been granted. The Department of Home Affairs states that there are no exemptions to this rule, so it applies to PhD students and to Pacific and ASEAN nationals as well. If you are in an exempt group, your partner and children have to be included in the application itself, and you and every family member in it must be in the same location when it is lodged.", "In practice the decision has to be made before you apply. Arriving alone and bringing a partner once you are settled is no longer a route on a student visa."] },
      { heading: "Applying from inside Australia: what else changed on 2 October", paragraphs: ["The same regulation limits who can apply for a student visa while already in Australia. If you hold a student visa now, you generally have to lodge your next one from outside Australia, and be outside Australia when it is granted, unless one of these applies:"], bullets: ["You are applying for a PhD.", "You need up to 12 more months to finish your main course with the same provider.", "You have finished your main course and are moving to one further course at a higher qualification (AQF) level. If your last course was a degree, the next one must also be a degree from a higher education provider.", "You are a school student, or a Defence or DFAT-sponsored student.", "Your provider has defaulted and you apply within 12 months."] },
      { paragraphs: ["Holders of several other temporary visas, including Working Holiday and Work and Holiday, visitor and eVisitor, Temporary Graduate (485), Skills in Demand and Temporary Skill Shortage (482), Training (407) and Temporary Activity (408), must now lodge a student visa application from outside Australia and be outside Australia when it is granted. There are no exemptions for them. If you are in Australia as a family member on someone else's student visa and want your own, you also have to apply from outside Australia.", "Moving sideways between courses, or down a level, from inside Australia is the \"visa hopping\" these rules are aimed at. A 12-month bar on changing provider and a new transfer visa from July 2027 were also announced, but neither is in the rules published on 1 October."] },
      { heading: "If you are from India, Nepal, Bangladesh, Bhutan or Sri Lanka", paragraphs: ["This change falls hardest on South Asia. More than 70% of the student dependant visas granted offshore last financial year, about 10,448 visas, went to applicants from Nepal, Bangladesh, Bhutan, India and Sri Lanka. None of these countries is covered by the Pacific or ASEAN exemptions, so for most students from the region the PhD exemption is the only one available.", "Bhutan stands out. Many Bhutanese students travel with a spouse, and Bhutan sits outside both exempt groups. If you are from any of these countries and your plan depended on bringing family, compare your options before you pay a deposit or lodge."] },
      { heading: "Can your partner work in Australia?", paragraphs: ["For families who already have a partner attached to a student visa, work rights under the current rules depend on the main student's course. If the student is enrolled in a master's degree or a doctorate, the family member can work unlimited hours. For other courses, the family member is limited to 48 hours a fortnight. In both cases the partner cannot start work until the student's course has begun. None of this changes for families already onshore, but new applicants outside the exemptions will not have a partner on the visa to begin with."] },
      { heading: "The scale of it", paragraphs: ["Australia granted 337,427 student visas in the last financial year. Of those, 45,991 went to secondary applicants — partners and children rather than students. That is the population this measure targets, and it is why the government describes student visa numbers themselves as unaffected: the students still come, the families do not. Applying has also become more expensive: the standard student visa application charge rose to AUD 2,500 on 1 July 2026."] },
      { heading: "How Australia now compares", paragraphs: ["If bringing your partner is the deciding factor, here is where the main destinations stand. Australia is following the UK, which restricted student dependants in 2024."], links: [{ label: "US F-1 visa: how long you can stay now the 4-year rule is blocked", href: "/blog/us-f1-duration-of-status-rule-blocked-2026" }], table: {
        caption: "Rules in force as of October 2026. Each country revises these regularly — check the official immigration site before you decide.",
        headers: ["Country", "Can most students bring a partner?", "Who still can", "Can the partner work?"],
        rows: [
          ["Australia", "No, since 2 October 2026", "PhD students, government-sponsored students, Pacific and ASEAN nationals", "Yes, for families already onshore"],
          ["United Kingdom", "No, since January 2024", "Postgraduate research students and government-sponsored students", "Yes, if eligible to come"],
          ["Canada", "Only on some courses", "Partners of students on a master's of 16 months or longer, a doctorate, or selected professional programmes can get an open work permit", "Yes, with that permit"],
          ["New Zealand", "Only on some courses", "Partners of master's and doctoral students qualify for an open work visa; level 7 and 8 courses only if on the eligible lists", "Yes, with that visa"],
          ["United States", "Yes", "F-2 dependants of F-1 students", "No"],
        ],
      } },
      { heading: "What this does NOT change: your English requirement", paragraphs: ["No English test or IELTS score requirement was changed by the 2 October 2026 regulation. The English rules that apply to you are still the ones that came into force on 7 August 2025, and they are worth knowing precisely, because two of them catch people out."], table: {
        caption: "Current IELTS positions for the main Australian visa routes. Thresholds change on a schedule nobody controls — verify on the Department of Home Affairs site before you book a test.",
        headers: ["Route", "IELTS position", "Status"],
        rows: [
          ["Student visa (subclass 500)", "Set by your education provider and the visa English requirement", "Unchanged by the October 2026 rules"],
          ["Temporary Graduate (subclass 485)", "6.5 overall with no band below 5.5", "Raised from 6.0 on 7 August 2025"],
          ["Competent English", "6.0 in each of the four skills", "Unchanged"],
          ["Proficient English", "7.0 in each of the four skills", "Unchanged"],
          ["Superior English", "8.0 in each of the four skills", "Unchanged"],
        ],
      } },
      { heading: "Two English rules people still get wrong", bullets: ["At-home and remote-proctored tests are not accepted for any Australian visa, from any provider. You must sit the test in person at a secure test centre, and booking IELTS Online by mistake is an expensive way to lose a month.", "IELTS One Skill Retake is accepted for the Temporary Graduate visa, so if you land 6.5 overall with a single 5.0 band, you can retake that one skill rather than the whole test.", "Results from a test sat on or before 6 August 2025 remain usable as evidence until 6 August 2028."], links: [
        { label: "IELTS One Skill Retake: how it works and when it is worth it", href: "/blog/ielts-one-skill-retake-guide" },
        { label: "IELTS vs PTE vs Duolingo: which test to sit", href: "/blog/ielts-vs-pte-vs-duolingo" },
        { label: "IELTS band score calculator", href: "/ielts-band-score-calculator" },
      ] },
      { heading: "What to do now", bullets: ["Check whether an exemption applies to you before you plan around family. A PhD instead of a coursework master's is now a different visa outcome; a research master's is not.", "If you are exempt, include your partner and children in the application itself. They cannot be added after the visa is granted.", "If you are in Australia on a Working Holiday, visitor or 485 visa and planned to switch to a student visa, you now need to apply from outside Australia. Plan the trip and the timing before you accept an offer.", "If Australia was your choice because of family, compare Canada, New Zealand and the UK on their current rules using the table above, not on the version you read last year.", "Whatever you decide, the English requirement is the one part of this you fully control, and a higher band widens every option at once. Get the score first."] },
      { heading: "Get the band that keeps your options open", paragraphs: ["A 6.5 with nothing below 5.5 is now the floor for the Temporary Graduate route, and a 7.0 across the board opens skilled pathways in every destination country, not just Australia. On IELTSVega you can sit full timed mock tests, practise Writing and Speaking with instant AI band feedback against the official criteria, and see exactly which skill is holding your overall band down — which is the difference between retaking one skill and retaking the whole test."] },
      { heading: "Sources", paragraphs: ["Checked on 3 October 2026. The dependants and onshore rules took effect on 2 October 2026; the 485 change and the July 2027 transfer visa are announced but not yet in force."], links: [
        { label: "Home Affairs: changes to Student visa application rules (subclasses 500 & 590)", href: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/changes-to-student-visa-application-rules-500-590" },
        { label: "Home Affairs: including or adding family members", href: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/changes-to-student-visa-application-rules-500-590/family-members" },
        { label: "Migration Amendment (Student Visa Reform) Regulations 2026 (F2026L01347)", href: "https://www.legislation.gov.au/F2026L01347/asmade/text" },
        { label: "Student visa applications to be made from outside Australia (F2026L01348)", href: "https://www.legislation.gov.au/F2026L01348/asmade/text" },
        { label: "LIN 26/087: classes of persons for student visa applications (F2026L01349)", href: "https://www.legislation.gov.au/F2026L01349/asmade/text" },
        { label: "Transcript: Tony Burke, National Press Club address, 17 September 2026", href: "https://www.tonyburke.com.au/speechestranscripts/transcript-national-press-club-address-17-september-2026" },
        { label: "Minister for Home Affairs: migration reform announcement", href: "https://minister.homeaffairs.gov.au/TonyBurke/Pages/migration-reform-end-rorts-bring-skills-australia-needs-strong-economy.aspx" },
        { label: "Study Australia: student visa application charge increase", href: "https://www.studyaustralia.gov.au/en/tools-and-resources/news/student-visa-application-charge-increase" },
        { label: "IRCC: changes to open work permits for family members (Canada)", href: "https://www.canada.ca/en/immigration-refugees-citizenship/news/notices/changes-open-work-permits-family-members-temporary-residents.html" },
      ] },
    ],
    faqs: [
      { q: "Can I bring my wife on an Australian student visa in 2026?", a: "For most students, no. Since 2 October 2026 a partner or child can only be included if you are a PhD student, a Defence or DFAT-sponsored student, on a course fully funded by a foreign government, or a Pacific or ASEAN national. What counts is the date you lodge: applications made on or before 1 October follow the old rules." },
      { q: "Is the student dependants ban already law?", a: "Yes. It was announced on 17 September 2026, made as a regulation on 1 October, and took effect on 2 October 2026. It applies to student visa applications lodged on or after that day." },
      { q: "Does the dependants ban apply to the 485 Temporary Graduate visa?", a: "It was announced for graduate visas too, but the regulation that took effect on 2 October 2026 covers student visas only. As of 3 October 2026 no change to 485 family rules has been published. Families already on a 485 are not affected; check Home Affairs before lodging." },
      { q: "Can I still add my wife as a subsequent entrant?", a: "No. Since 2 October 2026 family members cannot be added to a student visa after it has been granted, and Home Affairs says there are no exemptions, so this applies to PhD students and Pacific and ASEAN nationals too. If you are exempt, include your family in the application itself." },
      { q: "Can I switch from a working holiday visa to a student visa in Australia?", a: "Not from inside Australia any more. Since 2 October 2026, Working Holiday and Work and Holiday visa holders, visitors and Temporary Graduate holders, among others, must lodge a student visa application from outside Australia and be outside Australia when it is granted." },
      { q: "Is a master's by research exempt from the dependants ban?", a: "No. The exemption covers doctoral degrees only. A master's by research is not named, so its students fall under the general rule." },
      { q: "What happens to my family who are already in Australia?", a: "They keep their current visa. If they held a student visa as your family member on 2 October 2026, or had applied before then and were granted afterwards, they can also be included in your next student visa application." },
      { q: "Can a spouse of a student visa holder work in Australia?", a: "Yes, under the current rules. If the student is doing a master's or a doctorate, the spouse can work unlimited hours; otherwise the spouse is limited to 48 hours a fortnight. The spouse cannot start work until the student's course has started." },
      { q: "Can I change my student visa to a partner visa in Australia?", a: "Only if your partner is an Australian citizen, permanent resident or eligible New Zealand citizen, because a partner visa is sponsored by them. The dependants change does not create a new partner visa route, and a partner visa is a separate, much longer application with its own requirements." },
      { q: "What is the age limit for a dependent child on an Australian student visa?", a: "A child can be included only if they are under 18 when the decision on the visa is made. Since 2 October 2026, children can be included only if you are in an exempt group or they already hold a student visa as your family member." },
      { q: "Has the IELTS score for an Australian student visa changed?", a: "No. The 2 October 2026 regulation contained no change to English testing. The current English rules date from 7 August 2025: the Temporary Graduate visa needs 6.5 overall with no band below 5.5, Competent English remains 6.0 in each skill, and remote-proctored or at-home tests are not accepted for any Australian visa regardless of provider." },
      { q: "Can I still change my course or university in Australia?", a: "Only upward from inside Australia. Since 2 October 2026 a student visa holder can apply onshore for one further course at a higher qualification level, or to finish the current course within 12 months; otherwise the application must be made from outside Australia. A 12-month bar on changing provider and a transfer visa from July 2027 have been announced but are not yet in force." },
    ],
  },
  {
    slug: "ielts-test-centres-near-me",
    seoTitle: "IELTS Centres Near Me: How to Find & Choose One",
    title: "IELTS centres near me: how to find and choose the right test centre",
    excerpt:
      "How to find every official IELTS test centre near you, what actually differs between centres, and how to pick the one that gives you the best shot at your band.",
    category: "Booking",
    date: "August 2026",
    publishedAt: "2026-08-04",
    readMins: 9,
    keywords: [
      "ielts centres near me",
      "ielts centers near me",
      "ielts test centre near me",
      "ielts exam centre near me",
      "find ielts test centre",
      "ielts test centre",
      "ielts test locations",
      "book ielts",
      "ielts exam",
      "ielts practice",
    ],
    sections: [
      { paragraphs: ["\"IELTS centres near me\" is one of the most searched IELTS queries there is, and the results are usually a mess of coaching institutes that are not test centres at all. Only two organisations deliver IELTS: the British Council and IDP: IELTS. A genuine test centre is one they have authorised, and there are over 800 of them across more than 130 countries. Almost everything else competing for that search term is a tuition centre, an agent, or both.", "Here is how to find the real ones, what actually differs between them, and how to choose."] },
      { heading: "Where to look, and what to ignore", bullets: ["Use the official test-centre finder on ielts.org, or the booking site for the British Council or IDP in your country. Both list every authorised location.", "Search by city, not by \"near me\". The official finders are city- and country-based, not GPS-based.", "Ignore results offering \"IELTS classes\" alongside \"IELTS booking\". A coaching institute can help you register, but you are still booking through the British Council or IDP, and you should never pay a third party a markup to do it.", "Be sceptical of any site promising a guaranteed date, a guaranteed band, or a certificate without a test. Those are scams, and IELTS results are verified electronically by receiving organisations."] },
      { heading: "British Council or IDP: does it matter?", paragraphs: ["Not for your score. Both deliver the identical test, mark to the identical band descriptors, and issue a Test Report Form that carries the same weight everywhere. The practical differences are date availability, centre location, and occasionally price.", "One thing is worth checking: for a UK visa you need IELTS for UKVI, which is only offered at a subset of centres approved by the UK Home Office. If that is your route, filter for UKVI-approved centres before you look at anything else."] },
      { heading: "What actually differs between the centres near you", bullets: ["Date and slot availability, the single biggest difference. A centre an hour further away may have a slot three weeks sooner.", "Test format offered. Since paper-based delivery was retired in most markets in mid-2026, nearly all centres run computer-delivered IELTS, but the \"Writing on Paper\" option exists only in selected markets and centres.", "Speaking scheduling. Some centres run Speaking on the same day as the other three skills, others place it on a separate day up to a week either side.", "Whether they offer IELTS for UKVI, IELTS Life Skills, or One Skill Retake.", "Facilities: room size, keyboard type, headphone quality, distance from public transport, whether there is parking."] },
      { heading: "How to choose between two nearby centres", paragraphs: ["Rank on these, in this order. First, does it offer the exact test you need (Academic or General Training, UKVI or standard)? Getting that wrong invalidates your application, and no other factor comes close. Second, does it have a date that leaves you enough preparation time and enough buffer before your application deadline? Third, can you get there calm and early. A centre you reach after a two-hour commute costs you more band than a slightly less convenient date would.", "Speaking is the part people underestimate. If your Speaking test is scheduled for a separate day, factor in a second trip. Some candidates deliberately pick a centre with same-day Speaking purely to avoid travelling twice."] },
      { heading: "What to check before you pay", bullets: ["The exact address of the test room, not just the centre's head office. Some centres run tests at a different venue.", "The ID rules. You must present the same passport or national ID you registered with, and centres refuse entry over mismatches every single day.", "The arrival time, which is usually well before the start time. Latecomers are normally refused entry with no refund.", "The centre's rules on what you can bring into the room (usually ID and a clear bottle of water, and nothing else).", "The reschedule and cancellation policy, and the deadline after which you lose most of the fee."] },
      { heading: "Do not let \"near me\" decide your date", paragraphs: ["The most common mistake is booking the nearest centre's next available slot before you are ready, then sitting a test you were three weeks short for. A retake costs the full fee again. Distance is a one-day inconvenience; an under-prepared test date is a wasted fee and a lost month.", "Book when your practice scores are consistently at or above your target band, then pick the best centre among those with dates in that window."] },
      { heading: "Be ready before you walk in", paragraphs: ["Finding a centre near you is the easy part. Walking in already scoring your target band is what decides the day. On IELTSVega you can sit full computer-delivered mock tests on real timing, get instant AI band scores on Writing and Speaking against all four official criteria, and see exactly which skill is holding your overall band down, so you book the centre near you at the right moment rather than the earliest one."] },
    ],
    faqs: [
      { q: "How do I find an official IELTS test centre near me?", a: "Use the test-centre finder on ielts.org, or the booking site of the British Council or IDP: IELTS in your country. Those are the only two organisations that deliver IELTS. Anything else appearing in a \"near me\" search is a coaching institute or an agent, not a test centre." },
      { q: "Is there a difference between a British Council and an IDP test centre?", a: "Not for your score. Both deliver the same test, mark against the same band descriptors and issue an equally accepted Test Report Form. The practical differences are available dates, location and sometimes price. For a UK visa, check the centre is approved for IELTS for UKVI." },
      { q: "Can I take IELTS at a centre in a different city or country?", a: "Yes, you can book any centre you can travel to. Note that One Skill Retake must be taken in the same country as your original test, so if you might use it, factor that in before booking somewhere far from home." },
      { q: "How far in advance should I book my nearest IELTS centre?", a: "Aim for four to six weeks ahead, and longer for peak periods such as June to August and December to January, when seats in major cities fill fastest. Computer-delivered dates are far more frequent than paper ever was, but popular weekend slots still go quickly." },
    ],
  },
  {
    slug: "ielts-exam-dates-slot-booking-2026",
    seoTitle: "IELTS Slot Booking 2026: Finding Available Dates",
    title: "IELTS slot booking in 2026: how to find an available date fast",
    excerpt:
      "Every IELTS slot in your city taken? Here is how test dates are released, when demand peaks, and the practical tactics that get you an earlier date.",
    category: "Booking",
    date: "August 2026",
    publishedAt: "2026-08-05",
    readMins: 8,
    keywords: [
      "ielts slot booking",
      "ielts exam dates 2026",
      "ielts test dates",
      "ielts booking",
      "ielts slot availability",
      "book ielts test online",
      "ielts registration",
      "ielts exam",
      "computer based ielts",
      "ielts practice",
    ],
    sections: [
      { paragraphs: ["Booking IELTS used to mean picking from a handful of fixed Saturdays. Since delivery moved to computer, major cities run tests on most days of the week, often with morning, afternoon and evening slots. And yet candidates still open the booking page and find nothing for six weeks. Here is why, and what to do about it."] },
      { heading: "How dates are actually released", paragraphs: ["Test centres publish dates in blocks, typically covering the next two to three months, and top them up as capacity is confirmed. Two things follow. First, a date that does not exist today may appear next week, so an empty calendar is not a closed door. Second, the last dates in a published block are the least contested, because most people book from the front of the list."] },
      { heading: "When demand peaks", bullets: ["June to August and December to January are the heaviest periods, driven by university intake deadlines. Book four to six weeks ahead in these windows.", "February to April and September to November are noticeably easier. You can often find something within two weeks.", "Weekend and morning slots go first everywhere. Weekday afternoon and evening slots frequently sit open.", "Test cycles around major visa deadlines in your own country can spike locally, regardless of the global pattern."] },
      { heading: "Six tactics that find you an earlier slot", bullets: ["Widen the city, not just the date. A centre 60 to 90 minutes away often has capacity when your nearest one does not.", "Check both providers. The British Council and IDP publish separate calendars, and candidates routinely check only one.", "Take a weekday slot. If you can take a day off, you will usually find something one to two weeks sooner.", "Check back mid-week. Cancellations and transfers release seats, and they are re-listed immediately rather than held.", "Book the confirmed date you can get, then use the reschedule window if a better one appears. Check the fee and deadline first, because rescheduling is usually cheaper than losing the seat.", "If your Speaking test can be on a separate day, do not filter that out. Same-day Speaking slots are the scarcest part of the calendar."] },
      { heading: "What to have ready before you start", paragraphs: ["Complete the booking in one sitting. The slot you have selected is held only for a short window, and abandoned bookings release it. Have your passport or accepted national ID open in front of you: the name and number must match exactly, because you will present that same document at the centre, and a mismatch means refused entry.", "Decide two things before you start clicking: Academic or General Training, and standard IELTS or IELTS for UKVI. Both are chosen during booking, both are difficult to change afterwards, and choosing wrong is the most expensive mistake in the whole process."] },
      { heading: "Rescheduling and cancelling", paragraphs: ["Most centres let you move or cancel your test up to about five weeks before the date for an administrative fee, and refund little or nothing after that. Medical cancellations with documentation are usually treated separately. The exact deadlines and fees vary by country and provider, so read the terms your centre shows during booking rather than a general article, including this one."] },
      { heading: "Pick the date your practice supports", paragraphs: ["The best predictor of a good IELTS day is not the slot you got, it is whether your practice scores are already sitting at your target band. Work backwards: get to consistent target-band mocks, then book the first date after that. On IELTSVega you can sit full timed mock tests and get instant AI band scores on Writing and Speaking, so you know precisely when you are ready to spend the fee."] },
    ],
    faqs: [
      { q: "How far in advance should I book my IELTS test?", a: "Four to six weeks is a good default, and longer between June and August or December and January when demand peaks. Booking too early carries its own risk: pick a date you can realistically be prepared for, because a retake costs the full fee again." },
      { q: "Why are there no IELTS slots available in my city?", a: "Centres publish dates in two to three month blocks and top them up as capacity is confirmed, so an empty calendar usually means the next block has not been released yet. Check both the British Council and IDP calendars, look at nearby cities, and check back mid-week when cancellations are re-listed." },
      { q: "Can I change my IELTS test date after booking?", a: "Usually yes, up to about five weeks before your test date, for an administrative fee. Inside that window you typically forfeit most of the fee unless you have a documented medical reason. Check the exact terms shown by your test centre during booking." },
      { q: "Are IELTS test dates available every day?", a: "In major cities, computer-delivered IELTS now runs on most days of the week, often with several slots a day. Smaller centres run fewer dates. Weekend and morning slots are the most contested; weekday afternoons are usually the easiest to get." },
    ],
  },
  {
    slug: "ielts-exam-fee-2026",
    seoTitle: "IELTS Exam Fee 2026: Cost by Country Explained",
    title: "IELTS exam fee in 2026: what it costs, and the fees nobody mentions",
    excerpt:
      "What IELTS costs in 2026, why the UKVI version costs more, and the rescheduling, remarking and re-sit fees that quietly turn one test into three payments.",
    category: "Booking",
    date: "August 2026",
    publishedAt: "2026-08-06",
    updatedAt: "2026-10-03",
    readMins: 9,
    keywords: [
      "ielts exam fee",
      "ielts fees 2026",
      "ielts test cost",
      "ielts price",
      "ielts registration fee",
      "ielts fee in india",
      "ielts ukvi fee",
      "book ielts",
      "ielts exam",
      "ielts practice",
    ],
    sections: [
      { paragraphs: ["IELTS is not cheap, and the headline fee is only part of what people actually end up paying. Below is what the test costs in 2026, what drives the differences between countries, and the secondary fees that catch candidates out.", "One caveat before any number: fees are set locally, change without much notice, and move with exchange rates. Treat everything here as a planning figure and confirm the current price on your test centre's booking page before you commit."] },
      {
        heading: "Roughly what it costs in 2026",
        table: {
          caption: "Planning figures for IELTS Academic and General Training. USA figure checked on ielts.org 2 October 2026; others last reviewed 14 September 2026.",
          headers: ["Where", "Standard test fee", "Notes"],
          rows: [
            ["Global range", "≈ USD 230 – 490 equivalent", "Set locally by the British Council and IDP"],
            ["India", "≈ INR 19,000", "Rose from INR 18,000 on 1 April 2026"],
            ["United States", "USD 325 at most centres", "Rose from USD 285 on 1 October 2026"],
            ["United Kingdom", "≈ USD 210 – 230 equivalent", "Varies with the GBP rate"],
            ["Canada", "≈ USD 230 equivalent", "—"],
            ["Australia", "≈ AUD 415 – 430", "Among the more expensive markets"],
            ["IELTS for UKVI", "+10 – 15% on the standard fee", "The centre reports your test details to the UK Home Office"],
          ],
        },
        paragraphs: ["The same test costs different amounts in different places, and the UKVI premium applies on top of whatever the local standard fee is. If you are comparing quotes between centres in the same country and they differ by more than a few percent, one of them is quoting the UKVI or Life Skills fee rather than the standard one."],
      },
      { heading: "Why is IELTS so expensive?", paragraphs: ["Because a person marks it. Your Writing is assessed by a trained examiner, and your Speaking is a live interview with one, so every candidate uses examiner time that fully automated tests do not pay for. That is the main reason IELTS costs more than PTE or the Duolingo English Test. The rest of the fee goes on:"], bullets: ["Human examiners. Two of the four sections are marked by trained, certified people, and the Speaking test needs an examiner present for every single candidate.", "Supervised, secure test days. ID checks on arrival, invigilated rooms and secure test materials cost money at every sitting.", "Local operating costs. Venue hire, staff, taxes and exchange rates differ by country, which is why the fee is set market by market rather than globally.", "Extra requirements for some versions. IELTS for UKVI adds the UK Home Office's reporting rules and is only run at approved centres, so it costs more again."] },
      { heading: "Why the same test costs different amounts", paragraphs: ["The fee is set per market by the British Council and IDP, and it absorbs local costs: venue hire, examiner pay, invigilation, and the Speaking examiner's time. It also reflects what the local market will bear. None of this changes the test you sit or the score you get: a USD 325 test in the United States and an INR 19,000 test in India are the same paper, marked to the same standard."] },
      { heading: "The fees nobody mentions", bullets: ["Rescheduling: typically an administrative fee if you move your date more than about five weeks out.", "Cancellation: usually a partial refund before the deadline, and little or nothing after it. Documented medical cases are handled separately.", "Enquiry on Results (a remark): a fee that is refunded in full if any band changes. You normally have six weeks from your test date to apply.", "One Skill Retake: a separate fee, though generally lower than a full test. That is the point of it.", "Extra Test Report Forms sent to institutions beyond the free allowance.", "A full re-sit: the entire fee again, which is why the cheapest thing you can buy in IELTS is preparation."] },
      { heading: "How to spend it once", paragraphs: ["The real cost of IELTS is not the fee, it is the number of times you pay it. Two sittings plus a remark costs more than most people's entire preparation budget. Three things reduce the odds of a second payment: know your exact requirement including any per-skill minimum, practise in the format you will actually sit, and only book once your timed mock scores are consistently at or above target.", "If you fall short in exactly one skill, check One Skill Retake before booking a full test. It is computer-delivered only, must be taken within 60 days of your original test and in the same country, and is available across most of the 110+ IELTS countries, though not in the United States. Confirm your receiving organisation accepts a One Skill Retake result before relying on it."] },
      { heading: "Is IELTS worth it against cheaper tests?", paragraphs: ["Duolingo English Test and PTE Academic are usually cheaper. Acceptance is what decides it. IELTS is accepted by essentially every university and immigration system that asks for English, while the cheaper tests are accepted broadly but not universally, and some visa routes still specify IELTS. Check your specific university, employer or visa route first: a cheaper test your institution does not accept costs you 100% of its fee."] },
      { heading: "Get your money's worth on the first attempt", paragraphs: ["The most expensive IELTS is the one you sit twice. On IELTSVega you can sit full timed mock tests, get instant AI band scores on Writing and Speaking against all four criteria, and work through 15,000+ Academic and General Training questions, so the fee buys a result rather than a diagnostic."] },
      {
        heading: "Fees by country",
        paragraphs: ["This page is the global picture. For a single market in detail, including local fee changes and what is and is not accepted there:"],
        links: [
          { label: "IELTS exam fee in the USA: USD 325 since 1 October 2026", href: "/blog/ielts-exam-fee-usa" },
          { label: "Australia student visa new rules for spouses and dependents (in force from 2 October 2026)", href: "/blog/australia-student-visa-dependants-ban-2026" },
        ],
      },
    ],
    faqs: [
      { q: "How much does the IELTS exam cost in 2026?", a: "Globally the fee typically falls between about USD 230 and USD 490 equivalent, set locally by the British Council and IDP. In India it rose to roughly INR 19,000 from 1 April 2026. Always confirm the current price on your test centre's booking page, as fees change without much notice." },
      { q: "Why does IELTS for UKVI cost more?", a: "IELTS for UKVI is the same test under additional UK Home Office administrative and reporting requirements, and it is only offered at approved centres. That typically adds around 10 to 15% to the standard fee in most markets." },
      { q: "Is the IELTS fee refundable if I cancel?", a: "Usually you receive a partial refund if you cancel more than about five weeks before your test date, and little or nothing after that. Documented medical reasons are normally handled separately. Check your centre's specific terms, which are shown during booking." },
      { q: "Is One Skill Retake cheaper than sitting IELTS again?", a: "Yes. It carries its own fee, but it is generally lower than a full test, which is the reason it exists. It applies only to computer-delivered tests, must be taken within 60 days and in the same country as your original test, and is not available in the United States." },
      { q: "Did the IELTS fee increase in 2026?", a: "Yes, in several markets. In India the fee rose to around INR 19,000 from 1 April 2026, up from INR 18,000. In the United States it rose from USD 285 to USD 325 at most centres on 1 October 2026. Fees are set per market rather than globally, so an increase in one country does not mean every country changed. Check your own centre's booking page for the figure that applies to you." },
      { q: "Is an IELTS score valid for 5 years?", a: "No. An IELTS Test Report Form is normally valid for two years from your test date. Some institutions and immigration routes accept older results in specific circumstances, but two years is the standard validity and you should plan around it. If your result is close to expiring and you still need it, budget for a re-sit rather than assuming an extension." },
      { q: "Why is IELTS so expensive?", a: "Most of the cost is the Speaking test. IELTS is marked by trained human examiners, and the Speaking section is a live one-to-one interview that has to be scheduled, staffed and assessed individually. Add venue hire, invigilation and secure test materials, and you get a fee well above fully automated tests. It is also priced to what each local market will bear, which is why the same test costs very different amounts in different countries." },
    ],
  },
  /* ---------------------------------------------------------------- *
   * Country fee pages.
   *
   * TARGETING: geo-modified fee intent. `ielts-exam-fee-2026` stays the
   * global hub and owns the country-comparison table; each country page
   * owns one market in depth and links back to the hub.
   *
   * Why country pages and NOT city pages: on 14 Sep 2026 the SERP for
   * "ielts exam fee in delhi" returned only nation-level pages from IDP,
   * PW and KC Overseas, plus ielts.org's own per-centre listings. Not one
   * content site ranked with a city page, because the fee is national.
   * The single site that addressed the city did it with a city TABLE
   * inside a national page. Copy that, and do not generate city pages —
   * our templated /ielts-band/[band] pages all sit at position 38-66,
   * which is what templated pages do on a domain with no authority.
   *
   * The USA is the first of these because it is our second-largest market
   * by impressions (411 in the 28 days to 12 Sep 2026) against a single
   * click at position 38.0 — the biggest untapped demand we can see.
   * ---------------------------------------------------------------- */
  {
    slug: "ielts-exam-fee-usa",
    seoTitle: "IELTS Exam Fee in the USA: USD 325 Since 1 October 2026",
    title: "IELTS exam fee in the USA 2026: USD 325 since 1 October",
    excerpt:
      "IELTS now costs USD 325 at most US centres, up USD 40 on 1 October 2026. IELTS Online is USD 244.40. What the fee covers, extra charges and other countries.",
    category: "Booking",
    date: "September 2026",
    publishedAt: "2026-09-14",
    updatedAt: "2026-10-02",
    readMins: 5,
    keywords: [
      "ielts exam fee usa",
      "ielts test fee united states",
      "how much does ielts cost in usa",
      "ielts fee increase october 2026",
      "ielts price usa 2026",
      "ielts academic fee usa",
      "ielts general training fee usa",
      "ielts test centre usa cost",
    ],
    sections: [
      { paragraphs: ["IELTS in the United States now costs USD 325 at most test centres, for both Academic and General Training. The fee rose by USD 40, about 14%, for tests taken on or after 1 October 2026. Before that date it was USD 285. IELTS Online, sat at home, is still USD 244.40."], links: [{ label: "The F-1 four-year rule and what the court ruling means", href: "/blog/us-f1-duration-of-status-rule-blocked-2026" }] },
      {
        heading: "IELTS fees in the USA",
        table: {
          caption: "Standard test-centre fees from ielts.org test centre listings (New York City Metro, San Francisco, Washington DC, Fort Worth, Salt Lake City). First checked 14 September 2026, rechecked 2 October 2026.",
          headers: ["Test", "Now (from 1 Oct 2026)", "Before 1 Oct 2026", "Change"],
          rows: [
            ["IELTS Academic", "USD 325", "USD 285", "+USD 40"],
            ["IELTS General Training", "USD 325", "USD 285", "+USD 40"],
            ["IELTS Online (at home)", "USD 244.40", "USD 244.40", "Unchanged"],
          ],
        },
        paragraphs: ["USD 325 is the price most centres list, but it is not quite national. Some centres add a non-refundable admin fee on top, and one ELS centre lists USD 325 plus USD 15, so USD 340 in total. British Council quotes a US range of about USD 280 to 340 depending on location. Check the total on your centre's booking page before you pay."],
      },
      { heading: "What changed on 1 October 2026", paragraphs: ["The standard fee at US test centres went from USD 285 to USD 325. The increase applies by test date, not by booking date, so a test taken on or after 1 October is charged at the new price at most centres even if you are only booking now.", "If you missed the old price, do not rush to make up for it. A re-sit costs the full fee again, so the cheapest test is the one you only sit once. Book when your timed mock scores are consistently at or above the band you need."], links: [{ label: "An IELTS 4-week study plan, if your test is a month away", href: "/blog/ielts-4-week-study-plan" }] },
      { heading: "What the fee covers, and what it does not", bullets: ["All four sections — Listening, Reading, Writing and a face-to-face Speaking interview with a human examiner.", "One Test Report Form for you, plus a number of copies sent directly to receiving institutions (the free allowance varies by centre).", "It does not cover an Enquiry on Results, which is charged separately and refunded in full if any band changes.", "It does not cover rescheduling, which normally carries an administrative fee if you move your date more than about five weeks out.", "It does not cover One Skill Retake, which has its own lower fee — and note that One Skill Retake is not available in the United States."] },
      { heading: "IELTS Online versus a test centre", paragraphs: ["IELTS Online costs USD 244.40 and is sat at home under remote proctoring, which makes it the cheaper option and it was not affected by the October increase. The catch is acceptance: IELTS Online is not accepted for UK visa purposes, is not accepted by every university, and cannot be used where a UKVI-approved test is required. Confirm with the organisation receiving your score before you book it, because a cheaper test that is not accepted is the most expensive option of all."] },
      {
        heading: "IELTS fees outside the USA",
        table: {
          caption: "Planning figures. Fees are set locally and change; confirm on your centre's booking page.",
          headers: ["Where", "Standard test fee"],
          rows: [
            ["United States", "USD 325 at most centres"],
            ["India", "≈ INR 19,000"],
            ["Canada", "≈ USD 230 equivalent"],
            ["United Kingdom", "≈ USD 210 – 230 equivalent"],
            ["Australia", "≈ AUD 415 – 430"],
          ],
        },
        paragraphs: ["Fees vary sharply by country. For the full picture, the extra fees and why IELTS for UKVI costs more:"],
        links: [
          { label: "IELTS exam fee in 2026: global costs and the fees nobody mentions", href: "/blog/ielts-exam-fee-2026" },
          { label: "How the IELTS band score is calculated, and how to raise it", href: "/blog/how-ielts-band-score-is-calculated" },
          { label: "IELTS practice tests with answers, free to start", href: "/blog/best-free-ielts-practice-tests-online" },
        ],
      },
    ],
    faqs: [
      { q: "How much does IELTS cost in the USA in 2026?", a: "USD 325 at most test centres for tests taken on or after 1 October 2026, up from USD 285. The fee is the same for IELTS Academic and IELTS General Training. IELTS Online, sat at home, costs USD 244.40. Some centres add an admin fee, so confirm the total on your centre's booking page." },
      { q: "Did the IELTS fee go up in the USA?", a: "Yes. The standard fee at US test centres rose from USD 285 to USD 325 for tests taken on or after 1 October 2026, an increase of about 14%. The change is tied to the test date, so a test sat now is charged at the new price at most centres." },
      { q: "Is IELTS cheaper in some US cities than others?", a: "Barely. Most centres list the same USD 325, including those in New York, San Francisco and Washington DC. A few add a non-refundable admin fee, and British Council quotes a range of about USD 280 to 340 depending on location. The difference is rarely worth travelling for, so choose your centre on date availability and convenience." },
      { q: "Why is IELTS so expensive?", a: "Mostly because of the Speaking test. It is a live one-to-one interview with a trained human examiner, which has to be scheduled, staffed and marked individually. Add venue hire, invigilation and secure test materials, and the fee ends up well above fully automated tests." },
      { q: "Is IELTS Online accepted in the USA?", a: "It depends entirely on who is receiving your score. IELTS Online is cheaper at USD 244.40, but it is not accepted for UK visa and immigration purposes and not every university accepts it. Confirm acceptance in writing with your institution before booking, because an unaccepted result means paying for the test twice." },
      { q: "Can I retake just one section of IELTS in the USA?", a: "No. One Skill Retake is available in most IELTS countries but not in the United States. If you fall short in a single skill, a full re-sit at the current fee is the only route, which is a strong argument for not booking until your practice scores are consistently at target." },
    ],
  },
  {
    slug: "computer-delivered-ielts-guide",
    seoTitle: "Computer-Delivered IELTS: On-Screen Guide (2026)",
    title: "Computer-delivered IELTS: a screen-by-screen guide for 2026",
    excerpt:
      "Paper IELTS is gone in most markets. Exactly what the computer-delivered test looks like on screen, the tools you get, and the habits you need to change.",
    category: "Test format",
    date: "August 2026",
    publishedAt: "2026-08-07",
    readMins: 10,
    keywords: [
      "computer based ielts",
      "computer delivered ielts",
      "ielts on computer",
      "cd ielts",
      "ielts online test format",
      "ielts 2026 changes",
      "ielts exam",
      "ielts practice",
      "listening ielts",
      "reading ielts",
    ],
    sections: [
      { paragraphs: ["From mid-2026, IELTS is a computer-delivered test in most markets. The final paper-based date in most locations was 27 June 2026. The content, the timing and the 9-band scale are unchanged. What changed is the interface, and the interface is where a lot of people quietly lose half a band on their first attempt.", "This is what you will actually see, section by section."] },
      { heading: "What is identical to paper", bullets: ["The same four skills, the same question types, the same number of questions.", "The same total time: about 30 minutes for Listening, 60 for Reading, 60 for Writing, 11 to 14 for Speaking.", "Speaking is still a live conversation with a real examiner, in person or by video call at the centre. It is not recorded and marked later, and it is not an AI.", "The same band descriptors and the same marking standards. A Band 7 means exactly what it meant on paper."] },
      { heading: "The screen you get in every section", paragraphs: ["The layout is consistent: the question or passage occupies the main area, a timer sits at the top and turns to a warning colour in the last 10 and 5 minutes, and a numbered question navigator runs along the bottom so you can jump to any question and see which you have answered.", "You also get three tools worth practising with: text highlighting, a notes function, and a review flag on individual questions. Nobody reads your highlights or notes. They exist purely to reproduce what you used to do with a pencil."] },
      { heading: "Listening: the two-minute difference", paragraphs: ["The recording plays once, as always. The change that catches people out is at the end. Paper gave you 10 minutes to transfer answers to an answer sheet. On computer there is no transfer, because you type straight into the answer box, and you get about two minutes to check.", "That is a net gain if you use it correctly. It means typing your answer as you hear it rather than scribbling and copying later. It also means spelling matters in real time, and a misspelt answer is simply wrong. This is the largest source of avoidable Listening loss."] },
      { heading: "Reading: scrolling is the skill", paragraphs: ["The passage sits on one side and the questions on the other, with a draggable divider. Long Academic passages do not fit on one screen, so you scroll, and losing your place while scrolling is the main reason people report that reading feels slower on computer.", "Two habits fix it. Highlight the keywords in each question before you go hunting, so your eye has a target. And answer in passage order wherever the question type allows it, since most IELTS question sets follow the text, so you scroll in one direction rather than jumping."] },
      { heading: "Writing: the word count is free information", bullets: ["You type both tasks. There is a live word count, so the old skill of estimating 250 words by eye is obsolete. Use the count and stop guessing.", "Cut, copy and paste work, so restructuring a paragraph is cheap. Take advantage: write your Task 2 body paragraphs in whatever order they come, then reorder.", "There is no spell-checker and no grammar checker. Proofreading is entirely on you, and it is worth the last three minutes.", "Typing speed matters. If you type under about 30 words per minute, that is a real risk to your Writing band, and it is the single most improvable thing on this list."] },
      { heading: "Results arrive faster, which changes your planning", paragraphs: ["Computer-delivered results usually arrive within 3 to 5 days, against up to 13 days for paper. If you are working to an application deadline, that shortens the buffer you need. It also means a One Skill Retake, which must happen within 60 days of your original test, is genuinely usable rather than theoretical."] },
      { heading: "The 'Writing on Paper' option", paragraphs: ["In selected markets you can choose to handwrite the Writing component while Listening and Reading run on computer. It is an option at some centres, not the default, and availability varies. If handwriting is genuinely faster for you than typing, check whether your centre offers it before you book, but be aware that you are also giving up the live word count and free editing."] },
      { heading: "Practise on the screen you will sit", paragraphs: ["Familiarity with the interface is worth real marks, and it is free. IELTSVega runs entirely in your browser with a typed Writing editor and word count, on-screen Listening and Reading with highlighting, and full timed mock tests that mirror the computer-delivered experience, plus instant AI band scoring on Writing and Speaking so you know where you actually stand."], links: [{ label: "Computer or paper: which to choose", href: "/blog/ielts-online-vs-paper-based" }] },
    ],
    faqs: [
      { q: "Is IELTS fully computer-based now?", a: "In most markets, yes. Paper-based delivery was retired from mid-2026, with the final paper date in most locations on 27 June 2026. A \"Writing on Paper\" option exists in selected markets, where you handwrite the Writing component while the rest runs on computer." },
      { q: "Is computer-delivered IELTS easier than paper?", a: "It is the same test with the same questions and the same band descriptors, so neither is easier by design. In practice it favours people who type well and are comfortable reading on screen, and it removes handwriting legibility as a risk. Familiarity with the interface is the deciding factor." },
      { q: "Do I still get 10 minutes to transfer Listening answers?", a: "No. That transfer time existed because paper needed an answer sheet. On computer you type answers directly during the recording and get about two minutes at the end to check them, so accurate spelling as you listen matters more." },
      { q: "Is the Speaking test done on a computer too?", a: "No. Speaking remains a live conversation with a certified examiner, either face to face or by video call at the test centre. It is not recorded for later marking and it is not scored by software." },
    ],
  },
  {
    slug: "ielts-one-skill-retake-guide",
    seoTitle: "IELTS One Skill Retake: Rules, Cost & Deadline",
    title: "IELTS One Skill Retake: the rules, the 60-day deadline, and who accepts it",
    excerpt:
      "Retake just Listening, Reading, Writing or Speaking instead of the whole exam. The eligibility rules, the deadline, what it costs, and the acceptance catch.",
    category: "Test format",
    date: "August 2026",
    publishedAt: "2026-08-08",
    updatedAt: "2026-09-19",
    readMins: 9,
    keywords: [
      "ielts one skill retake",
      "ielts osr",
      "retake one ielts section",
      "ielts retake",
      "ielts one skill retake eligibility",
      "ielts 2026 changes",
      "ielts score",
      "ielts exam",
      "band ielts",
      "ielts practice",
    ],
    sections: [
      { paragraphs: ["You needed 7.0 in every skill. You got 7.5, 7.5, 7.5 and 6.5 in Writing. Until recently that meant sitting the entire three-hour exam again and paying the whole fee to fix one number. One Skill Retake ends that: you re-sit the single skill that let you down and receive an updated Test Report Form.", "It is genuinely useful, and it comes with specific rules that people get caught by. Here they are."] },
      { heading: "The eligibility rules", bullets: ["Your original test must have been computer-delivered. Since paper was retired in most markets in 2026, this is now the default rather than a restriction.", "You must take the retake within 60 days of your original test date.", "It must be taken in the same country as your original test.", "You can use it once per full test. Retake a skill, and if you want another attempt after that, it is a full test again.", "You retake exactly one skill: Listening, Reading, Writing or Speaking.", "There is no minimum band required to qualify. You do not need to have nearly passed."] },
      { heading: "Where it is available", paragraphs: ["One Skill Retake runs in most of the 110+ countries where IELTS is offered, and the list has been expanding month by month. The significant exception is the United States, where it is not currently available. Availability can also vary by individual centre, so confirm on your centre's booking page rather than assuming."] },
      { heading: "The catch: not everyone accepts it", paragraphs: ["This is the part that matters most and gets the least attention. One Skill Retake produces a valid Test Report Form, but the organisation receiving it decides whether it will accept a score assembled from two sittings. Most universities do. Some immigration authorities and professional registration bodies require all four skills from a single test date.", "Check with your specific university, employer, visa route or registration body before you pay for a retake. If they require a single sitting, a One Skill Retake result is worth nothing to them and you have spent the fee for nothing."] },
      { heading: "When it is the right call", bullets: ["One skill is below requirement and the other three are comfortably above. Classic case, clear yes.", "Two skills are short. It cannot help you, because you can only retake one. Book a full test.", "Your weak skill is Speaking or Writing. These are the most improvable in a few weeks of focused work with feedback, so a retake has the best odds.", "Your weak skill is Listening or Reading and you missed by one or two raw marks. Often fixable with targeted question-type practice and spelling discipline.", "You are close to the 60-day deadline and have not improved yet. Do not burn the retake to meet a deadline. An unimproved retake is a wasted fee and it uses up your one attempt."] },
      { heading: "How to actually use the 60 days", paragraphs: ["Sixty days is enough to move one skill by half to a full band if you spend it on that skill alone. Do not revise everything. Diagnose the specific loss: is it Task Response or Grammar in Writing? Is it Matching Headings or True/False/Not Given in Reading? Then drill that, under time, with feedback on every attempt.", "The biggest waste of a retake window is general practice. You already know your other three skills are fine. Spend all of it on the one number that has to move."] },
      { heading: "Can you just retake the whole test instead?", paragraphs: ["Yes, and for many candidates it is the better option. There is no limit on how many times you can sit IELTS, and no mandatory waiting period between attempts: you can rebook as soon as there is a seat, subject only to your centre's calendar. You pay the full test fee each time, and your new Test Report Form replaces the old one rather than being combined with it.", "A full re-sit is the right call when two or more skills are short, when the gap is more than half a band, when your 60-day One Skill Retake window has already closed, or when the organisation receiving your score will not accept a combined report. It is also the only route if your original test was paper-based.", "A One Skill Retake is the right call when exactly one skill is short, you know why, and you can name what you would do differently. If you cannot name it, the retake will reproduce the same band and you will have paid for the privilege."], links: [{ label: "Plan the preparation before you rebook", href: "/blog/ielts-4-week-study-plan" }, { label: "When a remark is worth trying first", href: "/blog/ielts-results-trf-validity-remark" }] },
      { heading: "Fix the one skill that is costing you", paragraphs: ["A retake window is short and narrow, which is exactly the situation targeted practice is for. On IELTSVega you can drill one skill by question type, sit timed single sections rather than whole tests, and get instant AI band scoring on Writing and Speaking against all four official criteria, so you know before you rebook whether the number has actually moved."] },
    ],
    faqs: [
      { q: "What is IELTS One Skill Retake?", a: "It lets you re-sit a single section of IELTS, either Listening, Reading, Writing or Speaking, instead of the full test, and receive an updated Test Report Form combining your new score with the other three from your original sitting." },
      { q: "How long do I have to book a One Skill Retake?", a: "You must take it within 60 days of your original test date, in the same country where you sat that test, and your original test must have been computer-delivered. You can use it once per full test." },
      { q: "Do universities accept IELTS One Skill Retake?", a: "Most universities do, but acceptance is decided by the receiving organisation, and some immigration authorities and professional bodies require all four skills from one sitting. Confirm with your specific institution or visa route before you pay for the retake." },
      { q: "Is there a minimum score needed to qualify for One Skill Retake?", a: "No. There is no minimum band requirement. Any candidate who sat a computer-delivered test can book a retake of one skill within the 60-day window, regardless of the original scores." },
      { q: "Can I retake IELTS as many times as I want?", a: "Yes. There is no limit on the number of attempts and no mandatory waiting period between them, so you can rebook as soon as your test centre has a seat. You pay the full fee each time, and each new Test Report Form replaces the previous one rather than being merged with it. The practical limit is preparation: sitting the test again without changing anything about how you prepare generally reproduces the same band." },
      { q: "How much does IELTS One Skill Retake cost?", a: "Centres set their own price and it varies by country, but it is normally lower than a full test fee while still being a substantial proportion of it. Check your own centre's booking page for the exact amount, and weigh it against a full re-sit: if more than one skill is short, paying for a One Skill Retake first and a full test afterwards costs more than going straight to the re-sit." },
      { q: "How many times can you take a One Skill Retake?", a: "One Skill Retake is tied to a specific original test and its 60-day window, and you cannot chain retakes off a retake — a further attempt means sitting a full test again, which then opens its own new window. Confirm the current rule with your test centre when you book, since the policy has been extended to new markets since launch and centre-level detail varies." },
    ],
  },
  {
    slug: "ielts-writing-on-paper-option",
    seoTitle: "IELTS Writing on Paper: The Hybrid Option Explained",
    title: "IELTS 'Writing on Paper': who should take the hybrid option?",
    excerpt:
      "The hybrid format lets you handwrite Writing while Listening and Reading run on computer. What you gain, what you give up, and how to decide before booking.",
    category: "Test format",
    date: "August 2026",
    publishedAt: "2026-08-09",
    readMins: 7,
    keywords: [
      "ielts writing on paper",
      "ielts hybrid format",
      "paper based ielts discontinued",
      "ielts handwriting",
      "ielts 2026 changes",
      "computer based ielts",
      "ielts writing",
      "ielts exam",
      "ielts writing task 2",
      "ielts practice",
    ],
    sections: [
      { paragraphs: ["Paper-based IELTS is gone in most markets, but the format that replaced it is not purely digital everywhere. In selected markets, centres offer a hybrid option: Listening and Reading on computer, Writing by hand. If you have spent years writing essays with a pen, this looks like a lifeline. Sometimes it is. Often it is not.", "Here is an honest account of what you gain and what you give up."] },
      { heading: "What the hybrid option actually is", bullets: ["Listening and Reading are delivered on computer, exactly as in the standard computer-delivered test.", "Writing Task 1 and Task 2 are handwritten on paper in the test room.", "Speaking is unchanged: a live conversation with an examiner.", "Marking, band descriptors and the 9-band scale are identical. The format has no effect on how your work is scored.", "It is an option at selected centres in selected markets, not a global default. Availability changes, so confirm with your centre before booking."] },
      { heading: "What you gain by handwriting", paragraphs: ["If you genuinely write faster than you type, that is a real advantage under a 60-minute limit, and it is the only advantage that matters much. Some candidates also plan better on paper: arrows, brackets and crossings-out are quicker than restructuring a paragraph in a text box, and a visible plan in the margin costs nothing.", "There is also a comfort argument. If every practice essay you have ever written was handwritten, test day is not the moment to change the motor skill."] },
      { heading: "What you give up", bullets: ["The live word count. You are back to estimating 150 and 250 words, and under-length answers are penalised. You will need to know your own words-per-line figure and count lines.", "Free editing. Moving a sentence means crossing out and rewriting, which costs time and looks messy.", "Legibility as a non-issue. Examiners mark what they can read. Handwriting that degrades under time pressure genuinely costs marks.", "Results speed, potentially. Handwritten scripts can take longer to reach an examiner, so check the turnaround your centre quotes rather than assuming the 3 to 5 day computer timeline."] },
      { heading: "How to decide in ten minutes", paragraphs: ["Run one test. Write a full Task 2 essay by hand under 40 minutes, then type another one on a different prompt under 40 minutes. Count the words in each and read both back the next day.", "If typing produced more words at the same quality, take the standard computer-delivered test and stop thinking about it. If handwriting produced noticeably more, and someone else can read it comfortably, the hybrid option is worth seeking out. If they are close, take the computer version, because the word count and free editing are worth more than a small speed edge."] },
      { heading: "If you take the computer version, fix typing first", paragraphs: ["Typing speed is the most improvable variable in this entire decision. Most people who prefer handwriting prefer it because they type at 20 to 25 words per minute, and that is fixable in two weeks of ten-minute daily drills. At 40 words per minute the handwriting advantage disappears entirely, and you keep the word count, the editing and the legibility.", "Do not choose a rarer, less available test format to work around a problem you could solve before your test date."] },
      { heading: "Practise in the format you will actually sit", paragraphs: ["Whichever you choose, practise that way. If you are taking the standard computer-delivered test, write your practice essays in a typed editor with a word count and no spell-checker, exactly as IELTSVega's Writing practice works, and get instant AI band scores against Task Response, Coherence and Cohesion, Lexical Resource and Grammatical Range and Accuracy so you know the essay lands before the format question ever matters."] },
    ],
    faqs: [
      { q: "Is paper-based IELTS still available in 2026?", a: "Not as a full paper test in most markets. Paper-based delivery was retired from mid-2026, with the final date in most locations on 27 June 2026. What remains in selected markets is a hybrid \"Writing on Paper\" option, where only the Writing component is handwritten." },
      { q: "Does handwriting my IELTS Writing affect my score?", a: "Not by design. The band descriptors and marking are identical. In practice, handwriting can cost marks indirectly if it becomes hard to read under time pressure, or if you misjudge the word count without a live counter." },
      { q: "How do I know if my test centre offers Writing on Paper?", a: "Check your centre's booking page or contact them directly before you pay. It is offered in selected markets and at selected centres only, and availability changes, so do not assume it is on the menu where you are." },
      { q: "Should I choose handwriting or typing for IELTS Writing?", a: "Test it. Write one full Task 2 essay by hand and one typed, both under 40 minutes, and compare word count and quality. Unless handwriting is clearly faster and clearly legible, take the computer version for the live word count and free editing." },
    ],
  },
  {
    slug: "ielts-ukvi-vs-ielts-academic",
    seoTitle: "IELTS for UKVI vs IELTS Academic: Which Do You Need?",
    title: "IELTS for UKVI vs IELTS Academic: which one does your visa need?",
    excerpt:
      "IELTS for UKVI, Academic, General Training and Life Skills are four different bookings. Booking the wrong one invalidates your application. How to choose.",
    category: "Requirements",
    date: "August 2026",
    publishedAt: "2026-08-11",
    readMins: 8,
    keywords: [
      "ielts ukvi",
      "ielts for ukvi",
      "ukvi ielts vs ielts academic",
      "ielts life skills",
      "uk student visa ielts requirement",
      "secure english language test",
      "ielts academic",
      "ielts general",
      "ielts exam",
      "ielts practice",
    ],
    sections: [
      { paragraphs: ["This is the single most expensive mistake in IELTS, and it happens before you sit a single question. IELTS for UKVI and IELTS Academic contain the same test, the same questions and the same marking, but they are different bookings, taken at different approved centres, producing different report forms. If your visa route requires UKVI and you booked standard IELTS, your result cannot be used and you pay again.", "Here is how to work out which one you need."] },
      { heading: "The four things you can book", bullets: ["IELTS Academic: university and college admission, and professional registration. Accepted worldwide.", "IELTS General Training: work, migration and secondary education in countries such as the UK, Australia, Canada and New Zealand.", "IELTS for UKVI (Academic or General Training): the same two tests, delivered under UK Home Office conditions at approved centres, as a Secure English Language Test.", "IELTS Life Skills (A1, B1, B2): a short Speaking and Listening only test for specific UK visa routes such as family visas and settlement. It gives a pass or fail, not a band score."] },
      { heading: "What makes UKVI different", paragraphs: ["Not the content. The test is identical. What differs is the administration: UKVI tests run only at centres approved by the UK Home Office, under additional identity and security requirements, and the centre reports your test details to the Home Office. Your Test Report Form carries a unique reference number that a caseworker can verify.", "It costs around 10 to 15% more than the standard test for that reason. UKVI IELTS also moved to computer-only delivery on 22 March 2026, ahead of the wider global transition."] },
      { heading: "Do you actually need UKVI?", paragraphs: ["Two questions decide it. First: are you applying to the UK Home Office for a visa, as opposed to applying to a university? Second: has your university told you it can assess your English itself?", "Many UK universities are permitted to assess English proficiency for degree-level students and will accept standard IELTS Academic. Many still require UKVI. The university's own admissions page is the authority here, not a general article, and it is worth asking admissions directly in writing. For Skilled Worker, family and settlement routes you are dealing with the Home Office directly, and UKVI or Life Skills is required."] },
      { heading: "The scores the UK asks for", bullets: ["Degree-level Student visa: CEFR B2, which on IELTS for UKVI means at least 5.5 in each of the four skills. That is a per-skill minimum, not an overall average.", "From 8 January 2026, first-time Skilled Worker, Scale-up and High Potential Individual applicants must meet B2 rather than the previous B1, again meaning 5.5 in every skill.", "Below degree level, the requirement is usually B1, meaning 4.0 in each skill on IELTS for UKVI.", "Universities set their own, higher, requirements on top of the visa minimum, commonly 6.5 to 7.0 overall with 6.0 or 6.5 in Writing.", "Always check the current Home Office guidance and your institution's page. Thresholds change, and 2026 already moved one of them."] },
      { heading: "The per-skill trap", paragraphs: ["An overall 6.5 with 5.0 in Writing does not meet a B2 requirement, because B2 is defined per skill. Candidates fail visa applications on this constantly, having comfortably exceeded the overall figure. Read your requirement carefully and find the lowest number you are allowed to score in any single skill, then treat that as your real target."] },
      { heading: "Practise for the per-skill minimum", paragraphs: ["If your requirement is per-skill, your weakest skill is the only one that matters. On IELTSVega you can see your band by skill after every practice set and mock test, get instant AI scoring on Writing and Speaking against all four criteria, and drill the one skill sitting below your threshold, which is exactly where visa applications are won or lost."], links: [{ label: "Build a UKVI study plan", href: "/blog/ielts-4-week-study-plan" }, { label: "Academic vs General Training", href: "/blog/ielts-academic-vs-general-training" }] },
    ],
    faqs: [
      { q: "What is the difference between IELTS for UKVI and IELTS Academic?", a: "The test content, questions and marking are identical. IELTS for UKVI is delivered at UK Home Office approved centres under extra identity and security requirements, and your details are reported to the Home Office. It costs slightly more and produces a Test Report Form a visa caseworker can verify." },
      { q: "Do I need IELTS for UKVI for a UK student visa?", a: "It depends on your institution. Many UK universities can assess English themselves for degree-level courses and accept standard IELTS Academic; many still require UKVI. Confirm with your university's admissions team in writing before booking, because the wrong booking cannot be used." },
      { q: "What IELTS score do I need for a UK Skilled Worker visa?", a: "From 8 January 2026, first-time Skilled Worker, Scale-up and High Potential Individual applicants must meet CEFR B2, which on IELTS for UKVI means at least 5.5 in each of the four skills. It is a per-skill minimum, so an overall 6.5 with 5.0 in one skill does not qualify." },
      { q: "What is IELTS Life Skills?", a: "A short Speaking and Listening only test at level A1, B1 or B2, used for specific UK visa routes such as family visas and settlement. It results in a pass or fail rather than a band score, and it is not accepted for university admission." },
    ],
  },
  {
    slug: "ielts-score-for-canada-express-entry",
    seoTitle: "IELTS Score for Canada PR: CLB Chart & CRS Points",
    title: "IELTS score for Canada PR: the CLB chart and what it costs you in points",
    excerpt:
      "How IELTS bands convert to CLB levels for Express Entry, why CLB 9 is the real target, and how many CRS points each half-band is actually worth.",
    category: "Requirements",
    date: "August 2026",
    publishedAt: "2026-08-12",
    readMins: 9,
    keywords: [
      "ielts score for canada pr",
      "clb chart ielts",
      "ielts for express entry",
      "ielts score for canada",
      "canada pr english requirement",
      "ielts general training",
      "crs score ielts",
      "ielts score",
      "band ielts",
      "ielts practice",
    ],
    sections: [
      { paragraphs: ["For Canadian permanent residence, IELTS is not a pass or fail. It is a points machine. Your bands convert to Canadian Language Benchmark levels, and CLB levels convert to CRS points, which decide whether you are invited to apply. Understanding the conversion is worth more than any amount of general study, because it tells you exactly which half-band to chase.", "Note that for Express Entry you need IELTS General Training, not Academic. Academic is for study and professional registration."] },
      { heading: "The IELTS to CLB conversion", bullets: ["CLB 10: Listening 8.5, Reading 8.0, Writing 7.5, Speaking 7.5", "CLB 9: Listening 8.0, Reading 7.0, Writing 7.0, Speaking 7.0", "CLB 8: Listening 7.5, Reading 6.5, Writing 6.5, Speaking 6.5", "CLB 7: Listening 6.0, Reading 6.0, Writing 6.0, Speaking 6.0", "CLB 6: Listening 5.5, Reading 5.0, Writing 5.5, Speaking 5.5", "Your CLB is set per skill, and your overall level is your lowest skill. Confirm the current table on the official Government of Canada site before you plan around it."] },
      { heading: "Why Listening is the odd one out", paragraphs: ["Look at the CLB 9 row again: you need 8.0 in Listening but only 7.0 in Reading, Writing and Speaking. Listening carries the highest bar at almost every level, and it is the skill candidates most often neglect because it feels passive.", "The good news is that Listening is also the fastest skill to improve, because most losses are mechanical: spelling, plurals, word limits, and losing the thread during a transition. Fixing those is a matter of drilling, not of learning English."] },
      { heading: "The minimum versus the real target", paragraphs: ["The Federal Skilled Worker Program requires CLB 7, which is a flat 6.0 in every skill. That makes you eligible. It does not make you competitive: recent all-programme draws have generally required CRS scores in roughly the 470 to 540+ range, and CLB 7 leaves a large number of points on the table.", "CLB 9 is the target that matters. It unlocks the maximum core language points and, critically, the skill transferability bonuses that pair language with education and work experience. The step from CLB 7 to CLB 9 is frequently worth more CRS points than any other single thing an applicant can change."] },
      { heading: "Where the points actually are", bullets: ["Core language points rise steeply from CLB 7 to CLB 9, then flatten. CLB 10 is worth chasing only if you are already comfortably at 9.", "Skill transferability adds points when CLB 9 combines with post-secondary education or Canadian or foreign work experience. This is the multiplier most people miss.", "A spouse's language score earns points too, so if you have an accompanying partner, their IELTS is not optional admin, it is CRS points.", "French as a second language adds a further block of points, which is why some candidates near the cut-off add a TEF or TCF rather than pushing IELTS higher.", "Points tables are revised periodically. Check the current CRS criteria on the official site before making a plan around a specific number."] },
      { heading: "The practical plan", paragraphs: ["Work out which single half-band moves you a CLB level, and go get that one. In practice this is almost always Listening 7.5 to 8.0, or Reading 6.5 to 7.0. Both are raw-mark skills where a handful of careless errors separate the two bands, which makes them the cheapest points in the entire system.", "Then sit the test with One Skill Retake in mind. If exactly one skill lands short, you can re-sit it alone within 60 days, in the same country, provided your test was computer-delivered. Confirm that Immigration, Refugees and Citizenship Canada will accept a combined report for your specific programme before you rely on that route."] },
      { heading: "Practise the skills that carry the points", paragraphs: ["Chasing CLB 9 means chasing specific numbers in specific skills, not general improvement. On IELTSVega you can practise General Training Reading and Writing, drill Listening by question type until careless losses stop, and get instant AI band scores on Writing and Speaking, so you can see which skill is one half-band away from moving your whole CLB level."] },
    ],
    faqs: [
      { q: "What IELTS score do I need for Canada PR?", a: "The minimum for the Federal Skilled Worker Program is CLB 7, which is 6.0 in each of the four skills on IELTS General Training. To be competitive in recent draws, most applicants target CLB 9: Listening 8.0, Reading 7.0, Writing 7.0 and Speaking 7.0." },
      { q: "Do I need IELTS Academic or General Training for Express Entry?", a: "General Training. IELTS Academic is for university admission and professional registration and is not accepted for Canadian permanent residence applications through Express Entry." },
      { q: "Why does Canada require a higher IELTS Listening score?", a: "The CLB conversion table simply sets a higher IELTS band for Listening at each level, so CLB 9 needs 8.0 in Listening but only 7.0 in the other three. It reflects how the two scales align, and it makes Listening the skill most worth drilling for Express Entry candidates." },
      { q: "Is CLB 9 worth the extra effort over CLB 7?", a: "Usually yes. CLB 9 unlocks the maximum core language points and the skill transferability bonuses that combine language with education and work experience. For most candidates it is the single largest available CRS increase." },
    ],
  },
  {
    slug: "ielts-vs-pte-vs-duolingo",
    seoTitle: "IELTS vs PTE vs Duolingo: Which Test in 2026?",
    title: "IELTS vs PTE vs Duolingo in 2026: which test should you actually take?",
    excerpt:
      "An honest comparison of IELTS, PTE Academic and the Duolingo English Test on acceptance, format, cost and difficulty, and how to pick without wasting a fee.",
    category: "Requirements",
    date: "August 2026",
    publishedAt: "2026-08-13",
    readMins: 9,
    keywords: [
      "ielts vs pte",
      "ielts vs duolingo",
      "duolingo vs ielts vs pte",
      "which english test is easier",
      "pte academic",
      "duolingo english test",
      "english test for study abroad",
      "ielts exam",
      "test ielts",
      "ielts practice",
    ],
    sections: [
      { paragraphs: ["Three tests, three very different experiences, and one question that decides it before any of the others: which does your institution accept? Everything else is a tie-breaker. Here is the honest comparison, including where each test genuinely wins."] },
      { heading: "Acceptance: the only question that matters first", bullets: ["IELTS: the broadest acceptance of the three. Accepted by essentially every university and by the immigration systems of the UK, Canada, Australia and New Zealand. Some visa routes name it specifically.", "PTE Academic: very widely accepted for study, and accepted for several major visa routes, though not universally across all of them.", "Duolingo English Test: accepted by more than 5,000 universities and programmes, with strong coverage in the US, Canada and Australia, but noticeably thinner for visa and immigration purposes and at some highly selective institutions.", "The rule: check your specific university programme page and your specific visa route. Not the country. Not a comparison article. The programme page."], links: [{ label: "Australia student visa 2026: can you still bring your spouse?", href: "/blog/australia-student-visa-dependants-ban-2026" }] },
      { heading: "How the three feel to sit", paragraphs: ["IELTS runs about 2 hours 45 minutes and its Speaking test is a live conversation with a human examiner, which is either its best feature or its most stressful, depending on who you are. It uses a wide range of question types, including short written answers, so you cannot guess your way through.", "PTE Academic is fully computer-based and AI-scored, about two hours, with heavily integrated tasks: you speak into a microphone, and one task often scores several skills at once. It rewards a specific, learnable technique more than any of the three.", "The Duolingo English Test is the shortest, around an hour, taken at home under remote proctoring, with an adaptive question set that adjusts to your answers. It is the cheapest and the fastest to book and receive."] },
      { heading: "Cost and results speed", bullets: ["IELTS: typically USD 230 to 490 equivalent depending on the country; results in 3 to 5 days for computer-delivered tests.", "PTE Academic: generally somewhat cheaper than IELTS in most markets; results usually within about two days.", "Duolingo English Test: substantially cheaper than both; results usually within about two days.", "Fees and turnaround change. Check the current figures on each provider's site before deciding on price."] },
      { heading: "Which is actually easier?", paragraphs: ["None of them is easier in the abstract, but they reward different people. IELTS suits candidates who are comfortable talking to a person, have good general reading stamina, and write reasonable essays. PTE suits candidates who are comfortable with a microphone, dislike being watched, and are willing to learn a fairly mechanical task technique. Duolingo suits candidates who want a short, cheap, adaptive test and are not applying anywhere that demands a traditional test.", "The one honest generalisation: PTE's AI scoring is more predictable and less forgiving of technique errors, IELTS Writing and Speaking are more forgiving of technique but harder to game, and Duolingo's brevity means a single bad ten minutes weighs more heavily."] },
      { heading: "Choose in three steps", bullets: ["Step 1: list every institution and visa route you might apply to, and check what each accepts. If only one test appears on every list, you are done.", "Step 2: if several are accepted, take a free practice test of the two frontrunners and compare how they feel, not how they are described.", "Step 3: pick the one where your weakest skill is least exposed. If Speaking to a person terrifies you, that is a real argument for PTE. If your written English is your strength and your microphone technique is not, that is an argument for IELTS."] },
      { heading: "One thing to avoid", paragraphs: ["Do not choose a test because it is cheaper or shorter and then discover your target university requires something else. A cheap test your institution rejects costs you the whole fee plus the delay of booking the right one, and application deadlines rarely wait. The fee difference between these tests is small compared with the cost of applying twice."] },
      { heading: "If you choose IELTS, prepare for the format", paragraphs: ["Once IELTS is decided, format-specific practice is what moves your band. IELTSVega covers every IELTS question type across Academic and General Training, gives instant AI band scoring on Writing and Speaking against all four official criteria, and lets you sit full computer-delivered mock tests on real timing, so nothing about test day is new."] },
    ],
    faqs: [
      { q: "Is IELTS or PTE easier?", a: "Neither is easier by design. PTE is fully computer-based with AI scoring and rewards a learnable, quite mechanical technique; IELTS has a live Speaking interview and a wider range of question types. Choose the format that exposes your weakest skill least." },
      { q: "Is the Duolingo English Test accepted for visas?", a: "Acceptance for study is broad, with more than 5,000 universities and programmes, but it is noticeably thinner for immigration and visa purposes than IELTS. If your route involves a visa English requirement, verify acceptance on the official immigration guidance before booking." },
      { q: "Which English test is cheapest?", a: "The Duolingo English Test is generally the cheapest, followed by PTE Academic, with IELTS usually the most expensive. The saving is small compared with the cost of taking a test your institution does not accept, so check acceptance before price." },
      { q: "Can I switch to IELTS if I already took PTE or Duolingo?", a: "Yes, there is nothing stopping you sitting a different test, and many candidates do after a disappointing result. You pay the new fee in full, so it is worth taking a free practice test of the new format first to confirm it genuinely suits you better." },
    ],
  },
  {
    slug: "ielts-results-trf-validity-remark",
    seoTitle: "How Long Does an IELTS Remark Take? Results & TRF",
    title: "IELTS results: when they arrive, how long they last, and when to ask for a remark",
    excerpt:
      "An IELTS remark takes 2 hours to 21 days and cannot lower your band. When results arrive, how long your TRF is valid, and when a remark is worth the fee.",
    category: "Scoring",
    date: "August 2026",
    publishedAt: "2026-08-14",
    updatedAt: "2026-10-03",
    readMins: 9,
    keywords: [
      "ielts results",
      "ielts result check",
      "ielts trf",
      "ielts test report form",
      "ielts remark",
      "enquiry on results ielts",
      "ielts score validity",
      "ielts score",
      "band ielts",
      "ielts practice",
    ],
    sections: [
      { paragraphs: ["The gap between sitting IELTS and seeing the number is short now, but it is still the most anxious week of the process, and it is full of small rules that matter: when results appear, how long they are valid, when a remark is worth the fee, and what to do if the number is not what you needed."] },
      { heading: "When results arrive", bullets: ["Computer-delivered tests: usually 3 to 5 days after your test date.", "Paper-based tests, where they still exist: around 13 days.", "You are notified by email and can preview your scores online through your test centre's results portal.", "The online preview is not the official document. Institutions want the Test Report Form or an electronic result sent directly by the centre.", "Some centres release results at a fixed hour on the day. Refreshing the page for six hours does not accelerate anything."] },
      { heading: "Reading your Test Report Form", paragraphs: ["The TRF shows a band for each of the four skills and an overall band. The overall band is the average of the four, rounded to the nearest half band: an average ending in .25 rounds up to the next half band and .75 rounds up to the next whole band, so a 6.75 average becomes 7.0.", "Check the per-skill numbers against your requirement before you celebrate the overall figure. A great many visa and registration requirements are per-skill minimums, and an overall 7.0 with a 6.0 in one skill fails a 6.5-each requirement."] },
      { heading: "How long IELTS results are valid", paragraphs: ["The Test Report Form is normally treated as valid for two years from the test date. That is a convention of the receiving organisations rather than the score expiring on a switch, and it is the standard almost everywhere.", "Some institutions accept older results with evidence of continued English use, and some immigration routes are stricter than two years. Plan against your specific requirement, and if you are applying near the boundary, get written confirmation before assuming."] },
      { heading: "Should you apply for a remark?", paragraphs: ["An Enquiry on Results is a re-mark by a senior examiner. You normally have six weeks from your test date to apply, it carries a fee, and that fee is refunded in full if any band changes. The result comes back in anywhere from 2 hours to 21 days, and your band cannot go down.", "It is worth considering when: a skill came back well below every practice score you have ever produced, or when you are half a band from your requirement in Writing or Speaking. Those two are examiner-marked and therefore the only ones where judgement is genuinely involved. Listening and Reading are marked against a key, so a change is far less likely, though clerical checks do occasionally find something.", "Be realistic. Bands do change on remark, but most do not. If you are two bands short, a remark is not the route, preparation is."] },
      { heading: "How to request an IELTS remark, step by step", paragraphs: ["The process works the same way at both providers. You apply to whoever ran your test, not to a third party, and you apply inside a fixed window."], bullets: ["Apply through your own provider. British Council candidates submit the Enquiry on Results through the official Test Taker Portal; IDP candidates contact the test centre where they sat the test. Do not use agents or third-party links for this.", "Apply within six weeks of the test date printed on your Test Report Form. After that the window is closed.", "Choose the sections. You can ask for any one section, several, or all four (Listening, Reading, Writing and Speaking) to be re-marked.", "Pay the Enquiry on Results fee. The centre sets the amount, so it varies by country, and it is refunded if your band changes.", "Wait for the outcome. If any band changes, the centre issues you a new Test Report Form; if nothing changes, your original result stands."] },
      { heading: "How long an IELTS remark takes", paragraphs: ["IDP publishes the window as anywhere from 2 hours to 21 days after you apply, depending partly on how many sections you asked to be re-marked. If you have heard nothing after 28 days, IDP tells candidates to contact their test centre. The two-hour outcomes you will read about on forums are real: senior examiners each re-mark one section, so several sections can be re-marked at the same time rather than one after another.", "The range is still wide because the work is not automated. A senior examiner re-marks your paper from scratch, and how fast that happens depends on how many enquiries the centre is holding. Querying all four skills is generally slower than querying one.", "Plan against 21 days, not against the best case. If you have a visa or admissions deadline, count backwards from it before you apply, because there is no expedited option once the enquiry is in the queue."] },
      { heading: "Can a remark lower your score?", paragraphs: ["No. Both test providers say so on their own remark pages. British Council states that a re-mark may leave your score the same but will never lower it, and IDP states that after the second assessment your score either stays the same or goes up.", "The re-mark is done by a senior examiner who does not see your original marks, so it is a genuine second assessment rather than a check of the first. The only outcomes are no change, which is the most common, or a higher band in one or more sections.", "That makes the decision simpler than forum threads suggest. The real costs of a remark are the fee if nothing changes, and the waiting time if you have a deadline. Your band is not at risk."] },
      { heading: "Remark, One Skill Retake, or full re-sit?", bullets: ["Half a band short in Writing or Speaking, and your practice scores were consistently higher: consider a remark first, since it costs nothing if it succeeds.", "One skill short, and you know why: One Skill Retake, within 60 days, same country, computer-delivered original test. Confirm your institution accepts a combined report.", "Two or more skills short: a full re-sit, after real preparation. Nothing else will do.", "Do not run a remark and book a retake for the same week. If the remark succeeds you have wasted a fee; if it fails you have lost preparation time to waiting."] },
      { heading: "Sending results to institutions", paragraphs: ["Your centre will send results electronically to a number of receiving organisations for free, with a fee for additional ones. Most universities and immigration authorities now prefer or require the electronic route, because it is verifiable and a paper TRF is not. Nominate your recipients accurately, because corrections after the fact cost time you may not have."] },
      { heading: "Make the next result the last one", paragraphs: ["Whatever the number says, the fix is the same: find the specific skill and the specific question types costing you marks, and drill those under time. On IELTSVega you get a band per skill after every mock, instant AI scoring on Writing and Speaking against all four criteria, and question-type level practice, so your next Test Report Form is the one you actually send."] },
    ],
    faqs: [
      { q: "How long do IELTS results take?", a: "Computer-delivered results usually arrive within 3 to 5 days of your test date. Paper-based tests, where they still run, take around 13 days. You are notified by email and can preview scores in your test centre's online portal." },
      { q: "How long is an IELTS score valid?", a: "The Test Report Form is normally treated as valid for two years from the test date. Some institutions accept older results with evidence of continued English use, and some immigration routes are stricter, so confirm against your specific requirement." },
      { q: "Is an IELTS remark worth it?", a: "It can be, if a Writing or Speaking band came back well below your consistent practice level, or you are half a band short. Those sections involve examiner judgement. The fee is refunded in full if any band changes, but most remarks do not change a score, so it is not a substitute for preparation." },
      { q: "How long does an IELTS remark take?", a: "Anywhere from 2 hours to 21 days after you apply, according to IDP, depending partly on how many sections you asked to be re-marked. A single-section enquiry is generally faster than querying all four. If you have heard nothing after 28 days, contact your test centre. Plan against 21 days if you have a deadline, because there is no expedited option once the enquiry is submitted." },
      { q: "How long do I have to request an Enquiry on Results?", a: "Normally six weeks from your test date. The re-mark is carried out by a senior examiner who does not see your original mark. Check your centre's stated deadline, since it is the one that applies to you." },
      { q: "Can an IELTS remark decrease my score?", a: "No. British Council and IDP both state on their official remark pages that a re-mark leaves your score the same or raises it; it never lowers it. The re-mark is done by a senior examiner who does not see your original marks. The only real risk is losing the fee if no band changes." },
      { q: "Can I get just one section of IELTS remarked?", a: "Yes. You can ask for any one section, several, or all four (Listening, Reading, Writing and Speaking) to be re-marked. Writing and Speaking are where bands realistically move, because they involve examiner judgement. Listening and Reading are marked against an answer key, so a change there is rare." },
      { q: "How do I apply for an IELTS remark?", a: "Apply through the provider that ran your test, within six weeks of the test date on your Test Report Form. British Council candidates use the Test Taker Portal; IDP candidates contact the test centre where they sat. Choose the sections, pay the fee, and you receive a new Test Report Form if any band changes." },
      { q: "How much does an IELTS remark cost, and is the fee refunded?", a: "Centres set their own Enquiry on Results fee, so the amount varies by country. The important part is standard everywhere: the fee is refunded in full if any band on your Test Report Form changes. A successful remark therefore costs you nothing but the waiting time." },
      { q: "How successful are IELTS remarks?", a: "No official success rate is published, and any figure you see quoted is someone's estimate. What the process tells you is where the odds sit: Writing and Speaking involve examiner judgement, so they are where bands realistically move. Listening and Reading are marked against an answer key, so a change there means a clerical error rather than a difference of opinion, and that is rare. A remark is worth it when one examiner-marked skill came back well below your consistent practice level." },
    ],
  },
];
