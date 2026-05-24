"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { marketApi, type Quote } from "@/lib/api";
import styles from "./LiveMarketWatch.module.css";

const WATCH = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "META", "SPY", "QQQ", "BTC-USD", "ETH-USD"];

const REFRESH_MS = 10_000;

function fmtPrice(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: n < 1 ? 4 : 2, maximumFractionDigits: n < 1 ? 4 : 2 });
}

export function LiveMarketWatch() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<Record<string, "up" | "down">>({});
  const prevRef = useRef<Record<string, number>>({});

  useEffect(() => {
    let alive = true;

    let first = true;
    const load = async () => {
      try {
        const { quotes: q } = await marketApi.getQuotes(WATCH, !first);
        first = false;
        if (!alive) return;
        const valid = q.filter((qt) => qt.price != null && !qt.error);
        const nextFlash: Record<string, "up" | "down"> = {};
        for (const qt of valid) {
          const prev = prevRef.current[qt.symbol];
          if (prev != null && qt.price !== prev) {
            nextFlash[qt.symbol] = qt.price > prev ? "up" : "down";
          }
          prevRef.current[qt.symbol] = qt.price;
        }
        setQuotes(valid);
        setLastUpdated(new Date());
        if (Object.keys(nextFlash).length > 0) {
          setFlash(nextFlash);
          setTimeout(() => alive && setFlash({}), 600);
        }
      } catch {
        /* keep last quotes */
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.liveDot} />
          <h2 className={styles.title}>Live Market Prices</h2>
        </div>
        <div className={styles.meta}>
          {lastUpdated && <span>Updated {lastUpdated.toLocaleTimeString()}</span>}
          <span>Every {REFRESH_MS / 1000}s</span>
          <Link href="/markets" className={styles.link}>All markets →</Link>
        </div>
      </div>

      {loading && quotes.length === 0 ? (
        <div className={styles.skeletonGrid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 72, borderRadius: 8 }} />
          ))}
        </div>
      ) : (
        <div className={styles.priceGrid}>
          {quotes.map((q) => {
            const up = (q.changePct ?? 0) >= 0;
            const f = flash[q.symbol];
            return (
              <Link
                key={q.symbol}
                href={`/trade?symbol=${encodeURIComponent(q.symbol)}`}
                className={`${styles.priceCell} ${f === "up" ? styles.priceCellUp : f === "down" ? styles.priceCellDown : ""}`}
              >
                <div className={styles.symbol}>{q.symbol}</div>
                <div className={styles.price}>${fmtPrice(q.price)}</div>
                <div className={`${styles.change} ${up ? styles.changeUp : styles.changeDown}`}>
                  {up ? "+" : ""}{q.change?.toFixed(2)} ({up ? "+" : ""}{q.changePct?.toFixed(2)}%)
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
