const { test, expect } = require("@playwright/test");
const { boot, openPrefs, openHoyExtras, revealInFolds, openOidoRoom, openLabRoom, openQuizMode } = require("./helpers/boot");

test("loads Hoy path and tabs", async ({ page }) => {
  await boot(page);
  await expect(page.locator("#hoy-path")).toBeVisible();
  await expect(page.locator(".hoy-next").first()).toBeVisible();
  await page.locator('[data-tab="hablar"]').click();
  await expect(page.locator("#hablar.panel.active")).toBeVisible();
  await expect(page.locator("#speak-target")).toBeVisible();
  await expect(page.locator("#hablar-hub [data-lab-jump='interview-sim-card']")).toBeVisible();
  await expect(page.locator("#hablar-hub [data-lab-jump='roleplay-card']")).toBeVisible();
  await expect(page.locator("#hablar-hub [data-lab-jump='email-card']")).toBeVisible();
  await expect(page.locator("#hablar-hub [data-lab-jump='chat-work-card']")).toBeVisible();
  await expect(page.locator("#hablar-hub [data-lab-jump='duo-card']")).toBeVisible();
  await page.locator('[data-tab="verbos"]').click();
  await expect(page.locator("#verb-today")).toBeVisible();
  await expect(page.locator("#verb-today .quiz-q")).not.toHaveText("");
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
  await openHoyExtras(page);
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
  await expect(page.locator("#quiz-hub [data-lab-jump='quiz-ear']")).toBeVisible();
  await expect(page.locator("#quiz-hub [data-lab-jump='quiz-exams']")).toBeVisible();
  await expect(page.locator("#quiz-hub [data-lab-jump='quiz-uso']")).toBeVisible();
  await openQuizMode(page, "dict");
  await expect(page.locator('[data-quiz-mode="dict"]')).toBeVisible();
  await openQuizMode(page, "place");
  await expect(page.locator('[data-quiz-mode="place"]')).toBeVisible();
  await expect(page.locator('[data-quiz-mode="weekly"]')).toBeVisible();
  await expect(page.locator('[data-quiz-mode="cert"]')).toBeVisible();
  await openQuizMode(page, "cond");
  await expect(page.locator('[data-quiz-mode="cond"]')).toBeVisible();
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
  await openQuizMode(page, "emailtone");
  await page.locator("#quiz-start").click();
  await expect(page.locator("#quiz-box .quiz-q")).toBeVisible();
});

test("podcast series blocks in Oír", async ({ page }) => {
  await boot(page);
  await openOidoRoom(page, "oido-podcasts");
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
  await revealInFolds(page, "#transfer-code");
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
  await openPrefs(page);
  await page.locator("#travel-toggle").click();
  await expect(page.locator("#travel-map")).toBeVisible();
  await expect(page.locator("body")).toHaveClass(/travel-mode/);
});

test("podcasts in Oír tab", async ({ page }) => {
  await boot(page);
  await openOidoRoom(page, "oido-podcasts");
  await expect(page.locator("#podcast-list .podcast-card").first()).toBeVisible();
});

test("lab audit A–R in Ayuda", async ({ page }) => {
  await boot(page);
  await openLabRoom(page, "lab-audit", "ia");
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
  await openPrefs(page);
  await page.locator("#kids-toggle").click();
  expect(await page.evaluate(() => localStorage.getItem("enlab-rate"))).toBe("slow");
  await expect(page.locator("#kids-toggle")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#kids-toggle")).toHaveClass(/on/);
  await expect(page.locator("#kids-banner")).toBeVisible();
});

test("repaso mode shows badge on Hoy tab", async ({ page }) => {
  await boot(page);
  await page.locator("#repaso-btn").click();
  await expect(page.locator('nav.tabs [data-tab="hoy"]')).toHaveClass(/repaso-on/);
  await page.locator("#repaso-exit").click();
  await expect(page.locator('nav.tabs [data-tab="hoy"]')).not.toHaveClass(/repaso-on/);
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
  await openLabRoom(page, "duo-card", "hablar");
  await page.locator("#duo-start").click();
  await expect(page.locator("#duo-now p.kicker")).toBeVisible();
});

test("STAR draft box in interview", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => localStorage.setItem("enlab-cefr", "b1"));
  await page.reload();
  await openLabRoom(page, "interview-sim-card", "hablar");
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
  /* re-boot after seeding to ensure packs are loaded before checking */
  await boot(page);
  await page.evaluate(() => renderDueToday && renderDueToday());
  await expect(page.locator("#due-today")).toBeVisible();
  await page.locator('[data-tab="quiz"]').click();
  await page.evaluate(() => {
    const sel = document.querySelector("#quiz-mode");
    if (sel) sel.value = "srs";
    if (typeof syncQuizModePicks === "function") syncQuizModePicks();
    if (typeof startQuiz === "function") startQuiz();
  });
  await expect(page.locator("#quiz-box .quiz-srs-why")).toBeVisible();
});

test("Quiz UX telemetry tracks abandon on tab switch", async ({ page }) => {
  await boot(page);
  await openQuizMode(page, "choice");
  await page.locator("#quiz-start").click();
  await expect(page.locator("#quiz-box .choices button").first()).toBeVisible();
  await page.locator('[data-tab="hoy"]').click();
  const row = await page.evaluate(() => {
    const map = JSON.parse(localStorage.getItem("enlab-quiz-ux") || "{}");
    return map.choice || null;
  });
  expect(row).toBeTruthy();
  expect(row.abandoned || 0).toBeGreaterThanOrEqual(1);
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
  await openHoyExtras(page);
  await page.locator("[data-sit-key='pharmacy']").click();
  await expect(page.locator("#situation-phrases")).toContainText(/prescription|ibuprofen/i);
});

test("listen quiz starts with a passage", async ({ page }) => {
  await boot(page);
  await openQuizMode(page, "listen");
  await page.locator("#quiz-start").click();
  await expect(page.locator("#quiz-box .quiz-q")).toBeVisible();
  await expect(page.locator("#listen-next-pass")).toBeVisible();
});

test("classroom PIN blocks level change", async ({ page }) => {
  await boot(page);
  page.on("dialog", (d) => d.dismiss());
  await revealInFolds(page, "#class-pin");
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
  await openLabRoom(page, "chat-work-card", "hablar");
  await page.locator("#chat-tone-filter").selectOption("formal");
  await expect(page.locator(".chat-msg.formal").first()).toBeVisible();
});

test("podcast of the day on Hoy", async ({ page }) => {
  await boot(page);
  await openHoyExtras(page);
  await expect(page.locator("#podcast-today")).toBeVisible();
  await expect(page.locator("#podcast-today [data-podcast]")).toBeVisible();
  const id = await page.locator("#podcast-today [data-podcast]").getAttribute("data-podcast");
  await page.evaluate((podId) => {
    localStorage.setItem("enlab-podcast-now", JSON.stringify({
      id: podId, seg: 1, day: todayKey(), at: Date.now(),
    }));
    if (typeof renderPodcastToday === "function") renderPodcastToday();
  }, id);
  await expect(page.locator("#podcast-today [data-podcast]")).toContainText(/Seguir|Continue/i);
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

test("SRS quiz mode button exists in exam room", async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="quiz"]').click();
  await page.locator('[data-lab-jump="quiz-exams"]').click();
  await expect(page.locator('[data-quiz-mode="srs"]')).toBeVisible();
});

test("Quick session mode starts adaptive round", async ({ page }) => {
  await boot(page);
  await openQuizMode(page, "quickmix");
  await page.locator("#quiz-start").click();
  await expect(page.locator("#quiz-box .quiz-q, #quiz-box .choices button, #quiz-box #quiz-input").first()).toBeVisible();
  await expect(page.locator("#quiz-box .quiz-quickmix-plan")).toBeVisible();
});

test("Quick session mode is wired in hidden selector", async ({ page }) => {
  await boot(page);
  const has = await page.evaluate(() => {
    const sel = document.querySelector("#quiz-mode");
    return !!sel && !!sel.querySelector('option[value="quickmix"]');
  });
  expect(has).toBe(true);
});

test("Quiz end card shows coach one-click CTA", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    localStorage.setItem("enlab-quiz-ux", JSON.stringify({
      ear: { sessions: 5, completed: 2, abandoned: 3, answers: 10, correct: 5, ms: 60000 },
    }));
  });
  await openQuizMode(page, "dict");
  await page.locator("#quiz-start").click();
  await page.evaluate(() => {
    sessionStorage.removeItem("enlab-coach-plan");
    sessionStorage.removeItem("enlab-coach-plan-flow");
    quiz.i = quiz.items.length;
    renderQuiz();
  });
  await expect(page.locator("#quiz-box .quiz-coach-steps .btn.sm").first()).toBeVisible();
});

test("Quiz end shows coach plan bar when plan in progress", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 1, steps: ["ear", "uso", "choice"],
    }));
    setCoachPlanFlow(true);
    const sel = document.querySelector("#quiz-mode");
    if (sel) sel.value = "choice";
    if (typeof syncQuizModePicks === "function") syncQuizModePicks();
    if (typeof startQuiz === "function") startQuiz();
    if (typeof quiz !== "undefined" && typeof renderQuiz === "function") {
      quiz.i = quiz.items.length;
      renderQuiz();
    }
  });
  await expect(page.locator("#quiz-box .quiz-coach-plan")).toBeVisible();
  await expect(page.locator("#quiz-box [data-coach-plan-step='1']")).toBeVisible();
});

test("Hoy tab shows coach plan badge when in progress", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 2, steps: ["ear", "uso", "choice"],
    }));
    if (typeof syncPrefsBadge === "function") syncPrefsBadge();
  });
  await expect(page.locator('nav.tabs [data-tab="hoy"].coach-plan-on')).toBeVisible();
  await expect(page.locator('nav.tabs [data-tab="hoy"]')).toHaveAttribute("data-coach-plan", "2/3");
});

test("Quiz tab shows coach plan badge when in progress", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 1, steps: ["ear", "uso", "choice"],
    }));
    if (typeof syncPrefsBadge === "function") syncPrefsBadge();
  });
  await expect(page.locator('nav.tabs [data-tab="quiz"].coach-plan-on')).toBeVisible();
  await expect(page.locator('nav.tabs [data-tab="quiz"]')).toHaveAttribute("data-coach-plan", "1/3");
});

test("Hoy and Quiz tabs show pending coach plan badge when not started", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.removeItem("enlab-coach-plan");
    sessionStorage.removeItem("enlab-coach-plan-flow");
    if (typeof syncPrefsBadge === "function") syncPrefsBadge();
  });
  await expect(page.locator('nav.tabs [data-tab="hoy"].coach-plan-pending-on')).toBeVisible();
  await expect(page.locator('nav.tabs [data-tab="hoy"]')).toHaveAttribute("data-coach-plan", "0/3");
  await expect(page.locator('nav.tabs [data-tab="quiz"].coach-plan-pending-on')).toBeVisible();
  await expect(page.locator('nav.tabs [data-tab="quiz"]')).toHaveAttribute("data-coach-plan", "0/3");
});

test("Pending coach plan badge hides when plan in progress", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 1, steps: ["ear", "uso", "choice"],
    }));
    if (typeof syncPrefsBadge === "function") syncPrefsBadge();
  });
  await expect(page.locator('nav.tabs [data-tab="hoy"].coach-plan-pending-on')).toHaveCount(0);
  await expect(page.locator('nav.tabs [data-tab="hoy"].coach-plan-on')).toBeVisible();
});

test("Pending coach plan badge hides during repaso-plan focus", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 1, steps: ["ear", "uso", "choice"],
    }));
    localStorage.setItem("enlab-repaso", "1");
    if (typeof startRepasoMode === "function") startRepasoMode();
    if (typeof syncPrefsBadge === "function") syncPrefsBadge();
  });
  await expect(page.locator('nav.tabs [data-tab="hoy"].repaso-plan-on')).toBeVisible();
  await expect(page.locator('nav.tabs [data-tab="hoy"].coach-plan-pending-on')).toHaveCount(0);
  await expect(page.locator('nav.tabs [data-tab="hoy"].coach-plan-on')).toHaveCount(0);
});

test("Hoy path plan chip pulses first time pending", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.removeItem("enlab-coach-plan");
    localStorage.removeItem("enlab-plan-pulse-day");
    hoyPathI = hoyPath().length;
    persistHoyPath();
    if (typeof renderHoyPath === "function") renderHoyPath();
  });
  await expect(page.locator("#hoy-path-plan [data-coach-plan-go].next-act")).toBeVisible();
});

test("You-are shows resume plan chip after abandon", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.removeItem("enlab-coach-plan");
    sessionStorage.setItem("enlab-coach-plan-flow", "1");
    if (typeof startCoachPlanQuiz === "function") startCoachPlanQuiz("ear");
  });
  await page.locator('[data-tab="hoy"]').click();
  await page.waitForFunction(() => document.querySelector("#you-are-chips [data-coach-plan-go]"));
  await expect(page.locator("#you-are-chips")).toContainText(/retomar|resume plan/i);
});

test("Hoy path plan chip shows 0/3 when plan not started", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.removeItem("enlab-coach-plan");
    if (typeof renderHoyPath === "function") renderHoyPath();
  });
  await expect(page.locator("#hoy-path-plan [data-coach-plan-go]")).toBeVisible();
  await expect(page.locator("#hoy-path-plan")).toContainText(/0\/3/);
});

test("Cert warmup streak auto-flow after second warm-up", async ({ page }) => {
  await boot(page);
  await openQuizMode(page, "ear");
  await page.locator("#quiz-start").click();
  const flowOn = await page.evaluate(() => {
    sessionStorage.removeItem("enlab-coach-plan");
    sessionStorage.removeItem("enlab-coach-plan-flow");
    localStorage.setItem("enlab-cert-warmup", JSON.stringify({ day: todayKey(), n: 1 }));
    setCertWarmupMode("ear");
    quiz.i = quiz.items.length;
    renderQuiz();
    return coachPlanFlowOn();
  });
  expect(flowOn).toBe(true);
  await expect(page.locator("#quiz-box .cert-warmup-plan")).toContainText(/plan 8 min|8-min plan/i);
  await expect(page.locator("#quiz-box .quiz-plan-auto")).toContainText(/calentamiento|warm-up/i);
  const ms = await page.evaluate(() => coachPlanAutoDelayMs());
  expect(ms).toBe(200);
});

test("Coach plan auto-continue message after step complete", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 0, steps: ["ear", "uso", "choice"],
    }));
    setCoachPlanFlow(true);
    const sel = document.querySelector("#quiz-mode");
    if (sel) sel.value = "ear";
    if (typeof syncQuizModePicks === "function") syncQuizModePicks();
    if (typeof startQuiz === "function") startQuiz();
    if (typeof quiz !== "undefined" && typeof renderQuiz === "function") {
      bumpCoachPlanProgress("ear");
      quiz.i = quiz.items.length;
      renderQuiz();
    }
  });
  await expect(page.locator("#quiz-box .quiz-plan-auto")).toBeVisible();
});

test("Quiz hub offers start 8-min plan when not started", async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="quiz"]').click();
  await expect(page.locator("#quiz-now [data-coach-plan-step='0']")).toBeVisible();
  await expect(page.locator("#quiz-now")).toContainText(/plan|Plan/i);
});

test("Coach plan skip cancels auto-continue", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 1, steps: ["ear", "uso", "choice"],
    }));
    setCoachPlanFlow(true);
    const sel = document.querySelector("#quiz-mode");
    if (sel) sel.value = "ear";
    if (typeof syncQuizModePicks === "function") syncQuizModePicks();
    if (typeof startQuiz === "function") startQuiz();
    if (typeof quiz !== "undefined" && typeof renderQuiz === "function") {
      bumpCoachPlanProgress("ear");
      quiz.i = quiz.items.length;
      renderQuiz();
    }
  });
  await expect(page.locator("#coach-plan-skip")).toBeVisible();
  await page.evaluate(() => document.querySelector("#coach-plan-skip")?.click());
  await expect(page.locator("#coach-plan-skip")).toHaveCount(0);
});

test("Quiz easy mode recovers after two completed streaks", async ({ page }) => {
  await boot(page);
  const easyAfterTwo = await page.evaluate(() => {
    localStorage.setItem("enlab-quiz-ux", JSON.stringify({
      choice: { sessions: 8, completed: 6, abandoned: 2, answers: 40, correct: 22, ms: 120000, easyStreak: 2 },
    }));
    return typeof quizEasyOn === "function" && quizEasyOn("choice");
  });
  expect(easyAfterTwo).toBe(false);
});

test("Quiz easy mode trims options when drop-off is high", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    localStorage.setItem("enlab-quiz-ux", JSON.stringify({
      choice: { sessions: 6, completed: 1, abandoned: 4, answers: 20, correct: 8, ms: 90000 },
    }));
    const sel = document.querySelector("#quiz-mode");
    if (sel) sel.value = "choice";
    if (typeof syncQuizModePicks === "function") syncQuizModePicks();
    if (typeof startQuiz === "function") startQuiz();
  });
  await expect(page.locator("#quiz-box .pill")).toContainText(/fácil|easy/i);
  await expect(page.locator("#quiz-box .choices button")).toHaveCount(3);
});

test("Hoy path shows coach plan chip when plan pending", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 1, steps: ["ear", "uso", "choice"],
    }));
    if (typeof renderHoyPath === "function") renderHoyPath();
  });
  await expect(page.locator("#hoy-path-plan [data-coach-plan-go]")).toBeVisible();
  await expect(page.locator("#hoy-path-plan")).toContainText(/1\/3/);
});

test("Quiz tab quickmix hot badge after 3-day friction streak", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const daily = {};
    for (let i = 0; i < 3; i += 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const p = (n) => String(n).padStart(2, "0");
      const key = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
      daily[key] = { ear: { sessions: 4, abandoned: 3, completed: 1 } };
    }
    localStorage.setItem("enlab-quiz-ux-daily", JSON.stringify(daily));
    if (typeof syncPrefsBadge === "function") syncPrefsBadge();
  });
  await expect(page.locator('nav.tabs [data-tab="quiz"].quickmix-hot')).toBeVisible();
});

test("Repaso quiz button starts coach plan when pending", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 0, steps: ["ear", "uso", "choice"],
    }));
    if (typeof startRepasoMode === "function") startRepasoMode();
    if (typeof syncRepasoQuizBtn === "function") syncRepasoQuizBtn();
  });
  await expect(page.locator("#repaso-quiz-btn")).toContainText(/plan 8 min|8-min plan/i);
  await page.locator("#repaso-quiz-btn").click();
  await expect(page.locator("#quiz.panel.active")).toBeVisible();
  await expect(page.locator("#quiz-mode")).toHaveValue("ear");
});

test("Kids mode simplifies coach plan tab badge", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.removeItem("enlab-coach-plan");
    localStorage.setItem("enlab-kids", "1");
    if (typeof applyKidsMode === "function") applyKidsMode();
    if (typeof syncPrefsBadge === "function") syncPrefsBadge();
  });
  await expect(page.locator('nav.tabs [data-tab="hoy"].coach-plan-kids-on')).toBeVisible();
  await expect(page.locator('nav.tabs [data-tab="hoy"]')).toHaveAttribute("data-coach-plan", "●");
});

test("Verbos auto-selects Plan hoy filter on coach verb step", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 2, steps: ["ear", "uso", "choice"],
    }));
    sessionStorage.removeItem("enlab-verb-coach-auto");
    if (typeof paintTab === "function") paintTab("verbos");
  });
  await page.locator('[data-tab="verbos"]').click();
  await expect(page.locator('#verb-filters [data-only="coach"].on')).toBeVisible();
});

test("90d chart friction day opens quickmix", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const day = todayKey();
    localStorage.setItem("enlab-quiz-ux-daily", JSON.stringify({
      [day]: { ear: { sessions: 4, abandoned: 3, completed: 1 } },
    }));
    if (typeof renderStreakChart === "function") renderStreakChart();
  });
  await openHoyExtras(page);
  await page.locator("#hoy-streak-chart .streak-day[data-friction-day='1']").click();
  await expect(page.locator("#quiz.panel.active")).toBeVisible();
  await expect(page.locator("#quiz-mode")).toHaveValue("quickmix");
});

test("Verbos filter shows Plan hoy when coach step is verbs", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 2, steps: ["ear", "uso", "choice"],
    }));
    if (typeof renderVerbs === "function") renderVerbs();
  });
  await page.locator('[data-tab="verbos"]').click();
  await expect(page.locator('#verb-filters [data-only="coach"]')).toBeVisible();
});

test("Alt+1 switches to Hoy tab", async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="hablar"]').click();
  await expect(page.locator("#hablar.panel.active")).toBeVisible();
  await page.keyboard.press("Alt+1");
  await expect(page.locator("#hoy.panel.active")).toBeVisible();
});

test("weekly history renders after marking weekly done", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const hist = [{ week: "2026-W30", score: 8, total: 12, at: "2026-07-25" }];
    localStorage.setItem("enlab-weekly-history", JSON.stringify(hist));
  });
  await page.locator('[data-tab="quiz"]').click();
  await page.locator('[data-lab-jump="quiz-exams"]').click();
  const histEl = page.locator("#weekly-history");
  await expect(histEl).toBeVisible();
  await expect(histEl.locator(".wh-row")).toHaveCount(1);
});

test("statsTotals returns days count", async ({ page }) => {
  await boot(page);
  const days = await page.evaluate(() => {
    if (typeof statsTotals !== "function") return -1;
    return statsTotals().days;
  });
  expect(days).toBeGreaterThanOrEqual(0);
});

test("journal sort select renders after seeding errors", async ({ page }) => {
  /* seed errors before boot so they're already in localStorage on first paint */
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("enlab-welcome-v2", "1");
    localStorage.setItem("enlab-onboard-v3", "1");
    localStorage.setItem("enlab-guide-quiet", "1");
    localStorage.setItem("enlab-errors", JSON.stringify([
      { at: Date.now(), mode: "choice", prompt: "go", expected: "went", said: "goed", why: "" },
      { at: Date.now() - 1000, mode: "uso", prompt: "Do you...", expected: "Happens", said: "Is happened", why: "" },
    ]));
  });
  await page.reload();
  await page.waitForFunction(
    () => (window.ENLAB?.podcasts || []).length >= 40 && window.NR && window.SV && window.PLUS,
    { timeout: 30000 }
  );
  await openLabRoom(page, "error-journal", "ia");
  await page.evaluate(() => window.PLUS?.renderErrorJournal?.());
  await page.waitForSelector("#journal-sort", { timeout: 5000 });
  await expect(page.locator("#journal-sort")).toBeVisible();
});

test("Verbos: filter panel has scope and pattern sections", async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="verbos"]').click();
  await expect(page.locator(".verb-filter-label")).toContainText(/Mostrar|Show/i);
  await expect(page.locator("[data-only='weak']")).toBeVisible();
  await expect(page.locator(".verb-filter-fam summary")).toBeVisible();
  await page.locator("[data-only='weak']").click();
  await expect(page.locator("#verb-filter-summary")).toBeVisible();
  await expect(page.locator("[data-verb-filter-reset]")).toBeVisible();
});

test("Escape closes lab room", async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="quiz"]').click();
  await openLabRoom(page, "quiz-verbs", "quiz");
  await expect(page.locator("#quiz.lab-in")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#quiz.lab-in")).toHaveCount(0);
});

test("Verbos: W/F/D keyboard toggles weak-strong markers", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    localStorage.setItem("enlab-weak", "[]");
    localStorage.setItem("enlab-known", "[]");
  });
  await page.locator('[data-tab="verbos"]').click();
  const first = page.locator("#verb-list [data-verb-card]").first();
  await first.click();
  await page.keyboard.press("w");
  await expect(first.locator(".pill.warn")).toBeVisible();
  await page.keyboard.press("f");
  await expect(first.locator(".pill.ok")).toBeVisible();
  await page.keyboard.press("d");
  await expect(first.locator(".pill.warn")).toHaveCount(0);
});

test("Verbos: compact toggle and drill 10", async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="verbos"]').click();
  await page.locator("[data-verb-compact]").click();
  await expect(page.locator("#verb-list.compact")).toBeVisible();
  await page.locator("[data-verb-drill10]").click();
  await expect(page.locator("#quiz-box .quiz-q, #quiz-box .choices button").first()).toBeVisible();
});

test("Verbos: smart drill and family heatmap visible", async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="verbos"]').click();
  await expect(page.locator(".verb-heatmap summary")).toBeVisible();
  await page.locator("[data-verb-drill-smart]").click();
  await expect(page.locator("#quiz-box .quiz-q, #quiz-box .choices button").first()).toBeVisible();
});

test("Hoy path inline plan step when plan started", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 1, steps: ["ear", "uso", "choice"],
    }));
    hoyPathI = hoyPath().length;
    persistHoyPath();
    finishHoyPath();
  });
  await expect(page.locator("#hoy-path-copy")).toContainText(/paso 1\/3|step 1\/3/i);
});

test("Quiz end without plan shows peer modes not coach plan bar", async ({ page }) => {
  await boot(page);
  await openQuizMode(page, "dict");
  await page.locator("#quiz-start").click();
  await page.evaluate(() => {
    sessionStorage.removeItem("enlab-coach-plan");
    sessionStorage.removeItem("enlab-coach-plan-flow");
    quiz.i = quiz.items.length;
    renderQuiz();
  });
  await expect(page.locator("#quiz-box .quiz-peers")).toBeVisible();
  await expect(page.locator("#quiz-box .quiz-coach-plan")).toHaveCount(0);
});

test("Repaso filters review to pending coach step", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    localStorage.setItem("enlab-ear-weak", JSON.stringify(["a|b"]));
    localStorage.setItem("enlab-weak", JSON.stringify(["go"]));
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 1, steps: ["ear", "uso", "choice"],
    }));
    if (typeof startRepasoMode === "function") startRepasoMode();
    if (typeof renderHoyReview === "function") renderHoyReview();
  });
  await expect(page.locator("#hoy-review")).toContainText(/filtrado|filtered/i);
  await expect(page.locator("#hoy-review .review-section").filter({ hasText: /Oído|Ear/i })).toHaveCount(0);
});

test("Quickmix auto-selected opening exams after hot streak", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const daily = {};
    for (let i = 0; i < 3; i += 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const p = (n) => String(n).padStart(2, "0");
      const key = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
      daily[key] = { ear: { sessions: 4, abandoned: 3, completed: 1 } };
    }
    localStorage.setItem("enlab-quiz-ux-daily", JSON.stringify(daily));
    const sel = document.querySelector("#quiz-mode");
    if (sel) sel.value = "weekly";
  });
  await page.locator('nav.tabs [data-tab="quiz"]').click();
  await openLabRoom(page, "quiz-exams", "quiz");
  await expect(page.locator("#quiz-mode")).toHaveValue("quickmix");
});

test("Hoy: cert warmup chip when cierre ear miss", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.removeItem("enlab-coach-plan");
    sessionStorage.removeItem("enlab-coach-plan-flow");
    localStorage.removeItem("enlab-repaso");
    localStorage.setItem("enlab-cert-score", JSON.stringify({
      timeUp: true, day: todayKey(), score: 8, total: 24, pct: 33, pass: false,
    }));
    sessionStorage.setItem("enlab-cierre-result", JSON.stringify({
      day: todayKey(), score: 1, n: 3, fails: 1, earFail: "ship|sheep",
    }));
    hoyPathI = hoyPath().length;
    persistHoyPath();
    finishHoyPath();
    invalidateYouAreChipsCache();
    if (typeof fillYouAre === "function") fillYouAre();
  });
  await expect(page.locator("#you-are-chips [data-cert-warmup]")).toBeVisible();
  await expect(page.locator("#you-are-chips [data-cert-retry]")).toBeVisible();
});

test("Repaso banner suggests plan when not started", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.removeItem("enlab-coach-plan");
    sessionStorage.removeItem("enlab-coach-plan-flow");
    if (typeof startRepasoMode === "function") startRepasoMode();
    if (typeof renderHoyReview === "function") renderHoyReview();
  });
  await expect(page.locator("#hoy-review")).toContainText(/plan 8 min|8-min plan/i);
});

test("Weekly fail chip offers plan on pending step", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.removeItem("enlab-coach-plan");
    localStorage.setItem("enlab-weekly-fails", JSON.stringify({
      day: todayKey(), modes: ["ear", "uso"], at: Date.now(),
    }));
    invalidateYouAreChipsCache();
    fillYouAre();
  });
  await expect(page.locator("#you-are-chips [data-coach-plan-go][data-coach-plan-mode='ear']")).toBeVisible();
  await expect(page.locator("#you-are-chips")).toContainText(/semanal|weekly/i);
});

test("Transfer hint includes plan progress", async ({ page }) => {
  await boot(page);
  const hint = await page.evaluate(() => {
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 1, steps: ["ear", "uso", "choice"],
    }));
    return transferPlanHintSuffix();
  });
  expect(hint).toMatch(/1\/3|plan/i);
});

test("Repaso plan-only banner when coach step pending", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 1, steps: ["ear", "uso", "choice"],
    }));
    if (typeof startRepasoMode === "function") startRepasoMode();
    if (typeof renderHoyReview === "function") renderHoyReview();
  });
  await expect(page.locator("#hoy-review")).toContainText(/solo paso|plan step only/i);
});

test("Cert warmup streak offers full 8-min plan", async ({ page }) => {
  await boot(page);
  await openQuizMode(page, "ear");
  await page.locator("#quiz-start").click();
  await page.evaluate(() => {
    sessionStorage.removeItem("enlab-coach-plan");
    localStorage.setItem("enlab-cert-warmup", JSON.stringify({ day: todayKey(), n: 1 }));
    setCertWarmupMode("ear");
    quiz.i = quiz.items.length;
    renderQuiz();
  });
  await expect(page.locator("#quiz-box .cert-warmup-plan")).toContainText(/plan 8 min|8-min plan/i);
  await expect(page.locator("#quiz-box [data-coach-plan-go][data-coach-plan-mode='ear']")).toBeVisible();
});

test("Cert warmup streak persists in localStorage", async ({ page }) => {
  await boot(page);
  const n = await page.evaluate(() => {
    localStorage.setItem("enlab-cert-warmup", JSON.stringify({ day: todayKey(), n: 1 }));
    sessionStorage.clear();
    return certWarmupStreak();
  });
  expect(n).toBe(1);
});

test("Coach plan mirror restores flow flag", async ({ page }) => {
  await boot(page);
  const ok = await page.evaluate(() => {
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 1, steps: ["ear", "uso", "choice"],
    }));
    sessionStorage.setItem("enlab-coach-plan-flow", "1");
    persistCoachPlanMirror();
    sessionStorage.removeItem("enlab-coach-plan");
    sessionStorage.removeItem("enlab-coach-plan-flow");
    restoreCoachPlanFromMirror();
    return coachPlanProgress() === 1 && coachPlanFlowOn();
  });
  expect(ok).toBe(true);
});

test("Hoy tab repaso-plan badge shows timer minutes", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 1, steps: ["ear", "uso", "choice"],
    }));
    localStorage.setItem("enlab-repaso", "1");
    if (typeof startRepasoMode === "function") startRepasoMode();
    if (typeof syncPrefsBadge === "function") syncPrefsBadge();
  });
  await expect(page.locator('nav.tabs [data-tab="hoy"].repaso-plan-on')).toBeVisible();
  await expect(page.locator('nav.tabs [data-tab="hoy"]')).toHaveAttribute("data-repaso-plan-min", "8");
});

test("Cert warm-up arms faster auto delay", async ({ page }) => {
  await boot(page);
  const ms = await page.evaluate(() => {
    sessionStorage.removeItem("enlab-coach-plan-armed");
    setCoachPlanArmed(true);
    return coachPlanAutoDelayMs();
  });
  expect(ms).toBe(200);
});

test("Guide Hoy hints pending coach plan after path done", async ({ page }) => {
  await boot(page);
  const why = await page.evaluate(() => {
    sessionStorage.removeItem("enlab-coach-plan");
    sessionStorage.removeItem("enlab-coach-plan-flow");
    localStorage.removeItem("enlab-place-result");
    const hoy = document.getElementById("hoy");
    hoy?.classList.add("path-done");
    hoy?.classList.remove("path-on");
    if (typeof fillGuide === "function") fillGuide();
    return document.getElementById("guide-why")?.textContent || "";
  });
  expect(why).toMatch(/plan 8 min|8-min plan/i);
});

test("Guide quiz-exams hints placement when nudge active", async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="quiz"]').click();
  await page.locator('#quiz-hub [data-lab-jump="quiz-exams"]').click();
  const why = await page.evaluate(() => {
    localStorage.setItem("enlab-place-result", JSON.stringify({ score: 6, n: 20, at: Date.now() }));
    sessionStorage.removeItem("enlab-coach-plan");
    if (typeof fillGuide === "function") fillGuide();
    return document.getElementById("guide-why")?.textContent || "";
  });
  expect(why).toMatch(/30%|plan 8 min|8-min plan/i);
  expect(why).toMatch(/×|ocultar|dismiss/i);
});

test("Hoy placement chip dismiss hides nudge", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.removeItem("enlab-coach-plan");
    localStorage.setItem("enlab-place-result", JSON.stringify({ score: 6, n: 20, cefr: "a1", at: Date.now() }));
    fillYouAre();
  });
  await expect(page.locator("[data-place-nudge-dismiss]")).toBeVisible();
  await page.locator("[data-place-nudge-dismiss]").click();
  await expect(page.locator("[data-place-nudge-dismiss]")).toHaveCount(0);
  await expect(page.locator("#you-are-chips")).not.toContainText(/40%/);
  const nudge = await page.evaluate(() => placePlanNudgeOn());
  expect(nudge).toBe(false);
});

test("Coach plan armed uses shorter auto delay", async ({ page }) => {
  await boot(page);
  const ms = await page.evaluate(() => {
    sessionStorage.removeItem("enlab-coach-plan-armed");
    const cold = coachPlanAutoDelayMs();
    setCoachPlanArmed(true);
    const hot = coachPlanAutoDelayMs();
    return { cold, hot };
  });
  expect(ms.cold).toBe(1400);
  expect(ms.hot).toBe(200);
});

test("Guide Hoy hints repaso plan timer", async ({ page }) => {
  await boot(page);
  const why = await page.evaluate(() => {
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 1, steps: ["ear", "uso", "choice"],
    }));
    localStorage.setItem("enlab-repaso", "1");
    if (typeof fillGuide === "function") fillGuide();
    return document.getElementById("guide-why")?.textContent || "";
  });
  expect(why).toMatch(/repaso|review|plan|min/i);
});

test("Weekly fails pruned after 8 days", async ({ page }) => {
  await boot(page);
  const left = await page.evaluate(() => {
    localStorage.setItem("enlab-weekly-fails", JSON.stringify({
      day: "2000-01-01", modes: ["ear"], at: Date.now() - 8 * 86400000,
    }));
    pruneWeeklyFails();
    return localStorage.getItem("enlab-weekly-fails");
  });
  expect(left).toBeNull();
});

test("Hoy placement low score shows plan chip", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.removeItem("enlab-coach-plan");
    sessionStorage.removeItem("enlab-coach-plan-flow");
    localStorage.setItem("enlab-place-result", JSON.stringify({ score: 6, n: 20, cefr: "a1", at: Date.now() }));
    fillYouAre();
  });
  await expect(page.locator("#you-are-chips [data-coach-plan-go]")).toBeVisible();
  await expect(page.locator("#you-are-chips")).toContainText(/40%|plan 8 min/i);
});

test("Repaso shows plan timer hint near clock", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 1, steps: ["ear", "uso", "choice"],
    }));
    if (typeof startRepasoMode === "function") startRepasoMode();
    if (typeof renderClock === "function") renderClock();
  });
  await expect(page.locator("#hoy-repaso-plan-timer")).toBeVisible();
  await expect(page.locator("#hoy-repaso-plan-timer")).toContainText(/min/i);
});

test("Place result pruned when coach plan completes", async ({ page }) => {
  await boot(page);
  const left = await page.evaluate(() => {
    localStorage.setItem("enlab-place-result", JSON.stringify({ score: 6, n: 20, at: Date.now() }));
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 2, steps: ["ear", "uso", "choice"],
    }));
    bumpCoachPlanProgress("choice");
    return localStorage.getItem("enlab-place-result");
  });
  expect(left).toBeNull();
});

test("Repaso step budget when coach plan in progress", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 1, steps: ["ear", "uso", "choice"],
    }));
    if (typeof startRepasoMode === "function") startRepasoMode();
    if (typeof renderHoyReview === "function") renderHoyReview();
  });
  await expect(page.locator("#hoy-review .repaso-step-budget")).toBeVisible();
  await expect(page.locator("#hoy-review .repaso-step-budget")).toContainText(/min/i);
});

test("Guide quiz-exams hints plan pending", async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="quiz"]').click();
  await page.locator('#quiz-hub [data-lab-jump="quiz-exams"]').click();
  const why = await page.evaluate(() => {
    sessionStorage.removeItem("enlab-coach-plan");
    if (typeof fillGuide === "function") fillGuide();
    return document.getElementById("guide-why")?.textContent || "";
  });
  expect(why).toMatch(/plan 8 min|8-min plan/i);
});

test("Coach plan mirror restores after session clear", async ({ page }) => {
  await boot(page);
  const ok = await page.evaluate(() => {
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 2, steps: ["ear", "uso", "choice"],
    }));
    persistCoachPlanMirror();
    sessionStorage.removeItem("enlab-coach-plan");
    restoreCoachPlanFromMirror();
    return coachPlanProgress();
  });
  expect(ok).toBe(2);
});

test("Cert warmup round offers plan 8 min CTA", async ({ page }) => {
  await boot(page);
  await openQuizMode(page, "ear");
  await page.locator("#quiz-start").click();
  await page.evaluate(() => {
    sessionStorage.removeItem("enlab-coach-plan");
    setCertWarmupMode("ear");
    quiz.i = quiz.items.length;
    renderQuiz();
  });
  await expect(page.locator("#quiz-box [data-coach-plan-go]")).toBeVisible();
  await expect(page.locator("#quiz-box .cert-warmup-plan")).toBeVisible();
});

test("Repaso P shortcut starts coach plan when pending", async ({ page }) => {
  await boot(page);
  await page.locator('[data-tab="hoy"]').click();
  await page.evaluate(() => {
    sessionStorage.removeItem("enlab-coach-plan");
    if (typeof startRepasoMode === "function") startRepasoMode();
    if (typeof syncRepasoQuizBtn === "function") syncRepasoQuizBtn();
  });
  await expect(page.locator("#repaso-quiz-btn")).toContainText(/plan 8 min|8-min plan/i);
  await page.keyboard.press("p");
  await page.waitForFunction(() => document.querySelector("#quiz.panel.active"));
  await expect(page.locator("#quiz.panel.active")).toBeVisible();
});

test("Repaso coach timer is shorter when plan pending", async ({ page }) => {
  await boot(page);
  const secs = await page.evaluate(() => {
    sessionStorage.setItem("enlab-coach-plan", JSON.stringify({
      day: todayKey(), done: 1, steps: ["ear", "uso", "choice"],
    }));
    return repasoTimerSecs();
  });
  expect(secs).toBe(480);
  expect(secs).toBeLessThan(600);
});
