# Docker

Run QuantDesk (Next.js + Express + optional Python quant service) with Docker Compose.

## Install Docker (macOS)

If you see `docker: command not found`:

1. Install **Docker Desktop**: https://docs.docker.com/desktop/setup/install/mac-install/
   - Apple Silicon: download the **Apple Chip** build.
2. Open **Docker** from Applications and wait until the whale icon in the menu bar is steady (engine running).
3. Verify in Terminal:
   ```bash
   docker --version
   docker compose version
   ```
4. Then from the repo root:
   ```bash
   npm run docker:up
   ```

**Without Docker:** use `npm run dev` (backend + frontend on your machine).

## Quick start

```bash
cp .env.docker.example .env.docker
# Edit .env.docker — set Supabase URL + anon key for real auth

docker compose up --build
```

| Service | URL | Container |
|---------|-----|-----------|
| **Website** | http://localhost:3000 | `quantdesk-web` |
| **Express API** | http://localhost:4000/api/health | `quantdesk-api` |
| **Python quant** | http://localhost:8000/health | `quantdesk-quant` |

Stop: `docker compose down`

## Build individual images

```bash
docker build -t quantdesk-web ./frontend
docker build -t quantdesk-api ./backend
docker build -t quantdesk-quant ./quant-service
```

Frontend build args (baked at build time for `NEXT_PUBLIC_*`):

```bash
docker build -t quantdesk-web ./frontend \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key \
  --build-arg NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Architecture notes

- **Wealth, portfolio, wallet, auth** — Next.js API routes inside the `web` container (same as Vercel).
- **Market / trading helpers** — Express `api` service (`/api/market`, `/api/trading`). The browser calls same-origin Next routes by default; Express is for optional local/market proxy use.
- **Quant Lab** — Python `quant` service; Next.js proxies via `QUANT_SERVICE_URL=http://quant:8000` (set automatically in Compose).

## Production hosting

- **Vercel** remains the recommended host for the Next.js app (see [`OPERATIONS.md`](OPERATIONS.md)).
- Docker suits VPS, Railway, Fly.io, or internal demos. Set `NEXT_PUBLIC_SITE_URL` to your public URL and add that origin to Supabase Auth + `CORS_ORIGINS`.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails on frontend | Ensure `package-lock.json` exists; run `npm install` in `frontend/` once |
| Demo mode banner | Set real Supabase vars in `.env.docker` and rebuild `web` |
| API 401 / no sync | Sign in; confirm Supabase redirect URLs include your public URL |
| Port in use | Change host ports in `docker-compose.yml` (e.g. `"3001:3000"`) |
