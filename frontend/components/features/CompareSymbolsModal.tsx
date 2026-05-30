"use client";

import { useEffect, useState } from "react";
import { getBasicFinancials, getCompanyProfile, getQuote } from "@/lib/finnhub";
import styles from "./features.module.css";

interface Props {
  symbolA: string;
  symbolB: string;
  onClose: () => void;
}

function winnerClass(a: number | null, b: number | null, higherBetter = true) {
  if (a == null || b == null) return "";
  if (a === b) return "";
  const aWins = higherBetter ? a > b : a < b;
  return aWins ? "left" : "right";
}

export function CompareSymbolsModal({ symbolA, symbolB, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Array<{ label: string; a: string; b: string; win?: string }>>([]);
  const [takeaway, setTakeaway] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [qa, qb, pa, pb, fa, fb] = await Promise.all([
        getQuote(symbolA),
        getQuote(symbolB),
        getCompanyProfile(symbolA),
        getCompanyProfile(symbolB),
        getBasicFinancials(symbolA),
        getBasicFinancials(symbolB),
      ]);
      if (!alive) return;

      const peA = fa?.metric?.peBasicExclExtraTTM;
      const peB = fb?.metric?.peBasicExclExtraTTM;
      const betaA = fa?.metric?.beta;
      const betaB = fb?.metric?.beta;

      const next = [
        {
          label: "Price",
          a: qa?.c != null ? `$${qa.c.toFixed(2)}` : "—",
          b: qb?.c != null ? `$${qb.c.toFixed(2)}` : "—",
          win: winnerClass(qa?.c ?? null, qb?.c ?? null),
        },
        {
          label: "Day change %",
          a: qa?.dp != null ? `${qa.dp.toFixed(2)}%` : "—",
          b: qb?.dp != null ? `${qb.dp.toFixed(2)}%` : "—",
          win: winnerClass(qa?.dp ?? null, qb?.dp ?? null),
        },
        {
          label: "P/E (TTM)",
          a: peA != null ? String(peA.toFixed(1)) : "—",
          b: peB != null ? String(peB.toFixed(1)) : "—",
          win: winnerClass(peA ?? null, peB ?? null, false),
        },
        {
          label: "Beta",
          a: betaA != null ? String(betaA.toFixed(2)) : "—",
          b: betaB != null ? String(betaB.toFixed(2)) : "—",
          win: winnerClass(betaA ?? null, betaB ?? null, false),
        },
        {
          label: "Industry",
          a: pa?.industry ?? "—",
          b: pb?.industry ?? "—",
        },
      ];
      setRows(next);

      const momentumA = qa?.dp ?? 0;
      const momentumB = qb?.dp ?? 0;
      if (momentumA > momentumB + 1) {
        setTakeaway(`${symbolA} has stronger short-term momentum today. Not a buy recommendation — review risk first.`);
      } else if (momentumB > momentumA + 1) {
        setTakeaway(`${symbolB} has stronger short-term momentum today. Compare valuation (P/E) before sizing a position.`);
      } else {
        setTakeaway("Both names are moving similarly today. Use sector fit and your risk limits to choose size.");
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [symbolA, symbolB]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className={styles.panel}
        style={{ maxWidth: 560, width: "100%", margin: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.panelHead}>
          <h2 className={styles.title}>
            {symbolA} vs {symbolB}
          </h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
        {loading ? (
          <div className="skeleton" style={{ height: 120 }} />
        ) : (
          <>
            <table className="data-table" style={{ width: "100%", marginBottom: 12 }}>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>{symbolA}</th>
                  <th>{symbolB}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label}>
                    <td>{r.label}</td>
                    <td className={r.win === "left" ? styles.winner : undefined}>{r.a}</td>
                    <td className={r.win === "right" ? styles.winner : undefined}>{r.b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>{takeaway}</p>
          </>
        )}
      </div>
    </div>
  );
}
