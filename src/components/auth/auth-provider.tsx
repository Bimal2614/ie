"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useState } from "react";
import {
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
 * server on its own, this provider makes ONE `/api/me` call when the app first
 * mounts and shares the result via context. Consumers read it with `useAuth()`.
 *
 * TWO SOURCES, IN ORDER. The last answer from localStorage is applied before
 * the browser paints, then the probe replaces it with the live one. That
 * ordering is the whole point: rendering "guest" while the fetch was in flight
 * is what made a signed-in visitor see "Sign in" on a cold load until they
 * refreshed. The cache is a hint about what to PAINT and is never trusted for
 * access — see src/lib/auth-cache.ts.
 *
 * `authenticated` is `null` only when nothing is known yet — treat it as
 * "unknown" and render the guest state.
 */
type AuthState = {
  authenticated: boolean | null;
  /** The tier to render for. `null` while unknown; already expiry-resolved. */
  plan: PlanKey | null;
};

const AuthContext = createContext<AuthState>({ authenticated: null, plan: null });

/**
 * A layout effect runs before paint, which is what removes the flash — but it
 * has nothing to do during SSR and React warns if it is called there.
 */
const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ authenticated: null, plan: null });

  // 1. Last known answer, before the first paint. Deliberately not the initial
  //    useState value: the server renders with no localStorage, so seeding it
  //    there would make the hydrated markup disagree with the HTML.
  useBeforePaint(() => {
    const cached = readAuthCache();
    if (cached) setState({ authenticated: cached.authenticated, plan: cached.plan });
  }, []);

  // 2. The real answer.
  useEffect(() => {
    let cancelled = false;

    fetch("/api/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const next = { authenticated: !!d.authenticated, plan: toPlanKey(d.plan) };
        setState(next);
        // A signed-out answer clears the cache, so an expired session or a
        // sign-out from another device stops painting as signed in.
        if (next.authenticated) writeAuthCache(next);
        else clearAuthCache();
      })
      // A failed probe is not a sign-out. Keeping whatever the cache said beats
      // logging someone out of the UI because their train went into a tunnel.
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  // 3. Other tabs. Signing out in one tab removes the key; this is how the
  //    others stop showing "Dashboard" without waiting for a reload.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== null && e.key !== AUTH_CACHE_KEY) return;
      const cached = readAuthCache();
      setState(
        cached
          ? { authenticated: cached.authenticated, plan: cached.plan }
          : { authenticated: false, plan: "free" },
      );
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

/** Read the shared auth state. `authenticated`: true / false / null (unknown). */
export function useAuth(): AuthState {
  return useContext(AuthContext);
}
