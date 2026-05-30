"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./admin.module.css";

type DataRow = { id: string; cells: string[] };

type Payload = {
  title: string;
  description: string;
  columns: string[];
  rows: DataRow[];
  total: number;
  error?: string;
};

type Props = {
  apiPath: string;
  eyebrow?: string;
};

export function AdminModuleDataPanel({ apiPath, eyebrow = "Admin module" }: Props) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiPath, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to load");
        setData(null);
        return;
      }
      setData(json);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [apiPath]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <header className={styles.pageHead}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.pageTitle}>{data?.title ?? "Loading…"}</h1>
        <p className={styles.pageDesc}>{data?.description ?? "Fetching from Supabase…"}</p>
      </header>

      <div className={styles.usersToolbar}>
        <span className={styles.usersCount}>
          {loading ? "Loading…" : `${data?.total ?? 0} record${data?.total === 1 ? "" : "s"}`}
        </span>
        <button type="button" className={styles.quickAction} onClick={() => void load()} disabled={loading}>
          Refresh
        </button>
      </div>

      {error && (
        <div className={styles.usersError}>
          <p>{error}</p>
          {error.includes("SERVICE_ROLE") && (
            <p className={styles.usersErrorHint}>Add SUPABASE_SERVICE_ROLE_KEY to frontend/.env.local</p>
          )}
        </div>
      )}

      {!loading && data && data.rows.length === 0 && !error && (
        <div className={styles.activityPanel}>
          <p className={styles.activityEmpty}>No records in Supabase yet.</p>
        </div>
      )}

      {data && data.rows.length > 0 && (
        <div className={styles.userTableWrap}>
          <table className={styles.userTable}>
            <thead>
              <tr>
                <th>#</th>
                {data.columns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={row.id}>
                  <td>{i + 1}</td>
                  {row.cells.map((cell, j) => (
                    <td key={`${row.id}-${j}`}>{cell ?? "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
