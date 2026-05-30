"use client";

import type { WealthBookSummary, WealthClient } from "@/lib/api";
import type { useClientsCrud } from "@/lib/hooks/useClientsCrud";
import { ClientCrudPanel } from "@/components/wealth/ClientCrudPanel";
import { fmtUsd } from "@/lib/trading/portfolioSnapshot";
import styles from "./ClientsMasterDetail.module.css";

type Crud = ReturnType<typeof useClientsCrud>;

function pnlClass(n: number) {
  return n >= 0 ? styles.pnlUp : styles.pnlDown;
}

export interface ClientsMasterDetailProps {
  crud: Crud;
  bookByClientId?: Map<string, WealthBookSummary>;
  onDelete: (id: string) => Promise<void>;
  onWallet?: () => void;
}

export function ClientsMasterDetail({
  crud,
  bookByClientId,
  onDelete,
  onWallet,
}: ClientsMasterDetailProps) {
  const selectClient = (c: WealthClient) => {
    void crud.openRead(c.id);
  };

  return (
    <div className={styles.shell}>
      <aside className={styles.listPane} aria-label="Client list">
        <div className={styles.listHead}>
          <p className={styles.listTitle}>Clients ({crud.allCount})</p>
          <input
            className={`input ${styles.listSearch}`}
            placeholder="Search name, code, email…"
            value={crud.search}
            onChange={(e) => crud.setSearch(e.target.value)}
          />
          <div className={styles.listActions}>
            <button type="button" className="btn btn-primary btn-sm" onClick={crud.openCreate}>
              + New client
            </button>
            {onWallet ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={onWallet}>
                Wallet →
              </button>
            ) : null}
          </div>
        </div>

        <div className={styles.listScroll}>
          {crud.loading && crud.clients.length === 0 ? (
            <p className={styles.listEmpty}>Loading clients…</p>
          ) : crud.clients.length === 0 ? (
            <p className={styles.listEmpty}>
              No clients found. Create one with <strong>+ New client</strong>.
            </p>
          ) : (
            crud.clients.map((c) => {
              const book = bookByClientId?.get(c.id);
              const m = book?.metrics;
              const active = crud.selectedId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`${styles.clientBtn} ${active ? styles.clientBtnActive : ""}`}
                  onClick={() => selectClient(c)}
                  aria-current={active ? "true" : undefined}
                >
                  <span className={styles.clientName}>{c.display_name}</span>
                  <span className={styles.clientMeta}>{c.client_code}</span>
                  {m ? (
                    <span className={`${styles.clientSub} ${pnlClass(m.totalPnl)}`}>
                      {fmtUsd(m.totalValue)} · {c.status}
                    </span>
                  ) : (
                    <span className={styles.clientSub}>{c.tier} · {c.status}</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </aside>

      <div className={styles.detailPane}>
        {crud.mode ? (
          <ClientCrudPanel
            layout="inline"
            mode={crud.mode}
            form={crud.form}
            setForm={crud.setForm}
            detail={crud.detail}
            liveBook={
              crud.selectedId ? bookByClientId?.get(crud.selectedId) ?? null : null
            }
            saving={crud.saving}
            selectedId={crud.selectedId}
            onClose={crud.closePanel}
            onCreate={crud.create}
            onUpdate={crud.update}
            onDelete={onDelete}
            onEdit={() => crud.selectedId && crud.openUpdate(crud.selectedId)}
          />
        ) : (
          <div className={styles.detailEmpty}>
            <h3 className={styles.detailEmptyTitle}>Client details</h3>
            <p className={styles.detailEmptyDesc}>
              Select a client on the left to view profile, book metrics, and edit or delete the
              record.
            </p>
            <button type="button" className="btn btn-primary btn-sm" onClick={crud.openCreate}>
              + New client
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
