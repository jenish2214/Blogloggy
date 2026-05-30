"use client";

import { usePortfolioStore } from "@/lib/store/portfolio";
import { useAlgoTradingStore } from "@/store/algoTradingStore";
import { exitPositionFull } from "@/lib/algoPortfolioBridge";
import { AlgoTradePanel } from "@/components/algo-trading/AlgoTradePanel";
import { ExecutionLog } from "@/components/algo-trading/ExecutionLog";
import { useLivePricesOptional } from "@/components/algo-trading/LivePriceProvider";
import { getSymbolConfig } from "@/types/algoTrading";
import { useState } from "react";
import styles from "./AlgoDataStack.module.css";

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export function AlgoDataStack() {
  const [exitLoading, setExitLoading] = useState(false);
  const { engineLogs, openPosition, symbol, currentPrice, closedTrades } = useAlgoTradingStore();
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
    <div className={styles.stack}>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Manual order</h3>
        <AlgoTradePanel embedded />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Portfolio positions</h3>
        <div className={styles.summaryRow}>
          <div>
            <span className={styles.summaryLabel}>NAV</span>
            <span className={styles.summaryVal}>{usd(totalValue)}</span>
          </div>
          <div>
            <span className={styles.summaryLabel}>Book P&amp;L</span>
            <span className={totalPnl >= 0 ? styles.up : styles.down}>{usd(totalPnl)}</span>
          </div>
          <div>
            <span className={styles.summaryLabel}>Unrealized</span>
            <span className={unrealizedTotal >= 0 ? styles.up : styles.down}>
              {usd(unrealizedTotal)}
            </span>
          </div>
          <div>
            <span className={styles.summaryLabel}>Cash</span>
            <span className={styles.summaryVal}>{usd(cash)}</span>
          </div>
        </div>

        {openPosition && (
          <div className={styles.algoOpen}>
            <strong>Algo open</strong> · {symbol} · {openPosition.size.toFixed(2)} @ $
            {openPosition.entryPrice.toFixed(2)}
            {liveMkt != null && (
              <span>
                {" "}
                → ${liveMkt.toFixed(2)} (
                <span
                  className={
                    (liveMkt - openPosition.entryPrice) * openPosition.size >= 0
                      ? styles.up
                      : styles.down
                  }
                >
                  {usd((liveMkt - openPosition.entryPrice) * openPosition.size)}
                </span>
                )
              </span>
            )}
          </div>
        )}

        {canExit && (
          <button
            type="button"
            className={`btn btn-sell btn-sm ${styles.exitBtn}`}
            disabled={exitLoading}
            onClick={() => void handleExit()}
          >
            {exitLoading ? "Exiting…" : "Exit position"}
          </button>
        )}

        {posList.length === 0 ? (
          <p className={styles.muted}>No holdings in paper portfolio.</p>
        ) : (
          <ul className={styles.posList}>
            {posList.map((p) => {
              const up = p.unrealizedPnl >= 0;
              return (
                <li key={p.symbol} className={styles.posItem}>
                  <div className={styles.posTop}>
                    <strong>{p.symbol}</strong>
                    <span>{p.qty} units</span>
                  </div>
                  <div className={styles.posMeta}>
                    Avg ${p.avgPrice.toFixed(2)} · Mkt ${p.currentPrice.toFixed(2)} · Value{" "}
                    {usd(p.currentPrice * p.qty)}
                  </div>
                  <div className={up ? styles.up : styles.down}>
                    {up ? "+" : ""}
                    {usd(p.unrealizedPnl)} ({p.unrealizedPnlPct.toFixed(2)}%)
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          Closed session trades <span className={styles.count}>({closedTrades.length})</span>
        </h3>
        <div className={styles.tradesWrap}>
          <table className={styles.tradesTable}>
            <thead>
              <tr>
                <th>Exit</th>
                <th>Sym</th>
                <th>P&amp;L</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {closedTrades.length === 0 ? (
                <tr>
                  <td colSpan={4} className={styles.muted}>
                    —
                  </td>
                </tr>
              ) : (
                closedTrades
                  .slice(-8)
                  .reverse()
                  .map((t) => (
                    <tr key={t.id}>
                      <td>
                        {new Date(t.exitTime).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td>{t.symbol}</td>
                      <td className={t.pnl >= 0 ? styles.up : styles.down}>
                        {t.pnl >= 0 ? "+" : ""}
                        {usd(t.pnl)}
                      </td>
                      <td>
                        <span className={t.status === "WIN" ? styles.win : styles.loss}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Execution log</h3>
        <ExecutionLog logs={engineLogs} maxHeight="220px" bare />
      </section>
    </div>
  );
}
