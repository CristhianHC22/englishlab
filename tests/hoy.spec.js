const { test, expect } = require("@playwright/test");
const { boot, openHoyExtras, revealInFolds } = require("./helpers/boot");

test("Hoy: path, situations, class task, offline badge", async ({ page }) => {
  await boot(page);
  await expect(page.locator("#hoy-path")).toBeVisible();
  await openHoyExtras(page);
  await expect(page.locator("#situations-panel")).toBeVisible();
  await expect(page.locator("#offline-badge")).toBeVisible();
  await expect(page.locator("#net-warn")).toBeHidden();
  await page.locator(".hoy-next").first().click();
  await expect(page.locator("#daily-pairs .card").first()).toBeVisible();
  await expect(page.locator("body")).toHaveClass(/session-focus/);
  await expect(page.locator("#level-bar")).toBeHidden();
});

test("Hoy: net-warn before YouGlish when offline", async ({ page, context }) => {
  await boot(page);
  await expect(page.locator("#net-warn")).toBeHidden();
  await context.setOffline(true);
  await page.evaluate(() => { if (typeof syncNetWarn === "function") syncNetWarn(); });
  await expect(page.locator("#net-warn")).toBeVisible();
  await expect(page.locator("#net-warn")).toContainText(/Sin red|offline/i);
  await expect(page.locator("body")).toHaveClass(/is-offline/);
  await context.setOffline(false);
  await page.evaluate(() => { if (typeof syncNetWarn === "function") syncNetWarn(); });
  await expect(page.locator("#net-warn")).toBeHidden();
});

test("Hoy: 25+ situation keys", async ({ page }) => {
  await boot(page);
  const n = await page.evaluate(() => Object.keys(window.ENLAB.phrasesSituation || {}).length);
  expect(n).toBeGreaterThanOrEqual(25);
});

test("Hoy: continue story chip when in progress", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const s = (window.ENLAB.branchStories || [])[0];
    if (!s) return;
    localStorage.setItem("enlab-story-progress", JSON.stringify({
      [s.id]: { node: s.start, path: [s.start], vocab: [], at: Date.now() },
    }));
  });
  await page.reload();
  await page.waitForFunction(
    () => typeof window.SV?.renderHoyStoryChip === "function" && (window.ENLAB?.branchStories || []).length >= 1,
    { timeout: 90000 },
  );
  await page.evaluate(() => window.SV.renderHoyStoryChip());
  await expect(page.locator("#hoy-story-chip")).toBeVisible();
  await expect(page.locator("[data-story-resume]")).toBeVisible();
});

test("Hoy: day-marked card after the path", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const s = document.createElement("script");
    s.textContent = "hoyPathI = hoyPath().length; persistHoyPath(); renderHoyPath();";
    document.documentElement.appendChild(s);
  });
  await expect(page.locator("#hoy-done")).toBeVisible();
  await expect(page.locator("#hoy-done")).toContainText(/Día marcado|Day marked/i);
  await expect(page.locator("#hoy-done-streak")).toContainText(/Racha|Streak/i);
  await expect(page.locator("[data-quiz-now]")).toBeVisible();
  await expect(page.locator("[data-hoy-repeat]")).toBeVisible();
  await expect(page.locator("#hoy-step-1")).toBeHidden();
  await expect(page.locator("#you-are-text")).toContainText(/ya está|path is done|Última sala|Last room/i);
});

test("Hoy: story chip moves to day-marked when path is done", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const s = (window.ENLAB.branchStories || [])[0];
    if (!s) return;
    localStorage.setItem("enlab-story-progress", JSON.stringify({
      [s.id]: { node: s.start, path: [s.start], vocab: [], at: Date.now() },
    }));
    hoyPathI = hoyPath().length;
    persistHoyPath();
    renderHoyPath();
    if (window.SV?.renderHoyStoryChip) window.SV.renderHoyStoryChip();
  });
  await expect(page.locator("#hoy-done-story [data-story-resume]")).toBeVisible();
  await expect(page.locator("#hoy-story-chip")).toBeHidden();
});

test("Hoy: unfinished cierre offers Continue in Today extras", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const items = makeCierreItems();
    sessionStorage.setItem("enlab-cierre-now", JSON.stringify({
      day: todayKey(), i: 1, score: 1, fails: [], items,
    }));
    if (typeof renderCierreToday === "function") renderCierreToday();
  });
  await openHoyExtras(page);
  await expect(page.locator("#cierre-today")).toBeVisible();
  await expect(page.locator("[data-cierre-resume]")).toBeVisible();
  await page.locator("[data-cierre-resume]").click();
  await expect(page.locator("#hoy-cierre-box")).toHaveClass(/cierre-live/);
  await expect(page.locator("#hoy-cierre-box")).toContainText(/Pregunta 2 de|Question 2 of/i);
});

test("Hoy: you-are shows last Oír room when day is marked", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    localStorage.setItem("enlab-oido-last", JSON.stringify({
      id: "oido-decidir", at: Date.now(), day: todayKey(),
    }));
    hoyPathI = hoyPath().length;
    persistHoyPath();
    renderHoyPath();
    if (typeof fillYouAre === "function") fillYouAre();
  });
  await expect(page.locator("#you-are-text")).toContainText(/Decidir|Listen to decide/i);
});

test("Hoy: kids shadow Stop hides Again until leaving the pairs step", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    localStorage.setItem("enlab-kids", "1");
    if (typeof applyKidsMode === "function") applyKidsMode();
    speak = function () {};
    const i = hoyPath().findIndex((x) => x.id === "pairs");
    goHoyStep(i);
    runHoyPairShadow();
  });
  await page.locator("[data-hoy-shadow-stop]").click();
  await expect(page.locator("[data-hoy-shadow-again]")).toBeHidden();
});

test("Hoy: path verb step is one verb, not the whole deck", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const s = document.createElement("script");
    s.textContent = "const i = hoyPath().findIndex((x) => x.id === 'verbs'); goHoyStep(i);";
    document.documentElement.appendChild(s);
    s.remove();
  });
  await expect(page.locator("#hoy-step-3")).toBeVisible();
  await expect(page.locator("#daily-verbs .quiz-q")).toBeVisible();
  await expect(page.locator("#daily-verbs [data-go-tab='verbos']")).toBeVisible();
});

test("Hoy: hearing the path verb lights up Next", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const s = document.createElement("script");
    s.textContent = "const i = hoyPath().findIndex((x) => x.id === 'verbs'); goHoyStep(i);";
    document.documentElement.appendChild(s);
    s.remove();
  });
  const say = page.locator("#daily-verbs .say").first();
  await expect(say).toHaveClass(/next-act/);
  await say.click();
  await expect(page.locator(".hoy-path-foot .hoy-next")).toHaveClass(/next-act/);
});

test("Hoy: cierre is one question at a time, not a game scoreboard", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const s = document.createElement("script");
    s.textContent = "const i = hoyPath().findIndex((x) => x.id === 'cierre'); goHoyStep(i);";
    document.documentElement.appendChild(s);
    s.remove();
  });
  await expect(page.locator("#hoy-cierre-box")).toHaveClass(/cierre-live/);
  await expect(page.locator("#hoy-cierre-box .cierre-kicker")).toBeVisible();
  await expect(page.locator("#hoy-cierre-box")).toContainText(/Pregunta 1 de|Question 1 of/i);
  await expect(page.locator("#you-are-text")).toContainText(/Pregunta 1 de|Question 1 of/i);
  await expect(page.locator("#hoy-cierre-box")).not.toContainText(/Aciertos|Score /i);
  await expect(page.locator(".hoy-path-foot .hoy-next")).toContainText(/Responde esta|Answer this/i);
});

test("Hoy: hearing a path pair lights up Next", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const s = document.createElement("script");
    s.textContent = "const i = hoyPath().findIndex((x) => x.id === 'pairs'); goHoyStep(i);";
    document.documentElement.appendChild(s);
    s.remove();
  });
  const say = page.locator("#daily-pairs .say").first();
  await expect(say).toHaveClass(/next-act/);
  await say.click();
  await expect(page.locator(".hoy-path-foot .hoy-next")).toHaveClass(/next-act/);
  const footFocused = await page.evaluate(() => document.activeElement?.matches?.(".hoy-path-foot .hoy-next"));
  expect(footFocused).toBeFalsy();
  await expect(page.locator(".hoy-path-foot .hoy-next")).toHaveAttribute("aria-live", "polite");
});

test("Hoy: finishing the 3 marks the day without reopening steps", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const s = document.createElement("script");
    s.textContent = "const i = hoyPath().findIndex((x) => x.id === 'cierre'); goHoyStep(i); quiz.i = quiz.items.length; renderQuiz();";
    document.documentElement.appendChild(s);
    s.remove();
  });
  await expect(page.locator("#hoy-done")).toBeVisible();
  await expect(page.locator("#hoy-done-cierre")).toBeVisible();
  await expect(page.locator("#hoy-done-cierre")).toContainText(/\d+\s*\/\s*\d+/);
  await expect(page.locator("#hoy-step-1")).toBeHidden();
  await expect(page.locator("#hoy-step-cierre")).toBeHidden();
  await expect(page.locator("body")).not.toHaveClass(/session-focus/);
});

test("Hoy: cierre miss names the next kind", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const s = document.createElement("script");
    s.textContent = "const i = hoyPath().findIndex((x) => x.id === 'cierre'); goHoyStep(i); quizMarkFail(quiz.items[quiz.i]?.inf || 'go');";
    document.documentElement.appendChild(s);
    s.remove();
  });
  await expect(page.locator(".cierre-next-hint")).toBeVisible();
  await expect(page.locator(".cierre-next-hint")).toContainText(/Sigue aquí|Next:/i);
});

test("Hoy: hear A lights up Record B", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const s = document.createElement("script");
    s.textContent = "const i = hoyPath().findIndex((x) => x.id === 'dialog'); goHoyStep(i);";
    document.documentElement.appendChild(s);
    s.remove();
  });
  await expect(page.locator("[data-hoy-hear='a']")).toBeVisible();
  await expect(page.locator("[data-hoy-hear='a']")).toHaveClass(/next-act/);
  await page.locator("[data-hoy-hear='a']").click();
  await expect(page.locator("#hoy-speak-rec")).toHaveClass(/next-act/);
  await page.evaluate(() => {
    const s = document.createElement("script");
    s.textContent = "recState.surface = 'hoy'; fireRecording('stop');";
    document.documentElement.appendChild(s);
    s.remove();
  });
  await expect(page.locator("#hoy-speak-rec")).not.toHaveClass(/next-act/);
  await expect(page.locator(".hoy-path-foot .hoy-next")).toHaveClass(/next-act/);
});

test("Hoy: day-marked offers the missed verb", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const s = document.createElement("script");
    s.textContent = `sessionStorage.setItem("enlab-cierre-result", JSON.stringify({
      day: todayKey(), score: 2, n: 3, fails: 1, verbFail: "go"
    })); hoyPathI = hoyPath().length; persistHoyPath(); renderHoyPath();`;
    document.documentElement.appendChild(s);
    s.remove();
  });
  await expect(page.locator("#hoy-done-verbs")).toBeVisible();
  await page.locator("#hoy-done-verbs").click();
  await expect(page.locator("#verbos")).toBeVisible();
  await expect(page.locator("#verb-today")).toContainText(/go/i);
});

test("Hoy: day-marked ear miss opens that game", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const s = document.createElement("script");
    s.textContent = `sessionStorage.setItem("enlab-cierre-result", JSON.stringify({
      day: todayKey(), score: 2, n: 3, fails: 1, earFail: "ship"
    })); hoyPathI = hoyPath().length; persistHoyPath(); renderHoyPath();`;
    document.documentElement.appendChild(s);
    s.remove();
  });
  await expect(page.locator("#hoy-done-ear")).toBeVisible();
  await page.locator("#hoy-done-ear").click();
  await expect(page.locator("#quiz")).toBeVisible();
  await expect(page.locator("#quiz")).toHaveClass(/lab-in/);
  await expect(page.locator("#quiz-box .quiz-q, #quiz-box .choices button").first()).toBeVisible();
});

test("Hoy: denied mic does not light up Next", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(Object.assign(new Error("denied"), { name: "NotAllowedError" }));
    const s = document.createElement("script");
    s.textContent = "const i = hoyPath().findIndex((x) => x.id === 'dialog'); goHoyStep(i);";
    document.documentElement.appendChild(s);
    s.remove();
  });
  await expect(page.locator("#hoy-speak-rec")).toBeVisible();
  await page.locator("#hoy-speak-rec").click();
  await expect(page.locator("#voice-warn")).toBeVisible();
  await expect(page.locator(".hoy-path-foot .hoy-next")).not.toHaveClass(/next-act/);
});

test("Hoy: flap hear lights up Next when that step exists", async ({ page }) => {
  await boot(page);
  const has = await page.evaluate(() => hoyPath().some((x) => x.id === "flap"));
  if (!has) return;
  await page.evaluate(() => {
    const s = document.createElement("script");
    s.textContent = "const i = hoyPath().findIndex((x) => x.id === 'flap'); goHoyStep(i);";
    document.documentElement.appendChild(s);
    s.remove();
  });
  await expect(page.locator("#hoy.panel.active")).toBeVisible();
  const say = page.locator("#hoy-rhythm-list .say").first();
  await expect(say).toHaveClass(/next-act/);
  await say.click();
  await expect(page.locator(".hoy-path-foot .hoy-next")).toHaveClass(/next-act/);
});

test("Hoy: Hear B does not light up Record", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const s = document.createElement("script");
    s.textContent = "const i = hoyPath().findIndex((x) => x.id === 'dialog'); goHoyStep(i);";
    document.documentElement.appendChild(s);
    s.remove();
  });
  await expect(page.locator("[data-hoy-hear='b']")).toBeVisible();
  await page.locator("[data-hoy-hear='b']").click();
  await expect(page.locator("#hoy-speak-rec")).not.toHaveClass(/next-act/);
});

test("Hoy: kids day-marked keeps miss and repeat", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    localStorage.setItem("enlab-kids", "1");
    if (typeof applyKidsMode === "function") applyKidsMode();
    const s = document.createElement("script");
    s.textContent = `sessionStorage.setItem("enlab-cierre-result", JSON.stringify({
      day: todayKey(), score: 2, n: 3, fails: 1, verbFail: "go"
    })); hoyPathI = hoyPath().length; persistHoyPath(); renderHoyPath();`;
    document.documentElement.appendChild(s);
    s.remove();
  });
  await expect(page.locator("#hoy-done")).toBeVisible();
  await expect(page.locator("[data-hoy-repeat]")).toBeVisible();
  await expect(page.locator("#hoy-done-verbs")).toBeVisible();
  await expect(page.locator("#hoy-done [data-quiz-now]")).toBeHidden();
  await expect(page.locator("#hoy-done [data-go-tab='vocales']")).toBeHidden();
});

test("Hoy: marking the day pauses the 15 min timer", async ({ page }) => {
  await boot(page);
  const running = await page.evaluate(() => {
    persistTimer({ running: true, remaining: 90, until: Date.now() + 90000 });
    if (typeof startTimerLoop === "function") startTimerLoop();
    const s = document.createElement("script");
    s.textContent = "hoyPathI = hoyPath().length; persistHoyPath(); finishHoyPath();";
    document.documentElement.appendChild(s);
    s.remove();
    return timerState().running;
  });
  expect(running).toBe(false);
  await expect(page.locator("#hoy-done-timer")).toBeVisible();
  await expect(page.locator("#hoy-done-timer")).toContainText(/Seguir|Continue/i);
  await page.locator("#hoy-done-timer").click();
  const resumed = await page.evaluate(() => timerState().running);
  expect(resumed).toBe(true);
  await expect(page.locator("#hoy.path-done")).toBeVisible();
  await expect(page.locator("#hoy-done-timer")).toContainText(/Pausar|Pause/i);
});

test("Hoy: day-marked timer at 0 offers another 15 min without restarting the path", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    persistTimer({ running: false, remaining: 0, until: 0 });
    const s = document.createElement("script");
    s.textContent = "hoyPathI = hoyPath().length; persistHoyPath(); finishHoyPath();";
    document.documentElement.appendChild(s);
    s.remove();
  });
  await expect(page.locator("#hoy-done-timer")).toBeVisible();
  await expect(page.locator("#hoy-done-timer")).toContainText(/Otro 15|Another 15/i);
  await page.locator("#hoy-done-timer").click();
  const running = await page.evaluate(() => timerState().running);
  expect(running).toBe(true);
  await expect(page.locator("#hoy.path-done")).toBeVisible();
  await expect(page.locator("#hoy-step-1")).toBeHidden();
  await expect(page.locator("#you-are-text")).toContainText(/Sesión extra|Extra session/i);
});

test("Hoy: pair shadowing Stop leaves the pair and cues the footer", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const s = document.createElement("script");
    s.textContent = `
      speak = function () {};
      const i = hoyPath().findIndex((x) => x.id === "pairs");
      goHoyStep(i);
      runHoyPairShadow();
    `;
    document.documentElement.appendChild(s);
    s.remove();
  });
  await expect(page.locator("[data-hoy-shadow-stop]")).toBeVisible();
  await page.locator("[data-hoy-shadow-stop]").click();
  await expect(page.locator("#hoy-shadow-status")).toContainText(/parado|stopped/i);
  await expect(page.locator(".hoy-path-foot .hoy-next")).toHaveClass(/next-act/);
  await expect(page.locator("[data-hoy-shadow-again]")).toBeHidden();
});

test("Hoy: flap step hidden when not in today's path", async ({ page }) => {
  await boot(page);
  const flapAttr = await page.evaluate(() => {
    const hasFlap = hoyPath().some((s) => s.id === "flap");
    const el = document.getElementById("hoy-step-flap");
    return { hasFlap, hidden: el?.hasAttribute("hidden") };
  });
  if (flapAttr.hasFlap) expect(flapAttr.hidden).toBe(false);
  else expect(flapAttr.hidden).toBe(true);
});

test("Hoy: extras copy transfer shows tail on status line", async ({ page }) => {
  await boot(page);
  await openHoyExtras(page);
  await revealInFolds(page, "#transfer-copy");
  await page.locator("#transfer-copy").click();
  const code = await page.locator("#transfer-code").inputValue();
  expect(code.length).toBeGreaterThan(8);
  await expect(page.locator("#transfer-hoy-status")).toBeVisible();
  await expect(page.locator("#transfer-hoy-status")).toContainText(code.slice(-4));
});

test("Hoy: 4th pair names the next step before advancing", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const s = document.createElement("script");
    s.textContent = `
      const i = hoyPath().findIndex((x) => x.id === "pairs");
      goHoyStep(i);
      ["p1", "p2", "p3", "p4"].forEach((k) => markSession("pairs", k));
    `;
    document.documentElement.appendChild(s);
    s.remove();
  });
  const foot = page.locator(".hoy-path-foot .hoy-next");
  await expect(page.locator("#hoy-step-1")).toHaveClass(/path-now/);
  await expect(foot).toHaveClass(/next-act/);
  await expect(foot).toContainText(/Siguiente:|Next:/);
  await expect(page.locator("#hoy-step-1")).not.toHaveClass(/path-now/, { timeout: 2000 });
});

test("Hoy: pair shadowing loops one pair until Next, then Again", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const s = document.createElement("script");
    s.textContent = `
      speak = function () {};
      const i = hoyPath().findIndex((x) => x.id === "pairs");
      goHoyStep(i);
      runHoyPairShadow();
    `;
    document.documentElement.appendChild(s);
    s.remove();
  });
  await expect(page.locator("[data-hoy-shadow-next]")).toBeVisible();
  await expect(page.locator("#hoy-shadow-status")).toContainText(/1\/4/);
  for (let n = 0; n < 4; n += 1) {
    await page.locator("[data-hoy-shadow-next]").click();
  }
  await expect(page.locator("[data-hoy-shadow-again]")).toBeVisible();
  await expect(page.locator("[data-hoy-shadow-again]")).toContainText(/Otra vez|Again/i);
});

test("Hoy: pausing extra timer clears the you-are kicker until resume", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const s = document.createElement("script");
    s.textContent = "hoyPathI = hoyPath().length; persistHoyPath(); finishHoyPath();";
    document.documentElement.appendChild(s);
    s.remove();
    sessionStorage.setItem("enlab-hoy-extra-timer", "1");
    persistTimer({ running: true, remaining: 600, until: Date.now() + 600000 });
    if (typeof startTimerLoop === "function") startTimerLoop();
    if (typeof fillYouAre === "function") fillYouAre();
  });
  await expect(page.locator("#you-are-text")).toContainText(/Sesión extra|Extra session/i);
  await page.locator("#hoy-done-timer").click();
  await expect(page.locator("#you-are-text")).not.toContainText(/Sesión extra|Extra session/i);
  await page.locator("#hoy-done-timer").click();
  await expect(page.locator("#you-are-text")).toContainText(/Sesión extra|Extra session/i);
});

test("Hoy: kids pair shadowing hides Next pair, keeps Stop", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    localStorage.setItem("enlab-kids", "1");
    if (typeof applyKidsMode === "function") applyKidsMode();
    speak = function () {};
    const i = hoyPath().findIndex((x) => x.id === "pairs");
    goHoyStep(i);
    runHoyPairShadow();
  });
  await expect(page.locator("[data-hoy-shadow-stop]")).toBeVisible();
  await expect(page.locator("[data-hoy-shadow-next]")).toBeHidden();
});

test("Hoy: extras QR click fills paste and shows tail", async ({ page }) => {
  await boot(page);
  await openHoyExtras(page);
  await revealInFolds(page, "#transfer-qr");
  await page.locator("#transfer-qr").click();
  const code = await page.locator("#transfer-code").inputValue();
  expect(code.length).toBeGreaterThan(16);
  await expect(page.locator("#transfer-paste")).toHaveValue(code);
  await expect(page.locator("#transfer-hoy-status")).toContainText(code.slice(-4));
});

test("Hoy: repaso and weekly", async ({ page }) => {
  await boot(page);
  await expect(page.locator("#repaso-quiz-btn")).toBeVisible();
  await expect(page.locator("#weekly-exam-btn")).toBeVisible();
});

test("Hoy: unfinished weekly offers Continue in Today extras", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const items = makeWeeklyExamItems();
    sessionStorage.setItem("enlab-weekly-now", JSON.stringify({
      week: weekStartKey(), i: 2, score: 2, fails: [], items,
    }));
    renderWeeklyToday();
  });
  await openHoyExtras(page);
  await expect(page.locator("#weekly-today")).toBeVisible();
  await page.locator("#weekly-today [data-weekly-resume]").click();
  await expect(page.locator("#quiz")).toHaveClass(/lab-in/);
  await expect(page.locator("#quiz-box")).toContainText(/3\s*\/\s*12|Pregunta 3|Question 3/i);
});

test("Hoy: unfinished placement offers Continue in Today extras", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const items = window.PLUS.makePlacementItems();
    localStorage.setItem("enlab-place-now", JSON.stringify({
      day: todayKey(), i: 3, score: 2, fails: [], items,
    }));
    window.PLUS.renderPlaceToday();
  });
  await openHoyExtras(page);
  await expect(page.locator("#place-today")).toBeVisible();
  await page.locator("[data-place-resume]").click();
  await expect(page.locator("#quiz")).toHaveClass(/lab-in/);
  await expect(page.locator("#quiz-box")).toContainText(/4\s*\/\s*20|Pregunta 4|Question 4/i);
});

test("Hoy: unfinished duo offers Continue in Today extras", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.setItem("enlab-duo-now", JSON.stringify({
      day: todayKey(),
      player: 2,
      scoreA: 1,
      scoreB: 0,
      turn: 2,
      scene: { type: "dialog", data: { title: "Test", turns: [{ a: "Hi", b: "Hello" }] } },
    }));
    window.NR.renderDuoToday();
  });
  await openHoyExtras(page);
  await expect(page.locator("#duo-today")).toBeVisible();
  await page.locator("#duo-today [data-duo-resume]").click();
  await expect(page.locator("#duo-now")).toContainText(/Jugador|Player 2/i);
});

test("Hoy: repaso mode shows kicker in you-are", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    if (typeof startRepasoMode === "function") startRepasoMode();
  });
  await expect(page.locator("#you-are-text")).toContainText(/repaso|Review mode/i);
});

test("Hoy: repaso mode adds kicker to Guide when open", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    if (typeof startRepasoMode === "function") startRepasoMode();
    if (typeof fillGuide === "function") fillGuide();
  });
  await expect(page.locator("#guide-why")).toContainText(/repaso|Review mode/i);
});

test("Hoy: cert time-up shows in you-are when day is marked", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    localStorage.setItem("enlab-cert-score", JSON.stringify({
      timeUp: true, day: todayKey(), score: 8, total: 24, pct: 33, pass: false,
    }));
    hoyPathI = hoyPath().length;
    persistHoyPath();
    finishHoyPath();
    if (typeof fillYouAre === "function") fillYouAre();
  });
  await expect(page.locator("#you-are-text")).toContainText(/certificado|certificate/i);
});

test("Hoy: weekly stale from last week shows hint in extras", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.setItem("enlab-weekly-stale", JSON.stringify({ week: "2000-01-01", i: 4, total: 12 }));
    renderWeeklyToday();
  });
  await openHoyExtras(page);
  await expect(page.locator("#weekly-today")).toContainText(/semana pasada|last week/i);
  await expect(page.locator("[data-weekly-resume]")).toBeHidden();
});

test("Hoy: weekly resume also in week report", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const items = makeWeeklyExamItems();
    sessionStorage.setItem("enlab-weekly-now", JSON.stringify({
      week: weekStartKey(), i: 1, score: 1, fails: [], items,
    }));
    renderWeekReport();
  });
  await expect(page.locator("#week-report [data-weekly-resume]")).toBeVisible();
});

test("Hoy: you-are shows mid-session line outside path", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const items = makeCierreItems();
    sessionStorage.setItem("enlab-cierre-now", JSON.stringify({
      day: todayKey(), i: 1, score: 1, fails: [], items,
    }));
    const hoy = document.querySelector("#hoy");
    hoy?.classList.remove("path-on", "path-done");
    if (typeof fillYouAre === "function") fillYouAre();
  });
  await expect(page.locator("#you-are-text")).toContainText(/Seguir cierre|Continue closing/i);
});

test("Hoy: repaso hides extras fold", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    if (typeof startRepasoMode === "function") startRepasoMode();
  });
  await expect(page.locator("body")).toHaveClass(/repaso-active/);
  await expect(page.locator("#hoy-extras")).toBeHidden();
});

test("Hoy: repaso pauses path timer and restores on exit", async ({ page }) => {
  await boot(page);
  const before = await page.evaluate(() => {
    const hoy = document.querySelector("#hoy");
    hoy?.classList.add("path-on");
    hoy?.classList.remove("path-done");
    persistTimer({ running: true, remaining: 600, until: Date.now() + 600000 });
    startRepasoMode();
    return {
      pausedFlag: sessionStorage.getItem("enlab-repaso-pause-path-timer"),
      repaso: repasoOn(),
    };
  });
  expect(before.pausedFlag).toBe("600");
  expect(before.repaso).toBe(true);
  await page.evaluate(() => clearRepasoMode());
  const after = await page.evaluate(() => ({
    running: timerState().running,
    remaining: remainingNow(),
  }));
  expect(after.running).toBe(true);
  expect(after.remaining).toBeGreaterThan(500);
});

test("Hoy: cert retry chip in you-are opens cert exam", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    localStorage.setItem("enlab-cert-score", JSON.stringify({
      timeUp: true, day: todayKey(), score: 8, total: 24, pct: 33, pass: false,
    }));
    hoyPathI = hoyPath().length;
    persistHoyPath();
    finishHoyPath();
    if (typeof fillYouAre === "function") fillYouAre();
  });
  await expect(page.locator("#you-are-chips [data-cert-retry]")).toBeVisible();
  await page.locator("#you-are-chips [data-cert-retry]").click();
  await expect(page.locator("#quiz")).toHaveClass(/lab-in/);
  await expect(page.locator("#quiz-box")).toBeVisible();
});

test("Hoy: done mid-session chips for cierre weekly place", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const cierre = makeCierreItems();
    const weekly = makeWeeklyExamItems();
    const place = window.PLUS.makePlacementItems();
    sessionStorage.setItem("enlab-cierre-now", JSON.stringify({
      day: todayKey(), i: 1, score: 1, fails: [], items: cierre,
    }));
    sessionStorage.setItem("enlab-weekly-now", JSON.stringify({
      week: weekStartKey(), i: 2, score: 1, fails: [], items: weekly,
    }));
    localStorage.setItem("enlab-place-now", JSON.stringify({
      day: todayKey(), i: 3, score: 2, fails: [], items: place,
    }));
    hoyPathI = hoyPath().length;
    persistHoyPath();
    finishHoyPath();
    renderHoyPath();
  });
  await expect(page.locator("#hoy-done-mid [data-cierre-resume]")).toBeVisible();
  await expect(page.locator("#hoy-done-mid [data-weekly-resume]")).toBeVisible();
  await expect(page.locator("#hoy-done-mid [data-place-resume]")).toBeVisible();
});

test("Hoy: podcast-today shows other podcast resume banner", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const list = (window.ENLAB.podcasts || []).filter((p) => (p.min || 1) <= lvlNum());
    const other = list[1] || list[0];
    localStorage.setItem("enlab-podcast-now", JSON.stringify({
      id: other.id, seg: 1, day: todayKey(), at: Date.now(),
    }));
    renderPodcastToday();
  });
  await openHoyExtras(page);
  await expect(page.locator("#podcast-today .podcast-other-resume [data-podcast]")).toBeVisible();
});
