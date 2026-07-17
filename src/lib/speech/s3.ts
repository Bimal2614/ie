import "server-only";

import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
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

/** Store one recording. `ext` should match the bytes (webm from the browser). */
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
