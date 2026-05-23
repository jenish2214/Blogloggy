"""Technical indicators & rule-based signals (aligned with QuantDesk algo engine)."""

from __future__ import annotations

import math
import statistics
from typing import Literal

Signal = Literal["buy", "sell", "neutral"]
Composite = Literal["strong_buy", "buy", "neutral", "sell", "strong_sell"]


def _ema(values: list[float], period: int) -> list[float]:
    k = 2 / (period + 1)
    out: list[float] = []
    prev = values[0]
    for v in values:
        prev = v * k + prev * (1 - k)
        out.append(prev)
    return out


def _sma(values: list[float], period: int) -> float | None:
    if len(values) < period:
        return None
    return sum(values[-period:]) / period


def _rsi(closes: list[float], period: int = 14) -> float:
    if len(closes) < period + 1:
        return 50.0
    avg_gain, avg_loss = 0.0, 0.0
    for i in range(1, period + 1):
        d = closes[i] - closes[i - 1]
        if d > 0:
            avg_gain += d
        else:
            avg_loss -= d
    avg_gain /= period
    avg_loss /= period
    for i in range(period + 1, len(closes)):
        d = closes[i] - closes[i - 1]
        avg_gain = (avg_gain * (period - 1) + max(d, 0)) / period
        avg_loss = (avg_loss * (period - 1) + max(-d, 0)) / period
    if avg_loss == 0:
        return 100.0
    return 100 - 100 / (1 + avg_gain / avg_loss)


def algorithm_signals(closes: list[float], volumes: list[float] | None = None) -> dict:
    if len(closes) < 30:
        raise ValueError("Need at least 30 closes for algorithm signals")

    current = closes[-1]
    rsi_val = _rsi(closes)
    rsi_sig: Signal = "buy" if rsi_val < 35 else "sell" if rsi_val > 65 else "neutral"

    sma20 = _sma(closes, 20)
    sma50 = _sma(closes, min(50, len(closes)))
    sma_sig: Signal = "neutral"
    if sma20 is not None and sma50 is not None:
        if sma20 > sma50 * 1.005:
            sma_sig = "buy"
        elif sma20 < sma50 * 0.995:
            sma_sig = "sell"

    ema12 = _ema(closes, 12)
    ema26 = _ema(closes, 26)
    macd_line = [ema12[i] - ema26[i] for i in range(len(closes))]
    sig_line = _ema(macd_line[-30:], 9)
    last_macd = macd_line[-1]
    last_sig = sig_line[-1]
    macd_sig: Signal = "buy" if last_macd > last_sig else "sell"

    recent = closes[-20:]
    bb_mid = statistics.mean(recent)
    std = statistics.stdev(recent) if len(recent) > 1 else 0.0
    bb_upper = bb_mid + 2 * std
    bb_lower = bb_mid - 2 * std
    bb_range = bb_upper - bb_lower
    bb_pct = ((current - bb_lower) / bb_range * 100) if bb_range > 0 else 50.0
    bb_sig: Signal = "buy" if bb_pct < 25 else "sell" if bb_pct > 75 else "neutral"

    vols = volumes if volumes and len(volumes) == len(closes) else [1.0] * len(closes)
    avg_vol = statistics.mean(vols[-20:])
    last_vol = vols[-1]
    vol_ratio = last_vol / avg_vol if avg_vol > 0 else 1.0

    votes = [rsi_sig, sma_sig, macd_sig, bb_sig]
    buy_v = sum(1 for s in votes if s == "buy")
    sell_v = sum(1 for s in votes if s == "sell")
    if buy_v >= 3:
        composite: Composite = "strong_buy"
    elif buy_v == 2:
        composite = "buy"
    elif sell_v >= 3:
        composite = "strong_sell"
    elif sell_v == 2:
        composite = "sell"
    else:
        composite = "neutral"

    change5d = ((closes[-1] - closes[-6]) / closes[-6] * 100) if len(closes) >= 6 else 0.0
    change20d = ((closes[-1] - closes[-21]) / closes[-21] * 100) if len(closes) >= 21 else 0.0

    return {
        "current_price": round(current, 4),
        "rsi": {"value": round(rsi_val, 2), "signal": rsi_sig},
        "sma": {
            "sma20": round(sma20, 4) if sma20 else None,
            "sma50": round(sma50, 4) if sma50 else None,
            "signal": sma_sig,
        },
        "macd": {
            "macd": round(last_macd, 6),
            "signal_line": round(last_sig, 6),
            "histogram": round(last_macd - last_sig, 6),
            "signal": macd_sig,
        },
        "bollinger_bands": {
            "upper": round(bb_upper, 4),
            "middle": round(bb_mid, 4),
            "lower": round(bb_lower, 4),
            "pct": round(bb_pct, 2),
            "signal": bb_sig,
        },
        "volume": {"ratio": round(vol_ratio, 3), "signal": "buy" if vol_ratio > 1.5 else "neutral"},
        "composite": composite,
        "change_5d_pct": round(change5d, 3),
        "change_20d_pct": round(change20d, 3),
        "indicators": [
            {"name": "RSI (14)", "family": "algorithm", "signal": rsi_sig, "value": round(rsi_val, 2)},
            {"name": "SMA Cross (20/50)", "family": "algorithm", "signal": sma_sig, "value": f"{sma20:.2f}/{sma50:.2f}" if sma20 and sma50 else "—"},
            {"name": "MACD (12,26,9)", "family": "algorithm", "signal": macd_sig, "value": round(last_macd - last_sig, 4)},
            {"name": "Bollinger %B", "family": "algorithm", "signal": bb_sig, "value": round(bb_pct, 1)},
        ],
    }
