/**
 * The cookie that carries a browser's device signals to account creation.
 *
 * A COOKIE, NOT A FORM FIELD, because Google sign-in leaves the site and comes
 * back to a route handler that never saw the form. Both the email signup action
 * and the Google callback read the same cookie, so neither path can be used to
 * skip the device check the other one applies.
 *
 * Shared by the browser (which writes it, src/lib/device-signals.ts) and the
 * server (which reads it, src/lib/security/ai-credits.ts), so it imports nothing.
 */
export const DEVICE_COOKIE = "iv_dev";

/** `<visitorId>~<localId>`; either half may be empty. */
export const DEVICE_SEPARATOR = "~";

/** What a signal may look like: an opaque id, never markup or a long string. */
export const DEVICE_SIGNAL_PATTERN = /^[A-Za-z0-9-]{8,64}$/;
