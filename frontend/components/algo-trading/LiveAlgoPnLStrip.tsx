"use client";

import { useMemo } from "react";
import { useAlgoTradingStore } from "@/store/algoTradingStore";
import { usePortfolioStore } from "@/lib/store/portfolio";
import { useLivePricesOptional } from "@/components/algo-trading/LivePriceProvider";
import { getSymbolConfig } from "@/types/algoTrading";
import styles from "@/app/(platform)/algo-trading/algo-trading.module.css";

const STARTING_NAV = 100_000;

function fmtUsd(n: number, precise = false) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: precise ? 2 : 0,
    maximumFractionDigits: precise ? 2 : 0,
  });
}

function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function fmtSignedUsd(n: number) {
  return `${n >= 0 ? "+" : "−"}${fmtUsd(Math.abs(n), true)}`;
}

function pnlTone(n: number) {
  return n >= 0 ? styles.livePnlUp : styles.livePnlDown;
}

export function LiveAlgoPnLStrip() {
  const liveFeed = useLivePricesOptional();
  const {
    openPosition,
    symbol,
    totalPnl: sessionRealized,
    closedTrades,
    winRate,
    maxDrawdown,
    engineStatus,
    syncToPortfolio,
  } = useAlgoTradingStore();
  const { totalValue, cash, totalPnl, positions } = usePortfolioStore();

  const cfg = getSymbolConfig(symbol);
  const liveMark =
    liveFeed?.livePrices[cfg.portfolioSymbol] ??
    positions[cfg.portfolioSymbol]?.currentPrice;

  const bookUnrealized = useMemo(
    () => Object.values(positions).reduce((s, p) => s + p.unrealizedPnl, 0),
    [positions]
  );

  const bookPnlPct = STARTING_NAV > 0 ? (totalPnl / STARTING_NAV) * 100 : 0;

  const openAlgoPnl =
    openPosition && liveMark != null
      ? (liveMark - openPosition.entryPrice) * openPosition.size
      : null;

  const openAlgoPct =
    openPosition && openPosition.entryPrice > 0 && liveMark != null
      ? ((liveMark - openPosition.entryPrice) / openPosition.entryPrice) * 100
      : null;

  const sessionWins = closedTrades.filter((t) => t.status === "WIN").length;
  const lastTrade = closedTrades[closedTrades.length - 1];

  const updatedAt = liveFeed?.lastUpdated?.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const isLive = !!liveFeed?.lastUpdated && !liveFeed.loading;

  return (
    <section className={styles.livePnlStrip} aria-label="Live profit and loss">
      <div className={styles.livePnlStripHead}>
        <span className={styles.livePnlPulse}>
          <span className={styles.livePnlDot} aria-hidden />
          {isLive ? "LIVE P&L" : liveFeed?.loading ? "LOADING PRICES…" : "P&L"}
        </span>
        <span className={styles.livePnlMeta}>
          {updatedAt ? `Market updated ${updatedAt}` : "Waiting for quotes"}
          {" · "}
          {liveFeed?.error
            ? "quote error — retrying"
            : (liveFeed as { finnhubConnected?: boolean })?.finnhubConnected
              ? "Finnhub WebSocket + Massive · live"
              : "Massive / Finnhub · market data"}
          {engineStatus === "running" && (
            <>
              {" · "}
              <span className={styles.liveEngineOn}>Engine running</span>
            </>
          )}
          {syncToPortfolio && " · synced to portfolio book"}
        </span>
      </div>

      <div className={styles.livePnlHeroGrid}>
        <div className={`${styles.livePnlHeroCard} ${styles.livePnlHeroPrimary}`}>
          <div className={styles.livePnlHeroLabel}>Total P&amp;L · live book</div>
          <div className={`${styles.livePnlHeroValue} ${pnlTone(totalPnl)}`}>
            {fmtSignedUsd(totalPnl)}
          </div>
          <div className={styles.livePnlHeroSub}>
            <span className={pnlTone(bookPnlPct)}>{fmtPct(bookPnlPct)}</span>
            {" vs "}
            {fmtUsd(STARTING_NAV)} start · NAV {fmtUsd(totalValue)}
          </div>
        </div>

        <div className={styles.livePnlHeroCard}>
          <div className={styles.livePnlHeroLabel}>Unrealized · open holdings</div>
          <div className={`${styles.livePnlHeroValue} ${pnlTone(bookUnrealized)}`}>
            {fmtSignedUsd(bookUnrealized)}
          </div>
          <div className={styles.livePnlHeroSub}>Live mark on every position</div>
        </div>

        <div className={styles.livePnlHeroCard}>
          <div className={styles.livePnlHeroLabel}>Algo session · realized</div>
          <div className={`${styles.livePnlHeroValue} ${pnlTone(sessionRealized)}`}>
            {fmtSignedUsd(sessionRealized)}
          </div>
          <div className={styles.livePnlHeroSub}>
            {closedTrades.length} closed · {winRate.toFixed(0)}% win ({sessionWins}W)
            {maxDrawdown > 0 && ` · max DD ${fmtUsd(maxDrawdown)}`}
          </div>
        </div>

        {openAlgoPnl != null && openPosition && (
          <div className={`${styles.livePnlHeroCard} ${styles.livePnlHeroOpen}`}>
            <div className={styles.livePnlHeroLabel}>
              Open algo · {symbol}
            </div>
            <div className={`${styles.livePnlHeroValue} ${pnlTone(openAlgoPnl)}`}>
              {fmtSignedUsd(openAlgoPnl)}
            </div>
            <div className={styles.livePnlHeroSub}>
              {openPosition.size.toFixed(2)} @ ${openPosition.entryPrice.toFixed(2)}
              {liveMark != null && (
                <>
                  {" → "}
                  <strong>${liveMark.toFixed(cfg.assetClass === "forex" ? 4 : 2)}</strong>
                  {openAlgoPct != null && (
                    <span className={pnlTone(openAlgoPct)}> ({fmtPct(openAlgoPct)})</span>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className={styles.livePnlMiniRow}>
        <div className={styles.livePnlMini}>
          <span className={styles.livePnlMiniLabel}>Cash</span>
          <span className={styles.livePnlMiniVal}>{fmtUsd(cash, true)}</span>
        </div>
        <div className={styles.livePnlMini}>
          <span className={styles.livePnlMiniLabel}>Last session trade</span>
          <span className={styles.livePnlMiniVal}>
            {lastTrade ? (
              <>
                <span className={lastTrade.pnl >= 0 ? styles.livePnlUp : styles.livePnlDown}>
                  {fmtSignedUsd(lastTrade.pnl)}
                </span>
                {" "}
                {lastTrade.symbol} {lastTrade.status}
              </>
            ) : (
              "—"
            )}
          </span>
        </div>
      </div>
    </section>
  );
}
