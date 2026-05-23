"""European option pricing — Black–Scholes with SciPy normal CDF (machine precision)."""

from __future__ import annotations

import math
from typing import Literal

from scipy.stats import norm

OptionType = Literal["call", "put"]


def black_scholes(
    S: float,
    K: float,
    T: float,
    r: float,
    sigma: float,
    option_type: OptionType,
) -> dict:
    if S <= 0 or K <= 0 or sigma <= 0:
        raise ValueError("S, K, sigma must be positive")

    intrinsic_call = max(0.0, S - K)
    intrinsic_put = max(0.0, K - S)
    intrinsic = intrinsic_call if option_type == "call" else intrinsic_put

    if T <= 0:
        price = intrinsic
        delta = 1.0 if (option_type == "call" and S > K) else (-1.0 if option_type == "put" and K > S else 0.0)
        return _pack(price, delta, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, intrinsic, 0.0)

    sqrt_T = math.sqrt(T)
    d1 = (math.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * sqrt_T)
    d2 = d1 - sigma * sqrt_T

    if option_type == "call":
        price = S * norm.cdf(d1) - K * math.exp(-r * T) * norm.cdf(d2)
        delta = float(norm.cdf(d1))
        rho = K * T * math.exp(-r * T) * norm.cdf(d2) / 100.0
    else:
        price = K * math.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)
        delta = float(norm.cdf(d1) - 1.0)
        rho = -K * T * math.exp(-r * T) * norm.cdf(-d2) / 100.0

    pdf_d1 = float(norm.pdf(d1))
    gamma = pdf_d1 / (S * sigma * sqrt_T)
    vega_per_1pct = S * sqrt_T * pdf_d1 / 100.0
    theta = (
        -(S * sigma * pdf_d1) / (2 * sqrt_T)
        - r
        * K
        * math.exp(-r * T)
        * (norm.cdf(d2) if option_type == "call" else norm.cdf(-d2))
    ) / 365.0

    price = max(0.0, float(price))
    time_value = max(0.0, price - intrinsic)

    return _pack(
        price,
        delta,
        gamma,
        theta,
        vega_per_1pct,
        rho,
        d1,
        d2,
        intrinsic,
        time_value,
    )


def _pack(
    price: float,
    delta: float,
    gamma: float,
    theta: float,
    vega: float,
    rho: float,
    d1: float,
    d2: float,
    intrinsic: float,
    time_value: float,
) -> dict:
    return {
        "price": round(price, 8),
        "delta": round(delta, 8),
        "gamma": round(gamma, 8),
        "theta": round(theta, 8),
        "vega": round(vega, 8),
        "rho": round(rho, 8),
        "d1": round(d1, 8),
        "d2": round(d2, 8),
        "intrinsic": round(intrinsic, 6),
        "time_value": round(time_value, 6),
    }


def implied_volatility(
    market_price: float,
    S: float,
    K: float,
    T: float,
    r: float,
    option_type: OptionType,
    tol: float = 1e-8,
    max_iter: int = 80,
) -> dict:
    """Newton–Raphson IV with vega in per-unit sigma."""
    if market_price <= 0 or T <= 0:
        raise ValueError("market_price and T must be positive")

    sigma = 0.25
    for _ in range(max_iter):
        result = black_scholes(S, K, T, r, sigma, option_type)
        diff = result["price"] - market_price
        if abs(diff) < tol:
            break
        vega_unit = result["vega"] * 100.0  # convert from per-1% to per 1.0 sigma
        if abs(vega_unit) < 1e-12:
            break
        sigma -= diff / vega_unit
        sigma = max(1e-6, min(sigma, 5.0))

    bs_at_iv = black_scholes(S, K, T, r, sigma, option_type)
    return {
        "implied_volatility": round(sigma, 8),
        "iv_pct": round(sigma * 100, 4),
        "fitted_price": bs_at_iv["price"],
        "price_error": round(abs(bs_at_iv["price"] - market_price), 8),
    }
