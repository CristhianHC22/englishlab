const { test, expect } = require("@playwright/test");
const { boot, openQuizMode, openOidoRoom } = require("./helpers/boot");

test("Quiz: dictation and listen modes", async ({ page }) => {
  await boot(page);
  await openQuizMode(page, "dict");
  await page.locator("#quiz-start").click();
  await expect(page.locator("#quiz-box .quiz-q")).toBeVisible();
  await openQuizMode(page, "listen");
  await page.locator("#quiz-start").click();
  await expect(page.locator("#listen-next-pass")).toBeVisible();
});

test("Quiz: English UI check button", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => localStorage.setItem("enlab-ui-lang", "en"));
  await page.reload();
  await page.waitForFunction(() => window.ENLAB?.ui?.en?.quizCheck);
  await openQuizMode(page, "dict");
  await page.locator("#quiz-start").click();
  await expect(page.locator("#quiz-submit")).toHaveText(/Check/i);
});

test("Quiz: cert mode visible", async ({ page }) => {
  await boot(page);
  await openQuizMode(page, "cert");
  await expect(page.locator('[data-quiz-mode="cert"]')).toBeVisible();
});

test("Quiz: 100 dictations in bank", async ({ page }) => {
  await boot(page);
  const n = await page.evaluate(() => (window.ENLAB.dictation || []).length);
  expect(n).toBeGreaterThanOrEqual(100);
});

test("Quiz: story SRS mode after unlock", async ({ page }) => {
  await boot(page);
  await page.waitForFunction(() => (window.ENLAB?.branchStories || []).length >= 20);
  await page.locator('[data-tab="vocales"]').click();
  await openOidoRoom(page, "stories-panel");
  await page.locator('[data-story="coffee-wrong"]').click();
  await page.locator(".story-choice").first().click();
  await page.locator(".story-choice").first().click();
  await page.locator('[data-tab="quiz"]').click();
  await openQuizMode(page, "story");
  await page.locator("#quiz-start").click();
  await expect(page.locator("#quiz-box .quiz-q")).toBeVisible();
  await expect(page.locator("#quiz-box .choices button").first()).toBeVisible();
});

test("Quiz: due story chip starts story quiz", async ({ page }) => {
  await boot(page);
  await page.waitForFunction(() => (window.ENLAB?.branchStories || []).length >= 20);
  await page.locator('[data-tab="vocales"]').click();
  await openOidoRoom(page, "stories-panel");
  await page.locator('[data-story="slack-typo"]').click();
  await page.locator(".story-choice").first().click();
  await page.locator(".story-choice").first().click();
  await page.locator('[data-tab="hoy"]').click();
  await page.waitForFunction(() => {
    const box = document.querySelector("#due-today");
    return box && !box.hidden && box.querySelector(".due-story");
  });
  await page.locator("#due-today .due-story").first().click();
  await expect(page.locator("#quiz.panel.active")).toBeVisible();
  await expect(page.locator("#quiz-box .quiz-q")).toBeVisible();
});
