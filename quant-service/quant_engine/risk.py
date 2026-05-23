"""Portfolio risk: correlation and parametric VaR."""

from __future__ import annotations

import math
import statistics


def correlation_matrix(series: dict[str, list[float]]) -> dict:
    symbols = list(series.keys())
    if len(symbols) < 2:
        raise ValueError("Need at least 2 symbols")

    n = min(len(series[s]) for s in symbols)
    if n < 5:
        raise ValueError("Need at least 5 aligned observations")

    returns: dict[str, list[float]] = {}
    for sym in symbols:
        px = series[sym][-n:]
        returns[sym] = [(px[i] - px[i - 1]) / px[i - 1] for i in range(1, len(px))]

    matrix: list[list[float]] = []
    for a in symbols:
        row: list[float] = []
        ra = returns[a]
        for b in symbols:
            rb = returns[b]
            if a == b:
                row.append(1.0)
            else:
                row.append(round(_corr(ra, rb), 6))
        matrix.append(row)

    return {"symbols": symbols, "matrix": matrix}


def _corr(a: list[float], b: list[float]) -> float:
    n = len(a)
    ma, mb = statistics.mean(a), statistics.mean(b)
    num = sum((a[i] - ma) * (b[i] - mb) for i in range(n))
    da = math.sqrt(sum((x - ma) ** 2 for x in a))
    db = math.sqrt(sum((x - mb) ** 2 for x in b))
    if da == 0 or db == 0:
        return 0.0
    return num / (da * db)


def portfolio_var(
    weights: list[float],
    volatilities: list[float],
    correlations: list[list[float]],
    confidence: float = 0.95,
    horizon_days: int = 1,
) -> dict:
    """Parametric VaR (variance-covariance), assumes normal returns."""
    n = len(weights)
    if n != len(volatilities) or n != len(correlations):
        raise ValueError("weights, volatilities, correlations size mismatch")

    w = weights
    daily_vols = [v / math.sqrt(252) for v in volatilities]

    var_p = 0.0
    for i in range(n):
        for j in range(n):
            var_p += w[i] * w[j] * daily_vols[i] * daily_vols[j] * correlations[i][j]

    port_vol = math.sqrt(max(var_p, 0.0))
    z = 1.645 if confidence >= 0.95 else 1.282  # 95% / 90%
    var_pct = z * port_vol * math.sqrt(horizon_days) * 100

    return {
        "portfolio_daily_vol_pct": round(port_vol * 100, 6),
        "var_pct": round(var_pct, 6),
        "confidence": confidence,
        "horizon_days": horizon_days,
        "method": "parametric_variance_covariance",
    }
