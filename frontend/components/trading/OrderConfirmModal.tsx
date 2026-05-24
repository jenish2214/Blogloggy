"use client";

import type { AssetClass, OrderType, Side } from "@/lib/store/portfolio";
import styles from "./OrderConfirmModal.module.css";

export interface OrderConfirmDetails {
  symbol: string;
  name: string;
  side: Side;
  orderType: OrderType;
  qty: number;
  fillPrice: number;
  total: number;
  cashAfter: number;
  realizedPnl?: number;
}

interface Props {
  open: boolean;
  details: OrderConfirmDetails | null;
  submitting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function OrderConfirmModal({ open, details, submitting, onConfirm, onCancel }: Props) {
  if (!open || !details) return null;

  const { symbol, name, side, orderType, qty, fillPrice, total, cashAfter, realizedPnl } = details;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="order-confirm-title">
      <div className={styles.modal}>
        <h2 id="order-confirm-title" className={styles.title}>
          Confirm order
        </h2>
        <p className={styles.subtitle}>
          {name} ({symbol})
        </p>

        <dl className={styles.grid}>
          <dt>Action</dt>
          <dd className={side === "buy" ? styles.buy : styles.sell}>{side.toUpperCase()}</dd>
          <dt>Order type</dt>
          <dd>{orderType.toUpperCase()}</dd>
          <dt>Quantity</dt>
          <dd>{qty}</dd>
          <dt>Price</dt>
          <dd>${fillPrice.toFixed(fillPrice < 1 ? 4 : 2)}</dd>
          <dt>{side === "buy" ? "Estimated cost" : "Estimated proceeds"}</dt>
          <dd>${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd>
          <dt>Cash after trade</dt>
          <dd>${cashAfter.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd>
          {side === "sell" && realizedPnl != null && (
            <>
              <dt>Est. realized P&L</dt>
              <dd className={realizedPnl >= 0 ? styles.buy : styles.sell}>
                {realizedPnl >= 0 ? "+" : "−"}${Math.abs(realizedPnl).toFixed(2)}
              </dd>
            </>
          )}
        </dl>

        <p className={styles.note}>Paper trade — no real money. This cannot be undone.</p>

        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            className={side === "buy" ? styles.confirmBuy : styles.confirmSell}
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? "Placing…" : "Confirm order"}
          </button>
        </div>
      </div>
    </div>
  );
}
