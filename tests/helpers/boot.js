/** Boot app with onboarding skipped and deferred packs loaded. */
async function boot(page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("enlab-welcome-v2", "1");
    localStorage.setItem("enlab-onboard-v3", "1");
    localStorage.setItem("enlab-guide-quiet", "1");
  });
  await page.reload();
  try {
    await page.waitForFunction(
      () => (window.ENLAB?.podcasts || []).length >= 40
        && (window.ENLAB?.roleplays || []).length >= 50
        && typeof window.NR?.startCertExam === "function"
        && typeof window.SV?.scorePronunciationAsync === "function"
        && typeof window.PLUS?.startPlacement === "function"
        && (window.ENLAB?.placementItems || []).length >= 20,
      { timeout: 90000 },
    );
  } catch {
    await page.evaluate(async () => {
      if (window.ENLAB_LOADER?.loadDeferred) await window.ENLAB_LOADER.loadDeferred();
    });
    await page.waitForFunction(
      () => (window.ENLAB?.roleplays || []).length >= 50
        && typeof window.NR?.startCertExam === "function",
      { timeout: 60000 },
    );
  }
}

async function openPrefs(page) {
  const panel = page.locator("#prefs-panel");
  if (await panel.isHidden()) await page.locator("#prefs-toggle").click();
}

async function openHoyExtras(page) {
  await page.locator("#hoy-extras").evaluate((el) => { el.open = true; });
}

async function revealInFolds(page, selector) {
  await page.locator(selector).evaluate((el) => {
    let n = el;
    while (n) {
      if (n.tagName === "DETAILS") n.open = true;
      n = n.parentElement;
    }
  });
}

async function closeLabIfOpen(page, panelSel) {
  const back = page.locator(`${panelSel} .lab-back`).first();
  if (await back.isVisible().catch(() => false)) await back.click();
}

async function openLabRoom(page, jump, tab) {
  if (tab && !(await page.locator(`#${tab}.panel.active`).isVisible().catch(() => false))) {
    await page.locator(`[data-tab="${tab}"]`).click();
  }
  const root = tab ? `#${tab}` : "body";
  await closeLabIfOpen(page, root);
  await page.locator(`${root} [data-lab-jump="${jump}"]`).click();
}

async function openOidoRoom(page, jump) {
  await openLabRoom(page, jump, "vocales");
}

const QUIZ_ROOMS = {
  choice: "quiz-verbs", type: "quiz-verbs", ed: "quiz-verbs",
  ear: "quiz-ear", exam: "quiz-ear", dict: "quiz-ear", listen: "quiz-ear",
  uso: "quiz-uso", art: "quiz-uso", prep: "quiz-uso", phrasal: "quiz-uso",
  cond: "quiz-uso", emailtone: "quiz-uso", story: "quiz-uso",
  place: "quiz-exams", weekly: "quiz-exams", cert: "quiz-exams",
};

async function openQuizMode(page, mode) {
  const room = QUIZ_ROOMS[mode] || "quiz-verbs";
  if (!(await page.locator("#quiz.panel.active").isVisible().catch(() => false))) {
    await page.locator('[data-tab="quiz"]').click();
  }
  const pick = page.locator(`[data-quiz-mode="${mode}"]`);
  if (!(await pick.isVisible().catch(() => false))) {
    await closeLabIfOpen(page, "#quiz");
    await page.locator(`#quiz-hub [data-lab-jump="${room}"]`).click();
  }
  await pick.click();
}

module.exports = {
  boot, openPrefs, openHoyExtras, revealInFolds,
  openOidoRoom, openLabRoom, openQuizMode, closeLabIfOpen,
};
