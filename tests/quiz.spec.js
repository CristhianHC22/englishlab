const { test, expect } = require("@playwright/test");
const { boot, openQuizMode, openOidoRoom, openHoyExtras } = require("./helpers/boot");

test("Quiz: Play now starts today's game without picking a group", async ({ page }) => {
  await boot(page);
  await page.locator('nav.tabs [data-tab="quiz"]').click();
  await expect(page.locator("#quiz-now-btn")).toBeVisible();
  await expect(page.locator("#quiz-now")).toContainText(/Hoy toca|Today/i);
  await page.locator("#quiz-now-btn").click();
  await expect(page.locator("#quiz")).toHaveClass(/lab-in/);
  await expect(page.locator("#quiz-box .quiz-q, #quiz-box .choices button, #listen-next-pass").first()).toBeVisible();
});

test("Quiz: after a round, stay in the same group", async ({ page }) => {
  await boot(page);
  await openQuizMode(page, "dict");
  await page.locator("#quiz-start").click();
  await expect(page.locator("#quiz-box .quiz-q")).toBeVisible();
  await page.evaluate(() => {
    const s = document.createElement("script");
    s.textContent = "quiz.i = quiz.items.length; renderQuiz();";
    document.documentElement.appendChild(s);
    s.remove();
  });
  await expect(page.locator("#quiz")).toHaveClass(/lab-in/);
  await expect(page.locator("#quiz-again")).toBeVisible();
  await expect(page.locator('#quiz-box .quiz-peers [data-quiz-start="listen"]')).toBeVisible();
  await expect(page.locator('#quiz-box .quiz-peers [data-quiz-start="ear"]')).toBeVisible();
  await page.locator('#quiz-box .quiz-peers [data-quiz-start="ear"]').click();
  await expect(page.locator("#quiz-box .quiz-q, #quiz-box .choices button").first()).toBeVisible();
  await expect(page.locator("#quiz")).toHaveClass(/lab-in/);
});

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

test("Quiz: first miss teaches weak/journal", async ({ page }) => {
  await boot(page);
  await openQuizMode(page, "choice");
  await page.locator("#quiz-start").click();
  await expect(page.locator("#quiz-box .choices button").first()).toBeVisible();
  await page.evaluate(() => {
    const s = document.createElement("script");
    s.textContent = "quizMarkFail(quiz.items[quiz.i]?.inf || 'go');";
    document.documentElement.appendChild(s);
    s.remove();
  });
  await expect(page.locator(".quiz-fail-note")).toBeVisible();
  await expect(page.locator(".quiz-fail-note")).toContainText(/débiles|diario|weak|journal/i);
  await expect(page.locator(".quiz-miss-live")).toContainText(/1 débil|1 weak/i);
  await page.evaluate(() => {
    const s = document.createElement("script");
    s.textContent = "quizMarkFail('see');";
    document.documentElement.appendChild(s);
    s.remove();
  });
  await expect(page.locator(".quiz-fail-note")).toHaveCount(1);
  await expect(page.locator(".quiz-miss-live")).toContainText(/2 débiles|2 weak/i);
  await page.locator(".quiz-miss-live").first().click();
  await expect(page.locator("#verbos")).toBeVisible();
});

test("Quiz: uso miss chip opens the journal on the latest fail", async ({ page }) => {
  await boot(page);
  await openQuizMode(page, "uso");
  await page.locator("#quiz-start").click();
  await expect(page.locator("#quiz-box .choices button, #quiz-box .quiz-q").first()).toBeVisible();
  await page.evaluate(() => {
    const s = document.createElement("script");
    s.textContent = `
      const it = quiz.items[quiz.i] || { inf: "uso:1", a: "are", q: "How ___ you?" };
      if (window.PLUS?.logError) window.PLUS.logError({ mode: "uso", expected: it.a || "are", said: "is", prompt: it.q || "How ___ you?", why: "you are" });
      quizMarkFail(it.inf || "uso:1");
    `;
    document.documentElement.appendChild(s);
    s.remove();
  });
  await page.locator(".quiz-miss-live").first().click();
  await expect(page.locator("#ia")).toBeVisible();
  await expect(page.locator("#error-journal")).toBeVisible();
  await expect(page.locator("#error-journal .journal-card-now")).toBeVisible();
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

test("Quiz: after day-marked miss, Play offers that mode", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.setItem("enlab-cierre-result", JSON.stringify({
      day: todayKey(), score: 2, n: 3, fails: 1, useFail: "are",
    }));
  });
  await page.locator('nav.tabs [data-tab="quiz"]').click();
  await expect(page.locator("#quiz-now [data-quiz-miss='uso']")).toBeVisible();
  await page.locator("#quiz-now [data-quiz-miss='uso']").click();
  await expect(page.locator("#quiz")).toHaveClass(/lab-in/);
  await expect(page.locator("#quiz-box .quiz-q, #quiz-box .choices button").first()).toBeVisible();
  await page.evaluate(() => {
    const s = document.createElement("script");
    s.textContent = "quiz.i = quiz.items.length; renderQuiz();";
    document.documentElement.appendChild(s);
    s.remove();
  });
  await expect(page.locator("#quiz-box [data-go-tab='hoy']")).toBeVisible();
});

test("Quiz: placement end offers 8-min plan CTA", async ({ page }) => {
  await boot(page);
  await openQuizMode(page, "place");
  await page.locator("#quiz-start").click();
  await page.evaluate(() => {
    quiz.score = Math.round(quiz.items.length * 0.4);
    quiz.i = quiz.items.length;
    renderQuiz();
  });
  await expect(page.locator("#quiz-box [data-coach-plan-go]")).toBeVisible();
  await expect(page.locator("#quiz-box")).toContainText(/plan 8 min|8-min plan/i);
});

test("Quiz: placement below 50% auto-starts plan flow", async ({ page }) => {
  await boot(page);
  await openQuizMode(page, "place");
  await page.locator("#quiz-start").click();
  await page.evaluate(() => {
    sessionStorage.removeItem("enlab-coach-plan");
    sessionStorage.removeItem("enlab-coach-plan-flow");
    quiz.score = Math.round(quiz.items.length * 0.35);
    quiz.i = quiz.items.length;
    renderQuiz();
  });
  await expect(page.locator("#quiz-box .quiz-plan-auto")).toContainText(/35%|arrancamos|starting/i);
  await expect(page.locator("#coach-plan-skip")).toBeVisible();
});

test("Quiz: place from the hub does not offer Back to Today", async ({ page }) => {
  await boot(page);
  await openQuizMode(page, "place");
  await page.locator("#quiz-start").click();
  await page.evaluate(() => {
    const s = document.createElement("script");
    s.textContent = "quiz.i = quiz.items.length; renderQuiz();";
    document.documentElement.appendChild(s);
    s.remove();
  });
  await expect(page.locator("#quiz-box [data-go-tab='hoy']")).toHaveCount(0);
});

test("Quiz: cert from the Today path offers Back to Today", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => sessionStorage.setItem("enlab-quiz-from-hoy", "1"));
  await openQuizMode(page, "cert");
  await page.locator("#quiz-start").click();
  await page.evaluate(() => {
    const s = document.createElement("script");
    s.textContent = "quiz.i = quiz.items.length; renderQuiz();";
    document.documentElement.appendChild(s);
    s.remove();
  });
  await expect(page.locator("#quiz-box [data-go-tab='hoy']")).toBeVisible();
});

test("Quiz: unfinished cert offers Continue in Today extras", async ({ page }) => {
  await boot(page);
  await openQuizMode(page, "cert");
  await page.locator("#quiz-start").click();
  await expect(page.locator("#quiz-box .quiz-q, #quiz-box .choices button").first()).toBeVisible();
  await page.evaluate(() => {
    const s = document.createElement("script");
    s.textContent = "quiz.i = 2; if (window.NR?.persistCertNow) NR.persistCertNow();";
    document.documentElement.appendChild(s);
    s.remove();
  });
  await page.locator('nav.tabs [data-tab="hoy"]').click();
  await openHoyExtras(page);
  await expect(page.locator("[data-cert-resume]")).toBeVisible();
  await page.locator("[data-cert-resume]").click();
  await expect(page.locator("#quiz")).toHaveClass(/lab-in/);
  await expect(page.locator("#quiz-box")).toContainText(/3\s*\/\s*\d+/);
});

test("Quiz: placement resume in exams room", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const items = window.PLUS.makePlacementItems();
    localStorage.setItem("enlab-place-now", JSON.stringify({
      day: todayKey(), i: 2, score: 1, fails: [], items,
    }));
    window.PLUS.renderPlaceQuizResume();
  });
  await page.locator('nav.tabs [data-tab="quiz"]').click();
  await page.locator('#quiz-hub [data-lab-jump="quiz-exams"]').click();
  await expect(page.locator("#place-quiz-resume [data-place-resume]")).toBeVisible();
  await page.locator("[data-place-resume]").click();
  await expect(page.locator("#quiz-box")).toContainText(/3\s*\/\s*20|Pregunta 3|Question 3/i);
});

test("Quiz: weekly resume in exams room", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const items = makeWeeklyExamItems();
    sessionStorage.setItem("enlab-weekly-now", JSON.stringify({
      week: weekStartKey(), i: 3, score: 2, fails: [], items,
    }));
    renderWeeklyQuizResume();
  });
  await page.locator('nav.tabs [data-tab="quiz"]').click();
  await page.locator('#quiz-hub [data-lab-jump="quiz-exams"]').click();
  await expect(page.locator("#weekly-quiz-resume [data-weekly-resume]")).toBeVisible();
  await page.locator("#weekly-quiz-resume [data-weekly-resume]").click();
  await expect(page.locator("#quiz-box")).toContainText(/4\s*\/\s*12|Pregunta 4|Question 4/i);
});

test("Quiz: weekly stale in exams room has start-fresh button", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.setItem("enlab-weekly-stale", JSON.stringify({ week: "2000-01-01", i: 4, total: 12 }));
    renderWeeklyQuizResume();
  });
  await page.locator('nav.tabs [data-tab="quiz"]').click();
  await page.locator('#quiz-hub [data-lab-jump="quiz-exams"]').click();
  await expect(page.locator("#weekly-quiz-resume")).toContainText(/semana pasada|last week/i);
  await expect(page.locator("#weekly-quiz-resume [data-quiz-mode='weekly']")).toBeVisible();
});

test("Quiz: placement resume shows in Guide when open", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const items = window.PLUS.makePlacementItems();
    localStorage.setItem("enlab-place-now", JSON.stringify({
      day: todayKey(), i: 2, score: 1, fails: [], items,
    }));
  });
  await page.locator('nav.tabs [data-tab="quiz"]').click();
  await page.locator('#quiz-hub [data-lab-jump="quiz-exams"]').click();
  const why = await page.evaluate(() => {
    if (typeof fillGuide === "function") fillGuide();
    return document.getElementById("guide-why")?.textContent || "";
  });
  expect(why).toMatch(/Test de nivel|Level test/i);
  expect(why).toMatch(/3\/20|pregunta 3|question 3/i);
});

test("Quiz: cert time-up in cert-today from score when cert-now cleared", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    localStorage.removeItem("enlab-cert-now");
    localStorage.setItem("enlab-cert-score", JSON.stringify({
      timeUp: true, day: todayKey(), score: 6, total: 24,
    }));
    if (window.NR?.renderCertToday) window.NR.renderCertToday();
  });
  await openHoyExtras(page);
  await expect(page.locator("#cert-today")).toBeVisible();
  await expect(page.locator("[data-cert-retry]")).toBeVisible();
  await expect(page.locator("[data-cert-resume]")).toBeHidden();
});

test("Quiz: cert time-up in Today extras shows message, not Continue", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    localStorage.setItem("enlab-cert-now", JSON.stringify({
      day: todayKey(),
      timeUp: true,
      i: 5,
      total: 12,
    }));
    if (window.NR?.renderCertToday) NR.renderCertToday();
  });
  await openHoyExtras(page);
  await expect(page.locator("#cert-today")).toBeVisible();
  await expect(page.locator("#cert-today")).toContainText(/acabó el tiempo|Time's up/i);
  await expect(page.locator("[data-cert-resume]")).toBeHidden();
  await expect(page.locator("[data-cert-retry]")).toBeVisible();
});

test("Quiz: cert resume chip in you-are when cert in progress after day marked", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const items = window.NR.makeCertExamItems();
    localStorage.setItem("enlab-cert-now", JSON.stringify({
      day: todayKey(), i: 3, score: 2, fails: [], items, left: 1500,
    }));
    hoyPathI = hoyPath().length;
    persistHoyPath();
    finishHoyPath();
    if (typeof fillYouAreChips === "function") fillYouAreChips();
  });
  await expect(page.locator("#you-are-chips [data-cert-resume]")).toBeVisible();
  await expect(page.locator("#you-are-chips [data-cert-retry]")).toBeHidden();
});

test("Quiz: cert retry from time-up starts a fresh exam", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    localStorage.setItem("enlab-cert-now", JSON.stringify({
      day: todayKey(),
      timeUp: true,
      i: 5,
      total: 12,
    }));
    if (window.NR?.renderCertToday) NR.renderCertToday();
  });
  page.on("dialog", async (d) => { await d.accept(); });
  await openHoyExtras(page);
  await page.locator("[data-cert-retry]").click();
  await expect(page.locator("#quiz")).toHaveClass(/lab-in/);
  await expect(page.locator("#quiz-box .quiz-q, #quiz-box .choices button").first()).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("enlab-cert-now") || "null"));
  expect(stored?.timeUp).toBeFalsy();
});
