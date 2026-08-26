import "server-only";

import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env, isS3Configured } from "@/lib/env";

/**
 * Speaking-audio storage.
 *
 * Recordings are kept so a candidate can play their answer back in review and
 * so an answer can be re-scored later without asking them to speak again — the
 * band alone would make review meaningless.
 *
 * Config is env-only (bucket/region/prefix have no code defaults), so a
 * misconfigured deploy fails loudly here instead of writing somewhere unexpected.
 */

let cached: S3Client | null = null;

function client(): S3Client {
  if (cached) return cached;
  cached = new S3Client({
    region: env.AWS_REGION!,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
    },
  });
  return cached;
}

export type UploadResult = { ok: true; key: string; url: string } | { ok: false; reason: string };

/**
 * Store one recording. `ext` and `contentType` must match the bytes.
 *
 * Callers pass audio ALREADY normalised to WAV 16 kHz mono — see
 * storeSpeakingRecording. The scoring path verifies the format before reusing
 * the stored bytes, so anything else merely costs a re-encode rather than
 * producing a wrong score.
 */
export async function uploadSpeakingAudio(
  audio: Buffer | Uint8Array,
  opts: { userId: string; ext: string; contentType: string },
): Promise<UploadResult> {
  if (!isS3Configured()) return { ok: false, reason: "s3_not_configured" };

  const prefix = env.S3_FOLDER_PREFIX ?? "";
  // Partition by user so one person's audio is easy to find, audit, or purge.
  const key = `${prefix}${opts.userId}/${randomUUID()}.${opts.ext}`;

  try {
    await client().send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET_NAME!,
        Key: key,
        Body: Buffer.from(audio),
        ContentType: opts.contentType,
      }),
    );
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "upload failed" };
  }

  // Not a public URL — the bucket stays private; playback goes through a signed
  // read. Stored as the canonical object location.
  return {
    ok: true,
    key,
    url: `s3://${env.S3_BUCKET_NAME}/${key}`,
  };
}

/** Fetch a stored recording back (for scoring or re-scoring). */
export async function downloadSpeakingAudio(key: string): Promise<Buffer | null> {
  if (!isS3Configured()) return null;
  try {
    const res = await client().send(
      new GetObjectCommand({ Bucket: env.S3_BUCKET_NAME!, Key: key }),
    );
    const bytes = await res.Body?.transformToByteArray();
    return bytes ? Buffer.from(bytes) : null;
  } catch {
    return null;
  }
}

/** Extract the object key from an `s3://bucket/key` URL we stored. */
export function keyFromUrl(url: string): string | null {
  const m = /^s3:\/\/[^/]+\/(.+)$/.exec(url);
  return m ? m[1] : null;
}

/** One object's bytes, ready to be handed straight to a Response. */
export type ObjectStream = {
  body: ReadableStream<Uint8Array>;
  contentType: string | null;
  /** Bytes in THIS response — the range's length, not the object's. */
  contentLength: number | null;
  /** Present only on a partial read: `bytes 0-1023/98765`. */
  contentRange: string | null;
};

/**
 * Read an object as a stream, honouring an HTTP Range header verbatim.
 *
 * This is what lets a route proxy media instead of redirecting to a presigned
 * URL — see src/lib/protected-media.ts for why listening audio must not be
 * redirected. Range is passed through untouched so `<audio>` can seek and
 * `preload="metadata"` can read a header without pulling the whole file, and
 * nothing is buffered in memory: S3's stream becomes the response body.
 */
export async function getObjectStream(
  key: string,
  range?: string | null,
): Promise<ObjectStream | null> {
  if (!isS3Configured()) return null;
  try {
    const res = await client().send(
      new GetObjectCommand({
        Bucket: env.S3_BUCKET_NAME!,
        Key: key,
        Range: range ?? undefined,
      }),
    );
    if (!res.Body) return null;
    return {
      body: Readable.toWeb(res.Body as Readable) as ReadableStream<Uint8Array>,
      contentType: res.ContentType ?? null,
      contentLength: typeof res.ContentLength === "number" ? res.ContentLength : null,
      contentRange: res.ContentRange ?? null,
    };
  } catch {
    // Includes an unsatisfiable range, which the caller turns into a 404 rather
    // than a 500: a bad Range is a client problem, not a server fault.
    return null;
  }
}

/**
 * Short-lived presigned GET URL for an object in our bucket. Pure local HMAC
 * signing (no network round-trip), so it's cheap to call per request. Returns
 * null if S3 isn't configured.
 *
 * NOT FOR LISTENING AUDIO. A presigned URL works with no session, in any
 * client, for its whole lifetime — hand one to a browser and the recording is a
 * copy-paste away from being downloaded and shared. Exam audio goes through
 * streamProtectedAudio instead; this stays for server-to-server reads (the
 * scorer fetching a recording) and for a candidate's own speaking playback.
 */
export async function presignGetUrl(key: string, expiresSec = 3600): Promise<string | null> {
  if (!isS3Configured()) return null;
  return getSignedUrl(client(), new GetObjectCommand({ Bucket: env.S3_BUCKET_NAME!, Key: key }), {
    expiresIn: expiresSec,
  });
}
