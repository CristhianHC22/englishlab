const { test, expect } = require("@playwright/test");
const { boot, openLabRoom, openPrefs } = require("./helpers/boot");

test("Ayuda: audit shows plan stat", async ({ page }) => {
  await boot(page);
  await openLabRoom(page, "lab-audit", "ia");
  await page.evaluate(() => {
    localStorage.setItem("enlab-stats", JSON.stringify({
      streak: 2,
      days: { [todayKey()]: { heard: 3, quiz: 5, spoke: 1 } },
    }));
    if (window.NR?.renderLabAudit) window.NR.renderLabAudit();
  });
  await expect(page.locator(".audit-stats-row")).toContainText(/plan|Plan/i);
  await expect(page.locator(".audit-table tbody tr").filter({ hasText: /^B|Camino|Path/i })).toContainText(/plan/i);
});

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
  await expect(page.locator("#you-are")).toBeVisible();
  await expect(page.locator("#you-are")).toContainText(/Qué es esto|What is this/i);
  await expect(page.locator("#you-are")).toContainText(/Hoy|sesión|15/i);
  await expect(page.locator("#you-are-when")).toContainText(/Ya está cuando|done when/i);
  await page.locator("#you-are").click();
  await expect(page.locator("#guide-panel")).toBeVisible();
  await expect(page.locator("#you-are")).toBeHidden();
  await expect(page.locator("#guide-title")).toContainText(/Hoy|sesión|15/i);
  await expect(page.locator("#guide-steps li")).toHaveCount(3);
  await expect(page.locator("#guide-done")).toBeVisible();
  await expect(page.locator("#guide-lab [data-guide-tab]")).toHaveCount(6);
  await page.locator('[data-guide-tab="vocales"]').click();
  await expect(page.locator("#guide-panel")).toBeVisible();
  await expect(page.locator("#guide-title")).toContainText(/Oír|tema/i);
  await expect(page.locator("#guide-map")).toContainText(/Vocales/);
  await page.locator('[data-tab="quiz"]').click();
  await expect(page.locator("#guide-title")).toContainText(/Juego|grupo/i);
  await expect(page.locator("#guide-map")).toContainText(/Verbos/);
  await expect(page.locator("#guide-map")).toContainText(/Exámenes/);
  await page.locator('#guide-map [data-guide-jump="quiz-verbs"]').click();
  await expect(page.locator("#quiz")).toHaveClass(/lab-in/);
  await expect(page.locator("#guide-panel")).toBeVisible();
  await expect(page.locator("#guide-title")).toContainText(/verbos/i);
  await expect(page.locator("#guide-map")).toContainText(/grupo|group/i);
  await page.locator("#quiz .lab-back").click();
  await page.locator("#guide-gotit").click();
  await expect(page.locator("#guide-panel")).toBeHidden();
});

test("Guía: room copy after opening a practice", async ({ page }) => {
  await boot(page);
  await page.locator("#guide-toggle").click();
  await openLabRoom(page, "roleplay-card", "hablar");
  await expect(page.locator("#guide-panel")).toBeVisible();
  await expect(page.locator("#guide-title")).toContainText(/Role-play/i);
  await openLabRoom(page, "oido-reglas", "vocales");
  await expect(page.locator("#guide-title")).toContainText(/reglas|Rules/i);
});

test("Guía: day-marked Hoy has its own copy", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const s = document.createElement("script");
    s.textContent = "hoyPathI = hoyPath().length; persistHoyPath(); renderHoyPath(); fillGuide();";
    document.documentElement.appendChild(s);
    s.remove();
  });
  await page.locator("#guide-toggle").click();
  await expect(page.locator("#guide-title")).toContainText(/ya está|path is done/i);
  await expect(page.locator("#guide-map")).toBeHidden();
  await expect(page.locator("#guide-steps")).toContainText(/min|reloj|clock|minutes/i);
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

test("Guía: kids weekly mid shows hint in Guide", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const items = makeWeeklyExamItems();
    sessionStorage.setItem("enlab-weekly-now", JSON.stringify({
      week: weekStartKey(), i: 2, score: 1, fails: [], items,
    }));
    localStorage.setItem("enlab-kids", "1");
    document.body.classList.add("kids-mode");
  });
  await page.locator('nav.tabs [data-tab="quiz"]').click();
  await page.locator("#guide-toggle").click();
  const panel = page.locator("#guide-panel");
  await expect(panel).toBeVisible();
  await expect(panel).toContainText(/semanal|weekly/i);
  await expect(panel).toContainText(/3.*12|medias/i);
});

test("Guía: kids copy is shorter; Settings points to Guide", async ({ page }) => {
  await boot(page);
  await openPrefs(page);
  await expect(page.locator("#prefs-panel")).toContainText(/Guía|Guide/i);
  await page.locator("#kids-toggle").click();
  await page.locator("#guide-toggle").click();
  await expect(page.locator("#guide-steps li")).toHaveCount(2);
  await expect(page.locator("#guide-title")).toContainText(/15/i);
});

test("Ajustes: PIN shows a locked-class line", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    localStorage.setItem("enlab-class-pin", "1234");
    if (typeof renderClassPin === "function") renderClassPin();
  });
  await openPrefs(page);
  await expect(page.locator("#prefs-class")).toBeVisible();
  await expect(page.locator("#prefs-class")).toContainText(/PIN|clase|class/i);
  await expect(page.locator("#prefs-toggle")).toHaveClass(/has-on/);
});

test("Ajustes: copy transfer code without opening Help", async ({ page }) => {
  await boot(page);
  await openPrefs(page);
  await expect(page.locator("#prefs-transfer-copy")).toBeVisible();
  await expect(page.locator("#prefs-transfer-paste")).toBeVisible();
  await expect(page.locator("#prefs-transfer-import")).toBeVisible();
  await page.locator("#prefs-transfer-copy").click();
  await expect(page.locator("#prefs-transfer-status")).toBeVisible();
  await expect(page.locator("#prefs-transfer-status")).toContainText(/copiado|copied/i);
  const code = await page.locator("#transfer-code").inputValue();
  expect(code.length).toBeGreaterThan(8);
  const tail = code.slice(-4);
  await expect(page.locator("#prefs-transfer-status")).toContainText(tail);
  await page.locator("#prefs-transfer-paste").fill(code);
  await page.locator("#prefs-transfer-import").click();
  await expect(page.locator("#prefs-transfer-status")).toContainText(/importado|imported/i);
});

test("Ayuda: audit shows read-only transfer QR", async ({ page }) => {
  await boot(page);
  await openLabRoom(page, "lab-audit", "ia");
  await page.locator(".audit-transfer-qr summary").click();
  await expect(page.locator("#audit-transfer-qr")).toBeVisible();
  await expect(page.locator(".audit-transfer-qr")).toContainText(/solo lectura|read-only/i);
  /* chunks element may be empty before clicking copy, that's fine */
});

test("Ayuda: audit transfer copy button copies code", async ({ page }) => {
  await boot(page);
  await openLabRoom(page, "lab-audit", "ia");
  await page.locator(".audit-transfer-qr summary").click();
  await page.locator("#audit-transfer-copy").click();
  await expect(page.locator("#audit-transfer-chunks")).toContainText(/copiado|copied|termina en/i);
});

test("Ajustes: PIN blocks import on the status line", async ({ page }) => {
  await boot(page);
  page.on("dialog", () => { throw new Error("PIN import in Settings must not prompt"); });
  await openPrefs(page);
  await page.locator("#prefs-transfer-copy").click();
  const code = await page.locator("#transfer-code").inputValue();
  expect(code.length).toBeGreaterThan(8);
  await page.evaluate(() => {
    localStorage.setItem("enlab-class-pin", "1234");
    sessionStorage.removeItem("enlab-class-ok");
  });
  await page.locator("#prefs-transfer-paste").fill(code);
  await page.locator("#prefs-transfer-import").click();
  await expect(page.locator("#prefs-transfer-status")).toBeVisible();
  await expect(page.locator("#prefs-transfer-status")).toContainText(/PIN/i);
  await expect(page.locator("#prefs-transfer-status")).toContainText(/no se importó|import cancelled/i);
});

test("Ajustes: short transfer code uses the status line", async ({ page }) => {
  await boot(page);
  await openPrefs(page);
  await page.locator("#prefs-transfer-paste").fill("abc");
  await page.locator("#prefs-transfer-import").click();
  await expect(page.locator("#prefs-transfer-status")).toBeVisible();
  await expect(page.locator("#prefs-transfer-status")).toContainText(/corto|too short/i);
});

test("Ajustes: pasting a long code offers Import on the status line", async ({ page }) => {
  await boot(page);
  await openPrefs(page);
  await page.locator("#prefs-transfer-copy").click();
  const code = await page.locator("#transfer-code").inputValue();
  expect(code.length).toBeGreaterThan(16);
  await page.locator("#prefs-transfer-paste").fill(code);
  await expect(page.locator("#prefs-transfer-status [data-prefs-transfer-go]")).toBeVisible();
  await expect(page.locator("#prefs-transfer-status")).toContainText(code.slice(-4));
  await page.locator("#prefs-transfer-status [data-prefs-transfer-go]").click();
  await expect(page.locator("#prefs-transfer-status")).toContainText(/importado|imported/i);
});

test("Ajustes: transfer tail mismatch warns on the status line", async ({ page }) => {
  await boot(page);
  await openPrefs(page);
  await page.locator("#prefs-transfer-copy").click();
  const code = await page.locator("#transfer-code").inputValue();
  const bad = code.slice(0, -4) + "XXXX";
  await page.locator("#prefs-transfer-paste").fill(bad);
  await expect(page.locator("#prefs-transfer-status")).toContainText(/XXXX/);
  await expect(page.locator("#prefs-transfer-status")).toContainText(/Revisa|Check the code/i);
  await expect(page.locator("#prefs-transfer-status [data-prefs-transfer-go]")).toBeHidden();
});

test("Ajustes: transfer tail mismatch blocks Import", async ({ page }) => {
  await boot(page);
  await openPrefs(page);
  await page.locator("#prefs-transfer-copy").click();
  const msg = await page.evaluate(() => {
    sayTransferCopied($("#prefs-transfer-status"), $("#transfer-code").value);
    const want = prefsTransferTail;
    for (let n = 1; n <= 40; n += 1) {
      localStorage.setItem("enlab-stats", JSON.stringify({ days: {}, streak: n, last: "2020-01-01" }));
      renderTransferCode();
      const c = $("#transfer-code").value;
      if (transferTail(c) !== want) {
        importTransferCode(c, true);
        return $("#prefs-transfer-status").textContent;
      }
    }
    return "";
  });
  expect(msg).toMatch(/no se importó|Import cancelled/i);
});

test("Ajustes: cut transfer code uses the status line", async ({ page }) => {
  await boot(page);
  await openPrefs(page);
  await page.locator("#prefs-transfer-copy").click();
  const code = await page.locator("#transfer-code").inputValue();
  expect(code.length).toBeGreaterThan(24);
  await page.locator("#prefs-transfer-paste").fill(code.slice(0, code.length - 12));
  await page.locator("#prefs-transfer-import").click();
  await expect(page.locator("#prefs-transfer-status")).toBeVisible();
  await expect(page.locator("#prefs-transfer-status")).toContainText(/cortado|cut off/i);
});

test("Guía: kids day-marked mentions extra session when timer runs", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    localStorage.setItem("enlab-kids", "1");
    if (typeof applyKidsMode === "function") applyKidsMode();
    const s = document.createElement("script");
    s.textContent = "hoyPathI = hoyPath().length; persistHoyPath(); finishHoyPath();";
    document.documentElement.appendChild(s);
    s.remove();
    sessionStorage.setItem("enlab-hoy-extra-timer", "1");
    persistTimer({ running: true, remaining: 600, until: Date.now() + 600000 });
    if (typeof startTimerLoop === "function") startTimerLoop();
  });
  const why = await page.evaluate(() => {
    if (typeof fillGuide === "function") fillGuide();
    return document.getElementById("guide-why")?.textContent || "";
  });
  expect(why).toMatch(/sesión extra|extra session/i);
});

test("Ajustes: prefs QR click fills paste and shows tail", async ({ page }) => {
  await boot(page);
  await openPrefs(page);
  await page.locator("#prefs-transfer-qr").click();
  const code = await page.locator("#transfer-code").inputValue();
  expect(code.length).toBeGreaterThan(16);
  await expect(page.locator("#prefs-transfer-paste")).toHaveValue(code);
  await expect(page.locator("#prefs-transfer-status")).toContainText(code.slice(-4));
});

test("Ajustes: kids hide the transfer line", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    localStorage.setItem("enlab-kids", "1");
    if (typeof applyKidsMode === "function") applyKidsMode();
  });
  await openPrefs(page);
  await expect(page.locator("#prefs-transfer-copy")).toBeHidden();
  await expect(page.locator("#prefs-transfer-paste")).toBeHidden();
});
