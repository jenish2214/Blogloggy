"use client";
import { useEffect, useState } from "react";
import { marketApi, type Quote } from "@/lib/api";

const DEFAULT_SYMBOLS = ["AAPL", "TSLA", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "SPY", "QQQ", "BTC-USD", "ETH-USD", "BNB-USD"];

export function TickerTape() {
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { quotes: q } = await marketApi.getQuotes(DEFAULT_SYMBOLS);
        setQuotes(q.filter((qt) => !qt.error && qt.price != null));
      } catch {}
    };
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  if (!quotes.length) return null;

  const items = [...quotes, ...quotes]; // double for seamless loop

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
