export type AlgoAssetClass = "stock" | "crypto" | "forex" | "option";

export type AlgoSymbol =
  | "CRUDE_OIL"
  | "GOLD"
  | "NATURAL_GAS"
  | "AAPL"
  | "MSFT"
  | "NVDA"
  | "SPY"
  | "TSLA"
  | "AMZN"
  | "BTC-USD"
  | "EURUSD=X";

export type StrategyType = "meanReversion" | "momentum" | "vwap";

export type EngineStatus = "idle" | "running" | "paused" | "stopped";

export type SignalType = "BUY" | "SELL";

export type LogLevel = "INFO" | "BUY" | "SELL" | "WARN" | "STOP";

export interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
  /** Display label HH:MM:SS */
  timeLabel?: string;
}

export interface SignalEvent {
  type: SignalType;
  price: number;
  timestamp: number;
  confidence: number;
  strategy: StrategyType;
}

export interface SignalPoint {
  timestamp: number;
  price: number;
  type: SignalType;
}

export interface OpenPosition {
  side: "LONG";
  entryPrice: number;
  entryTime: number;
  size: number;
  symbol: AlgoSymbol;
}

export interface ClosedTrade {
  id: string;
  side: SignalType;
  entryPrice: number;
  exitPrice: number;
  entryTime: number;
  exitTime: number;
  pnl: number;
  size: number;
  symbol: AlgoSymbol;
  status: "WIN" | "LOSS";
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
}

export interface MeanReversionParams {
  lookbackPeriod: number;
  sdMultiplier: number;
}

export interface MomentumParams {
  breakoutWindow: number;
  atrMultiplier: number;
}

export interface VwapParams {
  deviationPct: number;
  rebalanceInterval: number;
}

export interface StrategyParams {
  meanReversion: MeanReversionParams;
  momentum: MomentumParams;
  vwap: VwapParams;
}

export interface RiskGuard {
  enabled: boolean;
  maxLoss: number;
}

export interface StrategyMetrics {
  totalTrades: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
  totalPnl: number;
}

export interface SymbolConfig {
  symbol: AlgoSymbol;
  label: string;
  name: string;
  portfolioSymbol: string;
  assetClass: AlgoAssetClass;
  basePrice: number;
  volatility: number;
  seed: number;
  category: "commodity" | "stock" | "crypto" | "forex";
}

export const SYMBOL_CONFIGS: Record<AlgoSymbol, SymbolConfig> = {
  CRUDE_OIL: {
    symbol: "CRUDE_OIL", label: "Crude Oil", name: "Crude Oil (Sim)", portfolioSymbol: "CRUDE_OIL",
    assetClass: "stock", basePrice: 6800, volatility: 0.012, seed: 0xdeadbeef, category: "commodity",
  },
  GOLD: {
    symbol: "GOLD", label: "Gold", name: "Gold (Sim)", portfolioSymbol: "GOLD",
    assetClass: "stock", basePrice: 62000, volatility: 0.008, seed: 0xcafebabe, category: "commodity",
  },
  NATURAL_GAS: {
    symbol: "NATURAL_GAS", label: "Nat Gas", name: "Natural Gas (Sim)", portfolioSymbol: "NATURAL_GAS",
    assetClass: "stock", basePrice: 280, volatility: 0.018, seed: 0x8badf00d, category: "commodity",
  },
  AAPL: {
    symbol: "AAPL", label: "AAPL", name: "Apple Inc.", portfolioSymbol: "AAPL",
    assetClass: "stock", basePrice: 228, volatility: 0.009, seed: 0xa1b1c101, category: "stock",
  },
  MSFT: {
    symbol: "MSFT", label: "MSFT", name: "Microsoft Corp.", portfolioSymbol: "MSFT",
    assetClass: "stock", basePrice: 420, volatility: 0.008, seed: 0xa1b1c102, category: "stock",
  },
  NVDA: {
    symbol: "NVDA", label: "NVDA", name: "NVIDIA Corp.", portfolioSymbol: "NVDA",
    assetClass: "stock", basePrice: 135, volatility: 0.015, seed: 0xa1b1c103, category: "stock",
  },
  SPY: {
    symbol: "SPY", label: "SPY", name: "SPDR S&P 500 ETF", portfolioSymbol: "SPY",
    assetClass: "stock", basePrice: 580, volatility: 0.006, seed: 0xa1b1c104, category: "stock",
  },
  TSLA: {
    symbol: "TSLA", label: "TSLA", name: "Tesla Inc.", portfolioSymbol: "TSLA",
    assetClass: "stock", basePrice: 245, volatility: 0.018, seed: 0xa1b1c105, category: "stock",
  },
  AMZN: {
    symbol: "AMZN", label: "AMZN", name: "Amazon.com Inc.", portfolioSymbol: "AMZN",
    assetClass: "stock", basePrice: 198, volatility: 0.011, seed: 0xa1b1c108, category: "stock",
  },
  "BTC-USD": {
    symbol: "BTC-USD", label: "BTC", name: "Bitcoin USD", portfolioSymbol: "BTC-USD",
    assetClass: "crypto", basePrice: 97000, volatility: 0.012, seed: 0xa1b1c106, category: "crypto",
  },
  "EURUSD=X": {
    symbol: "EURUSD=X", label: "EUR/USD", name: "Euro / US Dollar", portfolioSymbol: "EURUSD=X",
    assetClass: "forex", basePrice: 1.085, volatility: 0.004, seed: 0xa1b1c107, category: "forex",
  },
};

export function getSymbolConfig(symbol: AlgoSymbol): SymbolConfig {
  return SYMBOL_CONFIGS[symbol];
}

export const SYMBOL_GROUPS: { label: string; symbols: AlgoSymbol[] }[] = [
  { label: "Commodities", symbols: ["CRUDE_OIL", "GOLD", "NATURAL_GAS"] },
  { label: "Stocks", symbols: ["AAPL", "MSFT", "NVDA", "SPY", "TSLA"] },
  { label: "Crypto & Forex", symbols: ["BTC-USD", "EURUSD=X"] },
];

export const DEFAULT_STRATEGY_PARAMS: StrategyParams = {
  meanReversion: { lookbackPeriod: 20, sdMultiplier: 2 },
  momentum: { breakoutWindow: 3, atrMultiplier: 2 },
  vwap: { deviationPct: 0.5, rebalanceInterval: 5 },
};
