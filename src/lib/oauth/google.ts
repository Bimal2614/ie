import "server-only";
import { env } from "@/lib/env";

/**
 * Minimal Google OAuth 2.0 (authorization-code) helpers — no NextAuth, so it
 * plugs into the app's own session system. Server-only.
 */
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";
const PEOPLE_ENDPOINT = "https://people.googleapis.com/v1/people/me?personFields=phoneNumbers";

/**
 * Google's phone-number scope. NOT requested in `googleAuthUrl` below: it is a
 * "sensitive" scope, so asking for it puts the OAuth client through Google's
 * verification review and, until that passes, breaks sign-in for everyone. The
 * profile fetch still reads a number when one happens to be granted — add this
 * to the scope list once the client is verified and it starts arriving on its
 * own. Until then Google accounts land without a number and the app shell
 * prompts for it.
 */
export const GOOGLE_PHONE_SCOPE = "https://www.googleapis.com/auth/user.phonenumbers.read";

export function googleRedirectUri(): string {
  const base = env.APP_URL ?? "https://ieltsvega.com";
  return `${base}/api/auth/google/callback`;
}

export function googleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
    access_type: "online",
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export type GoogleToken = { accessToken: string; scope: string };

/**
 * Exchange the authorization code for an access token. Returns the granted
 * scopes alongside it — the user can tick scopes off on the consent screen, so
 * what was asked for is not necessarily what was given.
 */
export async function exchangeGoogleCode(code: string): Promise<GoogleToken | null> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token?: string; scope?: string };
  if (!json.access_token) return null;
  return { accessToken: json.access_token, scope: json.scope ?? "" };
}

export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
  /** Only ever set when the phone scope was granted — usually null. */
  phone: string | null;
};

/**
 * Read the primary phone number via the People API. Best-effort: only called
 * when the phone scope is in the grant, and any failure (API disabled on the
 * Cloud project, 403, no number on the account) resolves to null so sign-in
 * carries on and the user is prompted instead.
 */
async function fetchGooglePhone(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(PEOPLE_ENDPOINT, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      phoneNumbers?: { value?: string; canonicalForm?: string; metadata?: { primary?: boolean } }[];
    };
    const list = j.phoneNumbers ?? [];
    const pick = list.find((p) => p.metadata?.primary) ?? list[0];
    return pick?.canonicalForm ?? pick?.value ?? null;
  } catch {
    return null;
  }
}

export async function fetchGoogleProfile(token: GoogleToken): Promise<GoogleProfile | null> {
  const res = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });
  if (!res.ok) return null;
  const j = (await res.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
    phone_number?: string;
  };
  if (!j.sub || !j.email) return null;

  // The OIDC claim first (free — it is in the response we already have), then
  // the People API, and only when the grant actually covers it.
  const phone =
    j.phone_number ??
    (token.scope.includes(GOOGLE_PHONE_SCOPE) ? await fetchGooglePhone(token.accessToken) : null);

  return {
    sub: j.sub,
    email: j.email,
    emailVerified: Boolean(j.email_verified),
    name: j.name || j.email.split("@")[0],
    picture: j.picture,
    phone: phone ?? null,
  };
}
