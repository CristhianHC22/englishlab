const { test, expect } = require("@playwright/test");

async function boot(page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("enlab-welcome-v2", "1");
    localStorage.setItem("enlab-onboard-v3", "1");
  });
  await page.reload();
  await page.waitForFunction(() => (window.ENLAB?.writingPrompts || []).length >= 6);
}

test("Hablar: writing rubric panel", async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="hablar"]').click();
  await expect(page.locator("#writing-panel")).toBeVisible();
  await expect(page.locator("#writing-draft")).toBeVisible();
  await page.locator("#writing-draft").fill("Hi team, I am running late due to traffic. Please start without me. Thank you.");
  await page.locator("#writing-score").click();
  await expect(page.locator("#writing-result")).not.toHaveText("");
});

test("Hablar: chat and duo cards", async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="hablar"]').click();
  await expect(page.locator("#chat-work-card")).toBeVisible();
  await page.locator("#duo-start").click();
  await expect(page.locator("#duo-now p.kicker")).toBeVisible();
});
