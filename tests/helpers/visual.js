const { expect } = require("@playwright/test");

/** Claro, oscuro y contraste alto — baselines Playwright por plataforma. */
const VISUAL_THEMES = [
  { id: "light", theme: "light", contrast: false, colorScheme: "light" },
  { id: "dark", theme: "dark", contrast: false, colorScheme: "dark" },
  { id: "contrast", theme: "light", contrast: true, colorScheme: "light" },
];

async function blockExternalFonts(page) {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
}

async function bootVisual(page, { theme = "light", contrast = false } = {}) {
  await blockExternalFonts(page);
  await page.goto("/");
  await page.evaluate(({ theme, contrast }) => {
    localStorage.setItem("enlab-welcome-v2", "1");
    localStorage.setItem("enlab-onboard-v3", "1");
    localStorage.setItem("enlab-theme", theme);
    localStorage.setItem("enlab-a11y-contrast", contrast ? "1" : "0");
    localStorage.setItem("enlab-a11y-motion", "0");
    localStorage.setItem("enlab-kids", "0");
    localStorage.setItem("enlab-travel", "0");
    localStorage.setItem("enlab-tab", "hoy");
    localStorage.setItem(
      "enlab-stats",
      JSON.stringify({ streak: 3, last: "2026-01-15", days: { "2026-01-15": { quiz: 2, heard: 5, spoke: 1 } } }),
    );
  }, { theme, contrast });
  await page.reload();
  await page.waitForFunction(
    () => window._enlabBootstrapped === true && (window.ENLAB?.podcasts || []).length >= 40,
    { timeout: 90000 },
  );
  await page.evaluate(() => document.fonts.ready);
}

async function stabilizeForSnapshot(page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addStyleTag({
    content: "*, *::before, *::after { animation: none !important; transition: none !important; }",
  });
  await page.evaluate(() => {
    document.body.classList.add("a11y-motion", "reduced-motion");
    if (typeof applyTheme === "function") applyTheme();
    if (typeof window.SV?.bootstrap === "function") {
      /* a11y bar ya aplicada en bootstrap */
    }
    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    setText("day-theme", "Día 1 · Pares mínimos ship / sheep");
    setText("home-stats", "Racha 3 · oído 5 · quiz 2 · hablado 1");
    setText("hoy-clock", "15:00");
    setText("remind-status", "Aviso desactivado (snapshot).");
    const strip = document.getElementById("week-strip");
    if (strip) {
      strip.innerHTML = `<div class="week-dots">${Array.from({ length: 7 }, (_, i) =>
        `<span class="week-dot${i === 2 ? " hot" : ""}">${["L", "M", "X", "J", "V", "S", "D"][i]}</span>`,
      ).join("")}</div>`;
    }
    const chart = document.getElementById("hoy-streak-chart");
    if (chart) {
      chart.hidden = false;
      chart.innerHTML = `<p class="kicker">Últimos 30 días · 0/30 días activos</p><div class="streak-bars">${Array.from({ length: 30 }, () =>
        `<span class="streak-day"></span>`,
      ).join("")}</div>`;
    }
    const journal = document.getElementById("error-journal");
    if (journal) { journal.hidden = true; journal.innerHTML = ""; }
    const perf = document.getElementById("perf-panel");
    if (perf) { perf.hidden = true; perf.innerHTML = ""; }
    document.querySelectorAll("[data-pwa-install]").forEach((el) => { el.hidden = true; });
    document.getElementById("level-nudge")?.setAttribute("hidden", "");
    document.getElementById("welcome")?.setAttribute("hidden", "");
  });
}

async function expectThemeApplied(page, { theme, contrast }) {
  const state = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    contrast: document.body.classList.contains("a11y-contrast"),
    bg: getComputedStyle(document.body).backgroundColor,
  }));
  expect(state.theme).toBe(theme);
  expect(state.contrast).toBe(contrast);
}

async function expectViewportShot(page, name, opts = {}) {
  await stabilizeForSnapshot(page);
  await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage: false,
    animations: "disabled",
    caret: "hide",
    ...opts,
  });
}

async function gotoTab(page, tab) {
  await page.locator(`[data-tab="${tab}"]`).click();
  await page.locator(`#${tab}.panel.active`).waitFor({ state: "visible" });
  if (tab === "vocales") {
    await page.waitForSelector("#pron-panel .pron-pair");
  }
  if (tab === "quiz") {
    await page.waitForSelector('[data-quiz-mode="dict"]');
  }
  if (tab === "verbos") {
    await page.waitForSelector("#verb-list .verb");
  }
  if (tab === "hablar") {
    await page.waitForSelector("#roleplay-card");
  }
  if (tab === "ia") {
    await page.waitForSelector("#a11y-bar .chip");
    await page.waitForSelector(".audit-table tbody tr");
  }
}

module.exports = {
  VISUAL_THEMES,
  bootVisual,
  stabilizeForSnapshot,
  expectThemeApplied,
  expectViewportShot,
  gotoTab,
};
