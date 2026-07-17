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
  reactStrictMode: true,
  turbopack: {
    root: projectRoot,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ptelistening.s3.eu-north-1.amazonaws.com" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
      ...(appHost ? { allowedOrigins: [appHost] } : {}),
    },
  },
};

export default nextConfig;
