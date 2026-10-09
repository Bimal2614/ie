import type { AuthFormState } from "@/lib/validation";

/**
 * Turn a dropped connection on a form's Server Action into a form error.
 *
 * When the POST never reaches the server, `fetch` rejects with a TypeError
 * ("Load failed" in Safari, "Failed to fetch" in Chrome), and useActionState
 * rethrows it into the nearest error boundary: the candidate loses the form
 * they just filled in to a crash screen, and Sentry gets a report for their
 * Wi-Fi (IELTS-VEGA-3). Anything else — a redirect, a real server error — is
 * rethrown untouched.
 */
export function withNetworkError<P>(
  action: (prev: AuthFormState, payload: P) => Promise<AuthFormState>,
) {
  return async (prev: AuthFormState, payload: P): Promise<AuthFormState> => {
    try {
      return await action(prev, payload);
    } catch (e) {
      if (e instanceof TypeError) {
        return { error: "We couldn't reach the server. Check your connection and try again." };
      }
      throw e;
    }
  };
}
