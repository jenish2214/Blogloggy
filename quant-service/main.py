"""
QuantDesk — Python Quant Engine (institutional-grade numerics)
Run: uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import math
import os
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from quant_engine import (
    black_scholes,
    correlation_matrix,
    implied_volatility,
    monte_carlo_european,
    portfolio_var,
    run_backtest_pro,
)
from quant_engine.monte_carlo import benchmark_bs_vs_mc
from quant_engine.ml_predict import ml_predict_suite

app = FastAPI(
    title="QuantDesk Quant Engine",
    version="2.0.0",
    description="Black–Scholes (SciPy), antithetic Monte Carlo, pro backtests, VaR, correlation.",
)

_cors_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:3001,https://algo-street.vercel.app",
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cors_origins if o.strip()],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class OptionPriceRequest(BaseModel):
    S: float
    K: float
    T: float
    r: float = 0.05
    sigma: float
    type: Literal["call", "put"] = "call"


class IVRequest(BaseModel):
    market_price: float
    S: float
    K: float
    T: float
    r: float = 0.05
    type: Literal["call", "put"] = "call"


class MCRequest(BaseModel):
    S: float
    K: float
    T: float
    r: float = 0.05
    sigma: float
    type: Literal["call", "put"] = "call"
    simulations: int = Field(default=50_000, ge=1000, le=500_000)
    seed: Optional[int] = 42


class VolSurfaceRequest(BaseModel):
    S: float
    r: float = 0.05
    strikes: list[float]
    expiries: list[float]
    base_vol: float = 0.25


class BacktestRequest(BaseModel):
    prices: list[float]
    strategy: Literal["buy_hold", "sma_cross", "rsi", "momentum"] = "buy_hold"
    sma_short: int = 20
    sma_long: int = 50
    rsi_period: int = 14
    momentum_lookback: int = 20
    initial_capital: float = 100_000.0


class CorrelationRequest(BaseModel):
    series: dict[str, list[float]]


class PortfolioVarRequest(BaseModel):
    weights: list[float]
    volatilities: list[float]
    correlations: list[list[float]]
    confidence: float = 0.95
    horizon_days: int = 1


class PredictSuiteRequest(BaseModel):
    prices: list[float]
    volumes: Optional[list[float]] = None
    symbol: str = "ASSET"
    horizon_days: int = Field(default=5, ge=1, le=10)


@app.post("/price")
def price_option(req: OptionPriceRequest):
    try:
        result = black_scholes(req.S, req.K, req.T, req.r, req.sigma, req.type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return {"status": "ok", "engine": "scipy_black_scholes", "result": result, "inputs": req.model_dump()}


@app.post("/implied-volatility")
def iv_endpoint(req: IVRequest):
    try:
        out = implied_volatility(req.market_price, req.S, req.K, req.T, req.r, req.type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return {"status": "ok", **out}


@app.post("/monte-carlo")
def monte_carlo(req: MCRequest):
    try:
        out = monte_carlo_european(
            req.S, req.K, req.T, req.r, req.sigma, req.type, req.simulations, req.seed
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return {"status": "ok", **out}


@app.get("/validate-models")
def validate_models():
    """BS vs MC agreement benchmark — target <1% relative error."""
    return {"status": "ok", "benchmark": benchmark_bs_vs_mc()}


@app.post("/vol-surface")
def vol_surface(req: VolSurfaceRequest):
    surface = []
    for T in req.expiries:
        row = []
        for K in req.strikes:
            moneyness = math.log(K / req.S) / (req.base_vol * math.sqrt(max(T, 1e-6)))
            smile_adj = 0.02 * moneyness**2
            term_adj = 0.01 * math.log(1 + T)
            vol = req.base_vol + smile_adj + term_adj
            row.append(round(max(0.01, vol), 6))
        surface.append({"expiry_years": T, "strikes": req.strikes, "vols": row})
    return {"surface": surface}


@app.post("/backtest")
def run_backtest(req: BacktestRequest):
    try:
        result = run_backtest_pro(
            req.prices,
            req.strategy,
            req.sma_short,
            req.sma_long,
            req.rsi_period,
            req.momentum_lookback,
            req.initial_capital,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return {"status": "ok", **result}


@app.post("/correlation")
def correlation(req: CorrelationRequest):
    try:
        return {"status": "ok", **correlation_matrix(req.series)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/predict-suite")
def predict_suite(req: PredictSuiteRequest):
    """Full prediction stack: algorithms + ML models + price path."""
    try:
        result = ml_predict_suite(
            req.prices,
            req.volumes,
            req.horizon_days,
            req.symbol,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return {"status": "ok", **result}


@app.post("/portfolio-var")
def var_endpoint(req: PortfolioVarRequest):
    try:
        return {"status": "ok", **portfolio_var(
            req.weights, req.volatilities, req.correlations, req.confidence, req.horizon_days
        )}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "QuantDesk Python Quant Engine",
        "version": "2.0.0",
        "libraries": ["numpy", "scipy", "scikit-learn"],
    }


@app.get("/")
def root():
    return {
        "service": "QuantDesk Quant Engine v2",
        "endpoints": [
            "/price",
            "/implied-volatility",
            "/monte-carlo",
            "/validate-models",
            "/vol-surface",
            "/backtest",
            "/correlation",
            "/portfolio-var",
            "/predict-suite",
            "/health",
        ],
    }
