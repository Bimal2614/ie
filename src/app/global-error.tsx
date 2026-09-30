"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Global error boundary. Must render its own <html>/<body> because it replaces
// the root layout when a top-level error occurs. Kept free of app code so it can
// always render, even when the app shell is broken — Sentry is the one import,
// because an error caught here never reaches the browser's global handler.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f7fafc",
          color: "#1a202c",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem", maxWidth: 420 }}>
          {/* Plain <img>, not next/image: this boundary replaces the root layout,
              so it must not depend on the app shell. If the asset 404s the page
              still renders — it just loses the mark. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-128.png"
            alt=""
            width={48}
            height={48}
            style={{ display: "block", margin: "0 auto 1rem" }}
          />
          <h1 style={{ fontSize: "1.5rem", marginBottom: ".5rem" }}>Something went wrong</h1>
          <p style={{ color: "#4a5568", marginBottom: "1.5rem" }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              padding: ".6rem 1.25rem",
              borderRadius: ".5rem",
              border: "none",
              background: "#104094", // the app's --brand token, hsl(218 81% 32%)
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
