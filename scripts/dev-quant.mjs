#!/usr/bin/env node
/**
 * Start quant-service (FastAPI) on port 8000 for local dev.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "quant-service");
const venvDir = join(root, ".venv");
const python = process.platform === "win32" ? "python" : "python3";
const uvicorn =
  process.platform === "win32"
    ? join(venvDir, "Scripts", "uvicorn.exe")
    : join(venvDir, "bin", "uvicorn");
const venvPip =
  process.platform === "win32"
    ? join(venvDir, "Scripts", "pip.exe")
    : join(venvDir, "bin", "pip");

function pipInstall() {
  console.log("[quant] Installing Python dependencies…");
  if (existsSync(venvPip)) {
    spawnSync(venvPip, ["install", "-r", "requirements.txt"], { stdio: "inherit", cwd: root });
  } else {
    spawnSync(python, ["-m", "pip", "install", "-r", "requirements.txt"], { stdio: "inherit", cwd: root });
  }
}

if (!existsSync(venvDir)) {
  console.log("[quant] First run — creating venv…");
  spawnSync(python, ["-m", "venv", ".venv"], { stdio: "inherit", cwd: root });
  pipInstall();
} else if (!existsSync(uvicorn)) {
  pipInstall();
}

const child = spawn(
  uvicorn,
  ["main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
  { cwd: root, stdio: "inherit" }
);

child.on("error", (err) => {
  console.error("[quant] Failed to start:", err.message);
  console.error("[quant] Ensure Python 3 is installed, then run npm run dev again.");
  process.exit(1);
});

child.on("exit", (code) => process.exit(code ?? 0));

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
