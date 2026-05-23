import { NextRequest, NextResponse } from "next/server";
import { fmt } from "@/lib/market-fetch";

function computeStats(closes: number[], times: number[], startCash = 100_000) {
  if (closes.length < 2) return null;
  const dailyReturns: number[] = [];
  for (let i = 1; i < closes.length; i++)
    dailyReturns.push((closes[i] - closes[i - 1]) / closes[i - 1]);

  const mean = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / dailyReturns.length;
  const dailyVol = Math.sqrt(variance);
  const annualVol = dailyVol * Math.sqrt(252) * 100;
  const sharpe = dailyVol > 0 ? (mean * 252) / (dailyVol * Math.sqrt(252)) : 0;

  const downR = dailyReturns.filter((r) => r < 0);
  const downVar = downR.reduce((s, r) => s + r * r, 0) / Math.max(downR.length, 1);
  const sortino = downVar > 0 ? (mean * 252) / Math.sqrt(downVar * 252) : 0;

  let peak = closes[0], maxDD = 0;
  for (const c of closes) { if (c > peak) peak = c; const dd = ((peak - c) / peak) * 100; if (dd > maxDD) maxDD = dd; }

  const sorted = [...dailyReturns].sort((a, b) => a - b);
  const var95 = sorted[Math.floor(sorted.length * 0.05)] * 100;
  const cvar95 = sorted.slice(0, Math.floor(sorted.length * 0.05)).reduce((s, r) => s + r, 0) / Math.max(Math.floor(sorted.length * 0.05), 1) * 100;

  // Rolling 30-day Sharpe
  const rollingSharpe: { time: number; sharpe: number }[] = [];
  for (let i = 30; i < dailyReturns.length; i++) {
    const window = dailyReturns.slice(i - 30, i);
    const wMean = window.reduce((s, r) => s + r, 0) / 30;
    const wVol = Math.sqrt(window.reduce((s, r) => s + (r - wMean) ** 2, 0) / 30);
    rollingSharpe.push({ time: times[i + 1], sharpe: wVol > 0 ? parseFloat(((wMean * 252) / (wVol * Math.sqrt(252))).toFixed(3)) : 0 });
  }

  // Return distribution (20 buckets)
  const minR = Math.min(...dailyReturns) * 100, maxR = Math.max(...dailyReturns) * 100;
  const bucketW = (maxR - minR) / 20;
  const buckets = Array.from({ length: 20 }, (_, i) => ({ from: minR + i * bucketW, to: minR + (i + 1) * bucketW, count: 0 }));
  for (const r of dailyReturns) { const idx = Math.min(Math.floor((r * 100 - minR) / bucketW), 19); if (idx >= 0) buckets[idx].count++; }
  const distribution = buckets.map((b) => ({ mid: parseFloat(((b.from + b.to) / 2).toFixed(2)), count: b.count }));

  const totalReturn = ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100;
  const annualReturn = mean * 252 * 100;
  const equityCurve = times.map((t, i) => ({ time: t, value: parseFloat((startCash * (closes[i] / closes[0])).toFixed(2)) }));

  return { startPrice: fmt(closes[0])!, endPrice: fmt(closes[closes.length - 1])!, totalReturn: fmt(totalReturn)!, annualReturn: fmt(annualReturn)!, annualVolatility: fmt(annualVol)!, sharpeRatio: fmt(sharpe, 3)!, sortinoRatio: fmt(sortino, 3)!, maxDrawdown: fmt(maxDD)!, var95Day: fmt(var95)!, cvar95Day: fmt(cvar95)!, tradingDays: closes.length, equityCurve, rollingSharpe, distribution };
}

function smaCross(closes: number[], times: number[], fast = 50, slow = 200, startCash = 100_000) {
  const sma = (arr: number[], period: number, idx: number) => { if (idx < period - 1) return null; return arr.slice(idx - period + 1, idx + 1).reduce((s, v) => s + v, 0) / period; };
  let cash = startCash, shares = 0, inPosition = false;
  const equity: { time: number; value: number }[] = [];
  for (let i = 0; i < closes.length; i++) {
    const f = sma(closes, fast, i), s = sma(closes, slow, i);
    if (f != null && s != null) {
      if (!inPosition && f > s) { shares = cash / closes[i]; cash = 0; inPosition = true; }
      else if (inPosition && f < s) { cash = shares * closes[i]; shares = 0; inPosition = false; }
    }
    equity.push({ time: times[i], value: parseFloat((cash + shares * closes[i]).toFixed(2)) });
  }
  const finalVal = equity[equity.length - 1].value;
  return { equityCurve: equity, totalReturn: fmt(((finalVal - startCash) / startCash) * 100)!, annualReturn: fmt(((finalVal / startCash) ** (252 / closes.length) - 1) * 100)!, startPrice: fmt(closes[0])!, endPrice: fmt(closes[closes.length - 1])! };
}

function rsiStrategy(closes: number[], times: number[], period = 14, oversold = 30, overbought = 70, startCash = 100_000) {
  const rsiArr: (number | null)[] = Array(closes.length).fill(null);
  for (let i = period; i < closes.length; i++) {
    let gains = 0, losses = 0;
    for (let j = i - period + 1; j <= i; j++) { const d = closes[j] - closes[j - 1]; if (d > 0) gains += d; else losses -= d; }
    const rs = losses === 0 ? 100 : gains / losses;
    rsiArr[i] = 100 - 100 / (1 + rs);
  }
  let cash = startCash, shares = 0;
  const equity: { time: number; value: number }[] = [];
  for (let i = 0; i < closes.length; i++) {
    const rsi = rsiArr[i];
    if (rsi != null) {
      if (rsi < oversold && cash > 0) { shares = cash / closes[i]; cash = 0; }
      else if (rsi > overbought && shares > 0) { cash = shares * closes[i]; shares = 0; }
    }
    equity.push({ time: times[i], value: parseFloat((cash + shares * closes[i]).toFixed(2)) });
  }
  const finalVal = equity[equity.length - 1].value;
  return { equityCurve: equity, totalReturn: fmt(((finalVal - startCash) / startCash) * 100)!, annualReturn: fmt(((finalVal / startCash) ** (252 / closes.length) - 1) * 100)!, startPrice: fmt(closes[0])!, endPrice: fmt(closes[closes.length - 1])! };
}

function momentum(closes: number[], times: number[], lookback = 20, startCash = 100_000) {
  let cash = startCash, shares = 0;
  const equity: { time: number; value: number }[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i >= lookback) {
      const ret = (closes[i] - closes[i - lookback]) / closes[i - lookback];
      if (ret > 0 && cash > 0) { shares = cash / closes[i]; cash = 0; }
      else if (ret < 0 && shares > 0) { cash = shares * closes[i]; shares = 0; }
    }
    equity.push({ time: times[i], value: parseFloat((cash + shares * closes[i]).toFixed(2)) });
  }
  const finalVal = equity[equity.length - 1].value;
  return { equityCurve: equity, totalReturn: fmt(((finalVal - startCash) / startCash) * 100)!, annualReturn: fmt(((finalVal / startCash) ** (252 / closes.length) - 1) * 100)!, startPrice: fmt(closes[0])!, endPrice: fmt(closes[closes.length - 1])! };
}

export async function GET(req: NextRequest) {
  const sym = (req.nextUrl.searchParams.get("symbol") ?? "AAPL").toUpperCase();
  const range = req.nextUrl.searchParams.get("range") ?? "1y";
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=${range}`;
    const res = await fetch(url, { headers: { "User-Agent": "QuantDesk/1.0" } });
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return NextResponse.json({ error: "symbol_not_found" }, { status: 404 });

    const rawCloses: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
    const rawTimes: number[] = result.timestamp ?? [];
    const pairs = rawTimes.map((t: number, i: number) => ({ t, c: rawCloses[i] })).filter((p: { t: number; c: number | null }) => p.c != null) as { t: number; c: number }[];
    if (pairs.length < 20) return NextResponse.json({ error: "insufficient_data" }, { status: 404 });

    const closes = pairs.map((p) => p.c);
    const times = pairs.map((p) => p.t);

    const bh = computeStats(closes, times);
    if (!bh) return NextResponse.json({ error: "compute_failed" }, { status: 500 });

    const smaResult = closes.length >= 200 ? smaCross(closes, times) : null;
    const rsiResult = closes.length >= 30 ? rsiStrategy(closes, times) : null;
    const momResult = closes.length >= 30 ? momentum(closes, times) : null;

    return NextResponse.json({
      symbol: sym,
      range,
      ...bh,
      strategies: {
        buyAndHold: { name: "Buy & Hold", totalReturn: bh.totalReturn, annualReturn: bh.annualReturn, equityCurve: bh.equityCurve },
        smaCross: smaResult ? { name: "SMA 50/200 Cross", ...smaResult } : null,
        rsi: rsiResult ? { name: "RSI Mean Reversion (14)", ...rsiResult } : null,
        momentum: momResult ? { name: "20D Momentum", ...momResult } : null,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "backtest_failed", detail: (err as Error).message }, { status: 500 });
  }
}
