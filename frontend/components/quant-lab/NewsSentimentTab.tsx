"use client";

import { useCallback, useEffect, useState } from "react";
import { getEarnings, getNewsSentiment } from "@/lib/finnhub";
import { useQuantLabStore } from "@/lib/store/quantLab";
import type { EarningsRow, NewsSentiment } from "@/types/finnhub";
import { ExplainerPanel, MetricSkeleton, QuantLabError } from "./QuantLabShared";
import { sentimentTag } from "./quantLabLabels";
import styles from "./quant-lab.module.css";

export function NewsSentimentTab() {
  const { activeSymbol, quantLabMode } = useQuantLabStore();
  const [sentiment, setSentiment] = useState<NewsSentiment | null>(null);
  const [earnings, setEarnings] = useState<EarningsRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const [s, e] = await Promise.all([getNewsSentiment(activeSymbol), getEarnings(activeSymbol)]);
    if (!s && !e) setError(true);
    setSentiment(s);
    setEarnings(e);
    setLoading(false);
  }, [activeSymbol]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className={styles.tabPanel}>
        <MetricSkeleton count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.tabPanel}>
        <QuantLabError message="News and sentiment data unavailable." onRetry={() => void load()} />
      </div>
    );
  }

  const bullish = sentiment?.sentiment?.bullishPercent ?? 0;
  const bearish = sentiment?.sentiment?.bearishPercent ?? 0;
  const neutral = Math.max(0, 100 - bullish - bearish);
  const buzz = sentiment?.buzz?.weeklyAverage ?? null;
  const tag = sentimentTag(bullish, bearish);

  return (
    <div className={styles.tabPanel}>
      <h2 className={styles.sectionHeader}>News Sentiment</h2>
      <p className={styles.sectionSub}>Based on recent news articles (Finnhub NLP)</p>

      <div className={styles.sentimentGaugeWrap}>
        <div className={styles.sentimentLabels}>
          <span className={styles.downText}>{bearish.toFixed(0)}% Bearish</span>
          {quantLabMode === "beginner" && <span>{tag}</span>}
          <span className={styles.upText}>{bullish.toFixed(0)}% Bullish</span>
        </div>
        <div className={styles.sentimentBar}>
          <div className={styles.sentimentBear} style={{ width: `${bearish}%` }} />
          <div className={styles.sentimentNeutral} style={{ width: `${neutral}%` }} />
          <div className={styles.sentimentBull} style={{ width: `${bullish}%` }} />
        </div>
      </div>

      <div className={styles.cardGrid2}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Buzz Score</div>
          <div className={styles.metricValue}>{buzz != null ? buzz.toFixed(2) : "—"}</div>
          <p className={styles.cardHint}>News volume this week vs normal</p>
        </div>
      </div>

      <ExplainerPanel mode={quantLabMode}>
        <p>
          High buzz can mean something big is happening — check the news. Sentiment scores come from NLP on recent
          headlines, not trading advice.
        </p>
      </ExplainerPanel>

      <h2 className={styles.sectionHeader}>Earnings Calendar</h2>
      {earnings && earnings.length > 0 ? (
        <div className={styles.tableWrap}>
          <table className={styles.predTable}>
            <thead>
              <tr>
                <th>Period</th>
                <th>Estimated EPS</th>
                <th>Actual EPS</th>
                <th>Surprise %</th>
              </tr>
            </thead>
            <tbody>
              {earnings.map((row) => {
                const surprise = row.surprisePercent ?? 0;
                const positive = surprise >= 0;
                return (
                  <tr key={row.period}>
                    <td>{row.period}</td>
                    <td>{row.estimate != null ? row.estimate.toFixed(2) : "—"}</td>
                    <td>{row.actual != null ? row.actual.toFixed(2) : "—"}</td>
                    <td className={positive ? styles.upText : styles.downText}>
                      {row.surprisePercent != null
                        ? `${positive ? "+" : ""}${row.surprisePercent.toFixed(1)}%`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={styles.emptyState}>No earnings data for {activeSymbol}.</p>
      )}

      <ExplainerPanel mode={quantLabMode}>
        <p>EPS surprise = company earned more or less than analysts expected. Positive surprise often moves the stock short-term.</p>
      </ExplainerPanel>
    </div>
  );
}
