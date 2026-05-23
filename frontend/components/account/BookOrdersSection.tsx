"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ordersApi } from "@/lib/api";
import { useActiveBookStore } from "@/lib/store/activeBook";
import { OrderHistoryTable } from "@/components/trading/OrderHistoryTable";
import { BookScopeBanner } from "@/components/wealth/BookScopeBanner";
import { LiveBookPnLStrip } from "@/components/portfolio/LiveBookPnLStrip";
import { useBookPnL } from "@/lib/hooks/useBookPnL";
import { computeOrderStats, type OrderRecord } from "@/lib/trading/orders";
import { mapRawServerOrders, mergeOrderHistory } from "@/lib/trading/mergeOrders";
import { subscribeOrderPlaced } from "@/lib/trading/orderEvents";

function fmt(n: number, dec = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtSigned(n: number) {
  return `${n >= 0 ? "+" : "−"}$${fmt(Math.abs(n))}`;
}

export function BookOrdersSection() {
  const activeBook = useActiveBookStore((s) => s.activeBook);
  const { metrics, loading: pnlLoading, hasPositions } = useBookPnL(!!activeBook);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [filter, setFilter] = useState<"all" | "buy" | "sell">("all");
  const [loading, setLoading] = useState(true);
  const [truncated, setTruncated] = useState(false);
  const [dbTotal, setDbTotal] = useState<number | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    const bookScoped = !!activeBook?.portfolioId;
    const bookParams = activeBook
      ? { portfolioId: activeBook.portfolioId, clientId: activeBook.clientId }
      : undefined;
    try {
      const data = await ordersApi.getAll(bookParams);
      const serverOrders = mapRawServerOrders((data.orders ?? []) as Record<string, unknown>[]);
      setOrders(mergeOrderHistory(serverOrders, [], bookScoped));
      setDbTotal(data.stats.total);
      setTruncated(data.stats.truncated);
    } catch {
      setOrders([]);
      setDbTotal(null);
      setTruncated(false);
    }
    setLoading(false);
  }, [activeBook?.portfolioId, activeBook?.clientId]);

  useEffect(() => {
    void loadOrders();
    return subscribeOrderPlaced(() => void loadOrders());
  }, [loadOrders]);

  useEffect(() => {
    const onWallet = () => void loadOrders();
    window.addEventListener("wallet-updated", onWallet);
    return () => window.removeEventListener("wallet-updated", onWallet);
  }, [loadOrders]);

  const stats = computeOrderStats(orders);

  return (
    <div>
      <BookScopeBanner compact />

      {metrics && !pnlLoading && (
        <LiveBookPnLStrip
          metrics={metrics}
          bookLabel={activeBook?.label}
          isLive={hasPositions}
        />
      )}

      {pnlLoading && !metrics && (
        <div style={{ marginBottom: 16, padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Loading P&amp;L…
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 10,
          marginBottom: 14,
        }}
      >
        {[
          { label: "Orders", value: dbTotal != null ? String(dbTotal) : String(stats.total) },
          { label: "Buys", value: String(stats.buyCount), color: "var(--up)" },
          { label: "Sells", value: String(stats.sellCount), color: "var(--down)" },
          { label: "Volume", value: `$${fmt(stats.totalVolume)}` },
          ...(metrics
            ? [
                {
                  label: "Realized P&L",
                  value: fmtSigned(metrics.realizedPnl),
                  color: metrics.realizedPnl >= 0 ? "var(--up)" : "var(--down)",
                },
                {
                  label: "Unrealized",
                  value: fmtSigned(metrics.unrealizedPnl),
                  color: metrics.unrealizedPnl >= 0 ? "var(--up)" : "var(--down)",
                },
              ]
            : []),
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card" style={{ padding: "10px 12px" }}>
            <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
              {label}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "1rem", fontWeight: 700, color: color ?? "var(--text-primary)" }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {truncated && (
        <p style={{ fontSize: "0.78rem", color: "var(--warn)", marginBottom: 12 }}>
          Showing recent {orders.length} of {dbTotal} orders (saved in Supabase).
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        {(["all", "buy", "sell"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-ghost"}`}
          >
            {f === "all" ? `All (${stats.total})` : f === "buy" ? `+ Buys (${stats.buyCount})` : `− Sells (${stats.sellCount})`}
          </button>
        ))}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void loadOrders()} disabled={loading}>
          {loading ? "…" : "Refresh"}
        </button>
        <Link href="/portfolio" className="btn btn-ghost btn-sm">
          Portfolio P&amp;L →
        </Link>
      </div>

      <OrderHistoryTable
        orders={orders}
        filter={filter}
        loading={loading}
        showRowNumbers
        showPnl
        pnlSummary={
          metrics
            ? {
                totalPnl: metrics.totalPnl,
                unrealizedPnl: metrics.unrealizedPnl,
                realizedPnl: metrics.realizedPnl,
              }
            : undefined
        }
        emptyMessage={
          activeBook
            ? `No orders for ${activeBook.label} yet.`
            : "Select a book in the desk bar to see your orders."
        }
      />
    </div>
  );
}
