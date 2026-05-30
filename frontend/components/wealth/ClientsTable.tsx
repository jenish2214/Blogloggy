"use client";

import type { WealthBookSummary, WealthClient } from "@/lib/api";
import { fmtUsd } from "@/lib/trading/portfolioSnapshot";
import styles from "./ClientsTable.module.css";

interface ClientsTableProps {
  clients: WealthClient[];
  loading: boolean;
  activeClientId: string | null;
  bookByClientId?: Map<string, WealthBookSummary>;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function pnlClass(n: number) {
  return n >= 0 ? styles.pnlUp : styles.pnlDown;
}

export function ClientsTable({
  clients,
  loading,
  activeClientId,
  bookByClientId,
  onView,
  onEdit,
  onDelete,
}: ClientsTableProps) {
  if (loading && clients.length === 0) {
    return <div className={styles.empty}>Loading clients…</div>;
  }

  if (clients.length === 0) {
    return (
      <div className={styles.empty}>
        No clients match your search. Create a client to open a managed book.
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Code</th>
            <th>Email</th>
            <th>Tier</th>
            <th>Risk</th>
            <th>Status</th>
            <th>Allocated</th>
            <th>Live value</th>
            <th>Return</th>
            <th>Positions</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => {
            const book = bookByClientId?.get(c.id);
            const m = book?.metrics;
            return (
              <tr key={c.id} className={activeClientId === c.id ? styles.rowActive : undefined}>
                <td>
                  <strong>{c.display_name}</strong>
                </td>
                <td className={styles.mono}>{c.client_code}</td>
                <td>{c.email ?? "—"}</td>
                <td>
                  <span className={styles.badge}>{c.tier}</span>
                </td>
                <td>{c.risk_profile}</td>
                <td>
                  <span
                    className={`${styles.status} ${
                      c.status === "active"
                        ? styles.statusActive
                        : c.status === "inactive"
                          ? styles.statusOff
                          : ""
                    }`}
                  >
                    {c.status}
                  </span>
                </td>
                <td className={styles.mono}>{fmtUsd(Number(c.initial_capital))}</td>
                <td className={styles.mono}>
                  {m ? fmtUsd(m.totalValue) : "—"}
                </td>
                <td className={`${styles.mono} ${m ? pnlClass(m.totalPnl) : ""}`}>
                  {m ? fmtUsd(m.totalPnl, { signed: true }) : "—"}
                </td>
                <td className={styles.mono}>{m ? m.openPositions : "—"}</td>
                <td>
                  <div className={styles.actions}>
                    <button type="button" className={styles.btn} onClick={() => onView(c.id)}>
                      View
                    </button>
                    <button type="button" className={styles.btn} onClick={() => onEdit(c.id)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnDanger}`}
                      onClick={() => onDelete(c.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
