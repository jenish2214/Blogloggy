"use client";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useAlgoTradingStore } from "@/store/algoTradingStore";
import { generateOHLCV } from "@/lib/priceDataGenerator";
import type { AlgoSymbol } from "@/types/algoTrading";
import { SYMBOL_GROUPS, getSymbolConfig } from "@/types/algoTrading";
import styles from "@/app/(platform)/algo-trading/algo-trading.module.css";

const ALL_SYMBOLS = SYMBOL_GROUPS.flatMap((g) => g.symbols);

function quoteFor(symbol: AlgoSymbol, tick: number) {
  const candles = generateOHLCV(symbol, 3);
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2] ?? last;
  const changePct = prev.close > 0 ? ((last.close - prev.close) / prev.close) * 100 : 0;
  return { price: last.close, changePct: changePct + (tick % 3) * 0.001 };
}

export function WatchlistPanel() {
  const { symbol, setSymbol, engineStatus } = useAlgoTradingStore();
  const [query, setQuery] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return ALL_SYMBOLS;
    return ALL_SYMBOLS.filter((s) => s.includes(q) || getSymbolConfig(s).label.toUpperCase().includes(q));
  }, [query]);

  const running = engineStatus === "running";

  return (
    <div className={`card ${styles.panel}`}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>Watchlist</span>
        <span className="badge badge-accent">Live Sim</span>
      </div>
      <div className={styles.searchWrap}>
        <Search size={14} className={styles.searchIcon} />
        <input
          className="input"
          placeholder="Search ticker / name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className={styles.watchlist}>
        {filtered.map((s) => {
          const cfg = getSymbolConfig(s);
          const { price, changePct } = quoteFor(s, tick);
          const up = changePct >= 0;
          const isActive = symbol === s;
          const dec = cfg.assetClass === "forex" ? 4 : cfg.basePrice > 1000 ? 0 : 2;
          return (
            <button
              key={s}
              type="button"
              className={`${styles.watchRow} ${isActive ? styles.watchRowActive : ""}`}
              onClick={() => setSymbol(s)}
              disabled={running}
            >
              <span className={styles.watchSym}>{cfg.label}</span>
              <span className={styles.watchPrice}>${price.toFixed(dec)}</span>
              <span className={up ? "up" : "down"} style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>
                {up ? "+" : ""}{changePct.toFixed(2)}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
