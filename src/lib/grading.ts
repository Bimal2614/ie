/**
 * Objective grading. Shared by the practice and mock-test actions — a
 * `"use server"` module may only export async functions, so this lives outside
 * both.
 */
import type { InputFamily } from "./ielts";

/** IELTS marks answers case- and whitespace-insensitively. */
function norm(s: unknown): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * The form a written answer is compared in. An examiner marks the answer, not
 * the typing: "0207 946 0321" and "02079460321" are the same phone number,
 * "library." is "library", "£50" in a gap printed after a £ is "50", and
 * "7:30" is "7.30". Spelling still has to be right, and nothing here can turn
 * a different word or number into the key (dots are kept, so 1.5 never
 * becomes 15).
 */
function canon(s: unknown): string {
  return norm(String(s ?? "").normalize("NFKC"))
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/[‐-―−]/g, "-")
    .replace(/^[\s.,;:!?"'()]+|[\s.,;:!?"'()]+$/g, "") // a full stop or quotes around it
    .replace(/\s*-\s*/g, "-") // "kick - off"
    .replace(/\s*&\s*/g, " and ")
    .replace(/[£$€₹]/g, "")
    .replace(/\b(per ?cent)\b/g, "%")
    // 8th = 8 (15th March = 15 March); only the right ending, so "8st" stays wrong
    .replace(/(\d+) ?(st|nd|rd|th)\b/g, (m, n: string, suf: string) => (ordinal(n) === suf ? n : m))
    .replace(/(\d),(?=\d{3}\b)/g, "$1") // 1,500 = 1500
    .replace(/(\d):(\d\d)\b/g, "$1.$2") // 7:30 = 7.30
    .trim();
}

function ordinal(n: string): string {
  const v = Number(n) % 100;
  if (v >= 11 && v <= 13) return "th";
  return ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[v % 10] ?? "th";
}

/** Same answer once typing differences are set aside. */
function sameAnswer(given: unknown, key: unknown): boolean {
  const a = canon(given);
  const b = canon(key);
  if (!a || !b) return false;
  if (a === b) return true;
  // Numbers, phone numbers, postcodes, codes, measurements: spacing and
  // hyphens are layout, not content ("BS8 1QU", "50km", "01632-960123").
  if (/\d/.test(b)) return a.replace(/[\s-]/g, "") === b.replace(/[\s-]/g, "");
  // Words: a hyphen and a space are the same join (kick-off / kick off).
  return a.replace(/-/g, " ") === b.replace(/-/g, " ");
}

export function grade(
  family: InputFamily,
  ans: Record<string, unknown> | undefined,
  ca: Record<string, unknown> | null,
): boolean {
  if (!ans || !ca) return false;
  switch (family) {
    case "single":
      return ans.index === ca.index;
    case "multi": {
      const a = [...((ans.indices as number[]) ?? [])].sort();
      const b = [...((ca.indices as number[]) ?? [])].sort();
      return a.length === b.length && a.every((v, i) => v === b[i]);
    }
    case "tfng":
    case "ynng":
      return norm(ans.value) === norm(ca.value);
    case "matching":
      return String(ans.key ?? "") === String(ca.key ?? "");
    case "completion":
    case "labelling": {
      // One gap = one question = one mark. Every accepted spelling lives in
      // `any`, so "4" and "four" both pass without the grader knowing why.
      const accepted = (ca.any as string[]) ?? [];
      // Lettered labelling answers arrive as a key rather than typed text.
      const given = ans.text ?? ans.key;
      return accepted.length > 0 && accepted.some((e) => sameAnswer(given, e));
    }
    default:
      return false;
  }
}

/**
 * Marks EARNED by an answer, which is not the same question as "is it right".
 *
 * "Questions 11 and 12 — choose TWO letters" is one input worth two marks, and
 * on the real answer sheet each letter is marked on its own: name one of the two
 * correctly and you score 1 of 2. Treating the item as a single all-or-nothing
 * unit — which is what `grade()` does, since it can only say true or false —
 * silently threw that mark away, so a candidate who was half right was told they
 * scored nothing and the paper total came out under.
 *
 * Over-selection still scores zero. Choosing three letters when two were asked
 * for is not a partially correct answer, it is an invalid one, and marking it
 * generously would let someone select every option and collect both marks.
 *
 * Every other family is one gap, one mark, so for those this is just `grade()`
 * expressed in marks.
 */
export function gradeMarks(
  family: InputFamily,
  ans: Record<string, unknown> | undefined,
  ca: Record<string, unknown> | null,
  marks: number,
): number {
  if (!ans || !ca) return 0;

  if (family === "multi") {
    // De-duplicated: the same letter twice is one selection, not two marks.
    const given = [...new Set((ans.indices as number[]) ?? [])];
    const want = new Set((ca.indices as number[]) ?? []);
    if (want.size === 0) return 0;
    if (given.length > want.size) return 0;
    const hits = given.filter((i) => want.has(i)).length;
    // Never award more than the item carries, whatever the authored data says.
    return Math.min(hits, marks);
  }

  return grade(family, ans, ca) ? marks : 0;
}
