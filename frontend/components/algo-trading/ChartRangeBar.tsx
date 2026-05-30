"use client";

import { useAlgoTradingStore } from "@/store/algoTradingStore";
import type { AlgoChartInterval, AlgoChartPeriod } from "@/lib/algo/fetchAlgoHistory";
import styles from "@/app/(platform)/algo-trading/algo-trading.module.css";

const RANGES: { period: AlgoChartPeriod; interval: AlgoChartInterval; label: string }[] = [
  { period: "5d", interval: "15m", label: "5D" },
  { period: "1mo", interval: "1d", label: "1M" },
  { period: "3mo", interval: "1d", label: "3M" },
  { period: "6mo", interval: "1d", label: "6M" },
  { period: "1y", interval: "1d", label: "1Y" },
  { period: "2y", interval: "1d", label: "2Y" },
];

export function ChartRangeBar() {
  const chartPeriod = useAlgoTradingStore((s) => s.chartPeriod);
  const chartInterval = useAlgoTradingStore((s) => s.chartInterval);
  const historyLoading = useAlgoTradingStore((s) => s.historyLoading);
  const historyProvider = useAlgoTradingStore((s) => s.historyProvider);
  const historyYahooSymbol = useAlgoTradingStore((s) => s.historyYahooSymbol);
  const setChartRange = useAlgoTradingStore((s) => s.setChartRange);
  const engineStatus = useAlgoTradingStore((s) => s.engineStatus);

  return (
    <div className={styles.chartRangeBar}>
      <div className={styles.chartRangeGroup} role="group" aria-label="Chart time range">
        {RANGES.map(({ period, interval, label }) => {
          const active = chartPeriod === period && chartInterval === interval;
          return (
            <button
              key={label}
              type="button"
              className={`btn btn-sm ${active ? "btn-primary" : "btn-ghost"}`}
              disabled={historyLoading || engineStatus === "running"}
              onClick={() => setChartRange(period, interval)}
            >
              {label}
            </button>
          );
        })}
      </div>
      <span className={styles.chartRangeMeta}>
        {historyLoading
          ? "Loading yfinance…"
          : historyYahooSymbol
            ? `${historyYahooSymbol} · ${chartPeriod} · ${historyProvider ?? "yfinance"}`
            : "yfinance daily data"}
      </span>
    </div>
  );
}
