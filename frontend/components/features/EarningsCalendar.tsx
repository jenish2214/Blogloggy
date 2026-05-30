"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getDailyLossLimit } from "@/lib/features/riskLimits";
import { loadPortfolioSnapshot } from "@/lib/trading/portfolioSnapshot";
import styles from "./features.module.css";

interface EarningsEvent {
  symbol: string;
  date: string;
  hour?: string;
}

interface EarningsIntel {
  symbol: string;
  ivRank: number;
  atmIv: number | null;
  expectedMovePct: number | null;
  historicalMoves: { period: string; movePct: number }[];
  exposureAlert: string | null;
  beginnerGuide: string;
  proGuide: string;
}

interface Props {
  ownedSymbols?: string[];
  compact?: boolean;
}

function dedupeEarnings(events: EarningsEvent[]): EarningsEvent[] {
  const seen = new Map<string, EarningsEvent>();
  for (const ev of events) {
    const k = `${ev.symbol}|${ev.date}|${ev.hour ?? ""}`;
    if (!seen.has(k)) seen.set(k, ev);
  }
  return Array.from(seen.values());
}

export function EarningsCalendar({ ownedSymbols = [], compact }: Props) {
  const [events, setEvents] = useState<EarningsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EarningsEvent | null>(null);
  const [intel, setIntel] = useState<EarningsIntel | null>(null);
  const [intelLoading, setIntelLoading] = useState(false);
  const [mode, setMode] = useState<"beginner" | "pro">("beginner");
  const [exposureBySymbol, setExposureBySymbol] = useState<Record<string, number>>({});

  const owned = useMemo(
    () => new Set(ownedSymbols.map((s) => s.toUpperCase().replace(/\.(NS|BO)$/i, ""))),
    [ownedSymbols]
  );

  useEffect(() => {
    void loadPortfolioSnapshot().then((snap) => {
      const map: Record<string, number> = {};
      for (const p of snap.positions) {
        const key = p.symbol.split(".")[0]!.toUpperCase();
        map[key] = (map[key] ?? 0) + p.marketValue;
      }
      setExposureBySymbol(map);
    });
  }, []);

  useEffect(() => {
    const from = new Date().toISOString().slice(0, 10);
    const to = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    fetch(`/api/market/earnings?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((j) => setEvents(dedupeEarnings(j.events ?? [])))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const loadIntel = useCallback(async (ev: EarningsEvent) => {
    setSelected(ev);
    setIntelLoading(true);
    setIntel(null);
    const sym = ev.symbol.split(".")[0]!;
    const exposure = exposureBySymbol[sym.toUpperCase()] ?? 0;
    const limit = getDailyLossLimit();
    try {
      const res = await fetch(
        `/api/market/earnings/intelligence?symbol=${encodeURIComponent(sym)}&exposure=${exposure}&dailyLossLimit=${limit}`
      );
      const j = await res.json();
      if (!j.error) setIntel(j as EarningsIntel);
    } catch {
      /* skip */
    } finally {
      setIntelLoading(false);
    }
  }, [exposureBySymbol]);

  const days = useMemo(() => {
    const out: { label: string; date: string; items: EarningsEvent[] }[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const date = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      out.push({
        label,
        date,
        items: events.filter((e) => e.date === date),
      });
    }
    return out;
  }, [events]);

  const highlighted = events.filter((e) => owned.has(e.symbol.split(".")[0]!));

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <div>
          <h2 className={styles.title}>Earnings intelligence</h2>
          <p className={styles.sub}>
            {highlighted.length > 0
              ? `${highlighted.length} upcoming for symbols you hold — tap for IV, expected move, and playbook`
              : "Next 5 days · tap any symbol for options-implied move"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div className={styles.modeToggle}>
            <button
              type="button"
              className={mode === "beginner" ? styles.modeOn : ""}
              onClick={() => setMode("beginner")}
            >
              Beginner
            </button>
            <button
              type="button"
              className={mode === "pro" ? styles.modeOn : ""}
              onClick={() => setMode("pro")}
            >
              Pro
            </button>
          </div>
          {!compact && <span className={styles.badge}>Finnhub + options</span>}
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 100 }} />
      ) : (
        <div className={styles.grid5}>
          {days.map((day) => (
            <div key={day.date} className={styles.dayCell}>
              <div className={styles.dayLabel}>{day.label}</div>
              {day.items.length === 0 ? (
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>—</span>
              ) : (
                day.items.slice(0, compact ? 4 : 8).map((e) => {
                  const base = e.symbol.split(".")[0]!;
                  const isOwned = owned.has(base);
                  const eventKey = `${e.symbol}-${e.date}-${e.hour ?? "na"}`;
                  const isSelected =
                    selected?.symbol === e.symbol &&
                    selected?.date === e.date &&
                    selected?.hour === e.hour;
                  return (
                    <button
                      key={eventKey}
                      type="button"
                      className={`${styles.earnSym} ${isOwned ? styles.earnOwned : ""} ${isSelected ? styles.earnSelected : ""}`}
                      onClick={() => void loadIntel(e)}
                    >
                      {base}
                      {isOwned && " · owned"}
                    </button>
                  );
                })
              )}
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className={styles.intelPanel}>
          <div className={styles.panelHead} style={{ marginBottom: 8 }}>
            <h3 className={styles.title}>
              {selected.symbol} · {selected.date}
              {selected.hour ? ` (${selected.hour})` : ""}
            </h3>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>

          {intelLoading && <div className="skeleton" style={{ height: 120 }} />}

          {intel && !intelLoading && (
            <>
              <div className={styles.ivRow}>
                <span className={styles.ivLabel}>IV rank</span>
                <div className={styles.ivTrack}>
                  <div
                    className={styles.ivFill}
                    style={{ width: `${intel.ivRank}%` }}
                  />
                </div>
                <span className={styles.ivVal}>{intel.ivRank}%</span>
                {intel.atmIv != null && (
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    ATM IV {intel.atmIv.toFixed(1)}%
                  </span>
                )}
              </div>

              {intel.expectedMovePct != null && (
                <p style={{ fontSize: "0.82rem", margin: "10px 0" }}>
                  <strong>Expected move (ATM straddle):</strong>{" "}
                  <span style={{ fontFamily: "var(--font-mono)" }}>
                    ±{intel.expectedMovePct.toFixed(2)}%
                  </span>
                  {exposureBySymbol[selected.symbol.split(".")[0]!] != null && (
                    <>
                      {" "}
                      → ~$
                      {(
                        (exposureBySymbol[selected.symbol.split(".")[0]!]! *
                          intel.expectedMovePct) /
                        100
                      ).toLocaleString(undefined, { maximumFractionDigits: 0 })}{" "}
                      on your position
                    </>
                  )}
                </p>
              )}

              {intel.exposureAlert && (
                <div className={styles.exposureAlert}>{intel.exposureAlert}</div>
              )}

              {intel.historicalMoves.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 6 }}>
                    Last {intel.historicalMoves.length} earnings-day moves
                  </div>
                  <div className={styles.histBars}>
                    {intel.historicalMoves.map((m) => (
                      <div key={m.period} className={styles.histCol}>
                        <div
                          className={styles.histBar}
                          style={{
                            height: `${Math.min(48, Math.abs(m.movePct) * 4)}px`,
                            background: m.movePct >= 0 ? "var(--up)" : "var(--down)",
                            alignSelf: m.movePct >= 0 ? "flex-end" : "flex-start",
                          }}
                        />
                        <span className={styles.histPct}>
                          {m.movePct >= 0 ? "+" : ""}
                          {m.movePct.toFixed(1)}%
                        </span>
                        <span className={styles.histPeriod}>
                          {m.period.slice(0, 7)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.actionGuide}>
                <strong>{mode === "beginner" ? "What to do" : "Pro playbook"}</strong>
                <p>{mode === "beginner" ? intel.beginnerGuide : intel.proGuide}</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
