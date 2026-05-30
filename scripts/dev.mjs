#!/usr/bin/env node
/**
 * One command: npm run dev
 * - Installs missing Node/Python deps automatically
 * - Starts backend (:4000), quant-service (:8000), Next.js (:3000)
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";
const npm = isWin ? "npm.cmd" : "npm";
const npx = isWin ? "npx.cmd" : "npx";

function run(cmd, args, cwd = repoRoot) {
  const res = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: isWin });
  if (res.status !== 0) {
    console.error(`[dev] Command failed: ${cmd} ${args.join(" ")}`);
    process.exit(res.status ?? 1);
  }
}

function ensureNodeModules(dir, label) {
  if (!existsSync(join(dir, "node_modules"))) {
    console.log(`[dev] Installing ${label}…`);
    run(npm, ["install"], dir);
  }
}

function ensureEnvFile(target, example) {
  if (existsSync(target) || !existsSync(example)) return;
  try {
    copyFileSync(example, target);
    console.log(`[dev] Created ${target.replace(repoRoot, ".")}`);
  } catch {
    /* already exists */
  }
}

function ensureQuantServiceUrl() {
  const envLocal = join(repoRoot, "frontend", ".env.local");
  const line = "QUANT_SERVICE_URL=http://127.0.0.1:8000";
  if (!existsSync(envLocal)) {
    writeFileSync(envLocal, `${line}\n`, "utf8");
    console.log("[dev] Created frontend/.env.local with QUANT_SERVICE_URL");
    return;
  }
  const text = readFileSync(envLocal, "utf8");
  if (!/^QUANT_SERVICE_URL=/m.test(text)) {
    writeFileSync(envLocal, `${text.trimEnd()}\n${line}\n`, "utf8");
    console.log("[dev] Added QUANT_SERVICE_URL to frontend/.env.local");
  }
}

console.log("[dev] Preparing QuantDesk (one command — no separate setup)…\n");

ensureNodeModules(repoRoot, "root tooling");
ensureNodeModules(join(repoRoot, "backend"), "backend");
ensureNodeModules(join(repoRoot, "frontend"), "frontend");

ensureEnvFile(join(repoRoot, "backend", ".env"), join(repoRoot, "backend", ".env.example"));
ensureEnvFile(join(repoRoot, "frontend", ".env.local"), join(repoRoot, "frontend", ".env.example"));
ensureQuantServiceUrl();

const quantVenv = join(repoRoot, "quant-service", ".venv");
const quantUvicorn = isWin
  ? join(quantVenv, "Scripts", "uvicorn.exe")
  : join(quantVenv, "bin", "uvicorn");
if (!existsSync(quantUvicorn)) {
  console.log("[dev] Setting up Python quant-service (first run)…");
  run("node", ["scripts/setup-quant.mjs"]);
}

console.log("\n[dev] Starting all services:\n  API  → http://localhost:4000\n  Quant → http://127.0.0.1:8000\n  Web  → http://localhost:3000\n");

const webCmd =
  `${npx} wait-on -m GET http://localhost:4000/api/health http://127.0.0.1:8000/health -t 120000 && ${npm} run dev:next --prefix frontend`;

const child = spawn(
  npx,
  [
    "concurrently",
    "-k",
    "-n",
    "api,quant,web",
    "-c",
    "blue,magenta,green",
    `${npm} run dev --prefix backend`,
    "node scripts/dev-quant.mjs",
    webCmd,
  ],
  { cwd: repoRoot, stdio: "inherit", shell: isWin }
);

child.on("error", (err) => {
  console.error("[dev] Failed to start:", err.message);
  process.exit(1);
});

child.on("exit", (code) => process.exit(code ?? 0));

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
