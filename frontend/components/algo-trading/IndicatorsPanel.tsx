"use client";
import { useMemo } from "react";
import { useAlgoTradingStore } from "@/store/algoTradingStore";
import { computeIndicators } from "@/lib/algoIndicators";
import styles from "@/app/algo-trading/algo-trading.module.css";

function IndicatorBadge({ label, value, accent }: { label: string; value: string; accent?: "up" | "down" | "neutral" }) {
  return (
    <div className={styles.indicatorBadge}>
      <span className={styles.indicatorLabel}>{label}</span>
      <span className={accent === "up" ? "up" : accent === "down" ? "down" : ""} style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.78rem" }}>
        {value}
      </span>
    </div>
  );
}

export function IndicatorsPanel() {
  const { priceHistory, symbol } = useAlgoTradingStore();

  const ind = useMemo(() => computeIndicators(priceHistory), [priceHistory]);

  const macdAccent = ind.macd == null ? "neutral" : ind.macd >= 0 ? "up" : "down";

  return (
    <div className={`card ${styles.panel}`}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>Indicators · {symbol}</span>
      </div>
      <div className={styles.indicatorGrid}>
        <IndicatorBadge label="RSI" value={ind.rsi != null ? ind.rsi.toFixed(1) : "—"} accent={ind.rsi != null && ind.rsi < 35 ? "up" : ind.rsi != null && ind.rsi > 65 ? "down" : "neutral"} />
        <IndicatorBadge label="MA20" value={ind.ma20 != null ? `$${ind.ma20.toFixed(2)}` : "—"} />
        <IndicatorBadge label="MA50" value={ind.ma50 != null ? `$${ind.ma50.toFixed(2)}` : "—"} />
        <IndicatorBadge label="Vol" value={ind.volume >= 1e6 ? `${(ind.volume / 1e6).toFixed(2)}M` : `${(ind.volume / 1e3).toFixed(0)}K`} />
        <IndicatorBadge label="MACD" value={ind.macd != null ? ind.macd.toFixed(2) : "—"} accent={macdAccent} />
        <IndicatorBadge label="Chg" value={`${ind.changePct >= 0 ? "+" : ""}${ind.changePct.toFixed(2)}%`} accent={ind.changePct >= 0 ? "up" : "down"} />
      </div>
    </div>
  );
}
