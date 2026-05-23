"""Strategy backtesting with institutional risk metrics."""

from __future__ import annotations

import math
import statistics
from typing import Literal, Optional

Strategy = Literal["buy_hold", "sma_cross", "rsi", "momentum"]


def _sma(prices: list[float], period: int) -> list[Optional[float]]:
    out: list[Optional[float]] = [None] * len(prices)
    for i in range(period - 1, len(prices)):
        out[i] = sum(prices[i - period + 1 : i + 1]) / period
    return out


def _rsi(prices: list[float], period: int) -> list[Optional[float]]:
    rsi: list[Optional[float]] = [None] * len(prices)
    for i in range(period, len(prices)):
        gains, losses = 0.0, 0.0
        for j in range(i - period + 1, i + 1):
            d = prices[j] - prices[j - 1]
            if d > 0:
                gains += d
            else:
                losses -= d
        if losses == 0:
            rsi[i] = 100.0
        else:
            rsi[i] = 100 - 100 / (1 + gains / losses)
    return rsi


def run_backtest_pro(
    prices: list[float],
    strategy: Strategy = "buy_hold",
    sma_short: int = 20,
    sma_long: int = 50,
    rsi_period: int = 14,
    momentum_lookback: int = 20,
    initial_capital: float = 100_000.0,
) -> dict:
    if len(prices) < 3:
        raise ValueError("Need at least 3 price points")

    capital = initial_capital
    shares = 0.0
    trades = 0
    wins = 0
    trade_returns: list[float] = []
    equity_curve: list[float] = []
    position = False
    entry_price = 0.0

    if strategy == "buy_hold":
        shares = capital / prices[0]
        capital = 0.0
        trades = 1
        equity_curve = [shares * p for p in prices]

    elif strategy == "sma_cross":
        short_ma = _sma(prices, sma_short)
        long_ma = _sma(prices, sma_long)
        for i, p in enumerate(prices):
            s, l = short_ma[i], long_ma[i]
            if s is not None and l is not None:
                if not position and s > l:
                    shares = capital / p
                    capital = 0.0
                    position = True
                    entry_price = p
                    trades += 1
                elif position and s < l:
                    trade_returns.append((p - entry_price) / entry_price)
                    if p > entry_price:
                        wins += 1
                    capital = shares * p
                    shares = 0.0
                    position = False
                    trades += 1
            equity_curve.append(capital + shares * p)

    elif strategy == "rsi":
        rsi_vals = _rsi(prices, rsi_period)
        for i, p in enumerate(prices):
            r = rsi_vals[i]
            if r is not None:
                if not position and r < 30:
                    shares = capital / p
                    capital = 0.0
                    position = True
                    entry_price = p
                    trades += 1
                elif position and r > 70:
                    trade_returns.append((p - entry_price) / entry_price)
                    if p > entry_price:
                        wins += 1
                    capital = shares * p
                    shares = 0.0
                    position = False
                    trades += 1
            equity_curve.append(capital + shares * p)

    elif strategy == "momentum":
        for i, p in enumerate(prices):
            if i >= momentum_lookback:
                ret = (p - prices[i - momentum_lookback]) / prices[i - momentum_lookback]
                if not position and ret > 0.02:
                    shares = capital / p
                    capital = 0.0
                    position = True
                    entry_price = p
                    trades += 1
                elif position and ret < -0.01:
                    trade_returns.append((p - entry_price) / entry_price)
                    if p > entry_price:
                        wins += 1
                    capital = shares * p
                    shares = 0.0
                    position = False
                    trades += 1
            equity_curve.append(capital + shares * p)

    final_equity = capital + shares * prices[-1]
    total_return_pct = (final_equity - initial_capital) / initial_capital * 100

    peak, max_dd = initial_capital, 0.0
    for v in equity_curve:
        if v > peak:
            peak = v
        dd = (peak - v) / peak * 100 if peak > 0 else 0
        max_dd = max(max_dd, dd)

    returns = [
        (equity_curve[i] - equity_curve[i - 1]) / equity_curve[i - 1]
        for i in range(1, len(equity_curve))
        if equity_curve[i - 1] > 0
    ]
    mean_r = statistics.mean(returns) if returns else 0.0
    std_r = statistics.stdev(returns) if len(returns) > 1 else 0.0
    sharpe = (mean_r * 252) / (std_r * math.sqrt(252)) if std_r > 0 else 0.0

    down = [r for r in returns if r < 0]
    down_std = math.sqrt(sum(r * r for r in down) / max(len(down), 1)) if down else 0.0
    sortino = (mean_r * 252) / (down_std * math.sqrt(252)) if down_std > 0 else 0.0

    calmar = (total_return_pct / max(max_dd, 0.01)) if max_dd > 0 else total_return_pct

    sorted_r = sorted(returns)
    var95 = sorted_r[int(len(sorted_r) * 0.05)] * 100 if sorted_r else 0.0
    tail = sorted_r[: max(1, int(len(sorted_r) * 0.05))]
    cvar95 = statistics.mean(tail) * 100 if tail else 0.0

    win_rate = (wins / len(trade_returns) * 100) if trade_returns else 0.0

    return {
        "strategy": strategy,
        "total_return_pct": round(total_return_pct, 4),
        "final_equity": round(final_equity, 2),
        "max_drawdown_pct": round(max_dd, 4),
        "sharpe_ratio": round(sharpe, 4),
        "sortino_ratio": round(sortino, 4),
        "calmar_ratio": round(calmar, 4),
        "var_95_day_pct": round(var95, 4),
        "cvar_95_day_pct": round(cvar95, 4),
        "trades": trades,
        "win_rate_pct": round(win_rate, 2),
        "equity_curve": [round(v, 2) for v in equity_curve],
        "annualized_vol_pct": round(std_r * math.sqrt(252) * 100, 4) if std_r else 0.0,
    }
