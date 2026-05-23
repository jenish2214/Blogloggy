"use client";
import { Play, Pause, Square, Shield, Link2 } from "lucide-react";
import { useAlgoTradingStore, STRATEGY_LABELS } from "@/store/algoTradingStore";
import type { StrategyType } from "@/types/algoTrading";
import styles from "@/app/algo-trading/algo-trading.module.css";

const STRATEGIES: { id: StrategyType; desc: string }[] = [
  { id: "meanReversion", desc: "Buy below 2σ band · Sell above" },
  { id: "momentum", desc: "Breakout on consecutive HH/LL" },
  { id: "vwap", desc: "Trade VWAP crossovers" },
];

function formatLogTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function StrategyControlPanel() {
  const {
    activeStrategy,
    strategyParams,
    engineStatus,
    positionSize,
    riskGuard,
    syncToPortfolio,
    statusLogs,
    switchStrategy,
    updateParam,
    setPositionSize,
    setRiskGuard,
    setSyncToPortfolio,
    startEngine,
    pauseEngine,
    stopEngine,
    resetSession,
  } = useAlgoTradingStore();

  const running = engineStatus === "running";
  const statusLogsSlice = statusLogs.slice(-10).reverse();

  return (
    <div className={styles.controlColumn}>
      <div className={`card ${styles.panel}`}>
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>Strategy</span>
        </div>
        <div className={styles.strategyCards}>
          {STRATEGIES.map(({ id, desc }) => (
            <button
              key={id}
              type="button"
              className={`${styles.strategyCard} ${activeStrategy === id ? styles.strategyCardActive : ""}`}
              onClick={() => switchStrategy(id)}
              disabled={running}
            >
              <span className={styles.strategyName}>{STRATEGY_LABELS[id]}</span>
              <span className={styles.strategyDesc}>{desc}</span>
            </button>
          ))}
        </div>
      </div>

      {activeStrategy === "meanReversion" && (
        <div className={`card ${styles.panel}`}>
          <div className={styles.panelHeader}><span className={styles.panelTitle}>Parameters</span></div>
          <label className={styles.sliderLabel}>
            Lookback: {strategyParams.meanReversion.lookbackPeriod}
            <input type="range" min={5} max={50} step={1} value={strategyParams.meanReversion.lookbackPeriod}
              onChange={(e) => updateParam("meanReversion", "lookbackPeriod", Number(e.target.value))} className={styles.slider} />
          </label>
          <label className={styles.sliderLabel}>
            SD Multiplier: {strategyParams.meanReversion.sdMultiplier.toFixed(1)}
            <input type="range" min={1} max={3} step={0.1} value={strategyParams.meanReversion.sdMultiplier}
              onChange={(e) => updateParam("meanReversion", "sdMultiplier", Number(e.target.value))} className={styles.slider} />
          </label>
        </div>
      )}

      {activeStrategy === "momentum" && (
        <div className={`card ${styles.panel}`}>
          <div className={styles.panelHeader}><span className={styles.panelTitle}>Parameters</span></div>
          <label className={styles.sliderLabel}>
            Breakout Window: {strategyParams.momentum.breakoutWindow}
            <input type="range" min={2} max={10} step={1} value={strategyParams.momentum.breakoutWindow}
              onChange={(e) => updateParam("momentum", "breakoutWindow", Number(e.target.value))} className={styles.slider} />
          </label>
          <label className={styles.sliderLabel}>
            ATR Multiplier: {strategyParams.momentum.atrMultiplier.toFixed(1)}
            <input type="range" min={1} max={5} step={0.1} value={strategyParams.momentum.atrMultiplier}
              onChange={(e) => updateParam("momentum", "atrMultiplier", Number(e.target.value))} className={styles.slider} />
          </label>
        </div>
      )}

      {activeStrategy === "vwap" && (
        <div className={`card ${styles.panel}`}>
          <div className={styles.panelHeader}><span className={styles.panelTitle}>Parameters</span></div>
          <label className={styles.sliderLabel}>
            Deviation %: {strategyParams.vwap.deviationPct.toFixed(2)}
            <input type="range" min={0.1} max={2} step={0.05} value={strategyParams.vwap.deviationPct}
              onChange={(e) => updateParam("vwap", "deviationPct", Number(e.target.value))} className={styles.slider} />
          </label>
          <label className={styles.sliderLabel}>
            Rebalance (min): {strategyParams.vwap.rebalanceInterval}
            <input type="range" min={1} max={60} step={1} value={strategyParams.vwap.rebalanceInterval}
              onChange={(e) => updateParam("vwap", "rebalanceInterval", Number(e.target.value))} className={styles.slider} />
          </label>
        </div>
      )}

      <div className={`card ${styles.panel}`}>
        <label className={styles.inputLabel}>
          Position Size ($)
          <input className="input" type="number" min={100} step={100} value={positionSize}
            onChange={(e) => setPositionSize(Number(e.target.value) || 5000)} />
        </label>
        <label className={styles.syncToggle}>
          <Link2 size={14} />
          <input type="checkbox" checked={syncToPortfolio} onChange={(e) => setSyncToPortfolio(e.target.checked)} />
          Auto-sync algo signals to portfolio
        </label>
        <label className={styles.riskToggle}>
          <Shield size={14} />
          <input type="checkbox" checked={riskGuard.enabled} onChange={(e) => setRiskGuard(e.target.checked)} />
          Max Loss Limit (${riskGuard.maxLoss.toLocaleString()})
        </label>
        {riskGuard.enabled && (
          <div style={{ padding: "0 14px 10px" }}>
            <input type="range" min={500} max={20000} step={500} value={riskGuard.maxLoss}
              onChange={(e) => setRiskGuard(true, Number(e.target.value))} className={styles.slider} />
          </div>
        )}
      </div>

      <div className={styles.engineControls}>
        <button type="button" className={styles.btnStart} onClick={startEngine} disabled={!activeStrategy || running}>
          <Play size={14} /> Start
        </button>
        <button type="button" className={styles.btnPause} onClick={pauseEngine} disabled={!running}>
          <Pause size={14} /> Pause
        </button>
        <button type="button" className={styles.btnStop} onClick={stopEngine}>
          <Square size={14} /> Stop
        </button>
      </div>
      <button type="button" className={styles.btnReset} onClick={resetSession} disabled={running}>
        Reset Session
      </button>

      <div className={`card ${styles.panel}`}>
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>Status Log</span>
        </div>
        <div className={styles.statusLog}>
          {statusLogsSlice.length === 0 ? (
            <div className={styles.statusLogEmpty}>Awaiting engine events…</div>
          ) : (
            statusLogsSlice.map((log) => (
              <div key={log.id} className={`${styles.statusLogLine} ${styles[`log${log.level}`]}`}>
                {formatLogTime(log.timestamp)} — {log.message}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
