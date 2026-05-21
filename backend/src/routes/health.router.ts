import { Router } from "express";
import { getApiManager } from "../api-manager/instance.js";
import { logger } from "../api-manager/logger.js";

const router = Router();

router.get("/health", (_req, res) => {
  const manager = getApiManager();
  const health = manager.getHealth();
  res.json({
    ...health,
    dataSources: Object.keys(manager.getRegistry().getAll()),
    paidApis: Boolean(process.env.NEWS_API_KEY),
    apiManager: true,
  });
});

router.get("/metrics", (req, res) => {
  const manager = getApiManager();
  const dashboard = manager.getMetrics();
  const accept = req.headers.accept ?? "";

  if (accept.includes("text/html") || req.query.format === "html") {
    const rows = Object.entries(dashboard.sources)
      .map(([id, m]) => {
        const hitRate =
          m.totalRequests > 0
            ? ((m.cacheHits / m.totalRequests) * 100).toFixed(1)
            : "0";
        const errRate =
          m.totalRequests > 0
            ? ((m.errors / m.totalRequests) * 100).toFixed(1)
            : "0";
        const circuitClass =
          m.circuitState === "CLOSED"
            ? "ok"
            : m.circuitState === "HALF-OPEN"
              ? "warn"
              : "bad";
        return `<tr class="${circuitClass}">
          <td>${id}</td>
          <td>${m.circuitState}</td>
          <td>${hitRate}%</td>
          <td>${Math.round(m.avgLatencyMs)}</td>
          <td>${m.apiCalls}</td>
          <td>${errRate}%</td>
          <td>${m.fallbackUsed}</td>
          <td>${m.staleServed}</td>
        </tr>`;
      })
      .join("");

    const health = manager.getHealth();
    const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta http-equiv="refresh" content="10"/>
<title>API Metrics</title>
<style>
  body{font-family:system-ui,sans-serif;margin:24px;background:#0f172a;color:#e2e8f0}
  h1{font-size:1.5rem}
  .status{padding:8px 14px;border-radius:8px;display:inline-block;margin-bottom:16px}
  .healthy{background:#14532d;color:#86efac}
  .degraded{background:#713f12;color:#fde047}
  .critical{background:#7f1d1d;color:#fca5a5}
  table{width:100%;border-collapse:collapse;font-size:0.85rem}
  th,td{padding:10px;border-bottom:1px solid #334155;text-align:left}
  th{color:#94a3b8}
  tr.ok td:first-child{color:#86efac}
  tr.warn td:first-child{color:#fde047}
  tr.bad td:first-child{color:#fca5a5}
  .totals{margin-top:20px;color:#94a3b8}
</style>
</head><body>
<h1>Blogloggy API Metrics</h1>
<p class="status ${health.status}">System: ${health.status.toUpperCase()} · Uptime: ${health.uptime}s</p>
<table>
<thead><tr>
<th>Source</th><th>Circuit</th><th>Cache hit</th><th>Avg ms</th><th>API calls</th><th>Error rate</th><th>Fallbacks</th><th>Stale</th>
</tr></thead>
<tbody>${rows}</tbody>
</table>
<div class="totals">
  Total requests: ${dashboard.totals.requests} ·
  Cache hits: ${dashboard.totals.cacheHits} ·
  API calls: ${dashboard.totals.apiCalls} ·
  Errors: ${dashboard.totals.errors} ·
  Fallbacks: ${dashboard.totals.fallbackUsed}
</div>
<p class="totals">Auto-refresh 10s · <a href="/api/metrics" style="color:#38bdf8">JSON</a></p>
</body></html>`;
    res.type("html").send(html);
    return;
  }

  res.json(dashboard);
});

export default router;
