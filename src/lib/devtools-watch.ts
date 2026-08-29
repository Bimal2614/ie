/**
 * Is DevTools open?
 *
 * WHY THIS EXISTS. The exam papers, the answer keys and the listening audio ARE
 * the product. `src/lib/protected-media.ts` already closes the easy routes to a
 * copy — there is no shareable audio URL, and no page you can "save as". The
 * route it explicitly does not close is the Network panel: a signed-in user with
 * DevTools open can replay their own requests and read every payload we send
 * them. This module is the deterrent for that, and the honest word is
 * *deterrent*, not protection: everything below runs in the visitor's own
 * browser, so a visitor who knows how can switch it off (breakpoints disabled, a
 * userscript, or simply reading the JS chunk without DevTools at all). It stops
 * the casual and the semi-technical look. Nothing client-side stops more.
 *
 * HOW DETECTION WORKS. There is no browser API for "are the tools open" — every
 * technique is a side effect of DevTools doing extra work. The two maintained
 * libraries in this space (theajack/disable-devtool and AEPKILL/devtools-detector)
 * converged on the same short list, and this module implements that list:
 *
 *  1. PERFORMANCE (the one that still works in current Chrome). `console.table`
 *     of a large array builds a full DOM table the moment a console panel
 *     exists; `console.log` of the same array only keeps a reference and renders
 *     lazily. Closed, both are ~free. Open, the table costs orders of magnitude
 *     more. We compare the two on every tick, so we never depend on a fixed
 *     timing threshold tuned to one machine.
 *  2. DEVTOOLS FORMATTERS. `window.devtoolsFormatters` is called by the console
 *     when it renders a value — but only for users who enabled custom
 *     formatters. Cheap, no false positives, catches a subset.
 *  3. ELEMENT-ID GETTER. A getter on `id` fires when the console panel expands a
 *     logged element. Chrome stopped triggering it (it reads objects through the
 *     V8 API now); Safari and Firefox still do, so it is enabled there.
 *  4. DEBUG LIBRARIES. eruda / vConsole — the mobile "DevTools" a phone user
 *     loads as a bookmarklet, which the tricks above cannot see.
 *  5. DEBUGGER TIMING. A `debugger` statement costs nothing when the tools are
 *     shut and pauses execution when they are open. It is the crudest signal and
 *     it freezes the tab, so — as in disable-devtool — it is enabled only on iOS
 *     Chrome/Edge, where the console-timing tricks misbehave.
 *  6. WINDOW SIZE. Docked DevTools eats viewport: `outerWidth - innerWidth`
 *     jumps. Both libraries ship this one OFF by default because browser
 *     sidebars, zoom and OS display scaling produce the same gap, and a false
 *     positive here means a paying candidate's page goes blank mid-exam. Same
 *     call here: opt in via `includeSize`, and detector 1 already sees docked
 *     tools anyway.
 *
 * WHO IS EXEMPT. Crawlers (this app lives on organic search — a blank page
 * served to Googlebot is a de-indexed page), development builds, and anyone
 * holding the bypass token.
 */

export type DetectorName =
  | "performance"
  | "formatters"
  | "element-id"
  | "debug-lib"
  | "debugger"
  | "size"
  /** Not a detector: the dev-only `?ddguard=fire` switch. */
  | "forced";

/** Query param + sessionStorage key carrying the developer bypass token. */
const TOKEN_PARAM = "ddtk";
const TOKEN_KEY = "__ddtk";
/**
 * Development-only test switch, ignored entirely in production builds:
 *   `?ddguard=1`     run the detectors in dev (dev is otherwise exempt)
 *   `?ddguard=fire`  skip detection and trigger straight away, to see what a
 *                    caught visitor sees
 */
const FORCE_PARAM = "ddguard";

const isDevBuild = process.env.NODE_ENV !== "production";

function forceMode(): string | null {
  if (!isDevBuild) return null;
  return new URLSearchParams(window.location.search).get(FORCE_PARAM);
}

const UA = typeof navigator === "undefined" ? "" : navigator.userAgent.toLowerCase();
const has = (needle: string) => UA.includes(needle);

const IS = {
  firefox: has("firefox"),
  iosChrome: has("crios"),
  iosEdge: has("edgios"),
  safari: has("safari") && !has("chrome") && !has("crios") && !has("android"),
  /**
   * Crawlers, link unfurlers and automated auditors. They never open DevTools,
   * and a blank page served to one of them is a page we lose from the index.
   */
  bot:
    /bot|spider|crawl|slurp|lighthouse|headless|pagespeed|preview|facebookexternalhit|embedly|whatsapp|telegram/.test(
      UA,
    ) || (typeof navigator !== "undefined" && navigator.webdriver === true),
};

/* --------------------------------------------------------------------------
 * Console handles, captured once.
 *
 * Detectors 1–3 work by watching what the console does with a value, so they
 * must call the real methods — not whatever a page script (or the visitor's own
 * userscript) has since assigned over them.
 * ------------------------------------------------------------------------ */
const nativeLog = console.log.bind(console);
const nativeTable = console.table.bind(console);
const nativeClear = console.clear.bind(console);

const now = () => performance.now();

function timed(fn: () => void): number {
  const start = now();
  fn();
  return now() - start;
}

/* ---------------------------------- 1. performance ----------------------- */

/**
 * 50 rows × 500 columns, all pointing at one object — big enough that rendering
 * it is unmistakably expensive, small enough to build once and keep.
 */
function createProbe(): Record<string, string>[] {
  const row: Record<string, string> = {};
  for (let i = 0; i < 500; i++) row[String(i)] = String(i);
  return Array.from({ length: 50 }, () => row);
}

const PROBE = createProbe();

/** Slowest `console.log` seen so far — our running estimate of "tools closed". */
let logBaseline = 0;

/** Floor, in ms. Nothing that finishes this fast is building DOM. */
const MIN_TABLE_MS = 2;
const MIN_BASELINE_MS = 0.5;
/** How much slower `table` must be than `log` before we believe it. */
const TABLE_LOG_RATIO = 10;

function detectPerformance(): boolean {
  const tableMs = timed(() => nativeTable(PROBE));
  // Twice, keep the worse: one slow frame (GC, a re-render) should raise the
  // baseline rather than masquerade as an open panel.
  const logMs = Math.max(
    timed(() => nativeLog(PROBE)),
    timed(() => nativeLog(PROBE)),
  );
  logBaseline = Math.max(logBaseline, logMs);
  nativeClear();

  if (tableMs < MIN_TABLE_MS) return false;
  return tableMs > Math.max(logBaseline, MIN_BASELINE_MS) * TABLE_LOG_RATIO;
}

/* ---------------------------------- 2. formatters ------------------------ */

declare global {
  interface Window {
    devtoolsFormatters?: unknown[];
  }
}

let formatterFired = false;
const formatter = {
  header() {
    formatterFired = true;
    return null;
  },
};

function detectFormatters(): boolean {
  const registry = window.devtoolsFormatters;
  if (registry) {
    if (!registry.includes(formatter)) registry.push(formatter);
  } else {
    window.devtoolsFormatters = [formatter];
  }
  formatterFired = false;
  nativeLog({});
  nativeClear();
  return formatterFired;
}

/* ---------------------------------- 3. element id ------------------------ */

let idRead = false;
const probeElement = typeof document === "undefined" ? null : document.createElement("div");
if (probeElement) {
  Object.defineProperty(probeElement, "id", {
    get() {
      idRead = true;
      return "";
    },
    configurable: true,
  });
}

function detectElementId(): boolean {
  if (!probeElement) return false;
  idRead = false;
  nativeLog(probeElement);
  nativeClear();
  return idRead;
}

/* ---------------------------------- 4. debug libraries ------------------- */

function detectDebugLib(): boolean {
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.eruda || w.VConsole || w.vConsole || w.__vConsole__);
}

/* ---------------------------------- 5. debugger -------------------------- */

/** Anything slower than this and something paused us. */
const DEBUGGER_PAUSE_MS = 100;

function detectDebugger(): boolean {
  const start = now();
  (() => {
    debugger;
  })();
  return now() - start > DEBUGGER_PAUSE_MS;
}

/* ---------------------------------- 6. size ------------------------------ */

const SIZE_SLACK_X = 200;
const SIZE_SLACK_Y = 300;

function detectSize(): boolean {
  const ratio = window.devicePixelRatio;
  if (!ratio) return false;
  return (
    window.outerWidth - window.innerWidth * ratio > SIZE_SLACK_X ||
    window.outerHeight - window.innerHeight * ratio > SIZE_SLACK_Y
  );
}

/* --------------------------------------------------------------------------
 * The watcher
 * ------------------------------------------------------------------------ */

type Detector = {
  name: DetectorName;
  enabled: boolean;
  /** Consecutive positive ticks required. Timing signals get a second look. */
  strikes: number;
  detect: () => boolean;
};

function buildDetectors(includeSize: boolean): Detector[] {
  const all: Detector[] = [
    {
      name: "performance",
      enabled: !IS.iosChrome && !IS.iosEdge,
      strikes: 2,
      detect: detectPerformance,
    },
    { name: "formatters", enabled: true, strikes: 1, detect: detectFormatters },
    {
      name: "element-id",
      enabled: IS.safari || IS.firefox,
      strikes: 1,
      detect: detectElementId,
    },
    { name: "debug-lib", enabled: true, strikes: 1, detect: detectDebugLib },
    {
      name: "debugger",
      enabled: IS.iosChrome || IS.iosEdge,
      strikes: 1,
      detect: detectDebugger,
    },
    { name: "size", enabled: includeSize, strikes: 2, detect: detectSize },
  ];
  return all.filter((d) => d.enabled);
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function readSession(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null; // Private mode / storage blocked.
  }
}

/**
 * Ways to be let through.
 *
 * The bypass token lives in the public env var as a SHA-256 digest, never in
 * plaintext, so shipping it in the client bundle does not hand the token out —
 * the same trick disable-devtool plays with its `md5` option. Append
 * `?ddtk=<token>` once and the tab stays exempt for the rest of the session.
 */
async function isExempt(): Promise<boolean> {
  const params = new URLSearchParams(window.location.search);

  if (isDevBuild && forceMode() === null) return true;
  if (IS.bot) return true;

  const expected = process.env.NEXT_PUBLIC_DEVTOOLS_BYPASS_SHA256;
  if (!expected) return false;

  const token = params.get(TOKEN_PARAM) ?? readSession(TOKEN_KEY);
  if (!token) return false;

  try {
    if ((await sha256Hex(token)) !== expected.trim().toLowerCase()) return false;
    window.sessionStorage.setItem(TOKEN_KEY, token);
    return true;
  } catch {
    return false; // No SubtleCrypto (insecure context) → no bypass.
  }
}

export type WatchOptions = {
  /** Fired once, on the first confirmed detection. */
  onOpen: (detector: DetectorName) => void;
  /** Poll period, ms. 500 is what disable-devtool defaults to. */
  interval?: number;
  /** Enable the false-positive-prone window-size heuristic. Off by default. */
  includeSize?: boolean;
};

/**
 * Start watching. Returns an unsubscribe function; `onOpen` fires at most once.
 */
export function watchDevtools({
  onOpen,
  interval = 500,
  includeSize = false,
}: WatchOptions): () => void {
  let stopped = false;
  let timer: number | undefined;

  // A backgrounded tab has its timers throttled and its rendering suspended,
  // which makes every timing measurement above meaningless. Sit out until the
  // tab is on screen again.
  let paused = document.hidden;
  const onVisibility = () => {
    paused = document.hidden;
  };
  document.addEventListener("visibilitychange", onVisibility);

  const stop = () => {
    stopped = true;
    if (timer !== undefined) window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisibility);
  };

  const start = () => {
    const detectors = buildDetectors(includeSize);
    const strikes = new Map<DetectorName, number>();

    const tick = () => {
      if (paused) return;
      for (const detector of detectors) {
        let hit = false;
        try {
          hit = detector.detect();
        } catch {
          hit = false; // A broken detector must never take the page down.
        }
        if (!hit) {
          strikes.set(detector.name, 0);
          continue;
        }
        const count = (strikes.get(detector.name) ?? 0) + 1;
        strikes.set(detector.name, count);
        if (count >= detector.strikes) {
          stop();
          onOpen(detector.name);
          return;
        }
      }
    };

    timer = window.setInterval(tick, interval);
    tick(); // Catch tools that were already open when the page loaded.
  };

  if (forceMode() === "fire") {
    queueMicrotask(() => {
      if (stopped) return;
      stop();
      onOpen("forced");
    });
    return stop;
  }

  // Resolving the bypass is async (SubtleCrypto), so detection only starts once
  // we know the visitor is not exempt.
  void isExempt().then((exempt) => {
    if (exempt) stop();
    else if (!stopped) start();
  });

  return stop;
}
