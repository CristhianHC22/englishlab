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

test("Hablar: hear then record is the first action", async ({ page }) => {
  await boot(page);
  await page.locator('nav.tabs [data-tab="hablar"]').click();
  await expect(page.locator("#speak-target")).toBeVisible();
  await expect(page.locator(".speak-act #speak-listen")).toBeVisible();
  await expect(page.locator(".speak-act #speak-rec")).toBeVisible();
  await expect(page.locator("#speak-listen")).toHaveClass(/next-act/);
  await expect(page.locator(".speak-steps [data-speak-phase=hear]")).toHaveClass(/on/);
  await expect(page.locator(".speak-opts")).toBeVisible();
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

test("Hablar: duo resume chip when game saved", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.setItem("enlab-duo-now", JSON.stringify({
      day: todayKey(),
      player: 1,
      scoreA: 2,
      scoreB: 1,
      turn: 3,
      scene: { type: "dialog", data: { title: "Test", turns: [{ a: "Hi", b: "Hello" }] } },
    }));
    if (window.NR?.renderDuoResumeHablar) window.NR.renderDuoResumeHablar();
  });
  await openLabRoom(page, "duo-card", "hablar");
  await expect(page.locator("#duo-resume-hablar [data-duo-resume]")).toBeVisible();
  await expect(page.locator("#duo-resume-hablar")).toContainText(/A:\s*2|A: 2/i);
  await page.locator("#duo-resume-hablar [data-duo-resume]").click();
  await expect(page.locator("#duo-now")).toContainText(/Jugador|Player/i);
});

test("Hablar: duo resume chip in you-are", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.setItem("enlab-duo-now", JSON.stringify({
      day: todayKey(),
      player: 1,
      scoreA: 1,
      scoreB: 0,
      turn: 1,
      scene: { type: "dialog", data: { title: "Test", turns: [{ a: "Hi", b: "Hello" }] } },
    }));
    if (typeof fillYouAreChips === "function") fillYouAreChips();
  });
  await page.locator('nav.tabs [data-tab="hablar"]').click();
  await expect(page.locator("#you-are-chips [data-duo-resume]")).toBeVisible();
});
