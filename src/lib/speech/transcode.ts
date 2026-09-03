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

/**
 * How many ffmpeg processes may run at once IN THIS INSTANCE.
 *
 * MEASURED, not guessed. Transcoding a 120-second long turn (601 KB of 48 kHz
 * Opus, what MediaRecorder produces) on one vCPU, throughput in recordings per
 * second against the number allowed to run together:
 *
 *     concurrency:      1      2      4      8
 *     1 vCPU:        1.81   1.57   1.68   0.90
 *     2 vCPU:        2.16   3.69   3.55   3.41
 *
 * Two readings matter. On one core, running more at once buys NOTHING — the
 * work is CPU-bound, so the core does what the core does — and past four it
 * actively costs, halving throughput to pure context switching. On two cores the
 * optimum is two, and it stays flat after. So the useful setting tracks the
 * number of cores; raising it "for headroom" is how a burst gets slower.
 *
 * WHAT THIS IS NOT PROTECTING. Not the event loop: ffmpeg is a separate process,
 * so the OS timeslices it against Node rather than blocking it, and measured
 * request-handling lag barely moves (p95 ~15-20ms at every concurrency tried).
 * What does move is the WORST case — 21ms idle, 304ms with sixteen running — and
 * the throughput cliff above. This bounds both, and bounds memory besides: each
 * job holds its input and a ~3.8 MB WAV in the heap at once.
 *
 * Per instance is the right scope because the constraint is local CPU: another
 * instance has its own core and should not wait on this one's queue. Serverless
 * concurrency shares an instance between invocations, which is what makes a
 * module-level count meaningful here at all.
 *
 * FFMPEG_CONCURRENCY overrides it — set it to the function's vCPU count if that
 * is ever raised above the default of one.
 */
const MAX_CONCURRENT_FFMPEG = (() => {
  const raw = Number(process.env.FFMPEG_CONCURRENCY);
  // CLAMPED, because the failure is silent and total: `Number(undefined)` and
  // `Number("two")` are both NaN, `running < NaN` is always false, and every
  // recording on the instance would then queue for twenty seconds and be told
  // the server is busy — for a typo. A literal "0" would wedge it permanently.
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 2;
})();

/**
 * The longest a recording will queue for a slot before we give up on it.
 *
 * A candidate who has just stopped recording is watching a spinner, and the
 * recorder holds the answer until this resolves. Past this it is kinder to say
 * "try again" than to keep them waiting behind a queue that a burst has made
 * arbitrarily long — and the ffmpeg run itself can still take FFMPEG_TIMEOUT_MS
 * on top.
 */
const FFMPEG_QUEUE_TIMEOUT_MS = 20_000;

let running = 0;
const waiting: Array<() => void> = [];

/** Take a slot, or wait for one. Resolves false if the wait timed out. */
function acquire(): Promise<boolean> {
  if (running < MAX_CONCURRENT_FFMPEG) {
    running++;
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      // Drop it from the queue so release() cannot hand a slot to a caller that
      // has already been told no.
      const i = waiting.indexOf(grant);
      if (i >= 0) waiting.splice(i, 1);
      resolve(false);
    }, FFMPEG_QUEUE_TIMEOUT_MS);

    function grant() {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      running++;
      resolve(true);
    }
    waiting.push(grant);
  });
}

function release(): void {
  running--;
  // FIFO: the recording that has been waiting longest goes next, so a burst
  // degrades into a queue rather than into starvation.
  const next = waiting.shift();
  if (next) next();
}

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

  // ALREADY THE TARGET FORMAT — nothing to do. Some clients record straight to
  // 16 kHz mono PCM, and re-encoding those is a process spawn and a core's worth
  // of work to produce the bytes we were handed. This is the check the format
  // predicate above was written for; it reads the `fmt ` chunk rather than
  // trusting the RIFF magic, so a 44.1 kHz stereo file does not sail through.
  if (isWav16kMono(input)) {
    const wav = Buffer.from(input);
    if (wav.length <= WAV_HEADER_BYTES) return { ok: false, reason: "no audio decoded" };
    return { ok: true, wav };
  }

  // One core, many recordings: wait for a slot rather than piling processes onto
  // it. See MAX_CONCURRENT_FFMPEG.
  if (!(await acquire())) {
    return { ok: false, reason: "busy: too many recordings being processed" };
  }

  // EVERYTHING AFTER THE SLOT IS TAKEN GOES IN THE TRY. `mkdtemp` used to sit
  // outside it, which meant a full or read-only temp filesystem threw before the
  // finally existed and the slot was never given back. Two of those and the
  // instance's queue is permanently one lane narrower; MAX_CONCURRENT_FFMPEG of
  // them and every later recording waits out the timeout and is told the server
  // is busy, for as long as the instance lives.
  let dir: string | undefined;

  try {
    dir = await mkdtemp(join(tmpdir(), "ielts-audio-"));
    const inPath = join(dir, `${randomUUID()}.in`);
    const outPath = join(dir, `${randomUUID()}.wav`);

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
    // `dir` is undefined when mkdtemp itself failed; there is nothing to remove.
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {});
    // Always, on every path: a leaked slot is a lane that never opens again.
    release();
  }
}
