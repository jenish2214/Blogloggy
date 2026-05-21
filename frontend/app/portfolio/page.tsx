"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePortfolioStore } from "@/lib/store/portfolio";
import { marketApi } from "@/lib/api";

function fmt(n: number, dec = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export default function PortfolioPage() {
  const { cash, positions, orders, totalValue, totalPnl, totalPnlPct, updatePrices, resetPortfolio } = usePortfolioStore();
  const [loading, setLoading] = useState(false);

  const positionList = Object.values(positions);
  const invested = positionList.reduce((s, p) => s + p.marketValue, 0);

  // Refresh live prices
  useEffect(() => {
    if (!positionList.length) return;
    const syms = positionList.map((p) => p.symbol);
    setLoading(true);
    marketApi.getQuotes(syms).then(({ quotes }) => {
      const prices: Record<string, number> = {};
      quotes.forEach((q) => { if (q.price) prices[q.symbol] = q.price; });
      updatePrices(prices);
      setLoading(false);
    }).catch(() => setLoading(false));
    const id = setInterval(async () => {
      const { quotes } = await marketApi.getQuotes(syms).catch(() => ({ quotes: [] }));
      const prices: Record<string, number> = {};
      quotes.forEach((q: { symbol: string; price: number }) => { if (q.price) prices[q.symbol] = q.price; });
      updatePrices(prices);
    }, 20_000);
    return () => clearInterval(id);
  }, [positionList.length]);

  const allPnl = positionList.reduce((s, p) => s + p.unrealizedPnl, 0);

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>PAPER PORTFOLIO</div>
          <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "1.4rem", fontWeight: 600, color: "var(--text-primary)" }}>Portfolio</h1>
        </div>
        <button
          onClick={() => { if (confirm("Reset portfolio to $100,000 starting capital?")) resetPortfolio(); }}
          className="btn btn-ghost btn-sm"
        >
          Reset Portfolio
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 1, background: "var(--border)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden", marginBottom: 20 }}>
        {[
          { label: "Total Value", value: `$${fmt(totalValue)}`, sub: "portfolio + cash", accent: false },
          { label: "Total P&L", value: `${totalPnl >= 0 ? "+" : ""}$${fmt(Math.abs(totalPnl))}`, sub: `${totalPnl >= 0 ? "+" : ""}${fmt(totalPnlPct)}%`, accent: true, positive: totalPnl >= 0 },
          { label: "Cash Available", value: `$${fmt(cash)}`, sub: `${fmt((cash / totalValue) * 100)}% of portfolio`, accent: false },
          { label: "Invested", value: `$${fmt(invested)}`, sub: `${positionList.length} position${positionList.length !== 1 ? "s" : ""}`, accent: false },
          { label: "Unrealized P&L", value: `${allPnl >= 0 ? "+" : ""}$${fmt(Math.abs(allPnl))}`, sub: invested > 0 ? `${fmt((allPnl / invested) * 100)}%` : "—", accent: true, positive: allPnl >= 0 },
          { label: "Starting Capital", value: "$100,000.00", sub: "paper money", accent: false },
        ].map(({ label, value, sub, accent, positive }) => (
          <div key={label} style={{ background: "var(--bg-surface)", padding: "14px 16px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{label}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "1rem", fontWeight: 600, color: accent ? (positive ? "var(--up)" : "var(--down)") : "var(--text-primary)" }}>{value}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Positions */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)" }}>
            OPEN POSITIONS
          </span>
          {loading && <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)" }}>Refreshing prices...</span>}
        </div>
        {positionList.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
            <div style={{ marginBottom: 8, fontSize: "1.5rem" }}>📭</div>
            No open positions.{" "}
            <Link href="/trade" style={{ color: "var(--accent-2)", textDecoration: "none" }}>Start trading →</Link>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  {["Symbol", "Name", "Type", "Qty", "Avg Price", "Current", "Mkt Value", "Unrealized P&L", "Return %", "Action"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positionList.map((pos) => (
                  <tr key={pos.symbol}>
                    <td><span style={{ fontWeight: 600, color: "var(--accent-2)", fontFamily: "var(--font-mono)" }}>{pos.symbol}</span></td>
                    <td style={{ color: "var(--text-secondary)", fontFamily: "var(--font-sans)", fontSize: "0.78rem", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>{pos.name}</td>
                    <td><span className="badge badge-neutral">{pos.assetClass}</span></td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{pos.qty}</td>
                    <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>${fmt(pos.avgPrice)}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 500 }}>${fmt(pos.currentPrice)}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 500 }}>${fmt(pos.marketValue)}</td>
                    <td style={{ fontFamily: "var(--font-mono)", color: pos.unrealizedPnl >= 0 ? "var(--up)" : "var(--down)" }}>
                      {pos.unrealizedPnl >= 0 ? "+" : ""}${fmt(Math.abs(pos.unrealizedPnl))}
                    </td>
                    <td>
                      <span className={pos.unrealizedPnlPct >= 0 ? "badge badge-up" : "badge badge-down"}>
                        {pos.unrealizedPnlPct >= 0 ? "+" : ""}{fmt(pos.unrealizedPnlPct)}%
                      </span>
                    </td>
                    <td>
                      <Link href={`/trade?symbol=${pos.symbol}`} className="btn btn-ghost btn-sm">Manage</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Allocation */}
      {positionList.length > 0 && (
        <div className="card" style={{ marginBottom: 20, padding: 16 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>PORTFOLIO ALLOCATION</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Cash */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-secondary)", width: 80, flexShrink: 0 }}>CASH</span>
              <div style={{ flex: 1, height: 6, background: "var(--bg-elevated)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${(cash / totalValue) * 100}%`, height: "100%", background: "var(--accent)", borderRadius: 3 }} />
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-secondary)", width: 50, textAlign: "right" }}>
                {fmt((cash / totalValue) * 100)}%
              </span>
            </div>
            {positionList.map((pos) => (
              <div key={pos.symbol} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--accent-2)", width: 80, flexShrink: 0 }}>{pos.symbol}</span>
                <div style={{ flex: 1, height: 6, background: "var(--bg-elevated)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${(pos.marketValue / totalValue) * 100}%`, height: "100%", background: pos.unrealizedPnl >= 0 ? "var(--up)" : "var(--down)", borderRadius: 3, opacity: 0.7 }} />
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-secondary)", width: 50, textAlign: "right" }}>
                  {fmt((pos.marketValue / totalValue) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trade history */}
      <div className="card">
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)" }}>
          TRADE HISTORY ({orders.length})
        </div>
        {orders.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
            No trades yet.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  {["Time", "Symbol", "Side", "Type", "Qty", "Fill Price", "Total", "Status"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 50).map((o) => (
                  <tr key={o.id}>
                    <td style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>
                      {new Date(o.createdAt).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 600, color: "var(--accent-2)", fontFamily: "var(--font-mono)" }}>{o.symbol}</td>
                    <td>
                      <span className={o.side === "buy" ? "badge badge-up" : "badge badge-down"}>
                        {o.side.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>{o.orderType}</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{o.qty}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 500 }}>${fmt(o.filledPrice)}</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>${fmt(o.qty * o.filledPrice)}</td>
                    <td><span className="badge badge-accent">{o.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
