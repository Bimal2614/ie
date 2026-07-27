"use client";

import { useState } from "react";
import { Send } from "lucide-react";

const control =
  "h-11 w-full rounded-lg border border-line bg-paper-elev px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/15";

/**
 * Contact form. With no transactional-email service wired yet, it composes a
 * pre-filled email in the visitor's own mail client via a mailto: link — so it
 * works today and can be swapped for a server action once email is set up.
 */
export function ContactForm({ to }: { to: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = `Name: ${name}\nEmail: ${email}\n\n${message}`;
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject || "IELTSAce enquiry")}&body=${encodeURIComponent(body)}`;
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="c-name" className="mb-1.5 block text-xs font-medium text-ink-soft">Your name</label>
          <input id="c-name" className={control} value={name} onChange={(e) => setName(e.target.value)} required placeholder="Alex Morgan" />
        </div>
        <div>
          <label htmlFor="c-email" className="mb-1.5 block text-xs font-medium text-ink-soft">Your email</label>
          <input id="c-email" type="email" className={control} value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
        </div>
      </div>
      <div>
        <label htmlFor="c-subject" className="mb-1.5 block text-xs font-medium text-ink-soft">Subject</label>
        <input id="c-subject" className={control} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="How can we help?" />
      </div>
      <div>
        <label htmlFor="c-message" className="mb-1.5 block text-xs font-medium text-ink-soft">Message</label>
        <textarea id="c-message" className={`${control} h-32 py-2.5`} value={message} onChange={(e) => setMessage(e.target.value)} required placeholder="Tell us a bit about your question…" />
      </div>
      <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-green px-6 py-3 text-sm font-semibold text-green-ink transition-[filter] hover:brightness-105">
        <Send className="size-4" /> Send message
      </button>
    </form>
  );
}
