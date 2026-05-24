"use client";
import { useState } from "react";
import Link from "next/link";
import { usePortfolioStore, type AssetClass } from "@/lib/store/portfolio";
import { executePlaceOrder } from "@/lib/trading/placeOrder";
import {
  canPlaceMarketOrders,
  getTradingBlockReason,
} from "@/lib/trading/marketHours";
import {
  OrderConfirmModal,
  type OrderConfirmDetails,
} from "@/components/trading/OrderConfirmModal";

interface Props {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  currentPrice: number;
  defaultSide?: "buy" | "sell";
  onSuccess?: (msg: string) => void;
}

export function OrderForm({ symbol, name, assetClass, currentPrice, defaultSide = "buy", onSuccess }: Props) {
  const [side, setSide] = useState<"buy" | "sell">(defaultSide);
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [qty, setQty] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<OrderConfirmDetails | null>(null);

  const { cash, positions } = usePortfolioStore();
  const marketCtx = { symbol, assetClass };
  const tradingBlocked = !canPlaceMarketOrders(marketCtx);
  const blockReason = getTradingBlockReason(marketCtx);
  const fillPrice = orderType === "limit" && limitPrice ? parseFloat(limitPrice) : currentPrice;
  const total = parseFloat(qty) * fillPrice || 0;
  const position = positions[symbol];
  const sellQty = parseFloat(qty) || 0;
  const realizedPnl = side === "sell" && position ? (fillPrice - position.avgPrice) * sellQty : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = parseFloat(qty);
    if (!q || q <= 0) {
      setResult({ success: false, message: "Enter a valid quantity" });
      return;
    }
    if (tradingBlocked) {
      setResult({ success: false, message: blockReason ?? "Market closed" });
      return;
    }

    const cashAfter = side === "buy" ? cash - total : cash + total;
    setPendingConfirm({
      symbol,
      name,
      side,
      orderType,
      qty: q,
      fillPrice,
      total,
      cashAfter,
      realizedPnl: side === "sell" && position ? realizedPnl : undefined,
    });
    setConfirmOpen(true);
  };

  const handleConfirmOrder = async () => {
    if (!pendingConfirm) return;
    const q = pendingConfirm.qty;
    setSubmitting(true);
    const res = await executePlaceOrder({
      symbol,
      name,
      assetClass,
      side,
      qty: q,
      orderType,
      currentPrice,
      limitPrice: orderType === "limit" ? parseFloat(limitPrice) : undefined,
    });
    setSubmitting(false);
    setConfirmOpen(false);
    setPendingConfirm(null);
    setResult(res);
    if (res.success) {
      setQty("");
      onSuccess?.(res.message);
    }
  };

  return (
    <>
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {tradingBlocked && blockReason && (
        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--down)", fontFamily: "var(--font-mono)" }}>
          {blockReason}
        </p>
      )}
      {/* Buy / Sell toggle */}
      <div style={{ display: "flex", gap: 1 }}>
        <button
          type="button"
          onClick={() => setSide("buy")}
          style={{
            flex: 1,
            padding: "8px 0",
            fontFamily: "var(--font-mono)",
            fontSize: "0.78rem",
            fontWeight: 600,
            letterSpacing: "0.06em",
            background: side === "buy" ? "var(--up-soft)" : "var(--bg-surface-2)",
            color: side === "buy" ? "var(--up)" : "var(--text-muted)",
            border: `1px solid ${side === "buy" ? "rgba(52,211,153,0.3)" : "var(--border)"}`,
            borderRadius: "var(--radius-sm) 0 0 var(--radius-sm)",
            cursor: "pointer",
          }}
        >
          BUY
        </button>
        <button
          type="button"
          onClick={() => setSide("sell")}
          style={{
            flex: 1,
            padding: "8px 0",
            fontFamily: "var(--font-mono)",
            fontSize: "0.78rem",
            fontWeight: 600,
            letterSpacing: "0.06em",
            background: side === "sell" ? "var(--down-soft)" : "var(--bg-surface-2)",
            color: side === "sell" ? "var(--down)" : "var(--text-muted)",
            border: `1px solid ${side === "sell" ? "rgba(248,113,113,0.3)" : "var(--border)"}`,
            borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
            cursor: "pointer",
          }}
        >
          SELL
        </button>
      </div>

      {/* Order type */}
      <div style={{ display: "flex", gap: 1 }}>
        {(["market", "limit"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setOrderType(t)}
            style={{
              flex: 1,
              padding: "5px 0",
              fontFamily: "var(--font-mono)",
              fontSize: "0.68rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              background: orderType === t ? "var(--accent-soft)" : "transparent",
              color: orderType === t ? "var(--accent-2)" : "var(--text-muted)",
              border: `1px solid ${orderType === t ? "rgba(99,102,241,0.3)" : "var(--border)"}`,
              borderRadius: t === "market" ? "var(--radius-sm) 0 0 var(--radius-sm)" : "0 var(--radius-sm) var(--radius-sm) 0",
              cursor: "pointer",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Price display */}
      <div style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "8px 12px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {orderType === "market" ? "Market Price" : "Price"}
        </div>
        {orderType === "market" ? (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "1rem", color: "var(--text-primary)", marginTop: 2 }}>
            ${currentPrice?.toFixed(currentPrice < 1 ? 4 : 2)}
          </div>
        ) : (
          <input
            className="input"
            type="number"
            step="0.01"
            min="0.01"
            placeholder={currentPrice?.toFixed(2)}
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            style={{ background: "transparent", border: "none", padding: "2px 0", fontSize: "1rem", boxShadow: "none" }}
          />
        )}
      </div>

      {/* Quantity */}
      <div>
        <label style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 4 }}>
          Quantity
        </label>
        <input
          className="input"
          type="number"
          min="0.0001"
          step={assetClass === "crypto" ? "0.0001" : "1"}
          placeholder="0"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
      </div>

      {/* Quick quantity buttons */}
      {side === "buy" ? (
        <div style={{ display: "flex", gap: 4 }}>
          {[25, 50, 75, 100].map((pct) => (
            <button
              key={pct}
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ flex: 1 }}
              onClick={() => {
                const maxQty = cash / (fillPrice || 1);
                setQty(((maxQty * pct) / 100).toFixed(assetClass === "crypto" || assetClass === "forex" ? 4 : 0));
              }}
            >
              {pct}%
            </button>
          ))}
        </div>
      ) : position && (
        <div style={{ display: "flex", gap: 4 }}>
          {[25, 50, 75, 100].map((pct) => (
            <button
              key={pct}
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ flex: 1 }}
              onClick={() => setQty(pct === 100 ? String(position.qty) : ((position.qty * pct) / 100).toFixed(assetClass === "crypto" || assetClass === "forex" ? 4 : 0))}
            >
              Sell {pct}%
            </button>
          ))}
        </div>
      )}

      {/* Order summary */}
      {total > 0 && (
        <div style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: side === "sell" && position ? 8 : 0 }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {side === "buy" ? "Total Cost" : "Proceeds"}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.92rem", color: "var(--text-primary)", marginTop: 2 }}>
                ${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {side === "buy" ? "Available Cash" : "Your Position"}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: 2 }}>
                {side === "buy"
                  ? `$${cash.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : `${position?.qty ?? 0} units · avg $${position?.avgPrice?.toFixed(2) ?? "—"}`}
              </div>
            </div>
          </div>
          {side === "sell" && position && sellQty > 0 && (
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Est. realized P&L</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: realizedPnl >= 0 ? "var(--up)" : "var(--down)" }}>
                {realizedPnl >= 0 ? "+" : ""}${Math.abs(realizedPnl).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || tradingBlocked}
        style={{
          padding: "10px",
          fontFamily: "var(--font-mono)",
          fontSize: "0.82rem",
          fontWeight: 600,
          letterSpacing: "0.06em",
          background: side === "buy" ? "var(--up-soft)" : "var(--down-soft)",
          color: side === "buy" ? "var(--up)" : "var(--down)",
          border: `1px solid ${side === "buy" ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
          borderRadius: "var(--radius-sm)",
          cursor: "pointer",
          textTransform: "uppercase",
        }}
      >
        {submitting ? "Placing order…" : `${side === "buy" ? "▲" : "▼"} Place ${orderType.toUpperCase()} ${side.toUpperCase()} Order`}
      </button>

      {/* Result */}
      {result && (
        <div
          style={{
            padding: "8px 12px",
            background: result.success ? "var(--up-soft)" : "var(--down-soft)",
            border: `1px solid ${result.success ? "var(--up-border)" : "var(--down-border)"}`,
            borderRadius: "var(--radius-sm)",
            fontFamily: "var(--font-mono)",
            fontSize: "0.75rem",
            color: result.success ? "var(--up)" : "var(--down)",
          }}
        >
          {result.success ? "✓" : "✗"} {result.message}
          {result.success && (
            <div style={{ marginTop: 6 }}>
              <Link href="/trade" style={{ color: "var(--text-primary)", fontWeight: 600, textDecoration: "underline" }}>
                View in order history →
              </Link>
            </div>
          )}
        </div>
      )}
    </form>

    <OrderConfirmModal
      open={confirmOpen}
      details={pendingConfirm}
      submitting={submitting}
      onConfirm={() => void handleConfirmOrder()}
      onCancel={() => {
        setConfirmOpen(false);
        setPendingConfirm(null);
      }}
    />
    </>
  );
}
