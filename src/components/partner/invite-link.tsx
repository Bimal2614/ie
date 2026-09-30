"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";

/**
 * The class's invite link, ready to paste into a WhatsApp group.
 *
 * THE OTHER HALF OF ENROLMENT, not a replacement for it. The panel's Enrol form
 * is for a student sitting in the room: the class types the address, picks the
 * password and hands it over. This is for the four hundred who are not in the
 * room — they sign up themselves, choose their own password, and land on the
 * roster all the same, ready to be paid for.
 *
 * A CLIENT COMPONENT ONLY BECAUSE OF THE CLIPBOARD. The link itself is built on
 * the server and passed in whole; nothing here knows how it is composed.
 */
export function InviteLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The "Copied" state is a timeout, and a timeout that outlives the component
  // sets state on something unmounted.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /*
       * `navigator.clipboard` is unavailable over plain HTTP and can be refused
       * outright by the browser's permissions. Selecting the text is the
       * fallback that always works: it leaves the link one Ctrl-C away rather
       * than leaving a dead button.
       */
      const field = document.getElementById("partner-invite-url");
      if (field instanceof HTMLInputElement) field.select();
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="rounded-2xl border border-line bg-paper-elev p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Link2 className="size-4 text-brand" /> Your student sign-up link
      </p>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">
        Share this with your students. Anyone who creates an account through it — with an email or
        with Google — joins your roster automatically, and you can buy their plan from here at your
        partner rate.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          id="partner-invite-url"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Your student sign-up link"
          className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 py-2 font-mono text-xs text-ink-soft"
        />
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-hover"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      <p aria-live="polite" className="sr-only">
        {copied ? "Link copied to clipboard" : ""}
      </p>
    </section>
  );
}
