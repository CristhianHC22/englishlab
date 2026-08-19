#!/usr/bin/env node
/** Lists top-level i18n keys present in ES but missing in EN (and vice versa). */
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "i18n.js");
const src = fs.readFileSync(file, "utf8");

function topLevelKeys(locale) {
  const start = src.indexOf(`const ${locale} = {`);
  if (start < 0) throw new Error(`locale ${locale} not found`);
  const slice = src.slice(start);
  const end = slice.indexOf("\n  };");
  const block = slice.slice(0, end);
  const keys = [];
  block.split("\n").forEach((line) => {
    const m = line.match(/^\s{4}([A-Za-z_][A-Za-z0-9_]*):\s/);
    if (m) keys.push(m[1]);
  });
  return keys;
}

const es = new Set(topLevelKeys("es"));
const en = new Set(topLevelKeys("en"));
const missingEn = [...es].filter((k) => !en.has(k)).sort();
const missingEs = [...en].filter((k) => !es.has(k)).sort();

console.log(`ES keys: ${es.size} · EN keys: ${en.size}`);
if (missingEn.length) {
  console.log(`\nMissing in EN (${missingEn.length}):`);
  missingEn.forEach((k) => console.log(`  - ${k}`));
} else console.log("\nAll ES keys have EN counterparts.");
if (missingEs.length) {
  console.log(`\nExtra in EN only (${missingEs.length}):`);
  missingEs.forEach((k) => console.log(`  - ${k}`));
}
process.exit(missingEn.length ? 1 : 0);
