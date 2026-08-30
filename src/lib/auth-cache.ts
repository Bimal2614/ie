import { toPlanKey, type PlanKey } from "@/lib/plans";

/**
 * The browser's copy of "who is signed in, and on what plan".
 *
 * WHY THIS EXISTS. The session cookie is httpOnly, so a client component cannot
 * read it; the marketing pages are static, so the server cannot render the
 * right header into them either. That left `AuthProvider` guessing "guest"
 * until `/api/me` came back, which is why a signed-in visitor kept seeing
 * "Sign in" on a cold load and had to refresh. This is the last answer the
 * server gave, kept so the FIRST FRAME is already right.
 *
 * IT IS A RENDERING HINT, NEVER A PERMISSION. Anyone can type anything into
 * localStorage; a forged `{"plan":"premium"}` changes which button is painted
 * and nothing else. Every gate reads the session server-side
 * (src/lib/security/plan-guard.ts), and the value here is overwritten by the
 * real answer as soon as the probe resolves. Nothing secret goes in it — no
 * token, no email — because another script on the page could read it.
 */

const KEY = "ieltsvega.auth";

/**
 * Matched to the session's idle expiry: a cache older than the longest-lived
 * session it could describe has nothing useful to say, and would only flash
 * "Dashboard" at someone whose session lapsed months ago.
 */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type AuthSnapshot = {
  authenticated: boolean;
  /** Already resolved against expiry by the server — see `effectivePlan()`. */
  plan: PlanKey;
};

type Stored = AuthSnapshot & { at: number };

/**
 * Every access is wrapped: Safari private mode, a browser set to block site
 * data, and thumbnail/preview contexts all throw on the accessor itself rather
 * than returning null, and none of that should take the page down.
 */
export function readAuthCache(): AuthSnapshot | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Stored>;
    if (typeof parsed?.at !== "number" || Date.now() - parsed.at > MAX_AGE_MS) {
      clearAuthCache();
      return null;
    }
    return { authenticated: Boolean(parsed.authenticated), plan: toPlanKey(parsed.plan) };
  } catch {
    return null;
  }
}

export function writeAuthCache(snapshot: AuthSnapshot): void {
  try {
    const stored: Stored = { ...snapshot, at: Date.now() };
    window.localStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    /* storage unavailable — the probe still drives the UI, just a frame later */
  }
}

/**
 * Called on sign-out and whenever the server says the session is gone, so a
 * shared machine does not paint the previous person's state at the next visitor.
 * Removing the key also fires a `storage` event in the app's OTHER tabs, which
 * is how signing out in one tab settles the rest.
 */
export function clearAuthCache(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear if storage was never available */
  }
}

export { KEY as AUTH_CACHE_KEY };
