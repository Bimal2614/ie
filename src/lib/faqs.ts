/**
 * Site FAQ content — shared by the homepage FAQ section and the /faq page (and
 * their FAQPage JSON-LD), so there's one source of truth. Written to answer the
 * high-intent questions people search around IELTS practice.
 */
export type Faq = { q: string; a: string };

export const FAQS: Faq[] = [
  { q: "What is the best platform to practise IELTS online?", a: "The best IELTS practice platform gives you instant, criteria-based band scores, full-length timed mock tests, and a large bank of exam-accurate questions for both Academic and General Training. IELTSVega combines AI band scoring for Writing and Speaking with 15,000+ questions and real 2026 exam timing across all four skills." },
  { q: "Can AI score my IELTS Writing and Speaking?", a: "Yes. IELTSVega scores Writing and Speaking on the four official IELTS band criteria and returns a band from 0–9 in seconds, with clear feedback on what to fix." },
  { q: "How can I improve my IELTS band score fast?", a: "Improve fastest by practising the specific question types you lose marks on, writing and speaking under timed conditions with instant band feedback, and sitting full mock tests weekly. Focused, criteria-based practice moves your band far faster than generic study." },
  { q: "Is IELTSVega good for both Academic and General Training?", a: "Yes. Every section includes dedicated Academic and General Training content, including General letters and Academic Task 1 visuals, so your practice matches the exam you're actually taking." },
  { q: "How many practice questions and mock tests are included?", a: "IELTSVega includes 15,000+ exam-style questions across every official IELTS task type and unlimited full-length mock tests, each timed to the real 2026 exam and scored with an AI band report." },
  { q: "How accurate is AI IELTS band scoring?", a: "AI band scoring evaluates the same criteria a human examiner uses and is calibrated to official IELTS band descriptors, giving a reliable, consistent estimate you can track between attempts." },
];
