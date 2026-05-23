"use client";
import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { marketApi, watchlistApi, type Quote } from "@/lib/api";
import { PriceChart } from "@/components/trading/PriceChart";
import { OrderForm } from "@/components/trading/OrderForm";
import { AlgoSignals } from "@/components/trading/AlgoSignals";
import type { AssetClass } from "@/lib/store/portfolio";
import { useActiveBookStore } from "@/lib/store/activeBook";
import { BookOrdersSection } from "@/components/account/BookOrdersSection";
import tradeStyles from "./trade.module.css";

// ── Default watchlist symbols ─────────────────────────────────────────────────
const DEFAULT_SYMBOLS = [
  "AAPL", "TSLA", "NVDA", "MSFT", "AMZN", "GOOGL", "META", "AMD",
  "BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD",
];

// ── Formatters ─────────────────────────────────────────────────────────────────
function fmt(n: number | null | undefined, dec = 2) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtLarge(n: number | null | undefined) {
  if (n == null) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  return `$${(n / 1e6).toFixed(1)}M`;
}
function fmtVol(v: number | null | undefined) {
  if (v == null) return "—";
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  return `${(v / 1e3).toFixed(0)}K`;
}

// ── Stat cell ─────────────────────────────────────────────────────────────────
function StatCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ background: "var(--bg-surface)", padding: "10px 14px" }}>
      <div style={{
        fontFamily: "var(--font-mono)", fontSize: "0.6rem",
        color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.09em",
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "var(--font-mono)", fontSize: "0.88rem",
        color: accent ? "var(--accent-2)" : "var(--text-primary)",
        marginTop: 3, fontWeight: 500,
      }}>
        {value}
      </div>
    </div>
  );
}

// ── Algorithm glossary ─────────────────────────────────────────────────────────
const ALGO_GLOSSARY = [
  {
    term: "RSI (14)",
    formula: "RSI = 100 − 100/(1 + AvgGain/AvgLoss)",
    desc: "Momentum oscillator. Values below 35 suggest oversold conditions — price may bounce. Above 65 suggests overbought — price may pull back.",
  },
  {
    term: "SMA Cross (20/50)",
    formula: "Signal = SMA₂₀ / SMA₅₀",
    desc: "When the 20-day average crosses above the 50-day (golden cross) institutional buyers typically dominate. The reverse (death cross) signals distribution.",
  },
  {
    term: "MACD (12/26/9)",
    formula: "MACD = EMA₁₂ − EMA₂₆, Signal = EMA₉(MACD)",
    desc: "Trend-following momentum. When MACD line crosses above its signal line, momentum is shifting bullish. Histogram shows the divergence magnitude.",
  },
  {
    term: "Bollinger %B",
    formula: "%B = (Price − Lower) / (Upper − Lower) × 100",
    desc: "Measures price position within 2σ bands. Below 25% is statistically cheap relative to recent range; above 75% is extended. Bands also widen during volatility expansions.",
  },
];

// ── Main trade component ───────────────────────────────────────────────────────

function TradeInner() {
  const activeBook = useActiveBookStore((s) => s.activeBook);
  const params = useSearchParams();
  const paramSymbol = params.get("symbol")?.toUpperCase() ?? "";
  const paramName = params.get("name") ?? "";
  const paramClass = (params.get("class") as AssetClass) ?? "stock";

  const [selected, setSelected] = useState(paramSymbol || "AAPL");
  const [selectedName, setSelectedName] = useState(paramName || "Apple Inc.");
  const [assetClass, setAssetClass] = useState<AssetClass>(paramClass || "stock");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; name: string; type: string }>>([]);
  const [notification, setNotification] = useState("");
  const [showAlgo, setShowAlgo] = useState(true);
  const [showGlossary, setShowGlossary] = useState(false);
  const [watchSymbols, setWatchSymbols] = useState<string[]>(DEFAULT_SYMBOLS);

  useEffect(() => {
    watchlistApi
      .getAll()
      .then(({ items }) => {
        if (items.length > 0) {
          setWatchSymbols(items.map((i) => i.symbol));
        }
      })
      .catch(() => {
        /* guest or offline — keep defaults */
      });
  }, []);

  // Load watchlist quotes
  const loadQuotes = useCallback(async () => {
    const { quotes: q } = await marketApi.getQuotes(watchSymbols);
    const valid = q.filter((qt) => !qt.error && qt.price != null);
    setQuotes(valid);
    const sel = valid.find((qt) => qt.symbol === selected);
    if (sel) {
      setSelectedQuote(sel);
      if (!paramName) setSelectedName(sel.name ?? sel.symbol);
    }
    setLoading(false);
  }, [selected, paramName, watchSymbols]);

  useEffect(() => {
    loadQuotes();
    const id = setInterval(loadQuotes, 15_000);
    return () => clearInterval(id);
  }, [loadQuotes]);

  // Sync URL params
  useEffect(() => {
    if (!paramSymbol) return;
    setSelected(paramSymbol);
    if (paramClass) setAssetClass(paramClass);
    if (paramName) setSelectedName(paramName);
  }, [paramSymbol, paramName, paramClass]);

  // Live symbol search (debounced)
  useEffect(() => {
    if (searchQ.length < 1) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const { results } = await marketApi.search(searchQ);
        setSearchResults(results.slice(0, 8));
      } catch { /* silent */ }
    }, 280);
    return () => clearTimeout(t);
  }, [searchQ]);

  const selectSymbol = useCallback(async (sym: string, name: string, type: string) => {
    setSelected(sym);
    setSelectedName(name);
    setAssetClass(type === "crypto" ? "crypto" : "stock");
    setSearchQ("");
    setSearchResults([]);
    try {
      const { quotes: q } = await marketApi.getQuotes([sym]);
      if (q[0] && !q[0].error) setSelectedQuote(q[0]);
    } catch { /* silent */ }
  }, []);

  const currentPrice = selectedQuote?.price ?? 0;
  const changePct = selectedQuote?.changePct ?? 0;
  const changeAbs = selectedQuote?.change ?? 0;
  const isUp = changePct >= 0;

  return (
    <div className="page">
      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 5 }}>
            TRADE TERMINAL · {activeBook?.accountType === "client" ? "CLIENT BOOK" : "PERSONAL BOOK"}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.7rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
              {selected}
            </span>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.95rem", color: "var(--text-secondary)" }}>
              {selectedName}
            </span>
            <span className={`badge badge-neutral`} style={{ fontSize: "0.65rem" }}>
              {assetClass.toUpperCase()}
            </span>
          </div>
          {selectedQuote && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.5rem", fontWeight: 600, color: "var(--text-primary)" }}>
                ${fmt(currentPrice)}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem", fontWeight: 600, color: isUp ? "var(--up)" : "var(--down)" }}>
                {isUp ? "+" : ""}{fmt(changePct)}%
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: isUp ? "var(--up)" : "var(--down)" }}>
                {isUp ? "+" : ""}{fmt(changeAbs)} today
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                {selectedQuote.exchange && `${selectedQuote.exchange} · `}{selectedQuote.currency}
              </span>
            </div>
          )}
        </div>

        {/* Search */}
        <div style={{ position: "relative", minWidth: 240 }}>
          <input
            className="input"
            placeholder="Search symbol or company..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            style={{ width: "100%" }}
          />
          {searchResults.length > 0 && (
            <div style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
              background: "var(--bg-elevated)", border: "1px solid var(--border-strong)",
              borderRadius: "var(--radius)", zIndex: 50, overflow: "hidden",
              boxShadow: "var(--shadow-lg)",
            }}>
              {searchResults.map((r) => (
                <button
                  key={r.symbol}
                  onClick={() => selectSymbol(r.symbol, r.name, r.type)}
                  style={{
                    width: "100%", background: "none", border: "none", padding: "9px 12px",
                    cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center",
                    gap: 10, borderBottom: "1px solid var(--border-subtle)", color: "var(--text-primary)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: 700, color: "var(--accent-2)", minWidth: 70 }}>
                    {r.symbol}
                  </span>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.78rem", color: "var(--text-secondary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.name}
                  </span>
                  <span className="badge badge-neutral" style={{ flexShrink: 0, fontSize: "0.6rem" }}>{r.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Notification banner */}
      {notification && (
        <div style={{
          padding: "10px 16px", background: "var(--up-soft)", border: "1px solid rgba(52,211,153,0.25)",
          borderRadius: "var(--radius-sm)", marginBottom: 16,
          fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--up)",
        }}>
          ✓ {notification}
        </div>
      )}

      {/* ── Main grid ──────────────────────────────────────────────────────── */}
      <div className={tradeStyles.tradeGrid}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Chart card */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                PRICE CHART — {selected}
              </div>
            </div>
            <div style={{ padding: "8px 12px 4px" }}>
              <PriceChart symbol={selected} height={270} />
            </div>
          </div>

          {/* Stats row */}
          {selectedQuote && (
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
              gap: 1, background: "var(--border)", border: "1px solid var(--border)",
              borderRadius: "var(--radius)", overflow: "hidden",
            }}>
              <StatCell label="Open"     value={`$${fmt(selectedQuote.open)}`} />
              <StatCell label="Day High" value={`$${fmt(selectedQuote.high)}`} />
              <StatCell label="Day Low"  value={`$${fmt(selectedQuote.low)}`} />
              <StatCell label="Volume"   value={fmtVol(selectedQuote.volume)} />
              <StatCell label="Mkt Cap"  value={fmtLarge(selectedQuote.mktCap)} />
              <StatCell label="Exchange" value={selectedQuote.exchange || "—"} />
            </div>
          )}

          {/* Algo signals card */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{
              padding: "10px 16px", borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                ALGORITHM SIGNALS
              </div>
              <button
                onClick={() => setShowAlgo((v) => !v)}
                style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)" }}
              >
                {showAlgo ? "hide" : "show"}
              </button>
            </div>
            {showAlgo && <AlgoSignals symbol={selected} />}
          </div>

          {/* How the algorithm works */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <button
              onClick={() => setShowGlossary((v) => !v)}
              style={{
                width: "100%", background: "none", border: "none", cursor: "pointer",
                padding: "10px 16px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                borderBottom: showGlossary ? "1px solid var(--border)" : "none",
              }}
            >
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                HOW THE ALGORITHMS WORK
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)" }}>
                {showGlossary ? "▲ collapse" : "▼ expand"}
              </span>
            </button>
            {showGlossary && (
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                {ALGO_GLOSSARY.map((g) => (
                  <div key={g.term} style={{ paddingBottom: 14, borderBottom: "1px solid var(--border-subtle)" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                      {g.term}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--accent-2)", marginBottom: 6, background: "var(--bg-surface-2)", padding: "4px 10px", borderRadius: "var(--radius-sm)", display: "inline-block" }}>
                      {g.formula}
                    </div>
                    <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                      {g.desc}
                    </div>
                  </div>
                ))}
                <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                  <strong>Composite signal</strong> is a majority vote across all four indicators: 3+ buys = STRONG BUY, 2 buys = BUY, 2 sells = SELL, 3+ sells = STRONG SELL, otherwise NEUTRAL.
                  All signals are computed from 3-month daily close data fetched live from Yahoo Finance.
                </div>
              </div>
            )}
          </div>

          {/* Watchlist */}
          {!loading && (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                QUICK WATCHLIST
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="data-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      {["Symbol", "Name", "Price", "Change %", "Volume"].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((q) => (
                      <tr
                        key={q.symbol}
                        onClick={() => selectSymbol(q.symbol, q.name ?? q.symbol, q.type ?? "stock")}
                        style={{ cursor: "pointer", background: q.symbol === selected ? "var(--accent-soft)" : undefined }}
                      >
                        <td>
                          <span style={{ fontWeight: 700, color: q.symbol === selected ? "var(--accent-2)" : "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
                            {q.symbol}
                          </span>
                        </td>
                        <td style={{ fontFamily: "var(--font-sans)", fontSize: "0.78rem", color: "var(--text-secondary)", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {q.name ?? "—"}
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                          ${fmt(q.price)}
                        </td>
                        <td>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", fontWeight: 600, color: (q.changePct ?? 0) >= 0 ? "var(--up)" : "var(--down)" }}>
                            {(q.changePct ?? 0) >= 0 ? "+" : ""}{fmt(q.changePct)}%
                          </span>
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {fmtVol(q.volume)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right column: sticky order form */}
        <div style={{ position: "sticky", top: "calc(var(--navbar-h, 56px) + 16px)", display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{
              marginBottom: 14,
              fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)",
              textTransform: "uppercase", letterSpacing: "0.1em",
            }}>
              PLACE ORDER · {selected}
            </div>
            <OrderForm
              symbol={selected}
              name={selectedName}
              assetClass={assetClass}
              currentPrice={currentPrice}
              onSuccess={(msg) => {
                setNotification(msg);
                setTimeout(() => setNotification(""), 6000);
              }}
            />
          </div>

          {/* Quick facts sidebar */}
          {selectedQuote && (
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
                INSTRUMENT FACTS
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {[
                  { label: "Name", value: selectedName },
                  { label: "Type", value: assetClass.toUpperCase() },
                  { label: "Currency", value: selectedQuote.currency ?? "USD" },
                  { label: "Exchange", value: selectedQuote.exchange ?? "—" },
                  { label: "Mkt Cap", value: fmtLarge(selectedQuote.mktCap) },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)" }}>{label}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-secondary)", maxWidth: 140, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 24, overflow: "hidden" }}>
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div>
            <span className="label-caps">Order history</span>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", margin: "4px 0 0" }}>
              Orders for {activeBook?.label ?? "active book"} with <strong>realized P&amp;L on each sell</strong> · live book summary above
            </p>
          </div>
        </div>
        <div style={{ padding: "12px 16px 16px" }}>
          <BookOrdersSection />
        </div>
      </div>

    </div>
  );
}

export default function TradePage() {
  return (
    <Suspense fallback={
      <div className="page" style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)", paddingTop: 40 }}>
        Loading terminal...
      </div>
    }>
      <TradeInner />
    </Suspense>
  );
}
