#!/usr/bin/env node
/**
 * Create quant-service venv and install Python deps (one-time / setup).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "quant-service");
const venvDir = join(root, ".venv");
const python = process.platform === "win32" ? "python" : "python3";
const venvPython =
  process.platform === "win32"
    ? join(venvDir, "Scripts", "python.exe")
    : join(venvDir, "bin", "python3");
const venvPip =
  process.platform === "win32"
    ? join(venvDir, "Scripts", "pip.exe")
    : join(venvDir, "bin", "pip");

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: "inherit", cwd: root, ...opts });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

if (!existsSync(venvDir)) {
  console.log("[quant] Creating Python virtualenv…");
  run(python, ["-m", "venv", ".venv"], { cwd: root });
}

console.log("[quant] Installing Python dependencies…");
run(venvPip, ["install", "-r", "requirements.txt"]);

console.log("[quant] Setup complete.");
