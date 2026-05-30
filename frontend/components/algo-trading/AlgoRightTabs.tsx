"use client";
import { useState } from "react";
import { usePortfolioStore } from "@/lib/store/portfolio";
import { useAlgoTradingStore } from "@/store/algoTradingStore";
import { exitPositionFull } from "@/lib/algoPortfolioBridge";
import { AlgoTradePanel } from "@/components/algo-trading/AlgoTradePanel";
import { ExecutionLog } from "@/components/algo-trading/ExecutionLog";
import { useLivePricesOptional } from "@/components/algo-trading/LivePriceProvider";
import { getSymbolConfig } from "@/types/algoTrading";
import styles from "@/app/(platform)/algo-trading/algo-trading.module.css";

type Tab = "order" | "positions" | "log";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export function AlgoRightTabs() {
  const [tab, setTab] = useState<Tab>("order");
  const [exitLoading, setExitLoading] = useState(false);
  const { engineLogs, openPosition, symbol, currentPrice } = useAlgoTradingStore();
  const { positions, totalValue, cash, totalPnl } = usePortfolioStore();
  const liveFeed = useLivePricesOptional();

  const cfg = getSymbolConfig(symbol);
  const posList = Object.values(positions).filter((p) => p.qty > 0.000001);
  const currentPos = positions[cfg.portfolioSymbol];
  const liveMkt = currentPos?.currentPrice ?? liveFeed?.livePrices[cfg.portfolioSymbol];
  const exitPrice = liveMkt ?? currentPrice;
  const canExit = !!openPosition || !!(currentPos && currentPos.qty > 0);
  const unrealizedTotal = posList.reduce((s, p) => s + p.unrealizedPnl, 0);

  const handleExit = async () => {
    setExitLoading(true);
    await exitPositionFull(symbol, exitPrice);
    setExitLoading(false);
  };

  return (
    <div className={`card ${styles.tabPanel}`}>
      <div className={styles.tabBar}>
        {(["order", "positions", "log"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`${styles.tabBtn} ${tab === t ? styles.tabBtnActive : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "order" ? "Order" : t === "positions" ? "Positions" : "Log"}
          </button>
        ))}
      </div>

      {tab === "order" && (
        <div className={styles.tabBody}>
          <AlgoTradePanel embedded />
        </div>
      )}

      {tab === "positions" && (
        <div className={styles.tabBody}>
          <div className={styles.posSummary}>
            <div>
              <div className={styles.posSummaryLabel}>Total NAV</div>
              <div className={styles.posSummaryVal}>{usd(totalValue)}</div>
            </div>
            <div>
              <div className={styles.posSummaryLabel}>Live P&L</div>
              <div className={styles.posSummaryVal} style={{ color: totalPnl >= 0 ? "var(--up)" : "var(--down)" }}>
                {totalPnl >= 0 ? "+" : ""}{usd(totalPnl)}
              </div>
            </div>
            <div>
              <div className={styles.posSummaryLabel}>Open P&L</div>
              <div className={styles.posSummaryVal} style={{ color: unrealizedTotal >= 0 ? "var(--up)" : "var(--down)" }}>
                {unrealizedTotal >= 0 ? "+" : ""}{usd(unrealizedTotal)}
              </div>
            </div>
          </div>

          {openPosition && liveMkt != null && (
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>
              Live mark: ${liveMkt.toFixed(cfg.assetClass === "forex" ? 4 : 2)} · P&L{" "}
              <span style={{ color: (liveMkt - openPosition.entryPrice) * openPosition.size >= 0 ? "var(--up)" : "var(--down)" }}>
                {usd((liveMkt - openPosition.entryPrice) * openPosition.size)}
              </span>
            </div>
          )}

          {liveFeed?.lastUpdated && (
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginBottom: 8 }}>
              Prices updated {liveFeed.lastUpdated.toLocaleTimeString()}
            </div>
          )}

          {openPosition && (
            <div className={styles.algoOpenPos}>
              <span className="badge badge-accent">Algo Open</span>
              <span>{symbol} · {openPosition.size.toFixed(2)} @ ${openPosition.entryPrice.toFixed(2)}</span>
            </div>
          )}

          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 8 }}>
            Buying power {usd(cash)}
          </div>

          {canExit && (
            <button
              type="button"
              className={`btn btn-sell ${styles.exitPositionBtn}`}
              disabled={exitLoading}
              onClick={handleExit}
              style={{ marginBottom: 12 }}
            >
              {exitLoading ? "Exiting…" : "Exit Position"}
            </button>
          )}

          {posList.length === 0 ? (
            <p className={styles.emptyPositions}>No portfolio positions. Place an order or run the algo engine.</p>
          ) : (
            <div className={styles.posList}>
              {posList.map((p) => {
                const mv = p.currentPrice * p.qty;
                const up = p.unrealizedPnl >= 0;
                return (
                  <div key={p.symbol} className={styles.posRow}>
                    <div className={styles.posRowTop}>
                      <strong style={{ color: "var(--accent-2)" }}>{p.symbol}</strong>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>{p.qty} units</span>
                    </div>
                    <div className={styles.posRowMeta}>
                      <span>Avg ${p.avgPrice.toFixed(2)}</span>
                      <span>Mkt ${p.currentPrice.toFixed(2)}</span>
                      <span style={{ color: up ? "var(--up)" : "var(--down)", fontWeight: 600 }}>
                        {up ? "+" : ""}{usd(p.unrealizedPnl)} ({p.unrealizedPnlPct.toFixed(2)}%)
                      </span>
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Value {usd(mv)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "log" && (
        <div className={styles.tabBodyFlush}>
          <ExecutionLog logs={engineLogs} maxHeight="320px" bare />
        </div>
      )}
    </div>
  );
}
