"use client";

import { useCallback, useEffect, useState } from "react";
import { getBasicFinancials, isValidQuote } from "@/lib/finnhub";
import { useQuantLabStore } from "@/lib/store/quantLab";
import type { BasicFinancials } from "@/types/finnhub";
import { ExplainerPanel, MetricSkeleton, QuantLabError } from "./QuantLabShared";
import { fmtPrice, fmtSignedPct, fmtSignedPrice, formatMarketCap } from "./quantLabLabels";
import styles from "./quant-lab.module.css";

const REFRESH_MS = 30_000;

export function MarketOverviewTab() {
  const {
    activeSymbol,
    liveQuote,
    companyProfile,
    isLiveDataLoading,
    liveDataError,
    quantLabMode,
    refreshLiveData,
  } = useQuantLabStore();

  const [financials, setFinancials] = useState<BasicFinancials | null>(null);
  const [finLoading, setFinLoading] = useState(true);
  const [finError, setFinError] = useState(false);

  const loadFinancials = useCallback(async () => {
    setFinLoading(true);
    setFinError(false);
    const data = await getBasicFinancials(activeSymbol);
    if (!data) setFinError(true);
    setFinancials(data);
    setFinLoading(false);
  }, [activeSymbol]);

  useEffect(() => {
    void loadFinancials();
  }, [loadFinancials]);

  useEffect(() => {
    const id = setInterval(() => {
      void refreshLiveData();
      void loadFinancials();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [refreshLiveData, loadFinancials]);

  const loading = isLiveDataLoading && !liveQuote;
  const metric = financials?.metric;

  if (loading || finLoading) {
    return (
      <div className={styles.tabPanel}>
        <MetricSkeleton count={4} />
      </div>
    );
  }

  if (liveDataError && !liveQuote) {
    return (
      <div className={styles.tabPanel}>
        <QuantLabError message="Could not load live market data." onRetry={() => void refreshLiveData()} />
      </div>
    );
  }

  if (!isValidQuote(liveQuote)) {
    return (
      <div className={styles.tabPanel}>
        <p className={styles.emptyState}>
          No live quote for {activeSymbol}. Try another symbol or check your Finnhub key.
        </p>
      </div>
    );
  }

  const price = liveQuote.c;
  const change = liveQuote.d;
  const changePct = liveQuote.dp;
  const hasChange = change != null && changePct != null;
  const changePositive = hasChange && change >= 0;
  const w52High = metric?.["52WeekHigh"];
  const w52Low = metric?.["52WeekLow"];
  const marketCapB = companyProfile?.marketCapitalization ?? 0;

  return (
    <div className={styles.tabPanel}>
      <h2 className={styles.sectionHeader}>Live Quote</h2>
      <div className={styles.cardGrid4}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Current Price</div>
          <div className={styles.metricValue}>${fmtPrice(price)}</div>
          {hasChange ? (
            <div className={changePositive ? styles.upText : styles.downText}>
              {changePositive ? "▲" : "▼"} {fmtSignedPct(changePct)} ({fmtSignedPrice(change)})
            </div>
          ) : (
            <div className={styles.cardHint}>Change unavailable (market may be closed)</div>
          )}
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Day Range</div>
          <div className={styles.metricValue}>
            {liveQuote.l != null && liveQuote.h != null
              ? `$${fmtPrice(liveQuote.l)} – $${fmtPrice(liveQuote.h)}`
              : "—"}
          </div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>52W Range</div>
          <div className={styles.metricValue}>
            {w52Low != null && w52High != null
              ? `$${w52Low.toFixed(2)} – $${w52High.toFixed(2)}`
              : "—"}
          </div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Market Cap</div>
          <div className={styles.metricValue}>
            {marketCapB > 0 ? formatMarketCap(marketCapB) : "—"}
          </div>
        </div>
      </div>

      {companyProfile && (
        <>
          <h2 className={styles.sectionHeader}>Company Profile</h2>
          <div className={styles.profileRow}>
            {companyProfile.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={companyProfile.logo} alt="" className={styles.companyLogoLg} width={48} height={48} />
            )}
            <div>
              <div className={styles.companyNameLg}>{companyProfile.name}</div>
              <div className={styles.tagRow}>
                <span className={styles.tag}>{companyProfile.exchange}</span>
                {companyProfile.industry && <span className={styles.tagMuted}>{companyProfile.industry}</span>}
              </div>
            </div>
          </div>
          <div className={styles.statRow}>
            <div className={styles.statChip} title={quantLabMode === "beginner" ? "Beta vs market volatility" : undefined}>
              <span className={styles.metricLabel}>Beta</span>
              <strong>{metric?.beta?.toFixed(2) ?? "—"}</strong>
            </div>
            <div className={styles.statChip} title={quantLabMode === "beginner" ? "Price-to-earnings ratio" : undefined}>
              <span className={styles.metricLabel}>P/E</span>
              <strong>{metric?.peBasicExclExtraTTM?.toFixed(1) ?? "—"}</strong>
            </div>
            <div className={styles.statChip}>
              <span className={styles.metricLabel}>Rev / Share</span>
              <strong>
                {metric?.revenuePerShareTTM != null ? `$${metric.revenuePerShareTTM.toFixed(2)}` : "—"}
              </strong>
            </div>
          </div>
        </>
      )}

      {finError && (
        <QuantLabError message="Fundamentals unavailable for this symbol." onRetry={() => void loadFinancials()} />
      )}

      <ExplainerPanel mode={quantLabMode}>
        <ul className={styles.explainerList}>
          <li>
            <strong>Beta</strong> — how volatile this stock is vs the market. Beta &gt; 1 means more risky.
          </li>
          <li>
            <strong>P/E ratio</strong> — how much investors pay per dollar of earnings. Lower can mean cheaper, but context matters.
          </li>
          <li>
            <strong>52-week range</strong> — highest and lowest traded prices over the past year.
          </li>
          <li>
            <strong>Market cap</strong> — total value of all outstanding shares (price × shares).
          </li>
        </ul>
      </ExplainerPanel>
    </div>
  );
}
