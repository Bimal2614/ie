import "server-only";

import type { PlanBlock } from "@/lib/plans";

/**
 * The vocabulary of API failures.
 *
 * A CLOSED SET, deliberately. The app switches on these strings to decide what
 * to show — a login screen, a paywall, a "slow down" toast, a field highlight —
 * so they are part of the contract in the way an HTTP status is not. Two
 * different 400s that need two different screens must be two codes here.
 */
export type ApiErrorCode =
  /** No session, or one that has expired/been revoked. The app must sign in. */
  | "unauthenticated"
  /** Signed in, but not allowed — wrong role, or somebody else's resource. */
  | "forbidden"
  /** The plan does not cover this. Carries a `plan` block: render the paywall. */
  | "plan_required"
  /** Malformed input. Carries `fields` when it maps to form inputs. */
  | "validation_failed"
  /** Nothing there, or nothing there THAT THIS USER MAY SEE (see below). */
  | "not_found"
  /** State conflict — already submitted, already used, already expired. */
  | "conflict"
  /** Throttled. Carries `retryAfterSec`. */
  | "rate_limited"
  /** Body over the accepted size. */
  | "payload_too_large"
  /** A dependency (AI scorer, S3, mail) is down. The request may be retried. */
  | "service_unavailable"
  /** Anything we did not anticipate. Never carries internal detail. */
  | "server_error";

/** HTTP status for each code — one place, so no route invents its own mapping. */
export const STATUS_FOR: Record<ApiErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  plan_required: 402, // Payment Required: the one status that fits exactly
  validation_failed: 422,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  payload_too_large: 413,
  service_unavailable: 503,
  server_error: 500,
};

export type ApiErrorBody = {
  code: ApiErrorCode;
  /** Safe to show a user as-is. Never contains internals or a stack. */
  message: string;
  /** Per-field messages, keyed as the request body keys. Validation only. */
  fields?: Record<string, string[]>;
  /** Seconds to wait. Rate limits only; mirrors the `Retry-After` header. */
  retryAfterSec?: number;
  /** What the plan gate said: which tier, why, how much of the quota is used. */
  plan?: PlanBlock;
};

/**
 * Throw this from anywhere inside a route handler; `apiRoute` turns it into the
 * response. Handlers stay linear — a guard failing is a `throw`, not a return
 * value every caller has to remember to check and forward.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly fields?: Record<string, string[]>;
  readonly retryAfterSec?: number;
  readonly plan?: PlanBlock;

  constructor(code: ApiErrorCode, message: string, extra?: Omit<ApiErrorBody, "code" | "message">) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.fields = extra?.fields;
    this.retryAfterSec = extra?.retryAfterSec;
    this.plan = extra?.plan;
  }

  get status(): number {
    return STATUS_FOR[this.code];
  }

  toBody(): ApiErrorBody {
    return {
      code: this.code,
      message: this.message,
      ...(this.fields ? { fields: this.fields } : {}),
      ...(this.retryAfterSec !== undefined ? { retryAfterSec: this.retryAfterSec } : {}),
      ...(this.plan ? { plan: this.plan } : {}),
    };
  }
}

/* ------------------------------------------------------------------ *
 * Constructors for the failures that happen constantly.
 * ------------------------------------------------------------------ */

export const unauthenticated = (message = "Please sign in to continue.") =>
  new ApiError("unauthenticated", message);

export const forbidden = (message = "You don't have access to this.") =>
  new ApiError("forbidden", message);

/**
 * Not found.
 *
 * ALSO what to throw when a row exists but belongs to somebody else. `forbidden`
 * on another user's attempt id would confirm that the id is real, which is an
 * enumeration oracle over every attempt in the database. "Not found" is both
 * true from this user's point of view and silent.
 */
export const notFound = (message = "Not found.") => new ApiError("not_found", message);

export const conflict = (message: string) => new ApiError("conflict", message);

export const invalid = (message: string, fields?: Record<string, string[]>) =>
  new ApiError("validation_failed", message, { fields });

export const rateLimited = (retryAfterSec: number, message: string) =>
  new ApiError("rate_limited", message, { retryAfterSec });

/** Turn a plan gate's refusal into the response that drives the app's paywall. */
export const planRequired = (block: PlanBlock) =>
  new ApiError("plan_required", block.message, { plan: block });

/**
 * A dependency is briefly down, or a queue is full. The request may be retried
 * UNCHANGED — which is the whole distinction from a 4xx, and why the optional
 * `retryAfterSec` matters: it becomes a real `Retry-After` header, so an HTTP
 * client backs off on its own instead of discarding work that would have
 * succeeded a moment later.
 */
export const unavailable = (
  message = "That service is briefly unavailable. Please try again.",
  retryAfterSec?: number,
) => new ApiError("service_unavailable", message, retryAfterSec ? { retryAfterSec } : undefined);
