# QuantDesk — Operations workflow

Production: **https://algo-street.vercel.app** (Vercel). Optional market API: Render (`render.yaml`).

## Deploy checklist (Vercel)

1. **Root directory:** `frontend` (see root `vercel.json`).
2. **Enable system env vars:** Project → **Settings → Environment Variables** → check [**Enable access to System Environment Variables**](https://vercel.com/docs/environment-variables/system-environment-variables). This exposes `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, etc. at build and runtime so `NEXT_PUBLIC_SITE_URL` can be inferred automatically.
3. **Environment variables** (Production + Preview + Development), then **Redeploy**:
   - `NEXT_PUBLIC_SUPABASE_URL` — **required** (Demo mode until set)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — **required**
   - `NEXT_PUBLIC_SITE_URL` — **optional on Vercel** if system vars are enabled (defaults to production/preview URL)
4. **Supabase Auth → URL configuration:**
   - Site URL: your production URL (e.g. `https://jame-street.vercel.app`)
   - Redirect: `https://<your-domain>/auth/callback` (add preview URLs if testing branches)
5. Confirm build succeeds and login works.

## Database security

1. Apply migrations: `supabase db push` (or run SQL in Supabase SQL editor).
2. Confirm **RLS enabled** on user tables (`profiles`, `portfolios`, `positions`, `orders`, `watchlist`, `wealth_clients`, etc.).
3. Never put the **service role** key in the frontend or Vercel public env vars.
4. Use only `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the browser; server routes use the user session + RLS.

## What runs where

| Surface | Host | Routes |
|--------|------|--------|
| App + wealth APIs | Vercel (`frontend/`) | `/api/wealth`, `/api/portfolio`, `/api/wallet`, auth |
| Market/trading API (optional) | Render Express | `/api/health`, `/api/market/*`, `/api/trading/*` |

On Vercel, leave `NEXT_PUBLIC_API_BASE` unset so the browser calls same-origin API routes.

## Incidents

| Symptom | Likely cause | Fix |
|--------|----------------|-----|
| Build fails on `/signup` | Missing Supabase at build | Set env vars; use dynamic auth pages on `main` |
| “Demo mode” banner | Placeholder/missing Supabase env | Set real URL + anon key; redeploy |
| `{"error":"Endpoint not found"}` on Render | Wrong host/path | Wealth APIs are on Vercel, not Render |
| 401 on portfolio APIs | Not signed in | Expected for guests; sign in or use local demo |

## Local development

```bash
cd frontend && cp .env.example .env.local
# Fill Supabase vars, then:
npm run dev
```

## Docker

```bash
cp .env.docker.example .env.docker
docker compose up --build
```

Details: [`DOCKER.md`](DOCKER.md).

Optional: `NEXT_PUBLIC_API_BASE=http://localhost:5000` with `backend` running for market routes only.

## Privacy & compliance

- Paper trading only; no real brokerage.
- `/privacy` describes data handling.
- Security headers are set in `frontend/next.config.js`.
