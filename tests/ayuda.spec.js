const { test, expect } = require("@playwright/test");
const { boot } = require("./helpers/boot");

test("Ayuda: audit A–Z rows", async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="ia"]').click();
  await expect(page.locator(".audit-table tbody tr")).toHaveCount(26);
});

test("Ayuda: classroom pro dashboard", async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="ia"]').click();
  await expect(page.locator("#class-pro-panel")).toBeVisible();
  await expect(page.locator("#class-export-csv")).toBeVisible();
  await expect(page.locator("#student-pdf")).toBeVisible();
  await page.locator("#class-student-name").fill("Test Student");
  await page.locator("#class-add-student").click();
  await expect(page.locator(".class-roster-table tbody tr")).toHaveCount(1);
});

test("Ayuda: accessibility bar", async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="ia"]').click();
  await expect(page.locator("#a11y-contrast-btn")).toBeVisible();
  await page.locator("#a11y-contrast-btn").click();
  await expect(page.locator("body")).toHaveClass(/a11y-contrast/);
  await page.locator("#a11y-motion-btn").click();
  await expect(page.locator("body")).toHaveClass(/reduced-motion/);
});

test("Ayuda: English UI full keys", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("enlab-ui-lang", "en");
    localStorage.setItem("enlab-onboard-v3", "1");
    localStorage.setItem("enlab-welcome-v2", "1");
  });
  await page.reload();
  await page.waitForFunction(() => window.ENLAB?.ui?.en?.pron);
  await expect(page.locator('[data-tab="hoy"]')).toHaveText(/Today/i);
  await expect(page.locator('[data-i18n="hoyTitle"]')).toHaveText(/15 minutes/i);
  await page.locator('[data-tab="vocales"]').click();
  await expect(page.locator('[data-i18n="oidoTitle"]')).toHaveText(/Listen/i);
  await expect(page.locator("#oido-toc")).toContainText(/Rules/i);
  await page.locator('[data-tab="verbos"]').click();
  await expect(page.locator('[data-i18n="verbosTitle"]')).toHaveText(/Verbs/i);
  await page.locator('[data-tab="quiz"]').click();
  await expect(page.locator('[data-i18n="quizStart"]')).toHaveText(/Play/i);
  await page.locator('[data-tab="hablar"]').click();
  await expect(page.locator('[data-i18n="speakRec"]')).toHaveText(/Record/i);
  await page.locator('[data-tab="ia"]').click();
  await page.waitForFunction(() => document.querySelector(".audit-table th"));
  await expect(page.locator(".audit-table th").first()).toHaveText(/Lot/i);
});
