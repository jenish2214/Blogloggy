"""OHLCV history via yfinance — all available trading sessions (no weekend UI blocking)."""

from __future__ import annotations

from typing import Any

import yfinance as yf


def _fmt_label(ts, interval: str) -> str:
    if interval in ("1d", "5d", "1wk", "1mo", "3mo"):
        return ts.strftime("%Y-%m-%d")
    return ts.strftime("%H:%M")


def fetch_ohlcv(
    symbol: str,
    period: str = "1y",
    interval: str = "1d",
) -> dict[str, Any]:
    sym = symbol.strip().upper()
    if not sym:
        raise ValueError("symbol required")

    ticker = yf.Ticker(sym)
    df = ticker.history(period=period, interval=interval, auto_adjust=True)
    if df is None or df.empty:
        raise ValueError(f"No market data for {sym} (period={period}, interval={interval})")

    candles: list[dict[str, Any]] = []
    for idx, row in df.iterrows():
        ts_ms = int(idx.timestamp() * 1000)
        o = float(row["Open"])
        h = float(row["High"])
        l = float(row["Low"])
        c = float(row["Close"])
        vol = float(row["Volume"]) if row.get("Volume") is not None else 0.0
        if any(v != v for v in (o, h, l, c)):  # NaN check
            continue
        candles.append(
            {
                "open": round(o, 6),
                "high": round(h, 6),
                "low": round(l, 6),
                "close": round(c, 6),
                "volume": round(vol, 2),
                "timestamp": ts_ms,
                "timeLabel": _fmt_label(idx, interval),
            }
        )

    if not candles:
        raise ValueError(f"No valid candles for {sym}")

    last = candles[-1]
    try:
        info = ticker.fast_info
        current = float(getattr(info, "last_price", None) or last["close"])
    except Exception:
        current = last["close"]

    return {
        "symbol": sym,
        "period": period,
        "interval": interval,
        "provider": "yfinance",
        "candleCount": len(candles),
        "currentPrice": round(current, 6),
        "candles": candles,
    }
