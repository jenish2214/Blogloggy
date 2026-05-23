"""
QuantDesk — Python Quant Service
FastAPI service exposing:
  - Black-Scholes option pricing
  - Greeks calculator
  - Historical volatility
  - Simple backtesting
  - Monte Carlo simulation
  - Correlation matrix

Run: uvicorn main:app --reload --port 8000
"""

import math
import os
import random
from typing import Literal, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import statistics

app = FastAPI(title="QuantDesk Python Service", version="1.0.0")

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


# ── Black-Scholes ────────────────────────────────────────────────────────────

def norm_cdf(x: float) -> float:
    """Cumulative standard normal distribution (Abramowitz & Stegun)."""
    a1, a2, a3, a4, a5, p = 0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429, 0.3275911
    sign = 1 if x >= 0 else -1
    x = abs(x) / math.sqrt(2)
    t = 1 / (1 + p * x)
    y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * math.exp(-x * x))
    return 0.5 * (1 + sign * y)


def norm_pdf(x: float) -> float:
    return math.exp(-0.5 * x * x) / math.sqrt(2 * math.pi)


def black_scholes(S: float, K: float, T: float, r: float, sigma: float, option_type: str):
    """Price European option with Black-Scholes."""
    if T <= 0:
        if option_type == "call":
            return {"price": max(0.0, S - K), "delta": 1.0 if S > K else 0.0, "gamma": 0, "theta": 0, "vega": 0, "rho": 0}
        return {"price": max(0.0, K - S), "delta": -1.0 if K > S else 0.0, "gamma": 0, "theta": 0, "vega": 0, "rho": 0}

    sqrt_T = math.sqrt(T)
    d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * sqrt_T)
    d2 = d1 - sigma * sqrt_T

    if option_type == "call":
        price = S * norm_cdf(d1) - K * math.exp(-r * T) * norm_cdf(d2)
        delta = norm_cdf(d1)
        rho = K * T * math.exp(-r * T) * norm_cdf(d2) / 100
    else:
        price = K * math.exp(-r * T) * norm_cdf(-d2) - S * norm_cdf(-d1)
        delta = norm_cdf(d1) - 1
        rho = -K * T * math.exp(-r * T) * norm_cdf(-d2) / 100

    gamma = norm_pdf(d1) / (S * sigma * sqrt_T)
    theta = (
        -(S * sigma * norm_pdf(d1)) / (2 * sqrt_T)
        - r * K * math.exp(-r * T) * (norm_cdf(d2) if option_type == "call" else norm_cdf(-d2))
    ) / 365
    vega = S * sqrt_T * norm_pdf(d1) / 100

    return {
        "price": round(max(0.0, price), 6),
        "delta": round(delta, 6),
        "gamma": round(gamma, 6),
        "theta": round(theta, 6),
        "vega": round(vega, 6),
        "rho": round(rho, 6),
        "d1": round(d1, 6),
        "d2": round(d2, 6),
        "intrinsic": round(max(0.0, S - K) if option_type == "call" else max(0.0, K - S), 4),
        "time_value": round(max(0.0, max(0.0, price) - max(0.0, S - K if option_type == "call" else K - S)), 4),
    }


class OptionPriceRequest(BaseModel):
    S: float          # Spot price
    K: float          # Strike price
    T: float          # Time to expiry in years
    r: float = 0.05   # Risk-free rate
    sigma: float      # Volatility (annualized, e.g., 0.25 = 25%)
    type: Literal["call", "put"] = "call"


@app.post("/price")
def price_option(req: OptionPriceRequest):
    """Price an option and return full Greeks."""
    if req.S <= 0 or req.K <= 0 or req.sigma <= 0:
        raise HTTPException(status_code=400, detail="S, K, sigma must be positive")
    result = black_scholes(req.S, req.K, req.T, req.r, req.sigma, req.type)
    return {"status": "ok", "result": result, "inputs": req.model_dump()}


# ── Implied Volatility (Newton-Raphson) ─────────────────────────────────────

class IVRequest(BaseModel):
    market_price: float
    S: float
    K: float
    T: float
    r: float = 0.05
    type: Literal["call", "put"] = "call"


@app.post("/implied-volatility")
def implied_volatility(req: IVRequest):
    """Compute implied volatility from market price."""
    target = req.market_price
    sigma = 0.3  # initial guess

    for _ in range(100):
        result = black_scholes(req.S, req.K, req.T, req.r, sigma, req.type)
        price = result["price"]
        vega = result["vega"] * 100  # vega per 1.0 sigma unit

        diff = price - target
        if abs(diff) < 1e-6:
            break
        if vega < 1e-10:
            break
        sigma -= diff / vega
        sigma = max(1e-4, min(sigma, 10.0))  # clamp

    return {"implied_volatility": round(sigma, 6), "iv_pct": round(sigma * 100, 2)}


# ── Monte Carlo Option Pricing ───────────────────────────────────────────────

class MCRequest(BaseModel):
    S: float
    K: float
    T: float
    r: float = 0.05
    sigma: float
    type: Literal["call", "put"] = "call"
    simulations: int = 10_000


@app.post("/monte-carlo")
def monte_carlo(req: MCRequest):
    """Price option using Monte Carlo simulation."""
    payoffs = []
    dt = req.T
    for _ in range(req.simulations):
        z = random.gauss(0, 1)
        ST = req.S * math.exp((req.r - 0.5 * req.sigma ** 2) * dt + req.sigma * math.sqrt(dt) * z)
        if req.type == "call":
            payoffs.append(max(0.0, ST - req.K))
        else:
            payoffs.append(max(0.0, req.K - ST))

    discount = math.exp(-req.r * req.T)
    price = discount * statistics.mean(payoffs)
    std_err = discount * (statistics.stdev(payoffs) / math.sqrt(req.simulations))

    return {
        "mc_price": round(price, 4),
        "std_error": round(std_err, 4),
        "confidence_interval_95": [round(price - 1.96 * std_err, 4), round(price + 1.96 * std_err, 4)],
        "simulations": req.simulations,
    }


# ── Volatility Surface ───────────────────────────────────────────────────────

class VolSurfaceRequest(BaseModel):
    S: float
    r: float = 0.05
    strikes: list[float]
    expiries: list[float]      # in years
    base_vol: float = 0.25


@app.post("/vol-surface")
def vol_surface(req: VolSurfaceRequest):
    """Generate a simple parameterized vol surface (smile + term structure)."""
    surface = []
    for T in req.expiries:
        row = []
        for K in req.strikes:
            moneyness = math.log(K / req.S) / (req.base_vol * math.sqrt(T))
            # Simple smile: parabolic in moneyness
            smile_adj = 0.02 * moneyness ** 2
            term_adj = 0.01 * math.log(1 + T)  # slight upward slope
            vol = req.base_vol + smile_adj + term_adj
            row.append(round(max(0.01, vol), 4))
        surface.append({"expiry_years": T, "strikes": req.strikes, "vols": row})
    return {"surface": surface}


# ── Backtesting ──────────────────────────────────────────────────────────────

class BacktestRequest(BaseModel):
    prices: list[float]       # daily close prices
    strategy: Literal["buy_hold", "sma_cross", "rsi"] = "buy_hold"
    sma_short: int = 20
    sma_long: int = 50
    rsi_period: int = 14
    initial_capital: float = 100_000.0


def sma(prices: list[float], period: int) -> list[Optional[float]]:
    result = [None] * len(prices)
    for i in range(period - 1, len(prices)):
        result[i] = sum(prices[i - period + 1:i + 1]) / period
    return result


def compute_rsi(prices: list[float], period: int = 14) -> list[Optional[float]]:
    rsi = [None] * len(prices)
    for i in range(period, len(prices)):
        gains = [max(0, prices[j] - prices[j-1]) for j in range(i - period + 1, i + 1)]
        losses = [max(0, prices[j-1] - prices[j]) for j in range(i - period + 1, i + 1)]
        avg_gain = sum(gains) / period
        avg_loss = sum(losses) / period
        if avg_loss == 0:
            rsi[i] = 100.0
        else:
            rs = avg_gain / avg_loss
            rsi[i] = round(100 - 100 / (1 + rs), 2)
    return rsi


@app.post("/backtest")
def run_backtest(req: BacktestRequest):
    """Simple strategy backtest on price series."""
    prices = req.prices
    if len(prices) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 price points")

    capital = req.initial_capital
    shares = 0.0
    trades = 0
    equity_curve = []
    position = False

    if req.strategy == "buy_hold":
        shares = capital / prices[0]
        capital = 0
        for p in prices:
            equity_curve.append(capital + shares * p)
        trades = 1

    elif req.strategy == "sma_cross":
        short_ma = sma(prices, req.sma_short)
        long_ma = sma(prices, req.sma_long)
        for i, p in enumerate(prices):
            s, l = short_ma[i], long_ma[i]
            if s is not None and l is not None:
                if not position and s > l:
                    shares = capital / p
                    capital = 0
                    position = True
                    trades += 1
                elif position and s < l:
                    capital = shares * p
                    shares = 0
                    position = False
                    trades += 1
            equity_curve.append(capital + shares * p)

    elif req.strategy == "rsi":
        rsi_vals = compute_rsi(prices, req.rsi_period)
        for i, p in enumerate(prices):
            r = rsi_vals[i]
            if r is not None:
                if not position and r < 30:
                    shares = capital / p
                    capital = 0
                    position = True
                    trades += 1
                elif position and r > 70:
                    capital = shares * p
                    shares = 0
                    position = False
                    trades += 1
            equity_curve.append(capital + shares * p)

    # Final equity
    final_equity = capital + shares * prices[-1]
    total_return = (final_equity - req.initial_capital) / req.initial_capital * 100

    # Drawdown
    peak, max_dd = req.initial_capital, 0.0
    for v in equity_curve:
        if v > peak:
            peak = v
        dd = (peak - v) / peak * 100
        if dd > max_dd:
            max_dd = dd

    # Sharpe
    returns = [(equity_curve[i] - equity_curve[i-1]) / equity_curve[i-1] for i in range(1, len(equity_curve))]
    mean_r = statistics.mean(returns) if returns else 0
    std_r = statistics.stdev(returns) if len(returns) > 1 else 0
    sharpe = (mean_r * 252) / (std_r * math.sqrt(252)) if std_r > 0 else 0

    return {
        "strategy": req.strategy,
        "total_return_pct": round(total_return, 2),
        "final_equity": round(final_equity, 2),
        "max_drawdown_pct": round(max_dd, 2),
        "sharpe_ratio": round(sharpe, 3),
        "trades": trades,
        "equity_curve": [round(v, 2) for v in equity_curve],
    }


# ── Health ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "QuantDesk Python Quant Engine", "version": "1.0.0"}


@app.get("/")
def root():
    return {
        "service": "QuantDesk Python Quant Service",
        "endpoints": ["/price", "/implied-volatility", "/monte-carlo", "/vol-surface", "/backtest", "/health"],
        "note": "Production version uses C++ for HFT and Rust for market data feeds",
    }
