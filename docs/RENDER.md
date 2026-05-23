# QuantDesk — Render deployment

**Frontend stays on Vercel:** [https://algo-street.vercel.app](https://algo-street.vercel.app)

Render hosts optional backend services from this monorepo:

| Service | Path | URL (after deploy) |
|---------|------|---------------------|
| `quantdesk-api` | `backend/` | `https://quantdesk-api.onrender.com` |
| `quantdesk-quant` | `quant-service/` | `https://quantdesk-quant.onrender.com` |

## Deploy with Blueprint

1. Commit and push [`render.yaml`](../render.yaml) to `main`
2. Open the Blueprint deeplink (replace if repo URL differs):

   **https://dashboard.render.com/blueprint/new?repo=https://github.com/jenish2214/Blogloggy**

3. Connect GitHub if prompted → **Apply**
4. In Render Dashboard, set secret env vars (`sync: false` in blueprint):
   - `MASSIVE_API_KEY`, `FINNHUB_API_KEY`, etc. on `quantdesk-api`
5. After deploy, optional: set on Vercel:

   ```env
   NEXT_PUBLIC_API_BASE=https://quantdesk-api.onrender.com
   ```

   (Default prod uses same-origin Next.js `app/api/*`; only set this if you want the Express API.)

## Render outbound IPs (allowlist)

If Supabase or another provider requires IP allowlisting for **server** traffic from Render:

- `74.220.48.0/24`
- `74.220.56.0/24`

Confirm in **Dashboard → service → Connect → Outbound**. See [Render outbound IP docs](https://render.com/docs/outbound-ip-addresses).

## MCP / CLI

Render MCP requires an API key in Cursor (`~/.cursor/mcp.json`). Get a key from [Render API keys](https://dashboard.render.com/u/settings#api-keys).

Validate blueprint locally (optional):

```bash
brew install render
export RENDER_API_KEY="rnd_..."
render blueprints validate render.yaml
```
