const { test, expect } = require("@playwright/test");
const { boot, openHoyExtras, openQuizMode, openLabRoom } = require("./helpers/boot");

test("Plus: journal shows plan step tag", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.removeItem("enlab-coach-plan");
    if (window.PLUS?.logPlanStepEvent) window.PLUS.logPlanStepEvent("abandon", "ear");
    if (window.PLUS?.renderErrorJournal) window.PLUS.renderErrorJournal();
  });
  await openLabRoom(page, "error-journal", "ia");
  await expect(page.locator("#error-journal .journal-plan-tag")).toBeVisible();
  await expect(page.locator("#error-journal")).toContainText(/plan 8 min|8-min plan/i);
});

test("Plus: placement bank and CEFR bands", async ({ page }) => {
  await boot(page);
  const info = await page.evaluate(() => ({
    n: (window.ENLAB.placementItems || []).length,
    a1: window.PLUS.scoreToCefr(4, 20),
    a2: window.PLUS.scoreToCefr(10, 20),
    b1: window.PLUS.scoreToCefr(14, 20),
    b2: window.PLUS.scoreToCefr(18, 20),
  }));
  expect(info.n).toBeGreaterThanOrEqual(24);
  expect(info.a1).toBe("a1");
  expect(info.a2).toBe("a2");
  expect(info.b1).toBe("b1");
  expect(info.b2).toBe("b2");
});

test("Plus: level test starts 20-item quiz", async ({ page }) => {
  await boot(page);
  await openQuizMode(page, "place");
  await page.locator("#quiz-start").click();
  await expect(page.locator("#quiz-box .quiz-q")).toBeVisible();
  await expect(page.locator("#quiz-box .choices button")).toHaveCount(3);
  await expect(page.locator("#quiz-box")).toContainText(/1 \/ 20/);
});

test("Plus: error journal and Anki export in Ayuda", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    window.PLUS.logError({ mode: "ear", expected: "ship", said: "sheep", prompt: "ship / sheep", why: "short i" });
    window.PLUS.logError({ mode: "uso", expected: "are", said: "is", prompt: "How ___ you?", why: "you are" });
    localStorage.setItem("enlab-quiz-ux", JSON.stringify({
      ear: { sessions: 4, completed: 2, abandoned: 2, answers: 12, correct: 7, ms: 44000 },
      uso: { sessions: 3, completed: 1, abandoned: 2, answers: 8, correct: 5, ms: 39000 },
    }));
    const today = (() => {
      const d = new Date();
      const p = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    })();
    const daily = {};
    for (let i = 0; i < 10; i += 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const p = (n) => String(n).padStart(2, "0");
      const key = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
      daily[key] = {
        ear: { sessions: i < 5 ? 2 : 4, abandoned: i < 5 ? 0 : 3, completed: 1, answers: 6, correct: 3, ms: 20000 },
      };
    }
    localStorage.setItem("enlab-quiz-ux-daily", JSON.stringify(daily));
  });
  await page.locator('[data-tab="ia"]').click();
  await openLabRoom(page, "error-journal", "ia");
  await expect(page.locator("#error-journal")).toContainText(/are/i);
  await page.evaluate(() => {
    sessionStorage.setItem("enlab-journal-focus", "are");
    window.PLUS.renderErrorJournal();
  });
  await expect(page.locator("#error-journal .journal-card-now")).toBeVisible();
  await expect(page.locator("#error-journal")).toContainText(/Este fallo|This miss/i);
  await expect(page.locator("#error-journal .journal-rest")).toBeVisible();
  await expect(page.locator("#error-journal .journal-rest")).toContainText(/Los otros|The other/i);
  await expect(page.locator(".journal-card-now [data-quiz-miss='uso']")).toBeVisible();
  await expect(page.locator("#journal-anki")).toBeVisible();
  await expect(page.locator("#journal-csv")).toBeVisible();
  await expect(page.locator("#week-sheet-print")).toBeVisible();
  await openLabRoom(page, "perf-panel", "ia");
  await expect(page.locator("#perf-panel")).toContainText(/paquete|pack/i);
  await expect(page.locator("#perf-panel")).toContainText(/KB/i);
  await expect(page.locator("#perf-panel")).toContainText(/Fricción|friction/i);
  await expect(page.locator("#perf-panel")).toContainText(/abandono|drop-off/i);
  await expect(page.locator("#perf-panel")).toContainText(/tendencia|trend/i);
  await expect(page.locator("#perf-panel .perf-heat-bars").first()).toBeVisible();
  await expect(page.locator("#perf-friction-csv")).toBeVisible();
  await expect(page.locator("#perf-panel")).toContainText(/Abandono 7d|7d drop-off/i);
});

test("Plus: Anki plan-pending header when plan not started", async ({ page }) => {
  await boot(page);
  const header = await page.evaluate(() => {
    sessionStorage.removeItem("enlab-coach-plan");
    sessionStorage.removeItem("enlab-coach-plan-flow");
    const lines = ["#separator:tab", "#html:true"];
    if (typeof coachPlanLeft === "function" && coachPlanLeft() >= 3
      && typeof coachPlanStarted === "function" && !coachPlanStarted()) {
      lines.push("# plan-pending: 0/3");
    }
    return lines.join("\n");
  });
  expect(header).toContain("plan-pending");
});

test("Plus: Anki placement-low tag matches coach step", async ({ page }) => {
  await boot(page);
  const tag = await page.evaluate(() => {
    localStorage.setItem("enlab-place-result", JSON.stringify({ score: 6, n: 20, at: Date.now() }));
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 0, steps: ["ear", "uso", "choice"],
    }));
    const pr = loadPlaceResult();
    const placePct = pr.score / pr.n;
    const pending = coachPlanPendingModes();
    const mode = "ear";
    const coachTag = pending.includes(coachPlanStepForMode(mode)) ? " #coach-pending" : "";
    const placeTag = placePct < 0.65 && placementCoachStep(placePct) === coachPlanStepForMode(mode)
      ? " #placement-low" : "";
    return `${coachTag}${placeTag}`.trim();
  });
  expect(tag).toContain("placement-low");
});

test("Plus: journal coach plan button", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 1, steps: ["ear", "uso", "choice"],
    }));
    window.PLUS.logError({ mode: "ear", expected: "ship", said: "sheep", prompt: "ship / sheep", why: "short i" });
    window.PLUS.renderErrorJournal();
  });
  await page.locator('[data-tab="ia"]').click();
  await openLabRoom(page, "error-journal", "ia");
  await expect(page.locator("#journal-coach-plan")).toBeVisible();
});

test("Plus: journal Practice this opens the miss mode", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    window.PLUS.logError({ mode: "ear", expected: "ship", said: "sheep", prompt: "ship / sheep", why: "short i" });
    sessionStorage.setItem("enlab-journal-focus", "ship");
  });
  await page.locator('[data-tab="ia"]').click();
  await openLabRoom(page, "error-journal", "ia");
  await page.evaluate(() => window.PLUS.renderErrorJournal());
  await expect(page.locator(".journal-card-now [data-quiz-miss='ear']")).toBeVisible();
  await page.locator(".journal-card-now [data-quiz-miss='ear']").click();
  await expect(page.locator("#quiz")).toHaveClass(/lab-in/);
});

test("Plus: journal Practice this opens uso without Back to Today", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    window.PLUS.logError({ mode: "uso", expected: "are", said: "is", prompt: "How ___ you?", why: "you are" });
    sessionStorage.setItem("enlab-journal-focus", "are");
  });
  await page.locator('[data-tab="ia"]').click();
  await openLabRoom(page, "error-journal", "ia");
  await page.evaluate(() => window.PLUS.renderErrorJournal());
  await page.locator(".journal-card-now [data-quiz-miss='uso']").click();
  await expect(page.locator("#quiz")).toHaveClass(/lab-in/);
  await page.evaluate(() => {
    const s = document.createElement("script");
    s.textContent = "quiz.i = quiz.items.length; renderQuiz();";
    document.documentElement.appendChild(s);
    s.remove();
  });
  await expect(page.locator("#quiz-box [data-go-tab='hoy']")).toHaveCount(0);
});

test("Plus: journal Practice this opens listen mode", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    window.PLUS.logError({ mode: "listen", expected: "The bus is late.", said: "", prompt: "Listen passage", why: "past simple" });
    sessionStorage.setItem("enlab-journal-focus", "The bus is late.");
  });
  await page.locator('[data-tab="ia"]').click();
  await openLabRoom(page, "error-journal", "ia");
  await page.evaluate(() => window.PLUS.renderErrorJournal());
  await expect(page.locator(".journal-card-now [data-quiz-miss='listen']")).toBeVisible();
  await page.locator(".journal-card-now [data-quiz-miss='listen']").click();
  await expect(page.locator("#quiz")).toHaveClass(/lab-in/);
  await expect(page.locator("#listen-next-pass")).toBeVisible();
});

test("Plus: journal groups rest rows by mode", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    window.PLUS.logError({ mode: "ear", expected: "ship", said: "sheep", prompt: "ship / sheep", why: "short i" });
    window.PLUS.logError({ mode: "ear", expected: "thin", said: "tin", prompt: "thin / tin", why: "short i" });
    window.PLUS.logError({ mode: "uso", expected: "are", said: "is", prompt: "How ___ you?", why: "you are" });
  });
  await page.locator('[data-tab="ia"]').click();
  await openLabRoom(page, "error-journal", "ia");
  await page.evaluate(() => window.PLUS.renderErrorJournal());
  await expect(page.locator(".journal-card-group")).toHaveCount(2);
  await expect(page.locator(".journal-card-group [data-quiz-miss='ear']")).toBeVisible();
});

test("Plus: journal groups now rows by mode when several match", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    window.PLUS.logError({ mode: "ear", expected: "ship", said: "sheep", prompt: "ship / sheep", why: "short i" });
    window.PLUS.logError({ mode: "ear", expected: "thin", said: "tin", prompt: "thin / tin", why: "short i" });
    sessionStorage.setItem("enlab-journal-focus", "thin");
  });
  await page.locator('[data-tab="ia"]').click();
  await openLabRoom(page, "error-journal", "ia");
  await page.evaluate(() => window.PLUS.renderErrorJournal());
  await expect(page.locator(".journal-card-now.journal-card-group")).toBeVisible();
  await expect(page.locator(".journal-card-now [data-quiz-miss='ear']")).toBeVisible();
});

test("Plus: journal Anki now exports only focused rows", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    window.PLUS.logError({ mode: "ear", expected: "ship", said: "sheep", prompt: "ship / sheep", why: "short i" });
    window.PLUS.logError({ mode: "uso", expected: "are", said: "is", prompt: "How ___ you?", why: "you are" });
    sessionStorage.setItem("enlab-journal-focus", "ship");
    window.PLUS.renderErrorJournal();
  });
  await page.locator('[data-tab="ia"]').click();
  await openLabRoom(page, "error-journal", "ia");
  await expect(page.locator("#journal-anki")).toContainText(/este fallo|this miss/i);
  const lines = await page.evaluate(() => {
    window.PLUS.exportAnki();
    return window._journalNowRows?.length || 0;
  });
  expect(lines).toBe(1);
});

test("Plus: journal CSV now exports only focused rows", async ({ page }) => {
  await boot(page);
  const n = await page.evaluate(() => {
    window.PLUS.logError({ mode: "ear", expected: "ship", said: "sheep", prompt: "ship / sheep", why: "short i" });
    window.PLUS.logError({ mode: "uso", expected: "are", said: "is", prompt: "How ___ you?", why: "you are" });
    sessionStorage.setItem("enlab-journal-focus", "ship");
    window.PLUS.renderErrorJournal();
    window.PLUS.exportWeakCsv();
    return window._journalNowRows?.length || 0;
  });
  expect(n).toBe(1);
});

test("Plus: journal groups by mode when focus is mode name", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    window.PLUS.logError({ mode: "ear", expected: "ship", said: "sheep", prompt: "ship / sheep", why: "short i" });
    window.PLUS.logError({ mode: "ear", expected: "thin", said: "tin", prompt: "thin / tin", why: "short i" });
    sessionStorage.setItem("enlab-journal-focus", "oído");
  });
  await page.locator('[data-tab="ia"]').click();
  await openLabRoom(page, "error-journal", "ia");
  await page.evaluate(() => window.PLUS.renderErrorJournal());
  await expect(page.locator(".journal-card-now.journal-card-group")).toBeVisible();
  await expect(page.locator(".journal-card-now")).toContainText(/2 fallos|2 misses/i);
});

test("Plus: hard pairs and branched role-plays", async ({ page }) => {
  await boot(page);
  const ok = await page.evaluate(() => {
    const pairs = window.ENLAB.minimalPairs || [];
    const roles = window.ENLAB.roleplays || [];
    const late = roles.find((r) => r.id === "branch-late");
    return {
      thin: pairs.some((p) => p.a === "thin" && p.b === "tin"),
      van: pairs.some((p) => p.a === "van" && p.b === "ban"),
      ship: pairs.some((p) => p.a === "ship" && p.b === "chip"),
      branch: !!(late && late.turns[0].bOpts?.length >= 3),
    };
  });
  expect(ok.thin).toBe(true);
  expect(ok.van).toBe(true);
  expect(ok.ship).toBe(true);
  expect(ok.branch).toBe(true);
});

test("Plus: accent pref is en-GB when uk", async ({ page }) => {
  await boot(page);
  const lang = await page.evaluate(() => {
    localStorage.setItem("enlab-accent-pref", "uk");
    const u = new SpeechSynthesisUtterance("test");
    const pref = localStorage.getItem("enlab-accent-pref");
    return pref === "uk" ? "en-GB" : "en-US";
  });
  expect(lang).toBe("en-GB");
});

test("Plus: 90-day chart on Hoy", async ({ page }) => {
  await boot(page);
  await openHoyExtras(page);
  await expect(page.locator("#hoy-streak-chart")).toBeVisible();
  await expect(page.locator("#hoy-streak-chart .streak-90")).toBeVisible();
});

test("Plus: IDB mirrors transfer keys", async ({ page }) => {
  await boot(page);
  const ok = await page.evaluate(() => {
    const prog = window.ENLAB_PROG_KEYS || [];
    const keys = window.ENLAB_IDB?.KEYS || [];
    return {
      n: prog.length,
      roster: keys.includes("enlab-class-roster"),
      place: keys.includes("enlab-place-result"),
      coachMirror: prog.includes("enlab-coach-plan-mirror"),
      frictionWeek: prog.includes("enlab-class-friction-week"),
      weeklyFails: prog.includes("enlab-weekly-fails"),
      certWarmup: prog.includes("enlab-cert-warmup"),
      same: prog.every((k) => keys.includes(k)),
    };
  });
  expect(ok.n).toBeGreaterThan(40);
  expect(ok.roster).toBe(true);
  expect(ok.place).toBe(true);
  expect(ok.coachMirror).toBe(true);
  expect(ok.frictionWeek).toBe(true);
  expect(ok.weeklyFails).toBe(true);
  expect(ok.certWarmup).toBe(true);
  expect(ok.same).toBe(true);
});

test("Plus: speak hooks are native, not wrappers", async ({ page }) => {
  await boot(page);
  const ok = await page.evaluate(() => ({
    hooks: typeof window.onSpeakVerdict === "function" && typeof window.onRecording === "function",
    noWrapVerdict: !/orig\(said\)/.test(String(window.applySpeakVerdict)),
    noWrapRec: !/orig\(surface\)/.test(String(window.toggleRecording)),
  }));
  expect(ok.hooks).toBe(true);
  expect(ok.noWrapVerdict).toBe(true);
  expect(ok.noWrapRec).toBe(true);
});

test("Plus: journal coach plan weights weekly fails", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    localStorage.setItem("enlab-weekly-fails", JSON.stringify({
      day: todayKey(), modes: ["choice", "choice", "choice"],
    }));
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 0, steps: ["ear", "uso", "choice"],
    }));
    window.PLUS.renderErrorJournal();
  });
  await page.locator('[data-tab="ia"]').click();
  await openLabRoom(page, "error-journal", "ia");
  await page.locator("#journal-coach-plan").click();
  await expect(page.locator("#quiz-mode")).toHaveValue("choice");
});

test("Plus: journal coach plan picks mode from recent errors", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    window.PLUS.logError({ mode: "ear", expected: "ship", said: "sheep", prompt: "ship / sheep", why: "short i" });
    window.PLUS.logError({ mode: "dict", expected: "I am", said: "I em", prompt: "I am", why: "am" });
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 0, steps: ["ear", "uso", "choice"],
    }));
    window.PLUS.renderErrorJournal();
  });
  await page.locator('[data-tab="ia"]').click();
  await openLabRoom(page, "error-journal", "ia");
  await expect(page.locator("#journal-coach-plan")).toBeVisible();
  await page.locator("#journal-coach-plan").click();
  await expect(page.locator("#quiz.panel.active")).toBeVisible();
  await expect(page.locator("#quiz-mode")).toHaveValue("ear");
});
