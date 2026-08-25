import type { MetadataRoute } from "next";
import { BRAND, DEFAULT_DESCRIPTION } from "@/lib/seo";

/**
 * Web app manifest. Two jobs:
 *  - lets learners install the practice app to a home screen (a genuine
 *    engagement win on mobile, which is where most IELTS traffic sits);
 *  - gives Google an explicit, machine-readable name/description/icon set for
 *    the brand entity, alongside the Organization JSON-LD on the home page.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IELTSVega: IELTS Practice Online",
    short_name: BRAND,
    description: DEFAULT_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#0A1A2F",
    theme_color: "#0A1A2F",
    orientation: "portrait",
    categories: ["education", "productivity"],
    lang: "en",
    // A .ico alone is not installable — Android needs a 192 and a 512 PNG, and
    // a `maskable` variant so launchers can crop the mark to their own shape
    // (circle, squircle, rounded square) without clipping the star's points.
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/logo-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
