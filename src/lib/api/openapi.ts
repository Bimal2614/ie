import "server-only";

/**
 * The OpenAPI description of /api/v1, built from the REAL Zod schemas.
 *
 * WHY GENERATED AND NOT HAND-WRITTEN. The mobile app is Dart, so it cannot
 * import a TypeScript type the way a React Native client would — the contract
 * has to cross the language boundary as a document. The moment that document is
 * maintained by hand it starts drifting from the server, and the drift is
 * invisible until a candidate hits it: a field the app expects and the server
 * stopped sending, a validation rule the app does not know about.
 *
 * So every request body here comes from the SAME schema the route validates
 * with. A rule that is documented is, by construction, a rule that is enforced.
 *
 * It is built inside the app rather than by a standalone script because the
 * schemas reach libphonenumber's metadata, which only resolves under the app's
 * own module resolution. Serving it live has turned out better anyway: the spec
 * cannot describe a server other than the one answering.
 *
 *   npm run api:spec     → snapshot it to public/openapi.json for codegen
 *
 * Then, in the Flutter repo:
 *   dart run build_runner build      (openapi_generator / retrofit)
 *
 * RESPONSES ARE DESCRIBED MORE LOOSELY THAN REQUESTS, deliberately. Request
 * shapes are Zod objects and convert exactly; response shapes are TypeScript
 * return types assembled from database rows, with no runtime value to convert.
 * Rather than hand-maintain a second, lying copy of them, the envelope and the
 * error vocabulary — the parts a client branches on — are described precisely.
 */

import { z } from "zod";

import {
  loginSchema,
  signupSchema,
  profileSchema,
  passwordChangeSchema,
} from "@/lib/validation";
import {
  setPageQuery,
  sourcesQuery,
  booksQuery,
  partsQuery,
  historyQuery,
} from "@/lib/api/query-schemas";

/** Convert a Zod schema to the JSON Schema dialect OpenAPI 3.1 speaks. */
function schemaOf(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { io: "input" }) as Record<string, unknown>;
  // OpenAPI supplies its own dialect; a nested $schema confuses some generators.
  delete json.$schema;
  return json;
}

/** Turn a Zod object into a list of OpenAPI query parameters. */
function queryParams(schema: z.ZodObject): Array<Record<string, unknown>> {
  const json = schemaOf(schema) as {
    properties?: Record<string, Record<string, unknown>>;
    required?: string[];
  };
  const required = new Set(json.required ?? []);

  return Object.entries(json.properties ?? {}).map(([name, propSchema]) => ({
    name,
    in: "query",
    required: required.has(name),
    schema: propSchema,
    description: propSchema.description,
  }));
}

const bearer = [{ bearerAuth: [] }];

/** `{ ok: true, data: <schema> }` — the success half of the envelope. */
function okResponse(description: string, data?: Record<string, unknown>) {
  return {
    description,
    content: {
      "application/json": {
        schema: {
          type: "object",
          required: ["ok", "data"],
          properties: {
            ok: { type: "boolean", enum: [true] },
            data: data ?? { type: "object", additionalProperties: true },
          },
        },
      },
    },
  };
}

const errorRef = { $ref: "#/components/responses/Error" };

function jsonBody(schema: z.ZodType) {
  return {
    required: true,
    content: { "application/json": { schema: schemaOf(schema) } },
  };
}

function attemptIdParam() {
  return {
    name: "attemptId",
    in: "path",
    required: true,
    schema: { type: "string", format: "uuid" },
  };
}

function sessionIdParam() {
  return {
    name: "sessionId",
    in: "path",
    required: true,
    schema: { type: "string", format: "uuid" },
  };
}

export function buildOpenApiSpec() {
  return {
  openapi: "3.1.0",
  info: {
    title: "IELTSVega Mobile API",
    version: "1.0.0",
    description:
      "The JSON API behind the IELTSVega mobile app.\n\n" +
      "**Envelope.** Every response is `{ ok: true, data }` or `{ ok: false, error }`. " +
      "Branch on `ok`, and on `error.code` — not on the HTTP status, which is a " +
      "coarser view of the same thing.\n\n" +
      "**Auth.** `Authorization: Bearer <token>`, from any of the sign-in endpoints. " +
      "Send `X-Client-Platform: ios|android` so sessions are scoped per platform — " +
      "without it the app's session counts as a web one and will evict the " +
      "candidate's browser session.\n\n" +
      "**Scores are never sent by the client.** Answers go up, bands come back.",
  },
  servers: [
    { url: "https://ieltsvega.com", description: "Production" },
    { url: "http://localhost:3000", description: "Local development" },
  ],
  security: bearer,
  tags: [
    { name: "auth", description: "Sign in, sign up, sessions" },
    { name: "account", description: "Profile, plan and allowance" },
    { name: "practice", description: "The practice library and submitting answers" },
    { name: "attempts", description: "Past attempts and AI scoring" },
    { name: "mock", description: "Full timed papers" },
    { name: "billing", description: "Plans and in-app purchase" },
  ],
  paths: {
    "/api/v1/auth/signup": {
      post: {
        tags: ["auth"],
        summary: "Create an account and sign in",
        security: [],
        requestBody: jsonBody(signupSchema),
        responses: {
          "201": okResponse("Account created; session issued.", {
            $ref: "#/components/schemas/AuthResponse",
          }),
          default: errorRef,
        },
      },
    },
    "/api/v1/auth/login": {
      post: {
        tags: ["auth"],
        summary: "Sign in with email and password",
        security: [],
        requestBody: jsonBody(loginSchema),
        responses: {
          "200": okResponse("Signed in.", { $ref: "#/components/schemas/AuthResponse" }),
          default: errorRef,
        },
      },
    },
    "/api/v1/auth/google": {
      post: {
        tags: ["auth"],
        summary: "Sign in with a native Google id_token",
        description:
          "Send the `idToken` from `google_sign_in` — NOT the access token. " +
          "The token's audience must be one of the configured OAuth client ids.",
        security: [],
        requestBody: jsonBody(
          z.object({ idToken: z.string().min(1).max(8192) }),
        ),
        responses: {
          "200": okResponse("Signed in.", { $ref: "#/components/schemas/AuthResponse" }),
          default: errorRef,
        },
      },
    },
    "/api/v1/auth/session": {
      get: {
        tags: ["auth"],
        summary: "Validate the token and refresh the idle window",
        description:
          "Call on cold start and on resume. Also returns anything that changed " +
          "while the app was away — a plan bought on the website, a lapsed " +
          "subscription. A 401 means: clear the keychain and show sign-in.",
        responses: { "200": okResponse("Session is valid."), default: errorRef },
      },
    },
    "/api/v1/auth/logout": {
      post: {
        tags: ["auth"],
        summary: "Revoke this session",
        description:
          "Always succeeds, even with no or an expired token. Only THIS session " +
          "is revoked — the candidate's browser session survives.",
        responses: { "200": okResponse("Signed out."), default: errorRef },
      },
    },
    "/api/v1/me": {
      get: {
        tags: ["account"],
        summary: "Profile, entitlements and allowance",
        responses: { "200": okResponse("The signed-in account."), default: errorRef },
      },
      patch: {
        tags: ["account"],
        summary: "Update the editable profile",
        requestBody: jsonBody(profileSchema),
        responses: { "200": okResponse("Updated."), default: errorRef },
      },
    },
    "/api/v1/me/password": {
      post: {
        tags: ["account"],
        summary: "Change password",
        requestBody: jsonBody(passwordChangeSchema),
        responses: { "200": okResponse("Changed."), default: errorRef },
      },
    },
    "/api/v1/dashboard": {
      get: {
        tags: ["account"],
        summary: "Everything the home screen draws",
        responses: { "200": okResponse("Stats, usage, entitlements and focus."), default: errorRef },
      },
    },
    "/api/v1/history": {
      get: {
        tags: ["attempts"],
        summary: "Recent attempts, newest first",
        parameters: queryParams(historyQuery),
        responses: { "200": okResponse("One row per attempt."), default: errorRef },
      },
    },
    "/api/v1/practice/library": {
      get: {
        tags: ["practice"],
        summary: "Browse the section-wise library",
        description: "Walk it in order: `step=sources` → `step=books` → `step=parts`.",
        parameters: [
          {
            name: "step",
            in: "query",
            required: true,
            schema: { type: "string", enum: ["sources", "books", "parts"] },
          },
          ...queryParams(sourcesQuery),
          ...queryParams(booksQuery).filter((p) => p.name === "source"),
          ...queryParams(partsQuery).filter((p) => p.name === "book" || p.name === "testNumber"),
        ],
        responses: { "200": okResponse("The step's rows."), default: errorRef },
      },
    },
    "/api/v1/practice/sets": {
      get: {
        tags: ["practice"],
        summary: "One full set — passage/recording plus its questions",
        parameters: queryParams(setPageQuery),
        responses: { "200": okResponse("The set."), default: errorRef },
      },
    },
    "/api/v1/practice/submit": {
      post: {
        tags: ["practice"],
        summary: "Grade a set and record the attempt",
        description:
          "Writing and Speaking come back with `band: null`; poll " +
          "`/api/v1/attempts/{attemptId}/score` when `subjective > 0`. " +
          "A 402 carries `error.plan` — render the paywall from it.",
        requestBody: jsonBody(
          z.object({
            setId: z.string().uuid(),
            answers: z.record(z.string(), z.record(z.string(), z.unknown())),
            timeSpentSec: z.number().int().min(0).optional(),
          }),
        ),
        responses: { "200": okResponse("The graded attempt."), default: errorRef },
      },
    },
    "/api/v1/practice/recording": {
      post: {
        tags: ["practice"],
        summary: "Upload one speaking take",
        description:
          "`multipart/form-data`, field `audio`. MUST be 16 kHz mono PCM WAV — " +
          "what Flutter's `record` package produces natively. Returns an audio " +
          "location, never a band.",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["audio"],
                properties: { audio: { type: "string", format: "binary" } },
              },
            },
          },
        },
        responses: { "200": okResponse("Stored."), default: errorRef },
      },
    },
    "/api/v1/attempts/{attemptId}": {
      get: {
        tags: ["attempts"],
        summary: "One attempt in full, for review",
        parameters: [attemptIdParam()],
        responses: { "200": okResponse("The attempt."), default: errorRef },
      },
    },
    "/api/v1/attempts/{attemptId}/score": {
      get: {
        tags: ["attempts"],
        summary: "Has the AI finished marking?",
        description:
          "`status` is one of `not_applicable`, `pending`, `scored`, `unavailable`. " +
          "Poll while `pending`, waiting `retryAfterSec` between tries; give up at " +
          "two minutes with whatever has arrived. `unavailable` will never resolve.",
        parameters: [attemptIdParam()],
        responses: { "200": okResponse("Scoring status and any bands."), default: errorRef },
      },
      post: {
        tags: ["attempts"],
        summary: "Re-queue anything still unscored",
        parameters: [attemptIdParam()],
        responses: { "200": okResponse("Re-queued, or nothing to do."), default: errorRef },
      },
    },
    "/api/v1/mock": {
      get: {
        tags: ["mock"],
        summary: "The catalogue of full papers",
        parameters: [
          { name: "module", in: "query", schema: { type: "string", enum: ["academic", "general"] } },
        ],
        responses: { "200": okResponse("Papers available."), default: errorRef },
      },
      post: {
        tags: ["mock"],
        summary: "Open a sitting, or resume one in progress",
        description: "201 = a new sitting. 200 with `resumed: true` = you already had one open.",
        requestBody: jsonBody(z.object({ mockTestId: z.string().uuid() })),
        responses: {
          "201": okResponse("Sitting opened."),
          "200": okResponse("Existing sitting resumed."),
          default: errorRef,
        },
      },
    },
    "/api/v1/mock/sessions/{sessionId}": {
      get: {
        tags: ["mock"],
        summary: "The sitting, as the player needs it",
        description:
          "The clock is the SERVER's: render the countdown from `endsAt` and " +
          "`remainingSeconds`, never from the device clock.",
        parameters: [sessionIdParam()],
        responses: { "200": okResponse("The sitting."), default: errorRef },
      },
      delete: {
        tags: ["mock"],
        summary: "Abandon the sitting",
        parameters: [sessionIdParam()],
        responses: { "200": okResponse("Abandoned, or nothing to abandon."), default: errorRef },
      },
    },
    "/api/v1/mock/sessions/{sessionId}/progress": {
      put: {
        tags: ["mock"],
        summary: "Autosave the current module",
        description:
          "A draft, not a submission. Call every ~15s and after each answer: a " +
          "phone gets backgrounded and killed, and this is the difference between " +
          "resuming a paper and losing an hour of it. Idempotent.",
        parameters: [sessionIdParam()],
        requestBody: jsonBody(
          z.object({
            answers: z.record(z.string(), z.unknown()),
            timings: z.record(z.string(), z.number().int().min(0)),
          }),
        ),
        responses: { "200": okResponse("Saved."), default: errorRef },
      },
    },
    "/api/v1/mock/sessions/{sessionId}/advance": {
      post: {
        tags: ["mock"],
        summary: "Hand in this module, open the next",
        description:
          "`fromIndex` is a CLAIM and is checked against the server clock. Render " +
          "what comes back; do not assume `fromIndex + 1`.",
        parameters: [sessionIdParam()],
        requestBody: jsonBody(
          z.object({
            fromIndex: z.number().int().min(0),
            answers: z.record(z.string(), z.unknown()),
            timings: z.record(z.string(), z.number().int().min(0)),
          }),
        ),
        responses: { "200": okResponse("The next module, or `done: true`."), default: errorRef },
      },
    },
    "/api/v1/mock/sessions/{sessionId}/finish": {
      post: {
        tags: ["mock"],
        summary: "Hand the whole paper in early",
        parameters: [sessionIdParam()],
        requestBody: jsonBody(
          z.object({
            answers: z.record(z.string(), z.unknown()),
            timings: z.record(z.string(), z.number().int().min(0)).optional(),
          }),
        ),
        responses: { "200": okResponse("Submitted."), default: errorRef },
      },
    },
    "/api/v1/mock/sessions/{sessionId}/result": {
      get: {
        tags: ["mock"],
        summary: "The report for a handed-in paper",
        description:
          "`pending > 0` means Writing/Speaking are still being marked. A null band " +
          "with `pending === 0` means it could not be marked at all — say different " +
          "things for those two.",
        parameters: [sessionIdParam()],
        responses: { "200": okResponse("The report."), default: errorRef },
      },
    },
    "/api/v1/billing/plans": {
      get: {
        tags: ["billing"],
        summary: "What this platform may sell",
        description:
          "`listPrice` is a FALLBACK. Show the store's own price from " +
          "`ProductDetails`/`SKProduct`; store tiers vary by storefront. Gate " +
          "buttons on `purchasable`, and hide them entirely when " +
          "`alreadySubscribed`.",
        responses: { "200": okResponse("Purchasable tiers."), default: errorRef },
      },
    },
    "/api/v1/billing/iap/verify": {
      post: {
        tags: ["billing"],
        summary: "Turn a store purchase into a subscription",
        description:
          "Call after EVERY purchase and on restore-purchases. Do NOT " +
          "finish/acknowledge the transaction with the store until this returns " +
          "ok — an unacknowledged Play purchase is auto-refunded after three days. " +
          "Idempotent.",
        requestBody: jsonBody(
          z.discriminatedUnion("store", [
            z.object({ store: z.literal("apple"), transactionId: z.string() }),
            z.object({ store: z.literal("google"), purchaseToken: z.string() }),
          ]),
        ),
        responses: { "200": okResponse("Entitlement granted or renewed."), default: errorRef },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", description: "A session token." },
    },
    parameters: {},
    schemas: {
      AuthResponse: {
        type: "object",
        required: ["session", "user", "entitlements"],
        properties: {
          session: {
            type: "object",
            required: ["token", "expiresAt", "absoluteExpiresAt"],
            properties: {
              token: {
                type: "string",
                description:
                  "Sent once and never readable again. Store in the platform " +
                  "keychain (flutter_secure_storage), not shared preferences.",
              },
              expiresAt: { type: "string", format: "date-time" },
              absoluteExpiresAt: { type: "string", format: "date-time" },
            },
          },
          user: { type: "object", additionalProperties: true },
          entitlements: { type: "object", additionalProperties: true },
        },
      },
      ApiError: {
        type: "object",
        required: ["code", "message"],
        properties: {
          code: {
            type: "string",
            enum: [
              "unauthenticated",
              "forbidden",
              "plan_required",
              "validation_failed",
              "not_found",
              "conflict",
              "rate_limited",
              "payload_too_large",
              "service_unavailable",
              "server_error",
            ],
          },
          message: { type: "string", description: "Safe to show a user as-is." },
          fields: {
            type: "object",
            additionalProperties: { type: "array", items: { type: "string" } },
            description: "Per-field messages, keyed as the request body. Validation only.",
          },
          retryAfterSec: { type: "number" },
          plan: {
            type: "object",
            additionalProperties: true,
            description: "On `plan_required`: which tier, why, and how much allowance is spent.",
          },
        },
      },
    },
    responses: {
      Error: {
        description: "The failure half of the envelope.",
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["ok", "error"],
              properties: {
                ok: { type: "boolean", enum: [false] },
                error: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
        },
      },
    },
  },
};
}
