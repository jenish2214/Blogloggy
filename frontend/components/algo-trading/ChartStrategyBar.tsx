"use client";
import { useAlgoTradingStore, STRATEGY_LABELS } from "@/store/algoTradingStore";
import type { StrategyType } from "@/types/algoTrading";
import styles from "@/app/(platform)/algo-trading/algo-trading.module.css";

const STRATEGIES: StrategyType[] = ["momentum", "meanReversion", "vwap"];

const EXTRA_LABELS: Record<string, string> = {
  pairs: "Pairs",
  breakout: "Breakout",
};

export function ChartStrategyBar() {
  const { activeStrategy, switchStrategy, engineStatus } = useAlgoTradingStore();
  const running = engineStatus === "running";

  return (
    <div className={styles.strategyBar}>
      {STRATEGIES.map((id) => (
        <button
          key={id}
          type="button"
          className={`btn btn-sm ${activeStrategy === id ? "btn-primary" : "btn-ghost"}`}
          onClick={() => switchStrategy(id)}
          disabled={running}
        >
          {STRATEGY_LABELS[id].toUpperCase()}
        </button>
      ))}
      {(["pairs", "breakout"] as const).map((id) => (
        <button key={id} type="button" className="btn btn-sm btn-ghost" disabled title="Coming soon">
          {EXTRA_LABELS[id]}
        </button>
      ))}
    </div>
  );
}
