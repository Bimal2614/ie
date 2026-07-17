"use client";

// Global error boundary. Must render its own <html>/<body> because it replaces
// the root layout when a top-level error occurs. Kept dependency-free so it can
// always render, even when the app shell is broken.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
              background: "#0e7490",
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
