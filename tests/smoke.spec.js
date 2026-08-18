const { test, expect } = require("@playwright/test");
const { boot } = require("./helpers/boot");

test("loads Hoy path and tabs", async ({ page }) => {
  await boot(page);
  await expect(page.locator("#hoy-path")).toBeVisible();
  await expect(page.locator(".hoy-next").first()).toBeVisible();
  await page.locator('[data-tab="hablar"]').click();
  await expect(page.locator("#hablar.panel.active")).toBeVisible();
  await expect(page.locator("#interview-sim-card")).toBeVisible();
  await expect(page.locator("#roleplay-card")).toBeVisible();
  await expect(page.locator("#email-card")).toBeVisible();
  await expect(page.locator("#chat-work-card")).toBeVisible();
  await expect(page.locator("#duo-card")).toBeVisible();
  await expect(page.locator("#phrasals-work-card")).toBeVisible();
});

test("English UI toggle", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.ENLAB.ui.en.tabs.hoy = "Today";
    localStorage.setItem("enlab-ui-lang", "en");
  });
  await page.reload();
  await expect(page.locator('[data-tab="hoy"]')).toHaveText(/Today/i);
});

test("packs A–R content is wired", async ({ page }) => {
  await boot(page);
  const ok = await page.evaluate(() => ({
    listen: (window.ENLAB.listenPassages || []).length >= 25,
    role: (window.ENLAB.roleplays || []).length >= 50,
    email: (window.ENLAB.emailSpeak || []).length >= 20,
    emailTone: (window.ENLAB.emailSpeak || []).filter((e) => e.tone).length >= 4,
    series: (window.ENLAB.podcastSeries || []).length >= 3,
    situations: Object.keys(window.ENLAB.phrasesSituation || {}).length >= 25,
    restaurant: !!window.ENLAB.phrasesSituation?.restaurant?.length,
    podcasts: (window.ENLAB.podcasts || []).length >= 40,
    chat: (window.ENLAB.chatWork || []).length >= 48,
    travel: Object.keys(window.ENLAB.travelMaps || {}).length >= 5,
    cond: (window.ENLAB.condQuiz || []).length >= 10,
    dialogsA2: (window.ENLAB.dialogsA2Tense || []).length >= 8,
    nr: typeof window.NR?.startCertExam === "function",
    sv: typeof window.SV?.scorePronunciationAsync === "function",
    plus: typeof window.PLUS?.startPlacement === "function",
    place: (window.ENLAB.placementItems || []).length >= 20,
    pron: typeof window.PRON?.scoreFormantPair === "function",
    stories: (window.ENLAB.branchStories || []).length >= 20,
    storyDepth: (() => {
      const s = (window.ENLAB.branchStories || []).find((x) => x.id === "bus-lost");
      return s && typeof window.SV?.storyMaxSteps === "function" && window.SV.storyMaxSteps(s) >= 5;
    })(),
    dict100: (window.ENLAB.dictation || []).length >= 100,
    minimal: (window.ENLAB.minimalPairs || []).length >= 25,
  }));
  expect(ok.listen).toBe(true);
  expect(ok.role).toBe(true);
  expect(ok.email).toBe(true);
  expect(ok.emailTone).toBe(true);
  expect(ok.series).toBe(true);
  expect(ok.situations).toBe(true);
  expect(ok.restaurant).toBe(true);
  expect(ok.podcasts).toBe(true);
  expect(ok.chat).toBe(true);
  expect(ok.travel).toBe(true);
  expect(ok.cond).toBe(true);
  expect(ok.dialogsA2).toBe(true);
  expect(ok.nr).toBe(true);
  expect(ok.sv).toBe(true);
  expect(ok.plus).toBe(true);
  expect(ok.place).toBe(true);
  expect(ok.stories).toBe(true);
  expect(ok.storyDepth).toBe(true);
  expect(ok.dict100).toBe(true);
  expect(ok.minimal).toBe(true);
});

test("situations panel on Hoy", async ({ page }) => {
  await boot(page);
  await expect(page.locator("#situations-panel")).toBeVisible();
  await expect(page.locator("#situation-phrases .chip").first()).toBeVisible();
  await page.locator("[data-sit-key='restaurant']").click();
  await expect(page.locator("#situation-phrases")).toContainText(/table|menu|check/i);
});

test("Hoy path starts and shows pairs", async ({ page }) => {
  await boot(page);
  await page.locator(".hoy-next").first().click();
  await expect(page.locator("#hoy-step-1")).toBeVisible();
  await expect(page.locator("#daily-pairs .card").first()).toBeVisible();
});

test("quiz modes include dictation, weekly, cert and cond", async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="quiz"]').click();
  await expect(page.locator('[data-quiz-mode="dict"]')).toBeVisible();
  await expect(page.locator('[data-quiz-mode="place"]')).toBeVisible();
  await expect(page.locator('[data-quiz-mode="weekly"]')).toBeVisible();
  await expect(page.locator('[data-quiz-mode="cert"]')).toBeVisible();
  await expect(page.locator('[data-quiz-mode="cond"]')).toBeVisible();
  await page.locator('[data-quiz-mode="cond"]').click();
  await page.locator("#quiz-start").click();
  await expect(page.locator("#quiz-box .quiz-q")).toBeVisible();
});

test("Hoy shadowing button on pairs step", async ({ page }) => {
  await boot(page);
  await page.locator(".hoy-next").first().click();
  await expect(page.locator("#hoy-pair-shadow")).toBeVisible();
});

test("quiz email tone mode", async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="quiz"]').click();
  await expect(page.locator('[data-quiz-mode="emailtone"]')).toBeVisible();
  await page.locator('[data-quiz-mode="emailtone"]').click();
  await page.locator("#quiz-start").click();
  await expect(page.locator("#quiz-box .quiz-q")).toBeVisible();
});

test("podcast series blocks in Oír", async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="vocales"]').click();
  await expect(page.locator(".podcast-series").first()).toBeVisible();
  await expect(page.locator("[data-series-quiz]").first()).toBeVisible();
});

test("transfer code roundtrip", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    localStorage.setItem("enlab-cefr", "a2");
    localStorage.setItem("enlab-weak", JSON.stringify(["go", "see"]));
  });
  await page.reload();
  await page.waitForFunction(
    () => window._enlabBootstrapped === true && (window.ENLAB?.roleplays || []).length >= 50,
    { timeout: 90000 },
  );
  await page.locator("#transfer-box").locator("summary").click();
  const code = await page.locator("#transfer-code").inputValue();
  expect(code.length).toBeGreaterThan(20);
  await page.evaluate(() => {
    localStorage.setItem("enlab-cefr", "b1");
    localStorage.removeItem("enlab-weak");
  });
  await page.locator("#transfer-paste").fill(code);
  page.once("dialog", (d) => d.accept());
  await page.locator("#transfer-import").click();
  expect(await page.evaluate(() => localStorage.getItem("enlab-cefr"))).toBe("a2");
});

test("weekly exam button on Hoy", async ({ page }) => {
  await boot(page);
  await expect(page.locator("#weekly-exam-btn")).toBeVisible();
  await page.locator("#weekly-exam-btn").click();
  await expect(page.locator("#quiz.panel.active")).toBeVisible();
});

test("travel mode adds body class", async ({ page }) => {
  await boot(page);
  await page.locator("#travel-toggle").click();
  await expect(page.locator("#travel-map")).toBeVisible();
  await expect(page.locator("body")).toHaveClass(/travel-mode/);
});

test("podcasts in Oír tab", async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="vocales"]').click();
  await expect(page.locator("#podcast-list .podcast-card").first()).toBeVisible();
});

test("lab audit A–R in Ayuda", async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="ia"]').click();
  await expect(page.locator(".audit-table tbody tr")).toHaveCount(26);
});

test("kids mode sets slow voice", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    localStorage.setItem("enlab-rate", "normal");
    localStorage.setItem("enlab-kids", "0");
    if (typeof applyKidsMode === "function") applyKidsMode();
    if (typeof renderRateBar === "function") renderRateBar();
  });
  await page.locator("#kids-toggle").click();
  expect(await page.evaluate(() => localStorage.getItem("enlab-rate"))).toBe("slow");
  await expect(page.locator("#kids-toggle")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#kids-toggle")).toHaveClass(/on/);
  await expect(page.locator("#kids-banner")).toBeVisible();
});

test("repaso mode filters weak and shows quiz btn", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    localStorage.setItem("enlab-weak", JSON.stringify(["go", "see"]));
    localStorage.setItem("enlab-speak-only-weak", "0");
  });
  await page.reload();
  await page.locator("#repaso-btn").click();
  await expect(page.locator("body")).toHaveClass(/repaso-active/);
  await expect(page.locator("#repaso-quiz-btn")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("enlab-speak-only-weak"))).toBe("1");
});

test("duo mode starts", async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="hablar"]').click();
  await page.locator("#duo-start").click();
  await expect(page.locator("#duo-now p.kicker")).toBeVisible();
});

test("STAR draft box in interview", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => localStorage.setItem("enlab-cefr", "b1"));
  await page.reload();
  await page.locator('[data-tab="hablar"]').click();
  await expect(page.locator(".star-draft")).toBeVisible();
});

test("SRS due today when seeded", async ({ page }) => {
  await boot(page);
  const today = await page.evaluate(() => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  });
  await page.evaluate(({ today }) => {
    localStorage.setItem("enlab-srs", JSON.stringify({
      "dict:test phrase": { box: 0, iv: 1, due: today, label: "test phrase" },
    }));
  }, { today });
  await page.reload();
  await expect(page.locator("#due-today")).toBeVisible();
});

test("pharmacy and school situations exist", async ({ page }) => {
  await boot(page);
  const ok = await page.evaluate(() => ({
    ph: (window.ENLAB.phrasesSituation?.pharmacy || []).length >= 10,
    sc: (window.ENLAB.phrasesSituation?.school || []).length >= 10,
    sitN: Object.keys(window.ENLAB.phrasesSituation || {}).length >= 11,
  }));
  expect(ok.ph).toBe(true);
  expect(ok.sc).toBe(true);
  expect(ok.sitN).toBe(true);
  await page.locator("[data-sit-key='pharmacy']").click();
  await expect(page.locator("#situation-phrases")).toContainText(/prescription|ibuprofen/i);
});

test("listen quiz starts with a passage", async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="quiz"]').click();
  await page.locator('[data-quiz-mode="listen"]').click();
  await page.locator("#quiz-start").click();
  await expect(page.locator("#quiz-box .quiz-q")).toBeVisible();
  await expect(page.locator("#listen-next-pass")).toBeVisible();
});

test("classroom PIN blocks level change", async ({ page }) => {
  await boot(page);
  page.on("dialog", (d) => d.dismiss());
  await page.locator("#class-box").locator("summary").click();
  await page.locator("#class-pin").fill("1234");
  await page.locator("#class-pin-save").click();
  await expect(page.locator("#class-pin-status")).toContainText(/PIN/i);
  const before = await page.evaluate(() => localStorage.getItem("enlab-cefr") || "b1");
  await page.locator('[data-cefr]').first().click();
  const after = await page.evaluate(() => localStorage.getItem("enlab-cefr") || "b1");
  expect(after).toBe(before);
});

test("chat tone filter shows formal", async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="hablar"]').click();
  await page.locator("#chat-tone-filter").selectOption("formal");
  await expect(page.locator(".chat-msg.formal").first()).toBeVisible();
});

test("podcast of the day on Hoy", async ({ page }) => {
  await boot(page);
  await expect(page.locator("#podcast-today")).toBeVisible();
  await expect(page.locator("#podcast-today [data-podcast]")).toBeVisible();
});

test("quiz débiles button always on Hoy", async ({ page }) => {
  await boot(page);
  await expect(page.locator("#repaso-quiz-btn")).toBeVisible();
});

test("index.html defers pack-m/n/o/q and feature bundles to loader", async ({ request }) => {
  const html = await (await request.get("/index.html")).text();
  expect(html).not.toMatch(/<script src="pack-m\.js">/);
  expect(html).not.toMatch(/<script src="pack-n\.js">/);
  expect(html).not.toMatch(/<script src="pack-o\.js">/);
  expect(html).not.toMatch(/<script src="pack-q\.js">/);
  expect(html).not.toMatch(/<script src="features-nr\.js">/);
  expect(html).not.toMatch(/<script src="features-sv\.js">/);
  expect(html).toMatch(/<script src="pack\.js">/);
  expect(html).toMatch(/<script src="loader\.js">/);
});

test("VAPID public key and PNG icons are wired", async ({ page, request }) => {
  await boot(page);
  const vapid = await page.evaluate(() => typeof window.ENLAB_VAPID_PUBLIC === "string" && window.ENLAB_VAPID_PUBLIC.length > 20);
  expect(vapid).toBe(true);
  const hooks = await page.evaluate(() => typeof window.onTabPaint === "function"
    && typeof window.onHomePaint === "function"
    && typeof window.onSpeakVerdict === "function"
    && typeof window.onRecording === "function");
  expect(hooks).toBe(true);
  const man = await (await request.get("/manifest.webmanifest")).json();
  expect(man.icons.some((i) => i.src.includes("icon-192.png"))).toBe(true);
  expect(man.icons.some((i) => i.purpose === "maskable")).toBe(true);
  const png = await request.get("/icon-192.png");
  expect(png.status()).toBe(200);
});
