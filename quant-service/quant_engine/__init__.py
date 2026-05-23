"""QuantDesk institutional-grade quant primitives."""

from .pricing import black_scholes, implied_volatility
from .monte_carlo import monte_carlo_european
from .backtest import run_backtest_pro
from .risk import correlation_matrix, portfolio_var
from .ml_predict import ml_predict_suite
from .technical import algorithm_signals

__all__ = [
    "black_scholes",
    "implied_volatility",
    "monte_carlo_european",
    "run_backtest_pro",
    "correlation_matrix",
    "portfolio_var",
    "ml_predict_suite",
    "algorithm_signals",
]
