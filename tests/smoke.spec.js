const { test, expect } = require("@playwright/test");

async function boot(page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("enlab-welcome-v2", "1"));
  await page.reload();
}

test("loads Hoy path and tabs", async ({ page }) => {
  await boot(page);
  await expect(page.locator("#hoy-path")).toBeVisible();
  await expect(page.locator(".hoy-next").first()).toBeVisible();
  await page.locator('[data-tab="hablar"]').click();
  await expect(page.locator("#hablar.panel.active")).toBeVisible();
  await expect(page.locator("#interview-sim-card")).toBeVisible();
  await expect(page.locator("#roleplay-card")).toBeVisible();
  await expect(page.locator("#email-card")).toBeVisible();
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

test("pack M content is wired", async ({ page }) => {
  await boot(page);
  const ok = await page.evaluate(() => ({
    listen: (window.ENLAB.listenPassages || []).length >= 10,
    role: (window.ENLAB.roleplays || []).length >= 12,
    email: (window.ENLAB.emailSpeak || []).length >= 10,
    restaurant: !!window.ENLAB.phrasesSituation?.restaurant?.length,
  }));
  expect(ok.listen).toBe(true);
  expect(ok.role).toBe(true);
  expect(ok.email).toBe(true);
  expect(ok.restaurant).toBe(true);
});

test("Hoy path starts and shows pairs", async ({ page }) => {
  await boot(page);
  await page.locator(".hoy-next").first().click();
  await expect(page.locator("#hoy-step-1")).toBeVisible();
  await expect(page.locator("#daily-pairs .card").first()).toBeVisible();
});

test("quiz modes include dictation and weekly", async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="quiz"]').click();
  await expect(page.locator("#quiz.panel.active")).toBeVisible();
  await expect(page.locator('[data-quiz-mode="dict"]')).toBeVisible();
  await expect(page.locator('[data-quiz-mode="weekly"]')).toBeVisible();
  await page.locator('[data-quiz-mode="weekly"]').click();
  await page.locator("#quiz-start").click();
  await expect(page.locator("#quiz-box .quiz-q, #quiz-box .email-quiz")).toBeVisible();
});

test("transfer code roundtrip", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    localStorage.setItem("enlab-cefr", "a2");
    localStorage.setItem("enlab-weak", JSON.stringify(["go", "see"]));
  });
  await page.reload();
  await page.locator("#transfer-box").locator("summary").click();
  const code = await page.locator("#transfer-code").inputValue();
  expect(code.length).toBeGreaterThan(20);
  await page.evaluate(() => {
    localStorage.setItem("enlab-cefr", "b1");
    localStorage.removeItem("enlab-weak");
  });
  await page.locator("#transfer-paste").fill(code);
  page.once("dialog", (d) => d.accept());
  await page.locator("#transfer-import").click();
  const cefr = await page.evaluate(() => localStorage.getItem("enlab-cefr"));
  expect(cefr).toBe("a2");
});

test("weekly exam button on Hoy", async ({ page }) => {
  await boot(page);
  await expect(page.locator("#weekly-exam-btn")).toBeVisible();
  await page.locator("#weekly-exam-btn").click();
  await expect(page.locator("#quiz.panel.active")).toBeVisible();
  await expect(page.locator("#quiz-box .card")).toBeVisible();
});
