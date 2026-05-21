"use client";
import { useEffect, useState } from "react";
import { marketApi, type IndexItem } from "@/lib/api";

export function MarketIndices() {
  const [indices, setIndices] = useState<IndexItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    marketApi.getIndices().then(({ indices: data }) => {
      setIndices(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div
      style={{
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-surface)",
        padding: "12px 24px",
        display: "flex",
        gap: 32,
        overflowX: "auto",
        scrollbarWidth: "none",
      }}
    >
      {loading
        ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="skeleton" style={{ width: 60, height: 10 }} />
              <div className="skeleton" style={{ width: 80, height: 14 }} />
            </div>
          ))
        : indices.filter(Boolean).map((idx) => (
            <div key={idx.symbol} style={{ flexShrink: 0 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
                {idx.name}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.88rem", fontWeight: 500, color: "var(--text-primary)" }}>
                  {idx.price?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.72rem",
                  color: (idx.changePct ?? 0) >= 0 ? "var(--up)" : "var(--down)",
                }}>
                  {(idx.changePct ?? 0) >= 0 ? "+" : ""}{idx.changePct?.toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
    </div>
  );
}
