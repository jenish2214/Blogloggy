"use client";

import { useState } from "react";
import type { ClientFormMode } from "@/lib/hooks/useClientsCrud";
import type { ClientFormPayload, ClientDetailResponse, WealthBookSummary } from "@/lib/api";
import styles from "./ClientCrudPanel.module.css";

interface ClientCrudPanelProps {
  mode: ClientFormMode;
  form: ClientFormPayload;
  setForm: (f: ClientFormPayload) => void;
  detail: ClientDetailResponse | null;
  liveBook?: WealthBookSummary | null;
  saving: boolean;
  onClose: () => void;
  onCreate: () => Promise<void>;
  onUpdate: () => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit: () => void;
  selectedId: string | null;
  /** modal = overlay dialog; inline = right pane in master-detail layout */
  layout?: "modal" | "inline";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtUsd(n: number) {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function ClientCrudPanel({
  mode,
  form,
  setForm,
  detail,
  liveBook,
  saving,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
  onEdit,
  selectedId,
  layout = "modal",
}: ClientCrudPanelProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!mode) return null;

  const readOnly = mode === "read";
  const title =
    mode === "create"
      ? "Create client"
      : mode === "update"
        ? "Update client"
        : "Client details";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "create") await onCreate();
    else if (mode === "update") await onUpdate();
  };

  const panelBody = (
    <div className={layout === "inline" ? styles.panelInline : styles.panel}>
        <div className={styles.head}>
          <h2 className={styles.title}>{title}</h2>
          {layout === "modal" ? (
            <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
              ×
            </button>
          ) : null}
        </div>

        {mode === "read" && detail && (
          <div className={styles.readMeta}>
            <div className={styles.readRow}>
              <span className={styles.readLabel}>Client ID</span>
              <span className={styles.mono}>{detail.client.id.slice(0, 8)}…</span>
            </div>
            <div className={styles.readRow}>
              <span className={styles.readLabel}>Created</span>
              <span>{fmtDate(detail.client.created_at)}</span>
            </div>
            {detail.client.updated_at && (
              <div className={styles.readRow}>
                <span className={styles.readLabel}>Updated</span>
                <span>{fmtDate(detail.client.updated_at)}</span>
              </div>
            )}
            <div className={styles.readRow}>
              <span className={styles.readLabel}>Orders on book</span>
              <span className={styles.mono}>
                {liveBook?.metrics.orderCount ?? detail.stats.orderCount}
              </span>
            </div>
            {liveBook ? (
              <>
                <div className={styles.readRow}>
                  <span className={styles.readLabel}>Live total value</span>
                  <span className={styles.mono}>{fmtUsd(liveBook.metrics.totalValue)}</span>
                </div>
                <div className={styles.readRow}>
                  <span className={styles.readLabel}>Cash wallet</span>
                  <span className={styles.mono}>{fmtUsd(liveBook.metrics.cash)}</span>
                </div>
                <div className={styles.readRow}>
                  <span className={styles.readLabel}>Holdings (market)</span>
                  <span className={styles.mono}>{fmtUsd(liveBook.metrics.invested)}</span>
                </div>
                <div className={styles.readRow}>
                  <span className={styles.readLabel}>Return vs starting</span>
                  <span className={styles.mono}>
                    {fmtUsd(liveBook.metrics.totalPnl)} (
                    {liveBook.metrics.totalPnlPct.toFixed(2)}%)
                  </span>
                </div>
                <div className={styles.readRow}>
                  <span className={styles.readLabel}>Unrealized P&amp;L</span>
                  <span className={styles.mono}>{fmtUsd(liveBook.metrics.unrealizedPnl)}</span>
                </div>
                <div className={styles.readRow}>
                  <span className={styles.readLabel}>Open positions</span>
                  <span className={styles.mono}>{liveBook.metrics.openPositions}</span>
                </div>
              </>
            ) : detail.portfolio ? (
              <div className={styles.readRow}>
                <span className={styles.readLabel}>Book cash (stored)</span>
                <span className={styles.mono}>
                  {fmtUsd(Number((detail.portfolio as { cash?: number }).cash) || 0)}
                </span>
              </div>
            ) : null}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>Display name</label>
              <input
                className="input"
                required
                readOnly={readOnly}
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label>Client code</label>
              <input
                className="input"
                required
                readOnly={readOnly}
                value={form.clientCode}
                onChange={(e) => setForm({ ...form, clientCode: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label>Email</label>
              <input
                className="input"
                type="email"
                readOnly={readOnly}
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label>Status</label>
              <select
                className="input"
                disabled={readOnly}
                value={form.status ?? "active"}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>Tier</label>
              <select
                className="input"
                disabled={readOnly}
                value={form.tier ?? "private"}
                onChange={(e) => setForm({ ...form, tier: e.target.value })}
              >
                <option value="retail">Retail</option>
                <option value="private">Private</option>
                <option value="uhnw">UHNW</option>
                <option value="institutional">Institutional</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>Risk profile</label>
              <select
                className="input"
                disabled={readOnly}
                value={form.riskProfile ?? "moderate"}
                onChange={(e) => setForm({ ...form, riskProfile: e.target.value })}
              >
                <option value="conservative">Conservative</option>
                <option value="moderate">Moderate</option>
                <option value="growth">Growth</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>Initial capital ($)</label>
              <input
                className="input"
                type="number"
                min={1000}
                readOnly={readOnly || mode === "update"}
                title={mode === "update" ? "Capital set at onboarding" : undefined}
                value={form.initialCapital ?? 500000}
                onChange={(e) =>
                  setForm({ ...form, initialCapital: Number(e.target.value) })
                }
              />
            </div>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label>Notes</label>
              <textarea
                className="input"
                rows={3}
                readOnly={readOnly}
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.actions}>
            {mode === "read" && selectedId && (
              <>
                <button type="button" className="btn btn-primary btn-sm" onClick={onEdit}>
                  Edit
                </button>
                {!confirmDelete ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ color: "var(--down)" }}
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete
                  </button>
                ) : (
                  <>
                    <span className={styles.confirmText}>Delete this client and book?</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ color: "var(--down)", fontWeight: 700 }}
                      disabled={saving}
                      onClick={async () => {
                        await onDelete(selectedId);
                        setConfirmDelete(false);
                      }}
                    >
                      {saving ? "Deleting…" : "Confirm delete"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </>
            )}
            {mode === "create" && (
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                {saving ? "Creating…" : "Create client"}
              </button>
            )}
            {mode === "update" && (
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            )}
            {layout === "modal" ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
                Close
              </button>
            ) : mode === "create" ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
    </div>
  );

  if (layout === "inline") {
    return panelBody;
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      {panelBody}
    </div>
  );
}
