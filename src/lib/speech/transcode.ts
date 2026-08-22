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
 * Run once on the way IN, on every recording (see storeSpeakingRecording). The
 * scoring service would accept the browser's WebM/Opus as-is, so this is not
 * about what it takes: normalising on upload means the bytes in the bucket are
 * exactly the bytes that were scored and exactly what review plays back, in one
 * predictable format regardless of which browser produced them.
 *
 * TWO HARD-WON DETAILS, both of which produce audio that looks fine and decodes
 * to silence or a fragment:
 *
 * 1. We transcode through TEMP FILES, not stdio pipes. A WAV header must state
 *    its data size, and ffmpeg can only backfill that by seeking — impossible on
 *    a pipe, where it writes a 0xFFFFFFFF placeholder instead. The bytes look
 *    fine and the header parses, but a decoder reads it as empty audio.
 *
 * 2. We use `ffmpeg-static` (a current build), NOT `@ffmpeg-installer/ffmpeg`,
 *    which ships a 2018 binary. That old build reads a fragmented MP4
 *    (`ftyp iso5` — what phones and browsers emit) as 0.98s instead of 18.3s,
 *    truncating the answer to its first fragment.
 */

const FFMPEG_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_BYTES = 64 * 1024 * 1024;

export type TranscodeResult = { ok: true; wav: Buffer } | { ok: false; reason: string };

/** Bytes per second of WAV 16 kHz mono 16-bit — the format we normalise to. */
export const WAV_16K_MONO_BYTES_PER_SEC = 16000 * 2;
/** Canonical WAV header size, excluded when deriving a duration from the size. */
export const WAV_HEADER_BYTES = 44;

/**
 * Is this ALREADY exactly WAV 16 kHz mono 16-bit PCM?
 *
 * Lets a caller skip a re-encode for audio that is already in the target format.
 * It reads the `fmt ` chunk rather than trusting the RIFF magic, because "looks
 * like a WAV" is not the same claim: a 44.1 kHz stereo file passes the magic
 * check and would sail through as if it were normalised.
 *
 * Chunks are walked rather than read at fixed offsets: `fmt ` is conventionally
 * at byte 12, but a writer may emit a `LIST`/`JUNK` chunk ahead of it.
 */
export function isWav16kMono(input: Buffer | Uint8Array): boolean {
  if (input.byteLength < WAV_HEADER_BYTES) return false;
  // "RIFF" .... "WAVE" — read numerically, so this costs nothing on a big buffer.
  const magic =
    input[0] === 0x52 && input[1] === 0x49 && input[2] === 0x46 && input[3] === 0x46 &&
    input[8] === 0x57 && input[9] === 0x41 && input[10] === 0x56 && input[11] === 0x45;
  if (!magic) return false;

  const view = new DataView(
    input.buffer as ArrayBuffer,
    input.byteOffset ?? 0,
    input.byteLength,
  );

  // Walk the chunk list looking for `fmt `.
  let at = 12;
  while (at + 8 <= input.byteLength) {
    const id = String.fromCharCode(input[at], input[at + 1], input[at + 2], input[at + 3]);
    const size = view.getUint32(at + 4, true);
    if (id === "fmt ") {
      if (at + 8 + 16 > input.byteLength) return false;
      const audioFormat = view.getUint16(at + 8, true);
      const channels = view.getUint16(at + 10, true);
      const sampleRate = view.getUint32(at + 12, true);
      const bitsPerSample = view.getUint16(at + 22, true);
      return audioFormat === 1 && channels === 1 && sampleRate === 16000 && bitsPerSample === 16;
    }
    // Chunks are word-aligned: an odd size carries a trailing pad byte.
    at += 8 + size + (size % 2);
  }
  return false;
}

/** Seconds of audio in a 16 kHz mono 16-bit WAV, derived from its size. */
export function wavDurationSeconds(input: Buffer | Uint8Array): number {
  return Math.max(0, input.byteLength - WAV_HEADER_BYTES) / WAV_16K_MONO_BYTES_PER_SEC;
}

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
