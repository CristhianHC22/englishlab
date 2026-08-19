const { test, expect } = require("@playwright/test");
const { boot, openLabRoom } = require("./helpers/boot");

test("Ayuda: audit A–Z rows", async ({ page }) => {
  await boot(page);
  await openLabRoom(page, "lab-audit", "ia");
  await expect(page.locator(".audit-table tbody tr")).toHaveCount(26);
});

test("Ayuda: classroom pro dashboard", async ({ page }) => {
  await boot(page);
  await openLabRoom(page, "class-pro-panel", "ia");
  await expect(page.locator("#class-pro-panel")).toBeVisible();
  await expect(page.locator("#class-export-csv")).toBeVisible();
  await expect(page.locator("#student-pdf")).toBeVisible();
  await page.locator("#class-student-name").fill("Test Student");
  await page.locator("#class-add-student").click();
  await expect(page.locator(".class-roster-table tbody tr")).toHaveCount(1);
});

test("Ayuda: accessibility bar", async ({ page }) => {
  await boot(page);
  await openLabRoom(page, "a11y-bar", "ia");
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
    localStorage.setItem("enlab-guide-quiet", "1");
  });
  await page.reload();
  await page.waitForFunction(() => window.ENLAB?.ui?.en?.pron);
  await expect(page.locator('[data-tab="hoy"]')).toHaveText(/Today/i);
  await expect(page.locator("#guide-toggle")).toHaveText(/Guide/i);
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
  await openLabRoom(page, "lab-audit", "ia");
  await page.waitForFunction(() => document.querySelector(".audit-table th"));
  await expect(page.locator(".audit-table th").first()).toHaveText(/Lot/i);
});

test("Guía: opens a box for the current screen", async ({ page }) => {
  await boot(page);
  await expect(page.locator("#guide-toggle")).toBeVisible();
  await expect(page.locator("#guide-panel")).toBeHidden();
  await page.locator("#guide-toggle").click();
  await expect(page.locator("#guide-panel")).toBeVisible();
  await expect(page.locator("#guide-title")).toContainText(/Hoy|sesión|15/i);
  await expect(page.locator("#guide-steps li")).toHaveCount(3);
  await page.locator('[data-tab="quiz"]').click();
  await expect(page.locator("#guide-title")).toContainText(/Juego|grupo/i);
  await expect(page.locator("#guide-map")).toContainText(/Verbos/);
  await expect(page.locator("#guide-map")).toContainText(/Exámenes/);
  await page.locator("#guide-gotit").click();
  await expect(page.locator("#guide-panel")).toBeHidden();
});

test("Guía: room copy after opening a practice", async ({ page }) => {
  await boot(page);
  await page.locator("#guide-toggle").click();
  await openLabRoom(page, "roleplay-card", "hablar");
  await expect(page.locator("#guide-panel")).toBeVisible();
  await expect(page.locator("#guide-title")).toContainText(/Role-play/i);
});

test("Guía: offers itself once on first visit", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("enlab-welcome-v2", "1");
    localStorage.setItem("enlab-onboard-v3", "1");
    localStorage.removeItem("enlab-guide-quiet");
    localStorage.removeItem("enlab-guide-seen");
  });
  await page.reload();
  await page.waitForFunction(() => window._enlabBootstrapped === true, { timeout: 90000 });
  await expect(page.locator("#guide-panel")).toBeVisible();
  await expect(page.locator("#guide-title")).toContainText(/Hoy|sesión|15/i);
  await page.locator("#guide-gotit").click();
  await expect(page.locator("#guide-panel")).toBeHidden();
  await page.locator('[data-tab="hoy"]').click();
  await expect(page.locator("#guide-panel")).toBeHidden();
});
