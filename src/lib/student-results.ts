/**
 * Student results — the source data for the home page's moving results rail
 * (`<ResultsMarquee/>`, rendered in the `#results` section).
 *
 * ── PARTLY REAL, PARTLY NOT — READ BEFORE LAUNCH ─────────────────────────
 * The 16 entries below are real students: the `name`, the achieved band
 * (`to`) and the `photo` all come from the source headshots in
 * utility/scripts/IELTS, which are named "<Full Name> <Band>.<ext>".
 *
 * Everything else on each entry — `place`, `module`, `from` and `quote` — is
 * INVENTED. The filenames carried no location, module, starting band or
 * testimonial, so those fields were written to be plausible rather than left
 * blank. They are attached to real people's names and faces, so review and
 * replace them with what each student actually said and scored.
 *
 * Testimonials are a legal claim as much as a design element. Only publish a
 * name, a band jump and a quote you actually have permission to publish.
 *
 * COUNT. Any length works, but the rail reads best at 12–16: the array is
 * split down the middle, so these 16 give 8 in each row — enough that a row
 * never visibly repeats inside the viewport at typical desktop widths.
 *
 * BAND GAINS. Vary them. A rail of identical "+1.5" chips reads as invented
 * at a glance, which costs you the credibility the section exists to buy.
 */

export type StudentResult = {
  /** Full name, as it appears on the student's headshot filename. */
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
   * OPTIONAL headshot. Either a path under /public ("/students/priya.jpg") or
   * an absolute URL on a host allow-listed in next.config.ts's
   * `images.remotePatterns` — the entries below use the latter, pointing at
   * the S3 `students/` prefix (the one prefix in that bucket with a
   * public-read policy; everything else there stays private).
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

/**
 * The public `students/` prefix on the app's S3 bucket. Uploaded by
 * utility/scripts/upload-student-photos.ts, which derives each key by
 * slugifying the student's name — so a new headshot dropped into
 * utility/scripts/IELTS and re-uploaded lands at a predictable URL.
 *
 * The host must stay in sync with `images.remotePatterns` in next.config.ts,
 * which scopes the allow-list to this same prefix.
 */
const S3_STUDENTS = "https://ielts-ace-files.s3.us-east-1.amazonaws.com/students";

export const STUDENT_RESULTS: StudentResult[] = [
  {
    name: "Aman Pandey",
    place: "Rajkot, IN",
    from: 6.0,
    to: 7.5,
    module: "Academic",
    quote:
      "The Writing feedback broke down exactly where I was losing marks on Task 2.",
    photo: `${S3_STUDENTS}/aman-pandey.jpg`,
  },
  {
    name: "Ayan Shah",
    place: "Ahmedabad, IN",
    from: 7.0,
    to: 8.5,
    module: "Academic",
    quote:
      "Full mock tests under real timing were the difference. By exam day nothing felt new.",
    photo: `${S3_STUDENTS}/ayan-shah.jpg`,
  },
  {
    name: "Bhavya Kakadiya",
    place: "Surat, IN",
    from: 5.5,
    to: 6.5,
    module: "General",
    quote:
      "I kept missing True/False/Not Given until I drilled them daily. Reading went up a full band.",
    photo: `${S3_STUDENTS}/bhavya-kakadiya.jpeg`,
  },
  {
    name: "Chen Yuting",
    place: "Shanghai, CN",
    from: 6.5,
    to: 7.5,
    module: "Academic",
    quote:
      "An instant band on Fluency and Pronunciation showed me habits I didn't know I had.",
    photo: `${S3_STUDENTS}/chen-yuting.jpg`,
  },
  {
    name: "Chioma Okonkwo",
    place: "Lagos, NG",
    from: 6.5,
    to: 8.0,
    module: "General",
    quote:
      "The band calculator kept my target honest instead of guessing. I landed well past it.",
    photo: `${S3_STUDENTS}/chioma-okonkwo.jpg`,
  },
  {
    name: "Harshit Kankotiya",
    place: "Rajkot, IN",
    from: 5.5,
    to: 6.5,
    module: "General",
    quote:
      "Listening once, exactly like the real test, fixed my habit of replaying the audio.",
    photo: `${S3_STUDENTS}/harshit-kankotiya.jpeg`,
  },
  {
    name: "Jay Suhagiya",
    place: "Surat, IN",
    from: 5.0,
    to: 6.5,
    module: "Academic",
    quote:
      "Seeing all four Writing criteria showed me Lexical Resource, not grammar, held me back.",
    photo: `${S3_STUDENTS}/Jay+Suhagiya+6.5.jpeg`,
  },
  {
    name: "Lena Müller",
    place: "Berlin, DE",
    from: 6.5,
    to: 7.5,
    module: "Academic",
    quote:
      "The AI marked every hesitation. I had no idea I was pausing that much in Part 3.",
    photo: `${S3_STUDENTS}/lena-muller.jpg`,
  },
  {
    name: "Li Meiling",
    place: "Beijing, CN",
    from: 7.0,
    to: 8.5,
    module: "Academic",
    quote:
      "Practising the exact question types I kept failing is what pushed me past 8.",
    photo: `${S3_STUDENTS}/li-meiling.jpg`,
  },
  {
    name: "Mandeep Singh",
    place: "Amritsar, IN",
    from: 6.5,
    to: 8.0,
    module: "Academic",
    quote:
      "The Task 1 templates gave me a structure I could rely on under time pressure.",
    photo: `${S3_STUDENTS}/mandeep-singh.jpg`,
  },
  {
    name: "Mehmet Yılmaz",
    place: "Istanbul, TR",
    from: 6.0,
    to: 7.5,
    module: "Academic",
    quote:
      "Every Speaking answer came back with a band and specific feedback in seconds.",
    photo: `${S3_STUDENTS}/mehmet-yilmaz.jpg`,
  },
  {
    name: "Neil Patel",
    place: "Vadodara, IN",
    from: 6.5,
    to: 8.0,
    module: "Academic",
    quote:
      "Grammar was quietly capping my Writing score. The criteria breakdown made the fix obvious.",
    photo: `${S3_STUDENTS}/neil-patel.jpg`,
  },
  {
    name: "Priya Ghenaiya",
    place: "Surat, IN",
    from: 6.0,
    to: 7.5,
    module: "Academic",
    quote:
      "Part 3 always broke me. Practising the abstract questions daily fixed my fluency score.",
    photo: `${S3_STUDENTS}/priya-ghenaiya.jpeg`,
  },
  {
    name: "Rushikesh Kakadiya",
    place: "Surat, IN",
    from: 5.5,
    to: 6.5,
    module: "Academic",
    quote:
      "Matching headings used to cost me the most marks in Reading. The timed drills fixed that.",
    photo: `${S3_STUDENTS}/rushikesh-kakadiya.jpeg`,
  },
  {
    name: "Subham Shekhada",
    place: "Rajkot, IN",
    from: 5.0,
    to: 6.5,
    module: "Academic",
    quote:
      "I finally understood what examiners reward instead of just speaking fluently.",
    photo: `${S3_STUDENTS}/subham-shekhada.jpeg`,
  },
  {
    name: "Wang Xiaoli",
    place: "Guangzhou, CN",
    from: 6.5,
    to: 8.0,
    module: "Academic",
    quote:
      "Four full mocks on 2026 timing meant exam day was a repeat, not a surprise.",
    photo: `${S3_STUDENTS}/wang-xiaoli.jpg`,
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
