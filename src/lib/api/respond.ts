import "server-only";

import { NextResponse } from "next/server";
import type { ApiErrorBody } from "@/lib/api/errors";
import { ApiError, STATUS_FOR } from "@/lib/api/errors";

/**
 * Every response this API sends, in one shape.
 *
 * `{ ok: true, data }` or `{ ok: false, error }` — never a bare resource, never
 * a bare error string. The reason is the Dart client: one generic
 * `ApiResponse<T>` can decode any endpoint, and there is exactly one place in
 * the app that decides whether a call succeeded. Returning the resource at the
 * top level would make that decision per-endpoint and status-code-shaped, which
 * is how a 402 paywall ends up rendered as a broken list.
 */
export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = { ok: false; error: ApiErrorBody };
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/**
 * Responses are never cached.
 *
 * Everything here is per-user and session-bearing. A shared cache — a CDN, a
 * proxy, the app's own HTTP cache — holding one candidate's dashboard and
 * handing it to the next is the single worst bug this API could have, so the
 * header goes on centrally rather than being remembered per route.
 */
const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  "X-Content-Type-Options": "nosniff",
} as const;

/** A successful response. `status` is 200 unless a route created something. */
export function ok<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ ok: true as const, data }, { status, headers: NO_STORE });
}

/** 201 with the created resource. */
export function created<T>(data: T): NextResponse<ApiSuccess<T>> {
  return ok(data, 201);
}

/** A failure response, built from the error's own code → status mapping. */
export function fail(error: ApiError): NextResponse<ApiFailure> {
  const headers: Record<string, string> = { ...NO_STORE };

  // Retry-After is what an HTTP client (and Dio's retry interceptor) actually
  // reads; the body field is for the countdown the UI draws. Both, always.
  if (error.retryAfterSec !== undefined) {
    headers["Retry-After"] = String(Math.max(1, Math.ceil(error.retryAfterSec)));
  }

  // A 401 without this is indistinguishable from a 401 the app caused by
  // sending a malformed header, and the app needs to know to clear its token.
  if (error.code === "unauthenticated") {
    headers["WWW-Authenticate"] = 'Bearer realm="ieltsvega"';
  }

  return NextResponse.json(
    { ok: false as const, error: error.toBody() },
    { status: STATUS_FOR[error.code], headers },
  );
}
