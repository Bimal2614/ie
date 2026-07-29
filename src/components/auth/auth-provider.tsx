"use client";

import { createContext, useContext, useEffect, useState } from "react";

/**
 * Global auth state for client components.
 *
 * The session cookie is httpOnly, so the client can't read it directly. Rather
 * than have every component that cares (the nav, future plan badges, …) hit the
 * server on its own, this provider makes ONE `/api/me` call when the app first
 * mounts and shares the result via context. Consumers read it with `useAuth()`.
 *
 * `authenticated` is `null` while the first probe is in flight — treat that as
 * "unknown" and render the guest state until it resolves.
 */
type AuthState = {
  authenticated: boolean | null;
};

const AuthContext = createContext<AuthState>({ authenticated: null });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => !cancelled && setAuthenticated(!!d.authenticated))
      .catch(() => !cancelled && setAuthenticated(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return <AuthContext.Provider value={{ authenticated }}>{children}</AuthContext.Provider>;
}

/** Read the shared auth state. `authenticated`: true / false / null (loading). */
export function useAuth(): AuthState {
  return useContext(AuthContext);
}
