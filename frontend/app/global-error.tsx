"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 48, textAlign: "center" }}>
        <h1 style={{ fontSize: "1.25rem" }}>Application error</h1>
        <p style={{ color: "#666", margin: "12px 0 24px" }}>
          QuantDesk could not load this view. Try refreshing the page.
        </p>
        <button type="button" onClick={() => reset()} style={{ padding: "8px 16px", cursor: "pointer" }}>
          Try again
        </button>
      </body>
    </html>
  );
}
