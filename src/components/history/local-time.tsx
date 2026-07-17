"use client";

import { useState, useEffect } from "react";

/**
 * Renders a timestamp in the *viewer's* timezone.
 *
 * `toLocaleString()` inside a Server Component formats with the server's
 * locale and zone — in production that is UTC, so an attempt made at 21:00 IST
 * would read 15:30 to the person who made it. Formatting after mount is the
 * only way the browser's zone gets a say; before then we render the stable ISO
 * date so the server HTML and first client render agree.
 */
export function LocalTime({
  value,
  options = { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" },
}: {
  /** ISO string — Dates don't survive the server→client boundary intact. */
  value: string;
  options?: Intl.DateTimeFormatOptions;
}) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    setText(new Date(value).toLocaleString(undefined, options));
    // options is a literal at every call site; re-running on identity churn
    // would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <time dateTime={value} suppressHydrationWarning>
      {text ?? value.slice(0, 10)}
    </time>
  );
}

/**
 * Back-link to the History day this attempt belongs to.
 *
 * Which day an attempt falls on depends on the viewer's zone: 00:30 IST is the
 * previous day in UTC. Deriving the link on the server would send someone to a
 * day their attempt isn't listed on, so the date is resolved in the browser.
 */
export function HistoryDayLink({
  iso,
  className,
  children,
}: {
  iso: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [href, setHref] = useState("/history");

  useEffect(() => {
    const d = new Date(iso);
    const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    setHref(`/history?date=${local}`);
  }, [iso]);

  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
