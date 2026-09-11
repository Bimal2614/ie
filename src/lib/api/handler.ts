import "server-only";

import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { ApiError, invalid, rateLimited } from "@/lib/api/errors";
import { fail } from "@/lib/api/respond";
import { RateLimitError } from "@/lib/security/rate-guard";
import { isProd } from "@/lib/env";

/**
 * Wrap a route handler so every failure leaves as the same JSON shape.
 *
 * WITHOUT THIS, an unhandled throw inside a route handler becomes Next's own
 * HTML error page with a 500 — and a Flutter client decoding that gets a
 * FormatException pointing at `<!DOCTYPE`, which tells whoever is debugging it
 * nothing at all about what actually broke. Handlers can therefore `throw`
 * freely; guards do too, which is what keeps them one line at the top of a
 * handler instead of a returned value every caller must remember to forward.
 */
type Handler<C> = (req: Request, context: C) => Promise<NextResponse> | NextResponse;

export function apiRoute<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (req: Request, context: C) => {
    try {
      return await handler(req, context);
    } catch (error) {
      // Next signals redirect/notFound by throwing. Nothing in this API should
      // do either, but a shared lib reached from here might, and swallowing it
      // as a 500 would hide a real bug behind a generic message.
      if (isNextControlFlow(error)) throw error;

      if (error instanceof ApiError) return fail(error);

      // Thrown by guardGeneral/guardMedia deep inside shared business logic, so
      // it arrives here rather than at a call site that could translate it.
      if (error instanceof RateLimitError) {
        return fail(rateLimited(error.retryAfterSec, error.message));
      }

      // A schema that was validated somewhere other than `readJson`.
      if (error instanceof ZodError) {
        return fail(invalid("Some of that didn't look right.", fieldErrorsOf(error)));
      }

      // Anything unanticipated. The detail goes to the server log, never to the
      // client: an exception message can carry a query, a path, or a key.
      console.error("[api] unhandled error:", error);
      return fail(
        new ApiError(
          "server_error",
          isProd
            ? "Something went wrong on our side. Please try again."
            : `Unhandled: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  };
}

/** `redirect()` and `notFound()` are implemented as throws — never swallow them. */
function isNextControlFlow(error: unknown): boolean {
  const digest = (error as { digest?: unknown })?.digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND");
}

/** Zod's per-field messages, keyed exactly as the request body is. */
export function fieldErrorsOf(error: ZodError): Record<string, string[]> {
  // `flatten()` is generic over the schema's shape, and this helper is called
  // with every schema in the codebase — so the keys are only knowable as
  // strings here. The cast is the narrowing TypeScript cannot do for us.
  const flat = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  const out: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(flat)) {
    if (messages?.length) out[key] = messages;
  }
  return out;
}

/**
 * Default ceiling on a JSON body.
 *
 * Generous for an answer sheet (the practice submit guards its own payload at
 * 256 KB) and far below anything that could pin the event loop parsing it.
 * Audio never comes through here — that is multipart, on its own route, with
 * its own limit.
 */
const MAX_JSON_BYTES = 512 * 1024;

/**
 * Read and validate a JSON body in one step.
 *
 * Reads as text first so the size can be checked BEFORE `JSON.parse` is handed
 * a megabyte of nested arrays. Returns the parsed, typed value or throws the
 * `validation_failed` that the wrapper renders.
 */
export async function readJson<T>(
  req: Request,
  schema: ZodType<T>,
  maxBytes = MAX_JSON_BYTES,
): Promise<T> {
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    throw invalid("Could not read the request body.");
  }

  if (raw.length > maxBytes) {
    throw new ApiError("payload_too_large", "That request is too large.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = raw.length ? JSON.parse(raw) : {};
  } catch {
    throw invalid("The request body is not valid JSON.");
  }

  const result = schema.safeParse(parsedJson);
  if (!result.success) {
    throw invalid("Some of that didn't look right.", fieldErrorsOf(result.error));
  }
  return result.data;
}

/**
 * Read and validate the query string the same way.
 *
 * Everything arrives as a string, so the schemas that feed this use `z.coerce`
 * for numbers — which is why pagination lives in a schema rather than a pile of
 * `Number(searchParams.get(...)) || 20` at the top of each list endpoint.
 */
export function readQuery<T>(req: Request, schema: ZodType<T>): T {
  const params = new URL(req.url).searchParams;
  const raw: Record<string, string> = {};
  for (const [key, value] of params.entries()) raw[key] = value;

  const result = schema.safeParse(raw);
  if (!result.success) {
    throw invalid("Some of those filters didn't look right.", fieldErrorsOf(result.error));
  }
  return result.data;
}
