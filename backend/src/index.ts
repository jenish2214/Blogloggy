import "dotenv/config";
import cors from "cors";
import express from "express";
import healthRouter from "./routes/health.router.js";
import marketRouter from "./routes/market.router.js";
import tradingRouter from "./routes/trading.router.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { securityHeaders } from "./middleware/security.js";
import { logger } from "./api-manager/logger.js";

const app = express();
const PORT = process.env.PORT ?? 4000;

const allowedOrigins = (
  process.env.CORS_ORIGINS ??
  "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const isProduction = process.env.NODE_ENV === "production";
const isLocalDevOrigin = (origin: string) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (!isProduction && isLocalDevOrigin(origin)) return true;
  return false;
}

app.use(securityHeaders);
app.use(cors({
  origin: (origin, cb) => isAllowedOrigin(origin) ? cb(null, origin ?? true) : cb(null, false),
  methods: ["GET", "HEAD", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Accept", "Authorization"],
  exposedHeaders: ["X-Cache", "X-Latency-Ms"],
  maxAge: 86400,
}));
app.use(express.json({ limit: "1mb" }));
app.use("/api", apiLimiter);

app.use("/api", healthRouter);
app.use("/api/market", marketRouter);
app.use("/api/trading", tradingRouter);

app.get("/", (_req, res) => {
  res.json({
    service: "QuantDesk Express API (Render: quantdesk-api)",
    status: "ok",
    routes: {
      health: "GET /api/health",
      market: "GET /api/market/quotes|chart|crypto|indices|movers|search",
      trading: "GET|POST /api/trading/options-chain|price-option|backtest-simple|volatility|validate",
    },
    note: "Wealth, portfolio, wallet, orders, and auth run on Vercel Next.js at /api/* — not on this service.",
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(Number(PORT), "0.0.0.0", () => {
  logger.info({ msg: "quantdesk_api_started", port: PORT });
  console.log(`QuantDesk API running on http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
  console.log(`Metrics: http://localhost:${PORT}/api/metrics?format=html`);
});
