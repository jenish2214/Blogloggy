"use client";

import { useEffect, useState } from "react";
import { marketApi, type Quote } from "@/lib/api";
import { QUANT_LAB_MARKET_STRIP } from "@/lib/market/popularSymbols";
import { useQuantLabStore } from "@/lib/store/quantLab";
import styles from "./quant-lab.module.css";

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function stripLabel(symbol: string) {
  if (symbol === "GC=F") return "GOLD";
  return symbol.replace("-USD", "");
}

export function QuantLabMarketStrip() {
  const { activeSymbol, setActiveSymbol } = useQuantLabStore();
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { quotes: q } = await marketApi.getQuotes(QUANT_LAB_MARKET_STRIP);
        setQuotes(q.filter((x) => !x.error && x.price != null));
      } catch {
        setQuotes([]);
      }
    };
    void load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  if (quotes.length === 0) return null;

  return (
    <div className={styles.marketStrip}>
      <div className={styles.marketStripScroll}>
        {quotes.map((q) => {
          const up = (q.changePct ?? 0) >= 0;
          const active = q.symbol === activeSymbol;
          return (
            <button
              key={q.symbol}
              type="button"
              className={active ? styles.stripChipActive : styles.stripChip}
              onClick={() => setActiveSymbol(q.symbol)}
              title={q.name}
            >
              <span className={styles.stripSym}>{stripLabel(q.symbol)}</span>
              <span className={styles.stripPrice}>${fmt(q.price)}</span>
              <span className={up ? styles.upText : styles.downText}>
                {up ? "+" : ""}{fmt(q.changePct)}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
