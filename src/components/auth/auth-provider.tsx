"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  AUTH_CACHE_EVENT,
  AUTH_CACHE_KEY,
  clearAuthCache,
  readAuthCache,
  writeAuthCache,
} from "@/lib/auth-cache";
import { toPlanKey, type PlanKey } from "@/lib/plans";

/**
 * Global auth state for client components.
 *
 * The session cookie is httpOnly, so the client can't read it directly. Rather
 * than have every component that cares (the nav, the pricing cards) hit the
 * server on its own, this provider owns the `/api/me` probe and shares the
 * result via context. Consumers read it with `useAuth()`.
 *
 * TWO SOURCES, IN ORDER. The last answer from localStorage is applied before
 * the browser paints, then the probe replaces it with the live one. That
 * ordering is the whole point: rendering "guest" while the fetch was in flight
 * is what made a signed-in visitor see "Sign in" on a cold load until they
 * refreshed. The cache is a hint about what to PAINT and is never trusted for
 * access — see src/lib/auth-cache.ts.
 *
 * IT RE-PROBES ON EVERY NAVIGATION, and that is not belt and braces. `login`,
 * `signup` and `logout` each finish with a server-side `redirect()`, which the
 * App Router serves as a CLIENT navigation: no reload, so this provider is
 * never remounted and its state outlives the account switch that just happened.
 * Probing once at mount is what left a premium session's "Your current plan"
 * sitting on the pricing card after signing back in on a free account, until a
 * manual refresh. One `no-store` JSON round trip per navigation ends it.
 *
 * `authenticated` is `null` only when nothing is known yet — treat it as
 * "unknown" and render the guest state.
 */
type AuthState = {
  authenticated: boolean | null;
  /** The tier to render for. `null` while unknown; already expiry-resolved. */
  plan: PlanKey | null;
};

type AuthContextValue = AuthState & {
  /**
   * Ask the server again, now. For the moments a navigation doesn't cover —
   * chiefly a checkout that just granted a plan on the page the buyer is
   * already standing on.
   */
  refresh: () => void;
};

const AuthContext = createContext<AuthContextValue>({
  authenticated: null,
  plan: null,
  refresh: () => {},
});

/**
 * A layout effect runs before paint, which is what removes the flash — but it
 * has nothing to do during SSR and React warns if it is called there.
 */
const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ authenticated: null, plan: null });
  const pathname = usePathname();

  /**
   * Sequence number of the newest probe. A navigation that fires a second
   * request while the first is still in flight must not have its answer
   * overwritten by the older one landing late — which, on a slow connection, is
   * exactly the sign-out → sign-in sequence this file is about.
   */
  const latest = useRef(0);

  /** Only replace state when something actually differs — see `sync` below. */
  const apply = useCallback((next: AuthState) => {
    setState((prev) =>
      prev.authenticated === next.authenticated && prev.plan === next.plan ? prev : next,
    );
  }, []);

  const refresh = useCallback(() => {
    const id = ++latest.current;
    fetch("/api/me", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (id !== latest.current) return;
        const authenticated = !!d.authenticated;
        const plan = toPlanKey(d.plan);
        apply({ authenticated, plan });
        // Write the answer back so the NEXT cold load paints it before its own
        // probe resolves. A signed-out answer clears the key instead, so an
        // expired session or a sign-out from another device stops painting as
        // signed in.
        if (authenticated) writeAuthCache({ authenticated: true, plan });
        else clearAuthCache();
      })
      // A failed probe is not a sign-out. Keeping whatever the cache said beats
      // logging someone out of the UI because their train went into a tunnel.
      .catch(() => undefined);
  }, [apply]);

  // 1. Last known answer, before the first paint. Deliberately not the initial
  //    useState value: the server renders with no localStorage, so seeding it
  //    there would make the hydrated markup disagree with the HTML.
  useBeforePaint(() => {
    const cached = readAuthCache();
    if (cached) setState({ authenticated: cached.authenticated, plan: cached.plan });
  }, []);

  // 2. The real answer — on mount, and again after every client navigation,
  //    which is the only signal we get that a server action may have changed
  //    who is signed in. See the note at the top of the file.
  useEffect(() => {
    refresh();
  }, [pathname, refresh]);

  // 3. The cache changed. In another tab that arrives as `storage`; in this one
  //    it arrives as our own event, because `storage` skips the tab that wrote.
  //    Signing out empties the key, and this is what turns that into guest state
  //    here and now rather than at the next reload.
  useEffect(() => {
    const sync = () => {
      const cached = readAuthCache();
      apply(
        cached
          ? { authenticated: cached.authenticated, plan: cached.plan }
          : { authenticated: false, plan: "free" },
      );
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== null && e.key !== AUTH_CACHE_KEY) return;
      sync();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(AUTH_CACHE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(AUTH_CACHE_EVENT, sync);
    };
  }, [apply]);

  // 4. Back into a page the browser froze whole. A bfcache restore runs no
  //    effects and changes no pathname, so without this the back button can
  //    return someone to a minutes-old snapshot of their own account.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) refresh();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ ...state, refresh }}>{children}</AuthContext.Provider>
  );
}

/** Read the shared auth state. `authenticated`: true / false / null (unknown). */
export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
