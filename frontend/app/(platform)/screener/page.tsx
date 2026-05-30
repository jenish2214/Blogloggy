"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { marketApi, watchlistApi } from "@/lib/api";
import { getBasicFinancials, getCompanyProfile } from "@/lib/finnhub";
import styles from "@/components/features/features.module.css";

const UNIVERSE = [
  "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "JPM", "V", "UNH",
  "XOM", "JNJ", "WMT", "MA", "HD", "PG", "BAC", "CVX", "KO", "PEP",
];

type Row = {
  symbol: string;
  name: string;
  pe?: number;
  mktCap?: number;
  changePct?: number;
};

export default function ScreenerPage() {
  const [maxPe, setMaxPe] = useState("30");
  const [minCap, setMinCap] = useState("10");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    const peLimit = parseFloat(maxPe) || 999;
    const capMin = (parseFloat(minCap) || 0) * 1e9;
    const out: Row[] = [];

    await Promise.all(
      UNIVERSE.map(async (sym) => {
        try {
          const [fin, profile, { quotes }] = await Promise.all([
            getBasicFinancials(sym),
            getCompanyProfile(sym),
            marketApi.getQuotes([sym], false),
          ]);
          const q = quotes[0];
          const pe = fin?.metric?.peBasicExclExtraTTM;
          const mktCap = (profile?.marketCapitalization ?? 0) * 1e6;
          if (pe != null && pe > peLimit) return;
          if (mktCap < capMin) return;
          out.push({
            symbol: sym,
            name: profile?.name ?? sym,
            pe,
            mktCap,
            changePct: q?.changePct,
          });
        } catch {
          /* skip */
        }
      })
    );

    setRows(out.sort((a, b) => (b.mktCap ?? 0) - (a.mktCap ?? 0)));
    setLoading(false);
  };

  const filtered = useMemo(() => rows, [rows]);

  const addWatch = async (symbol: string, name: string) => {
    try {
      await watchlistApi.add({ symbol, name, assetClass: "stock" });
    } catch {
      /* guest */
    }
  };

  return (
    <div className="page">
      <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 800 }}>Stock screener</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
        Filter a US universe by P/E and market cap (Finnhub fundamentals).
      </p>
      <div className={styles.panel}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Max P/E</span>
            <input className="input" value={maxPe} onChange={(e) => setMaxPe(e.target.value)} />
          </label>
          <label>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Min cap (B USD)</span>
            <input className="input" value={minCap} onChange={(e) => setMinCap(e.target.value)} />
          </label>
          <button type="button" className="btn btn-primary" onClick={() => void run()} disabled={loading}>
            {loading ? "Screening…" : "Run screen"}
          </button>
        </div>
      </div>
      <table className="data-table card" style={{ width: "100%", marginTop: 16 }}>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Name</th>
            <th>P/E</th>
            <th>Mkt cap</th>
            <th>Chg %</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.symbol}>
              <td>{r.symbol}</td>
              <td>{r.name}</td>
              <td>{r.pe?.toFixed(1) ?? "—"}</td>
              <td>${((r.mktCap ?? 0) / 1e9).toFixed(1)}B</td>
              <td>{r.changePct != null ? `${r.changePct.toFixed(2)}%` : "—"}</td>
              <td>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => void addWatch(r.symbol, r.name)}>
                  + Watch
                </button>
                <Link href={`/trade?symbol=${r.symbol}`} className="btn btn-ghost btn-sm" style={{ marginLeft: 4 }}>
                  Trade
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
