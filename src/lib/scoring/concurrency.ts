import "server-only";

/**
 * Run an async job over a list with a bounded number in flight.
 *
 * Scoring one answer is a ~9s round trip to a third party, so a seven-question
 * Part 1 done sequentially keeps a candidate waiting over a minute for the first
 * band to appear. Run together they all land in roughly the time of the slowest
 * one.
 *
 * Bounded rather than `Promise.all` over everything: a full mock or a long
 * section could otherwise open dozens of simultaneous connections to the scoring
 * API and to S3, which is how you turn a slow page into a rate-limit rejection
 * or an out-of-memory. The cap is the useful middle.
 *
 * Results come back in INPUT ORDER regardless of completion order, so callers
 * can pair them with their rows positionally.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  job: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const width = Math.max(1, Math.min(limit, items.length));
  const out = new Array<R>(items.length);
  let next = 0;

  // `width` workers pulling from a shared cursor: as soon as one job finishes
  // the worker takes the next queued item, so a slow answer never idles a slot
  // the way fixed batching would.
  const workers = Array.from({ length: width }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await job(items[i], i);
    }
  });

  await Promise.all(workers);
  return out;
}
