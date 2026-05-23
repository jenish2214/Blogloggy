"use client";

import { useActiveBookStore } from "@/lib/store/activeBook";

/** Shows which user book is active — not firm-wide or all clients mixed. */
export function BookScopeBanner({ compact = false }: { compact?: boolean }) {
  const activeBook = useActiveBookStore((s) => s.activeBook);

  if (!activeBook) {
    return (
      <p
        style={{
          fontSize: compact ? "0.72rem" : "0.8rem",
          color: "var(--text-muted)",
          margin: compact ? "0 0 12px" : "0 0 16px",
        }}
      >
        Select a book in the desk bar to view your data.
      </p>
    );
  }

  const kind = activeBook.accountType === "client" ? "Client book" : "Personal book";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        marginBottom: compact ? 12 : 16,
        padding: compact ? "8px 12px" : "10px 14px",
        background: "var(--bg-surface-2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        fontSize: compact ? "0.78rem" : "0.82rem",
      }}
    >
      <span
        style={{
          fontSize: "0.62rem",
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--text-muted)",
        }}
      >
        Your data only
      </span>
      <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{activeBook.label}</span>
      <span style={{ color: "var(--text-secondary)" }}>· {kind}</span>
      {activeBook.clientCode && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.68rem",
            padding: "2px 8px",
            borderRadius: 4,
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          {activeBook.clientCode}
        </span>
      )}
    </div>
  );
}
