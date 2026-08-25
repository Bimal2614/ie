import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SITE_URL } from "@/lib/site";

/**
 * The brand mark, as a base64 data URI, for the `next/og` image routes.
 *
 * Satori — the renderer behind ImageResponse — has no page origin, so a plain
 * `/brand/logo-128.png` in an <img> resolves to nothing and the mark silently
 * vanishes from every social preview. The bytes have to be inlined.
 *
 * Two sources, in order, because neither is reliable everywhere:
 *   1. the file on disk — right in dev and on any self-hosted/`next start` box;
 *   2. an HTTP GET against our own origin — the backstop for hosts that serve
 *      `public/` from a CDN and don't ship it inside the function bundle.
 * Read once per warm instance and memoised; a share card is regenerated far
 * more often than the logo changes.
 */

const LOGO_PATH = ["public", "brand", "logo-128.png"];

/** `undefined` = not tried yet; `null` = tried and failed (don't retry-storm). */
let cached: string | null | undefined;

export async function logoDataUri(): Promise<string | null> {
  if (cached !== undefined) return cached;
  const bytes = (await fromDisk()) ?? (await fromOrigin());
  // A card with a lettermark still beats a route that throws and leaves the
  // link with no preview image at all, so failure is null, never an exception.
  cached = bytes ? `data:image/png;base64,${bytes.toString("base64")}` : null;
  return cached;
}

async function fromDisk(): Promise<Buffer | null> {
  try {
    return await readFile(join(process.cwd(), ...LOGO_PATH));
  } catch {
    return null;
  }
}

async function fromOrigin(): Promise<Buffer | null> {
  try {
    const res = await fetch(`${SITE_URL}/brand/logo-128.png`, { cache: "force-cache" });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}
