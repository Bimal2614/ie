"use server";

import { forgotPasswordSchema, resetPasswordSchema, type AuthFormState } from "@/lib/validation";
import { getRequestContext } from "@/lib/session";
import { startPasswordReset, completePasswordReset } from "@/lib/auth/recovery-core";

/**
 * The website's password-recovery forms.
 *
 * The policy — the per-IP throttle, the uniform anti-enumeration answer, the
 * revoke-everywhere on success, the warning email — lives in
 * src/lib/auth/recovery-core.ts and is shared with /api/v1/auth. These actions
 * only turn its result into `useActionState` form state, which is the whole of
 * the split: the app and the website cannot end up with different reset rules
 * because there is one implementation.
 */

/**
 * Start a password reset. Always returns ok (never reveals whether an account
 * exists — no enumeration). Rate-limited per IP.
 */
export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { ip } = await getRequestContext();
  const result = await startPasswordReset(parsed.data.email, ip);

  if (!result.ok) return { error: "Too many reset requests. Please try again later." };
  return { ok: true };
}

/** Complete a password reset with a valid token. */
export async function resetPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    if (fe.token) return { error: "This reset link is invalid. Please request a new one." };
    return { fieldErrors: { newPassword: fe.newPassword ?? [] } };
  }

  const result = await completePasswordReset(parsed.data.token, parsed.data.newPassword);
  if (!result.ok) {
    return { error: "This reset link is invalid or has expired. Please request a new one." };
  }

  return { ok: true };
}
