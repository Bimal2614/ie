import { ImageResponse } from "next/og";
import { logoDataUri } from "@/lib/og-logo";

/**
 * The site-wide social share image (1200×630).
 *
 * Sitting at the app root, this becomes the og:image and twitter:image for EVERY
 * page that does not colocate its own — previously only blog posts had one, so
 * every other link shared as a bare URL with no thumbnail. Blog posts still
 * override this with their per-article version.
 */
export const alt = "IELTSVega: practise IELTS online with AI band scoring";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logo = await logoDataUri();

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
        {/* Wordmark — the real mark when it loaded, a lettermark tile if not. */}
        <div style={{ display: "flex", alignItems: "center", fontSize: 30, fontWeight: 700 }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} width={72} height={72} alt="" style={{ marginRight: 18 }} />
          ) : (
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
              IV
            </div>
          )}
          IELTSVega
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", color: "#4ade80", fontSize: 24, fontWeight: 600, letterSpacing: 2, marginBottom: 20 }}>
            ACADEMIC &amp; GENERAL TRAINING
          </div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700, lineHeight: 1.12, maxWidth: 1000 }}>
            Practise IELTS online with instant AI band scores
          </div>
        </div>

        <div style={{ display: "flex", color: "#93a4bd", fontSize: 26 }}>
          ieltsvega.com · AI Writing &amp; Speaking scores · Full mock tests
        </div>
      </div>
    ),
    { ...size },
  );
}
