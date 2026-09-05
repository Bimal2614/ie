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
   * .nft.json for these routes). This is insurance, not a fix for a present bug:
   * the failure it guards against is silent, production-only, and would be found
   * by candidates rather than by a build. Scoped to the routes that actually
   * record rather than "/**", because the binary counts against each function's
   * size limit.
   */
  outputFileTracingIncludes: {
    "/practice/set/[id]": ["./node_modules/ffmpeg-static/**"],
    "/practice/[section]/[type]": ["./node_modules/ffmpeg-static/**"],
    "/section-practice/[id]": ["./node_modules/ffmpeg-static/**"],
    "/mock-test/[id]": ["./node_modules/ffmpeg-static/**"],
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
    serverActions: {
      // A speaking answer is uploaded through a server action, and 2mb sat under
      // the size of a long turn recorded at a higher browser bitrate — those
      // failed with a framework error rather than anything the recorder could
      // explain. 4mb is the most that is worth allowing: the serverless platform
      // refuses a request body over 4.5 MB before the action is reached, so a
      // larger number here would only move the failure, not remove it. Kept in
      // step with MAX_UPLOAD_BYTES in src/app/actions/speaking.ts.
      bodySizeLimit: "4mb",
      ...(appHost ? { allowedOrigins: [appHost] } : {}),
    },
  },
};

export default nextConfig;
