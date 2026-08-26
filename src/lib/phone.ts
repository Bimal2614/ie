import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/mobile";

/**
 * Phone parsing/validation, backed by libphonenumber-js — Google's
 * libphonenumber rules, so a number is checked against the real numbering plan
 * of its country rather than a digit-count guess.
 *
 * The MOBILE metadata bundle specifically: OTP is coming, and an SMS to a
 * landline never arrives. That set rejects fixed-line ranges (a UK 020 number,
 * say) while still accepting countries whose plans don't separate mobile from
 * fixed. It costs ~15 KB more than the `min` bundle and is worth it — `min`
 * accepts anything of a plausible length, including ranges no carrier issues.
 *
 * STORED FORM — one string, country code and national number separated by a
 * hyphen: `+91-9904529857`. The hyphen is what makes the two halves readable
 * at a glance and splittable without a parser, in the DB or in a support
 * ticket. `toE164()` strips it back to `+919904529857` for anything that needs
 * the wire format (the OTP provider, when that lands).
 */

export type { CountryCode };

/** Falls back here when a number can't be parsed for its country. */
export const DEFAULT_COUNTRY: CountryCode = "IN";

const regionNames =
  typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

export type CountryOption = {
  code: CountryCode;
  /** "India" — resolved from the ISO code, so there's no name list to maintain. */
  name: string;
  /** Calling code without the "+", e.g. "91". */
  dial: string;
};

/** Every country the metadata knows, A-Z by name. Built once at module load. */
export const COUNTRY_OPTIONS: CountryOption[] = getCountries()
  .map((code) => ({
    code,
    name: regionNames?.of(code) ?? code,
    dial: getCountryCallingCode(code),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

/**
 * Parse a stored value back into a phone number.
 *
 * Tolerates the hyphen being absent so rows written before this format (plain
 * E.164) still read correctly; they get rewritten to the hyphenated form the
 * next time that user saves. A bare national number with no country code
 * cannot be resolved and comes back null — there is no country to attach it to.
 */
function parseStored(value: string | null | undefined) {
  if (!value) return null;
  const compact = value.replace(/[\s()./-]/g, "");
  if (!compact.startsWith("+")) return null;
  return parsePhoneNumberFromString(compact) ?? null;
}

/**
 * Combine the two UI fields into the single stored value (`+91-9904529857`).
 * Null when the pair isn't a valid mobile number for that country.
 */
export function toStoredPhone(national: string, country: CountryCode): string | null {
  const trimmed = national.trim();
  if (!trimmed) return null;
  const parsed = parsePhoneNumberFromString(trimmed, country);
  if (!parsed?.isValid()) return null;
  return `+${parsed.countryCallingCode}-${parsed.nationalNumber}`;
}

/** Split a stored value back into the two controls the UI edits. */
export function splitStoredPhone(value: string | null | undefined): {
  country: CountryCode;
  national: string;
} {
  const parsed = parseStored(value);
  if (!parsed?.isValid()) return { country: DEFAULT_COUNTRY, national: "" };
  return { country: parsed.country ?? DEFAULT_COUNTRY, national: parsed.nationalNumber };
}

/** True for a valid, complete stored number. The server-side gate. */
export function isValidStoredPhone(value: string): boolean {
  return Boolean(parseStored(value)?.isValid());
}

/** Wire format for SMS/OTP: `+91-9904529857` → `+919904529857`. */
export function toE164(stored: string | null | undefined): string | null {
  const parsed = parseStored(stored);
  return parsed?.isValid() ? parsed.number : null;
}

/**
 * Best-effort normalization of a number from an outside source (Google), which
 * arrives in whatever shape that provider uses. Null if it isn't usable.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const parsed = parsePhoneNumberFromString(raw.trim());
  if (!parsed?.isValid()) return null;
  return `+${parsed.countryCallingCode}-${parsed.nationalNumber}`;
}
