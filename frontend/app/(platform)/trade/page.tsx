"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Search, BarChart3 } from "lucide-react";
import { marketApi, watchlistApi, type Quote } from "@/lib/api";
import { PriceChart } from "@/components/trading/PriceChart";
import { OrderForm } from "@/components/trading/OrderForm";
import { CompareSymbolsModal } from "@/components/features/CompareSymbolsModal";
import { AlgoSignals } from "@/components/trading/AlgoSignals";
import { TradeSymbolMarketBanner } from "@/components/trading/TradeSymbolMarketBanner";
import type { AssetClass } from "@/lib/store/portfolio";
import { useActiveBookStore } from "@/lib/store/activeBook";
import { usePortfolioStore } from "@/lib/store/portfolio";
import { BookOrdersSection } from "@/components/account/BookOrdersSection";
import styles from "./trade.module.css";

const DEFAULT_SYMBOLS = [
  "AAPL", "TSLA", "NVDA", "MSFT", "AMZN", "GOOGL", "META", "AMD",
  "BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD",
];

const ALGO_GLOSSARY = [
  {
    term: "RSI (14)",
    formula: "RSI = 100 − 100/(1 + AvgGain/AvgLoss)",
    desc: "Momentum oscillator. Below 35 suggests oversold; above 65 suggests overbought.",
  },
  {
    term: "SMA Cross (20/50)",
    formula: "Signal = SMA₂₀ / SMA₅₀",
    desc: "Golden cross (20 above 50) is bullish; death cross is bearish.",
  },
  {
    term: "MACD (12/26/9)",
    formula: "MACD = EMA₁₂ − EMA₂₆",
    desc: "MACD above signal line suggests bullish momentum shift.",
  },
  {
    term: "Bollinger %B",
    formula: "%B = (Price − Lower) / (Upper − Lower) × 100",
    desc: "Below 25% is relatively cheap; above 75% is extended within the band.",
  },
];

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

function TradeInner() {
  const activeBook = useActiveBookStore((s) => s.activeBook);
  const { cash, positions } = usePortfolioStore();
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
  const [compareOpen, setCompareOpen] = useState(false);

  const position = positions[selected];

  useEffect(() => {
    watchlistApi
      .getAll()
      .then(({ items }) => {
        if (items.length > 0) setWatchSymbols(items.map((i) => i.symbol));
      })
      .catch(() => {});
  }, []);

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
    void loadQuotes();
    const id = setInterval(() => void loadQuotes(), 15_000);
    return () => clearInterval(id);
  }, [loadQuotes]);

  useEffect(() => {
    if (!paramSymbol) return;
    setSelected(paramSymbol);
    if (paramClass) setAssetClass(paramClass);
    if (paramName) setSelectedName(paramName);
  }, [paramSymbol, paramName, paramClass]);

  useEffect(() => {
    if (searchQ.length < 1) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const { results } = await marketApi.search(searchQ);
        setSearchResults(results.slice(0, 8));
      } catch {
        setSearchResults([]);
      }
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
    } catch {
      /* silent */
    }
  }, []);

  const currentPrice = selectedQuote?.price ?? 0;
  const changePct = selectedQuote?.changePct ?? 0;
  const changeAbs = selectedQuote?.change ?? 0;
  const isUp = changePct >= 0;

  return (
    <div className={`page ${styles.page}`}>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <p className={styles.eyebrow}>
            Trade terminal · {activeBook?.accountType === "client" ? "Client book" : "Personal book"}
          </p>
          <div className={styles.tickerRow}>
            <span className={styles.symbol}>{selected}</span>
            <span className={styles.name}>{selectedName}</span>
            <span className={styles.assetBadge}>{assetClass}</span>
          </div>
          {selectedQuote && (
            <div className={styles.priceRow}>
              <span className={styles.price}>${fmt(currentPrice)}</span>
              <span className={`${styles.changePct} ${isUp ? styles.up : styles.down}`}>
                {isUp ? "+" : ""}
                {fmt(changePct)}%
              </span>
              <span className={`${styles.changeAbs} ${isUp ? styles.up : styles.down}`}>
                {isUp ? "+" : ""}
                {fmt(changeAbs)} today
              </span>
              <span className={styles.meta}>
                {selectedQuote.exchange && `${selectedQuote.exchange} · `}
                {selectedQuote.currency}
              </span>
            </div>
          )}
        </div>

        <div className={styles.headerActions}>
          <div className={styles.bookPill}>
            Active book · <strong>{activeBook?.label ?? "—"}</strong>
          </div>
          <div className={styles.searchWrap}>
            <Search size={16} className={styles.searchIcon} aria-hidden />
            <input
              className={`input ${styles.searchInput}`}
              placeholder="Search symbol or company…"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              aria-label="Search symbols"
            />
            {searchResults.length > 0 && (
              <div className={styles.searchDropdown}>
                {searchResults.map((r) => (
                  <button
                    key={r.symbol}
                    type="button"
                    className={styles.searchItem}
                    onClick={() => void selectSymbol(r.symbol, r.name, r.type)}
                  >
                    <span className={styles.searchSym}>{r.symbol}</span>
                    <span className={styles.searchName}>{r.name}</span>
                    <span className="badge badge-neutral">{r.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm press-scale"
            onClick={() => setCompareOpen(true)}
          >
            Compare symbols
          </button>
        </div>
      </header>

      <TradeSymbolMarketBanner symbol={selected} assetClass={assetClass} />

      {notification && (
        <div className={styles.toast} role="status">
          ✓ {notification}
        </div>
      )}

      <div className={styles.layout}>
        <div className={styles.mainCol}>
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>
                <BarChart3 size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
                Price chart · {selected}
              </h2>
            </div>
            <div className={styles.chartBody}>
              <PriceChart symbol={selected} height={300} />
            </div>
          </section>

          {selectedQuote && (
            <div className={styles.statsGrid}>
              <div className={styles.statCell}>
                <div className={styles.statLabel}>Open</div>
                <div className={styles.statValue}>${fmt(selectedQuote.open)}</div>
              </div>
              <div className={styles.statCell}>
                <div className={styles.statLabel}>Day high</div>
                <div className={styles.statValue}>${fmt(selectedQuote.high)}</div>
              </div>
              <div className={styles.statCell}>
                <div className={styles.statLabel}>Day low</div>
                <div className={styles.statValue}>${fmt(selectedQuote.low)}</div>
              </div>
              <div className={styles.statCell}>
                <div className={styles.statLabel}>Volume</div>
                <div className={styles.statValue}>{fmtVol(selectedQuote.volume)}</div>
              </div>
              <div className={styles.statCell}>
                <div className={styles.statLabel}>Market cap</div>
                <div className={styles.statValue}>{fmtLarge(selectedQuote.mktCap)}</div>
              </div>
              <div className={styles.statCell}>
                <div className={styles.statLabel}>Exchange</div>
                <div className={`${styles.statValue} ${styles.statValueAccent}`}>
                  {selectedQuote.exchange || "—"}
                </div>
              </div>
            </div>
          )}

          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>Algorithm signals</h2>
              <button
                type="button"
                className={styles.collapseBtn}
                onClick={() => setShowAlgo((v) => !v)}
              >
                {showAlgo ? "Hide" : "Show"}
              </button>
            </div>
            {showAlgo && (
              <div className={styles.panelBodyFlush}>
                <AlgoSignals symbol={selected} />
              </div>
            )}
          </section>

          <section className={styles.panel}>
            <button
              type="button"
              className={styles.glossaryToggle}
              onClick={() => setShowGlossary((v) => !v)}
              aria-expanded={showGlossary}
            >
              How the algorithms work
              <span>{showGlossary ? "▲" : "▼"}</span>
            </button>
            {showGlossary && (
              <div className={styles.glossaryBody}>
                {ALGO_GLOSSARY.map((g) => (
                  <div key={g.term} className={styles.glossaryItem}>
                    <p className={styles.glossaryTerm}>{g.term}</p>
                    <span className={styles.glossaryFormula}>{g.formula}</span>
                    <p className={styles.glossaryDesc}>{g.desc}</p>
                  </div>
                ))}
                <p className={styles.glossaryDesc}>
                  <strong>Composite signal</strong> is a majority vote across all four indicators.
                  Data is fetched from Yahoo Finance (3-month daily closes).
                </p>
              </div>
            )}
          </section>

          {!loading && quotes.length > 0 && (
            <section className={styles.panel}>
              <div className={styles.panelHead}>
                <h2 className={styles.panelTitle}>Watchlist</h2>
                <span className={styles.meta}>{quotes.length} symbols</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className={styles.watchTable}>
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Name</th>
                      <th>Price</th>
                      <th>Change</th>
                      <th>Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((q) => {
                      const active = q.symbol === selected;
                      const up = (q.changePct ?? 0) >= 0;
                      return (
                        <tr
                          key={q.symbol}
                          className={`${styles.watchRow} ${active ? styles.watchRowActive : ""}`}
                          onClick={() => void selectSymbol(q.symbol, q.name ?? q.symbol, q.type ?? "stock")}
                        >
                          <td>
                            <span className={`${styles.watchSym} ${active ? styles.watchSymActive : ""}`}>
                              {q.symbol}
                            </span>
                          </td>
                          <td style={{ color: "var(--text-secondary)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {q.name ?? "—"}
                          </td>
                          <td>${fmt(q.price)}</td>
                          <td className={up ? styles.up : styles.down}>
                            {up ? "+" : ""}
                            {fmt(q.changePct)}%
                          </td>
                          <td style={{ color: "var(--text-muted)" }}>{fmtVol(q.volume)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        <aside className={styles.railCol}>
          <section className={`card ${styles.panel} ${styles.orderPanel}`}>
            <h2 className={styles.panelTitle} style={{ marginBottom: 14 }}>
              Place order · {selected}
            </h2>
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
          </section>

          <section className={styles.panel}>
            <div className={styles.panelBody}>
              <p className={styles.positionTitle}>Your book</p>
              <div className={styles.positionCard}>
                <div className={styles.positionRow}>
                  <span className={styles.positionLabel}>Buying power</span>
                  <span className={styles.positionVal}>
                    ${fmt(cash)}
                  </span>
                </div>
                {position && position.qty > 0 ? (
                  <>
                    <div className={styles.positionRow}>
                      <span className={styles.positionLabel}>Position</span>
                      <span className={styles.positionVal}>{position.qty} units</span>
                    </div>
                    <div className={styles.positionRow}>
                      <span className={styles.positionLabel}>Avg cost</span>
                      <span className={styles.positionVal}>${fmt(position.avgPrice)}</span>
                    </div>
                    <div className={styles.positionRow}>
                      <span className={styles.positionLabel}>Unrealized P&amp;L</span>
                      <span className={`${styles.positionVal} ${position.unrealizedPnl >= 0 ? styles.up : styles.down}`}>
                        {position.unrealizedPnl >= 0 ? "+" : ""}${fmt(Math.abs(position.unrealizedPnl))}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className={styles.glossaryDesc} style={{ margin: 0 }}>
                    No open position in {selected} on this book.
                  </p>
                )}
              </div>

              {selectedQuote && (
                <>
                  <p className={styles.positionTitle}>Instrument</p>
                  <div className={styles.factsList}>
                    {[
                      { label: "Name", value: selectedName },
                      { label: "Type", value: assetClass.toUpperCase() },
                      { label: "Currency", value: selectedQuote.currency ?? "USD" },
                      { label: "Exchange", value: selectedQuote.exchange ?? "—" },
                      { label: "Mkt cap", value: fmtLarge(selectedQuote.mktCap) },
                    ].map(({ label, value }) => (
                      <div key={label} className={styles.factRow}>
                        <span className={styles.factLabel}>{label}</span>
                        <span className={styles.factValue}>{value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>
        </aside>
      </div>

      <section className={`card ${styles.panel} ${styles.historySection}`}>
        <div className={styles.historyHead}>
          <h2 className={styles.historyTitle}>Order history</h2>
          <p className={styles.historySub}>
            Fills and realized P&amp;L for <strong>{activeBook?.label ?? "your active book"}</strong>
          </p>
        </div>
        <div className={styles.historyBody}>
          <BookOrdersSection />
        </div>
      </section>

      {compareOpen && (
        <CompareSymbolsModal
          symbolA={selected}
          symbolB={watchSymbols.find((s) => s !== selected) ?? "MSFT"}
          onClose={() => setCompareOpen(false)}
        />
      )}
    </div>
  );
}

export default function TradePage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading trade terminal…</div>}>
      <TradeInner />
    </Suspense>
  );
}
