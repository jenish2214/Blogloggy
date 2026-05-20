import "dotenv/config";
import cors from "cors";
import express from "express";
import categoriesRoutes from "./routes/categories.js";
import digestRoutes from "./routes/digest.js";
import researchRoutes from "./routes/research.js";
import universityRoutes from "./routes/universities.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { securityHeaders } from "./middleware/security.js";

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

const isLocalDevOrigin = (origin: string): boolean =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (!isProduction && isLocalDevOrigin(origin)) return true;
  return false;
}

function corsOrigin(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean | string) => void
): void {
  if (isAllowedOrigin(origin)) {
    callback(null, origin ?? true);
    return;
  }
  callback(null, false);
}

app.use(securityHeaders);
app.use(
  cors({
    origin: corsOrigin,
    methods: ["GET", "HEAD", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept"],
    maxAge: 86400,
  })
);
app.use(express.json({ limit: "512kb" }));
app.use("/api", apiLimiter);

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    dataSources: ["arXiv", "Semantic Scholar", "PubMed", "University RSS"],
    paidApis: false,
  });
});

app.use("/api/categories", categoriesRoutes);
app.use("/api/digest", digestRoutes);
app.use("/api/research", researchRoutes);
app.use("/api/universities", universityRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Research Digest API running on http://localhost:${PORT}`);
});
