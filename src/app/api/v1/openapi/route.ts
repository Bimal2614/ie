import { NextResponse } from "next/server";
import { buildOpenApiSpec } from "@/lib/api/openapi";

/**
 * GET /api/v1/openapi — the machine-readable contract for this API.
 *
 * Point the Flutter repo's code generator straight at this URL, or snapshot it
 * with `npm run api:spec` and commit the file. Because it is built from the
 * same Zod schemas the routes validate with, it cannot describe a server other
 * than the one answering — which is the whole reason it is served rather than
 * hand-maintained.
 *
 * PUBLIC, deliberately. It describes the shape of the API, not its contents:
 * every path in it is authenticated, and knowing that `/api/v1/me` exists gets
 * a stranger no further than guessing would. Keeping it behind a session would
 * mean the app's build step needed credentials, which is a worse trade.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(buildOpenApiSpec(), {
    headers: {
      // Short cache: a deploy changes this, and a stale spec generates a client
      // that disagrees with the server in ways nobody thinks to look for.
      "Cache-Control": "public, max-age=60, must-revalidate",
    },
  });
}
