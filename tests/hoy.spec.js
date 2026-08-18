const { test, expect } = require("@playwright/test");
const { boot } = require("./helpers/boot");

test("Hoy: path, situations, class task, offline badge", async ({ page }) => {
  await boot(page);
  await expect(page.locator("#hoy-path")).toBeVisible();
  await expect(page.locator("#situations-panel")).toBeVisible();
  await expect(page.locator("#offline-badge")).toBeVisible();
  await page.locator(".hoy-next").first().click();
  await expect(page.locator("#daily-pairs .card").first()).toBeVisible();
});

test("Hoy: 25+ situation keys", async ({ page }) => {
  await boot(page);
  const n = await page.evaluate(() => Object.keys(window.ENLAB.phrasesSituation || {}).length);
  expect(n).toBeGreaterThanOrEqual(25);
});

test("Hoy: continue story chip when in progress", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const s = (window.ENLAB.branchStories || [])[0];
    if (!s) return;
    localStorage.setItem("enlab-story-progress", JSON.stringify({
      [s.id]: { node: s.start, path: [s.start], vocab: [], at: Date.now() },
    }));
  });
  await page.reload();
  await page.waitForFunction(
    () => typeof window.SV?.renderHoyStoryChip === "function" && (window.ENLAB?.branchStories || []).length >= 1,
    { timeout: 90000 },
  );
  await page.evaluate(() => window.SV.renderHoyStoryChip());
  await expect(page.locator("#hoy-story-chip")).toBeVisible();
  await expect(page.locator("[data-story-resume]")).toBeVisible();
});

test("Hoy: repaso and weekly", async ({ page }) => {
  await boot(page);
  await expect(page.locator("#repaso-quiz-btn")).toBeVisible();
  await expect(page.locator("#weekly-exam-btn")).toBeVisible();
});
