"use client";

import { useMemo } from "react";
import type { SnapshotPosition } from "@/lib/trading/portfolioSnapshot";
import {
  computeExitPnl,
  formatPctSigned,
  formatProfitSigned,
} from "@/lib/trading/exitPnl";
import {
  canPlaceMarketOrders,
  formatExitTimestamp,
  getTradingBlockReason,
} from "@/lib/trading/marketHours";
import styles from "./ExitPositionPanel.module.css";

function fmtQty(qty: number, assetClass: string) {
  return assetClass === "crypto" || assetClass === "forex" ? qty.toFixed(4) : String(qty);
}

interface ExitPositionPanelProps {
  position: SnapshotPosition;
  livePrice: number;
  lastUpdated: Date | null;
  loading: boolean;
  confirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ExitPositionPanel({
  position,
  livePrice,
  lastUpdated,
  loading,
  confirming,
  onConfirm,
  onCancel,
}: ExitPositionPanelProps) {
  const pnl = useMemo(
    () => computeExitPnl(position.qty, position.avgPrice, livePrice, position.costBasis),
    [position, livePrice]
  );

  const isProfit = pnl.profit >= 0;
  const tradingAllowed = canPlaceMarketOrders();

  return (
    <div className={styles.panel} role="dialog" aria-labelledby="exit-panel-title">
      <div className={styles.header}>
        <div>
          <h3 id="exit-panel-title" className={styles.title}>
            Sell {position.symbol}
          </h3>
          <p className={styles.sub}>{position.name} · market sell · full position</p>
        </div>
        <span className={styles.liveTag}>{tradingAllowed ? "● Live P&L" : "○ Frozen P&L"}</span>
      </div>

      {!tradingAllowed && (
        <p className={styles.weekendNote}>{getTradingBlockReason()}</p>
      )}

      <div className={styles.hero}>
        <div className={styles.heroLabel}>Realized profit if you sell now</div>
        <div className={`${styles.heroValue} ${isProfit ? styles.up : styles.down}`}>
          {formatProfitSigned(pnl.profit)}
        </div>
        <div className={`${styles.heroPct} ${isProfit ? styles.up : styles.down}`}>
          {formatPctSigned(pnl.profitPct)} on ${pnl.costBasis.toLocaleString("en-US", { maximumFractionDigits: 0 })} invested
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.cell}>
          <span className={styles.cellLabel}>Quantity</span>
          <strong>{fmtQty(pnl.qty, position.assetClass)}</strong>
        </div>
        <div className={styles.cell}>
          <span className={styles.cellLabel}>Your avg buy</span>
          <strong>${pnl.avgBuyPrice.toFixed(2)}</strong>
        </div>
        <div className={styles.cell}>
          <span className={styles.cellLabel}>Live sell price</span>
          <strong className={styles.livePrice}>${pnl.livePrice.toFixed(2)}</strong>
          {lastUpdated && (
            <span className={styles.tick}>updated {lastUpdated.toLocaleTimeString()}</span>
          )}
        </div>
        <div className={styles.cell}>
          <span className={styles.cellLabel}>Gain / share</span>
          <strong className={pnl.profitPerShare >= 0 ? styles.up : styles.down}>
            {pnl.profitPerShare >= 0 ? "+" : "−"}${Math.abs(pnl.profitPerShare).toFixed(2)}
          </strong>
        </div>
        <div className={styles.cell}>
          <span className={styles.cellLabel}>Cost basis</span>
          <strong>${pnl.costBasis.toFixed(2)}</strong>
        </div>
        <div className={styles.cell}>
          <span className={styles.cellLabel}>Cash you receive</span>
          <strong>${pnl.proceeds.toFixed(2)}</strong>
        </div>
      </div>

      <p className={styles.hint}>
        Proceeds are credited to your book cash wallet. Fill time: {formatExitTimestamp(new Date())} (paper).
      </p>

      <div className={styles.actions}>
        <button
          type="button"
          className="btn btn-sell"
          disabled={confirming || loading || livePrice <= 0 || !tradingAllowed}
          onClick={onConfirm}
        >
          {confirming ? "Selling…" : `Confirm sell · ${formatProfitSigned(pnl.profit)}`}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={confirming}>
          Cancel
        </button>
      </div>
    </div>
  );
}
