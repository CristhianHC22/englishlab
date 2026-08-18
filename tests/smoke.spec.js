const { test, expect } = require("@playwright/test");

test("loads Hoy path and tabs", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("enlab-welcome-v2", "1"));
  await page.reload();
  await expect(page.locator("#hoy-path")).toBeVisible();
  await expect(page.locator(".hoy-next").first()).toBeVisible();
  await page.locator('[data-tab="hablar"]').click();
  await expect(page.locator("#hablar.panel.active")).toBeVisible();
  await expect(page.locator("#interview-sim-card")).toBeVisible();
});

test("English UI toggle", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.ENLAB.ui.en.tabs.hoy = "Today";
    localStorage.setItem("enlab-ui-lang", "en");
  });
  await page.reload();
  await expect(page.locator('[data-tab="hoy"]')).toHaveText(/Today/i);
});

test("extras content is wired", async ({ page }) => {
  await page.goto("/");
  const hasInterview = await page.evaluate(() => Array.isArray(window.ENLAB.interviewSim) && window.ENLAB.interviewSim.length >= 5);
  expect(hasInterview).toBe(true);
  const hasSituations = await page.evaluate(() => !!window.ENLAB.phrasesSituation?.airport?.length);
  expect(hasSituations).toBe(true);
});
