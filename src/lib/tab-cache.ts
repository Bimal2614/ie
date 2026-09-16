/**
 * A tab-scoped cache for content that is the same for every candidate.
 *
 * WHY THIS EXISTS, and why it is `sessionStorage` rather than a server cache.
 * Measured from India against production: a request that touches NO database
 * still costs ~280 ms, because the functions run in us-east-1 and the request
 * has to cross an ocean and come back. The database's own contribution to that
 * is ~5 ms. So the only cache that can win here is one that stops the request
 * being made at all — a faster server-side store would be shaving milliseconds
 * off the 5, not off the 280.
 *
 * `sessionStorage`, specifically:
 *   - it is per TAB and dies when the tab closes, which is exactly the "clear
 *     it when the user leaves the browser" behaviour we want, with no eviction
 *     code and nothing left on a shared classroom machine;
 *   - it survives a reload and a trip out to the section page and back, which
 *     an in-memory Map does not — and that round trip is the common flow;
 *   - it is per ORIGIN, so it is never sent anywhere, and it cannot be read by
 *     another site.
 *
 * ONLY USER-INDEPENDENT CONTENT MAY GO IN HERE. A passage and its questions
 * read the same for a free account and a Pro one, so two candidates sharing a
 * browser cannot learn anything from each other's cache. Anything keyed to a
 * person — which sets they have attempted, their plan, their answers — must
 * NOT be stored here, for the same reason `getAttemptedSets` is left out of the
 * server-side count cache in src/lib/content-stats.ts.
 *
 * Answer keys are not a concern and must not become one: `correctAnswer` is its
 * own column and no client projection selects it, so what is cached here is
 * exactly what was already rendered on the page.
 */

/**
 * Bumped when a cached payload's SHAPE changes.
 *
 * A deploy that adds a field to a set would otherwise meet last week's JSON
 * still sitting in a tab someone never closed, and the player would render
 * against a shape that no longer exists. Old versions are swept on first use
 * rather than left to expire with the tab.
 */
const VERSION = "v1";
const PREFIX = `ielts:cache:${VERSION}:`;
const ANY_VERSION = /^ielts:cache:/;
const INDEX_KEY = `${PREFIX}__index`;

/**
 * How many payloads to keep. A reading set is ~7 KB, so 40 is ~300 KB against
 * a ~5 MB budget — room to spare, and small enough that a candidate working
 * through several task types never pushes the quota.
 */
const MAX_ENTRIES = 40;

/** sessionStorage throws outright in some privacy modes — never assume it. */
function store(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Drop anything written by an older payload shape. Runs once per tab. */
let swept = false;
function sweepOldVersions(s: Storage): void {
  if (swept) return;
  swept = true;
  try {
    const stale = Object.keys(s).filter((k) => ANY_VERSION.test(k) && !k.startsWith(PREFIX));
    stale.forEach((k) => s.removeItem(k));
  } catch {
    // A sweep that fails costs a little space, not correctness.
  }
}

function readIndex(s: Storage): string[] {
  try {
    const raw = s.getItem(INDEX_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function writeIndex(s: Storage, keys: string[]): void {
  try {
    s.setItem(INDEX_KEY, JSON.stringify(keys));
  } catch {
    // Non-fatal: the worst case is that eviction forgets what to evict.
  }
}

/**
 * Read a cached payload, or null when there isn't one.
 *
 * Returns null on ANY problem — absent, unparseable, storage unavailable — so
 * every caller's fallback is the same single path: fetch it.
 */
export function readCache<T>(key: string): T | null {
  const s = store();
  if (!s) return null;
  sweepOldVersions(s);
  try {
    const raw = s.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Cache a payload. Silent on failure, by design: a cache that throws is worse
 * than no cache, and every caller already works without it.
 */
export function writeCache(key: string, value: unknown): void {
  const s = store();
  if (!s) return;
  sweepOldVersions(s);

  const full = PREFIX + key;
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    return;
  }

  // Oldest first, so the tail of the list is what gets dropped.
  const index = readIndex(s).filter((k) => k !== full);
  index.push(full);

  const evict = (count: number) => {
    for (const k of index.splice(0, count)) {
      try {
        s.removeItem(k);
      } catch {
        /* ignore */
      }
    }
  };

  if (index.length > MAX_ENTRIES) evict(index.length - MAX_ENTRIES);

  try {
    s.setItem(full, serialized);
  } catch {
    // Over quota. Free half the cache and try once more — if it still fails,
    // this payload simply is not cached, which is not an error worth surfacing.
    evict(Math.ceil(index.length / 2));
    try {
      s.setItem(full, serialized);
    } catch {
      return;
    }
  }

  writeIndex(s, index);
}
