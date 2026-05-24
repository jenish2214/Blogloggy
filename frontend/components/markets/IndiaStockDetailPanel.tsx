"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { marketApi } from "@/lib/api";
import type { IndiaCompanyDetail } from "@/types/india-market";
import styles from "./IndiaStockDetailPanel.module.css";

interface Props {
  symbol: string;
  onClose: () => void;
}

function FinancialBlock({
  title,
  table,
}: {
  title: string;
  table?: { headers: string[]; rows: Record<string, string>[] };
}) {
  if (!table?.headers?.length || !table.rows?.length) return null;
  return (
    <section className={styles.block}>
      <h3 className={styles.blockTitle}>{title}</h3>
      <div className={styles.tableScroll}>
        <table className={styles.finTable}>
          <thead>
            <tr>
              <th>Metric</th>
              {table.headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => {
              const label = row[table.headers[0]] ?? Object.values(row)[0] ?? `Row ${i + 1}`;
              return (
                <tr key={i}>
                  <td className={styles.metricCell}>{label}</td>
                  {table.headers.map((h) => (
                    <td key={h}>{row[h] ?? "—"}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function IndiaStockDetailPanel({ symbol, onClose }: Props) {
  const [company, setCompany] = useState<IndiaCompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    marketApi
      .getIndiaCompany(symbol)
      .then(({ company: c }) => {
        if (!cancelled) setCompany(c);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={`${symbol} fundamentals`}>
      <button type="button" className={styles.backdrop} onClick={onClose} aria-label="Close" />
      <div className={styles.panel}>
        <header className={styles.head}>
          <div>
            <p className={styles.eyebrow}>Screener.in · NSE/BSE fundamentals</p>
            <h2 className={styles.title}>{company?.name ?? symbol}</h2>
            <p className={styles.sym}>{symbol}</p>
          </div>
          <div className={styles.headActions}>
            {company?.screenerUrl && (
              <a
                href={company.screenerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
              >
                Open on Screener.in
              </a>
            )}
            <Link
              href={`/trade?symbol=${encodeURIComponent(symbol)}&name=${encodeURIComponent(company?.name ?? symbol)}`}
              className="btn btn-primary btn-sm"
            >
              Trade
            </Link>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
              Close
            </button>
          </div>
        </header>

        <div className={styles.body}>
          {loading && <p className={styles.status}>Loading fundamentals…</p>}
          {error && <p className={styles.error}>{error}</p>}
          {company && !loading && (
            <>
              <section className={styles.ratioGrid}>
                {company.topRatios.map((r) => (
                  <div key={r.name} className={styles.ratioCard}>
                    <span className={styles.ratioLabel}>{r.name}</span>
                    <span className={styles.ratioValue}>{r.value}</span>
                  </div>
                ))}
              </section>

              {company.analysis && (
                <section className={styles.block}>
                  <h3 className={styles.blockTitle}>Analysis</h3>
                  {company.analysis.description && (
                    <p className={styles.desc}>{company.analysis.description}</p>
                  )}
                  <div className={styles.prosCons}>
                    <div>
                      <h4 className={styles.subTitle}>Pros</h4>
                      <ul>
                        {company.analysis.pros.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className={styles.subTitle}>Cons</h4>
                      <ul>
                        {company.analysis.cons.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>
              )}

              <FinancialBlock title="Quarterly results" table={company.quarters} />
              <FinancialBlock title="Profit & loss" table={company.profitLoss} />
              <FinancialBlock title="Balance sheet" table={company.balanceSheet} />
              <FinancialBlock title="Cash flow" table={company.cashFlow} />
              <FinancialBlock title="Key ratios" table={company.ratios} />
              <FinancialBlock title="Shareholding" table={company.shareholding} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
