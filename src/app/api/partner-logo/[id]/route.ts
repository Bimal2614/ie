import { eq } from "drizzle-orm";

import { db } from "@/db";
import { partners } from "@/db/schema";
import { getObjectStream } from "@/lib/speech/s3";
import { isUuid } from "@/lib/uuid";

/**
 * A partner's logo, served from our own origin.
 *
 * PUBLIC ON PURPOSE — unlike every other media route, this one has no session
 * check. The logo is drawn on the class's sign-in page, which is seen before
 * anyone signs in, and it is the class's public mark, not content we sell.
 *
 * Streamed through rather than redirected to a presigned URL: the bucket
 * stays private, the CSP's `img-src 'self'` already allows it, and the bytes
 * can be cached by the browser and the CDN. They can be cached FOREVER because
 * the URL carries the object key's uuid as `?v=` (see brandFrom), and every
 * upload writes a new key — a new logo is a new URL.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return new Response(null, { status: 404 });

  const [row] = await db
    .select({ logoKey: partners.logoKey })
    .from(partners)
    .where(eq(partners.id, id))
    .limit(1);
  if (!row?.logoKey) return new Response(null, { status: 404 });

  const object = await getObjectStream(row.logoKey);
  if (!object) return new Response(null, { status: 404 });

  return new Response(object.body, {
    headers: {
      "Content-Type": object.contentType ?? "application/octet-stream",
      ...(object.contentLength !== null ? { "Content-Length": String(object.contentLength) } : {}),
      "Cache-Control": "public, max-age=31536000, immutable",
      // Only ever an image we validated on upload; never let a browser sniff
      // it into something executable.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
