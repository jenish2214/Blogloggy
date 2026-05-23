"use client";
import { useEffect, useState, useCallback } from "react";
import { marketApi } from "@/lib/api";
import { OrderForm } from "@/components/trading/OrderForm";
import { usePortfolioStore } from "@/lib/store/portfolio";
import { BookHoldingsPanel } from "@/components/wealth/BookHoldingsPanel";
import { loadPortfolioSnapshot } from "@/lib/trading/portfolioSnapshot";
import { subscribeOrderPlaced } from "@/lib/trading/orderEvents";
import { useActiveBookStore } from "@/lib/store/activeBook";
import styles from "./ForexPanel.module.css";

interface ForexQuote {
  symbol: string;
  label: string;
  base: string;
  quote: string;
  flag: string;
  price: number;
  change: number;
  changePct: number;
  bid: number;
  ask: number;
  updatedAt: string;
}

function fmt(n: number, dec = 5) {
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export default function ForexPanel({ embedded = false }: { embedded?: boolean }) {
  const [pairs, setPairs] = useState<ForexQuote[]>([]);
  const [selected, setSelected] = useState<ForexQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [holdingsLoading, setHoldingsLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof loadPortfolioSnapshot>> | null>(null);
  const activeBook = useActiveBookStore((s) => s.activeBook);
  const { cash, positions } = usePortfolioStore();

  const loadHoldings = useCallback(async () => {
    setHoldingsLoading(true);
    const data = await loadPortfolioSnapshot();
    setSnapshot(data);
    setHoldingsLoading(false);
  }, []);

  const loadForex = useCallback(async () => {
    setLoading(true);
    try {
      const data = await marketApi.getForex();
      const list = data.pairs as ForexQuote[];
      setPairs(list);
      setSelected((prev) => {
        if (prev) return list.find((p) => p.symbol === prev.symbol) ?? list[0] ?? null;
        return list[0] ?? null;
      });
    } catch {
      setMsg("Could not load forex quotes");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadForex();
    const id = setInterval(loadForex, 20_000);
    return () => clearInterval(id);
  }, [loadForex]);

  useEffect(() => {
    void loadHoldings();
    return subscribeOrderPlaced(() => void loadHoldings());
  }, [loadHoldings, activeBook?.portfolioId]);

  const position = selected ? positions[selected.symbol] : undefined;
  const allPositions = snapshot?.positions ?? [];
  const forexPositions = allPositions.filter((p) => p.assetClass === "forex");
  const otherPositions = allPositions.filter((p) => p.assetClass !== "forex");

  return (
    <div className={embedded ? undefined : "page"}>
      {!embedded && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Paper Forex · {activeBook?.accountType === "client" ? "Client book" : "Personal book"}
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "6px 0 4px" }}>Forex</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Client-wise holdings below — forex, stocks, and crypto for the active profile.
          </p>
        </div>
      )}

      <BookHoldingsPanel
        positions={allPositions}
        cash={snapshot?.cash ?? cash}
        totalValue={snapshot?.totalValue ?? cash}
        loading={holdingsLoading}
        defaultFilter="forex"
        showFilters
      />

      {otherPositions.length > 0 && (
        <div className="card" style={{ marginBottom: 20, padding: 14 }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 10 }}>
            Also in this {activeBook?.accountType === "client" ? "client" : "personal"} book (stocks / crypto)
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {otherPositions.map((p) => (
              <span
                key={p.symbol}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.78rem",
                  padding: "6px 10px",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                }}
              >
                {p.symbol} · {p.qty.toFixed(p.assetClass === "crypto" ? 4 : 0)} · ${p.marketValue.toFixed(0)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className={styles.forexGrid}>
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)" }}>
              Major Pairs ({pairs.length}) · {forexPositions.length} open in book
            </span>
            <button onClick={loadForex} className="btn btn-ghost btn-sm" disabled={loading}>
              {loading ? "…" : "Refresh"}
            </button>
          </div>

          {loading && pairs.length === 0 ? (
            <div style={{ padding: 32 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 40, marginBottom: 6, borderRadius: 4 }} />
              ))}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    {["Pair", "Bid", "Ask", "Mid", "Change", "Change %", ""].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pairs.map((p) => {
                    const isSel = selected?.symbol === p.symbol;
                    const up = p.changePct >= 0;
                    const held = forexPositions.find((h) => h.symbol === p.symbol);
                    return (
                      <tr
                        key={p.symbol}
                        onClick={() => setSelected(p)}
                        style={{ cursor: "pointer", background: isSel ? "var(--accent-soft)" : undefined }}
                      >
                        <td>
                          <span style={{ marginRight: 6 }}>{p.flag}</span>
                          <strong style={{ color: "var(--accent-2)" }}>{p.label}</strong>
                          {held && (
                            <span style={{ marginLeft: 6, fontSize: "0.65rem", fontWeight: 700, color: "var(--up)" }}>
                              HELD
                            </span>
                          )}
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)" }}>{fmt(p.bid)}</td>
                        <td style={{ fontFamily: "var(--font-mono)" }}>{fmt(p.ask)}</td>
                        <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{fmt(p.price)}</td>
                        <td style={{ fontFamily: "var(--font-mono)", color: up ? "var(--up)" : "var(--down)" }}>
                          {up ? "+" : ""}{fmt(p.change)}
                        </td>
                        <td>
                          <span className={up ? "badge badge-up" : "badge badge-down"}>
                            {up ? "+" : ""}{p.changePct.toFixed(3)}%
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`btn btn-sm ${isSel ? "btn-primary" : "btn-ghost"}`}
                            onClick={(e) => { e.stopPropagation(); setSelected(p); }}
                          >
                            Trade
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ position: "sticky", top: 16 }}>
          {selected ? (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: "1.5rem" }}>{selected.flag}</span>
                <div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>{selected.label}</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    {selected.base}/{selected.quote}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                {[
                  { label: "Bid", value: fmt(selected.bid) },
                  { label: "Ask", value: fmt(selected.ask) },
                  { label: "Mid", value: fmt(selected.price) },
                  { label: "24h Change", value: `${selected.changePct >= 0 ? "+" : ""}${selected.changePct.toFixed(3)}%`, accent: selected.changePct >= 0 },
                ].map(({ label, value, accent }) => (
                  <div key={label} style={{ background: "var(--bg-surface-2)", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase" }}>{label}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, marginTop: 2, color: accent === undefined ? "var(--text-primary)" : accent ? "var(--up)" : "var(--down)" }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 12 }}>
                Book: <strong>{activeBook?.label ?? "Personal"}</strong>
                {" · "}Cash: <strong>${(snapshot?.cash ?? cash).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
                {position && <> · Position: <strong>{position.qty.toFixed(4)}</strong> lots</>}
              </div>

              <OrderForm
                symbol={selected.symbol}
                name={selected.label}
                assetClass="forex"
                currentPrice={selected.price}
                onSuccess={(m) => { setMsg(m); void loadHoldings(); }}
              />

              {msg && (
                <div style={{ marginTop: 12, padding: "8px 12px", background: "var(--accent-soft)", borderRadius: "var(--radius-sm)", fontSize: "0.82rem", color: "var(--accent-2)" }}>
                  {msg}
                </div>
              )}
            </div>
          ) : (
            <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
              Select a pair to trade
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
