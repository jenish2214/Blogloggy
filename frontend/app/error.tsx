"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ padding: "48px 24px", maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
      <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: 20 }}>
        The page hit an unexpected error. Your data in the database is unchanged — try again or return home.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <button type="button" className="btn btn-primary" onClick={() => reset()}>
          Try again
        </button>
        <a href="/" className="btn btn-ghost">
          Home
        </a>
      </div>
    </div>
  );
}
