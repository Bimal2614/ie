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
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
    ],
  };
}
