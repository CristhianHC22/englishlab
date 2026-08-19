const { test, expect } = require("@playwright/test");
const { boot, revealInFolds } = require("./helpers/boot");

test("pack counts, unique ids, placement bank", async ({ page }) => {
  await boot(page);
  const snap = await page.evaluate(() => {
    const podcasts = window.ENLAB.podcasts || [];
    const roleplays = window.ENLAB.roleplays || [];
    const emails = window.ENLAB.emailSpeak || [];
    const dictation = window.ENLAB.dictation || [];
    const podIds = podcasts.map((p) => p.id).filter(Boolean);
    const roleIds = roleplays.map((r) => r.id).filter(Boolean);
    const unique = (arr) => new Set(arr).size === arr.length;
    const dictB2 = [
      "Had I known about the delay, I would have flagged it sooner.",
      "Neither proposal is viable without a longer support window.",
      "I'd rather you didn't share the draft until legal has signed off.",
      "We're due to ship on Friday provided QA signs off tonight.",
      "The issue was flagged by QA, not invented by the client.",
      "Could you walk me through the numbers one more time?",
      "If I were you, I'd push the deadline rather than ship half-done.",
      "Please keep me in the loop if the scope starts to slip again.",
      "Were I in your position, I'd escalate before the client calls.",
      "Little did we know the API had a hard rate limit.",
      "It's high time we wrote the runbook instead of relying on chat.",
      "Scarcely had we boarded when the gate closed behind us.",
      "On no account should we promise a date we can't meet.",
      "Hardly anyone had read the appendix, yet they voted yes.",
    ];
    return {
      podcasts: podcasts.length,
      roleplays: roleplays.length,
      dictation: dictation.length,
      dictB2: dictB2.every((en) => dictation.some((d) => d.en === en)),
      emailTone: emails.filter((e) => e.tone).length,
      placement: (window.ENLAB.placementItems || []).length,
      pairs: (window.ENLAB.minimalPairs || []).length,
      writing: (window.ENLAB.writingPrompts || []).length,
      branched: roleplays.filter((r) => (r.turns || []).some((t) => (t.bOpts || []).length >= 2)).length,
      podIds: podIds.length,
      podUnique: unique(podIds),
      roleIds: roleIds.length,
      roleUnique: unique(roleIds),
      roleAllHaveId: roleIds.length === roleplays.length,
      podAllHaveId: podIds.length === podcasts.length,
    };
  });
  expect(snap.podcasts).toBeGreaterThanOrEqual(40);
  expect(snap.roleplays).toBeGreaterThanOrEqual(50);
  expect(snap.dictation).toBeGreaterThanOrEqual(100);
  expect(snap.dictB2).toBe(true);
  expect(snap.emailTone).toBeGreaterThanOrEqual(16);
  expect(snap.placement).toBeGreaterThanOrEqual(24);
  expect(snap.pairs).toBeGreaterThanOrEqual(37);
  expect(snap.branched).toBeGreaterThanOrEqual(13);
  expect(snap.writing).toBeGreaterThanOrEqual(12);
  expect(snap.podAllHaveId).toBe(true);
  expect(snap.podUnique).toBe(true);
  expect(snap.roleAllHaveId).toBe(true);
  expect(snap.roleUnique).toBe(true);
});

test("i18n ES and EN expose the same keys", async ({ page }) => {
  await page.goto("/");
  const { missingInEn, missingInEs, n } = await page.evaluate(() => {
    const flatten = (obj, prefix = "") => {
      const out = [];
      Object.keys(obj || {}).forEach((k) => {
        const path = prefix ? `${prefix}.${k}` : k;
        const v = obj[k];
        if (v && typeof v === "object" && !Array.isArray(v)) out.push(...flatten(v, path));
        else out.push(path);
      });
      return out;
    };
    const es = flatten(window.ENLAB.ui.es);
    const en = flatten(window.ENLAB.ui.en);
    const enSet = new Set(en);
    const esSet = new Set(es);
    return {
      n: es.length,
      missingInEn: es.filter((k) => !enSet.has(k)),
      missingInEs: en.filter((k) => !esSet.has(k)),
    };
  });
  expect(n).toBeGreaterThan(80);
  expect(missingInEn, `EN falta: ${missingInEn.join(", ")}`).toEqual([]);
  expect(missingInEs, `ES falta: ${missingInEs.join(", ")}`).toEqual([]);
});

test("index has no remote fonts; SW v41 + offline fallback", async ({ request }) => {
  const html = await (await request.get("/index.html")).text();
  expect(html).not.toMatch(/fonts\.googleapis/);
  expect(html).not.toMatch(/fonts\.gstatic/);
  const sw = await (await request.get("/sw.js")).text();
  expect(sw).toMatch(/enlab-v41/);
  expect(sw).toMatch(/offline\.html/);
  expect(sw).toMatch(/mode === ["']navigate["']/);
  const off = await request.get("/offline.html");
  expect(off.status()).toBe(200);
  const body = await off.text();
  expect(body).toMatch(/Hoy/);
});

test("PIN blocks export and does not unlock the session", async ({ page }) => {
  await boot(page);
  page.on("dialog", (d) => d.dismiss());
  await revealInFolds(page, "#class-pin");
  await page.locator("#class-pin").fill("1234");
  await page.locator("#class-pin-save").click();
  await expect(page.locator("#class-pin-status")).toContainText(/PIN/i);
  await page.evaluate(() => sessionStorage.removeItem("enlab-class-ok"));
  await revealInFolds(page, "#prog-export");
  await page.locator("#prog-export").click();
  const unlocked = await page.evaluate(() => sessionStorage.getItem("enlab-class-ok"));
  expect(unlocked).toBeNull();
  await expect(page.locator("#class-pin-status")).toContainText(/PIN/i);
});
