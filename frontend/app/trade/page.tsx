"use client";
import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { marketApi, type Quote } from "@/lib/api";
import { PriceChart } from "@/components/trading/PriceChart";
import { OrderForm } from "@/components/trading/OrderForm";
import type { AssetClass } from "@/lib/store/portfolio";

const DEFAULT_SYMBOLS = ["AAPL", "TSLA", "NVDA", "MSFT", "AMZN", "GOOGL", "META", "AMD", "BTC-USD", "ETH-USD", "BNB-USD", "SOL-USD"];

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

function TradeInner() {
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

  const loadQuotes = useCallback(async () => {
    const { quotes: q } = await marketApi.getQuotes(DEFAULT_SYMBOLS);
    const valid = q.filter((qt) => !qt.error && qt.price != null);
    setQuotes(valid);
    const sel = valid.find((qt) => qt.symbol === selected);
    if (sel) { setSelectedQuote(sel); setSelectedName(sel.name ?? sel.symbol); }
    setLoading(false);
  }, [selected]);

  useEffect(() => { loadQuotes(); const id = setInterval(loadQuotes, 15_000); return () => clearInterval(id); }, [loadQuotes]);

  useEffect(() => {
    if (!paramSymbol) return;
    setSelected(paramSymbol);
    if (paramClass) setAssetClass(paramClass);
    if (paramName) setSelectedName(paramName);
  }, [paramSymbol, paramName, paramClass]);

  // Live search
  useEffect(() => {
    if (searchQ.length < 1) { setSearchResults([]); return; }
    const timeout = setTimeout(async () => {
      try {
        const { results } = await marketApi.search(searchQ);
        setSearchResults(results.slice(0, 6));
      } catch {}
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQ]);

  const selectSymbol = async (sym: string, name: string, type: string) => {
    setSelected(sym);
    setSelectedName(name);
    setAssetClass(type === "crypto" ? "crypto" : "stock");
    setSearchQ("");
    setSearchResults([]);
    try {
      const { quotes: q } = await marketApi.getQuotes([sym]);
      if (q[0] && !q[0].error) setSelectedQuote(q[0]);
    } catch {}
  };

  const currentPrice = selectedQuote?.price ?? 0;
  const changePct = selectedQuote?.changePct ?? 0;

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>TRADE TERMINAL</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.6rem", fontWeight: 600, color: "var(--text-primary)" }}>{selected}</span>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.88rem", color: "var(--text-secondary)" }}>{selectedName}</span>
          </div>
          {selectedQuote && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.4rem", fontWeight: 600, color: "var(--text-primary)" }}>
                ${fmt(currentPrice)}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.88rem", color: changePct >= 0 ? "var(--up)" : "var(--down)" }}>
                {changePct >= 0 ? "+" : ""}{fmt(changePct)}%
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                {changePct >= 0 ? "+" : ""}{fmt(selectedQuote.change)} today
              </span>
            </div>
          )}
        </div>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <input
            className="input"
            placeholder="Search symbol..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            style={{ width: 220 }}
          />
          {searchResults.length > 0 && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-strong)",
              borderRadius: "var(--radius)",
              zIndex: 50,
              overflow: "hidden",
              marginTop: 4,
            }}>
              {searchResults.map((r) => (
                <button
                  key={r.symbol}
                  onClick={() => selectSymbol(r.symbol, r.name, r.type)}
                  style={{
                    width: "100%",
                    background: "none",
                    border: "none",
                    padding: "8px 12px",
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    borderBottom: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                >
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: 600, color: "var(--accent-2)", minWidth: 60 }}>{r.symbol}</span>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.78rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                  <span className="badge badge-neutral" style={{ marginLeft: "auto", flexShrink: 0 }}>{r.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {notification && (
        <div style={{ padding: "8px 14px", background: "var(--up-soft)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: "var(--radius-sm)", marginBottom: 16, fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--up)" }}>
          ✓ {notification}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, alignItems: "start" }}>
        {/* Left: chart + stats + watchlist */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Chart */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ marginBottom: 12, fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              PRICE CHART — {selected}
            </div>
            <PriceChart symbol={selected} height={280} />
          </div>

          {/* Stats row */}
          {selectedQuote && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 1, background: "var(--border)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
              {[
                { label: "Open", value: `$${fmt(selectedQuote.open)}` },
                { label: "High", value: `$${fmt(selectedQuote.high)}` },
                { label: "Low", value: `$${fmt(selectedQuote.low)}` },
                { label: "Volume", value: selectedQuote.volume ? `${(selectedQuote.volume / 1e6).toFixed(1)}M` : "—" },
                { label: "Mkt Cap", value: fmtLarge(selectedQuote.mktCap) },
                { label: "Exchange", value: selectedQuote.exchange || "—" },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: "var(--bg-surface)", padding: "10px 14px" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem", color: "var(--text-primary)", marginTop: 3, fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Watchlist */}
          {!loading && (
            <div className="card">
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                WATCHLIST
              </div>
              <table className="data-table">
                <tbody>
                  {quotes.map((q) => (
                    <tr
                      key={q.symbol}
                      onClick={() => selectSymbol(q.symbol, q.name, q.type)}
                      style={{ cursor: "pointer", background: q.symbol === selected ? "var(--accent-soft)" : undefined }}
                    >
                      <td style={{ fontWeight: 600, color: q.symbol === selected ? "var(--accent-2)" : "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "0.82rem", width: 80 }}>{q.symbol}</td>
                      <td style={{ fontFamily: "var(--font-mono)", fontWeight: 500 }}>${fmt(q.price)}</td>
                      <td>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: (q.changePct ?? 0) >= 0 ? "var(--up)" : "var(--down)" }}>
                          {(q.changePct ?? 0) >= 0 ? "+" : ""}{fmt(q.changePct)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: order form */}
        <div className="card" style={{ padding: 16, position: "sticky", top: "calc(var(--navbar-h) + 16px)" }}>
          <div style={{ marginBottom: 14, fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            PLACE ORDER · {selected}
          </div>
          <OrderForm
            symbol={selected}
            name={selectedName}
            assetClass={assetClass}
            currentPrice={currentPrice}
            onSuccess={(msg) => {
              setNotification(msg);
              setTimeout(() => setNotification(""), 5000);
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function TradePage() {
  return (
    <Suspense fallback={<div className="page" style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>Loading terminal...</div>}>
      <TradeInner />
    </Suspense>
  );
}
