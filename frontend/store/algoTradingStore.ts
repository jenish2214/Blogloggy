"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { evaluateStrategy, computeMetrics } from "@/lib/strategyEngine";
import type { AlgoChartInterval, AlgoChartPeriod } from "@/lib/algo/fetchAlgoHistory";
import { generateOHLCV, simulateLiveTick } from "@/lib/priceDataGenerator";
import type {
  AlgoSymbol,
  CandleData,
  ClosedTrade,
  EngineStatus,
  LogEntry,
  LogLevel,
  OpenPosition,
  SignalEvent,
  StrategyParams,
  StrategyType,
} from "@/types/algoTrading";
import { DEFAULT_STRATEGY_PARAMS, SYMBOL_CONFIGS, getSymbolConfig } from "@/types/algoTrading";
import { executePaperOrder, qtyFromNotional } from "@/lib/algoPortfolioBridge";

/** Max bars on chart (1y daily ≈ 252; 2y ≈ 504). */
const MAX_CANDLES = 520;
const MAX_SIGNALS = 80;
const MAX_LOGS = 200;

const STRATEGY_LABELS: Record<StrategyType, string> = {
  meanReversion: "Mean Reversion",
  momentum: "Momentum Breakout",
  vwap: "VWAP Crossover",
};

function formatLogTime(ts: number): string {
  const d = new Date(ts);
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${d.toTimeString().slice(0, 8)}.${ms}`;
}

function makeLog(level: LogLevel, message: string): LogEntry {
  return { id: `${Date.now()}-${Math.random()}`, timestamp: Date.now(), level, message };
}

function pushLog(logs: LogEntry[], entry: LogEntry): LogEntry[] {
  const next = [...logs, entry];
  return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next;
}

interface AlgoTradingState {
  symbol: AlgoSymbol;
  activeStrategy: StrategyType | null;
  strategyParams: StrategyParams;
  engineStatus: EngineStatus;
  priceHistory: CandleData[];
  currentPrice: number;
  tickIndex: number;
  signals: SignalEvent[];
  openPosition: OpenPosition | null;
  closedTrades: ClosedTrade[];
  cumulativePnl: number[];
  totalPnl: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  totalTrades: number;
  engineLogs: LogEntry[];
  statusLogs: LogEntry[];
  riskGuard: { enabled: boolean; maxLoss: number };
  positionSize: number;
  latencyMs: number;
  syncToPortfolio: boolean;
  lastTradeMessage: string;
  chartPeriod: AlgoChartPeriod;
  chartInterval: AlgoChartInterval;
  historyLoading: boolean;
  historyError: string | null;
  historyProvider: string | null;
  historyYahooSymbol: string | null;
  usesYfinanceData: boolean;

  setSymbol: (symbol: AlgoSymbol) => void;
  setChartRange: (period: AlgoChartPeriod, interval: AlgoChartInterval) => void;
  applyHistory: (
    candles: CandleData[],
    currentPrice: number,
    meta: { provider: string; yahooSymbol: string; period: AlgoChartPeriod; interval: AlgoChartInterval }
  ) => void;
  setHistoryLoading: (loading: boolean) => void;
  setHistoryError: (message: string | null) => void;
  appendLiveTick: (price: number) => void;
  switchStrategy: (strategy: StrategyType) => void;
  updateParam: (strategy: StrategyType, key: string, value: number) => void;
  setPositionSize: (size: number) => void;
  setRiskGuard: (enabled: boolean, maxLoss?: number) => void;
  startEngine: () => void;
  pauseEngine: () => void;
  stopEngine: () => void;
  tickPrice: () => void;
  resetSession: () => void;
  setSyncToPortfolio: (enabled: boolean) => void;
  closeOpenPositionAtPrice: (price: number) => { qty: number; pnl: number } | null;
  armSessionFromOrder: (params: { qty: number; price: number }) => void;
}

function initPriceHistory(symbol: AlgoSymbol): CandleData[] {
  return generateOHLCV(symbol, 80);
}

export const useAlgoTradingStore = create<AlgoTradingState>()(
  persist(
    immer((set, get) => {
      const initialHistory = initPriceHistory("CRUDE_OIL");
      const lastClose = initialHistory[initialHistory.length - 1]?.close ?? SYMBOL_CONFIGS.CRUDE_OIL.basePrice;

      return {
        symbol: "CRUDE_OIL",
        activeStrategy: "meanReversion" as StrategyType,
        strategyParams: { ...DEFAULT_STRATEGY_PARAMS },
        engineStatus: "idle" as EngineStatus,
        priceHistory: initialHistory,
        currentPrice: lastClose,
        tickIndex: 0,
        signals: [],
        openPosition: null,
        closedTrades: [],
        cumulativePnl: [0],
        totalPnl: 0,
        winRate: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        totalTrades: 0,
        engineLogs: [makeLog("INFO", "ALGO ENGINE v2.4.1 — CITADEL-STYLE EXECUTION SIMULATOR")],
        statusLogs: [],
        riskGuard: { enabled: true, maxLoss: 5000 },
        positionSize: 50000,
        latencyMs: 12,
        syncToPortfolio: true,
        lastTradeMessage: "",
        chartPeriod: "1y" as AlgoChartPeriod,
        chartInterval: "1d" as AlgoChartInterval,
        historyLoading: false,
        historyError: null,
        historyProvider: null,
        historyYahooSymbol: null,
        usesYfinanceData: false,

        setSyncToPortfolio(enabled) {
          set((s) => { s.syncToPortfolio = enabled; });
        },

        setChartRange(period, interval) {
          set((s) => {
            s.chartPeriod = period;
            s.chartInterval = interval;
          });
        },

        setHistoryLoading(loading) {
          set((s) => { s.historyLoading = loading; });
        },

        setHistoryError(message) {
          set((s) => { s.historyError = message; });
        },

        applyHistory(candles, currentPrice, meta) {
          set((s) => {
            const trimmed = candles.slice(-MAX_CANDLES);
            s.priceHistory = trimmed;
            s.currentPrice = currentPrice;
            s.tickIndex = 0;
            s.signals = [];
            s.historyProvider = meta.provider;
            s.historyYahooSymbol = meta.yahooSymbol;
            s.chartPeriod = meta.period;
            s.chartInterval = meta.interval;
            s.usesYfinanceData = true;
            s.historyError = null;
            s.engineLogs = pushLog(
              s.engineLogs,
              makeLog(
                "INFO",
                `Chart loaded — ${meta.yahooSymbol} · ${trimmed.length} bars (${meta.period} / ${meta.interval}) via ${meta.provider}`
              )
            );
          });
        },

        appendLiveTick(price) {
          if (!Number.isFinite(price) || price <= 0) return;
          const state = get();
          const last = state.priceHistory[state.priceHistory.length - 1];
          if (!last) return;
          const now = Date.now();
          const newCandle: CandleData = {
            open: last.close,
            high: Math.max(last.high, price),
            low: Math.min(last.low, price),
            close: price,
            volume: Math.max(1, Math.round(last.volume * 0.05)),
            timestamp: now,
            timeLabel: new Date(now).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            }),
          };
          set((s) => {
            s.priceHistory = [...s.priceHistory, newCandle].slice(-MAX_CANDLES);
            s.currentPrice = price;
          });
        },

        setSymbol(symbol) {
          set((s) => {
            s.symbol = symbol;
            s.tickIndex = 0;
            s.signals = [];
            s.openPosition = null;
            s.closedTrades = [];
            s.cumulativePnl = [0];
            s.totalPnl = 0;
            s.winRate = 0;
            s.sharpeRatio = 0;
            s.maxDrawdown = 0;
            s.totalTrades = 0;
            s.usesYfinanceData = false;
            s.historyProvider = null;
            s.historyYahooSymbol = null;
            s.engineLogs = pushLog(s.engineLogs, makeLog("INFO", `Symbol switched to ${SYMBOL_CONFIGS[symbol].label}`));
          });
        },

        switchStrategy(strategy) {
          set((s) => {
            s.activeStrategy = strategy;
            s.engineLogs = pushLog(s.engineLogs, makeLog("INFO", `Strategy selected: ${STRATEGY_LABELS[strategy]}`));
          });
        },

        updateParam(strategy, key, value) {
          set((s) => {
            const params = s.strategyParams[strategy] as Record<string, number>;
            if (params && key in params) params[key] = value;
          });
        },

        setPositionSize(size) {
          set((s) => { s.positionSize = size; });
        },

        setRiskGuard(enabled, maxLoss) {
          set((s) => {
            s.riskGuard.enabled = enabled;
            if (maxLoss !== undefined) s.riskGuard.maxLoss = maxLoss;
          });
        },

        startEngine() {
          const { activeStrategy } = get();
          if (!activeStrategy) return;
          set((s) => {
            s.engineStatus = "running";
            const msg = `Engine START — ${STRATEGY_LABELS[activeStrategy]}`;
            s.engineLogs = pushLog(s.engineLogs, makeLog("INFO", msg));
            s.statusLogs = pushLog(s.statusLogs, makeLog("INFO", msg));
          });
        },

        pauseEngine() {
          set((s) => {
            s.engineStatus = "paused";
            s.engineLogs = pushLog(s.engineLogs, makeLog("WARN", "Engine PAUSED"));
            s.statusLogs = pushLog(s.statusLogs, makeLog("WARN", "Engine paused by operator"));
          });
        },

        stopEngine() {
          set((s) => {
            s.engineStatus = "stopped";
            s.engineLogs = pushLog(s.engineLogs, makeLog("STOP", "Engine STOPPED — session halted"));
            s.statusLogs = pushLog(s.statusLogs, makeLog("STOP", "Engine stopped"));
          });
        },

        resetSession() {
          set((s) => {
            const sym = s.symbol;
            s.priceHistory = initPriceHistory(sym);
            s.currentPrice = s.priceHistory[s.priceHistory.length - 1]?.close ?? 0;
            s.tickIndex = 0;
            s.signals = [];
            s.openPosition = null;
            s.closedTrades = [];
            s.cumulativePnl = [0];
            s.totalPnl = 0;
            s.winRate = 0;
            s.sharpeRatio = 0;
            s.maxDrawdown = 0;
            s.totalTrades = 0;
            s.engineStatus = "idle";
            s.engineLogs = pushLog(s.engineLogs, makeLog("INFO", "Session reset — price history reseeded"));
          });
        },

        closeOpenPositionAtPrice(price: number) {
          let result: { qty: number; pnl: number } | null = null;
          set((s) => {
            const pos = s.openPosition;
            if (!pos) return;
            const exitTime = Date.now();
            const pnl = (price - pos.entryPrice) * pos.size;
            const trade: ClosedTrade = {
              id: `t-${Date.now()}`,
              side: "SELL",
              entryPrice: pos.entryPrice,
              exitPrice: price,
              entryTime: pos.entryTime,
              exitTime,
              pnl,
              size: pos.size,
              symbol: s.symbol,
              status: pnl >= 0 ? "WIN" : "LOSS",
            };
            s.closedTrades.push(trade);
            s.openPosition = null;
            const lastCum = s.cumulativePnl[s.cumulativePnl.length - 1] ?? 0;
            s.cumulativePnl.push(lastCum + pnl);
            const metrics = computeMetrics(s.closedTrades);
            s.totalPnl = metrics.totalPnl;
            s.winRate = metrics.winRate;
            s.sharpeRatio = metrics.sharpeRatio;
            s.maxDrawdown = metrics.maxDrawdown;
            s.totalTrades = metrics.totalTrades;
            s.engineLogs = pushLog(s.engineLogs, makeLog("SELL", `EXIT position — PnL $${pnl.toFixed(2)} (${trade.status})`));
            s.statusLogs = pushLog(s.statusLogs, makeLog("SELL", `Manual exit @ $${price.toFixed(2)}`));
            s.lastTradeMessage = `Exited ${s.symbol} · PnL $${pnl.toFixed(2)}`;
            result = { qty: pos.size, pnl };
          });
          return result;
        },

        armSessionFromOrder(params: { qty: number; price: number }) {
          set((s) => {
            const cfg = getSymbolConfig(s.symbol);
            const fmt = cfg.assetClass === "forex" ? params.price.toFixed(4) : params.price.toFixed(2);

            if (!s.openPosition) {
              s.openPosition = {
                side: "LONG",
                entryPrice: params.price,
                entryTime: Date.now(),
                size: params.qty,
                symbol: s.symbol,
              };
            }

            const canStart = s.engineStatus === "idle" || s.engineStatus === "stopped";
            if (canStart && s.activeStrategy) {
              s.engineStatus = "running";
              const strat = STRATEGY_LABELS[s.activeStrategy];
              s.engineLogs = pushLog(
                s.engineLogs,
                makeLog("INFO", `AUTO-START — order filled @ $${fmt} · ${strat} live`)
              );
              s.statusLogs = pushLog(
                s.statusLogs,
                makeLog("INFO", `Live market feed started after your fill @ $${fmt}`)
              );
              s.lastTradeMessage = `Live trading started · filled @ $${fmt}`;
            }
          });
        },

        tickPrice() {
          const state = get();
          if (state.engineStatus !== "running" || !state.activeStrategy) return;

          const start = performance.now();
          const last = state.priceHistory[state.priceHistory.length - 1];
          if (!last) return;

          const newCandle = state.usesYfinanceData
            ? (() => {
                const drift = (Math.random() - 0.5) * last.close * 0.0008;
                const price = Math.max(0.0001, last.close + drift);
                return {
                  open: last.close,
                  high: Math.max(last.high, price),
                  low: Math.min(last.low, price),
                  close: price,
                  volume: Math.max(1, Math.round(last.volume * 0.02)),
                  timestamp: Date.now(),
                  timeLabel: new Date().toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                  }),
                } satisfies CandleData;
              })()
            : simulateLiveTick(last, state.symbol, state.tickIndex);
          const candles = [...state.priceHistory, newCandle].slice(-MAX_CANDLES);
          const signal = evaluateStrategy(state.activeStrategy, candles, state.strategyParams);

          let portfolioTrade: { side: "buy" | "sell"; qty: number; price: number } | null = null;

          set((s) => {
            s.tickIndex += 1;
            s.priceHistory = candles;
            s.currentPrice = newCandle.close;
            s.latencyMs = Math.round(performance.now() - start + 8 + 6);

            if (signal) {
              s.signals = [...s.signals, signal].slice(-MAX_SIGNALS);
              const logLevel: LogLevel = signal.type === "BUY" ? "BUY" : "SELL";
              const cfg = getSymbolConfig(s.symbol);
              const fmt = cfg.assetClass === "forex" ? signal.price.toFixed(4) : signal.price.toFixed(2);
              const msg = `${signal.type} signal @ $${fmt} (conf ${signal.confidence.toFixed(0)}%)`;
              s.engineLogs = pushLog(s.engineLogs, makeLog(logLevel, msg));
              s.statusLogs = pushLog(s.statusLogs, makeLog(logLevel, `${formatLogTime(signal.timestamp)} ${msg}`));

              const units = qtyFromNotional(signal.price, s.positionSize, cfg.assetClass);

              if (signal.type === "BUY" && !s.openPosition) {
                s.openPosition = {
                  side: "LONG",
                  entryPrice: signal.price,
                  entryTime: signal.timestamp,
                  size: units,
                  symbol: s.symbol,
                };
                s.engineLogs = pushLog(s.engineLogs, makeLog("BUY", `Opened LONG ${units} units @ $${fmt}`));
                if (s.syncToPortfolio) portfolioTrade = { side: "buy", qty: units, price: signal.price };
              } else if (signal.type === "SELL" && s.openPosition) {
                const pos = s.openPosition;
                const pnl = (signal.price - pos.entryPrice) * pos.size;
                const trade: ClosedTrade = {
                  id: `t-${Date.now()}`,
                  side: "SELL",
                  entryPrice: pos.entryPrice,
                  exitPrice: signal.price,
                  entryTime: pos.entryTime,
                  exitTime: signal.timestamp,
                  pnl,
                  size: pos.size,
                  symbol: s.symbol,
                  status: pnl >= 0 ? "WIN" : "LOSS",
                };
                s.closedTrades.push(trade);
                s.openPosition = null;
                const lastCum = s.cumulativePnl[s.cumulativePnl.length - 1] ?? 0;
                s.cumulativePnl.push(lastCum + pnl);

                const metrics = computeMetrics(s.closedTrades);
                s.totalPnl = metrics.totalPnl;
                s.winRate = metrics.winRate;
                s.sharpeRatio = metrics.sharpeRatio;
                s.maxDrawdown = metrics.maxDrawdown;
                s.totalTrades = metrics.totalTrades;

                s.engineLogs = pushLog(
                  s.engineLogs,
                  makeLog("SELL", `Closed trade PnL $${pnl.toFixed(2)} (${trade.status})`)
                );

                if (s.syncToPortfolio) portfolioTrade = { side: "sell", qty: pos.size, price: signal.price };

                if (s.riskGuard.enabled && s.totalPnl < -s.riskGuard.maxLoss) {
                  s.engineStatus = "stopped";
                  s.engineLogs = pushLog(s.engineLogs, makeLog("STOP", `Risk guard triggered — max loss $${s.riskGuard.maxLoss} exceeded`));
                  s.statusLogs = pushLog(s.statusLogs, makeLog("STOP", "Auto-stop: max loss limit breached"));
                }
              }
            }
          });

          if (portfolioTrade && get().syncToPortfolio) {
            const sym = get().symbol;
            const { side, qty, price } = portfolioTrade;
            void executePaperOrder({ symbol: sym, side, qty, price }).then((res) => {
              set((s) => {
                s.lastTradeMessage = res.message;
                s.engineLogs = pushLog(
                  s.engineLogs,
                  makeLog(side === "buy" ? "BUY" : "SELL", `Portfolio sync: ${res.message}`)
                );
              });
            });
          }
        },
      };
    }),
    {
      name: "quantdesk-algo-trading-v1",
      partialize: (s) => ({
        activeStrategy: s.activeStrategy,
        strategyParams: s.strategyParams,
        positionSize: s.positionSize,
        riskGuard: s.riskGuard,
        syncToPortfolio: s.syncToPortfolio,
      }),
    }
  )
);

export { STRATEGY_LABELS };
