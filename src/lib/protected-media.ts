import "server-only";

import { getObjectStream, keyFromUrl } from "@/lib/speech/s3";

/**
 * Serving exam audio so it can be HEARD but not KEPT.
 *
 * WHY THIS EXISTS. Listening recordings used to be served as a 302 to a
 * presigned S3 URL. That URL is a bearer token: it carries no session, works in
 * any client, and stays valid for its whole lifetime — so one look at the
 * Network panel (or "Copy link address") produced a plain https link that
 * downloads the mp3 and can be pasted into a group chat. The recordings ARE the
 * product; a listening paper whose audio is circulating is a listening paper
 * nobody needs to buy.
 *
 * SO THE BYTES COME THROUGH US. Nothing but our own path ever reaches the
 * browser, and that path is not a file: it only answers a media element on our
 * own origin, carrying that user's session cookie. Copy it anywhere else — the
 * address bar, another browser, a downloader, a friend — and it 404s.
 *
 * THE THREE THINGS THIS ACTUALLY STOPS.
 *  1. A shareable link. There is no URL that works without a live session.
 *  2. Opening the audio as a page. A top-level navigation to this path is
 *     refused, so "open in new tab" and pasting the URL both fail — and with
 *     them the browser's own "save this page" route to the file.
 *  3. A disk copy. `no-store` keeps the response out of the HTTP cache, so it
 *     is not sitting in a cache directory waiting to be recovered.
 *
 * WHAT IT DOES NOT STOP, HONESTLY. A signed-in user can still capture what they
 * can hear: devtools with the right headers replayed, or a recording of their
 * own sound card. Short of DRM (EME/Widevine, which needs packaged content and
 * a licence server) that floor cannot be raised — every browser can play the
 * audio, so every browser can be made to keep it. This closes the casual and
 * semi-technical routes, which is the whole of the realistic threat.
 *
 * THE COST, STATED PLAINLY. We now pay egress for every byte instead of S3
 * streaming straight to the candidate. That is the price of the link not
 * existing, and it is the trade this module was written to make.
 */

/** A top-level navigation asks for a page; a media element never does. */
const HTML_ACCEPT = /^\s*text\/html/i;

/**
 * The most bytes one response will carry.
 *
 * A media element does not download a recording and stop — it fetches ahead,
 * then holds the connection open while it plays out what it has. Proxied, that
 * would mean a request kept alive for the length of a listening module, which
 * is a request that gets cut off by a platform timeout in the middle of an exam.
 * Answering in bounded pieces keeps every response short-lived: the browser
 * simply asks for the next range when it wants more, which is what it already
 * does when it seeks.
 */
const CHUNK_BYTES = 2 * 1024 * 1024;

/**
 * Trim a client's Range down to one chunk.
 *
 * `bytes=0-` (what a player sends when it opens a file) means "the rest of it",
 * so it is answered with the first CHUNK_BYTES and a Content-Range that tells
 * the browser exactly what it got and how long the file really is. Anything
 * more exotic — a suffix range, several ranges at once — is passed through
 * untouched rather than mangled; the store answers those correctly on its own.
 */
function boundedRange(raw: string | null): string | null {
  if (!raw) return null;
  const m = /^bytes=(\d+)-(\d*)$/.exec(raw.trim());
  if (!m) return raw;

  const start = Number(m[1]);
  const asked = m[2] ? Number(m[2]) : null;
  const cap = start + CHUNK_BYTES - 1;
  const end = asked === null ? cap : Math.min(asked, cap);
  return `bytes=${start}-${end}`;
}

/**
 * Is this a media element on our own page, rather than someone opening the URL?
 *
 * Fetch Metadata is the browser telling us, unforgeably from script, what it is
 * about to do with the response: an `<audio>` load is `Sec-Fetch-Dest: audio`,
 * `Sec-Fetch-Site: same-origin`. A pasted URL, an "open in new tab", a "save
 * link as" and a hotlink from another site all differ in at least one of those,
 * so each is refused while normal playback (including the metadata probe and
 * every seek) passes untouched.
 *
 * Browsers too old to send these headers fail OPEN, because failing closed
 * would mean silently refusing to play the exam. They are not left unchecked:
 * the one shape still worth blocking there is a top-level navigation, and that
 * announces itself by asking for HTML.
 */
export function isMediaElementRequest(req: Request): boolean {
  const h = req.headers;
  const dest = h.get("sec-fetch-dest");
  const site = h.get("sec-fetch-site");
  const mode = h.get("sec-fetch-mode");

  if (dest || site || mode) {
    if (dest !== "audio") return false;
    if (site && site !== "same-origin") return false;
    if (mode === "navigate") return false;
    return true;
  }

  return !HTML_ACCEPT.test(h.get("accept") ?? "");
}

/** Last resort when S3 gives us no type of its own. */
const BY_EXTENSION: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/ogg",
  wav: "audio/wav",
  webm: "audio/webm",
  flac: "audio/flac",
};

function audioTypeOf(location: string, fromStore: string | null): string {
  // A store that says `application/octet-stream` is a store that was uploaded
  // without a type; that value would make the browser download rather than play.
  if (fromStore && fromStore !== "application/octet-stream" && fromStore !== "binary/octet-stream") {
    return fromStore;
  }
  const ext = /\.([a-z0-9]+)(?:\?|$)/i.exec(location)?.[1]?.toLowerCase();
  return (ext && BY_EXTENSION[ext]) || "audio/mpeg";
}

/**
 * Every refusal looks the same, and says nothing.
 *
 * Blocked-by-shape, no such row and unreadable object are one response on
 * purpose: a distinguishable "you're not allowed, but it's there" is a hint,
 * and there is nothing here worth hinting at.
 */
function refused(): Response {
  return new Response("Not found", {
    status: 404,
    headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
  });
}

function audioResponse(o: {
  body: ReadableStream<Uint8Array>;
  type: string;
  contentLength: number | null;
  contentRange: string | null;
}): Response {
  const headers = new Headers({
    "Content-Type": o.type,
    // Seeking, and the duration probe that places a resumed tape, both need it.
    "Accept-Ranges": "bytes",
    // No filename to offer, and nothing that reads as an attachment.
    "Content-Disposition": "inline",
    // Never written to disk: not in a shared cache, not in the browser's either,
    // so there is no cached copy to go looking for afterwards.
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  });
  if (o.contentLength !== null) headers.set("Content-Length", String(o.contentLength));
  if (o.contentRange) headers.set("Content-Range", o.contentRange);

  return new Response(o.body, { status: o.contentRange ? 206 : 200, headers });
}

/**
 * Stream one stored recording to a media element, or refuse.
 *
 * `stored` is the value straight off the row: `s3://bucket/key` for our own
 * content, or an http(s) URL for a public sample. Both are proxied — the point
 * is that the client learns no location it could fetch on its own, and a public
 * sample that leaks its host teaches exactly the wrong lesson about where this
 * content lives.
 *
 * The caller has already established WHO is asking (session) and WHETHER the
 * row exists; this decides whether the request is a player and moves bytes.
 */
export async function streamProtectedAudio(req: Request, stored: string): Promise<Response> {
  if (!isMediaElementRequest(req)) return refused();

  const range = boundedRange(req.headers.get("range"));
  const key = keyFromUrl(stored);

  if (key) {
    const obj = await getObjectStream(key, range);
    if (!obj) return refused();
    return audioResponse({
      body: obj.body,
      type: audioTypeOf(key, obj.contentType),
      contentLength: obj.contentLength,
      contentRange: obj.contentRange,
    });
  }

  if (!/^https?:\/\//i.test(stored)) return refused();

  const upstream = await fetch(stored, {
    headers: range ? { Range: range } : undefined,
    cache: "no-store",
  }).catch(() => null);

  if (!upstream?.ok || !upstream.body) return refused();

  const len = upstream.headers.get("content-length");
  return audioResponse({
    body: upstream.body as ReadableStream<Uint8Array>,
    type: audioTypeOf(stored, upstream.headers.get("content-type")),
    contentLength: len ? Number(len) : null,
    contentRange: upstream.headers.get("content-range"),
  });
}
