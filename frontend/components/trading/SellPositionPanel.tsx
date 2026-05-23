"use client";
import { useState } from "react";
import Link from "next/link";
import { usePortfolioStore, type AssetClass } from "@/lib/store/portfolio";
import { executePlaceOrder } from "@/lib/trading/placeOrder";

export interface SellPosition {
  symbol: string;
  name: string;
  assetClass: string;
  qty: number;
  avgPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
}

interface Props {
  position: SellPosition;
  onClose: () => void;
  onSold: () => void;
}

function fmt(n: number, dec = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export function SellPositionPanel({ position, onClose, onSold }: Props) {
  const [qty, setQty] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const sellQty = parseFloat(qty) || 0;
  const proceeds = sellQty * position.currentPrice;
  const costBasis = sellQty * position.avgPrice;
  const realizedPnl = proceeds - costBasis;
  const isProfit = realizedPnl >= 0;

  const submitSell = async (rawAmount: number) => {
    const amount = Math.min(rawAmount, position.qty);
    if (amount <= 0 || amount > position.qty + 0.000001) {
      setResult({ success: false, message: `Enter 1–${position.qty} units` });
      return;
    }
    setLoading(true);
    setResult(null);
    const assetClass = position.assetClass as AssetClass;

    const res = await executePlaceOrder({
      symbol: position.symbol,
      name: position.name,
      assetClass,
      side: "sell",
      qty: amount,
      orderType: "market",
      currentPrice: position.currentPrice,
    });

    setResult(res);
    setLoading(false);
    if (res.success) {
      setTimeout(() => {
        onSold();
        onClose();
      }, 800);
    }
  };

  const step = position.assetClass === "crypto" || position.assetClass === "forex" ? 0.0001 : 1;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card anim-scale-in"
        style={{ width: "100%", maxWidth: 480, padding: 0, overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Exit / sell position
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", marginTop: 4 }}>
              {position.symbol}
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 2 }}>{position.name}</div>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--text-muted)" }}>×</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--border)", borderBottom: "1px solid var(--border)" }}>
          {[
            { label: "You Own", value: `${position.qty} units`, sub: position.assetClass },
            { label: "Avg Cost", value: `$${fmt(position.avgPrice)}`, sub: "cost basis / unit" },
            { label: "Live price", value: `$${fmt(position.currentPrice)}`, sub: "exit at this mark" },
            { label: "Unrealized P&L", value: `${position.unrealizedPnl >= 0 ? "+" : ""}$${fmt(Math.abs(position.unrealizedPnl))}`, sub: `${position.unrealizedPnlPct >= 0 ? "+" : ""}${fmt(position.unrealizedPnlPct)}%`, accent: position.unrealizedPnl >= 0 },
          ].map(({ label, value, sub, accent }) => (
            <div key={label} style={{ background: "var(--bg-surface)", padding: "14px 18px" }}>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: accent === undefined ? "var(--text-primary)" : accent ? "var(--up)" : "var(--down)", marginTop: 3 }}>{value}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: "20px 24px" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 8 }}>Quantity to sell</label>
          <input
            className="input"
            type="number"
            min={step}
            step={step}
            max={position.qty}
            placeholder={`Max ${position.qty}`}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            style={{ marginBottom: 10 }}
          />

          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ flex: 1 }}
                onClick={() => setQty(pct === 100 ? String(position.qty) : ((position.qty * pct) / 100).toFixed(position.assetClass === "crypto" || position.assetClass === "forex" ? 4 : 0))}
              >
                {pct}%
              </button>
            ))}
          </div>

          {sellQty > 0 && (
            <div style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Cash to wallet (live × qty)</span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>${fmt(proceeds)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Cost basis</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>${fmt(costBasis)}</span>
              </div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Realized P&L on this sale</span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: isProfit ? "var(--up)" : "var(--down)" }}>
                  {isProfit ? "+" : ""}${fmt(Math.abs(realizedPnl))}
                </span>
              </div>
            </div>
          )}

          {result && (
            <div style={{
              padding: "10px 14px", marginBottom: 12, borderRadius: "var(--radius-sm)",
              background: result.success ? "var(--up-soft)" : "var(--down-soft)",
              color: result.success ? "var(--up)" : "var(--down)",
              fontSize: "0.85rem",
            }}>
              {result.success ? "✓" : "✗"} {result.message}
              {result.success && (
                <div style={{ marginTop: 6 }}>
                  <Link href="/trade" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                    View in order history →
                  </Link>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            disabled={loading || !sellQty}
            onClick={() => submitSell(sellQty)}
            style={{
              width: "100%", padding: "12px", border: "none", borderRadius: "var(--radius-sm)",
              background: "var(--down)", color: "#fff", fontWeight: 700, fontSize: "0.95rem",
              cursor: loading || !sellQty ? "not-allowed" : "pointer",
              opacity: loading || !sellQty ? 0.6 : 1,
            }}
          >
            {loading ? "Processing…" : `Exit ${sellQty || "—"} ${position.symbol} → $${fmt(proceeds)} cash`}
          </button>
        </div>
      </div>
    </div>
  );
}
