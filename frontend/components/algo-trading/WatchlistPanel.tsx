"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useAlgoTradingStore } from "@/store/algoTradingStore";
import { useLivePricesOptional } from "@/components/algo-trading/LivePriceProvider";
import { algoYahooSymbol } from "@/lib/algo/fetchAlgoHistory";
import { getSymbolConfig } from "@/types/algoTrading";
import type { AlgoSymbol } from "@/types/algoTrading";
import { SYMBOL_GROUPS } from "@/types/algoTrading";
import styles from "@/app/(platform)/algo-trading/algo-trading.module.css";

const ALL_SYMBOLS = SYMBOL_GROUPS.flatMap((g) => g.symbols);

export function WatchlistPanel() {
  const { symbol, setSymbol, engineStatus, currentPrice, priceHistory } = useAlgoTradingStore();
  const liveFeed = useLivePricesOptional();
  const [query, setQuery] = useState("");

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
        <span className="badge badge-accent">yfinance</span>
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
          const live = liveFeed?.livePrices[cfg.portfolioSymbol];
          const lastBar = s === symbol ? priceHistory[priceHistory.length - 1] : undefined;
          const price = live ?? lastBar?.close ?? currentPrice;
          const prev = lastBar
            ? priceHistory[priceHistory.length - 2]?.close ?? lastBar.open
            : price * 0.999;
          const changePct = prev > 0 ? ((price - prev) / prev) * 100 : 0;
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
              <span className={styles.watchSym} title={algoYahooSymbol(s)}>
                {cfg.label}
              </span>
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
