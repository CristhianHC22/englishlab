const { test } = require("@playwright/test");
/**
 * Regresión visual: claro / oscuro / contraste alto.
 * Baselines por plataforma (*-win32.png, *-linux.png).
 * Tras cambiar CSS: npm run test:visual:update
 * Linux desde Windows: docker run --rm -v ${PWD}:/work -w /work mcr.microsoft.com/playwright:v1.62.1-jammy bash -c "npm ci && npm run test:visual:update"
 */
const {
  VISUAL_THEMES,
  bootVisual,
  expectThemeApplied,
  expectViewportShot,
  gotoTab,
} = require("./helpers/visual");

test.describe("regresión visual — temas", () => {
  test.use({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    locale: "es-ES",
    timezoneId: "UTC",
  });

  for (const mode of VISUAL_THEMES) {
    test(`Hoy · ${mode.id}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: mode.colorScheme });
      await bootVisual(page, { theme: mode.theme, contrast: mode.contrast });
      await expectThemeApplied(page, { theme: mode.theme, contrast: mode.contrast });
      await gotoTab(page, "hoy");
      await expectViewportShot(page, `hoy-${mode.id}`);
    });

    test(`Oír · ${mode.id}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: mode.colorScheme });
      await bootVisual(page, { theme: mode.theme, contrast: mode.contrast });
      await gotoTab(page, "vocales");
      await expectViewportShot(page, `oido-${mode.id}`);
    });

    test(`Juego · ${mode.id}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: mode.colorScheme });
      await bootVisual(page, { theme: mode.theme, contrast: mode.contrast });
      await gotoTab(page, "quiz");
      await expectViewportShot(page, `juego-${mode.id}`);
    });

    test(`Hablar · ${mode.id}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: mode.colorScheme });
      await bootVisual(page, { theme: mode.theme, contrast: mode.contrast });
      await gotoTab(page, "hablar");
      await expectViewportShot(page, `hablar-${mode.id}`);
    });

    test(`Ayuda · ${mode.id}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: mode.colorScheme });
      await bootVisual(page, { theme: mode.theme, contrast: mode.contrast });
      await gotoTab(page, "ia");
      await expectViewportShot(page, `ayuda-${mode.id}`);
    });
  }
});
