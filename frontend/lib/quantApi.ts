/**
 * QuantDesk Python quant engine client (via Next.js proxy /api/quant/*).
 */

async function quantFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/quant${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let message = body;
    try {
      const parsed = JSON.parse(body) as { detail?: string; error?: string };
      message = parsed.detail ?? parsed.error ?? body;
    } catch {
      /* plain */
    }
    throw new Error(message || `Quant API ${res.status}`);
  }
  return res.json();
}

export interface BSResult {
  price: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  d1: number;
  d2: number;
  intrinsic: number;
  time_value: number;
}

export interface ModelBenchmark {
  model_agreement_pct: number;
  target_met: boolean;
  call: { bs: number; mc: number; error_pct: number };
  put: { bs: number; mc: number; error_pct: number };
  note: string;
}

export interface PredictSignalRow {
  name: string;
  family: "algorithm" | "machine_learning" | string;
  signal: string;
  value: string | number;
  confidence_pct?: number;
}

export interface PredictSuiteResult {
  symbol: string;
  current_price: number;
  horizon_days: number;
  predicted_price: number;
  predicted_change_pct: number;
  direction: "bullish" | "bearish" | "neutral";
  ensemble: { signal: string; confidence_pct: number; note: string };
  algorithm: {
    composite: string;
    current_price: number;
    rsi: { value: number; signal: string };
    sma: { sma20: number | null; sma50: number | null; signal: string };
    macd: { signal: string; histogram: number };
    bollinger_bands: { upper: number; middle: number; lower: number; signal: string };
  };
  models: Array<{
    name: string;
    family: string;
    task?: string;
    holdout_accuracy_pct?: number;
    holdout_mape_pct?: number;
    signal?: string;
    confidence_pct?: number;
  }>;
  predictions: Array<{ day: number; price: number; change_pct: number; model: string }>;
  all_signals: PredictSignalRow[];
  chart: {
    historical: { i: number; price: number }[];
    forecast: { i: number; price: number; type: string }[];
  };
  disclaimer: string;
}

export const quantApi = {
  health: () => quantFetch<{ status: string; version: string }>("/health"),

  validateModels: () =>
    quantFetch<{ status: string; benchmark: ModelBenchmark }>("/validate-models"),

  predictSuite: (body: {
    prices: number[];
    volumes?: number[];
    symbol?: string;
    horizon_days?: number;
  }) =>
    quantFetch<{ status: string } & PredictSuiteResult>("/predict-suite", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  price: (body: {
    S: number;
    K: number;
    T: number;
    r?: number;
    sigma: number;
    type?: "call" | "put";
  }) =>
    quantFetch<{ result: BSResult }>("/price", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  impliedVol: (body: {
    market_price: number;
    S: number;
    K: number;
    T: number;
    r?: number;
    type?: "call" | "put";
  }) =>
    quantFetch<{
      implied_volatility: number;
      iv_pct: number;
      fitted_price: number;
      price_error: number;
    }>("/implied-volatility", { method: "POST", body: JSON.stringify(body) }),

  monteCarlo: (body: {
    S: number;
    K: number;
    T: number;
    r?: number;
    sigma: number;
    type?: "call" | "put";
    simulations?: number;
  }) =>
    quantFetch<{
      mc_price: number;
      bs_price: number;
      relative_error_pct: number;
      confidence_interval_95: [number, number];
      accuracy_grade: string;
      simulations: number;
    }>("/monte-carlo", { method: "POST", body: JSON.stringify(body) }),

  backtest: (body: {
    prices: number[];
    strategy: "buy_hold" | "sma_cross" | "rsi" | "momentum";
    sma_short?: number;
    sma_long?: number;
    initial_capital?: number;
  }) =>
    quantFetch<{
      total_return_pct: number;
      sharpe_ratio: number;
      sortino_ratio: number;
      calmar_ratio: number;
      max_drawdown_pct: number;
      var_95_day_pct: number;
      cvar_95_day_pct: number;
      win_rate_pct: number;
      trades: number;
      equity_curve: number[];
      annualized_vol_pct: number;
    }>("/backtest", { method: "POST", body: JSON.stringify(body) }),

  correlation: (series: Record<string, number[]>) =>
    quantFetch<{ symbols: string[]; matrix: number[][] }>("/correlation", {
      method: "POST",
      body: JSON.stringify({ series }),
    }),

  marketHistory: (symbol: string, period = "1y", interval = "1d") => {
    const qs = new URLSearchParams({ symbol, period, interval });
    return quantFetch<{
      status: string;
      symbol: string;
      period: string;
      interval: string;
      provider: string;
      candleCount: number;
      currentPrice: number;
      candles: Array<{
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
        timestamp: number;
        timeLabel?: string;
      }>;
    }>(`/market/history?${qs.toString()}`);
  },
};
