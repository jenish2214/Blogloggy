"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePortfolioStore } from "@/lib/store/portfolio";
import {
  PortfolioHoldingsTable,
  type PortfolioLiveTotals,
} from "@/components/portfolio/PortfolioHoldingsTable";
import { RealizedPnlTable } from "@/components/portfolio/RealizedPnlTable";
import { LiveBookPnLStrip } from "@/components/portfolio/LiveBookPnLStrip";
import { OrderHistoryTable } from "@/components/trading/OrderHistoryTable";
import { PnlStatementPanel } from "@/components/trading/PnlStatementPanel";
import {
  loadPortfolioSnapshot,
  INITIAL_CASH,
  type PortfolioSnapshot,
} from "@/lib/trading/portfolioSnapshot";
import { subscribeOrderPlaced } from "@/lib/trading/orderEvents";
import { useActiveBookStore } from "@/lib/store/activeBook";
import { exitAllPositions } from "@/lib/trading/exitAllPositions";
import { canPlaceMarketOrders, isUSEquityWeekend } from "@/lib/trading/marketHours";
import { MarketStatusBanner } from "@/components/portfolio/MarketStatusBanner";
import { HoldingsDetailSection } from "@/components/portfolio/HoldingsDetailSection";
import { EarningsCalendar } from "@/components/features/EarningsCalendar";
import { PortfolioHeatmap } from "@/components/features/PortfolioHeatmap";
import { SectorAllocationPanel } from "@/components/features/SectorAllocationPanel";
import tabStyles from "./portfolio.module.css";

type PortfolioTab = "overview" | "holdings";

function fmt(n: number | null | undefined, dec = 2) {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${fmt(n)}%`;
}

function fmtClock(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function AllocationBar({ label, pct, up }: { label: string; pct: number; up?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--accent-2)", width: 80, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 5, background: "var(--bg-elevated)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          width: `${Math.min(100, Math.max(0, pct))}%`,
          height: "100%",
          background: up === undefined ? "var(--accent)" : up ? "var(--up)" : "var(--down)",
          borderRadius: 3,
          transition: "width 0.4s ease",
        }} />
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-secondary)", width: 46, textAlign: "right" }}>
        {fmt(pct, 1)}%
      </span>
    </div>
  );
}

export default function PortfolioPage() {
  const activeBook = useActiveBookStore((s) => s.activeBook);
  const localStore = usePortfolioStore();
  const [snapshot, setSnapshot] = useState<PortfolioSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [exitConfirm, setExitConfirm] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [exitMsg, setExitMsg] = useState("");
  const [liveTotals, setLiveTotals] = useState<PortfolioLiveTotals | null>(null);
  const [pnlOpen, setPnlOpen] = useState(true);
  const [realizedOpen, setRealizedOpen] = useState(true);
  const [tab, setTab] = useState<PortfolioTab>("holdings");
  const [holdingsView, setHoldingsView] = useState<"cards" | "heatmap">("cards");
  const isWeekend = isUSEquityWeekend();

  const refreshSnapshot = useCallback(async () => {
    setLoading(true);
    const data = await loadPortfolioSnapshot();
    setSnapshot(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refreshSnapshot();
    return subscribeOrderPlaced(() => {
      void refreshSnapshot();
    });
  }, [refreshSnapshot, activeBook?.portfolioId]);

  const handleExitAll = async () => {
    setExiting(true);
    setExitMsg("");
    const res = await exitAllPositions();
    setExitMsg(res.message);
    setExiting(false);
    setExitConfirm(false);
    if (res.success && typeof window !== "undefined") {
      window.dispatchEvent(new Event("wallet-updated"));
    }
    await refreshSnapshot();
  };

  const displayPositions = liveTotals?.positions ?? snapshot?.positions ?? [];
  const displayOrders = snapshot?.orders ?? [];
  const cash = snapshot?.cash ?? localStore.cash;
  const startingCapital = snapshot?.startingCapital ?? INITIAL_CASH;
  const pnl = snapshot?.pnl;
  const useServerData = snapshot?.source === "supabase";

  const metrics = useMemo(() => {
    const investedValue = liveTotals?.investedValue ?? snapshot?.investedValue ?? 0;
    const costBasis = liveTotals?.costBasis ?? displayPositions.reduce((s, p) => s + p.costBasis, 0);
    const totalValue = liveTotals?.totalValue ?? snapshot?.totalValue ?? localStore.totalValue;
    const totalPnl = liveTotals?.totalPnl ?? snapshot?.totalPnl ?? localStore.totalPnl;
    const totalPnlPct = liveTotals?.totalPnlPct ?? snapshot?.totalPnlPct ?? localStore.totalPnlPct;
    const unrealizedPnl = liveTotals?.unrealizedPnl ?? snapshot?.unrealizedPnl ?? 0;
    const realizedPnl = pnl?.realizedPnl ?? 0;
    const hasLiveMarks = !!liveTotals?.lastUpdated && displayPositions.length > 0;

    return {
      investedValue,
      costBasis,
      totalValue,
      totalPnl,
      totalPnlPct,
      unrealizedPnl,
      realizedPnl,
      hasLiveMarks,
    };
  }, [liveTotals, snapshot, displayPositions, pnl, localStore]);

  const lastUpdatedLabel = fmtClock(liveTotals?.lastUpdated);

  if (loading && !snapshot) {
    return (
      <div className="page">
        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 20 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 36, borderRadius: 4 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 800, margin: 0, letterSpacing: "-0.03em" }}>
            Portfolio
          </h1>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", margin: "6px 0 0" }}>
            {activeBook
              ? (
                <>
                  <strong>{activeBook.accountType === "client" ? "Client" : "Personal"}</strong>
                  {" · "}
                  {activeBook.label}
                  {" — "}
                  real fills, live prices, and P&amp;L for this book only.
                </>
              )
              : "Select a book above."}
          </p>
          {useServerData && (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-muted)", margin: "8px 0 0" }}>
              {metrics.hasLiveMarks && lastUpdatedLabel
                ? `Live data · last price update ${lastUpdatedLabel}`
                : "Supabase book · prices refresh when you hold stocks"}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {displayPositions.length > 0 && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--live)", fontWeight: 600 }}>
              ● Live prices · 10s
            </span>
          )}
          {!useServerData && (
            <button
              onClick={() => setResetConfirm(true)}
              className="btn btn-ghost btn-sm"
            >
              Reset Portfolio
            </button>
          )}
          {useServerData && displayPositions.length > 0 && (
            <button
              type="button"
              className="btn btn-sell btn-sm"
              onClick={() => setExitConfirm(true)}
              disabled={exiting || !canPlaceMarketOrders()}
              title={!canPlaceMarketOrders() ? "Not available Saturday & Sunday" : undefined}
            >
              Exit all
            </button>
          )}
          {useServerData && (
            <button type="button" onClick={() => void refreshSnapshot()} className="btn btn-ghost btn-sm" disabled={loading}>
              {loading ? "Syncing…" : "Refresh"}
            </button>
          )}
          <Link href="/desk?section=wallet" className="btn btn-ghost btn-sm">Client wallet</Link>
          <Link href="/trade" className="btn btn-ghost btn-sm">Orders</Link>
        </div>
      </div>

      {exitMsg && (
        <div style={{ padding: "10px 14px", marginBottom: 12, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.85rem" }}>
          {exitMsg}
        </div>
      )}

      {exitConfirm && (
        <div style={{
          padding: "12px 16px", marginBottom: 16, background: "var(--down-soft)",
          border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
          fontSize: "0.82rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
        }}>
          <span>
            <strong>Exit all positions</strong> in {activeBook?.label ?? "this book"}? Every holding sells at live price; proceeds return to your book cash wallet.
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-sell btn-sm"
              disabled={exiting}
              onClick={() => void handleExitAll()}
            >
              {exiting ? "Exiting…" : "Confirm exit"}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setExitConfirm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <MarketStatusBanner />

      <EarningsCalendar ownedSymbols={displayPositions.map((p) => p.symbol)} compact />

      <nav className={tabStyles.tabs} aria-label="Portfolio sections">
        <button
          type="button"
          className={tab === "holdings" ? tabStyles.tabActive : tabStyles.tab}
          onClick={() => setTab("holdings")}
        >
          My Holdings
        </button>
        <button
          type="button"
          className={tab === "overview" ? tabStyles.tabActive : tabStyles.tab}
          onClick={() => setTab("overview")}
        >
          Overview &amp; History
        </button>
      </nav>

      {tab === "holdings" && displayPositions.length > 0 && (
        <SectorAllocationPanel positions={displayPositions} totalValue={metrics.totalValue} />
      )}

      {tab === "holdings" && (
        <div className={`card ${tabStyles.tabPanel}`} style={{ marginBottom: 20, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, alignItems: "flex-start" }}>
              <div>
                <span className="label-caps">Your holdings · buy history · live P&amp;L</span>
                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "8px 0 0" }}>
                  Each card shows where you bought, how much you spent, and live profit.
                </p>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" className={`btn btn-ghost btn-sm ${holdingsView === "cards" ? "btn-primary" : ""}`} onClick={() => setHoldingsView("cards")}>Cards</button>
                <button type="button" className={`btn btn-ghost btn-sm ${holdingsView === "heatmap" ? "btn-primary" : ""}`} onClick={() => setHoldingsView("heatmap")}>Heatmap</button>
              </div>
            </div>
          </div>
          {holdingsView === "heatmap" ? (
            <div style={{ padding: 16 }}>
              <PortfolioHeatmap positions={displayPositions} />
            </div>
          ) : (
            <HoldingsDetailSection
              positions={displayPositions}
              orders={displayOrders}
              cash={cash}
              frozen={isWeekend}
              onRefresh={() => void refreshSnapshot()}
            />
          )}
        </div>
      )}

      {tab === "overview" && (
        <div className={tabStyles.tabPanel}>
      {resetConfirm && (
        <div style={{
          padding: "12px 16px", marginBottom: 16, background: "var(--down-soft)",
          border: "1px solid rgba(248,113,113,0.25)", borderRadius: "var(--radius-sm)",
          fontFamily: "var(--font-sans)", fontSize: "0.82rem", color: "var(--down)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>
          <span>Reset to $100,000 starting capital? This cannot be undone.</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-sm" style={{ background: "var(--down)", color: "#fff", border: "none" }}
              onClick={() => { localStore.resetPortfolio(); setResetConfirm(false); }}>
              Reset
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setResetConfirm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <LiveBookPnLStrip
        metrics={{
          totalValue: metrics.totalValue,
          totalPnl: metrics.totalPnl,
          totalPnlPct: metrics.totalPnlPct,
          unrealizedPnl: metrics.unrealizedPnl,
          realizedPnl: metrics.realizedPnl,
          cash,
          costBasis: metrics.costBasis,
          investedValue: metrics.investedValue,
          startingCapital,
        }}
        bookLabel={activeBook?.label}
        lastUpdated={liveTotals?.lastUpdated}
        isLive={metrics.hasLiveMarks}
      />

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))",
        gap: 1, background: "var(--border)", border: "1px solid var(--border)",
        borderRadius: "var(--radius)", overflow: "hidden", marginBottom: 20,
      }}>
        {[
          { label: "Total value", value: `$${fmt(metrics.totalValue)}`, sub: metrics.hasLiveMarks ? "cash + live holdings" : "this book", accent: false },
          { label: "Total P&L", value: `${metrics.totalPnl >= 0 ? "+" : "−"}$${fmt(Math.abs(metrics.totalPnl))}`, sub: fmtPct(metrics.totalPnlPct) + " vs start", accent: true, positive: metrics.totalPnl >= 0 },
          { label: "Starting capital", value: `$${fmt(startingCapital)}`, sub: useServerData ? "Supabase book" : "paper default", accent: false },
          { label: "Unrealized P&L", value: `${metrics.unrealizedPnl >= 0 ? "+" : "−"}$${fmt(Math.abs(metrics.unrealizedPnl))}`, sub: metrics.hasLiveMarks ? "open positions · live" : `${displayPositions.length} position(s)`, accent: true, positive: metrics.unrealizedPnl >= 0 },
          { label: "Realized P&L", value: `${metrics.realizedPnl >= 0 ? "+" : "−"}$${fmt(Math.abs(metrics.realizedPnl))}`, sub: `${pnl?.sellCount ?? 0} sell fill(s)`, accent: true, positive: metrics.realizedPnl >= 0 },
          { label: "Cost basis", value: `$${fmt(metrics.costBasis)}`, sub: `market $${fmt(metrics.investedValue)}`, accent: false },
          { label: "Cash wallet", value: `$${fmt(cash)}`, sub: "available to trade", accent: false },
          { label: "Orders", value: String(snapshot?.orderCount ?? displayOrders.length), sub: "this book", accent: false },
        ].map(({ label, value, sub, accent, positive }) => (
          <div key={label} style={{ background: "var(--bg-surface)", padding: "14px 16px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{label}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "1rem", fontWeight: 700, color: accent ? (positive ? "var(--up)" : "var(--down)") : "var(--text-primary)" }}>{value}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      {pnl && (
        <div className="card" style={{ marginBottom: 20, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="label-caps">P&amp;L statement · real order data</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPnlOpen((v) => !v)}>
              {pnlOpen ? "Collapse" : "Expand"}
            </button>
          </div>
          {pnlOpen && (
            <PnlStatementPanel
              openingBalance={startingCapital}
              totalBuyVolume={pnl.totalBuyVolume}
              totalSellVolume={pnl.totalSellVolume}
              realizedPnl={metrics.realizedPnl}
              unrealizedPnl={metrics.unrealizedPnl}
              costBasis={metrics.costBasis}
              cash={cash}
              investedValue={metrics.investedValue}
              totalValue={metrics.totalValue}
              totalPnl={metrics.totalPnl}
              totalPnlPct={metrics.totalPnlPct}
              buyCount={pnl.buyCount}
              sellCount={pnl.sellCount}
              live={metrics.hasLiveMarks}
              compact
            />
          )}
        </div>
      )}

      <div className="card" style={{ marginBottom: 20, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span className="label-caps">
            Realized P&amp;L by trade ({pnl?.realizedTrades.length ?? 0})
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRealizedOpen((v) => !v)}>
            {realizedOpen ? "Collapse" : "Expand"}
          </button>
        </div>
        {realizedOpen && (
          <RealizedPnlTable trades={pnl?.realizedTrades ?? []} />
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)" }}>
            QUICK TABLE · live marks ({displayPositions.length})
          </span>
        </div>
        <PortfolioHoldingsTable
          initialPositions={snapshot?.positions ?? []}
          cash={cash}
          startingCapital={startingCapital}
          useServerData={useServerData}
          onTotalsChange={setLiveTotals}
          onRefreshRequest={() => void refreshSnapshot()}
        />
      </div>

      {displayPositions.length > 0 && metrics.totalValue > 0 && (
        <div className="card" style={{ marginBottom: 20, padding: 16 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
            PORTFOLIO ALLOCATION (live)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <AllocationBar label="CASH" pct={(cash / metrics.totalValue) * 100} />
            {displayPositions.map((pos) => (
              <AllocationBar
                key={pos.symbol}
                label={pos.symbol}
                pct={(pos.marketValue / metrics.totalValue) * 100}
                up={pos.unrealizedPnl >= 0}
              />
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span className="label-caps">
            Order History ({snapshot?.orderCount ?? displayOrders.length} placed)
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--up)", fontWeight: 600 }}>{pnl?.buyCount ?? 0} buys</span>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--down)", fontWeight: 600 }}>{pnl?.sellCount ?? 0} sells</span>
            <Link href="/trade" className="btn btn-ghost btn-sm">Full history →</Link>
          </div>
        </div>
        <OrderHistoryTable
          orders={displayOrders}
          showRowNumbers
          showPnl
          pnlSummary={{
            totalPnl: metrics.totalPnl,
            unrealizedPnl: metrics.unrealizedPnl,
            realizedPnl: metrics.realizedPnl,
          }}
          emptyMessage="No orders yet — trades appear here after each buy or sell."
        />
      </div>
        </div>
      )}

    </div>
  );
}
