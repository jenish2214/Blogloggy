import { Router } from "express";
import axios from "axios";

const router = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

const axiosJ = axios.create({ timeout: 8000, headers: { "User-Agent": "QuantDesk/1.0" } });

function fmt(n: number | null | undefined, dec = 2) {
  if (n == null || isNaN(n as number)) return null;
  return parseFloat((n as number).toFixed(dec));
}

// Simple in-process cache (60 s for stocks, 30 s for crypto)
const cache = new Map<string, { data: unknown; expiresAt: number }>();
function fromCache<T>(key: string): T | null {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.data as T;
  return null;
}
function toCache(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// ── GET /api/market/quotes?symbols=AAPL,TSLA,BTC-USD ─────────────────────────
router.get("/quotes", async (req, res) => {
  const raw = String(req.query.symbols ?? "AAPL,TSLA,MSFT,AMZN,NVDA,GOOGL,META,BTC-USD,ETH-USD");
  const symbols = raw.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 30);

  const key = `quotes:${symbols.join(",")}`;
  const cached = fromCache<unknown[]>(key);
  if (cached) return res.json({ quotes: cached, cached: true });

  const results: unknown[] = [];

  // Batch Yahoo Finance via yf2
  await Promise.allSettled(
    symbols.map(async (sym) => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`;
        const { data } = await axiosJ.get(url);
        const q = data?.chart?.result?.[0];
        if (!q) return;
        const meta = q.meta;
        const prev = meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPreviousClose;
        const price = meta.regularMarketPrice ?? meta.chartPreviousClose;
        const change = price - prev;
        const changePct = (change / prev) * 100;
        results.push({
          symbol: sym,
          name: meta.shortName ?? meta.longName ?? sym,
          price: fmt(price),
          change: fmt(change),
          changePct: fmt(changePct),
          open: fmt(meta.regularMarketOpen),
          high: fmt(meta.regularMarketDayHigh),
          low: fmt(meta.regularMarketDayLow),
          volume: meta.regularMarketVolume ?? null,
          mktCap: meta.marketCap ?? null,
          currency: meta.currency ?? "USD",
          exchange: meta.exchangeName ?? "",
          type: sym.endsWith("-USD") ? "crypto" : "stock",
          updatedAt: new Date().toISOString(),
        });
      } catch {
        results.push({ symbol: sym, error: "fetch_failed" });
      }
    })
  );

  toCache(key, results, 30_000);
  res.json({ quotes: results, cached: false });
});

// ── GET /api/market/chart/:symbol?range=1d&interval=5m ───────────────────────
router.get("/chart/:symbol", async (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  const range = String(req.query.range ?? "1d");
  const interval = String(req.query.interval ?? "5m");

  const key = `chart:${sym}:${range}:${interval}`;
  const cached = fromCache<unknown>(key);
  if (cached) return res.json({ chart: cached, symbol: sym, cached: true });

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=${interval}&range=${range}`;
    const { data } = await axiosJ.get(url);
    const result = data?.chart?.result?.[0];
    if (!result) return res.status(404).json({ error: "symbol_not_found" });

    const times: number[] = result.timestamp ?? [];
    const closes: number[] = result.indicators?.quote?.[0]?.close ?? [];
    const opens: number[] = result.indicators?.quote?.[0]?.open ?? [];
    const highs: number[] = result.indicators?.quote?.[0]?.high ?? [];
    const lows: number[] = result.indicators?.quote?.[0]?.low ?? [];
    const vols: number[] = result.indicators?.quote?.[0]?.volume ?? [];

    const candles = times
      .map((t, i) => ({
        time: t,
        open: fmt(opens[i]),
        high: fmt(highs[i]),
        low: fmt(lows[i]),
        close: fmt(closes[i]),
        volume: vols[i] ?? null,
      }))
      .filter((c) => c.close != null);

    const meta = result.meta;
    const chart = {
      symbol: sym,
      name: meta.shortName ?? sym,
      currency: meta.currency ?? "USD",
      exchange: meta.exchangeName ?? "",
      currentPrice: fmt(meta.regularMarketPrice),
      previousClose: fmt(meta.chartPreviousClose ?? meta.previousClose),
      candles,
    };

    const ttl = range === "1d" ? 30_000 : range === "5d" ? 120_000 : 600_000;
    toCache(key, chart, ttl);
    res.json({ chart, symbol: sym, cached: false });
  } catch (err) {
    res.status(500).json({ error: "chart_fetch_failed", detail: (err as Error).message });
  }
});

// ── GET /api/market/crypto ────────────────────────────────────────────────────
// Uses CoinGecko free API
router.get("/crypto", async (_req, res) => {
  const key = "crypto:top20";
  const cached = fromCache<unknown[]>(key);
  if (cached) return res.json({ coins: cached, cached: true });

  try {
    const { data } = await axiosJ.get(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=1h,24h,7d"
    );
    const coins = data.map((c: Record<string, unknown>) => ({
      symbol: String(c.symbol ?? "").toUpperCase(),
      name: c.name,
      coingeckoId: c.id,
      price: fmt(c.current_price as number),
      change1h: fmt(c.price_change_percentage_1h_in_currency as number),
      change24h: fmt(c.price_change_percentage_24h as number),
      change7d: fmt(c.price_change_percentage_7d_in_currency as number),
      marketCap: c.market_cap,
      volume24h: c.total_volume,
      circulatingSupply: c.circulating_supply,
      ath: fmt(c.ath as number),
      image: c.image,
      updatedAt: new Date().toISOString(),
    }));
    toCache(key, coins, 60_000);
    res.json({ coins, cached: false });
  } catch (err) {
    res.status(500).json({ error: "crypto_fetch_failed", detail: (err as Error).message });
  }
});

// ── GET /api/market/search?q=apple ───────────────────────────────────────────
router.get("/search", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (q.length < 1) return res.json({ results: [] });

  try {
    const { data } = await axiosJ.get(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`
    );
    const quotes = (data?.quotes ?? [])
      .filter((r: Record<string, unknown>) => r.quoteType === "EQUITY" || r.quoteType === "CRYPTOCURRENCY")
      .slice(0, 8)
      .map((r: Record<string, unknown>) => ({
        symbol: r.symbol,
        name: r.longname ?? r.shortname,
        exchange: r.exchange,
        type: r.quoteType === "CRYPTOCURRENCY" ? "crypto" : "stock",
      }));
    res.json({ results: quotes });
  } catch {
    res.json({ results: [] });
  }
});

// ── GET /api/market/movers ────────────────────────────────────────────────────
router.get("/movers", async (_req, res) => {
  const key = "movers";
  const cached = fromCache<unknown>(key);
  if (cached) return res.json({ ...cached as object, cached: true });

  const GAINERS_SYMS = ["NVDA", "TSLA", "PLTR", "SMCI", "AMD", "MSTR", "COIN", "SOFI"];
  const LOSERS_SYMS = ["INTC", "BA", "WBA", "PFE", "PARA", "MPW", "LUMN", "T"];
  const ACTIVE_SYMS = ["AAPL", "AMZN", "META", "MSFT", "GOOGL", "TSLA", "NVDA", "SPY"];

  const fetchQuote = async (sym: string) => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`;
      const { data } = await axiosJ.get(url);
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta) return null;
      const prev = meta.chartPreviousClose ?? meta.previousClose;
      const price = meta.regularMarketPrice;
      const changePct = ((price - prev) / prev) * 100;
      return {
        symbol: sym,
        name: meta.shortName ?? sym,
        price: fmt(price),
        changePct: fmt(changePct),
        volume: meta.regularMarketVolume ?? 0,
      };
    } catch { return null; }
  };

  const [g, l, a] = await Promise.all([
    Promise.allSettled(GAINERS_SYMS.map(fetchQuote)),
    Promise.allSettled(LOSERS_SYMS.map(fetchQuote)),
    Promise.allSettled(ACTIVE_SYMS.map(fetchQuote)),
  ]);

  const clean = (arr: PromiseSettledResult<unknown>[]) =>
    arr.filter((r) => r.status === "fulfilled" && r.value).map((r) => (r as PromiseFulfilledResult<unknown>).value);

  const movers = {
    gainers: clean(g).sort((a: unknown, b: unknown) => ((b as Record<string,number>).changePct ?? 0) - ((a as Record<string,number>).changePct ?? 0)),
    losers: clean(l).sort((a: unknown, b: unknown) => ((a as Record<string,number>).changePct ?? 0) - ((b as Record<string,number>).changePct ?? 0)),
    mostActive: clean(a).sort((a: unknown, b: unknown) => ((b as Record<string,number>).volume ?? 0) - ((a as Record<string,number>).volume ?? 0)),
  };

  toCache("movers", movers, 120_000);
  res.json({ ...movers, cached: false });
});

// ── GET /api/market/indices ───────────────────────────────────────────────────
router.get("/indices", async (_req, res) => {
  const key = "indices";
  const cached = fromCache<unknown>(key);
  if (cached) return res.json({ indices: cached, cached: true });

  const INDICES = ["^GSPC", "^DJI", "^IXIC", "^RUT", "^VIX", "GC=F", "CL=F", "BTC-USD"];
  const NAMES: Record<string, string> = {
    "^GSPC": "S&P 500", "^DJI": "Dow Jones", "^IXIC": "Nasdaq", "^RUT": "Russell 2000",
    "^VIX": "VIX", "GC=F": "Gold", "CL=F": "Crude Oil", "BTC-USD": "Bitcoin",
  };

  const results = await Promise.allSettled(
    INDICES.map(async (sym) => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`;
      const { data } = await axiosJ.get(url);
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta) return null;
      const prev = meta.chartPreviousClose ?? meta.previousClose;
      const price = meta.regularMarketPrice;
      const change = price - prev;
      const changePct = (change / prev) * 100;
      return { symbol: sym, name: NAMES[sym] ?? sym, price: fmt(price), change: fmt(change), changePct: fmt(changePct), currency: meta.currency };
    })
  );

  const indices = results.filter((r) => r.status === "fulfilled" && r.value).map((r) => (r as PromiseFulfilledResult<unknown>).value);
  toCache(key, indices, 60_000);
  res.json({ indices, cached: false });
});

export default router;
