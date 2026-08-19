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

test("index has no remote fonts; SW v86 + offline fallback", async ({ request }) => {
  const html = await (await request.get("/index.html")).text();
  expect(html).not.toMatch(/fonts\.googleapis/);
  expect(html).not.toMatch(/fonts\.gstatic/);
  const sw = await (await request.get("/sw.js")).text();
  expect(sw).toMatch(/enlab-v87/);
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

test("lab standard: 6 tabs, lab frame, a guide per room", async ({ page, request }) => {
  const html = await (await request.get("/index.html")).text();
  expect(html).not.toMatch(/oido-card|oido-in/);
  expect(html).toMatch(/lab-hub/);
  expect(html).toMatch(/guide-lab/);
  await boot(page);
  await expect(page.locator("nav.tabs [data-tab]")).toHaveCount(6);
  const miss = await page.evaluate(() => {
    const rooms = [...document.querySelectorAll(".lab-topic[data-lab]")].map((el) => el.dataset.lab);
    const es = window.ENLAB.ui.es.guide || {};
    const en = window.ENLAB.ui.en.guide || {};
    return {
      rooms: rooms.filter((id) => !es[id]),
      en: rooms.filter((id) => !en[id]),
      hubs: document.querySelectorAll(".lab-hub").length,
      oidoCards: document.querySelectorAll(".oido-card").length,
    };
  });
  expect(miss.rooms, `ES guide missing: ${miss.rooms.join(", ")}`).toEqual([]);
  expect(miss.en, `EN guide missing: ${miss.en.join(", ")}`).toEqual([]);
  expect(miss.hubs).toBeGreaterThanOrEqual(4);
  expect(miss.oidoCards).toBe(0);
});

test("Remind push copy differentiates plan and quickmix hot", async ({ page }) => {
  await boot(page);
  const lines = await page.evaluate(() => ({
    hot: remindPushBody(0, 3, false, true, false),
    start: remindPushBody(0, 3, false, false, false),
    mid: remindPushBody(0, 2, true, false, false),
    daily: remindPushBody(0, 0, false, false, false),
    place: remindPushBody(0, 3, false, false, true),
  }));
  expect(lines.hot).toMatch(/fricci|friction/i);
  expect(lines.start).toMatch(/plan|Plan/i);
  expect(lines.mid).toMatch(/2|dos|two/i);
  expect(lines.daily).toMatch(/15|minut/i);
  expect(lines.place).toMatch(/test|nivel|level|plan/i);
});

test("SW remindCopy four priority tiers", async ({ request }) => {
  const sw = await (await request.get("/sw.js")).text();
  const fn = sw.match(/function remindCopy\(data\)\s*\{[\s\S]*?\n\}/);
  expect(fn).toBeTruthy();
  const run = new Function(`${fn[0]}; return remindCopy;`)();
  const base = { lang: "es", dueCount: 0, coachPlanLeft: 3, coachPlanStarted: false };
  expect(run({ ...base, placePlanNudge: true, certWarmupNudge: true, quickmixHot: true }).body)
    .toMatch(/test de nivel|nivel bajo/i);
  expect(run({ ...base, placePlanNudge: false, certWarmupNudge: true, quickmixHot: true }).body)
    .toMatch(/calentamiento cert/i);
  expect(run({ ...base, placePlanNudge: false, certWarmupNudge: false, quickmixHot: true }).body)
    .toMatch(/fricci/i);
  expect(run({ ...base, placePlanNudge: false, certWarmupNudge: false, quickmixHot: false }).body)
    .toMatch(/plan 8 min|3 pasos/i);
});

test("Remind push priority: place beats cert warmup beats quickmix", async ({ page }) => {
  await boot(page);
  const lines = await page.evaluate(() => ({
    place: remindPushBody(0, 3, false, true, true, true),
    certOnly: remindPushBody(0, 3, false, true, false, true),
    hotOnly: remindPushBody(0, 3, false, true, false, false),
  }));
  expect(lines.place).toMatch(/test|nivel|level/i);
  expect(lines.certOnly).toMatch(/calentamiento|warm-up/i);
  expect(lines.hotOnly).toMatch(/fricci|friction/i);
});

test("Remind SW payload fields complete", async ({ page }) => {
  await boot(page);
  const payload = await page.evaluate(() => {
    localStorage.setItem("enlab-place-result", JSON.stringify({ score: 6, n: 20, at: Date.now() }));
    sessionStorage.removeItem("enlab-coach-plan");
    return {
      placePlanNudge: placePlanNudgeOn(),
      coachPlanLeft: coachPlanLeft(),
      quickmixHot: quickmixFrictionStreak(3),
      today: todayKey(),
    };
  });
  expect(payload.placePlanNudge).toBe(true);
  expect(payload.coachPlanLeft).toBe(3);
  expect(typeof payload.quickmixHot).toBe("boolean");
  expect(payload.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test("SW remindCopy includes cert warmup nudge branch", async ({ request }) => {
  const sw = await (await request.get("/sw.js")).text();
  expect(sw).toMatch(/certWarmupNudge/);
  expect(sw).toMatch(/Calentamiento cert|Cert warm-up done/);
});

test("SW remindCopy includes placement nudge branch", async ({ request }) => {
  const sw = await (await request.get("/sw.js")).text();
  expect(sw).toMatch(/placePlanNudge/);
  expect(sw).toMatch(/Test de nivel bajo|Level test was low/);
});

test("Remind payload includes certWarmupNudge", async ({ page }) => {
  await boot(page);
  const payload = await page.evaluate(() => {
    localStorage.setItem("enlab-cert-warmup", JSON.stringify({ day: todayKey(), n: 1 }));
    sessionStorage.removeItem("enlab-coach-plan");
    return {
      streak: certWarmupStreak(),
      left: coachPlanLeft(),
      started: coachPlanStarted(),
    };
  });
  expect(payload.streak).toBeGreaterThanOrEqual(1);
  expect(payload.left).toBe(3);
  expect(payload.started).toBe(false);
});

test("syncRemindPayload shape is complete", async ({ page }) => {
  await boot(page);
  const payload = await page.evaluate(() => {
    localStorage.setItem("enlab-cert-warmup", JSON.stringify({ day: todayKey(), n: 1 }));
    sessionStorage.removeItem("enlab-coach-plan");
    return syncRemindPayload();
  });
  expect(payload.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(payload.coachPlanLeft).toBe(3);
  expect(payload.certWarmupNudge).toBe(true);
  expect(typeof payload.placePlanNudge).toBe("boolean");
  expect(typeof payload.quickmixHot).toBe("boolean");
  expect(["es", "en"]).toContain(payload.lang);
});

test("Remind SW payload includes placePlanNudge", async ({ page }) => {
  await boot(page);
  const payload = await page.evaluate(() => {
    localStorage.setItem("enlab-place-result", JSON.stringify({ score: 5, n: 20, at: Date.now() }));
    sessionStorage.removeItem("enlab-coach-plan");
    sessionStorage.removeItem("enlab-coach-plan-flow");
    return {
      nudge: placePlanNudgeOn(),
      left: coachPlanLeft(),
    };
  });
  expect(payload.nudge).toBe(true);
  expect(payload.left).toBe(3);
});
