const { test, expect } = require("@playwright/test");

async function boot(page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("enlab-welcome-v2", "1");
    localStorage.setItem("enlab-onboard-v3", "1");
  });
  await page.reload();
  await page.waitForFunction(() => (window.ENLAB?.minimalPairs || []).length >= 25);
}

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

test("Hoy: repaso and weekly", async ({ page }) => {
  await boot(page);
  await expect(page.locator("#repaso-quiz-btn")).toBeVisible();
  await expect(page.locator("#weekly-exam-btn")).toBeVisible();
});
