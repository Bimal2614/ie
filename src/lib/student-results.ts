/**
 * Student results — the source data for the home page's moving results rail
 * (`<ResultsMarquee/>`, rendered in the `#results` section).
 *
 * ── SWAP THIS FOR YOUR REAL STUDENTS ─────────────────────────────────────
 * The first three entries are the ones that were already on the page. The
 * rest are PLACEHOLDERS with invented names, places and quotes: replace them
 * before launch. Nothing here is fetched or generated, so editing this array
 * is the whole job — the rail re-balances itself across the two rows.
 *
 * Testimonials are a legal claim as much as a design element. Only publish a
 * name, a band jump and a quote you actually have permission to publish.
 *
 * COUNT. Any length works, but the rail reads best at 12–16: the array is
 * split down the middle, so the 15 below give 8 in the top row and 7 in the
 * bottom — enough that a row never visibly repeats inside the viewport at
 * typical desktop widths.
 *
 * BAND GAINS. Vary them. Every entry here started life at exactly +1.5 and a
 * rail of fifteen identical "+1.5" chips reads as invented at a glance, which
 * costs you the credibility the section exists to buy.
 */

export type StudentResult = {
  /** First name plus a surname initial is the convention — "Priya S." */
  name: string;
  /** City, country code. Shown small under the name; keep it short. */
  place: string;
  /** Band before practising. Half-band steps. */
  from: number;
  /** Band achieved. The card derives the "+n.n" gain chip from `to - from`. */
  to: number;
  module: "Academic" | "General";
  /**
   * One sentence, ideally under ~120 characters. The card clamps to three
   * lines so a long quote truncates rather than breaking the rail's rhythm —
   * but a quote that gets cut off mid-thought is a wasted testimonial, so
   * write to the limit rather than relying on it.
   */
  quote: string;
  /**
   * OPTIONAL headshot, as a path under /public — e.g. "/students/priya.jpg".
   *
   * Omit it and the card falls back to the student's initials on a soft brand
   * disc, which is why this is safe to fill in a few at a time: a rail that is
   * half photos and half initials still looks deliberate. Leaving the field
   * pointing at a file that does not exist does NOT fall back — it renders a
   * broken image — so only set it once the file is in place.
   *
   * Supply a SQUARE crop, at least 96×96 and ideally around 200×200. The card
   * renders it at 44px with `object-cover`, so a non-square image is centre-
   * cropped rather than squashed, but a face that is off-centre in the source
   * will be off-centre in the circle.
   *
   * A recognisable photo of a real person is personal data and a testimonial
   * is a public claim: get written permission for the face as well as for the
   * name, band and quote.
   */
  photo?: string;
};

export const STUDENT_RESULTS: StudentResult[] = [
  // ── The three that were already on the page ──────────────────────────
  {
    name: "Priya S.",
    place: "Melbourne, AU",
    from: 6.5,
    to: 8.0,
    module: "Academic",
    quote:
      "The AI writing feedback showed me exactly why I was stuck at 6.5. Two weeks later I hit 8.",
    // Drop the file at public/students/priya.jpg and uncomment to use a real
    // headshot here; without it the card shows "PS" on a brand-soft disc.
    // photo: "/students/priya.jpg",
  },
  {
    name: "Ahmed R.",
    place: "Lahore, PK",
    from: 5.5,
    to: 7.0,
    module: "General",
    quote:
      "Recording speaking answers and getting an instant band changed everything for me.",
  },
  {
    name: "Lucia M.",
    place: "Bogotá, CO",
    from: 7.0,
    to: 8.5,
    module: "Academic",
    quote:
      "Full mocks under real timing made the actual exam feel routine. No surprises.",
  },

  // ── PLACEHOLDERS — replace with your real students ───────────────────
  {
    name: "Thanh N.",
    place: "Hanoi, VN",
    from: 6.0,
    to: 7.0,
    module: "Academic",
    quote:
      "I kept losing marks on Task 1 without knowing it. The criteria breakdown made the fix obvious.",
  },
  {
    name: "Chidi O.",
    place: "Lagos, NG",
    from: 6.5,
    to: 8.0,
    module: "General",
    quote:
      "Drilling True/False/Not Given until it clicked took my Reading from 6.5 to 8.",
  },
  {
    name: "Mariam H.",
    place: "Cairo, EG",
    from: 5.5,
    to: 6.5,
    module: "Academic",
    quote:
      "Part 3 always broke me. Practising the abstract questions daily fixed my fluency score.",
  },
  {
    name: "Ravi K.",
    place: "Bengaluru, IN",
    from: 7.0,
    to: 8.5,
    module: "Academic",
    quote:
      "Two mock tests a week for a month. My overall went up a full band and a half.",
  },
  {
    name: "Ana P.",
    place: "São Paulo, BR",
    from: 6.0,
    to: 8.0,
    module: "General",
    quote:
      "Getting a band on every essay meant I could see progress instead of guessing at it.",
  },
  {
    name: "Sang-woo L.",
    place: "Seoul, KR",
    from: 6.5,
    to: 7.5,
    module: "Academic",
    quote:
      "Listening once, exactly like the real test, is the only practice that actually prepared me.",
  },
  {
    name: "Fatima Z.",
    place: "Casablanca, MA",
    from: 5.5,
    to: 7.5,
    module: "General",
    quote:
      "The pronunciation feedback marked every hesitation. I had no idea I paused that much.",
  },
  {
    name: "Dmytro K.",
    place: "Kyiv, UA",
    from: 6.5,
    to: 8.0,
    module: "Academic",
    quote:
      "I needed 7.5 for my visa and got 8. The band calculator kept my target honest.",
  },
  {
    name: "Mei L.",
    place: "Guangzhou, CN",
    from: 6.0,
    to: 7.0,
    module: "Academic",
    quote:
      "Matching headings used to eat twenty minutes. Now it takes six and I get them right.",
  },
  {
    name: "Joana R.",
    place: "Manila, PH",
    from: 7.0,
    to: 8.0,
    module: "General",
    quote:
      "I resat one section under One Skill Retake and went up a full band on Writing alone.",
  },
  {
    name: "Bikash T.",
    place: "Kathmandu, NP",
    from: 5.5,
    to: 7.0,
    module: "Academic",
    quote:
      "Six weeks, one hour a day, and I finally cleared the band my university asked for.",
  },
  {
    name: "Sara A.",
    place: "Tehran, IR",
    from: 6.5,
    to: 7.0,
    module: "Academic",
    quote:
      "Seeing which of the four criteria was dragging my score down was the whole breakthrough.",
  },
];

/**
 * "Priya S." → "PS". Letters only, so a place-holding punctuation mark or an
 * accented surname initial can never produce a stray glyph in the avatar.
 */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part.replace(/[^\p{L}]/gu, "").charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
