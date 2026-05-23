# Render deployment (backend / quant-service)

**Frontend (auth, wealth, portfolio):** [https://algo-street.vercel.app](https://algo-street.vercel.app) — Vercel `frontend/`, **not** Render.

Render hosts optional **market + trading** APIs only.

## Services (from `render.yaml`)

| Service | Folder | Base URL | Implements |
|---------|--------|----------|------------|
| `quantdesk-api` | `backend/` | `https://quantdesk-api.onrender.com` | `GET /api/health`, `/api/market/*`, `/api/trading/*` |
| `quantdesk-quant` | `quant-service/` | `https://quantdesk-quant.onrender.com` | `GET /health`, `POST /price`, `/backtest`, etc. (no `/api` prefix) |

## `{"error":"Endpoint not found"}` on Render

That JSON comes from the **Express** app (`backend/src/middleware/errorHandler.ts`). It means the path does **not** exist on `quantdesk-api`.

**Common mistakes:**

| Request | Result |
|---------|--------|
| `GET https://quantdesk-api.onrender.com/` (old deploy) | 404 — use `GET /api/health` or redeploy latest Blueprint |
| `GET https://quantdesk-api.onrender.com/api/wealth/books` | **404** — wealth API lives on **Vercel** (`frontend/app/api/wealth/`) |
| `GET https://quantdesk-quant.onrender.com/api/health` | **404** — Python health is `GET /health` |

**Production app** should call `https://algo-street.vercel.app/api/...` (same origin). Do **not** set `NEXT_PUBLIC_API_BASE` on Vercel unless you intentionally proxy market/trading to Render.

## Deploy with Blueprint

1. Push [`render.yaml`](../render.yaml) to `main` on GitHub.
2. Open: **https://dashboard.render.com/blueprint/new?repo=https://github.com/jenish2214/Blogloggy**
3. Connect GitHub → **Apply**
4. Set secrets on `quantdesk-api`: `MASSIVE_API_KEY`, `FINNHUB_API_KEY`, etc.
5. Verify:
   - `curl https://quantdesk-api.onrender.com/api/health` → JSON with `apiManager: true`
   - `curl https://quantdesk-quant.onrender.com/health` → Python engine JSON

If `/api/health` returns `{"port":5000,...}` or HTML errors, the service is an **old/wrong deploy** — delete the service in Render and re-apply the Blueprint.

## Render outbound IPs (Supabase allowlist)

- `74.220.48.0/24`
- `74.220.56.0/24`

[Render outbound IP docs](https://render.com/docs/outbound-ip-addresses)

## MCP (optional)

Configure Render MCP in Cursor with an API key from [Render dashboard](https://dashboard.render.com/u/settings#api-keys), then `list_services()` to monitor deploys.
