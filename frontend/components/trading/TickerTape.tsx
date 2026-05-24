"use client";
import { useEffect, useState } from "react";
import { marketApi, type Quote } from "@/lib/api";

const DEFAULT_SYMBOLS = ["AAPL", "TSLA", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "SPY", "QQQ", "BTC-USD", "ETH-USD", "BNB-USD"];

const REFRESH_MS = 10_000;

export function TickerTape() {
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    let alive = true;
    let first = true;
    const load = async () => {
      try {
        const { quotes: q } = await marketApi.getQuotes(DEFAULT_SYMBOLS, !first);
        first = false;
        if (!alive) return;
        setQuotes(q.filter((qt) => !qt.error && qt.price != null));
      } catch {
        /* keep scrolling last prices */
      }
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (!quotes.length) return null;

  const items = [...quotes, ...quotes];

  return (
    <div className="ticker-wrap" style={{ height: 32 }}>
      <div className="ticker-inner" style={{ height: 32, alignItems: "center", gap: 0 }}>
        {items.map((q, i) => (
          <div
            key={`${q.symbol}-${i}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "0 20px",
              borderRight: "1px solid var(--border-subtle)",
              height: "100%",
            }}
          >
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "0.04em" }}>
              {q.symbol}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-primary)" }}>
              ${q.price?.toFixed(q.price < 1 ? 4 : 2)}
            </span>
            <span style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.68rem",
              color: (q.changePct ?? 0) >= 0 ? "var(--up)" : "var(--down)",
            }}>
              {(q.changePct ?? 0) >= 0 ? "▲" : "▼"} {Math.abs(q.changePct ?? 0).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
