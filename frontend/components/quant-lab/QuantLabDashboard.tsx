"use client";

import { useEffect } from "react";
import {
  useQuantLabStore,
  QUANT_LAB_MODE_STORAGE_KEY,
  type QuantLabTabId,
  type QuantLabMode,
} from "@/lib/store/quantLab";
import { BacktestTab } from "./BacktestTab";
import { MarketOverviewTab } from "./MarketOverviewTab";
import { MonteCarloTab } from "./MonteCarloTab";
import { NewsSentimentTab } from "./NewsSentimentTab";
import { OptionsPricerTab } from "./OptionsPricerTab";
import { PredictionsHub } from "./PredictionsHub";
import { QuantLabHeader, useQuantEngine } from "./QuantLabHeader";
import { QuantLabMarketStrip } from "./QuantLabMarketStrip";
import { QuantLabMiniChart } from "./QuantLabMiniChart";
import styles from "./quant-lab.module.css";

const TABS: { id: QuantLabTabId; label: string }[] = [
  { id: "market-overview", label: "Market Overview" },
  { id: "predictions", label: "Predictions Hub" },
  { id: "options", label: "Options Pricer" },
  { id: "monte-carlo", label: "Monte Carlo" },
  { id: "backtest", label: "Backtest" },
  { id: "news-sentiment", label: "News & Sentiment" },
];

export function QuantLabDashboard() {
  const { activeTab, setActiveTab, engineOk, refreshLiveData, quantLabMode, setQuantLabMode } =
    useQuantLabStore();
  const { benchmark, engineError, warming, warmupSeconds } = useQuantEngine();

  useEffect(() => {
    const saved = localStorage.getItem(QUANT_LAB_MODE_STORAGE_KEY) as QuantLabMode | null;
    if (saved === "beginner" || saved === "pro") setQuantLabMode(saved);
  }, [setQuantLabMode]);

  useEffect(() => {
    void refreshLiveData();
  }, [refreshLiveData]);

  const engineOnline = engineOk === true;
  const showWarmup = engineOk === false && warming;

  return (
    <div className={`${styles.root} ${quantLabMode === "pro" ? styles.proMode : styles.beginnerMode}`}>
      <QuantLabHeader benchmark={benchmark} />
      <QuantLabMarketStrip />

      {showWarmup && (
        <div className={styles.warmupScreen} role="status">
          <div className={styles.warmupSpinner} aria-hidden />
          <h2 className={styles.warmupTitle}>Engine is warming up…</h2>
          <p className={styles.warmupText}>
            The quant service may take 30–60 seconds on Render free tier after idle. Retrying every 5 seconds
            {warmupSeconds > 0 ? ` (${warmupSeconds}s)` : ""}.
          </p>
        </div>
      )}

      {engineError && engineOk === false && !showWarmup && (
        <div className={styles.engineBanner}>
          <p>
            Quant engine offline.{" "}
            {engineError.includes("not_configured") || engineError.includes("not_deployed") ? (
              <>
                Deploy on{" "}
                <a
                  href="https://dashboard.render.com/blueprint/new?repo=https://github.com/jenish2214/Blogloggy"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Render
                </a>{" "}
                and set <code>QUANT_SERVICE_URL</code>, or run <code>npm run dev</code> locally.
              </>
            ) : (
              <>Run <code>npm run dev</code> or check <code>QUANT_SERVICE_URL</code>.</>
            )}
          </p>
        </div>
      )}

      <nav className={styles.tabBar} aria-label="Quant Lab sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className={styles.tabContent} aria-hidden={showWarmup}>
        {showWarmup ? null : (
          <>
        <QuantLabMiniChart title={`${activeTab.replace(/-/g, " ")} · price history`} />
        {activeTab === "market-overview" && <MarketOverviewTab />}
        {activeTab === "predictions" && <PredictionsHub engineOk={engineOnline} />}
        {activeTab === "options" && <OptionsPricerTab engineOk={engineOnline} />}
        {activeTab === "monte-carlo" && <MonteCarloTab engineOk={engineOnline} benchmark={benchmark} />}
        {activeTab === "backtest" && <BacktestTab engineOk={engineOnline} />}
        {activeTab === "news-sentiment" && <NewsSentimentTab />}
          </>
        )}
      </div>

    </div>
  );
}
