"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { SIGNED_UP_COOKIE, trackSignUp } from "@/lib/analytics";

/**
 * Reports `sign_up` / `CompleteRegistration` once, on the first page after an
 * account is created.
 *
 * The signup action and the Google callback both end in a redirect, so the
 * only trace of success the browser gets is the cookie they set on the way
 * out. The email path's redirect is a CLIENT navigation — the root layout does
 * not remount — which is why this re-checks on every pathname change rather
 * than only on mount. The cookie is cleared the moment it is read, so a reload
 * cannot count the same account twice.
 */
export function SignupBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    const match = document.cookie.match(new RegExp(`(?:^|; )${SIGNED_UP_COOKIE}=([^;]*)`));
    if (!match) return;
    document.cookie = `${SIGNED_UP_COOKIE}=; Path=/; Max-Age=0`;
    trackSignUp(decodeURIComponent(match[1]) || "email");
  }, [pathname]);

  return null;
}
