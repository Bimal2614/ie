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
      return accepted.length > 0 && accepted.some((e) => norm(given) === norm(e));
    }
    default:
      return false;
  }
}
