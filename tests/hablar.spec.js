const { test, expect } = require("@playwright/test");
const { boot, openLabRoom } = require("./helpers/boot");

test("Hablar: writing panel at A1 does not throw", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.addInitScript(() => localStorage.setItem("enlab-cefr", "a1"));
  await boot(page);
  await openLabRoom(page, "writing-panel", "hablar");
  expect(errors.join("\n"), errors.join("\n")).not.toMatch(/prompt/);
  await expect(page.locator("#writing-panel")).toBeVisible();
  await expect(page.locator("#writing-draft")).toBeVisible();
});

test("Hablar: writing rubric panel", async ({ page }) => {
  await boot(page);
  await openLabRoom(page, "writing-panel", "hablar");
  await expect(page.locator("#writing-panel")).toBeVisible();
  await expect(page.locator("#writing-draft")).toBeVisible();
  await page.locator("#writing-draft").fill("Hi team, I am running late due to traffic. Please start without me. Thank you.");
  await page.locator("#writing-score").click();
  await expect(page.locator("#writing-result")).not.toHaveText("");
});

test("Hablar: chat and duo cards", async ({ page }) => {
  await boot(page);
  await openLabRoom(page, "chat-work-card", "hablar");
  await expect(page.locator("#chat-work-card")).toBeVisible();
  await openLabRoom(page, "duo-card", "hablar");
  await page.locator("#duo-start").click();
  await expect(page.locator("#duo-now p.kicker")).toBeVisible();
});

test("Hablar: role-play starts with timer", async ({ page }) => {
  await boot(page);
  await openLabRoom(page, "roleplay-card", "hablar");
  await page.locator("#roleplay-list .chip").first().click();
  await expect(page.locator("#roleplay-now #role-timer")).toBeVisible();
  await expect(page.locator("#roleplay-now [data-role-rec]")).toBeVisible();
  await expect(page.locator("#roleplay-now [data-role-next]")).toBeVisible();
});

test("Hablar: speak verdict mock", async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="hablar"]').click();
  await page.evaluate(() => {
    window._speakTarget = { target: "A coffee, please.", help: "test" };
    if (typeof applySpeakVerdict === "function") applySpeakVerdict("A coffee, please.");
  });
  await expect(page.locator("#speak-status")).toContainText(/Bien|Good/i);
});

test("Hablar: class pro student QR", async ({ page }) => {
  await boot(page);
  await openLabRoom(page, "class-pro-panel", "ia");
  await page.locator("#class-student-name").fill("Ana QR");
  await page.locator("#class-add-student").click();
  await page.locator("#class-student-qr").click();
  await expect(page.locator("#class-student-qr-box")).toBeVisible();
  await expect(page.locator("#class-student-qr-box textarea")).not.toHaveValue("");
});
