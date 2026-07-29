import { ImageResponse } from "next/og";
import { POST_BY_SLUG } from "@/lib/blog";

/**
 * Per-post social share image (1200×630). Colocating this file auto-populates
 * og:image and twitter:image for each article — so links show a branded
 * thumbnail on social and in some Google layouts. Generated at request time and
 * cached by Next; no design assets needed.
 */
export const alt = "IELTSAce — IELTS practice article";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = POST_BY_SLUG[slug];
  const title = post?.title ?? "IELTS practice with AI band scoring";
  const category = (post?.category ?? "IELTS").toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background: "linear-gradient(135deg, #0A1A2F 0%, #10294a 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", fontSize: 30, fontWeight: 700 }}>
          <div
            style={{
              display: "flex",
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "#2563eb",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 16,
              fontSize: 26,
            }}
          >
            IA
          </div>
          IELTSAce
        </div>

        {/* Category + title */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", color: "#4ade80", fontSize: 24, fontWeight: 600, letterSpacing: 2, marginBottom: 20 }}>
            {category}
          </div>
          <div style={{ display: "flex", fontSize: 60, fontWeight: 700, lineHeight: 1.15, maxWidth: 1000 }}>
            {title}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", color: "#93a4bd", fontSize: 26 }}>
          ieltsace.com · AI band scoring · Full mock tests
        </div>
      </div>
    ),
    { ...size },
  );
}
