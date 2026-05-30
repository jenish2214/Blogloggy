"use client";
import { memo, useEffect, useMemo, useState } from "react";
import { mulberry32 } from "@/lib/priceDataGenerator";
import styles from "@/app/(platform)/algo-trading/algo-trading.module.css";

export interface OrderBookProps {
  symbol: string;
  midPrice: number;
  compact?: boolean;
}

interface BookLevel {
  price: number;
  qty: number;
  cumulative: number;
  flash?: boolean;
}

function generateBook(midPrice: number, seed: number): { bids: BookLevel[]; asks: BookLevel[] } {
  const rng = mulberry32(seed);
  const spread = midPrice * (0.0002 + rng() * 0.0003);
  const tick = midPrice > 10000 ? 5 : midPrice > 1000 ? 1 : 0.05;

  const bids: BookLevel[] = [];
  const asks: BookLevel[] = [];
  let bidCum = 0;
  let askCum = 0;

  for (let i = 0; i < 10; i++) {
    const bidQty = Math.round(800 + (10 - i) * 400 + rng() * 600);
    bidCum += bidQty;
    bids.push({
      price: midPrice - spread / 2 - i * tick,
      qty: bidQty,
      cumulative: bidCum,
    });

    const askQty = Math.round(800 + (10 - i) * 400 + rng() * 600);
    askCum += askQty;
    asks.push({
      price: midPrice + spread / 2 + i * tick,
      qty: askQty,
      cumulative: askCum,
    });
  }

  return { bids, asks };
}

function fmtPrice(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtQty(n: number) {
  return n.toLocaleString("en-US");
}

function OrderBookInner({ symbol, midPrice, compact = false }: OrderBookProps) {
  const [tick, setTick] = useState(0);
  const [flashKeys, setFlashKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 600);
    return () => clearInterval(id);
  }, []);

  const { bids, asks, spread, spreadPct, maxCum } = useMemo(() => {
    const book = generateBook(midPrice, Math.floor(midPrice * 100) ^ tick);
    const bestBid = book.bids[0]?.price ?? midPrice;
    const bestAsk = book.asks[0]?.price ?? midPrice;
    const spreadVal = bestAsk - bestBid;
    const spreadPctVal = midPrice > 0 ? (spreadVal / midPrice) * 100 : 0;
    const max = Math.max(
      book.bids[book.bids.length - 1]?.cumulative ?? 1,
      book.asks[book.asks.length - 1]?.cumulative ?? 1
    );
    return { ...book, spread: spreadVal, spreadPct: spreadPctVal, maxCum: max };
  }, [midPrice, tick]);

  useEffect(() => {
    const key = `tick-${tick}`;
    setFlashKeys(new Set([key]));
    const t = setTimeout(() => setFlashKeys(new Set()), 200);
    return () => clearTimeout(t);
  }, [tick]);

  return (
    <div className={`card ${styles.panel} ${compact ? styles.orderBookCompact : ""}`}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>Order Book — L2</span>
        <span className={styles.panelMeta}>{symbol}</span>
      </div>
      <div className={styles.spreadBar}>
        Spread: {spread.toFixed(2)} ({spreadPct.toFixed(2)}%)
      </div>
      <div className={styles.orderBookGrid}>
        <table className={styles.bookTable} aria-label={`Order book for ${symbol}`}>
          <thead>
            <tr>
              <th>Bid Qty</th>
              <th>Bid</th>
              <th>Ask</th>
              <th>Ask Qty</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, i) => {
              const bid = bids[i];
              const ask = asks[i];
              const bidFlash = flashKeys.size > 0;
              const askFlash = flashKeys.size > 0;
              return (
                <tr key={i}>
                  <td className={`${styles.bidCell} ${bidFlash ? styles.flash : ""}`}>
                    <div className={styles.depthBarBid} style={{ width: `${(bid.cumulative / maxCum) * 100}%` }} />
                    <span>{fmtQty(bid.qty)}</span>
                  </td>
                  <td className={styles.bidPrice}>{fmtPrice(bid.price)}</td>
                  <td className={styles.askPrice}>{fmtPrice(ask.price)}</td>
                  <td className={`${styles.askCell} ${askFlash ? styles.flash : ""}`}>
                    <div className={styles.depthBarAsk} style={{ width: `${(ask.cumulative / maxCum) * 100}%` }} />
                    <span>{fmtQty(ask.qty)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className={styles.disclaimer}>Simulated Level 2 depth. Not financial advice.</p>
    </div>
  );
}

export const OrderBook = memo(OrderBookInner);
