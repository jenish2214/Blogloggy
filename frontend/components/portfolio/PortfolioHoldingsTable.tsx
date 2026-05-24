"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useActiveBookStore } from "@/lib/store/activeBook";
import { fetchLiveQuoteMarks, type LiveQuoteMark } from "@/lib/market/fetchLiveQuoteMarks";
import { portfolioApi } from "@/lib/api";
import { enrichPositionMetrics, type SnapshotPosition } from "@/lib/trading/portfolioSnapshot";
import { computePortfolioTotals } from "@/lib/trading/portfolioTotals";
import { executePlaceOrder } from "@/lib/trading/placeOrder";
import {
  canPlaceMarketOrders,
  detectMarketCalendar,
  formatExitTimestamp,
  getMarketStatusLabel,
  getTradingBlockReason,
  isUSEquityWeekend,
  isUSMarketOpen,
} from "@/lib/trading/marketHours";
import { syncPortfolioFromCloud } from "@/lib/trading/cloudPortfolio";
import { computeExitPnl, formatPctSigned, formatProfitSigned } from "@/lib/trading/exitPnl";
import { SellPositionPanel, type SellPosition } from "@/components/trading/SellPositionPanel";
import { ExitPositionPanel } from "./ExitPositionPanel";
import styles from "./PortfolioHoldingsTable.module.css";

const LIVE_INTERVAL_MS = 10_000;

function fmt(n: number | null | undefined, dec = 2) {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function applyMarks(
  positions: SnapshotPosition[],
  marks: Record<string, LiveQuoteMark>,
  cash: number,
  startingCapital: number
) {
  const nextPositions = positions.map((p) => {
    const m = marks[p.symbol];
    const currentPrice = m?.price ?? p.currentPrice;
    return enrichPositionMetrics({
      ...p,
      currentPrice,
      dayChangePct: m?.changePct ?? p.dayChangePct,
    });
  });

  return computePortfolioTotals(nextPositions, cash, startingCapital);
}

export type PortfolioLiveTotals = {
  positions: SnapshotPosition[];
  investedValue: number;
  costBasis: number;
  unrealizedPnl: number;
  totalValue: number;
  totalPnl: number;
  totalPnlPct: number;
  lastUpdated: string | null;
};

interface PortfolioHoldingsTableProps {
  initialPositions: SnapshotPosition[];
  cash: number;
  startingCapital: number;
  useServerData: boolean;
  onTotalsChange: (totals: PortfolioLiveTotals) => void;
  onRefreshRequest: () => void;
}

export function PortfolioHoldingsTable({
  initialPositions,
  cash,
  startingCapital,
  useServerData,
  onTotalsChange,
  onRefreshRequest,
}: PortfolioHoldingsTableProps) {
  const activeBook = useActiveBookStore((s) => s.activeBook);
  const [positions, setPositions] = useState(initialPositions);
  const [marks, setMarks] = useState<Record<string, LiveQuoteMark>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [sellTarget, setSellTarget] = useState<SellPosition | null>(null);
  const [exitTarget, setExitTarget] = useState<SnapshotPosition | null>(null);
  const [exitLoading, setExitLoading] = useState(false);
  const [exitMsg, setExitMsg] = useState<string | null>(null);
  const [marketLabel, setMarketLabel] = useState(getMarketStatusLabel());

  useEffect(() => {
    const tick = () => setMarketLabel(getMarketStatusLabel());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const marketOpen = isUSMarketOpen();
  const isWeekend = isUSEquityWeekend();
  const allUsOnly =
    initialPositions.length > 0 &&
    initialPositions.every(
      (p) =>
        detectMarketCalendar({
          symbol: p.symbol,
          assetClass: p.assetClass as "stock" | "crypto" | "option" | "forex",
        }) === "US_EQUITIES"
    );

  const symbolKey = useMemo(
    () => initialPositions.map((p) => p.symbol).sort().join(","),
    [initialPositions]
  );

  const pushTotals = useCallback(
    (pos: SnapshotPosition[], m: Record<string, LiveQuoteMark>, updatedAt: Date | null) => {
      const next = applyMarks(pos, m, cash, startingCapital);
      setPositions(next.positions);
      onTotalsChange({
        ...next,
        lastUpdated: updatedAt?.toISOString() ?? null,
      });
    },
    [cash, startingCapital, onTotalsChange]
  );

  useEffect(() => {
    pushTotals(initialPositions, marks, lastUpdated);
  }, [initialPositions, marks, lastUpdated, pushTotals]);

  useEffect(() => {
    if (symbolKey) return;
    onTotalsChange({
      positions: [],
      investedValue: 0,
      costBasis: 0,
      unrealizedPnl: 0,
      totalValue: cash,
      totalPnl: cash - startingCapital,
      totalPnlPct: startingCapital > 0 ? ((cash - startingCapital) / startingCapital) * 100 : 0,
      lastUpdated: null,
    });
  }, [symbolKey, cash, startingCapital, onTotalsChange]);

  const refreshLivePrices = useCallback(async () => {
    if (!symbolKey) return;
    const syms = symbolKey.split(",");
    setPriceLoading(true);
    setPriceError(null);
    try {
      const { marks: nextMarks, error } = await fetchLiveQuoteMarks(syms, true);
      if (error) setPriceError(error);
      setMarks(nextMarks);
      const at = new Date();
      setLastUpdated(at);
      pushTotals(initialPositions, nextMarks, at);

      if (useServerData && Object.keys(nextMarks).length > 0) {
        const prices: Record<string, number> = {};
        for (const [sym, mark] of Object.entries(nextMarks)) {
          prices[sym] = mark.price;
        }
        try {
          const book = activeBook
            ? { portfolioId: activeBook.portfolioId, clientId: activeBook.clientId }
            : undefined;
          await portfolioApi.syncPrices(prices, book);
        } catch {
          /* offline */
        }
      }
    } finally {
      setPriceLoading(false);
    }
  }, [symbolKey, initialPositions, pushTotals, useServerData, activeBook]);

  useEffect(() => {
    if (!symbolKey) return;
    void refreshLivePrices();
    const id = setInterval(() => void refreshLivePrices(), LIVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [symbolKey, refreshLivePrices]);

  const exitLivePosition = useMemo(() => {
    if (!exitTarget) return null;
    return positions.find((p) => p.symbol === exitTarget.symbol) ?? exitTarget;
  }, [exitTarget, positions]);

  const exitLivePrice = exitLivePosition
    ? marks[exitLivePosition.symbol]?.price ?? exitLivePosition.currentPrice
    : 0;

  const handleExitFull = async () => {
    if (!exitLivePosition) return;
    const exitCtx = {
      symbol: exitLivePosition.symbol,
      assetClass: exitLivePosition.assetClass as "stock" | "crypto" | "option" | "forex",
    };
    if (!canPlaceMarketOrders(exitCtx)) return;
    setExitLoading(true);
    setExitMsg(null);
    const pos = exitLivePosition;
    const price = marks[pos.symbol]?.price ?? pos.currentPrice;
    const exitTime = new Date();
    const pnl = computeExitPnl(pos.qty, pos.avgPrice, price, pos.costBasis);

    const res = await executePlaceOrder({
      symbol: pos.symbol,
      name: pos.name,
      assetClass: pos.assetClass as "stock" | "crypto" | "option" | "forex",
      side: "sell",
      qty: pos.qty,
      orderType: "market",
      currentPrice: price,
    });

    setExitLoading(false);
    if (res.success) {
      await syncPortfolioFromCloud();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("wallet-updated"));
      }
      setExitMsg(
        `Sold ${pos.symbol} at ${formatExitTimestamp(exitTime)} · Proceeds $${fmt(pnl.proceeds)} · Realized ${formatProfitSigned(pnl.profit)} (${formatPctSigned(pnl.profitPct)})`
      );
      setExitTarget(null);
      onRefreshRequest();
    } else {
      setExitMsg(res.message);
    }
  };

  if (positions.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
        <div style={{ marginBottom: 8, fontSize: "1.5rem" }}>📭</div>
        No open positions.{" "}
        <Link href="/trade" style={{ color: "var(--accent-2)", textDecoration: "none" }}>
          Start trading →
        </Link>
      </div>
    );
  }

  return (
    <div className={isWeekend && allUsOnly ? styles.frozenSection : undefined}>
      <div className={styles.liveBar}>
        <span className={styles.liveDot} aria-hidden />
        <span className={styles.liveText}>
          Live marks
          {lastUpdated ? ` · ${fmtTime(lastUpdated)}` : ""}
          {priceLoading ? " · refreshing…" : ` · every ${LIVE_INTERVAL_MS / 1000}s`}
          {" · "}
          <span className={marketOpen ? styles.marketOpen : styles.marketClosed}>{marketLabel}</span>
        </span>
        {priceError && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void refreshLivePrices()}>
            Retry
          </button>
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void refreshLivePrices()} disabled={priceLoading}>
          Refresh now
        </button>
      </div>

      {exitMsg && (
        <div className={exitMsg.startsWith("Sold") ? styles.exitMsgSuccess : styles.exitMsgError}>
          {exitMsg}
        </div>
      )}

      {exitLivePosition && (
        <ExitPositionPanel
          position={exitLivePosition}
          livePrice={exitLivePrice}
          lastUpdated={lastUpdated}
          loading={priceLoading}
          confirming={exitLoading}
          onConfirm={() => void handleExitFull()}
          onCancel={() => {
            setExitTarget(null);
            setExitMsg(null);
          }}
        />
      )}

      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              {[
                "Symbol",
                "Qty",
                "Your buy price",
                "Current price",
                "Your return",
                "Cost basis",
                "Market value",
                "Action",
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {positions.map((pos) => {
              const posCtx = {
                symbol: pos.symbol,
                assetClass: pos.assetClass as "stock" | "crypto" | "option" | "forex",
              };
              const posTradingAllowed = canPlaceMarketOrders(posCtx);
              const up = pos.unrealizedPnl >= 0;
              const dayPct = pos.dayChangePct ?? marks[pos.symbol]?.changePct ?? 0;
              const isExiting = exitTarget?.symbol === pos.symbol;
              const liveExitPnl = computeExitPnl(
                pos.qty,
                pos.avgPrice,
                marks[pos.symbol]?.price ?? pos.currentPrice,
                pos.costBasis
              );
              return (
                <tr
                  key={pos.symbol}
                  className={`${priceLoading ? styles.rowPulse : ""} ${isExiting ? styles.rowExitActive : ""}`.trim() || undefined}
                >
                  <td>
                    <span className={styles.sym}>{pos.symbol}</span>
                    <div className={styles.name}>{pos.name}</div>
                    <span className="badge badge-neutral" style={{ marginTop: 4 }}>
                      {pos.assetClass}
                    </span>
                  </td>
                  <td className={styles.mono}>
                    {pos.assetClass === "crypto" || pos.assetClass === "forex" ? pos.qty.toFixed(4) : pos.qty}
                  </td>
                  <td className={styles.mono}>
                    <span className={styles.buyPrice}>${fmt(pos.avgPrice)}</span>
                    <div className={styles.subCell}>per share · your avg buy</div>
                    <div className={styles.subCell}>paid ${fmt(pos.costBasis)} total</div>
                  </td>
                  <td className={styles.mono}>
                    <span className={styles.livePrice}>${fmt(pos.currentPrice)}</span>
                    <div className={styles.subCell}>
                      {pos.returnPerShare >= 0 ? "+" : "−"}${fmt(Math.abs(pos.returnPerShare))} / share vs buy
                    </div>
                    <div className={styles.subCell}>
                      Today{" "}
                      <span className={dayPct >= 0 ? styles.up : styles.down}>
                        {dayPct >= 0 ? "+" : ""}
                        {fmt(dayPct)}%
                      </span>
                    </div>
                  </td>
                  <td className={styles.mono}>
                    <div className={`${styles.returnMain} ${up ? styles.up : styles.down}`}>
                      {up ? "+" : "−"}${fmt(Math.abs(pos.unrealizedPnl))}
                    </div>
                    <span className={up ? "badge badge-up" : "badge badge-down"}>
                      {up ? "+" : ""}
                      {fmt(pos.unrealizedPnlPct)}% return
                    </span>
                  </td>
                  <td className={styles.mono}>
                    ${fmt(pos.costBasis)}
                    <div className={styles.subCell}>amount invested</div>
                  </td>
                  <td className={styles.mono}>
                    ${fmt(pos.marketValue)}
                    <div className={styles.subCell}>at current price</div>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      {isExiting && (
                        <div className={`${styles.inlinePnl} ${liveExitPnl.profit >= 0 ? styles.up : styles.down}`}>
                          Live: {formatProfitSigned(liveExitPnl.profit)}
                        </div>
                      )}
                      <button
                        type="button"
                        className="btn btn-sell btn-sm"
                        onClick={() => {
                          setExitTarget(pos);
                          setExitMsg(null);
                        }}
                        disabled={!posTradingAllowed}
                        title={
                          posTradingAllowed
                            ? "Sell entire position at live price"
                            : getTradingBlockReason(posCtx) ?? "Market closed"
                        }
                      >
                        {isExiting ? "Selected" : "Exit"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={!posTradingAllowed}
                        onClick={() =>
                          setSellTarget({
                            symbol: pos.symbol,
                            name: pos.name,
                            assetClass: pos.assetClass,
                            qty: pos.qty,
                            avgPrice: pos.avgPrice,
                            currentPrice: pos.currentPrice,
                            unrealizedPnl: pos.unrealizedPnl,
                            unrealizedPnlPct: pos.unrealizedPnlPct,
                          })
                        }
                      >
                        Partial
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className={styles.totalsRow}>
              <td colSpan={4}>
                <strong>Portfolio totals (live)</strong>
              </td>
              <td className={styles.mono}>
                {(() => {
                  const totalUnreal = positions.reduce((s, p) => s + p.unrealizedPnl, 0);
                  const totalCost = positions.reduce((s, p) => s + p.costBasis, 0);
                  const totalPct = totalCost > 0 ? (totalUnreal / totalCost) * 100 : 0;
                  return (
                    <>
                      <span className={totalUnreal >= 0 ? styles.up : styles.down}>
                        {totalUnreal >= 0 ? "+" : "−"}${fmt(Math.abs(totalUnreal))}
                      </span>
                      <div className={styles.subCell}>
                        {totalPct >= 0 ? "+" : ""}
                        {fmt(totalPct)}% unrealized
                      </div>
                    </>
                  );
                })()}
              </td>
              <td className={styles.mono}>
                ${fmt(positions.reduce((s, p) => s + p.costBasis, 0))}
              </td>
              <td className={styles.mono}>
                ${fmt(positions.reduce((s, p) => s + p.marketValue, 0))}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {sellTarget && (
        <SellPositionPanel
          position={sellTarget}
          onClose={() => setSellTarget(null)}
          onSold={() => {
            onRefreshRequest();
            void refreshLivePrices();
          }}
        />
      )}
    </div>
  );
}
