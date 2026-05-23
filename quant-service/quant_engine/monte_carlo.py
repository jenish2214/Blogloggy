"""Monte Carlo European options — antithetic variates + numpy RNG."""

from __future__ import annotations

import math
from typing import Literal

import numpy as np

from .pricing import black_scholes

OptionType = Literal["call", "put"]


def monte_carlo_european(
    S: float,
    K: float,
    T: float,
    r: float,
    sigma: float,
    option_type: OptionType,
    simulations: int = 50_000,
    seed: int | None = 42,
) -> dict:
    if simulations < 1000:
        simulations = 1000
    # Antithetic: half paths, paired z and -z
    n = simulations // 2
    rng = np.random.default_rng(seed)

    z = rng.standard_normal(n)
    drift = (r - 0.5 * sigma**2) * T
    diffusion = sigma * math.sqrt(T)

    ST1 = S * np.exp(drift + diffusion * z)
    ST2 = S * np.exp(drift - diffusion * z)
    ST = np.concatenate([ST1, ST2])

    if option_type == "call":
        payoffs = np.maximum(ST - K, 0.0)
    else:
        payoffs = np.maximum(K - ST, 0.0)

    discount = math.exp(-r * T)
    discounted = discount * payoffs
    price = float(np.mean(discounted))
    std_err = float(np.std(discounted, ddof=1) / math.sqrt(len(discounted)))

    bs = black_scholes(S, K, T, r, sigma, option_type)
    bs_price = bs["price"]
    rel_error_pct = abs(price - bs_price) / bs_price * 100 if bs_price > 1e-8 else 0.0

    return {
        "mc_price": round(price, 8),
        "bs_price": round(bs_price, 8),
        "relative_error_pct": round(rel_error_pct, 6),
        "std_error": round(std_err, 8),
        "confidence_interval_95": [
            round(price - 1.96 * std_err, 8),
            round(price + 1.96 * std_err, 8),
        ],
        "simulations": len(discounted),
        "method": "antithetic_monte_carlo",
        "accuracy_grade": _grade(rel_error_pct, std_err / price * 100 if price else 100),
    }


def _grade(rel_err: float, stderr_pct: float) -> str:
    if rel_err < 0.5 and stderr_pct < 1.0:
        return "institutional"
    if rel_err < 2.0:
        return "professional"
    return "review"


def benchmark_bs_vs_mc(
    S: float = 100.0,
    K: float = 100.0,
    T: float = 0.5,
    r: float = 0.05,
    sigma: float = 0.25,
) -> dict:
    """Report model agreement — target <1% MC vs BS for ATM options."""
    call_mc = monte_carlo_european(S, K, T, r, sigma, "call", simulations=100_000)
    put_mc = monte_carlo_european(S, K, T, r, sigma, "put", simulations=100_000)
    call_bs = black_scholes(S, K, T, r, sigma, "call")
    put_bs = black_scholes(S, K, T, r, sigma, "put")

    max_err = max(call_mc["relative_error_pct"], put_mc["relative_error_pct"])
    model_agreement_pct = round(max(0.0, 100.0 - max_err), 4)

    return {
        "call": {"bs": call_bs["price"], "mc": call_mc["mc_price"], "error_pct": call_mc["relative_error_pct"]},
        "put": {"bs": put_bs["price"], "mc": put_mc["mc_price"], "error_pct": put_mc["relative_error_pct"]},
        "model_agreement_pct": model_agreement_pct,
        "note": "Agreement between closed-form BS and MC (not market prediction accuracy). Paper trading only.",
        "target_met": max_err < 1.0,
    }
