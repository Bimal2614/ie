/**
 * Send one speaking take to /api/practice/recording, and hand back exactly what
 * the server action this replaces used to return.
 *
 * A CLIENT MODULE, NOT A SERVER ACTION, and that is the whole point: a server
 * action is bundled into every route rendering the component that imports it,
 * so the transcoding behind this call dragged ffmpeg's 80 MB binary into all
 * four practice players and gave a reading page a 15.9-second cold start. The
 * upload is a route handler now; this keeps the recorder's call site unchanged.
 *
 * The result shape is deliberately identical to the old action's — the recorder
 * narrows on `"error" in res`, reads `retryable` to decide whether to resend the
 * same bytes, and reads `blocked` to tell a plan limit apart from a failure.
 */
export type StoreRecordingResult =
  | { audioUrl: string }
  | { error: string; blocked?: boolean; retryable?: boolean };

export async function storeSpeakingRecording(
  form: FormData,
): Promise<StoreRecordingResult> {
  const res = await fetch("/api/practice/recording", {
    method: "POST",
    body: form,
    // The session cookie is what authenticates this. Same-origin already sends
    // it; stated so a future absolute URL cannot silently drop it.
    credentials: "same-origin",
    cache: "no-store",
  });

  // A 500, a platform 413, or an HTML error page: anything that is not our JSON
  // still has to come back in our shape, or the recorder throws where it means
  // to show a sentence. Not marked retryable — resending the same bytes into a
  // failure we cannot identify would just cost the candidate another wait.
  try {
    const body = (await res.json()) as StoreRecordingResult;
    if (typeof body === "object" && body !== null && ("audioUrl" in body || "error" in body)) {
      return body;
    }
  } catch {
    // fall through
  }
  return res.status === 413
    ? { error: "That recording is too large to upload. Please record a shorter answer." }
    : { error: "Couldn't reach the server. Check your connection and re-record." };
}
