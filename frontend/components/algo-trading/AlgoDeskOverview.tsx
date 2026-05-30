"use client";

import { useMemo } from "react";
import { useAlgoTradingStore, STRATEGY_LABELS } from "@/store/algoTradingStore";
import { usePortfolioStore } from "@/lib/store/portfolio";
import { useLivePricesOptional } from "@/components/algo-trading/LivePriceProvider";
import { getSymbolConfig } from "@/types/algoTrading";
import styles from "./AlgoDeskOverview.module.css";

const STATUS_LABEL: Record<string, string> = {
  idle: "Idle",
  running: "Running",
  paused: "Paused",
  stopped: "Stopped",
};

function fmtUsd(n: number, precise = false) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: precise ? 2 : 0,
  });
}

function fmtSigned(n: number) {
  return `${n >= 0 ? "+" : "−"}${fmtUsd(Math.abs(n), true)}`;
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function AlgoDeskOverview() {
  const liveFeed = useLivePricesOptional();
  const { positions } = usePortfolioStore();
  const {
    symbol,
    activeStrategy,
    engineStatus,
    latencyMs,
    chartPeriod,
    chartInterval,
    historyProvider,
    historyYahooSymbol,
    historyLoading,
    historyError,
    usesYfinanceData,
    priceHistory,
    signals,
    openPosition,
    closedTrades,
    totalPnl,
    winRate,
    sharpeRatio,
    maxDrawdown,
    totalTrades,
    positionSize,
    riskGuard,
    syncToPortfolio,
    lastTradeMessage,
    statusLogs,
    currentPrice,
  } = useAlgoTradingStore();

  const cfg = getSymbolConfig(symbol);
  const liveMark =
    liveFeed?.livePrices[cfg.portfolioSymbol] ??
    positions[cfg.portfolioSymbol]?.currentPrice ??
    currentPrice;

  const lastCandle = priceHistory[priceHistory.length - 1];
  const recentSignals = useMemo(() => signals.slice(-12).reverse(), [signals]);
  const recentStatus = useMemo(() => statusLogs.slice(-6).reverse(), [statusLogs]);

  const openAlgoPnl =
    openPosition && liveMark != null
      ? (liveMark - openPosition.entryPrice) * openPosition.size
      : null;

  const sessionWins = closedTrades.filter((t) => t.status === "WIN").length;

  return (
    <section className={styles.wrap} aria-label="Algo desk overview">
      <div className={styles.topRow}>
        <div className={styles.symbolBlock}>
          <span className={styles.symbolTag}>{symbol}</span>
          <h2 className={styles.symbolName}>{cfg.name}</h2>
          <p className={styles.symbolMeta}>
            {cfg.portfolioSymbol} · {cfg.assetClass}
            {historyYahooSymbol ? ` · Yahoo ${historyYahooSymbol}` : ""}
          </p>
        </div>
        <div className={styles.statusPills}>
          <span className={`${styles.pill} ${styles[`pill_${engineStatus}`]}`}>
            {STATUS_LABEL[engineStatus] ?? engineStatus}
          </span>
          {activeStrategy && (
            <span className={styles.pillNeutral}>{STRATEGY_LABELS[activeStrategy]}</span>
          )}
          {usesYfinanceData && <span className={styles.pillNeutral}>yfinance</span>}
          {syncToPortfolio && <span className={styles.pillAccent}>Portfolio sync</span>}
          {riskGuard.enabled && (
            <span className={styles.pillWarn}>Risk guard · max {fmtUsd(riskGuard.maxLoss)}</span>
          )}
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Market &amp; chart</h3>
          <dl className={styles.dl}>
            <div className={styles.dlRow}>
              <dt>Live price</dt>
              <dd className={styles.mono}>
                ${liveMark?.toFixed(cfg.assetClass === "forex" ? 4 : 2) ?? "—"}
              </dd>
            </div>
            <div className={styles.dlRow}>
              <dt>Chart range</dt>
              <dd>
                {chartPeriod} · {chartInterval}
              </dd>
            </div>
            <div className={styles.dlRow}>
              <dt>Bars loaded</dt>
              <dd>{historyLoading ? "Loading…" : priceHistory.length}</dd>
            </div>
            <div className={styles.dlRow}>
              <dt>Data provider</dt>
              <dd>{historyProvider ?? (usesYfinanceData ? "yfinance" : "simulated")}</dd>
            </div>
            <div className={styles.dlRow}>
              <dt>Last bar</dt>
              <dd className={styles.mono}>
                {lastCandle
                  ? `O ${lastCandle.open.toFixed(2)} H ${lastCandle.high.toFixed(2)} L ${lastCandle.low.toFixed(2)} C ${lastCandle.close.toFixed(2)}`
                  : "—"}
              </dd>
            </div>
            <div className={styles.dlRow}>
              <dt>Engine latency</dt>
              <dd>{latencyMs}ms</dd>
            </div>
            {historyError && (
              <div className={`${styles.dlRow} ${styles.error}`}>
                <dt>History</dt>
                <dd>{historyError}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Session performance</h3>
          <dl className={styles.dl}>
            <div className={styles.dlRow}>
              <dt>Session realized P&amp;L</dt>
              <dd className={totalPnl >= 0 ? styles.up : styles.down}>{fmtSigned(totalPnl)}</dd>
            </div>
            <div className={styles.dlRow}>
              <dt>Win rate</dt>
              <dd>
                {winRate.toFixed(1)}% ({sessionWins}W / {closedTrades.length} trades)
              </dd>
            </div>
            <div className={styles.dlRow}>
              <dt>Total trades</dt>
              <dd>{totalTrades}</dd>
            </div>
            <div className={styles.dlRow}>
              <dt>Sharpe (sim)</dt>
              <dd>{sharpeRatio.toFixed(2)}</dd>
            </div>
            <div className={styles.dlRow}>
              <dt>Max drawdown</dt>
              <dd className={styles.down}>{fmtUsd(maxDrawdown)}</dd>
            </div>
            <div className={styles.dlRow}>
              <dt>Order size</dt>
              <dd>{fmtUsd(positionSize)} notional</dd>
            </div>
            {lastTradeMessage && (
              <div className={styles.dlRow}>
                <dt>Last message</dt>
                <dd>{lastTradeMessage}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Open algo position</h3>
          {openPosition ? (
            <dl className={styles.dl}>
              <div className={styles.dlRow}>
                <dt>Side</dt>
                <dd>{openPosition.side}</dd>
              </div>
              <div className={styles.dlRow}>
                <dt>Size</dt>
                <dd>{openPosition.size.toFixed(4)}</dd>
              </div>
              <div className={styles.dlRow}>
                <dt>Entry</dt>
                <dd className={styles.mono}>
                  ${openPosition.entryPrice.toFixed(2)} · {fmtTime(openPosition.entryTime)}
                </dd>
              </div>
              <div className={styles.dlRow}>
                <dt>Live P&amp;L</dt>
                <dd className={openAlgoPnl != null && openAlgoPnl >= 0 ? styles.up : styles.down}>
                  {openAlgoPnl != null ? fmtSigned(openAlgoPnl) : "—"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className={styles.empty}>No open algo position — start engine or place manual order.</p>
          )}
        </div>

        <div className={`${styles.card} ${styles.cardWide}`}>
          <h3 className={styles.cardTitle}>Recent signals ({signals.length} total)</h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Price</th>
                  <th>Confidence</th>
                  <th>Strategy</th>
                </tr>
              </thead>
              <tbody>
                {recentSignals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={styles.emptyCell}>
                      No signals yet — run the engine on a strategy.
                    </td>
                  </tr>
                ) : (
                  recentSignals.map((s, i) => (
                    <tr key={`${s.timestamp}-${i}`}>
                      <td>{fmtTime(s.timestamp)}</td>
                      <td className={s.type === "BUY" ? styles.up : styles.down}>{s.type}</td>
                      <td className={styles.mono}>${s.price.toFixed(2)}</td>
                      <td>{(s.confidence * 100).toFixed(0)}%</td>
                      <td>{STRATEGY_LABELS[s.strategy]}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Engine status log</h3>
          <ul className={styles.logList}>
            {recentStatus.length === 0 ? (
              <li className={styles.empty}>No status messages yet.</li>
            ) : (
              recentStatus.map((log) => (
                <li key={log.id} className={styles.logItem}>
                  <span className={styles.logTime}>{fmtTime(log.timestamp)}</span>
                  <span className={styles[`log_${log.level}`]}>{log.level}</span>
                  <span className={styles.logMsg}>{log.message}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
