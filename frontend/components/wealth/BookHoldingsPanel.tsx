"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { SnapshotPosition } from "@/lib/trading/portfolioSnapshot";
import { useActiveBookStore } from "@/lib/store/activeBook";
import styles from "./BookHoldingsPanel.module.css";

type AssetFilter = "all" | "stock" | "forex" | "crypto" | "option";

function fmt(n: number, dec = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

interface BookHoldingsPanelProps {
  positions: SnapshotPosition[];
  cash: number;
  totalValue: number;
  loading?: boolean;
  /** When set, only show this asset class (forex page uses "forex") */
  defaultFilter?: AssetFilter;
  showFilters?: boolean;
}

export function BookHoldingsPanel({
  positions,
  cash,
  totalValue,
  loading,
  defaultFilter = "all",
  showFilters = true,
}: BookHoldingsPanelProps) {
  const activeBook = useActiveBookStore((s) => s.activeBook);
  const [filter, setFilter] = useState<AssetFilter>(defaultFilter);

  const filtered = useMemo(() => {
    if (filter === "all") return positions;
    return positions.filter((p) => p.assetClass === filter);
  }, [positions, filter]);

  const invested = filtered.reduce((s, p) => s + p.marketValue, 0);
  const unrealized = filtered.reduce((s, p) => s + p.unrealizedPnl, 0);
  const bookType = activeBook?.accountType === "client" ? "Client" : "Personal";
  const bookName = activeBook?.label ?? "Personal Account";

  const filters: { id: AssetFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "stock", label: "Stocks" },
    { id: "forex", label: "Forex" },
    { id: "crypto", label: "Crypto" },
    { id: "option", label: "Options" },
  ];

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <div>
          <span className={styles.badge}>{bookType} book</span>
          <h3 className={styles.title}>{bookName}</h3>
          <p className={styles.sub}>Holdings for this sleeve only · synced from Supabase</p>
        </div>
        <div className={styles.summary}>
          <div>
            <span className={styles.sumL}>Cash</span>
            <span className={styles.sumV}>${fmt(cash)}</span>
          </div>
          <div>
            <span className={styles.sumL}>Invested</span>
            <span className={styles.sumV}>${fmt(invested)}</span>
          </div>
          <div>
            <span className={styles.sumL}>Unrealized</span>
            <span className={`${styles.sumV} ${unrealized >= 0 ? styles.up : styles.down}`}>
              {unrealized >= 0 ? "+" : ""}${fmt(Math.abs(unrealized))}
            </span>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className={styles.filters}>
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`${styles.filterBtn} ${filter === f.id ? styles.filterActive : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              <span className={styles.filterCount}>
                {f.id === "all"
                  ? positions.length
                  : positions.filter((p) => p.assetClass === f.id).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className={styles.empty}>Loading holdings…</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          No {filter === "all" ? "" : `${filter} `}positions in this {bookType.toLowerCase()} book.
          <Link href="/trade" className={styles.link}>
            Trade →
          </Link>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Name</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Value</th>
                <th>P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.symbol}>
                  <td className={styles.sym}>{p.symbol}</td>
                  <td>{p.name}</td>
                  <td>
                    <span className={styles.typeBadge}>{p.assetClass}</span>
                  </td>
                  <td className={styles.mono}>
                    {p.assetClass === "forex" || p.assetClass === "crypto"
                      ? p.qty.toFixed(4)
                      : p.qty}
                  </td>
                  <td className={styles.mono}>${fmt(p.currentPrice, p.assetClass === "forex" ? 5 : 2)}</td>
                  <td className={styles.mono}>${fmt(p.marketValue)}</td>
                  <td className={`${styles.mono} ${p.unrealizedPnl >= 0 ? styles.up : styles.down}`}>
                    {p.unrealizedPnl >= 0 ? "+" : ""}${fmt(Math.abs(p.unrealizedPnl))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
