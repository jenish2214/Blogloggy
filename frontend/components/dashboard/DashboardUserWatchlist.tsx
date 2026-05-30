"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { marketApi, type Quote } from "@/lib/api";
import { LoadingIndicator } from "@/components/shared/LoadingIndicator";
import styles from "@/components/trading/LiveMarketWatch.module.css";

const FALLBACK_SYMBOLS = ["SPY"];

function fmtPrice(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: n < 1 ? 4 : 2,
    maximumFractionDigits: n < 1 ? 4 : 2,
  });
}

/** Market watch scoped to the signed-in user's watchlist (not a global ticker list). */
export function DashboardUserWatchlist() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/watchlist", { credentials: "same-origin" });
        if (!res.ok) {
          if (!alive) return;
          setSymbols(FALLBACK_SYMBOLS);
          return;
        }
        const json = (await res.json()) as { items?: Array<{ symbol: string }> };
        const syms = (json.items ?? []).map((i) => i.symbol).filter(Boolean);
        if (!alive) return;
        setSymbols(syms.length > 0 ? syms.slice(0, 12) : FALLBACK_SYMBOLS);
      } catch {
        if (alive) setSymbols(FALLBACK_SYMBOLS);
      }
    };

    void load();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (symbols.length === 0) return;
    let alive = true;

    const loadQuotes = async () => {
      try {
        const { quotes: q } = await marketApi.getQuotes(symbols);
        if (!alive) return;
        setQuotes(q.filter((qt) => qt.price != null && !qt.error));
      } catch {
        /* keep last */
      } finally {
        if (alive) setLoading(false);
      }
    };

    void loadQuotes();
    const id = setInterval(loadQuotes, 15_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [symbols]);

  if (loading && quotes.length === 0) {
    return (
      <div style={{ padding: 24, display: "flex", justifyContent: "center" }}>
        <LoadingIndicator label="Loading your watchlist…" size="sm" />
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <p style={{ padding: 16, fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
        No symbols on your watchlist.{" "}
        <Link href="/markets">Add symbols in Markets</Link>
      </p>
    );
  }

  return (
    <div className={styles.priceGrid}>
      {quotes.map((q) => {
        const up = (q.changePct ?? 0) >= 0;
        return (
          <Link
            key={q.symbol}
            href={`/trade?symbol=${encodeURIComponent(q.symbol)}`}
            className={styles.priceCell}
          >
            <div className={styles.symbol}>{q.symbol}</div>
            <div className={styles.price}>${fmtPrice(q.price)}</div>
            <div className={`${styles.change} ${up ? styles.changeUp : styles.changeDown}`}>
              {up ? "+" : ""}
              {q.changePct?.toFixed(2)}%
            </div>
          </Link>
        );
      })}
    </div>
  );
}
