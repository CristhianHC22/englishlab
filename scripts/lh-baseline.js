#!/usr/bin/env node
/* Soft Lighthouse baseline — local only, never gates CI.
   Soft floors: performance score ≥ 0.70, LCP ≤ 2500ms (advisory). */
"use strict";

const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

const PORT = 4173;
const OUT = path.join("test-results", "lh.json");
const SCORE_FLOOR = 0.7;
const LCP_MS = 2500;

function waitReady(ms = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(`http://127.0.0.1:${PORT}/`, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - start > ms) reject(new Error("serve timeout"));
        else setTimeout(tick, 250);
      });
    };
    tick();
  });
}

async function main() {
  fs.mkdirSync("test-results", { recursive: true });
  let serve;
  try {
    serve = spawn("npx", ["--yes", "serve", "-l", String(PORT), "."], {
      stdio: "ignore",
      shell: process.platform === "win32",
    });
    await waitReady();
    execSync(
      `npx --yes lighthouse http://127.0.0.1:${PORT} --only-categories=performance --form-factor=mobile --chrome-flags="--headless" --quiet --output=json --output-path=${OUT}`,
      { stdio: "inherit", shell: true }
    );
  } catch (err) {
    console.warn("[perf:lh] advisory run failed:", err.message || err);
    console.warn("[perf:lh] soft — exit 0 (see docs/ESTANDAR.md)");
    process.exit(0);
    return;
  } finally {
    try { serve?.kill(); } catch { /* ignore */ }
  }

  try {
    const raw = JSON.parse(fs.readFileSync(OUT, "utf8"));
    const score = Number(raw?.categories?.performance?.score);
    const lcp = Number(raw?.audits?.["largest-contentful-paint"]?.numericValue);
    console.log(`[perf:lh] score=${score} LCP=${Math.round(lcp)}ms (floors ${SCORE_FLOOR} / ${LCP_MS}ms)`);
    if (!(score >= SCORE_FLOOR)) {
      console.warn(`[perf:lh] score below soft floor ${SCORE_FLOOR} — not failing`);
    }
    if (lcp && !(lcp <= LCP_MS)) {
      console.warn(`[perf:lh] LCP above soft ${LCP_MS}ms — not failing`);
    }
  } catch (err) {
    console.warn("[perf:lh] could not parse report:", err.message || err);
  }
  process.exit(0);
}

main();
