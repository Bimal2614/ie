import { GraduationCap } from "lucide-react";

/**
 * "You're joining Bright Future Academy" — the top of a signup reached through
 * a class's invite link.
 *
 * THE NAME IS THE LINK'S OWN CLAIM, not ours (see src/lib/partner-referral.ts),
 * so the copy is careful about what it promises. It says who the account will
 * be linked to and that practice stays the candidate's own; it does NOT say
 * anything about a plan, a discount or a payment, because at this point nobody
 * has checked whether the class exists — let alone whether it intends to pay
 * for this student.
 *
 * WITH NO NAME IN THE LINK it still renders, generically. The id is what
 * attaches the student, and a class that mangled the name half of its own link
 * should still get its students.
 */
export function PartnerWelcome({ name }: { name: string | null }) {
  return (
    <div className="rounded-xl border border-green/30 bg-green-soft px-3.5 py-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-green-ink">
        <GraduationCap className="size-4 shrink-0" />
        {name ? `You're joining through ${name}` : "You're joining through your institute"}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">
        Finish signing up and your account is linked to{" "}
        {name ? <span className="font-medium text-ink">{name}</span> : "them"} as their student, so
        they can see your progress and set you up with a plan. Your practice, scores and feedback
        stay yours.
      </p>
    </div>
  );
}
