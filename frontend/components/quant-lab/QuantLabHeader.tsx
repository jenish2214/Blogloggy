"use client";

import { useCallback, useEffect, useState } from "react";
import type { ModelBenchmark } from "@/lib/quantApi";
import { quantApi } from "@/lib/quantApi";
import { useQuantLabStore } from "@/lib/store/quantLab";
import { getMarketStatusLabel, getUSMarketStatus } from "@/lib/trading/marketHours";
import { SymbolSearch } from "@/components/shared/SymbolSearch";
import styles from "./quant-lab.module.css";

interface QuantLabHeaderProps {
  benchmark: ModelBenchmark | null;
}

export function QuantLabHeader({ benchmark }: QuantLabHeaderProps) {
  const {
    activeSymbol,
    setActiveSymbol,
    companyProfile,
    isLiveDataLoading,
    engineOk,
    quantLabMode,
    setQuantLabMode,
  } = useQuantLabStore();
  const [input, setInput] = useState(activeSymbol);
  const [marketLabel, setMarketLabel] = useState(getMarketStatusLabel());

  useEffect(() => {
    setInput(activeSymbol);
  }, [activeSymbol]);

  useEffect(() => {
    const tick = () => setMarketLabel(getMarketStatusLabel());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const agreement = benchmark?.model_agreement_pct ?? null;
  const marketStatus = getUSMarketStatus();

  const submitSymbol = (e: React.FormEvent) => {
    e.preventDefault();
    const s = input.trim().toUpperCase();
    if (s) setActiveSymbol(s);
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerTop}>
        <div>
          <p className={styles.eyebrow}>QuantDesk · Quant Engine v2</p>
          <h1 className={styles.title}>Quant Lab</h1>
        </div>
        <div className={styles.headerControls}>
          <label className={styles.modeToggle}>
            <span className={quantLabMode === "beginner" ? styles.modeOn : ""}>Beginner</span>
            <input
              type="checkbox"
              checked={quantLabMode === "pro"}
              onChange={(e) => setQuantLabMode(e.target.checked ? "pro" : "beginner")}
              aria-label="Toggle beginner or pro mode"
            />
            <span className={quantLabMode === "pro" ? styles.modeOn : ""}>Pro</span>
          </label>
          <div className={styles.badgeRow}>
            <span className={engineOk ? styles.badgeOk : styles.badgeWarn}>
              {engineOk === null ? "CHECKING ENGINE…" : engineOk ? "ENGINE ONLINE" : "ENGINE OFFLINE"}
            </span>
            {agreement != null && (
              <span className={benchmark?.target_met ? styles.badgeOk : styles.badge}>
                MODEL AGR {agreement.toFixed(2)}%
              </span>
            )}
            <span className={marketStatus === "open" ? styles.badgeOk : styles.badgeWarn}>{marketLabel}</span>
          </div>
        </div>
      </div>

      <form className={styles.symbolRow} onSubmit={submitSymbol}>
        <label className={styles.label} htmlFor="ql-symbol">
          Symbol
        </label>
        <SymbolSearch
          id="ql-symbol"
          value={input}
          onChange={setInput}
          onSelect={(item) => setActiveSymbol(item.symbol)}
          inputClassName={styles.symbolInput}
          disabled={isLiveDataLoading}
          placeholder="Search Apple, Google, Gold…"
        />
        <button type="submit" className={styles.btn} disabled={isLiveDataLoading}>
          {isLiveDataLoading ? "Loading…" : "Go"}
        </button>
      </form>

      {companyProfile && (
        <div className={styles.companyRow}>
          {companyProfile.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={companyProfile.logo} alt="" className={styles.companyLogo} width={32} height={32} />
          )}
          <span className={styles.companyName}>{companyProfile.name}</span>
          <span className={styles.tag}>{companyProfile.exchange}</span>
          {companyProfile.industry && <span className={styles.tagMuted}>{companyProfile.industry}</span>}
        </div>
      )}
    </header>
  );
}

/** Engine bootstrap hook — polls /health every 5s while cold (Render free tier). */
export function useQuantEngine() {
  const setEngineOk = useQuantLabStore((s) => s.setEngineOk);
  const [benchmark, setBenchmark] = useState<ModelBenchmark | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [warming, setWarming] = useState(false);
  const [warmupSeconds, setWarmupSeconds] = useState(0);

  const loadEngine = useCallback(async () => {
    try {
      await quantApi.health();
      const v = await quantApi.validateModels();
      setEngineOk(true);
      setBenchmark(v.benchmark);
      setEngineError(null);
      setWarming(false);
    } catch (e) {
      setEngineOk(false);
      setBenchmark(null);
      setEngineError((e as Error).message);
      setWarming(true);
    }
  }, [setEngineOk]);

  useEffect(() => {
    void loadEngine();
  }, [loadEngine]);

  useEffect(() => {
    if (!warming) return;
    const poll = setInterval(() => void loadEngine(), 5_000);
    const clock = setInterval(() => setWarmupSeconds((s) => s + 1), 1_000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [warming, loadEngine]);

  return { benchmark, engineError, reloadEngine: loadEngine, warming, warmupSeconds };
}
