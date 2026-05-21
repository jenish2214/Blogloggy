/**
 * Trading Engine Routes
 * Stateless: portfolio state lives in the browser (Zustand + localStorage).
 * This service provides: order validation, options pricing (Black-Scholes),
 * and quant utilities.
 */
import { Router } from "express";
import axios from "axios";

const router = Router();
const axiosJ = axios.create({ timeout: 8000, headers: { "User-Agent": "QuantDesk/1.0" } });

// ── Black-Scholes option pricing ─────────────────────────────────────────────

function normalCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + p * x);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

function blackScholes(S: number, K: number, T: number, r: number, sigma: number, type: "call" | "put") {
  if (T <= 0) return type === "call" ? Math.max(0, S - K) : Math.max(0, K - S);
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const Nd1 = normalCDF(d1), Nd2 = normalCDF(d2);
  const Nnd1 = normalCDF(-d1), Nnd2 = normalCDF(-d2);
  const price =
    type === "call"
      ? S * Nd1 - K * Math.exp(-r * T) * Nd2
      : K * Math.exp(-r * T) * Nnd2 - S * Nnd1;
  const delta = type === "call" ? Nd1 : Nd1 - 1;
  const gamma = Math.exp(-0.5 * d1 * d1) / (S * sigma * sqrtT * Math.sqrt(2 * Math.PI));
  const theta = (-(S * sigma * Math.exp(-0.5 * d1 * d1)) / (2 * sqrtT * Math.sqrt(2 * Math.PI))
    - r * K * Math.exp(-r * T) * (type === "call" ? Nd2 : -Nnd2)) / 365;
  const vega = S * sqrtT * Math.exp(-0.5 * d1 * d1) / Math.sqrt(2 * Math.PI) / 100;
  return { price: Math.max(0, price), delta, gamma, theta, vega, d1, d2 };
}

// ── POST /api/trading/price-option ───────────────────────────────────────────
router.post("/price-option", (req, res) => {
  const { S, K, T, r = 0.05, sigma, type = "call" } = req.body;
  if (!S || !K || !T || !sigma) return res.status(400).json({ error: "Missing parameters: S, K, T, sigma required" });
  const result = blackScholes(Number(S), Number(K), Number(T), Number(r), Number(sigma), type);
  res.json({ result, inputs: { S, K, T, r, sigma, type } });
});

// ── GET /api/trading/options-chain/:symbol ────────────────────────────────────
router.get("/options-chain/:symbol", async (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  try {
    const { data } = await axiosJ.get(
      `https://query2.finance.yahoo.com/v7/finance/options/${sym}`
    );
    const result = data?.optionChain?.result?.[0];
    if (!result) return res.status(404).json({ error: "No options data" });

    const { calls, puts } = result.options?.[0] ?? { calls: [], puts: [] };
    const spot = result.quote?.regularMarketPrice ?? 0;
    const expirations = result.expirationDates ?? [];

    const formatContract = (c: Record<string, unknown>) => ({
      contractSymbol: c.contractSymbol,
      strike: c.strike,
      lastPrice: c.lastPrice,
      bid: c.bid,
      ask: c.ask,
      change: c.change,
      percentChange: c.percentChange,
      volume: c.volume ?? 0,
      openInterest: c.openInterest ?? 0,
      impliedVolatility: c.impliedVolatility ? parseFloat((c.impliedVolatility as number * 100).toFixed(1)) : null,
      inTheMoney: c.inTheMoney,
      expiration: c.expiration,
    });

    res.json({
      symbol: sym,
      spotPrice: spot,
      expirations,
      calls: (calls ?? []).map(formatContract),
      puts: (puts ?? []).map(formatContract),
    });
  } catch (err) {
    res.status(500).json({ error: "options_fetch_failed", detail: (err as Error).message });
  }
});

// ── GET /api/trading/options-chain/:symbol/:expiry ───────────────────────────
router.get("/options-chain/:symbol/:expiry", async (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  const expiry = req.params.expiry;
  try {
    const { data } = await axiosJ.get(
      `https://query2.finance.yahoo.com/v7/finance/options/${sym}?date=${expiry}`
    );
    const result = data?.optionChain?.result?.[0];
    if (!result) return res.status(404).json({ error: "No options data" });

    const { calls, puts } = result.options?.[0] ?? { calls: [], puts: [] };
    const spot = result.quote?.regularMarketPrice ?? 0;

    const fmt2 = (n: number | null) => (n == null ? null : parseFloat(n.toFixed(2)));

    const formatContract = (c: Record<string, unknown>) => ({
      contractSymbol: c.contractSymbol,
      strike: c.strike,
      lastPrice: fmt2(c.lastPrice as number),
      bid: fmt2(c.bid as number),
      ask: fmt2(c.ask as number),
      midpoint: fmt2(((c.bid as number) + (c.ask as number)) / 2),
      change: fmt2(c.change as number),
      percentChange: fmt2(c.percentChange as number),
      volume: c.volume ?? 0,
      openInterest: c.openInterest ?? 0,
      impliedVolatility: c.impliedVolatility ? parseFloat(((c.impliedVolatility as number) * 100).toFixed(1)) : null,
      inTheMoney: c.inTheMoney,
    });

    res.json({
      symbol: sym,
      spotPrice: spot,
      expiry,
      calls: (calls ?? []).map(formatContract),
      puts: (puts ?? []).map(formatContract),
    });
  } catch (err) {
    res.status(500).json({ error: "options_fetch_failed", detail: (err as Error).message });
  }
});

// ── POST /api/trading/validate ────────────────────────────────────────────────
router.post("/validate", async (req, res) => {
  const { symbol, side, qty, cash, currentPositions } = req.body;
  if (!symbol || !side || qty <= 0) {
    return res.status(400).json({ valid: false, reason: "Invalid parameters" });
  }
  const errors: string[] = [];
  if (side === "sell") {
    const pos = (currentPositions as Record<string, { qty: number }>)?.[symbol];
    if (!pos || pos.qty < qty) errors.push(`Insufficient position: have ${pos?.qty ?? 0}, want to sell ${qty}`);
  }
  res.json({ valid: errors.length === 0, errors });
});

// ── GET /api/trading/backtest-simple ─────────────────────────────────────────
// Simple momentum/buy-and-hold backtest
router.get("/backtest-simple", async (req, res) => {
  const sym = String(req.query.symbol ?? "AAPL").toUpperCase();
  const range = String(req.query.range ?? "1y");

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=${range}`;
    const { data } = await axiosJ.get(url);
    const result = data?.chart?.result?.[0];
    if (!result) return res.status(404).json({ error: "symbol_not_found" });

    const closes: number[] = result.indicators?.quote?.[0]?.close ?? [];
    const times: number[] = result.timestamp ?? [];

    const validPairs = times.map((t, i) => ({ t, c: closes[i] })).filter((p) => p.c != null);
    if (validPairs.length < 2) return res.status(404).json({ error: "insufficient_data" });

    const startPrice = validPairs[0].c;
    const endPrice = validPairs[validPairs.length - 1].c;
    const totalReturn = ((endPrice - startPrice) / startPrice) * 100;

    // Drawdown
    let peak = startPrice, maxDrawdown = 0;
    for (const { c } of validPairs) {
      if (c > peak) peak = c;
      const dd = ((peak - c) / peak) * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    // Daily returns
    const dailyReturns = [];
    for (let i = 1; i < validPairs.length; i++) {
      dailyReturns.push((validPairs[i].c - validPairs[i - 1].c) / validPairs[i - 1].c);
    }
    const avgDaily = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((s, r) => s + Math.pow(r - avgDaily, 2), 0) / dailyReturns.length;
    const dailyVol = Math.sqrt(variance);
    const annualVol = dailyVol * Math.sqrt(252) * 100;
    const annualReturn = avgDaily * 252 * 100;
    const sharpe = dailyVol !== 0 ? (avgDaily * 252) / (dailyVol * Math.sqrt(252)) : 0;

    // Equity curve (normalized to $100k)
    const equityCurve = validPairs.map(({ t, c }) => ({
      time: t,
      value: parseFloat(((c / startPrice) * 100_000).toFixed(2)),
    }));

    res.json({
      symbol: sym,
      range,
      startPrice: parseFloat(startPrice.toFixed(2)),
      endPrice: parseFloat(endPrice.toFixed(2)),
      totalReturn: parseFloat(totalReturn.toFixed(2)),
      annualReturn: parseFloat(annualReturn.toFixed(2)),
      annualVolatility: parseFloat(annualVol.toFixed(2)),
      sharpeRatio: parseFloat(sharpe.toFixed(3)),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      tradingDays: validPairs.length,
      equityCurve,
    });
  } catch (err) {
    res.status(500).json({ error: "backtest_failed", detail: (err as Error).message });
  }
});

// ── GET /api/trading/volatility/:symbol ──────────────────────────────────────
router.get("/volatility/:symbol", async (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=3mo`;
    const { data } = await axiosJ.get(url);
    const closes: number[] = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    const valid = closes.filter((c) => c != null);
    if (valid.length < 10) return res.status(404).json({ error: "insufficient_data" });

    const returns = [];
    for (let i = 1; i < valid.length; i++) returns.push(Math.log(valid[i] / valid[i - 1]));
    const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
    const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / returns.length;
    const hv = parseFloat((Math.sqrt(variance * 252) * 100).toFixed(2));

    res.json({ symbol: sym, historicalVolatility30d: hv, sampleSize: valid.length });
  } catch (err) {
    res.status(500).json({ error: "vol_fetch_failed", detail: (err as Error).message });
  }
});

export default router;
