import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// Optional explicit allow-list for Server Action origins (defense-in-depth on
// top of Next's built-in same-origin check). Set APP_URL in production.
const appHost = process.env.APP_URL ? new URL(process.env.APP_URL).host : undefined;

// This app lives inside the PTE monorepo, which has its own (React 18)
// node_modules a level up. Pin Turbopack's root to THIS directory so module
// resolution never walks up and pulls a second React into the bundle.
// import.meta.dirname requires Node 21.2+; use fileURLToPath for Node 20 compat.
const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Don't advertise the framework/version.
  poweredByHeader: false,
  /**
   * ffmpeg-static must NOT be bundled.
   *
   * It locates its binary with `path.join(__dirname, "ffmpeg.exe")`. Bundled
   * into a server chunk, `__dirname` becomes the build output directory, so that
   * path points at a file that isn't there and every transcode fails with
   * ENOENT — which surfaced as "that recording couldn't be processed" on a
   * perfectly good recording. Listed here, it stays a runtime `require` from
   * node_modules and `__dirname` still means what the package thinks it means.
   */
  serverExternalPackages: ["ffmpeg-static"],
  /**
   * ...and its BINARY has to reach the deployed function with it.
   *
   * `serverExternalPackages` keeps the require at runtime, which is what fixes
   * `__dirname` — but the thing `__dirname` then points at is an 80 MB
   * executable, not a module anyone imports. A dependency trace follows imports;
   * on a platform that ships only traced files, the package's index.js arriving
   * without its binary means every transcode fails with ENOENT, which the
   * recorder reports as "that recording couldn't be processed" on a perfectly
   * good recording.
   *
   * The tracer currently picks the binary up on its own (verified in the build's
   * .nft.json for this route). This is insurance, not a fix for a present bug:
   * the failure it guards against is silent, production-only, and would be found
   * by candidates rather than by a build.
   *
   * ONE ROUTE, and the list is short for a reason worth keeping. This used to
   * name all four practice players, because the upload was a server action and
   * an action is bundled into every route that renders a component importing it.
   * The binary counts against each function's size, and size is cold-start time:
   * a plain navigation into a READING task — which has no audio and never calls
   * ffmpeg — was measured at 15.9 seconds against ~300 ms warm. Moving the
   * upload to /api/practice/recording put the 80 MB where the work is. Adding a
   * page route back to this list re-creates that.
   */
  outputFileTracingIncludes: {
    "/api/practice/recording": ["./node_modules/ffmpeg-static/**"],
  },
  reactStrictMode: true,
  turbopack: {
    root: projectRoot,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ptelistening.s3.eu-north-1.amazonaws.com" },
      // Real-results headshots — only the `students/` prefix is public (see
      // utility/scripts/upload-student-photos.ts); scoped here too so this
      // allow-list can't be used to proxy-optimize anything else in the bucket.
      { protocol: "https", hostname: "ielts-ace-files.s3.us-east-1.amazonaws.com", pathname: "/students/**" },
    ],
  },
  experimental: {
    /**
     * Let the client router REUSE a page it has already fetched.
     *
     * Next's default for a dynamic route is 0 seconds — nothing is ever reused,
     * so opening a passage and stepping back out re-rendered
     * /practice/reading on the server both ways, re-running the session lookup
     * and the library counts to redraw a card grid that had not changed. Every
     * click cost a full round trip, and with no loading boundary that round
     * trip was time the candidate spent looking at the page they had just left.
     *
     * 30s is the window Next itself shipped as the default until 15, and it is
     * chosen for how the practice pages actually behave: a section page holds
     * nothing user-specific, and the one thing that does go stale — the ticks
     * marking sets already attempted — is retired the moment it changes, by the
     * revalidatePath calls in submitPractice. `static` is the ceiling for the
     * pages prefetched with `prefetch`, whose content is the same for everyone.
     */
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
    serverActions: {
      // KEPT AT 4mb THOUGH NOTHING NEEDS IT ANY MORE, deliberately.
      //
      // This was raised for the speaking upload, which was a server action: 2mb
      // sat under a long turn recorded at a higher browser bitrate, and those
      // failed with a framework error rather than anything the recorder could
      // explain. That upload is a route handler now (/api/practice/recording,
      // where the ceiling is MAX_UPLOAD_BYTES) and `bodySizeLimit` does not
      // apply to route handlers, so the largest thing left going through an
      // action is a set of answers — capped at 256 KB by MAX_ANSWER_BYTES in
      // src/app/actions/practice.ts, comfortably inside even the 1mb default.
      //
      // Lowering it is therefore safe-looking and is still a separate change
      // from this one: it would tighten a bound that nothing is currently
      // pushing against, and if some action does send more than the default the
      // failure is a framework error in production rather than a build error
      // here. Not worth bundling into a performance fix.
      bodySizeLimit: "4mb",
      ...(appHost ? { allowedOrigins: [appHost] } : {}),
    },
  },
};

export default nextConfig;
