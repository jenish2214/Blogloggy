"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  filterOrdersBySide,
  sortOrdersNewestFirst,
  type OrderRecord,
} from "@/lib/trading/orders";
import { buildOrderPnlMap } from "@/lib/trading/orderPnlById";

function fmt(n: number, dec = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtSigned(n: number) {
  return `${n >= 0 ? "+" : "−"}$${fmt(Math.abs(n))}`;
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export interface OrderPnlSummary {
  totalPnl: number;
  unrealizedPnl: number;
  realizedPnl: number;
}

export interface OrderHistoryTableProps {
  orders: OrderRecord[];
  filter?: "all" | "buy" | "sell";
  loading?: boolean;
  showRowNumbers?: boolean;
  compact?: boolean;
  emptyMessage?: string;
  /** Show realized P&L column on sell rows (FIFO from order history). */
  showPnl?: boolean;
  pnlSummary?: OrderPnlSummary;
}

export function OrderHistoryTable({
  orders,
  filter = "all",
  loading = false,
  showRowNumbers = true,
  compact = false,
  emptyMessage = "No orders yet.",
  showPnl = false,
  pnlSummary,
}: OrderHistoryTableProps) {
  const sorted = sortOrdersNewestFirst(orders);
  const filtered = filterOrdersBySide(sorted, filter);
  const total = orders.length;

  const pnlByOrderId = useMemo(
    () => (showPnl ? buildOrderPnlMap(orders) : new Map()),
    [orders, showPnl]
  );

  const sellRealizedTotal = useMemo(() => {
    if (!showPnl) return 0;
    let sum = 0;
    for (const o of filtered) {
      if (o.side !== "sell") continue;
      const row = pnlByOrderId.get(o.id);
      if (row) sum += row.realizedPnl;
    }
    return sum;
  }, [filtered, pnlByOrderId, showPnl]);

  if (loading) {
    return (
      <div style={{ padding: compact ? 24 : 40 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 36, marginBottom: 6, borderRadius: 4 }} />
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div style={{ padding: compact ? 32 : 48, textAlign: "center", color: "var(--text-muted)" }}>
        <p>{emptyMessage}</p>
        <Link href="/trade" className="btn btn-primary btn-sm" style={{ marginTop: 12, display: "inline-flex" }}>
          Start Trading →
        </Link>
      </div>
    );
  }

  const headers = [
    ...(showRowNumbers ? ["#"] : []),
    "Date & Time",
    "Symbol",
    "Side",
    ...(compact ? [] : ["Asset"]),
    "Type",
    "Qty",
    "Fill Price",
    "Total Value",
    ...(showPnl ? ["Realized P&L", "Cost basis"] : []),
    ...(compact ? [] : ["Status"]),
  ];

  return (
    <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
      {(showPnl && pnlSummary) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 1,
            background: "var(--border)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {[
            { label: "Total P&L", value: pnlSummary.totalPnl, accent: true },
            { label: "Unrealized", value: pnlSummary.unrealizedPnl, accent: true },
            { label: "Realized (all sells)", value: pnlSummary.realizedPnl, accent: true },
            ...(filter === "sell" || filter === "all"
              ? [{ label: "Realized (shown)", value: sellRealizedTotal, accent: true }]
              : []),
          ].map(({ label, value, accent }) => (
            <div
              key={label}
              style={{ background: "var(--bg-surface)", padding: "12px 14px" }}
            >
              <div
                style={{
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--text-muted)",
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  marginTop: 4,
                  color: accent ? (value >= 0 ? "var(--up)" : "var(--down)") : "var(--text-primary)",
                }}
              >
                {fmtSigned(value)}
              </div>
            </div>
          ))}
        </div>
      )}

      {!compact && total > 0 && (
        <div
          style={{
            padding: "10px 16px",
            borderBottom: "1px solid var(--border-subtle)",
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            background: "var(--bg-surface-2)",
          }}
        >
          Showing <strong style={{ color: "var(--text-primary)" }}>{filtered.length}</strong>
          {filter !== "all" ? ` ${filter} orders` : " orders"}
          {filter === "all" && total !== filtered.length ? ` of ${total}` : ""}
          {" · "}
          Newest first
          {showPnl && " · P&L on sells from your fill history"}
        </div>
      )}

      <table className="data-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((o) => {
            const globalIdx = sorted.findIndex((x) => x.id === o.id);
            const rowNum = total - globalIdx;
            const pnlRow = o.side === "sell" ? pnlByOrderId.get(o.id) : undefined;

            return (
              <tr key={o.id}>
                {showRowNumbers && (
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    {rowNum}
                  </td>
                )}
                <td style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{fmtDate(o.createdAt)}</td>
                <td>
                  <Link
                    href={`/trade?symbol=${encodeURIComponent(o.symbol)}`}
                    style={{ fontWeight: 700, color: "var(--text-primary)", textDecoration: "none" }}
                  >
                    {o.symbol}
                  </Link>
                </td>
                <td>
                  <span className={o.side === "buy" ? "badge badge-up" : "badge badge-down"}>
                    {o.side.toUpperCase()}
                  </span>
                </td>
                {!compact && (
                  <td>
                    <span className="badge badge-neutral">{o.assetClass}</span>
                  </td>
                )}
                <td style={{ textTransform: "uppercase", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {o.orderType}
                </td>
                <td className="num">{o.qty}</td>
                <td className="num">${fmt(o.filledPrice)}</td>
                <td className="num">${fmt(o.totalValue)}</td>
                {showPnl && (
                  <>
                    <td
                      className="num"
                      style={{
                        fontWeight: 700,
                        color:
                          o.side === "buy"
                            ? "var(--text-muted)"
                            : pnlRow
                              ? pnlRow.realizedPnl >= 0
                                ? "var(--up)"
                                : "var(--down)"
                              : "var(--text-muted)",
                      }}
                    >
                      {o.side === "buy" ? "—" : pnlRow ? fmtSigned(pnlRow.realizedPnl) : "—"}
                    </td>
                    <td className="num" style={{ color: "var(--text-secondary)" }}>
                      {o.side === "buy" ? "—" : pnlRow ? `$${fmt(pnlRow.costBasis)}` : "—"}
                    </td>
                  </>
                )}
                {!compact && (
                  <td>
                    <span className="badge badge-accent">{o.status}</span>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
