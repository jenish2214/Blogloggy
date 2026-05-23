"use client";

import type { RealizedTradeLine } from "@/lib/trading/pnlStatement";
import styles from "./RealizedPnlTable.module.css";

function fmt(n: number, dec = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface RealizedPnlTableProps {
  trades: RealizedTradeLine[];
}

export function RealizedPnlTable({ trades }: RealizedPnlTableProps) {
  if (trades.length === 0) {
    return (
      <p className={styles.empty}>
        No closed sells yet — realized P&amp;L appears here after you exit positions.
      </p>
    );
  }

  const total = trades.reduce((s, t) => s + t.realizedPnl, 0);

  return (
    <div className={styles.wrap}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Symbol</th>
            <th>Qty sold</th>
            <th>Fill price</th>
            <th>Proceeds</th>
            <th>Cost basis</th>
            <th>Realized P&amp;L</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => {
            const up = t.realizedPnl >= 0;
            return (
              <tr key={t.id}>
                <td className={styles.mono}>{fmtDate(t.date)}</td>
                <td>
                  <strong>{t.symbol}</strong>
                </td>
                <td className={styles.mono}>{fmt(t.qty, t.qty < 1 ? 4 : 2)}</td>
                <td className={styles.mono}>${fmt(t.fillPrice)}</td>
                <td className={styles.mono}>${fmt(t.proceeds)}</td>
                <td className={styles.mono}>${fmt(t.costBasis)}</td>
                <td className={`${styles.mono} ${up ? styles.up : styles.down}`}>
                  {up ? "+" : "−"}${fmt(Math.abs(t.realizedPnl))}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={6} className={styles.footLabel}>
              Total realized ({trades.length} sell{trades.length === 1 ? "" : "s"})
            </td>
            <td className={`${styles.mono} ${total >= 0 ? styles.up : styles.down}`}>
              {total >= 0 ? "+" : "−"}${fmt(Math.abs(total))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
