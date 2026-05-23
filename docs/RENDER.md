# Render deployment (backend / quant-service)

The **Next.js app** is deployed on **Vercel**: [https://algo-street.vercel.app](https://algo-street.vercel.app) (`frontend/`, Root Directory = `frontend`).

Use **Render** only if you deploy the **Express API** (`backend/`) or **Python quant service** (`quant-service/`). Vercel uses different outbound IPs than Render.

## Render outbound IP allowlist

When a Render service calls an external system with IP restrictions (Supabase database, Redis, corporate VPN, etc.), allow these **outbound** CIDR ranges for your Render region:

| CIDR | Range |
|------|--------|
| `74.220.48.0/24` | 74.220.48.0 – 74.220.48.255 |
| `74.220.56.0/24` | 74.220.56.0 – 74.220.56.255 |

These are [Render outbound IPs](https://render.com/docs/outbound-ip-addresses) (Render org `RS-1125`). Ranges can change by region—confirm under **Render Dashboard → your service → Connect → Outbound**.

### Where to add them

| Service | Location |
|---------|----------|
| **Supabase** | Project → **Settings → Database** → Network restrictions / allowlist (if enabled) |
| **Supabase** | Not required for anon-key REST from browser; needed if the **server** connects with a restricted pooler |
| **Other APIs** | Provider firewall / “allowed IPs” for server-side keys used from Render |

**Vercel (frontend)** does not use these IPs. For Vercel outbound IPs, see [Vercel firewall / deployment docs](https://vercel.com/docs).

## Environment variables on Render

### Express (`backend/`)

```env
PORT=4000
NODE_ENV=production
CORS_ORIGINS=https://algo-street.vercel.app,https://blogloggy.vercel.app
```

Add API keys (`MASSIVE_API_KEY`, `FINNHUB_API_KEY`, etc.) as needed.

### Python (`quant-service/`)

```env
# Allow Vercel frontend
# Configure CORS in main.py for https://algo-street.vercel.app
```

## Architecture

```
Browser → Vercel (algo-street.vercel.app) → Next.js app/api/*
Optional: Vercel or browser → Render (Express :4000 / FastAPI :8000)
Render outbound traffic → uses 74.220.48.0/24, 74.220.56.0/24 (allowlist at target)
```

If you rely only on Next.js API routes on Vercel, you do **not** need to deploy `backend/` on Render unless you want a separate API host.
