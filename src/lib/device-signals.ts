import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { DEVICE_COOKIE, DEVICE_SEPARATOR } from "@/lib/device-cookie";

/**
 * The browser half of the free-credit device check (the server half is
 * src/lib/security/ai-credits.ts). Two complementary signals:
 *
 *   - visitorId: FingerprintJS, computed from browser and hardware traits, so it
 *     survives clearing storage and (usually) an incognito window.
 *   - localId: a random UUID in localStorage. Stable per browser profile and
 *     never collides, so it tells identical lab machines apart and survives
 *     fingerprint drift after a browser update.
 *
 * Both are best-effort. Whatever cannot be obtained is left out, and signup is
 * never blocked on it: the worst case is a device the server cannot recognise,
 * which then simply gets its credits.
 */

const LOCAL_KEY = "ieltsvega.device";

function localId(): string {
  try {
    let id = localStorage.getItem(LOCAL_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(LOCAL_KEY, id);
    }
    return id;
  } catch {
    // localStorage refused (some privacy modes) — skip this signal.
    return "";
  }
}

let visitorId: Promise<string> | null = null;

function fingerprint(): Promise<string> {
  visitorId ??= FingerprintJS.load()
    .then((fp) => fp.get())
    .then((r) => r.visitorId)
    .catch(() => "");
  return visitorId;
}

/**
 * Compute both signals and park them in the cookie the server reads at account
 * creation. Called when an auth page mounts, so the fingerprint is ready long
 * before the candidate presses "Create account" or "Continue with Google".
 */
export async function writeDeviceCookie(): Promise<void> {
  const [fp, local] = await Promise.all([fingerprint(), Promise.resolve(localId())]);
  if (!fp && !local) return;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  // A day is plenty for one signup; it is not a tracking cookie.
  document.cookie =
    `${DEVICE_COOKIE}=${fp}${DEVICE_SEPARATOR}${local}; Path=/; Max-Age=86400; SameSite=Lax${secure}`;
}
