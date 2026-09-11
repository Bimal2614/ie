"use server";

import { redirect } from "next/navigation";
import { signupSchema, loginSchema, type AuthFormState } from "@/lib/validation";
import { homeFor, safeNext } from "@/lib/auth-routes";
import { createSession, destroySession, getRequestContext } from "@/lib/session";
import { getCurrentUser } from "@/lib/dal";
import { audit, authenticate, registerAccount } from "@/lib/auth/core";

/**
 * The web's entry points into authentication.
 *
 * The POLICY — throttling, the lockout ladder, the anti-enumeration timing, the
 * audit trail — lives in `src/lib/auth/core.ts`, shared with the JSON API that
 * the mobile app calls. What is left here is the part that is genuinely
 * browser-shaped: reading a FormData, setting a session COOKIE, and redirecting
 * to the page they were heading for.
 */

/* ------------------------------------------------------------------ *
 * Sign up
 * ------------------------------------------------------------------ */
export async function signup(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    targetModule: formData.get("targetModule") ?? "academic",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const origin = await getRequestContext();
  const result = await registerAccount(parsed.data, origin);

  if (!result.ok) {
    // The one failure that belongs on a field rather than above the form.
    if (result.code === "email_taken") {
      return { fieldErrors: { email: [result.message] } };
    }
    return { error: result.message };
  }

  await createSession(result.userId); // rotates in a fresh session token
  const destination = safeNext(formData.get("next"));

  // MUST be outside any try/catch — `redirect()` works by throwing NEXT_REDIRECT.
  redirect(destination);
}

/* ------------------------------------------------------------------ *
 * Log in
 * ------------------------------------------------------------------ */
export async function login(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const origin = await getRequestContext();
  const result = await authenticate(parsed.data.email, parsed.data.password, origin);
  if (!result.ok) return { error: result.message };

  await createSession(result.userId);

  // Back to whatever they were trying to reach — the pricing card they pressed
  // Subscribe on, or the protected page the proxy bounced. `safeNext` is what
  // stops that being an open redirect; see src/lib/auth-routes.ts. With nothing
  // asked for, the fallback follows the role: a partner's home is its panel.
  redirect(safeNext(formData.get("next"), homeFor(result.role)));
}

/* ------------------------------------------------------------------ *
 * Log out
 * ------------------------------------------------------------------ */
export async function logout(): Promise<void> {
  const user = await getCurrentUser();
  const { ip, userAgent } = await getRequestContext();
  await destroySession();
  if (user) await audit(user.id, "logout", { ip, userAgent });
  redirect("/login");
}
