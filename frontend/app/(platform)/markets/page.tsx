"use client";
import { useEffect, useState, useCallback, useRef, type CSSProperties } from "react";
import Link from "next/link";
import { IndiaStockDetailPanel } from "@/components/markets/IndiaStockDetailPanel";
import { marketApi, type Quote, type CoinQuote, type MoverItem, type MarketRegion, type MarketRegionInfo } from "@/lib/api";
import type { IndiaMarketQuote } from "@/types/india-market";
import { CompareSymbolsModal } from "@/components/features/CompareSymbolsModal";

type Tab = "stocks" | "crypto" | "movers";

function fmt(n: number | null | undefined, dec = 2) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtPrice(n: number | null | undefined, currency = "USD") {
  if (n == null) return "—";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: n < 1 ? 4 : 2 }).format(n);
  } catch {
    return `${currency} ${fmt(n)}`;
  }
}
function fmtLarge(n: number | null | undefined, currency = "USD") {
  if (n == null) return "—";
  const sym = currency === "USD" ? "$" : currency === "INR" ? "₹" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : currency === "JPY" ? "¥" : "";
  if (n >= 1e12) return `${sym}${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${sym}${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${sym}${(n / 1e6).toFixed(2)}M`;
  return `${sym}${n.toFixed(0)}`;
}

function DeltaBadge({ pct }: { pct: number | null | undefined }) {
  if (pct == null) return <span style={{ color: "var(--neutral)" }}>—</span>;
  const up = pct >= 0;
  return (
    <span className={up ? "badge badge-up" : "badge badge-down"}>
      {up ? "+" : ""}{pct.toFixed(2)}%
    </span>
  );
}

export default function MarketsPage() {
  const [tab, setTab] = useState<Tab>("stocks");
  const [region, setRegion] = useState<MarketRegion>("us");
  const [regions, setRegions] = useState<MarketRegionInfo[]>([]);
  const [stocks, setStocks] = useState<(Quote | IndiaMarketQuote)[]>([]);
  const [crypto, setCrypto] = useState<CoinQuote[]>([]);
  const [movers, setMovers] = useState<{ gainers: MoverItem[]; losers: MoverItem[]; mostActive: MoverItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ col: string; dir: 1 | -1 }>({ col: "mktCap", dir: -1 });
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [indiaDetailSymbol, setIndiaDetailSymbol] = useState<string | null>(null);
  const [indiaLoading, setIndiaLoading] = useState(false);
  const [fundamentalsAvailable, setFundamentalsAvailable] = useState(true);
  const [marketsError, setMarketsError] = useState<string | null>(null);
  const [comparePair, setComparePair] = useState<{ a: string; b: string } | null>(null);
  const stocksRef = useRef(stocks);
  stocksRef.current = stocks;

  useEffect(() => {
    marketApi.getRegions().then(({ regions: r }) => setRegions(r)).catch(() => {});
  }, []);

  const loadStocks = useCallback(async (force = false) => {
    setMarketsError(null);
    const hasData = stocksRef.current.length > 0;
    if (!hasData) setLoading(true);
    if (region === "india") setIndiaLoading(true);

    try {
      if (region === "india") {
        const { quotes, fundamentalsAvailable: fa } = await marketApi.getIndiaMarket(force);
        setStocks(quotes.filter((q) => !q.error));
        setFundamentalsAvailable(fa !== false);
      } else {
        const { quotes } = await marketApi.getQuotesByRegion(region, force);
        setStocks(quotes.filter((q) => !q.error));
        setFundamentalsAvailable(true);
      }
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      setMarketsError(e instanceof Error ? e.message : "Failed to load markets");
      if (!hasData) setStocks([]);
    } finally {
      setLoading(false);
      setIndiaLoading(false);
    }
  }, [region]);

  const loadCrypto = useCallback(async () => {
    const { coins } = await marketApi.getCrypto();
    setCrypto(coins);
    setLastUpdated(new Date().toLocaleTimeString());
  }, []);

  const loadMovers = useCallback(async () => {
    const data = await marketApi.getMovers();
    setMovers(data);
    setLastUpdated(new Date().toLocaleTimeString());
  }, []);

  useEffect(() => {
    if (tab === "stocks") {
      void loadStocks(false);
    } else if (tab === "crypto") {
      if (crypto.length === 0) setLoading(true);
      void loadCrypto().finally(() => setLoading(false));
    } else {
      if (!movers) setLoading(true);
      void loadMovers().finally(() => setLoading(false));
    }
  }, [tab, region, loadStocks, loadCrypto, loadMovers, crypto.length, movers]);

  useEffect(() => {
    const id = setInterval(() => {
      if (tab === "stocks") void loadStocks(true);
      else if (tab === "crypto") void loadCrypto();
      else void loadMovers();
    }, 30_000);
    return () => clearInterval(id);
  }, [tab, loadStocks, loadCrypto, loadMovers]);

  useEffect(() => {
    if (tab !== "crypto" && crypto.length === 0) {
      void loadCrypto();
    }
    if (tab !== "movers" && !movers) {
      void loadMovers();
    }
  }, [tab, crypto.length, movers, loadCrypto, loadMovers]);

  const isIndia = region === "india";

  const sortedStocks = [...stocks]
    .filter((q) => !search || q.symbol.toLowerCase().includes(search.toLowerCase()) || q.name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = (a as unknown as Record<string, number>)[sort.col] ?? 0;
      const bv = (b as unknown as Record<string, number>)[sort.col] ?? 0;
      return (bv - av) * sort.dir;
    });

  const sortedCrypto = [...crypto].filter(
    (c) => !search || c.symbol.toLowerCase().includes(search.toLowerCase()) || c.name.toLowerCase().includes(search.toLowerCase())
  );

  const SortBtn = ({ col, label }: { col: string; label: string }) => (
    <th
      className="data-table"
      onClick={() => setSort({ col, dir: sort.col === col ? ((sort.dir * -1) as 1 | -1) : -1 })}
      style={{ cursor: "pointer", userSelect: "none", paddingLeft: 12, paddingRight: 12, paddingTop: 6, paddingBottom: 6, color: sort.col === col ? "var(--accent-2)" : "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--border)", textAlign: "left", background: "transparent" }}
    >
      {label} {sort.col === col ? (sort.dir === -1 ? "↓" : "↑") : ""}
    </th>
  );

  const thStyle: CSSProperties = {
    padding: "6px 12px",
    color: "var(--text-muted)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.68rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    borderBottom: "1px solid var(--border)",
    textAlign: "left",
  };

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
            LIVE MARKET DATA
          </div>
          <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "1.4rem", fontWeight: 600, color: "var(--text-primary)" }}>
            Markets
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <input
            className="input"
            placeholder="Search symbol or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 200 }}
          />
          {lastUpdated && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)" }}>
              Updated {lastUpdated}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 12 }}>
        {(["stocks", "crypto", "movers"] as Tab[]).map((t) => (
          <button key={t} className={`tab-btn ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t === "stocks" ? "World Markets" : t === "crypto" ? "Cryptocurrency" : "US Top Movers"}
          </button>
        ))}
      </div>

      {/* Region selector (stocks tab) */}
      {tab === "stocks" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {(regions.length ? regions : [
            { id: "us" as MarketRegion, label: "United States", flag: "🇺🇸", currency: "USD", exchange: "NYSE", count: 30 },
            { id: "india" as MarketRegion, label: "India", flag: "🇮🇳", currency: "INR", exchange: "NSE", count: 20 },
            { id: "uk" as MarketRegion, label: "United Kingdom", flag: "🇬🇧", currency: "GBP", exchange: "LSE", count: 20 },
            { id: "europe" as MarketRegion, label: "Europe", flag: "🇪🇺", currency: "EUR", exchange: "XETRA", count: 18 },
            { id: "asia" as MarketRegion, label: "Asia Pacific", flag: "🌏", currency: "Multi", exchange: "TSE/HKEX", count: 15 },
            { id: "indices" as MarketRegion, label: "Global Indices", flag: "📈", currency: "Multi", exchange: "Worldwide", count: 13 },
          ]).map((r) => (
            <button
              key={r.id}
              onClick={() => setRegion(r.id)}
              style={{
                padding: "8px 14px",
                borderRadius: "var(--radius-sm)",
                border: `1px solid ${region === r.id ? "var(--accent)" : "var(--border)"}`,
                background: region === r.id ? "var(--accent-soft)" : "var(--bg-surface)",
                color: region === r.id ? "var(--accent-2)" : "var(--text-secondary)",
                fontSize: "0.82rem",
                fontWeight: region === r.id ? 600 : 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>{r.flag}</span>
              <span>{r.label}</span>
            </button>
          ))}
        </div>
      )}

      {isIndia && !fundamentalsAvailable && !loading && (
        <p
          role="status"
          style={{
            margin: "0 0 12px",
            padding: "10px 14px",
            fontSize: "0.82rem",
            color: "var(--text-secondary)",
            background: "rgba(251, 191, 36, 0.08)",
            border: "1px solid rgba(251, 191, 36, 0.35)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          Fundamentals temporarily unavailable — showing live prices only.
        </p>
      )}

      {marketsError && (
        <p style={{ color: "var(--down)", fontSize: "0.82rem", marginBottom: 12 }}>
          {marketsError}{" "}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void loadStocks()}>
            Retry
          </button>
        </p>
      )}

      {loading || (isIndia && indiaLoading) ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 40, borderRadius: 2 }} />)}
        </div>
      ) : tab === "stocks" ? (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <SortBtn col="symbol" label="Symbol" />
                <th style={{ padding: "6px 12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--border)", textAlign: "left" }}>Name</th>
                <th style={{ padding: "6px 12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--border)", textAlign: "left" }}>Country</th>
                <SortBtn col="price" label="Price" />
                <SortBtn col="changePct" label="Change %" />
                {isIndia && fundamentalsAvailable && (
                  <>
                    <th style={thStyle}>P/E</th>
                    <th style={thStyle}>ROE</th>
                    <th style={thStyle}>Div %</th>
                    <th style={thStyle}>Screener cap</th>
                  </>
                )}
                <SortBtn col="change" label="Change" />
                <th style={{ padding: "6px 12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--border)", textAlign: "left" }}>Exchange</th>
                <SortBtn col="volume" label="Volume" />
                <SortBtn col="mktCap" label="Market Cap" />
                <th style={{ padding: "6px 12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--border)", textAlign: "left" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedStocks.map((row) => {
                const q = row as IndiaMarketQuote;
                const f = q.fundamentals;
                return (
                <tr key={q.symbol}>
                  <td>
                    <span style={{ fontWeight: 600, color: "var(--accent-2)", fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>{q.symbol}</span>
                  </td>
                  <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>
                    <span style={{ color: "var(--text-secondary)", fontFamily: "var(--font-sans)", fontSize: "0.8rem" }}>{q.name}</span>
                  </td>
                  <td><span className="badge badge-neutral">{q.country ?? "—"}</span></td>
                  <td style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>{fmtPrice(q.price, q.currency)}</td>
                  <td><DeltaBadge pct={q.changePct} /></td>
                  {isIndia && fundamentalsAvailable && (
                    <>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>{f?.pe ?? "—"}</td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>{f?.roe ?? "—"}</td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>{f?.dividendYield ?? "—"}</td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", maxWidth: 120 }}>{f?.marketCapInr ?? "—"}</td>
                    </>
                  )}
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: (q.change ?? 0) >= 0 ? "var(--up)" : "var(--down)" }}>
                    {(q.change ?? 0) >= 0 ? "+" : ""}{fmt(q.change)}
                  </td>
                  <td style={{ fontFamily: "var(--font-sans)", fontSize: "0.75rem", color: "var(--text-muted)", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis" }}>{q.exchange || "—"}</td>
                  <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>{q.volume ? (q.volume / 1e6).toFixed(1) + "M" : "—"}</td>
                  <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>{fmtLarge(q.mktCap, q.currency)}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {isIndia && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setIndiaDetailSymbol(q.symbol)}
                        >
                          Details
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          const other = sortedStocks.find((s) => s.symbol !== q.symbol);
                          if (other) setComparePair({ a: q.symbol, b: other.symbol });
                        }}
                      >
                        Compare
                      </button>
                      <Link href={`/trade?symbol=${encodeURIComponent(q.symbol)}&name=${encodeURIComponent(q.name ?? q.symbol)}`} className="btn btn-ghost btn-sm">
                        Trade
                      </Link>
                    </div>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      ) : tab === "crypto" ? (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                {["#", "Name", "Price", "1H %", "24H %", "7D %", "Market Cap", "Volume 24H", "Action"].map((h) => (
                  <th key={h} style={{ padding: "6px 12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--border)", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedCrypto.map((c, i) => (
                <tr key={c.symbol}>
                  <td style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>{i + 1}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {c.image && <img src={c.image} alt={c.symbol} width={20} height={20} style={{ borderRadius: "50%" }} />}
                      <div>
                        <div style={{ fontWeight: 600, fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--accent-2)" }}>{c.symbol}</div>
                        <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.72rem", color: "var(--text-muted)" }}>{c.name}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                    ${c.price >= 1 ? fmt(c.price) : c.price?.toFixed(4)}
                  </td>
                  <td><DeltaBadge pct={c.change1h} /></td>
                  <td><DeltaBadge pct={c.change24h} /></td>
                  <td><DeltaBadge pct={c.change7d} /></td>
                  <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>{fmtLarge(c.marketCap)}</td>
                  <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>{fmtLarge(c.volume24h)}</td>
                  <td>
                    <Link href={`/trade?symbol=${c.symbol}-USD&name=${encodeURIComponent(c.name)}&class=crypto`} className="btn btn-ghost btn-sm">
                      Trade
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          {([
            { title: "TOP GAINERS", items: movers?.gainers ?? [], dir: 1 },
            { title: "TOP LOSERS", items: movers?.losers ?? [], dir: -1 },
            { title: "MOST ACTIVE", items: movers?.mostActive ?? [], dir: 0 },
          ] as { title: string; items: MoverItem[]; dir: number }[]).map(({ title, items, dir }) => (
            <div key={title} className="card">
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: dir > 0 ? "var(--up)" : dir < 0 ? "var(--down)" : "var(--text-muted)" }}>
                {title}
              </div>
              <table className="data-table" style={{ width: "100%" }}>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.symbol}>
                      <td style={{ fontWeight: 600, fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--accent-2)" }}>{item.symbol}</td>
                      <td style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", color: "var(--text-secondary)", fontFamily: "var(--font-sans)", fontSize: "0.78rem" }}>{item.name}</td>
                      <td style={{ fontFamily: "var(--font-mono)", fontWeight: 500 }}>${fmt(item.price)}</td>
                      <td><DeltaBadge pct={item.changePct} /></td>
                      <td>
                        <Link href={`/trade?symbol=${item.symbol}`} className="btn btn-ghost btn-sm">Trade</Link>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: 16, color: "var(--text-muted)", textAlign: "center" }}>Loading...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {indiaDetailSymbol && (
        <IndiaStockDetailPanel
          symbol={indiaDetailSymbol}
          onClose={() => setIndiaDetailSymbol(null)}
        />
      )}

      {comparePair && (
        <CompareSymbolsModal
          symbolA={comparePair.a}
          symbolB={comparePair.b}
          onClose={() => setComparePair(null)}
        />
      )}
    </div>
  );
}
