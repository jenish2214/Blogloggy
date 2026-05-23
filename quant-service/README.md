# QuantDesk Quant Engine v2

Institutional-style numerics: **SciPy** normal CDF, **antithetic Monte Carlo**, pro backtests (Sharpe, Sortino, Calmar, VaR, CVaR).

## Setup

```bash
cd quant-service
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Key endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/validate-models` | BS vs MC benchmark (~99%+ agreement) |
| POST | `/price` | Black–Scholes + Greeks |
| POST | `/monte-carlo` | Antithetic MC with error vs BS |
| POST | `/predict-suite` | Algorithms + ML (Ridge, RF, GBC) + price forecast |
| POST | `/backtest` | Multi-strategy backtest + risk metrics |
| POST | `/correlation` | Return correlation matrix |
| POST | `/portfolio-var` | Parametric VaR |

Frontend **Quant Lab**: `/quant-lab` (proxied via `QUANT_SERVICE_URL`).
