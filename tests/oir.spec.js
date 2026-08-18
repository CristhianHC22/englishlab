const { test, expect } = require("@playwright/test");

async function boot(page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("enlab-welcome-v2", "1");
    localStorage.setItem("enlab-onboard-v3", "1");
  });
  await page.reload();
  await page.waitForFunction(() => (window.ENLAB?.podcasts || []).length >= 40);
}

test("Oír: pronunciation panel", async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="vocales"]').click();
  await expect(page.locator("#pron-panel")).toBeVisible();
  await expect(page.locator(".pron-pair").first()).toBeVisible();
  await expect(page.locator("#pron-panel")).toContainText(/ship|sheep/i);
});

test("Oír: branching stories", async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="vocales"]').click();
  await expect(page.locator("#stories-panel")).toBeVisible();
  await page.locator("[data-story]").first().click();
  await expect(page.locator("#story-now")).toBeVisible();
  await page.locator(".story-choice").first().click();
});

test("Oír: 40 podcasts", async ({ page }) => {
  await boot(page);
  const n = await page.evaluate(() => (window.ENLAB.podcasts || []).length);
  expect(n).toBeGreaterThanOrEqual(40);
  await page.locator('[data-tab="vocales"]').click();
  await expect(page.locator("#podcast-list .podcast-card").first()).toBeVisible();
});
