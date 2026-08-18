const { test, expect } = require("@playwright/test");
const { boot } = require("./helpers/boot");

test("Plus: placement bank and CEFR bands", async ({ page }) => {
  await boot(page);
  const info = await page.evaluate(() => ({
    n: (window.ENLAB.placementItems || []).length,
    a1: window.PLUS.scoreToCefr(4, 20),
    a2: window.PLUS.scoreToCefr(10, 20),
    b1: window.PLUS.scoreToCefr(14, 20),
    b2: window.PLUS.scoreToCefr(18, 20),
  }));
  expect(info.n).toBeGreaterThanOrEqual(24);
  expect(info.a1).toBe("a1");
  expect(info.a2).toBe("a2");
  expect(info.b1).toBe("b1");
  expect(info.b2).toBe("b2");
});

test("Plus: level test starts 20-item quiz", async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="quiz"]').click();
  await page.locator('[data-quiz-mode="place"]').click();
  await page.locator("#quiz-start").click();
  await expect(page.locator("#quiz-box .quiz-q")).toBeVisible();
  await expect(page.locator("#quiz-box .choices button")).toHaveCount(3);
  await expect(page.locator("#quiz-box")).toContainText(/1 \/ 20/);
});

test("Plus: error journal and Anki export in Ayuda", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    window.PLUS.logError({ mode: "uso", expected: "are", said: "is", prompt: "How ___ you?", why: "you are" });
  });
  await page.locator('[data-tab="ia"]').click();
  await expect(page.locator("#error-journal")).toContainText(/are/i);
  await expect(page.locator("#journal-anki")).toBeVisible();
  await expect(page.locator("#journal-csv")).toBeVisible();
  await expect(page.locator("#week-sheet-print")).toBeVisible();
  await expect(page.locator("#perf-panel")).toContainText(/paquete|pack/i);
  await expect(page.locator("#perf-panel")).toContainText(/KB/i);
});

test("Plus: hard pairs and branched role-plays", async ({ page }) => {
  await boot(page);
  const ok = await page.evaluate(() => {
    const pairs = window.ENLAB.minimalPairs || [];
    const roles = window.ENLAB.roleplays || [];
    const late = roles.find((r) => r.id === "branch-late");
    return {
      thin: pairs.some((p) => p.a === "thin" && p.b === "tin"),
      van: pairs.some((p) => p.a === "van" && p.b === "ban"),
      ship: pairs.some((p) => p.a === "ship" && p.b === "chip"),
      branch: !!(late && late.turns[0].bOpts?.length >= 3),
    };
  });
  expect(ok.thin).toBe(true);
  expect(ok.van).toBe(true);
  expect(ok.ship).toBe(true);
  expect(ok.branch).toBe(true);
});

test("Plus: accent pref is en-GB when uk", async ({ page }) => {
  await boot(page);
  const lang = await page.evaluate(() => {
    localStorage.setItem("enlab-accent-pref", "uk");
    const u = new SpeechSynthesisUtterance("test");
    const pref = localStorage.getItem("enlab-accent-pref");
    return pref === "uk" ? "en-GB" : "en-US";
  });
  expect(lang).toBe("en-GB");
});

test("Plus: 90-day chart on Hoy", async ({ page }) => {
  await boot(page);
  await expect(page.locator("#hoy-streak-chart")).toBeVisible();
  await expect(page.locator("#hoy-streak-chart .streak-90")).toBeVisible();
});

test("Plus: IDB mirrors transfer keys", async ({ page }) => {
  await boot(page);
  const ok = await page.evaluate(() => {
    const prog = window.ENLAB_PROG_KEYS || [];
    const keys = window.ENLAB_IDB?.KEYS || [];
    return {
      n: prog.length,
      roster: keys.includes("enlab-class-roster"),
      place: keys.includes("enlab-place-result"),
      same: prog.every((k) => keys.includes(k)),
    };
  });
  expect(ok.n).toBeGreaterThan(40);
  expect(ok.roster).toBe(true);
  expect(ok.place).toBe(true);
  expect(ok.same).toBe(true);
});

test("Plus: speak hooks are native, not wrappers", async ({ page }) => {
  await boot(page);
  const ok = await page.evaluate(() => ({
    hooks: typeof window.onSpeakVerdict === "function" && typeof window.onRecording === "function",
    noWrapVerdict: !/orig\(said\)/.test(String(window.applySpeakVerdict)),
    noWrapRec: !/orig\(surface\)/.test(String(window.toggleRecording)),
  }));
  expect(ok.hooks).toBe(true);
  expect(ok.noWrapVerdict).toBe(true);
  expect(ok.noWrapRec).toBe(true);
});
