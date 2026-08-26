"use client";

import { useEffect, useRef, useState } from "react";
import {
  COUNTRY_OPTIONS,
  splitStoredPhone,
  toStoredPhone,
  type CountryCode,
} from "@/lib/phone";

/**
 * Country <select> + national-number input, posting ONE hidden `phone` field
 * holding the combined value (`+91-9904529857`).
 *
 * Two visible controls, one submitted value: the server keeps taking a single
 * string, the DB keeps storing a single string, and there is no country column
 * that could drift out of sync with the number. When the pair isn't a valid
 * number the hidden field stays empty, so the server rejects it down the same
 * path as any other bad input — nothing here is trusted.
 *
 * Options read "India +91" so the browser's built-in select typeahead finds a
 * country by name; a native <select> shows the same text open and closed, so
 * the closed state truncates rather than showing a code-only label.
 */
export function PhoneField({
  id = "phone",
  label = "Phone number",
  defaultValue = "",
  error,
  autoFocus,
}: {
  id?: string;
  label?: string;
  /** Stored value, split back into the two controls for editing. */
  defaultValue?: string | null;
  error?: string;
  autoFocus?: boolean;
}) {
  const initial = splitStoredPhone(defaultValue);
  const [country, setCountry] = useState<CountryCode>(initial.country);
  const [national, setNational] = useState(initial.national);

  const selectRef = useRef<HTMLSelectElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * React 19 resets the whole <form> once a form action settles. That reset is
   * a DOM operation React does not reconcile: our state still holds what the
   * user picked, but the controls snap back to their DOM defaults — an empty
   * box, and for the <select> its FIRST option (Afghanistan), which is what
   * made a saved "India" appear to revert. Re-apply state once the browser has
   * finished the reset.
   *
   * Deliberately not driven off the action's success: the reset fires on a
   * failed submit too, and losing a half-typed number to a validation error on
   * some other field would be just as wrong.
   */
  useEffect(() => {
    const form = selectRef.current?.form;
    if (!form) return;
    const restore = () => {
      queueMicrotask(() => {
        if (selectRef.current) selectRef.current.value = country;
        if (inputRef.current) inputRef.current.value = national;
      });
    };
    form.addEventListener("reset", restore);
    return () => form.removeEventListener("reset", restore);
  }, [country, national]);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-ink-soft">
        {label}
      </label>

      <input type="hidden" name="phone" value={toStoredPhone(national, country) ?? ""} />

      <div className="flex gap-2">
        <select
          ref={selectRef}
          aria-label="Country calling code"
          value={country}
          onChange={(e) => setCountry(e.target.value as CountryCode)}
          className="h-11 w-[8.5rem] shrink-0 truncate rounded-lg border border-line bg-paper-elev px-2 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
        >
          {COUNTRY_OPTIONS.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} +{c.dial}
            </option>
          ))}
        </select>

        <input
          ref={inputRef}
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          autoFocus={autoFocus}
          value={national}
          onChange={(e) => setNational(e.target.value)}
          aria-invalid={Boolean(error)}
          placeholder="98765 43210"
          className="auth-input h-11 min-w-0 flex-1 rounded-lg border border-line bg-paper-elev px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/15 aria-[invalid=true]:border-danger"
        />
      </div>

      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
