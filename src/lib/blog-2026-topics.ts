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
   * Timely policy post (18 Sep 2026) — the dependants announcement of
   * 17 September 2026. High, sudden intent ("can I bring my wife on an
   * Australian student visa"), and nothing on the site answered it.
   *
   * Everything here is an ANNOUNCEMENT, not yet a regulation: no start date
   * has been published. Written so it stays true either way, and hedged to
   * the official source, because this one will move.
   */
  {
    slug: "australia-student-visa-dependants-ban-2026",
    seoTitle: "Australia Student Visa 2026: Can You Still Bring a Spouse?",
    title: "Australia student visa 2026: can you still bring your spouse?",
    excerpt:
      "Most international students in Australia can no longer bring a partner or children. What changed, who is exempt, when it starts, and why IELTS is unaffected.",
    category: "Requirements",
    date: "September 2026",
    publishedAt: "2026-09-18",
    readMins: 8,
    keywords: [
      "australia student visa spouse",
      "australia student visa dependants",
      "can i bring my wife on australia student visa",
      "australia student visa family ban 2026",
      "australia student visa new rules 2026",
      "australia student visa 500 dependent",
      "ielts score for australia student visa",
      "australia 485 visa ielts",
      "study in australia 2026",
      "ielts practice",
    ],
    sections: [
      { paragraphs: ["Short answer: for most people, soon, no. On 17 September 2026, Home Affairs and Immigration Minister Tony Burke announced at the National Press Club in Canberra that most student visas will no longer allow secondary applicants, which is the visa term for the partner and dependent children who travel with you. A narrow set of exemptions survives.", "One thing to be clear about before you panic or cancel anything: this is an announcement, not yet a rule. No commencement date has been published. Because the change is expected to be made by regulation rather than by an act of parliament, it can take effect quickly and without a vote, so treat it as coming rather than as hypothetical. Always confirm the current position on the Department of Home Affairs website before you lodge."] },
      { heading: "What was actually announced", paragraphs: ["The dependants change is one part of a wider migration package aimed at cutting net overseas migration from roughly 292,000 a year to 245,000 in 2026-27 and 225,000 in 2027-28. The measures that affect students:"], bullets: ["Most student visas will no longer permit secondary applicants, so a partner or child cannot be included in the application.", "Changing your education provider or your course will require a new student visa application, rather than a variation of the one you hold.", "You will generally only be able to continue studying in Australia by moving up a qualification level, for example bachelor's to master's. Sideways moves between institutions and drops to a lower qualification are being blocked as \"visa hopping\".", "Visitor visas used for short English-language or vocational courses of three months or less will carry a \"no further stay\" condition.", "Second- and third-year Working Holiday visas move to a ballot with regional work requirements."] },
      { heading: "Who can still bring family", paragraphs: ["The exemptions announced are narrow, and they turn on the type of student you are rather than on the strength of your relationship."], table: {
        caption: "Exemptions as described in the 17 September 2026 announcement. Detail will be settled when the regulation is made — confirm on immi.homeaffairs.gov.au before lodging.",
        headers: ["Student", "Can bring partner / children?", "Note"],
        rows: [
          ["PhD and postgraduate research candidates", "Yes", "Burke pointed to doctoral students typically being at a different life stage"],
          ["Students from designated Pacific nations", "Yes", "Named as an exemption; the specific country list follows the regulation"],
          ["Students from ASEAN partner nations", "Yes", "Announced as exempt"],
          ["Overseas government-sponsored students", "Yes", "Sponsored cohorts are carved out"],
          ["Everyone else: undergraduate, coursework master's, VET, ELICOS", "No", "The great majority of student visa applicants"],
        ],
      } },
      { heading: "When does it start?", paragraphs: ["No date has been given. The government has said the measures do not all commence at once, and that each takes effect as the relevant visa conditions, regulations or administrative arrangements are put in place. What is known is the direction of travel, and that it applies to future grants rather than retrospectively to visas already held."] },
      { heading: "If your family is already in Australia", paragraphs: ["Nobody is being separated onshore. The government has stated that families already attached to a visa in Australia keep their arrangements until they leave the country or become eligible for a permanent visa. If your partner is already there on your student visa, this announcement does not remove them."] },
      { heading: "The scale of it", paragraphs: ["Australia granted 337,427 student visas in the last financial year. Of those, 45,991 went to secondary applicants — partners and children rather than students. That is the population this measure targets, and it is why the government describes student visa numbers themselves as unaffected: the students still come, the families do not."] },
      { heading: "What this does NOT change: your English requirement", paragraphs: ["No English test or IELTS score requirement was touched by the 17 September announcement. The English rules that apply to you are still the ones that came into force on 7 August 2025, and they are worth knowing precisely, because two of them catch people out."], table: {
        caption: "Current IELTS positions for the main Australian visa routes. Thresholds change on a schedule nobody controls — verify on the Department of Home Affairs site before you book a test.",
        headers: ["Route", "IELTS position", "Status"],
        rows: [
          ["Student visa (subclass 500)", "Set by your education provider and the visa English requirement", "Unchanged in September 2026"],
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
      { heading: "What to do now", bullets: ["If you were planning to bring a partner, check whether any exemption applies to you before you change your plan. A PhD offer instead of a coursework master's is a materially different visa outcome now.", "If you are close to lodging, lodge on the rules as they stand and watch immi.homeaffairs.gov.au for the commencement date rather than following news coverage.", "If Australia was your choice because of dependant work rights, it is reasonable to price Canada, the UK and Ireland again — but do that on the current rules for each, not on the version you read last year.", "Whatever you decide, the English requirement is the one part of this you fully control, and a higher band widens every option at once. Get the score first."] },
      { heading: "Get the band that keeps your options open", paragraphs: ["A 6.5 with nothing below 5.5 is now the floor for the Temporary Graduate route, and a 7.0 across the board opens skilled pathways in every destination country, not just Australia. On IELTSVega you can sit full timed mock tests, practise Writing and Speaking with instant AI band feedback against the official criteria, and see exactly which skill is holding your overall band down — which is the difference between retaking one skill and retaking the whole test."] },
    ],
    faqs: [
      { q: "Can I bring my wife on an Australian student visa in 2026?", a: "For most students, this is being removed. On 17 September 2026 the Australian government announced that most student visas will no longer allow secondary applicants, which covers partners and dependent children. Exemptions apply to PhD and postgraduate research candidates, students from designated Pacific and ASEAN nations, and government-sponsored students. No commencement date has been published yet, so check the Department of Home Affairs website for the position on the day you lodge." },
      { q: "Is the student dependants ban already law?", a: "Not yet. It was announced on 17 September 2026 and has not commenced. It is expected to be implemented by regulation rather than legislation, which means it does not need a parliamentary vote and can take effect faster than a change that does. Treat it as imminent rather than speculative, and confirm before lodging." },
      { q: "What happens to my family who are already in Australia?", a: "They are not affected. The government has said families already attached to a visa in Australia will not be separated onshore, and that existing arrangements continue until they leave Australia or become eligible for a permanent visa. The change applies to future visa grants." },
      { q: "Does the change affect PhD students?", a: "No. Postgraduate research candidates, including PhD students, are exempt and can still bring a partner and children. The minister linked the exemption to doctoral students typically being at a different stage of life from undergraduates." },
      { q: "Has the IELTS score for an Australian student visa changed?", a: "No. The 17 September 2026 announcement contained no change to English testing. The current English rules date from 7 August 2025: the Temporary Graduate visa needs 6.5 overall with no band below 5.5, Competent English remains 6.0 in each skill, and remote-proctored or at-home tests are not accepted for any Australian visa regardless of provider." },
      { q: "Can I still change my course or university in Australia?", a: "It is becoming harder. Under the announced changes you will need a new student visa application to change provider or course, and you will generally only be able to continue by progressing to a higher qualification. Lateral transfers between institutions and moves down to a lower qualification are being blocked as visa hopping, with exceptions only in extenuating circumstances." },
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
    updatedAt: "2026-09-14",
    readMins: 8,
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
          caption: "Planning figures for IELTS Academic and General Training. Figures last reviewed 14 September 2026.",
          headers: ["Where", "Standard test fee", "Notes"],
          rows: [
            ["Global range", "≈ USD 230 – 490 equivalent", "Set locally by the British Council and IDP"],
            ["India", "≈ INR 19,000", "Rose from INR 18,000 on 1 April 2026"],
            ["United Kingdom", "≈ USD 210 – 230 equivalent", "Varies with the GBP rate"],
            ["Canada", "≈ USD 230 equivalent", "—"],
            ["Australia", "≈ AUD 415 – 430", "Among the more expensive markets"],
            ["IELTS for UKVI", "+10 – 15% on the standard fee", "The centre reports your test details to the UK Home Office"],
          ],
        },
        paragraphs: ["The same test costs different amounts in different places, and the UKVI premium applies on top of whatever the local standard fee is. If you are comparing quotes between centres in the same country and they differ by more than a few percent, one of them is quoting the UKVI or Life Skills fee rather than the standard one."],
      },
      { heading: "Why the same test costs different amounts", paragraphs: ["The fee is set per market by the British Council and IDP, and it absorbs local costs: venue hire, examiner pay, invigilation, and the Speaking examiner's time. That last one is the expensive part of IELTS and the reason it costs more than fully automated tests. It also reflects what the local market will bear. None of this changes the test you sit or the score you get."] },
      { heading: "The fees nobody mentions", bullets: ["Rescheduling: typically an administrative fee if you move your date more than about five weeks out.", "Cancellation: usually a partial refund before the deadline, and little or nothing after it. Documented medical cases are handled separately.", "Enquiry on Results (a remark): a fee that is refunded in full if any band changes. You normally have six weeks from your test date to apply.", "One Skill Retake: a separate fee, though generally lower than a full test. That is the point of it.", "Extra Test Report Forms sent to institutions beyond the free allowance.", "A full re-sit: the entire fee again, which is why the cheapest thing you can buy in IELTS is preparation."] },
      { heading: "How to spend it once", paragraphs: ["The real cost of IELTS is not the fee, it is the number of times you pay it. Two sittings plus a remark costs more than most people's entire preparation budget. Three things reduce the odds of a second payment: know your exact requirement including any per-skill minimum, practise in the format you will actually sit, and only book once your timed mock scores are consistently at or above target.", "If you fall short in exactly one skill, check One Skill Retake before booking a full test. It is computer-delivered only, must be taken within 60 days of your original test and in the same country, and is available across most of the 110+ IELTS countries, though not in the United States. Confirm your receiving organisation accepts a One Skill Retake result before relying on it."] },
      { heading: "Is IELTS worth it against cheaper tests?", paragraphs: ["Duolingo English Test and PTE Academic are usually cheaper. Acceptance is what decides it. IELTS is accepted by essentially every university and immigration system that asks for English, while the cheaper tests are accepted broadly but not universally, and some visa routes still specify IELTS. Check your specific university, employer or visa route first: a cheaper test your institution does not accept costs you 100% of its fee."] },
      { heading: "Get your money's worth on the first attempt", paragraphs: ["The most expensive IELTS is the one you sit twice. On IELTSVega you can sit full timed mock tests, get instant AI band scores on Writing and Speaking against all four criteria, and work through 15,000+ Academic and General Training questions, so the fee buys a result rather than a diagnostic."] },
      {
        heading: "Fees by country",
        paragraphs: ["This page is the global picture. For a single market in detail, including local fee changes and what is and is not accepted there:"],
        links: [
          { label: "IELTS exam fee in the USA 2026 — and the increase on 1 October", href: "/blog/ielts-exam-fee-usa" },
        ],
      },
    ],
    faqs: [
      { q: "How much does the IELTS exam cost in 2026?", a: "Globally the fee typically falls between about USD 230 and USD 490 equivalent, set locally by the British Council and IDP. In India it rose to roughly INR 19,000 from 1 April 2026. Always confirm the current price on your test centre's booking page, as fees change without much notice." },
      { q: "Why does IELTS for UKVI cost more?", a: "IELTS for UKVI is the same test under additional UK Home Office administrative and reporting requirements, and it is only offered at approved centres. That typically adds around 10 to 15% to the standard fee in most markets." },
      { q: "Is the IELTS fee refundable if I cancel?", a: "Usually you receive a partial refund if you cancel more than about five weeks before your test date, and little or nothing after that. Documented medical reasons are normally handled separately. Check your centre's specific terms, which are shown during booking." },
      { q: "Is One Skill Retake cheaper than sitting IELTS again?", a: "Yes. It carries its own fee, but it is generally lower than a full test, which is the reason it exists. It applies only to computer-delivered tests, must be taken within 60 days and in the same country as your original test, and is not available in the United States." },
      { q: "Did the IELTS fee increase in 2026?", a: "Yes, in several markets. In India the fee rose to around INR 19,000 from 1 April 2026, up from INR 18,000. Fees are set per market rather than globally, so an increase in one country does not mean every country changed. Check your own centre's booking page for the figure that applies to you." },
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
    seoTitle: "IELTS Fee in the USA 2026: Cost and October Rise",
    title: "IELTS exam fee in the USA 2026, and the increase landing on 1 October",
    excerpt:
      "What IELTS costs in the United States in 2026, the fee rise taking effect on 1 October, and whether booking before it is worth doing.",
    category: "Booking",
    date: "September 2026",
    publishedAt: "2026-09-14",
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
      { paragraphs: ["IELTS in the United States costs USD 285 for tests taken before 1 October 2026 and USD 325 from that date onward — an increase of USD 40, or about 14%. If you are planning to sit the test this autumn, the booking date is what matters, and there are only a few weeks left at the lower price."] },
      {
        heading: "IELTS fees in the USA",
        table: {
          caption: "Standard test-centre fees. Taken from ielts.org test centre listings for New York City Metro, San Francisco, Washington DC and Salt Lake City, checked 14 September 2026.",
          headers: ["Test", "Before 1 Oct 2026", "From 1 Oct 2026", "Change"],
          rows: [
            ["IELTS Academic", "USD 285", "USD 325", "+USD 40"],
            ["IELTS General Training", "USD 285", "USD 325", "+USD 40"],
            ["IELTS Online (at home)", "USD 244.40", "USD 244.40", "Unchanged at time of writing"],
          ],
        },
        paragraphs: ["Individual centres set their own fees and a few differ, so confirm the figure on your centre's booking page before paying. The four centres checked above, spread across the country, all quoted the same price — the fee is national rather than city-by-city, so there is no cheaper city to travel to."],
      },
      { heading: "Is it worth booking before 1 October?", paragraphs: ["Only if you would have been ready anyway. USD 40 is real money, but a rushed test is a far more expensive mistake: a re-sit costs the full fee again, so booking early to save 14% and then scoring half a band short turns a USD 40 saving into a USD 325 loss.", "The honest rule is the same as it always is. Book when your timed mock scores are consistently at or above the band you need, and treat the deadline as a tiebreaker if you are already close, not as a reason to sit early."] },
      { heading: "What the fee covers, and what it does not", bullets: ["All four sections — Listening, Reading, Writing and a face-to-face Speaking interview with a human examiner.", "One Test Report Form for you, plus a number of copies sent directly to receiving institutions (the free allowance varies by centre).", "It does not cover an Enquiry on Results, which is charged separately and refunded in full if any band changes.", "It does not cover rescheduling, which normally carries an administrative fee if you move your date more than about five weeks out.", "It does not cover One Skill Retake, which has its own lower fee — and note that One Skill Retake is not available in the United States."] },
      { heading: "IELTS Online versus a test centre", paragraphs: ["IELTS Online costs USD 244.40 and is sat at home under remote proctoring, which makes it the cheaper option and it is not affected by the October increase. The catch is acceptance: IELTS Online is not accepted for UK visa purposes, is not accepted by every university, and cannot be used where a UKVI-approved test is required. Confirm with the organisation receiving your score before you book it, because a cheaper test that is not accepted is the most expensive option of all."] },
      {
        heading: "Where to go next",
        paragraphs: ["Fees vary sharply by country. For the global picture and other markets:"],
        links: [
          { label: "IELTS exam fee in 2026: global costs and the fees nobody mentions", href: "/blog/ielts-exam-fee-2026" },
          { label: "How the IELTS band score is calculated, and how to raise it", href: "/blog/how-ielts-band-score-is-calculated" },
          { label: "IELTS practice tests with answers, free to start", href: "/blog/best-free-ielts-practice-tests-online" },
        ],
      },
    ],
    faqs: [
      { q: "How much does IELTS cost in the USA in 2026?", a: "USD 285 for tests taken before 1 October 2026, rising to USD 325 from that date. The fee is the same for IELTS Academic and IELTS General Training. IELTS Online, sat at home, costs USD 244.40. Individual centres can differ slightly, so confirm on your centre's booking page." },
      { q: "Is the IELTS fee going up in the USA?", a: "Yes. US test centres are moving from USD 285 to USD 325 for tests taken on or after 1 October 2026, an increase of about 14%. The change is tied to your test date, so booking before the deadline for a later test date does not lock in the old price at every centre — check your centre's terms." },
      { q: "Is IELTS cheaper in some US cities than others?", a: "No. Fees are set nationally rather than by city, and test centres in New York, San Francisco, Washington DC and Salt Lake City all quote the same figure. There is no cheaper city worth travelling to, so choose your centre on date availability and convenience instead." },
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
      { heading: "Acceptance: the only question that matters first", bullets: ["IELTS: the broadest acceptance of the three. Accepted by essentially every university and by the immigration systems of the UK, Canada, Australia and New Zealand. Some visa routes name it specifically.", "PTE Academic: very widely accepted for study, and accepted for several major visa routes, though not universally across all of them.", "Duolingo English Test: accepted by more than 5,000 universities and programmes, with strong coverage in the US, Canada and Australia, but noticeably thinner for visa and immigration purposes and at some highly selective institutions.", "The rule: check your specific university programme page and your specific visa route. Not the country. Not a comparison article. The programme page."] },
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
    seoTitle: "IELTS Results: Timing, TRF Validity & Remarks",
    title: "IELTS results: when they arrive, how long they last, and when to ask for a remark",
    excerpt:
      "When your IELTS results are released, how to check them, how long the Test Report Form stays valid, and whether an Enquiry on Results is worth the fee.",
    category: "Scoring",
    date: "August 2026",
    publishedAt: "2026-08-14",
    updatedAt: "2026-09-05",
    readMins: 8,
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
      { heading: "Should you apply for a remark?", paragraphs: ["An Enquiry on Results is a re-mark by a senior examiner. You normally have six weeks from your test date to apply, it carries a fee, and that fee is refunded in full if any band changes. Results typically take a few weeks.", "It is worth considering when: a skill came back well below every practice score you have ever produced, or when you are half a band from your requirement in Writing or Speaking. Those two are examiner-marked and therefore the only ones where judgement is genuinely involved. Listening and Reading are marked against a key, so a change is far less likely, though clerical checks do occasionally find something.", "Be realistic. Bands do change on remark, but most do not. If you are two bands short, a remark is not the route, preparation is."] },
      { heading: "How long an IELTS remark takes", paragraphs: ["The published window is 2 to 21 days from the day you submit the Enquiry on Results, and the major centres, British Council and IDP among them, all quote the same range. Most results land in the second week. Some centres report turning a single-skill enquiry around in a few hours when an examiner is free, so the two-hour stories you will find on forums are real, just not typical.", "The range is wide because the work is not automated. A senior examiner re-marks the paper from scratch, and how fast that happens depends on how many enquiries the centre is holding and whether the skills you queried need different examiners. Querying all four skills is slower than querying one.", "Plan against 21 days, not against the best case. If you have a visa or admissions deadline, count backwards from it before you apply, because there is no expedited option once the enquiry is in the queue."] },
      { heading: "Can a remark lower your score?", paragraphs: ["This is the most commonly asked question about the process and the most confidently answered wrongly. Sources contradict each other flatly: some preparation sites state that a band can never go down, others state that it can. Both cite official guidance.", "What is not in dispute is the mechanism. The paper is re-marked by a senior examiner who does not see the original mark, and the result of that re-mark is final: it replaces your original band rather than being compared against it. That is why the question has any force at all.", "The honest answer is to check the wording your own centre publishes, because that is the contract you are agreeing to, and it is the only version that governs your result. Do not rely on a forum post, or on this page, for a decision with a fee and a deadline attached. In practice the overwhelmingly common outcomes are no change at all, or an increase in one examiner-marked skill."] },
      { heading: "Remark, One Skill Retake, or full re-sit?", bullets: ["Half a band short in Writing or Speaking, and your practice scores were consistently higher: consider a remark first, since it costs nothing if it succeeds.", "One skill short, and you know why: One Skill Retake, within 60 days, same country, computer-delivered original test. Confirm your institution accepts a combined report.", "Two or more skills short: a full re-sit, after real preparation. Nothing else will do.", "Do not run a remark and book a retake for the same week. If the remark succeeds you have wasted a fee; if it fails you have lost preparation time to waiting."] },
      { heading: "Sending results to institutions", paragraphs: ["Your centre will send results electronically to a number of receiving organisations for free, with a fee for additional ones. Most universities and immigration authorities now prefer or require the electronic route, because it is verifiable and a paper TRF is not. Nominate your recipients accurately, because corrections after the fact cost time you may not have."] },
      { heading: "Make the next result the last one", paragraphs: ["Whatever the number says, the fix is the same: find the specific skill and the specific question types costing you marks, and drill those under time. On IELTSVega you get a band per skill after every mock, instant AI scoring on Writing and Speaking against all four criteria, and question-type level practice, so your next Test Report Form is the one you actually send."] },
    ],
    faqs: [
      { q: "How long do IELTS results take?", a: "Computer-delivered results usually arrive within 3 to 5 days of your test date. Paper-based tests, where they still run, take around 13 days. You are notified by email and can preview scores in your test centre's online portal." },
      { q: "How long is an IELTS score valid?", a: "The Test Report Form is normally treated as valid for two years from the test date. Some institutions accept older results with evidence of continued English use, and some immigration routes are stricter, so confirm against your specific requirement." },
      { q: "Is an IELTS remark worth it?", a: "It can be, if a Writing or Speaking band came back well below your consistent practice level, or you are half a band short. Those sections involve examiner judgement. The fee is refunded in full if any band changes, but most remarks do not change a score, so it is not a substitute for preparation." },
      { q: "How long does an IELTS remark take?", a: "Between 2 and 21 days from the day you submit the Enquiry on Results. British Council and IDP both publish that range. Most results arrive in the second week, and a single-skill enquiry is generally faster than querying all four. Plan against 21 days if you have a deadline, because there is no expedited option once the enquiry is submitted." },
      { q: "How long do I have to request an Enquiry on Results?", a: "Normally six weeks from your test date. The re-mark is carried out by a senior examiner who does not see your original mark. Check your centre's stated deadline, since it is the one that applies to you." },
      { q: "Can an IELTS remark decrease my score?", a: "Published guidance genuinely conflicts on this: some centres and preparation sites state a band cannot go down, others state it can, and both claim to be quoting official policy. What is certain is that the re-marked result is final and replaces the original. Check the wording your own test centre publishes before you apply, because that is the version that governs your result. In practice the usual outcomes are no change, or an increase in an examiner-marked skill." },
      { q: "How much does an IELTS remark cost, and is the fee refunded?", a: "Centres set their own Enquiry on Results fee, so the amount varies by country. The important part is standard everywhere: the fee is refunded in full if any band on your Test Report Form changes. A successful remark therefore costs you nothing but the waiting time." },
      { q: "How successful are IELTS remarks?", a: "No official success rate is published, and any figure you see quoted is someone's estimate. What the process tells you is where the odds sit: Writing and Speaking involve examiner judgement, so they are where bands realistically move. Listening and Reading are marked against an answer key, so a change there means a clerical error rather than a difference of opinion, and that is rare. A remark is worth it when one examiner-marked skill came back well below your consistent practice level." },
    ],
  },
];
