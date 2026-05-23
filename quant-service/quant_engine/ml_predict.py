"""Machine-learning price forecasts & direction models (scikit-learn)."""

from __future__ import annotations

import math
from typing import Literal

import numpy as np
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import Ridge
from sklearn.metrics import accuracy_score, mean_absolute_percentage_error
from sklearn.preprocessing import StandardScaler

from .technical import _rsi, _sma, algorithm_signals


def _build_features(closes: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Feature matrix X and targets: next return, next direction."""
    n = len(closes)
    rows: list[list[float]] = []
    y_ret: list[float] = []
    y_dir: list[int] = []

    for i in range(25, n - 1):
        window = closes[: i + 1]
        c = closes[i]
        ret1 = (c - closes[i - 1]) / closes[i - 1]
        ret5 = (c - closes[i - 5]) / closes[i - 5]
        ret10 = (c - closes[i - 10]) / closes[i - 10]
        rsi = _rsi(window.tolist()) / 100.0
        s20 = _sma(window.tolist(), 20)
        s50 = _sma(window.tolist(), min(50, len(window)))
        sma_ratio = (s20 / s50 - 1.0) if s20 and s50 else 0.0
        vol20 = float(np.std(np.diff(window[-21:]) / window[-21:-1])) if len(window) > 21 else 0.0
        mom = (c - closes[i - 20]) / closes[i - 20] if i >= 20 else 0.0

        rows.append([ret1, ret5, ret10, rsi, sma_ratio, vol20, mom])
        nxt = closes[i + 1]
        y_ret.append((nxt - c) / c)
        y_dir.append(1 if nxt > c else 0)

    return np.array(rows), np.array(y_ret), np.array(y_dir)


def ml_predict_suite(
    prices: list[float],
    volumes: list[float] | None = None,
    horizon_days: int = 5,
    symbol: str = "ASSET",
) -> dict:
    if len(prices) < 60:
        raise ValueError("Need at least 60 daily prices for ML models")

    horizon_days = max(1, min(horizon_days, 10))
    closes = np.array(prices, dtype=float)
    current = float(closes[-1])

    algo = algorithm_signals(prices, volumes)

    X, y_ret, y_dir = _build_features(closes)
    if len(X) < 30:
        raise ValueError("Insufficient feature rows after engineering")

    split = int(len(X) * 0.8)
    X_train, X_test = X[:split], X[split:]
    y_ret_train, y_ret_test = y_ret[:split], y_ret[split:]
    y_dir_train, y_dir_test = y_dir[:split], y_dir[split:]

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)
    X_all_s = scaler.transform(X)

    # ── Ridge: next-day return → price path ───────────────────────────────────
    ridge = Ridge(alpha=1.0)
    ridge.fit(X_train_s, y_ret_train)
    holdout_ret_pred = ridge.predict(X_test_s)
    holdout_prices = closes[split + 25 : split + 25 + len(holdout_ret_pred)]
    if len(holdout_prices) > 0:
        mape_ridge = float(
            mean_absolute_percentage_error(
                holdout_prices,
                holdout_prices * (1 + holdout_ret_pred[: len(holdout_prices)]),
            )
            * 100
        )
    else:
        mape_ridge = 0.0

    last_feat = X_all_s[-1:].reshape(1, -1)
    ridge_full = Ridge(alpha=1.0)
    ridge_full.fit(X_all_s, y_ret)
    daily_returns: list[float] = []
    price_path = [current]
    feat = last_feat.copy()
    for _ in range(horizon_days):
        r = float(ridge_full.predict(feat)[0])
        r = max(-0.15, min(0.15, r))
        daily_returns.append(r)
        price_path.append(price_path[-1] * (1 + r))
        # crude feature roll-forward
        feat_arr = feat.flatten().copy()
        feat_arr[0] = r
        feat = feat_arr.reshape(1, -1)

    # ── Random Forest direction ───────────────────────────────────────────────
    rf = RandomForestClassifier(n_estimators=120, max_depth=6, random_state=42, min_samples_leaf=4)
    rf.fit(X_train_s, y_dir_train)
    rf_acc = float(accuracy_score(y_dir_test, rf.predict(X_test_s)) * 100) if len(y_dir_test) else 0.0
    rf_dir = int(rf.predict(last_feat)[0])
    rf_proba = float(max(rf.predict_proba(last_feat)[0]))

    # ── Gradient Boosting direction ───────────────────────────────────────────
    gbc = GradientBoostingClassifier(n_estimators=80, max_depth=4, random_state=42)
    gbc.fit(X_train_s, y_dir_train)
    gbc_acc = float(accuracy_score(y_dir_test, gbc.predict(X_test_s)) * 100) if len(y_dir_test) else 0.0
    gbc_dir = int(gbc.predict(last_feat)[0])
    gbc_proba = float(max(gbc.predict_proba(last_feat)[0]))

    direction_label: Literal["bullish", "bearish", "neutral"] = (
        "bullish" if (rf_dir + gbc_dir) >= 2 else "bearish" if (rf_dir + gbc_dir) == 0 else "neutral"
    )

    predicted_5d = price_path[-1]
    pct_move = (predicted_5d - current) / current * 100

    models = [
        {
            "name": "Ridge Regression",
            "family": "machine_learning",
            "task": "price_path",
            "holdout_mape_pct": round(mape_ridge, 3),
            "predicted_return_1d_pct": round(daily_returns[0] * 100, 4) if daily_returns else 0,
            "confidence_pct": round(max(0, 100 - mape_ridge), 2),
        },
        {
            "name": "Random Forest Classifier",
            "family": "machine_learning",
            "task": "direction",
            "holdout_accuracy_pct": round(rf_acc, 2),
            "signal": "buy" if rf_dir == 1 else "sell",
            "confidence_pct": round(rf_proba * 100, 2),
        },
        {
            "name": "Gradient Boosting Classifier",
            "family": "machine_learning",
            "task": "direction",
            "holdout_accuracy_pct": round(gbc_acc, 2),
            "signal": "buy" if gbc_dir == 1 else "sell",
            "confidence_pct": round(gbc_proba * 100, 2),
        },
    ]

    predictions = []
    for d in range(1, horizon_days + 1):
        predictions.append({
            "day": d,
            "price": round(price_path[d], 4),
            "change_pct": round((price_path[d] - current) / current * 100, 4),
            "model": "ridge_regression",
        })

    # Ensemble score: algorithms + ML votes
    ml_vote = 1 if direction_label == "bullish" else -1 if direction_label == "bearish" else 0
    algo_vote = 1 if algo["composite"] in ("buy", "strong_buy") else -1 if algo["composite"] in ("sell", "strong_sell") else 0
    ensemble_score = (ml_vote * 0.6 + algo_vote * 0.4)
    ensemble_signal = "buy" if ensemble_score > 0.25 else "sell" if ensemble_score < -0.25 else "neutral"
    ensemble_conf = round((rf_proba + gbc_proba) / 2 * 100, 2)

    hist_chart = [{"i": i, "price": round(float(p), 4)} for i, p in enumerate(closes[-90:].tolist())]
    fc_offset = len(hist_chart)
    forecast_chart = [
        {"i": fc_offset + d, "price": round(price_path[d + 1], 4), "type": "forecast"}
        for d in range(horizon_days)
    ]

    return {
        "symbol": symbol,
        "current_price": round(current, 4),
        "horizon_days": horizon_days,
        "predicted_price": round(predicted_5d, 4),
        "predicted_change_pct": round(pct_move, 4),
        "direction": direction_label,
        "ensemble": {
            "signal": ensemble_signal,
            "confidence_pct": ensemble_conf,
            "note": "Weighted blend: ML direction (60%) + algorithm composite (40%)",
        },
        "algorithm": algo,
        "models": models,
        "predictions": predictions,
        "all_signals": algo["indicators"]
        + [
            {
                "name": m["name"],
                "family": m["family"],
                "signal": m.get("signal", direction_label),
                "value": m.get("holdout_accuracy_pct", m.get("holdout_mape_pct", "—")),
                "confidence_pct": m.get("confidence_pct"),
            }
            for m in models
        ],
        "chart": {"historical": hist_chart, "forecast": forecast_chart},
        "disclaimer": "ML outputs are statistical estimates on historical data — not guaranteed future prices. Paper trading only.",
    }
