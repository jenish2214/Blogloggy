# Quant Lab — Feature Guide

**URL:** `/quant-lab`  
**Stack:** Next.js UI → `/api/quant/*` proxy → Python FastAPI (`quant-service`, port 8000)

Quant Lab is QuantDesk’s research and pricing desk. It runs institutional-style models in a separate Python engine (NumPy, SciPy, scikit-learn). All outputs are for **paper trading and education only** — not financial advice.

---

## Prerequisites
| Environment | Requirement |
|-------------|-------------|
| **Local** | `npm run dev` from repo root (starts API, Python quant, and Next.js) |
| **Production** | `QUANT_SERVICE_URL` on Vercel pointing to a deployed quant engine (e.g. Render `quantdesk-quant`) |

The header badge shows **ENGINE ONLINE** when `/api/quant/health` succeeds.

---

## 1. Engine status & model validation

On load, Quant Lab checks the Python engine and runs a **Black–Scholes vs Monte Carlo benchmark**.

| Badge | Meaning |
|-------|---------|
| **ENGINE ONLINE** | Quant service reachable |
| **ENGINE OFFLINE** | Service down or `QUANT_SERVICE_URL` missing |
| **MODEL AGREEMENT X%** | MC vs BS relative error on standard call/put; target **&lt; 1%** |

**API:** `GET /health`, `GET /validate-models`

---

## 2. Predictions Hub (Algorithms + ML)

Run a full prediction stack on any symbol using **1 year of daily OHLCV** from the market API.

### Inputs

- **Symbol** — e.g. `AAPL`, `MSFT`
- **Forecast horizon** — 1, 3, 5, 7, or 10 days

### Algorithm signals (rule-based)

| Indicator | Signal logic |
|-----------|--------------|
| **RSI** | Overbought / oversold thresholds |
| **SMA** | 20 vs 50-day cross |
| **MACD** | Histogram direction |
| **Bollinger Bands** | Price vs upper/lower band |

Produces an **algo composite** (e.g. `strong_buy`, `neutral`, `sell`).

### Machine learning models

| Model | Task | Metrics |
|-------|------|---------|
| **Ridge regression** | Next-day return → multi-day price path | Holdout MAPE |
| **Random Forest** | Direction (up/down) | Holdout accuracy |
| **Gradient Boosting** | Direction (up/down) | Holdout accuracy |

Features: 1/5/10-day returns, RSI, SMA ratio, 20-day vol, momentum.

### Outputs

- **Spot price** and **N-day forecast** with % change
- **ML direction** — bullish / bearish / neutral
- **Ensemble signal** — blends ML + algorithm votes with confidence %
- **Historical + forecast chart** (solid = history, dashed = forecast)
- **Daily price path** chips (D+1 … D+N from Ridge)
- **All models & signals** table (ALGO vs ML tags)
- **Holdout metrics** per ML model

**API:** `POST /predict-suite`

---

## 3. Options · Black–Scholes + Greeks + IV

European options pricer using **SciPy** closed-form Black–Scholes.

### Inputs

| Field | Description |
|-------|-------------|
| **S** | Spot price |
| **K** | Strike |
| **T** | Time to expiry (years) |
| **r** | Risk-free rate |
| **σ** | Volatility |
| **Type** | Call or put |
| **Mkt price** | Observed option price (for implied vol) |

### Outputs

- **Price**, **Δ**, **Γ**, **Θ**, **ν** (delta, gamma, theta, vega)
- **Implied volatility (IV %)** — solved from market price

**API:** `POST /price`, `POST /implied-volatility`

---

## 4. Monte Carlo · Antithetic variates

Compares **80,000-path antithetic Monte Carlo** European option price to Black–Scholes on the same inputs.

| Output | Description |
|--------|-------------|
| **MC Price** | Simulated fair value |
| **BS Price** | Closed-form reference |
| **Rel. error** | % difference MC vs BS |
| **Grade** | Accuracy label (A/B/C) |
| **95% CI** | Confidence interval (API only) |

Run via **RUN PRICING** — MC runs alongside BS in one click.

**API:** `POST /monte-carlo`

---

## 5. Strategy backtest · Pro metrics

Backtests a strategy on **1 year of daily closes** for the chosen symbol.

### Strategies

| Strategy | Description |
|----------|-------------|
| **SMA Cross (20/50)** | Long when short SMA &gt; long SMA |
| **RSI (30/70)** | Mean-reversion on RSI extremes |
| **Momentum** | 20-day price momentum |
| **Buy & Hold** | Baseline benchmark |

### Metrics

| Metric | Description |
|--------|-------------|
| **Return** | Total return % |
| **Sharpe** | Risk-adjusted return (annualized) |
| **Sortino** | Downside-adjusted Sharpe |
| **Calmar** | Return / max drawdown |
| **Max DD** | Maximum drawdown % |
| **VaR 95** | 1-day 95% value at risk |
| **CVaR 95** | Expected shortfall beyond VaR |
| **Win rate** | % of winning trades |
| **Trades** | Number of round trips |

Includes an **equity curve** chart.

**API:** `POST /backtest`

---

## 6. API endpoints (Python engine)

All proxied through Next.js at `/api/quant/<path>`.

| Method | Path | Used in UI |
|--------|------|------------|
| `GET` | `/health` | Engine status |
| `GET` | `/validate-models` | Model agreement badge |
| `POST` | `/predict-suite` | Predictions Hub |
| `POST` | `/price` | Options pricer |
| `POST` | `/implied-volatility` | IV solver |
| `POST` | `/monte-carlo` | MC comparison |
| `POST` | `/backtest` | Strategy backtest |
| `POST` | `/correlation` | *(API only)* |
| `POST` | `/portfolio-var` | *(API only)* |
| `POST` | `/vol-surface` | *(API only)* |

### Example (local)

```bash
curl http://127.0.0.1:8000/health

curl -X POST http://127.0.0.1:8000/price \
  -H "Content-Type: application/json" \
  -d '{"S":100,"K":100,"T":0.5,"sigma":0.25,"type":"call"}'
```

Via Next.js proxy:

```bash
curl http://localhost:3000/api/quant/health
```

---

## Architecture

```
Browser (/quant-lab)
    ↓ fetch /api/quant/*
Next.js API route (frontend/app/api/quant/[...path]/route.ts)
    ↓ QUANT_SERVICE_URL
Python FastAPI (quant-service:8000)
    ↓
quant_engine/  — pricing, monte_carlo, backtest, ml_predict, risk
```

---

## Deployment

| Layer | Where |
|-------|-------|
| **UI** | Vercel (`frontend/`) |
| **Quant engine** | Render `quantdesk-quant` or local via `npm run dev` |

1. Deploy [Render Blueprint](https://dashboard.render.com/blueprint/new?repo=https://github.com/jenish2214/Blogloggy) (`quantdesk-quant` service).
2. Set `QUANT_SERVICE_URL=https://quantdesk-quant.onrender.com` on Vercel.
3. Redeploy frontend.

See also: [`docs/RENDER.md`](./RENDER.md), [`quant-service/README.md`](../quant-service/README.md).

---

## Disclaimer

Quant Lab measures **model consistency** (e.g. BS vs MC agreement) and **historical backtest performance**. Past results do not predict future returns. Paper trading only — not financial advice.
