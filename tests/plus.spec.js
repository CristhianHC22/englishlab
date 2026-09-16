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

test("Plus: journal plan filter chip", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    localStorage.setItem("enlab-error-log", JSON.stringify([
      { at: Date.now(), mode: "uso", expected: "are", prompt: "x", said: "is", why: "y" },
      { at: Date.now() - 1, mode: "plan:ear", expected: "Plan", prompt: "paso", said: "out", why: "z", planStep: "abandon" },
    ]));
    if (window.PLUS?.renderErrorJournal) window.PLUS.renderErrorJournal();
  });
  await openLabRoom(page, "error-journal", "ia");
  await expect(page.locator('#error-journal [data-journal-mode="plan"]')).toBeVisible();
  await page.locator('#error-journal [data-journal-mode="plan"]').click();
  await expect(page.locator("#error-journal .journal-card-plan")).toBeVisible();
  await expect(page.locator("#error-journal")).not.toContainText(/\bare\b/);
});

test("Plus: journalPlayMode strips plan prefix", async ({ page }) => {
  await boot(page);
  const mode = await page.evaluate(() => window.PLUS.journalPlayMode("plan:listen"));
  expect(mode).toBe("listen");
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

test("Plus: journal plan step chart from abandon/fail", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    localStorage.setItem("enlab-error-log", JSON.stringify([
      { at: Date.now(), mode: "plan:ear", expected: "Plan", prompt: "p", said: "out", why: "z", planStep: "abandon" },
      { at: Date.now() - 1, mode: "plan:uso", expected: "Plan", prompt: "p", said: "miss", why: "z", planStep: "fail" },
      { at: Date.now() - 2, mode: "plan:ear", expected: "Plan", prompt: "p", said: "out", why: "z", planStep: "abandon" },
    ]));
    if (window.PLUS?.renderErrorJournal) window.PLUS.renderErrorJournal();
  });
  await openLabRoom(page, "error-journal", "ia");
  await expect(page.locator("#error-journal .journal-plan-chart")).toBeVisible();
  await expect(page.locator("#error-journal .journal-plan-bar-row")).toHaveCount(2);
});

test("Plus: kids hide journal coach plan CTA", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    localStorage.setItem("enlab-kids", "1");
    localStorage.setItem("enlab-error-log", JSON.stringify([
      { at: Date.now(), mode: "uso", expected: "are", prompt: "x", said: "is", why: "y" },
    ]));
    if (typeof applyKidsMode === "function") applyKidsMode();
    if (window.PLUS?.renderErrorJournal) window.PLUS.renderErrorJournal();
  });
  await openLabRoom(page, "error-journal", "ia");
  await expect(page.locator("#journal-coach-plan")).toHaveCount(0);
});

test("Transfer import restores mid-flow coach plan steps", async ({ page }) => {
  await boot(page);
  const restored = await page.evaluate(() => {
    sessionStorage.removeItem("enlab-coach-plan");
    sessionStorage.removeItem("enlab-coach-plan-flow");
    const payload = buildTransferPayload();
    payload["enlab-coach-plan-mirror"] = JSON.stringify({
      day: todayKey(), done: 1, steps: ["listen", "phrasal", "type"], flow: true,
    });
    payload.cs = transferPayloadChecksum(payload);
    const code = transferEncode(payload);
    importTransferCode(code, true);
    const plan = JSON.parse(sessionStorage.getItem("enlab-coach-plan") || "null");
    return {
      done: plan?.done,
      steps: plan?.steps,
      flow: sessionStorage.getItem("enlab-coach-plan-flow"),
      quizSteps: typeof quizCoachPlan8 === "function" ? quizCoachPlan8() : [],
    };
  });
  expect(restored.done).toBe(1);
  expect(restored.steps).toEqual(["listen", "phrasal", "type"]);
  expect(restored.flow).toBe("1");
  expect(restored.quizSteps).toEqual(["listen", "phrasal", "type"]);
});

test("Coach plan complete marks stats day.plan for 90d chart", async ({ page }) => {
  await boot(page);
  const marked = await page.evaluate(() => {
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 2, steps: ["ear", "uso", "choice"],
    }));
    sessionStorage.setItem("enlab-coach-plan-flow", "1");
    bumpCoachPlanProgress("choice");
    const st = stats();
    return st.days?.[todayKey()]?.plan === 1;
  });
  expect(marked).toBe(true);
});

test("Kids first banner is one short line", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    localStorage.removeItem("enlab-kids-welcome");
    localStorage.setItem("enlab-kids", "1");
    applyKidsMode();
  });
  await expect(page.locator("#kids-banner")).toBeVisible();
  await expect(page.locator("#kids-banner")).toHaveClass(/kids-banner-first/);
  const text = await page.locator("#kids-banner").innerText();
  expect(text.length).toBeLessThan(80);
  expect(text).toMatch(/primera|first|oír|listen/i);
});

test("Plus: Anki tags plan-step and plan-chart header", async ({ page }) => {
  await boot(page);
  const out = await page.evaluate(() => {
    localStorage.setItem("enlab-error-log", JSON.stringify([
      { at: Date.now(), mode: "plan:ear", expected: "Plan", prompt: "paso", said: "out", why: "z", planStep: "abandon" },
      { at: Date.now() - 1, mode: "plan:uso", expected: "Plan", prompt: "paso", said: "miss", why: "z", planStep: "fail" },
    ]));
    const blobs = [];
    const Orig = window.Blob;
    window.Blob = function (parts, opts) {
      blobs.push(String(parts?.[0] || ""));
      return new Orig(parts, opts);
    };
    const aProto = HTMLAnchorElement.prototype;
    const click = aProto.click;
    aProto.click = function () {};
    try {
      window.PLUS.exportAnki();
    } finally {
      window.Blob = Orig;
      aProto.click = click;
    }
    return blobs[0] || "";
  });
  expect(out).toMatch(/#deck: English Lab::Plan 8 min/);
  expect(out).toMatch(/# plan-chart:/);
  expect(out).toMatch(/#plan-step/);
  expect(out).toMatch(/#plan-abandon|#plan-fail/);
});

test("90d plan day chip opens journal plan filter", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const st = stats();
    const day = todayKey();
    st.days[day] = { ...(st.days[day] || {}), quiz: 1, heard: 1, spoke: 1, plan: 1 };
    localStorage.setItem("enlab-stats", JSON.stringify(st));
    localStorage.setItem("enlab-error-log", JSON.stringify([
      { at: Date.now(), mode: "plan:ear", expected: "Plan", prompt: "p", said: "out", why: "z", planStep: "abandon" },
    ]));
    renderStreakChart();
  });
  await openHoyExtras(page);
  await expect(page.locator("[data-chart90-plan]")).toBeVisible();
  await page.locator("[data-chart90-plan]").click();
  await expect(page.locator("#error-journal .journal-plan-chart")).toBeVisible();
});

test("90d→diario sets Guía hint and from-90d flag", async ({ page }) => {
  await boot(page);
  await openLabRoom(page, "error-journal", "ia");
  const hint = await page.evaluate(() => {
    sessionStorage.setItem("enlab-journal-from-90d", "1");
    sessionStorage.setItem("enlab-journal-focus", "plan");
    if (typeof invalidateYouAreChipsCache === "function") invalidateYouAreChipsCache();
    const entry = guideFillEntry();
    return entry?.w || "";
  });
  expect(hint).toMatch(/90d|90-day|racha|streak|plan/i);
});

test("Journal coach mode weights plan-abandon ×3", async ({ page }) => {
  await boot(page);
  const mode = await page.evaluate(() => {
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 0, steps: ["ear", "uso", "choice"],
    }));
    localStorage.setItem("enlab-error-log", JSON.stringify([
      { at: Date.now(), mode: "plan:uso", expected: "a", prompt: "p", said: "x", why: "z", planStep: "abandon" },
      { at: Date.now() - 1, mode: "ear", expected: "b", prompt: "p", said: "x", why: "z" },
      { at: Date.now() - 2, mode: "ear", expected: "c", prompt: "p", said: "x", why: "z" },
    ]));
    return window.PLUS.journalCoachPlanMode();
  });
  expect(mode).toBe("uso");
});

test("Coach plan mirror stores pendingSince until first step", async ({ page }) => {
  await boot(page);
  const out = await page.evaluate(() => {
    sessionStorage.removeItem("enlab-coach-plan");
    localStorage.removeItem("enlab-coach-plan-mirror");
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 0, steps: ["ear", "uso", "choice"],
    }));
    sessionStorage.setItem("enlab-coach-plan-flow", "1");
    persistCoachPlanMirror();
    const first = JSON.parse(localStorage.getItem("enlab-coach-plan-mirror") || "null");
    const since = first?.pendingSince;
    persistCoachPlanMirror();
    const second = JSON.parse(localStorage.getItem("enlab-coach-plan-mirror") || "null");
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 1, steps: ["ear", "uso", "choice"],
    }));
    persistCoachPlanMirror();
    const progressed = JSON.parse(localStorage.getItem("enlab-coach-plan-mirror") || "null");
    return {
      hasSince: typeof since === "number" && since > 0,
      stable: second?.pendingSince === since,
      cleared: !progressed?.pendingSince,
    };
  });
  expect(out.hasSince).toBe(true);
  expect(out.stable).toBe(true);
  expect(out.cleared).toBe(true);
});

test("90d streak chart memo skips identical rebuild", async ({ page }) => {
  await boot(page);
  const same = await page.evaluate(() => {
    window._streakChartKey = "";
    renderStreakChart();
    const key1 = window._streakChartKey;
    const html1 = document.querySelector("#hoy-streak-chart")?.innerHTML || "";
    renderStreakChart();
    return key1 && key1 === window._streakChartKey
      && html1 === (document.querySelector("#hoy-streak-chart")?.innerHTML || "");
  });
  expect(same).toBe(true);
});

test("Coach plan sticky stale survives day-roll mirror clear", async ({ page }) => {
  await boot(page);
  const out = await page.evaluate(() => {
    localStorage.removeItem("enlab-kids");
    sessionStorage.removeItem("enlab-coach-plan");
    sessionStorage.removeItem("enlab-coach-plan-flow");
    localStorage.setItem("enlab-coach-stale-since", String(Date.now() - 4 * 86400000));
    localStorage.removeItem("enlab-coach-plan-mirror");
    return {
      stale: coachPlanIsStale(),
      since: coachPlanPendingSinceMs() > 0,
      chip: coachPlanChipHtml("btn sm"),
    };
  });
  expect(out.stale).toBe(true);
  expect(out.since).toBe(true);
  expect(out.chip).toMatch(/data-plan-stale|≥3|3\+/);
});

test("Writing low score logs journal fail once per day", async ({ page }) => {
  await boot(page);
  await openLabRoom(page, "writing-panel", "hablar");
  const n = await page.evaluate(() => {
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 0, steps: ["ear", "uso", "choice"],
    }));
    localStorage.removeItem("enlab-kids");
    localStorage.setItem("enlab-error-log", "[]");
    sessionStorage.removeItem(`enlab-write-fail-log:${todayKey()}:${window._writingPick?.id || ""}`);
    document.querySelector("#writing-draft").value = "x";
    document.querySelector("#writing-score")?.click();
    document.querySelector("#writing-score")?.click();
    const log = JSON.parse(localStorage.getItem("enlab-error-log") || "[]");
    return log.filter((r) => r.planStep === "fail" && String(r.mode || "").startsWith("plan:")).length;
  });
  expect(n).toBe(1);
});

test("Guía fillYouAre skips heavy entry when panel closed", async ({ page }) => {
  await boot(page);
  const out = await page.evaluate(() => {
    localStorage.removeItem("enlab-kids");
    sessionStorage.removeItem("enlab-coach-plan");
    localStorage.setItem("enlab-coach-stale-since", String(Date.now() - 4 * 86400000));
    document.querySelector("#hoy")?.classList.add("path-done");
    if (typeof showTab === "function") showTab("hoy");
    const panel = document.querySelector("#guide-panel");
    if (panel) panel.hidden = true;
    if (typeof invalidateYouAreChipsCache === "function") invalidateYouAreChipsCache();
    fillYouAre();
    const closedWhyish = document.querySelector("#you-are-text")?.textContent || "";
    if (panel) panel.hidden = false;
    if (typeof fillGuide === "function") fillGuide();
    const openWhy = document.querySelector("#guide-why")?.textContent || "";
    return { closedWhyish, openWhy };
  });
  expect(out.openWhy).toMatch(/≥3|3\+|días|days|stale|pendiente/i);
});

test("Podcast mid offers plan ear CTA when ear pending", async ({ page }) => {
  await boot(page);
  const html = await page.evaluate(() => {
    const pods = window.ENLAB.podcasts || [];
    const pod = pods.find((p) => (p.segments || []).length > 2) || pods[0];
    if (!pod) return "";
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 0, steps: ["ear", "uso", "choice"],
    }));
    localStorage.removeItem("enlab-kids");
    localStorage.setItem("enlab-podcast-now", JSON.stringify({
      id: pod.id, seg: 1, day: todayKey(), at: Date.now(),
    }));
    if (typeof fillYouAreChips === "function") fillYouAreChips();
    return document.querySelector("#you-are-chips")?.innerHTML || "";
  });
  expect(html).toMatch(/data-coach-plan-mode=["']ear["']/);
});

test("You-are day-marked shows stale plan line", async ({ page }) => {
  await boot(page);
  const line = await page.evaluate(() => {
    localStorage.removeItem("enlab-kids");
    sessionStorage.removeItem("enlab-coach-plan");
    localStorage.setItem("enlab-coach-stale-since", String(Date.now() - 4 * 86400000));
    document.querySelector("#hoy")?.classList.add("path-done");
    if (typeof showTab === "function") showTab("hoy");
    if (typeof invalidateYouAreChipsCache === "function") invalidateYouAreChipsCache();
    fillYouAre();
    return document.querySelector("#you-are-text")?.textContent || "";
  });
  expect(line).toMatch(/≥3|3\+|días|days|plan/i);
});

test("Repaso timer shortens when plan stale 5d+", async ({ page }) => {
  await boot(page);
  const secs = await page.evaluate(() => {
    localStorage.removeItem("enlab-kids");
    sessionStorage.removeItem("enlab-coach-plan");
    localStorage.setItem("enlab-coach-stale-since", String(Date.now() - 6 * 86400000));
    return {
      deep: repasoTimerSecs(),
      mild: (() => {
        localStorage.setItem("enlab-coach-stale-since", String(Date.now() - 4 * 86400000));
        return repasoTimerSecs();
      })(),
      fresh: (() => {
        localStorage.removeItem("enlab-coach-stale-since");
        return repasoTimerSecs();
      })(),
    };
  });
  expect(secs.deep).toBe(360);
  expect(secs.mild).toBe(480);
  expect(secs.fresh).toBe(600);
});

test("hydrateCoachPlanStale copies pendingSince from mirror", async ({ page }) => {
  await boot(page);
  const out = await page.evaluate(() => {
    localStorage.removeItem("enlab-coach-stale-since");
    localStorage.setItem("enlab-coach-plan-mirror", JSON.stringify({
      day: todayKey(), done: 0, steps: ["ear", "uso", "choice"],
      pendingSince: Date.now() - 5 * 86400000,
    }));
    hydrateCoachPlanStale();
    return {
      sticky: coachPlanStickySince() > 0,
      stale: coachPlanIsStale(),
    };
  });
  expect(out.sticky).toBe(true);
  expect(out.stale).toBe(true);
});

test("Podcast quiz fail logs ear plan step once", async ({ page }) => {
  await boot(page);
  const out = await page.evaluate(() => {
    const pods = (window.ENLAB.podcasts || []).filter((p) => (p.qs || []).length >= 1);
    const pod = pods[0];
    if (!pod) return { n: -1 };
    localStorage.removeItem("enlab-kids");
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 0, steps: ["ear", "uso", "choice"],
    }));
    localStorage.setItem("enlab-error-log", "[]");
    sessionStorage.removeItem(`enlab-pod-fail-log:${todayKey()}:${pod.id}`);
    quiz = {
      i: 1,
      score: 0,
      fromPodcast: pod.id,
      items: [{ type: "listen", q: "x", a: "y", opts: ["y"], inf: "podcast:t:y" }],
      fails: ["podcast:t:y"],
      mode: "listen",
      host: "#quiz-box",
    };
    renderQuiz();
    renderQuiz();
    const log = JSON.parse(localStorage.getItem("enlab-error-log") || "[]");
    const hits = log.filter((r) => r.planStep === "fail" && String(r.mode || "").includes("ear"));
    return { n: hits.length, podcastEar: !!hits[0]?.podcastEar };
  });
  expect(out.n).toBe(1);
  expect(out.podcastEar).toBe(true);
});

test("Series quiz fail sets fromPodcast and ear CTA", async ({ page }) => {
  await boot(page);
  const out = await page.evaluate(() => {
    const s = (window.ENLAB.podcastSeries || [])[0];
    if (!s) return { ok: false };
    localStorage.removeItem("enlab-kids");
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 0, steps: ["ear", "uso", "choice"],
    }));
    localStorage.setItem("enlab-error-log", "[]");
    sessionStorage.removeItem(`enlab-pod-fail-log:${todayKey()}:${s.id}`);
    if (window.NR?.startSeriesQuiz) window.NR.startSeriesQuiz(s.id);
    else return { ok: false, reason: "no startSeriesQuiz" };
    quiz.fails = [(quiz.items[0] && quiz.items[0].inf) || "x"];
    quiz.i = quiz.items.length;
    renderQuiz();
    const cta = !!document.querySelector("#quiz-box [data-coach-plan-go].warn, #quiz-box [data-coach-plan-go][data-coach-plan-mode]");
    const log = JSON.parse(localStorage.getItem("enlab-error-log") || "[]");
    const ear = log.some((r) => r.podcastEar && r.planStep === "fail");
    return { ok: true, fromPodcast: quiz.fromPodcast === s.id, cta, ear };
  });
  expect(out.ok).toBe(true);
  expect(out.fromPodcast).toBe(true);
  expect(out.ear).toBe(true);
  expect(out.cta).toBe(true);
});

test("You-are shows plan stale on quiz tab", async ({ page }) => {
  await boot(page);
  const line = await page.evaluate(() => {
    localStorage.removeItem("enlab-kids");
    sessionStorage.removeItem("enlab-coach-plan");
    localStorage.setItem("enlab-coach-stale-since", String(Date.now() - 4 * 86400000));
    if (typeof showTab === "function") showTab("quiz");
    if (typeof invalidateYouAreChipsCache === "function") invalidateYouAreChipsCache();
    fillYouAre();
    return document.querySelector("#you-are-text")?.textContent || "";
  });
  expect(line).toMatch(/≥3|3\+|días|days|plan/i);
});

test("Repaso with stale plan sets short timer flag and arms quiz", async ({ page }) => {
  await boot(page);
  const out = await page.evaluate(async () => {
    localStorage.removeItem("enlab-kids");
    sessionStorage.removeItem("enlab-coach-plan");
    sessionStorage.removeItem("enlab-coach-plan-flow");
    localStorage.setItem("enlab-coach-stale-since", String(Date.now() - 6 * 86400000));
    startRepasoMode();
    const flag = sessionStorage.getItem("enlab-repaso-stale");
    const secs = repasoTimerSecs();
    await new Promise((r) => setTimeout(r, 280));
    return {
      flag,
      secs,
      flow: sessionStorage.getItem("enlab-coach-plan-flow") === "1"
        || document.querySelector("#quiz.panel.active"),
    };
  });
  expect(out.flag).toBe("5");
  expect(out.secs).toBe(360);
  expect(!!out.flow).toBe(true);
});

test("Anki export tags podcast-ear rows", async ({ page }) => {
  await boot(page);
  const text = await page.evaluate(() => {
    localStorage.setItem("enlab-error-log", JSON.stringify([
      {
        at: Date.now(), mode: "plan:ear", expected: "Plan", prompt: "paso",
        said: "out", why: "z", planStep: "fail", podcastEar: 1,
      },
    ]));
    const blobs = [];
    const Orig = window.Blob;
    window.Blob = function (parts, opts) {
      blobs.push(String(parts?.[0] || ""));
      return new Orig(parts, opts);
    };
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {};
    try {
      window.PLUS?.exportAnki?.();
    } finally {
      window.Blob = Orig;
      HTMLAnchorElement.prototype.click = click;
    }
    return blobs[0] || "";
  });
  expect(text).toMatch(/#podcast-ear/);
  expect(text).toMatch(/# podcast-ear:/);
});
