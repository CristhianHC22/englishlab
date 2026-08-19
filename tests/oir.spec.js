const { test, expect } = require("@playwright/test");
const { boot, openOidoRoom } = require("./helpers/boot");

test("Oír: pronunciation panel", async ({ page }) => {
  await boot(page);
  await openOidoRoom(page, "pron-panel");
  await expect(page.locator("#pron-panel")).toBeVisible();
  await expect(page.locator(".pron-pair").first()).toBeVisible();
  await expect(page.locator("#pron-panel")).toContainText(/ship|sheep/i);
  await expect(page.locator("#pron-panel")).toContainText(/F1\/F2/i);
});

test("Oír: formant scoring module", async ({ page }) => {
  await boot(page);
  await page.waitForFunction(() => typeof window.PRON?.scoreFormantPair === "function");
  const ship = await page.evaluate(() => {
    const r = window.PRON.scoreFormantPair({ f1: 400, f2: 2000 }, "/ʃɪp/", "/ʃiːp/");
    return r && r.closerTo === "A" && r.pct > 50;
  });
  const sheep = await page.evaluate(() => {
    const r = window.PRON.scoreFormantPair({ f1: 280, f2: 2700 }, "/ʃɪp/", "/ʃiːp/");
    return r && r.closerTo === "B" && r.pct < 60;
  });
  expect(ship).toBe(true);
  expect(sheep).toBe(true);
  const synth = await page.evaluate(async () => {
    const sr = 44100;
    const len = sr * 0.2;
    const ctx = new OfflineAudioContext(1, len, sr);
    const buf = ctx.createBuffer(1, len, sr);
    const ch = buf.getChannelData(0);
    const f1 = 520;
    const f2 = 1850;
    for (let i = 0; i < len; i += 1) {
      const t = i / sr;
      ch[i] = 0.35 * Math.sin(2 * Math.PI * f1 * t) + 0.25 * Math.sin(2 * Math.PI * f2 * t);
    }
    const fm = window.PRON.estimateFormantsFromBuffer(buf);
    return fm && fm.f1 > 200 && fm.f2 > fm.f1;
  });
  expect(synth).toBe(true);
});

test("Oír: branching stories", async ({ page }) => {
  await boot(page);
  await openOidoRoom(page, "stories-panel");
  await expect(page.locator("#stories-panel")).toBeVisible();
  await page.locator("[data-story]").first().click();
  await expect(page.locator("#story-now")).toBeVisible();
  await expect(page.locator(".story-step")).toContainText(/Paso|Step/i);
  await page.locator(".story-choice").first().click();
  await expect(page.locator(".story-vocab-preview, .story-vocab-count, .story-vocab-bank").first()).toBeVisible();
});

test("Oír: story vocab unlocks SRS", async ({ page }) => {
  await boot(page);
  await page.waitForFunction(() => (window.ENLAB?.branchStories || []).length >= 20);
  await openOidoRoom(page, "stories-panel");
  await page.locator('[data-story="coffee-wrong"]').click();
  await page.locator(".story-choice").first().click();
  await page.locator(".story-choice").first().click();
  const due = await page.evaluate(() => {
    const srs = JSON.parse(localStorage.getItem("enlab-srs") || "{}");
    const storyKeys = Object.keys(srs).filter((k) => k.startsWith("story:"));
    const prog = JSON.parse(localStorage.getItem("enlab-story-progress") || "{}");
    return { storyKeys: storyKeys.length, vocab: (prog["coffee-wrong"]?.vocab || []).length };
  });
  expect(due.vocab).toBeGreaterThanOrEqual(1);
  expect(due.storyKeys).toBeGreaterThanOrEqual(1);
  await page.evaluate(() => {
    localStorage.setItem("enlab-welcome-v2", "1");
    localStorage.setItem("enlab-onboard-v3", "1");
  });
  await page.reload();
  await page.waitForFunction(() => typeof renderDueToday === "function");
  await page.evaluate(() => renderDueToday());
  await page.waitForFunction(() => {
    const box = document.querySelector("#due-today");
    return box && !box.hidden && box.querySelectorAll(".due-story").length > 0;
  });
  await page.locator('[data-tab="hoy"]').click();
  await expect(page.locator("#due-today .due-story").first()).toBeVisible();
});

test("Oír: story branches min 5 steps", async ({ page }) => {
  await boot(page);
  await page.waitForFunction(() => (window.ENLAB?.branchStories || []).length >= 20);
  const report = await page.evaluate(() => {
    const walk = (story, id, d = 0) => {
      const node = story.nodes[id];
      if (!node) return d;
      if (node.ending) return d + 1;
      const next = (node.choices || []).map((c) => walk(story, c.next, d + 1));
      return next.length ? Math.max(...next) : d + 1;
    };
    const rows = window.ENLAB.branchStories.map((s) => ({ id: s.id, d: walk(s, s.start) }));
    return { min: Math.min(...rows.map((r) => r.d)), shallow: rows.filter((r) => r.d < 5) };
  });
  expect(report.shallow, JSON.stringify(report.shallow)).toEqual([]);
  expect(report.min).toBeGreaterThanOrEqual(5);
});

test("Oír: 40 podcasts", async ({ page }) => {
  await boot(page);
  const n = await page.evaluate(() => (window.ENLAB.podcasts || []).length);
  expect(n).toBe(40);
  await page.locator('[data-tab="vocales"]').click();
  await openOidoRoom(page, "oido-podcasts");
  await expect(page.locator("#podcast-list .podcast-card").first()).toBeVisible();
});

test("Oír: podcasts hand-written (en/es, no templates)", async ({ page }) => {
  await boot(page);
  const report = await page.evaluate(() => {
    const pods = window.ENLAB.podcasts || [];
    const template = /Small daily practice beats cramming|Notice how people shorten words|situations test your English fast|matters more than you think/;
    const bad = pods.filter((p) =>
      !p.segments?.length ||
      p.segments.some((s) => !s.en || !s.es) ||
      template.test(p.segments.map((s) => s.en).join(" "))
    ).map((p) => p.id);
    return { count: pods.length, bad, uniqueTitles: new Set(pods.map((p) => p.title)).size };
  });
  expect(report.count).toBe(40);
  expect(report.bad).toEqual([]);
  expect(report.uniqueTitles).toBe(40);
});

test("Oír: lazy rules maps roles", async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="vocales"]').click();
  await expect(page.locator("#oido-toc .lab-card").first()).toBeVisible();
  await expect(page.locator("#vowel-rules .card")).toHaveCount(0);
  await expect(page.locator("#vowel-maps .card")).toHaveCount(0);
  await expect(page.locator("#roles-list .role-word")).toHaveCount(0);
  await page.locator('#oido-toc [data-jump="oido-reglas"]').click();
  await expect(page.locator("#vowel-rules .card").first()).toBeVisible();
  await page.locator("#oido-back").click();
  await page.locator('#oido-toc [data-jump="oido-mapa"]').click();
  await expect(page.locator("#vowel-maps .card").first()).toBeVisible();
  await page.locator("#oido-back").click();
  await page.locator('#oido-toc [data-jump="oido-roles"]').click();
  await expect(page.locator("#roles-list .role-word").first()).toBeVisible();
});
