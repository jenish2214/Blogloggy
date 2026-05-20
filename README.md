# Research Digest Platform

A research-grade news and papers platform with a polished UI, delayed-loading states, and **free public data only** (no API keys required).

## Highlights

- **News hub** (`/news`) — X-style timeline with **technology**, **AI labs** (Anthropic, OpenAI, DeepMind), **universities**, **research** (arXiv), and **Wikipedia**
- **Research feed** — papers with detail pages
- **Categories, topics, authors, universities** — browse by field, community, or institution
- **Daily digest** — built from live paper abstracts
- **Smart loading** — rotating status messages while APIs load (10–30s first fetch), skeleton UI, **Try again** on errors

## Free data sources

| Source | Type |
|--------|------|
| arXiv, Semantic Scholar, PubMed | Papers |
| MIT, Harvard, Stanford, Oxford, Cambridge RSS | University news |
| Hacker News, TechCrunch, The Verge, Ars Technica, MIT Tech Review | Technology |
| **Anthropic & OpenAI blogs** (public RSS) | AI lab news |
| **Wikipedia API** | Reference articles (AI, ML, universities) |
| DeepMind blog | Research labs |

---

## Run the project — one command

From the **project root** (folder with `package.json`, `frontend/`, `backend/`):

### First-time setup

```bash
cd /path/to/blogloggy

npm run setup
```

Or manually:

```bash
npm install
npm run install:all
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

### Start backend + frontend together

```bash
npm run dev
```

This single command:

1. Starts the **API** on port **4000**
2. Waits until `http://localhost:4000/api/health` is ready
3. Starts the **website** on port **3000**

Open:

| Page | URL |
|------|-----|
| Home | http://localhost:3000 |
| **News** | http://localhost:3000/news |
| Papers | http://localhost:3000/research |
| API health | http://localhost:4000/api/health |

Press `Ctrl+C` to stop both servers.

### Optional: run separately

```bash
npm run dev:backend   # port 4000 only
npm run dev:frontend  # port 3000 only (needs API)
```

---

## Step-by-step (detailed)

### Step 1 — Install Node.js 18+

```bash
node -v   # should be v18 or newer
npm -v
```

### Step 2 — Clone or open the project

```bash
cd /path/to/blogloggy
```

### Step 3 — Install dependencies

```bash
npm install
npm run install:all
```

### Step 4 — Environment files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Defaults work for local development.

### Step 5 — Free port 4000 (if needed)

```bash
lsof -ti:4000 | xargs kill -9
```

### Step 6 — Start everything

```bash
npm run dev
```

### Step 7 — Use the app

- First load can take **10–30 seconds** while RSS, Wikipedia, and paper APIs respond.
- Loading screens show progress messages; use **Try again** if something fails.
- Visit **News** for the combined technology + labs + university + Wikipedia view.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Pages show error / empty | Run `npm run dev` from project root; check http://localhost:4000/api/health |
| Port 4000 in use | `lsof -ti:4000 \| xargs kill -9` then `npm run dev` |
| Frontend no data | Verify `frontend/.env.local`: `NEXT_PUBLIC_API_BASE=http://localhost:4000/api` |
| CORS blocked (e.g. port 3001) | Restart the backend after pulling; in dev, any `http://localhost:*` origin is allowed. Prefer **http://localhost:3000** |
| Slow first load | Normal — free APIs are fetched in parallel and cached on the server |
| One feed empty | Some RSS URLs fail occasionally; other sources still load |
| MIME type / 404 on CSS or JS | Stop all dev servers, then run `npm run dev:clean` from project root (see below) |

### Fix: “MIME type text/html” or 404 on `/_next/static/...`

This usually means the browser asked for CSS/JS but got an HTML error page instead. Common causes:

1. **Stale dev server** — an old `next dev` still running on port 3000 with a broken `.next` folder  
2. **Corrupted cache** — `.next` was deleted while the server was still running  

**Fix (from project root):**

```bash
# Stop anything on 3000 and 4000
lsof -ti:3000,4000 | xargs kill -9 2>/dev/null

# Clean cache and restart
npm run dev:clean
```

Or manually:

```bash
rm -rf frontend/.next frontend/node_modules/.cache
npm run dev
```

Then hard-refresh the browser (**Cmd+Shift+R**). Use only **http://localhost:3000** (not 3001/3002).

---

## API routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/research/news/hub` | Full news hub (spotlight + categories) |
| GET | `/api/research/news?category=technology` | Filtered news list |
| GET | `/api/research/article/:id` | Article detail |
| GET | `/api/research/all` | Papers + news bundle |
| GET | `/api/research/paper/:id` | Paper detail |
| GET | `/api/categories` | Research categories |
| GET | `/api/universities` | University hub |
| GET | `/api/digest` | Daily digest |

---

## Project structure

```
blogloggy/
├── package.json       # npm run dev → both apps
├── backend/           # Express API (port 4000)
├── frontend/          # Next.js UI (port 3000)
└── README.md
```
