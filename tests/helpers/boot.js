/** Boot app with onboarding skipped and deferred packs loaded. */
async function boot(page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("enlab-welcome-v2", "1");
    localStorage.setItem("enlab-onboard-v3", "1");
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

module.exports = { boot };
