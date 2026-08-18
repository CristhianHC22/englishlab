const { test, expect } = require("@playwright/test");

async function boot(page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("enlab-welcome-v2", "1");
    localStorage.setItem("enlab-onboard-v3", "1");
  });
  await page.reload();
  await page.waitForFunction(() => (window.ENLAB?.dictation || []).length >= 100);
}

test("Quiz: dictation and listen modes", async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="quiz"]').click();
  await page.locator('[data-quiz-mode="dict"]').click();
  await page.locator("#quiz-start").click();
  await expect(page.locator("#quiz-box .quiz-q")).toBeVisible();
  await page.locator('[data-quiz-mode="listen"]').click();
  await page.locator("#quiz-start").click();
  await expect(page.locator("#listen-next-pass")).toBeVisible();
});

test("Quiz: cert mode visible", async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="quiz"]').click();
  await expect(page.locator('[data-quiz-mode="cert"]')).toBeVisible();
});

test("Quiz: 100 dictations in bank", async ({ page }) => {
  await boot(page);
  const n = await page.evaluate(() => (window.ENLAB.dictation || []).length);
  expect(n).toBeGreaterThanOrEqual(100);
});
