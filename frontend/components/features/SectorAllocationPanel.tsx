"use client";

import { useEffect, useMemo, useState } from "react";
import type { SnapshotPosition } from "@/lib/trading/portfolioSnapshot";
import { getCompanyProfile } from "@/lib/finnhub";
import styles from "./features.module.css";

const SP_BENCHMARK: Record<string, number> = {
  Technology: 28,
  Healthcare: 13,
  "Financial Services": 13,
  "Consumer Cyclical": 11,
  "Communication Services": 9,
  Industrials: 8,
  "Consumer Defensive": 6,
  Energy: 4,
  Utilities: 3,
  "Real Estate": 2,
  "Basic Materials": 2,
};

interface Props {
  positions: SnapshotPosition[];
  totalValue: number;
}

export function SectorAllocationPanel({ positions, totalValue }: Props) {
  const [sectors, setSectors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!positions.length) return;
    let alive = true;
    setLoading(true);
    Promise.all(
      positions.map(async (p) => {
        try {
          const profile = await getCompanyProfile(p.symbol);
          return [p.symbol, profile?.industry ?? "Other"] as const;
        } catch {
          return [p.symbol, "Other"] as const;
        }
      })
    ).then((rows) => {
      if (!alive) return;
      setSectors(Object.fromEntries(rows));
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [positions]);

  const breakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of positions) {
      const sector = sectors[p.symbol] ?? "Other";
      map.set(sector, (map.get(sector) ?? 0) + p.marketValue);
    }
    const tv = totalValue || 1;
    return Array.from(map.entries())
      .map(([sector, value]) => ({
        sector,
        value,
        weight: (value / tv) * 100,
        benchmark: SP_BENCHMARK[sector] ?? 5,
        overweight: (value / tv) * 100 > (SP_BENCHMARK[sector] ?? 5) * 2,
      }))
      .sort((a, b) => b.weight - a.weight);
  }, [positions, sectors, totalValue]);

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <div>
          <h2 className={styles.title}>Sector allocation</h2>
        </div>
      </div>
      {loading ? (
        <div className="skeleton" style={{ height: 80 }} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {breakdown.map((row) => (
            <div key={row.sector}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                <span>
                  {row.sector}
                  {row.overweight && (
                    <span className="badge badge-down" style={{ marginLeft: 8, fontSize: "0.65rem" }}>
                      Overweight
                    </span>
                  )}
                </span>
                <span style={{ fontFamily: "var(--font-mono)" }}>
                  {row.weight.toFixed(1)}% · S&amp;P ~{row.benchmark}%
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  marginTop: 6,
                  background: "var(--bg-elevated)",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, row.weight)}%`,
                    height: "100%",
                    background: row.overweight ? "var(--down)" : "var(--accent)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
