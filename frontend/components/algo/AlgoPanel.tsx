"use client";
import { useEffect, useMemo } from "react";
import { Activity, Zap } from "lucide-react";
import { useAlgoTradingStore } from "@/store/algoTradingStore";
import { STRATEGY_LABELS } from "@/store/algoTradingStore";
import { usePortfolioStore } from "@/lib/store/portfolio";
import { LivePriceChart } from "@/components/algo-trading/LivePriceChart";
import { OrderBook } from "@/components/algo-trading/OrderBook";
import { PnLDashboard } from "@/components/algo-trading/PnLDashboard";
import { StrategyControlPanel } from "@/components/algo-trading/StrategyControlPanel";
import { WatchlistPanel } from "@/components/algo-trading/WatchlistPanel";
import { IndicatorsPanel } from "@/components/algo-trading/IndicatorsPanel";
import { ChartStrategyBar } from "@/components/algo-trading/ChartStrategyBar";
import { AlgoRightTabs } from "@/components/algo-trading/AlgoRightTabs";
import { AlgoHeaderStats } from "@/components/algo-trading/AlgoHeaderStats";
import { LivePriceProvider, useLivePricesOptional } from "@/components/algo-trading/LivePriceProvider";
import { getSymbolConfig } from "@/types/algoTrading";
import styles from "./algo-trading.module.css";

const STATUS_LABEL: Record<string, string> = {
  idle: "IDLE",
  running: "RUNNING",
  paused: "PAUSED",
  stopped: "STOPPED",
};

export default function AlgoTradingPage() {
  const { symbol, engineStatus, priceHistory, signals, currentPrice, latencyMs, tickPrice } =
    useAlgoTradingStore();
  const positions = usePortfolioStore((s) => s.positions);

  const cfg = getSymbolConfig(symbol);

  const watchSymbols = useMemo(() => {
    const set = new Set<string>([cfg.portfolioSymbol]);
    Object.keys(positions).forEach((s) => {
      if (positions[s].qty > 0.000001) set.add(s);
    });
    return Array.from(set);
  }, [cfg.portfolioSymbol, positions]);

  return (
    <LivePriceProvider symbols={watchSymbols} options={{ persist: true, intervalMs: 10_000 }}>
      <AlgoTradingContent
        symbol={symbol}
        engineStatus={engineStatus}
        priceHistory={priceHistory}
        signals={signals}
        currentPrice={currentPrice}
        latencyMs={latencyMs}
        tickPrice={tickPrice}
        cfg={cfg}
      />
    </LivePriceProvider>
  );
}

function AlgoTradingContent({
  symbol,
  engineStatus,
  priceHistory,
  signals,
  currentPrice,
  latencyMs,
  tickPrice,
  cfg,
}: {
  symbol: ReturnType<typeof useAlgoTradingStore.getState>["symbol"];
  engineStatus: ReturnType<typeof useAlgoTradingStore.getState>["engineStatus"];
  priceHistory: ReturnType<typeof useAlgoTradingStore.getState>["priceHistory"];
  signals: ReturnType<typeof useAlgoTradingStore.getState>["signals"];
  currentPrice: number;
  latencyMs: number;
  tickPrice: () => void;
  cfg: ReturnType<typeof getSymbolConfig>;
}) {
  const { activeStrategy } = useAlgoTradingStore();
  const livePos = usePortfolioStore((s) => s.positions[cfg.portfolioSymbol]);
  const liveFeed = useLivePricesOptional();

  useEffect(() => {
    if (engineStatus !== "running") return;
    const id = setInterval(() => tickPrice(), 800);
    return () => clearInterval(id);
  }, [engineStatus, tickPrice]);

  const liveMkt = liveFeed?.livePrices[cfg.portfolioSymbol] ?? livePos?.currentPrice;
  const displayPrice = liveMkt ?? currentPrice;
  const priceFmt =
    cfg.assetClass === "forex"
      ? displayPrice.toFixed(4)
      : displayPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const statusClass =
    engineStatus === "running"
      ? styles.statusRunning
      : engineStatus === "paused"
        ? styles.statusPaused
        : engineStatus === "stopped"
          ? styles.statusStopped
          : styles.statusIdle;

  return (
    <div className={`page ${styles.root}`}>
      <header className={`card ${styles.header}`}>
        <div className={styles.headerLeft}>
          <Activity size={20} className={styles.headerIcon} />
          <div>
            <p className={styles.eyebrow}>QuantDesk · Algo Desk</p>
            <h1 className={styles.headerTitle}>Algorithmic Trading</h1>
            <p className={styles.headerSub}>
              {cfg.name} · {activeStrategy ? STRATEGY_LABELS[activeStrategy] : "Select strategy"}
            </p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <span className="badge badge-accent">Live Sim</span>
          {liveMkt != null && (
            <span className="badge badge-up" title={liveFeed?.lastUpdated?.toLocaleTimeString() ?? ""}>
              LIVE MKT
            </span>
          )}
          <span className={`badge ${statusClass}`}>
            {STATUS_LABEL[engineStatus] ?? engineStatus.toUpperCase()}
          </span>
          <span className={styles.latency}>
            <Zap size={12} />
            {latencyMs}ms
          </span>
          <span className={styles.midPrice}>${priceFmt}</span>
        </div>
      </header>

      <AlgoHeaderStats />

      <div className={styles.chartWide}>
        <ChartStrategyBar />
        <LivePriceChart
          symbol={symbol}
          interval="1m"
          candles={priceHistory}
          strategySignals={signals}
        />
      </div>

      <div className={styles.grid}>
        <aside className={styles.colLeft}>
          <WatchlistPanel />
          <IndicatorsPanel />
          <StrategyControlPanel />
        </aside>

        <main className={styles.colCenter}>
          <OrderBook symbol={symbol} midPrice={displayPrice} />
        </main>

        <aside className={styles.colRight}>
          <AlgoRightTabs />
          <PnLDashboard />
        </aside>
      </div>
    </div>
  );
}
