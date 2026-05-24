# QuantDesk — Professional Paper Trading Platform

> Trade like a quant. Zero capital at risk.

A full-stack paper trading platform inspired by Jane Street — professional dark terminal UI, real-time market data, options chain, Black-Scholes pricing, and quantitative research tools.

---

## ⚠️ Disclaimer

**PAPER TRADING ONLY.** All trades use virtual $100,000. This platform is for educational and demonstration purposes only. Not financial advice. Not affiliated with any real brokerage.

---

## 🏗 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 App Router, TypeScript, Zustand |
| **Backend API** | Express.js + TypeScript (port 4000) |
| **Python Quant** | FastAPI + Black-Scholes, Monte Carlo (port 8000) |
| **Market Data** | Yahoo Finance (stocks), CoinGecko (crypto) |
| **State** | Zustand + localStorage (portfolio persists) |
| **Production ref** | C++ HFT core, Rust market data layer |

---

## 🚀 Quick Start

**Production:** [https://algo-street.vercel.app](https://algo-street.vercel.app)

```bash
# One-time setup (Node deps + Python venv + .env files)
npm run setup

# Start Express API (:4000), Python quant (:8000), and Next.js (:3000)
npm run dev
```

Then open http://localhost:3000 — **Quant Lab** at `/quant-lab` works automatically (uses `QUANT_SERVICE_URL=http://localhost:8000` from `frontend/.env.local`).

### Docker (full stack)

```bash
cp .env.docker.example .env.docker
npm run docker:up
# → http://localhost:3000 (web), :4000 (API), :8000 (quant)
```

See [`docs/DOCKER.md`](docs/DOCKER.md).

### Python Quant Service

Started automatically by `npm run dev`. To run it alone:

```bash
npm run dev:quant
# or: npm run setup:quant   # venv + pip install only
```

Open **Quant Lab** at http://localhost:3000/quant-lab (`QUANT_SERVICE_URL` is set in `frontend/.env.example`).

---

## 📄 Pages

| Page | URL | Description |
|---|---|---|
| **Landing** | `/` | Platform overview, live ticker, market indices |
| **Markets** | `/markets` | Real-time stocks, crypto, top movers — sortable table |
| **Trade** | `/trade` | Order terminal — buy/sell stocks + crypto, live chart |
| **Portfolio** | `/portfolio` | Holdings, P&L, allocation, trade history |
| **Options** | `/options` | Live options chain + Black-Scholes calculator |
| **Research** | `/research` | Backtest, Sharpe ratio, max drawdown, equity curve |

---

## 🔌 API Endpoints

### Market Data (`/api/market`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/market/quotes?symbols=AAPL,BTC-USD` | Batch quote fetch |
| GET | `/api/market/chart/:symbol?range=1d&interval=5m` | OHLCV candles |
| GET | `/api/market/crypto` | Top 20 crypto (CoinGecko) |
| GET | `/api/market/indices` | S&P 500, Dow, Nasdaq, VIX, Gold, Oil, BTC |
| GET | `/api/market/movers` | Top gainers / losers / most active |
| GET | `/api/market/search?q=apple` | Symbol search |

### Trading Engine (`/api/trading`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/trading/options-chain/:symbol` | Live options chain from Yahoo Finance |
| GET | `/api/trading/options-chain/:symbol/:expiry` | Specific expiry chain |
| POST | `/api/trading/price-option` | Black-Scholes + Greeks |
| GET | `/api/trading/backtest-simple?symbol=AAPL&range=1y` | Buy-and-hold backtest |
| GET | `/api/trading/volatility/:symbol` | Historical volatility 30d |

### Python Quant Service (`localhost:8000`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/price` | Full Black-Scholes with all Greeks |
| POST | `/implied-volatility` | Newton-Raphson IV solver |
| POST | `/monte-carlo` | Monte Carlo option pricing |
| POST | `/vol-surface` | Parametric volatility surface |
| POST | `/backtest` | Strategy backtest (buy-hold, SMA cross, RSI) |

### API Management (`/api`)

| Endpoint | Description |
|---|---|
| `GET /api/health` | Source health + circuit breaker states |
| `GET /api/metrics?format=html` | Live metrics dashboard |

---

## 🏛 Architecture

```
Request → Next.js Client (Zustand portfolio state)
           ↓
        Backend (Express :4000)
           ├── /api/market → Yahoo Finance API (30s cache)
           ├── /api/trading → Options + Backtest endpoints
           ├── /api/health + /api/metrics
           └── API Manager Layer (circuit breaker, retry, rate limit)

Python Service (:8000)
  └── FastAPI → Black-Scholes, Monte Carlo, IV solver, backtest engine

Portfolio State: Zustand + localStorage (client-side, zero server dependency)
```

---

## 💰 Portfolio Engine

- Starts with **$100,000 virtual capital**
- Supports **market orders** and **limit orders**
- **Buy/Sell** stocks, ETFs, and crypto
- **Persistent** across browser sessions (localStorage)
- Real-time P&L updates with live price polling
- Full **trade history** with order details

---

## 🔑 Environment Variables

**Backend (`.env`)**
```
PORT=4000
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
NEWS_API_KEY=          # optional
LOG_LEVEL=info
```

**Frontend (`frontend/.env.local`)** — copy from `frontend/.env.example`

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE=http://localhost:4000
```

### Vercel deployment

The Next.js app lives in **`frontend/`** (build logs show `/vercel/path0/frontend/`). In the Vercel dashboard (**Settings → General**), set:

| Setting | Value |
|---------|--------|
| **Root Directory** | `frontend` |
| Framework Preset | Next.js |
| Build Command | `npm run build` (default) |
| Output Directory | `.next` (default) |

The repo root [`vercel.json`](vercel.json) already sets `"rootDirectory": "frontend"`. If the dashboard Root Directory is empty or `.`, builds will fail or deploy the wrong folder.

In **Settings → Environment Variables**, add the same `NEXT_PUBLIC_*` values from `frontend/.env.example` for **Production**, **Preview**, and **Development** (build inlines `NEXT_PUBLIC_` vars). Get URL and anon key from [Supabase → Project Settings → API](https://supabase.com/dashboard/project/_/settings/api).

Set `NEXT_PUBLIC_SITE_URL` to **`https://algo-street.vercel.app`** (production) so OAuth redirects work. In [Supabase → Auth → URL configuration](https://supabase.com/dashboard/project/_/auth/url-configuration), set Site URL and redirect URL `https://algo-street.vercel.app/auth/callback`. **Redeploy** after changing env vars or root directory.

### Render (optional backend)

Deploy API + quant service via Blueprint [`render.yaml`](render.yaml):

**https://dashboard.render.com/blueprint/new?repo=https://github.com/jenish2214/Blogloggy**

Allowlist Render outbound IPs (`74.220.48.0/24`, `74.220.56.0/24`) where required.

**Important:** Render `quantdesk-api` only serves `/api/market` and `/api/trading`. Routes like `/api/wealth/books` are on **Vercel**. See [`docs/RENDER.md`](docs/RENDER.md) if you see `{"error":"Endpoint not found"}`.

**Operations (deploy, security, incidents):** [`docs/OPERATIONS.md`](docs/OPERATIONS.md)

---

Built by **BSJ Infotech** · [hello@bsjinfotech.com](mailto:hello@bsjinfotech.com)
