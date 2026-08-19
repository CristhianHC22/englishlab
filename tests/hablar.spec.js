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

test("Hablar: class task includes coach plan option", async ({ page }) => {
  await boot(page);
  await openLabRoom(page, "class-pro-panel", "ia");
  await expect(page.locator('#class-task-pick option[value="coach"]')).toHaveCount(1);
});

test("Hablar: class pro friction print button", async ({ page }) => {
  await boot(page);
  await openLabRoom(page, "class-pro-panel", "ia");
  await expect(page.locator("#class-friction-print")).toBeVisible();
});

test("Hablar: class pro shows friction column", async ({ page }) => {
  await boot(page);
  await openLabRoom(page, "class-pro-panel", "ia");
  await page.evaluate(() => {
    localStorage.setItem("enlab-quiz-ux", JSON.stringify({
      ear: { sessions: 4, completed: 1, abandoned: 3, answers: 12, correct: 6, ms: 48000 },
    }));
    const roster = [{ name: "Luis", weeklyDone: false, certDone: false, srsDue: 2, frictionMode: "ear", frictionDrop: 75, synced: Date.now() }];
    localStorage.setItem("enlab-class-roster", JSON.stringify(roster));
    if (window.SV?.renderClassPro) window.SV.renderClassPro();
  });
  await expect(page.locator(".class-roster-table th").filter({ hasText: /Fricci|Friction/i })).toBeVisible();
  await expect(page.locator(".class-roster-table tbody")).toContainText(/75%/);
});

test("Hoy done copy mentions pending plan", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.removeItem("enlab-coach-plan");
    sessionStorage.removeItem("enlab-coach-plan-flow");
    hoyPathI = hoyPath().length;
    persistHoyPath();
    if (typeof renderHoyPath === "function") renderHoyPath();
  });
  await expect(page.locator("#hoy-done-copy")).toContainText(/plan 8 min|8-min plan/i);
});

test("Hablar: roster highlights pending plan when task is coach", async ({ page }) => {
  await boot(page);
  await openLabRoom(page, "class-pro-panel", "ia");
  await page.evaluate(() => {
    localStorage.setItem("enlab-class-task", "coach");
    localStorage.setItem("enlab-class-roster", JSON.stringify([
      { name: "Ana", coachDone: 0, coachTotal: 3, synced: Date.now() },
    ]));
    if (window.SV?.renderClassPro) window.SV.renderClassPro();
    if (window.SV?.renderClassTaskBanner) window.SV.renderClassTaskBanner();
  });
  await expect(page.locator(".class-roster-table tr.class-roster-plan-pending")).toBeVisible();
  await page.locator('[data-tab="hoy"]').click();
  await expect(page.locator("#class-task-banner")).toContainText(/sin empezar|haven't started/i);
});

test("Plus: perf panel shows coach plan row", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.removeItem("enlab-coach-plan");
    if (window.PLUS?.renderPerfHint) window.PLUS.renderPerfHint();
  });
  await page.locator('[data-tab="ia"]').click();
  await openLabRoom(page, "perf-panel", "ia");
  await expect(page.locator("#perf-panel .perf-plan-row")).toContainText(/plan 8 min|8-min plan/i);
});

test("Hablar: class coach plan print button", async ({ page }) => {
  await boot(page);
  await openLabRoom(page, "class-pro-panel", "ia");
  await expect(page.locator("#class-coach-plan-print")).toBeVisible();
});

test("Hablar: heatmap row filters roster", async ({ page }) => {
  await boot(page);
  await openLabRoom(page, "class-pro-panel", "ia");
  await page.evaluate(() => {
    localStorage.setItem("enlab-class-task", "coach");
    localStorage.setItem("enlab-class-roster", JSON.stringify([
      { name: "Ana", coachDone: 0, coachTotal: 3, synced: Date.now() },
      { name: "Luis", coachDone: 3, coachTotal: 3, synced: Date.now() },
    ]));
    if (window.SV?.renderClassPro) window.SV.renderClassPro();
  });
  await page.locator('.class-plan-heat-filters [data-plan-heat-filter="pending"]').click();
  await expect(page.locator(".class-roster-table tbody")).toContainText("Ana");
  await expect(page.locator(".class-roster-table tbody")).not.toContainText("Luis");
});

test("Hablar: class coach plan heatmap", async ({ page }) => {
  await boot(page);
  await openLabRoom(page, "class-pro-panel", "ia");
  await page.evaluate(() => {
    localStorage.setItem("enlab-class-roster", JSON.stringify([
      { name: "Ana", coachDone: 0, coachTotal: 3, synced: Date.now() },
      { name: "Luis", coachDone: 2, coachTotal: 3, synced: Date.now() },
    ]));
    if (window.SV?.renderClassPro) window.SV.renderClassPro();
  });
  await expect(page.locator(".class-coach-plan-heat")).toBeVisible();
  await expect(page.locator(".class-plan-heat-table .class-heat-cell.hi")).toBeVisible();
  await expect(page.locator(".class-plan-heat-table .class-heat-cell.mid")).toBeVisible();
});

test("Hablar: class coach plan column and CSV", async ({ page }) => {
  await boot(page);
  await openLabRoom(page, "class-pro-panel", "ia");
  await page.evaluate(() => {
    localStorage.setItem("enlab-class-roster", JSON.stringify([
      { name: "Luis CP", coachDone: 1, coachTotal: 3, synced: Date.now() },
    ]));
    if (window.SV?.renderClassPro) window.SV.renderClassPro();
  });
  await expect(page.locator(".class-roster-table th").filter({ hasText: /Plan 8 min|8-min plan/i })).toBeVisible();
  await expect(page.locator(".class-roster-table tbody")).toContainText(/1\/3/);
  await expect(page.locator(".class-coach-plan-summary")).toBeVisible();
  await expect(page.locator("#class-coach-plan-csv")).toBeVisible();
});

test("Hablar: import transfer syncs coach plan to roster", async ({ page }) => {
  await boot(page);
  const ok = await page.evaluate(() => {
    const payload = buildTransferPayload();
    payload["enlab-student-name"] = "Luis CP";
    payload["enlab-coach-plan-mirror"] = JSON.stringify({
      day: todayKey(), done: 1, steps: ["ear", "uso", "choice"], flow: false,
    });
    const code = transferEncode(payload);
    return window.SV?.importStudentFromCode?.(code);
  });
  expect(ok).toBe(true);
  await openLabRoom(page, "class-pro-panel", "ia");
  await expect(page.locator(".class-roster-table tbody")).toContainText(/Luis CP/i);
  await expect(page.locator(".class-roster-table tbody")).toContainText(/1\/3/);
});

test("Hablar: import transfer syncs placement to roster", async ({ page }) => {
  await boot(page);
  const ok = await page.evaluate(() => {
    const payload = buildTransferPayload();
    payload["enlab-student-name"] = "Pepa PL";
    payload["enlab-place-result"] = JSON.stringify({ score: 7, n: 20, cefr: "a1", day: todayKey() });
    const code = transferEncode(payload);
    return window.SV?.importStudentFromCode?.(code);
  });
  expect(ok).toBe(true);
  await openLabRoom(page, "class-pro-panel", "ia");
  await expect(page.locator(".class-roster-table tbody")).toContainText(/35%|Pepa PL/i);
});

test("Hablar: class placement CSV button", async ({ page }) => {
  await boot(page);
  await openLabRoom(page, "class-pro-panel", "ia");
  await page.evaluate(() => {
    localStorage.setItem("enlab-class-roster", JSON.stringify([
      { name: "Ana", synced: Date.now() },
    ]));
    localStorage.setItem("enlab-student-name", "Ana");
    localStorage.setItem("enlab-place-result", JSON.stringify({
      score: 8, n: 20, cefr: "a1", day: todayKey(), at: Date.now(),
    }));
    if (window.SV?.renderClassPro) window.SV.renderClassPro();
  });
  await expect(page.locator("#class-placement-csv")).toBeVisible();
});

test("Hablar: class friction alerts when week-over-week rise", async ({ page }) => {
  await boot(page);
  await openLabRoom(page, "class-pro-panel", "ia");
  await page.evaluate(() => {
    const week = typeof weekStartKey === "function" ? weekStartKey() : todayKey().slice(0, 7);
    const prev = typeof prevWeekStartKey === "function" ? prevWeekStartKey() : week;
    localStorage.setItem("enlab-class-roster", JSON.stringify([
      { name: "Ana", frictionMode: "uso", frictionDrop: 55, synced: Date.now() },
    ]));
    localStorage.setItem("enlab-class-friction-week", JSON.stringify({
      [prev]: { Ana: { uso: 38 } },
      [week]: { Ana: { uso: 55 } },
    }));
    if (window.SV?.renderClassPro) window.SV.renderClassPro();
  });
  await expect(page.locator(".class-friction-alerts")).toBeVisible();
  await expect(page.locator(".class-friction-alerts")).toContainText(/Ana/i);
  await expect(page.locator(".class-friction-alerts")).toContainText(/\+17|17%/);
  await expect(page.locator("#class-friction-alerts-csv")).toBeVisible();
});

test("Hablar: class friction heatmap when roster has data", async ({ page }) => {
  await boot(page);
  await openLabRoom(page, "class-pro-panel", "ia");
  await page.evaluate(() => {
    const week = typeof weekStartKey === "function" ? weekStartKey() : todayKey().slice(0, 7);
    localStorage.setItem("enlab-class-roster", JSON.stringify([
      { name: "Ana", weeklyDone: true, certDone: false, srsDue: 1, frictionMode: "uso", frictionDrop: 42, synced: Date.now() },
    ]));
    localStorage.setItem("enlab-class-friction-week", JSON.stringify({
      [week]: { Ana: { uso: 42, ear: 28 } },
    }));
    if (window.SV?.renderClassPro) window.SV.renderClassPro();
  });
  await expect(page.locator(".class-friction-heat")).toBeVisible();
  await expect(page.locator(".class-heat-cell.mid")).toBeVisible();
});

test("Hablar: class friction heatmap CSV button", async ({ page }) => {
  await boot(page);
  await openLabRoom(page, "class-pro-panel", "ia");
  await page.evaluate(() => {
    const week = typeof weekStartKey === "function" ? weekStartKey() : todayKey().slice(0, 7);
    localStorage.setItem("enlab-class-roster", JSON.stringify([
      { name: "Ana", frictionMode: "ear", frictionDrop: 40, synced: Date.now() },
    ]));
    localStorage.setItem("enlab-class-friction-week", JSON.stringify({
      [week]: { Ana: { ear: 40 } },
    }));
    if (window.SV?.renderClassPro) window.SV.renderClassPro();
  });
  await expect(page.locator("#class-friction-csv")).toBeVisible();
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

test("Hablar: duo chip hidden in non-hablar tab", async ({ page }) => {
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
  /* we are on "hoy" by default */
  await expect(page.locator("#you-are-chips [data-duo-resume]")).toBeHidden();
});
