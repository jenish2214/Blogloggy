"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { marketApi, type Quote, type CoinQuote, type MoverItem } from "@/lib/api";

const STOCK_SYMBOLS = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK-B", "JPM", "V", "UNH", "JNJ", "WMT", "PG", "MA", "HD", "CVX", "LLY", "ABBV", "MRK", "KO", "PEP", "BAC", "TMO", "COST", "AVGO", "AMD", "INTC", "QCOM", "CSCO"];

type Tab = "stocks" | "crypto" | "movers";

function fmt(n: number | null | undefined, dec = 2) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtLarge(n: number | null | undefined) {
  if (n == null) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(0)}`;
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
  const [stocks, setStocks] = useState<Quote[]>([]);
  const [crypto, setCrypto] = useState<CoinQuote[]>([]);
  const [movers, setMovers] = useState<{ gainers: MoverItem[]; losers: MoverItem[]; mostActive: MoverItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ col: string; dir: 1 | -1 }>({ col: "mktCap", dir: -1 });
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const loadStocks = useCallback(async () => {
    const { quotes } = await marketApi.getQuotes(STOCK_SYMBOLS);
    setStocks(quotes.filter((q) => !q.error));
    setLastUpdated(new Date().toLocaleTimeString());
  }, []);

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
    setLoading(true);
    Promise.all([loadStocks(), loadCrypto(), loadMovers()]).finally(() => setLoading(false));
    const id = setInterval(() => {
      if (tab === "stocks") loadStocks();
      if (tab === "crypto") loadCrypto();
      if (tab === "movers") loadMovers();
    }, 30_000);
    return () => clearInterval(id);
  }, [tab, loadStocks, loadCrypto, loadMovers]);

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
      <div className="tabs" style={{ marginBottom: 16 }}>
        {(["stocks", "crypto", "movers"] as Tab[]).map((t) => (
          <button key={t} className={`tab-btn ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t === "stocks" ? "Stocks & ETFs" : t === "crypto" ? "Cryptocurrency" : "Top Movers"}
          </button>
        ))}
      </div>

      {loading ? (
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
                <SortBtn col="price" label="Price" />
                <SortBtn col="changePct" label="Change %" />
                <SortBtn col="change" label="Change $" />
                <th style={{ padding: "6px 12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--border)", textAlign: "left" }}>High</th>
                <th style={{ padding: "6px 12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--border)", textAlign: "left" }}>Low</th>
                <SortBtn col="volume" label="Volume" />
                <SortBtn col="mktCap" label="Market Cap" />
                <th style={{ padding: "6px 12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--border)", textAlign: "left" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedStocks.map((q) => (
                <tr key={q.symbol}>
                  <td>
                    <span style={{ fontWeight: 600, color: "var(--accent-2)", fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>{q.symbol}</span>
                  </td>
                  <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>
                    <span style={{ color: "var(--text-secondary)", fontFamily: "var(--font-sans)", fontSize: "0.8rem" }}>{q.name}</span>
                  </td>
                  <td style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>${fmt(q.price)}</td>
                  <td><DeltaBadge pct={q.changePct} /></td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: (q.change ?? 0) >= 0 ? "var(--up)" : "var(--down)" }}>
                    {(q.change ?? 0) >= 0 ? "+" : ""}{fmt(q.change)}
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>${fmt(q.high)}</td>
                  <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>${fmt(q.low)}</td>
                  <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>{q.volume ? (q.volume / 1e6).toFixed(1) + "M" : "—"}</td>
                  <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>{fmtLarge(q.mktCap)}</td>
                  <td>
                    <Link href={`/trade?symbol=${q.symbol}`} className="btn btn-ghost btn-sm">
                      Trade
                    </Link>
                  </td>
                </tr>
              ))}
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
    </div>
  );
}
