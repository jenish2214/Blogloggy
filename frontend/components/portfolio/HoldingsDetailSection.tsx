"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { OrderRecord } from "@/lib/trading/orders";
import type { SnapshotPosition } from "@/lib/trading/portfolioSnapshot";
import { buildHoldingDetails } from "@/lib/trading/holdingFills";
import { fetchLiveQuoteMarks, type LiveQuoteMark } from "@/lib/market/fetchLiveQuoteMarks";
import { enrichPositionMetrics } from "@/lib/trading/portfolioSnapshot";
import { computeExitPnl, formatPctSigned, formatProfitSigned } from "@/lib/trading/exitPnl";
import {
  canPlaceMarketOrders,
  detectMarketCalendar,
  getTradingBlockReason,
} from "@/lib/trading/marketHours";
import { sellHoldingPosition } from "@/lib/trading/sellHoldingPosition";
import styles from "./HoldingsDetailSection.module.css";

const LIVE_INTERVAL_MS = 10_000;

function fmt(n: number | null | undefined, dec = 2) {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function normSymbol(s: string) {
  return s.toUpperCase().replace(/\.(NS|BO)$/i, "").trim();
}

function resolveHoldingPosition(
  symbol: string,
  livePositions: SnapshotPosition[],
  fallback: SnapshotPosition | null,
  marks: Record<string, LiveQuoteMark>
): SnapshotPosition | null {
  const key = normSymbol(symbol);
  const live =
    livePositions.find((p) => normSymbol(p.symbol) === key) ??
    fallback;
  if (!live || live.qty <= 0.000001) return null;
  const m = marks[live.symbol] ?? marks[symbol];
  const currentPrice = m?.price ?? live.currentPrice;
  return enrichPositionMetrics({
    ...live,
    currentPrice,
    dayChangePct: m?.changePct ?? live.dayChangePct,
  });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface HoldingsDetailSectionProps {
  positions: SnapshotPosition[];
  orders: OrderRecord[];
  cash: number;
  frozen: boolean;
  onRefresh: () => void;
}

export function HoldingsDetailSection({
  positions,
  orders,
  cash,
  frozen,
  onRefresh,
}: HoldingsDetailSectionProps) {
  const [marks, setMarks] = useState<Record<string, LiveQuoteMark>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sellLoadingSymbol, setSellLoadingSymbol] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const holdings = useMemo(() => buildHoldingDetails(positions, orders), [positions, orders]);

  const livePositions = useMemo(() => {
    return positions.map((p) => {
      const m = marks[p.symbol];
      const currentPrice = m?.price ?? p.currentPrice;
      return enrichPositionMetrics({
        ...p,
        currentPrice,
        dayChangePct: m?.changePct ?? p.dayChangePct,
      });
    });
  }, [positions, marks]);

  const pausePolling =
    frozen &&
    positions.length > 0 &&
    positions.every(
      (p) =>
        detectMarketCalendar({
          symbol: p.symbol,
          assetClass: p.assetClass as "stock" | "crypto" | "option" | "forex",
        }) === "US_EQUITIES"
    );

  const refreshPrices = useCallback(async () => {
    if (pausePolling || positions.length === 0) return;
    const syms = positions.map((p) => p.symbol);
    const { marks: next } = await fetchLiveQuoteMarks(syms);
    setMarks(next);
    setLastUpdated(new Date());
  }, [pausePolling, positions]);

  useEffect(() => {
    if (pausePolling) return;
    void refreshPrices();
    const id = setInterval(() => void refreshPrices(), LIVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [pausePolling, refreshPrices]);

  const sellPositionInstant = async (pos: SnapshotPosition) => {
    const price = marks[pos.symbol]?.price ?? pos.currentPrice;
    setSellLoadingSymbol(pos.symbol);
    setMsg(null);

    const pnl = computeExitPnl(pos.qty, pos.avgPrice, price, pos.costBasis);
    const res = await sellHoldingPosition(pos, price);

    setSellLoadingSymbol(null);
    if (res.success) {
      setMsg(
        `Sold ${pos.qty} ${pos.symbol} @ $${fmt(price)} · ${formatProfitSigned(pnl.profit)} (${formatPctSigned(pnl.profitPct)})`
      );
      onRefresh();
      if (typeof window !== "undefined") window.dispatchEvent(new Event("wallet-updated"));
    } else {
      setMsg(res.message);
    }
  };

  if (holdings.length === 0) {
    return (
      <div className={`${styles.empty} ${frozen ? styles.frozenWrap : ""}`}>
        <p>No holdings yet. Buy a stock from Trade to see your positions here.</p>
        <Link href="/trade" className="btn btn-primary btn-sm">
          Go to Trade
        </Link>
      </div>
    );
  }

  return (
    <div className={frozen ? styles.frozenWrap : undefined}>
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Cash available</span>
          <strong>${fmt(cash)}</strong>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Open positions</span>
          <strong>{livePositions.length}</strong>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Total buy fills</span>
          <strong>{orders.filter((o) => o.side === "buy").length}</strong>
        </div>
        {lastUpdated && !frozen && (
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Prices updated</span>
            <strong>{lastUpdated.toLocaleTimeString()}</strong>
          </div>
        )}
        {frozen && (
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Weekend mode</span>
            <strong className={styles.frozenText}>Frozen snapshot</strong>
          </div>
        )}
      </div>

      {msg && <p className={styles.msg}>{msg}</p>}

      <div className={styles.cardList}>
        {holdings.map((h) => {
          const posCtx = {
            symbol: h.symbol,
            assetClass: h.assetClass as "stock" | "crypto" | "option" | "forex",
          };
          const holdingTradingAllowed = canPlaceMarketOrders(posCtx);
          const blockReason = getTradingBlockReason(posCtx);
          const pos = resolveHoldingPosition(h.symbol, livePositions, h.position, marks);
          const hasPosition = !!pos && pos.qty > 0;
          const livePrice = pos
            ? marks[pos.symbol]?.price ?? pos.currentPrice
            : h.buyFills[0]?.price ?? 0;
          const pnl = pos
            ? computeExitPnl(pos.qty, pos.avgPrice, livePrice, pos.costBasis)
            : null;
          const sellDisabled = !hasPosition || !pos;
          const sellTitle = sellDisabled
            ? "No shares to sell"
            : `Sell ${pos!.qty} ${h.symbol} now (paper trade)`;

          return (
            <article key={h.symbol} className={styles.holdingCard}>
              <div className={styles.cardHead}>
                <div>
                  <h3 className={styles.sym}>{h.symbol}</h3>
                  <p className={styles.name}>{h.name}</p>
                </div>
                {hasPosition && pnl && (
                  <div className={styles.pnlBlock}>
                    <span className={styles.pnlLabel}>Live P&amp;L</span>
                    <span className={pnl.profit >= 0 ? styles.up : styles.down}>
                      {formatProfitSigned(pnl.profit)}
                    </span>
                    <span className={pnl.profit >= 0 ? styles.up : styles.down}>
                      {formatPctSigned(pnl.profitPct)}
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.actionBar}>
                <Link
                  href={`/trade?symbol=${encodeURIComponent(h.symbol)}&name=${encodeURIComponent(h.name)}&class=${h.assetClass}`}
                  className="btn btn-primary btn-sm"
                >
                  Buy more
                </Link>
                <button
                  type="button"
                  className={`btn btn-sell btn-sm ${styles.sellBtn}`}
                  disabled={sellDisabled || sellLoadingSymbol === h.symbol}
                  title={sellTitle}
                  onClick={() => pos && void sellPositionInstant(pos)}
                >
                  {sellLoadingSymbol === h.symbol ? "Selling…" : "Sell"}
                </button>
                <Link
                  href={`/trade?symbol=${encodeURIComponent(h.symbol)}`}
                  className="btn btn-ghost btn-sm"
                >
                  Trade
                </Link>
              </div>

              {hasPosition && pos && (
                <div className={styles.liveGrid}>
                  <div>
                    <span className={styles.cellLabel}>You own</span>
                    <strong>{pos.qty} shares</strong>
                  </div>
                  <div>
                    <span className={styles.cellLabel}>Avg buy</span>
                    <strong>${fmt(pos.avgPrice)}</strong>
                  </div>
                  <div>
                    <span className={styles.cellLabel}>Live price</span>
                    <strong className={styles.accent}>${fmt(livePrice)}</strong>
                  </div>
                  <div>
                    <span className={styles.cellLabel}>Market value</span>
                    <strong>${fmt(pos.marketValue)}</strong>
                  </div>
                  <div>
                    <span className={styles.cellLabel}>You paid</span>
                    <strong>${fmt(pos.costBasis)}</strong>
                  </div>
                  <div>
                    <span className={styles.cellLabel}>Cash if sold</span>
                    <strong>${fmt(pnl?.proceeds)}</strong>
                  </div>
                </div>
              )}

              {hasPosition && h.buyFills.length > 1 && (
                <p className={styles.duplicateWarn}>
                  {h.buyFills.length} buys combined into one position · avg cost ${fmt(pos!.avgPrice)} · {pos!.qty} shares total
                </p>
              )}
              {hasPosition && h.buyFills.length <= 1 && (
                <p className={styles.duplicateWarn}>
                  Buy again from Trade to add shares — they merge into this same {h.symbol} line (weighted average cost).
                </p>
              )}

              <div className={styles.buyHistory}>
                <h4 className={styles.buyTitle}>Where you bought ({h.buyFills.length} fill{h.buyFills.length !== 1 ? "s" : ""})</h4>
                {h.buyFills.length === 0 ? (
                  <p className={styles.noFills}>No buy orders on record for this symbol.</p>
                ) : (
                  <table className={styles.fillsTable}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Total spent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {h.buyFills.map((f) => (
                        <tr key={f.id}>
                          <td>{fmtDate(f.date)}</td>
                          <td>{f.qty}</td>
                          <td>${fmt(f.price)}</td>
                          <td>${fmt(f.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3}><strong>Total invested</strong></td>
                        <td><strong>${fmt(h.totalBoughtValue)}</strong></td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>

            </article>
          );
        })}
      </div>
    </div>
  );
}
