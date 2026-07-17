import "server-only";

import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";

/**
 * Transcode arbitrary recorded audio to WAV 16 kHz mono 16-bit.
 *
 * THIS IS NOT OPTIONAL. SpeechSuper accepts wav/mp3/ogg/opus/amr, but browsers
 * record WebM/Opus. Sending the wrong container makes every score come back 0 —
 * silently, with an empty transcript. So we always normalise rather than trust
 * whatever the client produced.
 *
 * TWO HARD-WON DETAILS, both of which cause that same silent zero:
 *
 * 1. We transcode through TEMP FILES, not stdio pipes. A WAV header must state
 *    its data size, and ffmpeg can only backfill that by seeking — impossible on
 *    a pipe, where it writes a 0xFFFFFFFF placeholder instead. The bytes look
 *    fine and the header parses, but SpeechSuper reads it as empty audio and
 *    returns band 0.
 *
 * 2. We use `ffmpeg-static` (a current build), NOT `@ffmpeg-installer/ffmpeg`,
 *    which ships a 2018 binary. That old build reads a fragmented MP4
 *    (`ftyp iso5` — what phones and browsers emit) as 0.98s instead of 18.3s,
 *    truncating the answer to its first fragment and, again, scoring ~0.
 */

const FFMPEG_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_BYTES = 64 * 1024 * 1024;

export type TranscodeResult = { ok: true; wav: Buffer } | { ok: false; reason: string };

export async function toWav16kMono(input: Buffer | Uint8Array): Promise<TranscodeResult> {
  if (!ffmpegPath) return { ok: false, reason: "ffmpeg binary unavailable" };

  const dir = await mkdtemp(join(tmpdir(), "ielts-audio-"));
  const inPath = join(dir, `${randomUUID()}.in`);
  const outPath = join(dir, `${randomUUID()}.wav`);

  try {
    await writeFile(inPath, Buffer.from(input));

    await new Promise<void>((resolve, reject) => {
      execFile(
        ffmpegPath as unknown as string,
        [
          "-hide_banner",
          "-loglevel", "error",
          "-y",
          "-i", inPath,
          "-ar", "16000",
          "-ac", "1",
          "-c:a", "pcm_s16le",
          outPath,
        ],
        { timeout: FFMPEG_TIMEOUT_MS, maxBuffer: MAX_OUTPUT_BYTES },
        (err, _stdout, stderr) => {
          if (err) reject(new Error(String(stderr).trim().slice(0, 300) || err.message));
          else resolve();
        },
      );
    });

    const wav = await readFile(outPath);
    // A header-only WAV (44 bytes) means ffmpeg decoded no audio — treat as a
    // failure rather than shipping silence to the scorer.
    if (wav.length <= 44) return { ok: false, reason: "no audio decoded" };
    return { ok: true, wav };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "transcode failed" };
  } finally {
    // Recordings are personal data — never leave them in the OS temp dir.
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
