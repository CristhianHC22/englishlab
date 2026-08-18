/* Lotes S–V + UX: pronunciación, aula pro, historias, writing, onboarding, offline, a11y, i18n */
(function () {
  "use strict";

  function ipaToPhonemes(ipa) {
    return (ipa || "").toLowerCase().replace(/[/ˈˌ\s]/g, "").split("");
  }

  function phonemeDistance(a, b) {
    const pa = ipaToPhonemes(a);
    const pb = ipaToPhonemes(b);
    if (!pa.length || !pb.length) return 1;
    const m = pa.length;
    const n = pb.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i += 1) dp[i][0] = i;
    for (let j = 0; j <= n; j += 1) dp[0][j] = j;
    for (let i = 1; i <= m; i += 1) {
      for (let j = 1; j <= n; j += 1) {
        const cost = pa[i - 1] === pb[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[m][n] / Math.max(m, n);
  }

  function scorePronunciation(said, targetIpa, targetText) {
    if (!said) return { score: 0, pct: 0, note: "No se oyó nada" };
    const norm = typeof speakVariants === "function"
      ? speakVariants(said).join(" ")
      : said.toLowerCase();
    if (typeof speakHeardOk === "function" && speakHeardOk(said, targetText)) {
      return { score: 100, pct: 100, note: "¡Muy bien! Coincide con el objetivo." };
    }
    const dist = phonemeDistance(norm.replace(/\s/g, ""), targetIpa);
    const pct = Math.max(0, Math.round((1 - dist) * 100));
    let note = pct >= 80 ? "Cerca — repite más despacio." : pct >= 50 ? "Se entiende, sigue practicando." : "Lejos del objetivo — oye otra vez.";
    return { score: pct, pct, note, dist };
  }

  function loadStoryProgress() {
    try { return JSON.parse(localStorage.getItem("enlab-story-progress") || "{}"); } catch { return {}; }
  }

  function saveStoryProgress(id, nodeId, score) {
    const p = loadStoryProgress();
    p[id] = { node: nodeId, score: Math.max(p[id]?.score || 0, score || 0), at: Date.now() };
    localStorage.setItem("enlab-story-progress", JSON.stringify(p));
  }

  function loadRoster() {
    try { return JSON.parse(localStorage.getItem("enlab-class-roster") || "[]"); } catch { return []; }
  }

  function saveRoster(list) {
    localStorage.setItem("enlab-class-roster", JSON.stringify(list));
  }

  /* ── Render: Pronunciation (Lote S) ── */
  function renderPronPanel() {
    const host = document.querySelector("#pron-panel");
    if (!host || !ENLAB.minimalPairs) return;
    const pairs = ENLAB.minimalPairs.filter((p) => (p.min || 1) <= (typeof lvlNum === "function" ? lvlNum() : 2));
    const accent = localStorage.getItem("enlab-accent-pref") || "us";
    host.innerHTML = `
      <p class="kicker">${esc(typeof t === "function" ? t("pron") : "Pronunciación")}</p>
      <p class="muted">${esc(typeof t === "function" ? t("pronHint") : "Mínimos pares + IPA. Graba y compara.")}</p>
      <label class="muted">${esc(typeof t === "function" ? t("accent") : "Acento")}:
        <select id="accent-pref">
          <option value="us" ${accent === "us" ? "selected" : ""}>US</option>
          <option value="uk" ${accent === "uk" ? "selected" : ""}>UK</option>
        </select>
      </label>
      <div class="grid grid-2" style="margin-top:12px">
        ${pairs.slice(0, 12).map((p, i) => `
          <div class="card pron-pair" data-pron-i="${i}">
            <p><strong>${esc(p.a)}</strong> ${esc(p.ipaA)} · <strong>${esc(p.b)}</strong> ${esc(p.ipaB)}</p>
            <p class="muted">${esc(p.hint)}</p>
            <div class="row">
              <button type="button" class="chip say" data-say="${esc(p.sayA || p.a)}">A</button>
              <button type="button" class="chip say" data-say="${esc(p.sayB || p.b)}">B</button>
              <button type="button" class="btn sm" data-pron-rec="${i}">Grabar A</button>
            </div>
            <p class="pron-score muted" id="pron-score-${i}" hidden></p>
          </div>`).join("")}
      </div>
      <details style="margin-top:14px">
        <summary>${esc(typeof t === "function" ? t("accentMap") : "Mapa US / UK")}</summary>
        <div class="grid grid-2" style="margin-top:10px">
          ${(ENLAB.accentMap || []).slice(0, 10).map((a) => `
            <div class="card">
              <strong>${esc(a.word)}</strong>
              <p class="muted">US ${esc(a.us)} · UK ${esc(a.uk)}</p>
              <p class="muted">${esc(a.note)}</p>
              <div class="row">
                <button type="button" class="chip say" data-say="${esc(a.usSay)}">US</button>
                <button type="button" class="chip say" data-say="${esc(a.ukSay)}">UK</button>
              </div>
            </div>`).join("")}
        </div>
      </details>
      <details style="margin-top:10px">
        <summary>IPA — palabras clave</summary>
        <div class="row" style="margin-top:8px;flex-wrap:wrap">
          ${Object.entries(ENLAB.ipaWords || {}).slice(0, 24).map(([w, ipa]) =>
            `<button type="button" class="chip say" data-say="${esc(w)}" title="${esc(ipa)}">${esc(w)}</button>`
          ).join("")}
        </div>
      </details>`;
    window._pronPairs = pairs;
  }

  /* ── Render: Branching stories (Lote U) ── */
  function renderStoriesPanel() {
    const host = document.querySelector("#stories-panel");
    if (!host || !ENLAB.branchStories) return;
    const prog = loadStoryProgress();
    const stories = ENLAB.branchStories.filter((s) => (s.min || 1) <= (typeof lvlNum === "function" ? lvlNum() : 2));
    host.innerHTML = `
      <p class="kicker">${esc(typeof t === "function" ? t("stories") : "Historias ramificadas")}</p>
      <p class="muted">${stories.length} micro-novelas · decisiones · vocabulario</p>
      <div class="grid grid-2">
        ${stories.map((s) => {
          const done = prog[s.id]?.score >= 2;
          return `<button type="button" class="mode-pick ${done ? "ok" : ""}" data-story="${esc(s.id)}">
            <strong>${esc(s.title)}</strong>
            <span>${esc(s.level)} · ${done ? "✓" : "—"}</span>
          </button>`;
        }).join("")}
      </div>
      <div id="story-now" class="story-now" hidden></div>`;
  }

  function paintStory(storyId, nodeId) {
    const box = document.querySelector("#story-now");
    const story = (ENLAB.branchStories || []).find((s) => s.id === storyId);
    if (!box || !story) return;
    const node = story.nodes[nodeId || story.start];
    if (!node) return;
    box.hidden = false;
    if (node.ending) {
      saveStoryProgress(storyId, nodeId, node.score || 2);
      box.innerHTML = `
        <p class="kicker">${esc(story.title)} · final</p>
        <p>${esc(node.text)}</p>
        <p class="muted es-line">${esc(node.es || "")}</p>
        <p class="session-done">Puntuación: ${node.score || 2}/3</p>
        <button type="button" class="btn sm" data-story="${esc(storyId)}">Repetir</button>
        <button type="button" class="btn ghost sm" id="story-back">Volver a lista</button>`;
      return;
    }
    box.innerHTML = `
      <p class="kicker">${esc(story.title)} · ${esc(story.level)}</p>
      <p>${esc(node.text)}</p>
      <p class="muted es-line">${esc(node.es || "")}</p>
      <div class="story-choices">
        ${(node.choices || []).map((c) => `
          <button type="button" class="btn ghost sm story-choice" data-story-id="${esc(storyId)}" data-story-next="${esc(c.next)}">
            ${esc(c.label)}
            ${c.vocab?.[0] ? `<span class="muted"> · ${esc(c.vocab[0])}</span>` : ""}
          </button>`).join("")}
      </div>`;
  }

  /* ── Render: Writing rubric (Lote V) ── */
  function renderWritingPanel() {
    const host = document.querySelector("#writing-panel");
    if (!host || !ENLAB.writingPrompts) return;
    const done = new Set(JSON.parse(localStorage.getItem("enlab-writing-done") || "[]"));
    const prompts = ENLAB.writingPrompts.filter((p) => (p.min || 1) <= (typeof lvlNum === "function" ? lvlNum() : 2));
    const pick = window._writingPick || prompts[0];
    window._writingPick = pick;
    host.innerHTML = `
      <p class="kicker">${esc(typeof t === "function" ? t("writing") : "Writing con rúbrica")}</p>
      <div class="row" style="flex-wrap:wrap;margin-bottom:10px">
        ${prompts.map((p) => `<button type="button" class="chip ${done.has(p.id) ? "ok" : ""}" data-writing-pick="${esc(p.id)}">${esc(p.type)} · ${esc(p.title)}</button>`).join("")}
      </div>
      <div class="writing-grid">
        <div class="card">
          <h4>Prompt</h4>
          <p>${esc(pick.prompt)}</p>
          <label class="muted">Tu borrador<textarea id="writing-draft" rows="8" placeholder="Write here…"></textarea></label>
          <button type="button" class="btn sm" id="writing-score">Comparar con modelo</button>
        </div>
        <div class="card">
          <h4>Modelo</h4>
          <pre class="email-body">${esc(pick.model)}</pre>
          <h4>Rúbrica</h4>
          <ul class="writing-rubric">${pick.checklist.map((c) => `<li data-rubric="${esc(c.id)}">${esc(c.label)} <span class="rubric-ok">○</span></li>`).join("")}</ul>
          <p class="muted">Hints: ${pick.hints.map((h) => esc(h)).join(", ")}</p>
        </div>
      </div>
      <p id="writing-result" class="muted"></p>`;
  }

  function scoreWriting() {
    const pick = window._writingPick;
    const draft = (document.querySelector("#writing-draft")?.value || "").trim();
    const result = document.querySelector("#writing-result");
    if (!pick || !draft) {
      if (result) result.textContent = "Escribe algo primero.";
      return;
    }
    const lower = draft.toLowerCase();
    const words = draft.split(/\s+/).filter(Boolean).length;
    let total = 0;
    let max = 0;
    pick.checklist.forEach((c) => {
      max += c.weight;
      let ok = false;
      if (c.id === "length") ok = words >= 15 && words <= 120;
      else if (c.id === "tone") ok = /thank|please|sorry|dear|hi|hey|best|regards|sincerely/i.test(draft);
      else if (c.id === "connectors") ok = pick.hints.some((h) => lower.includes(h.toLowerCase()));
      else if (c.id === "action" || c.id === "ask" || c.id === "cta") ok = /\?|please|could|would|can/i.test(draft);
      else if (c.id === "context" || c.id === "specific" || c.id === "fit") ok = words >= 20;
      else if (c.id === "cover") ok = /@|\bcover\b|backup|urgent/i.test(draft);
      else ok = pick.hints.some((h) => lower.includes(h.toLowerCase()));
      total += ok ? c.weight : 0;
      const li = document.querySelector(`[data-rubric="${c.id}"] .rubric-ok`);
      if (li) li.textContent = ok ? "✓" : "○";
    });
    const pct = Math.round((total / max) * 100);
    if (result) result.textContent = `Rúbrica: ${pct}% · ${words} palabras`;
    if (pct >= 60) {
      const done = new Set(JSON.parse(localStorage.getItem("enlab-writing-done") || "[]"));
      done.add(pick.id);
      localStorage.setItem("enlab-writing-done", JSON.stringify([...done]));
    }
  }

  /* ── Classroom Pro (Lote T) ── */
  function renderClassPro() {
    const host = document.querySelector("#class-pro-panel");
    if (!host) return;
    const roster = loadRoster();
    const task = localStorage.getItem("enlab-class-task") || "path";
    const tasks = [
      { id: "path", label: "Camino de Hoy" },
      { id: "weekly", label: "Examen semanal" },
      { id: "podcast", label: "Podcast del día" },
      { id: "pron", label: "Pronunciación" },
      { id: "story", label: "Historia ramificada" },
    ];
    host.innerHTML = `
      <p class="kicker">${esc(typeof t === "function" ? t("classPro") : "Aula pro — dashboard")}</p>
      <p class="muted">PIN + roster local. Importa códigos de alumnos.</p>
      <label class="muted">Tarea de hoy:
        <select id="class-task-pick">${tasks.map((x) => `<option value="${esc(x.id)}" ${task === x.id ? "selected" : ""}>${esc(x.label)}</option>`).join("")}</select>
      </label>
      <div class="row" style="margin-top:10px">
        <input id="class-student-name" placeholder="Nombre alumno" />
        <button type="button" class="btn sm" id="class-add-student">Añadir</button>
        <button type="button" class="btn ghost sm" id="class-import-code">Importar código</button>
        <button type="button" class="btn ghost sm" id="class-export-csv">Export CSV</button>
      </div>
      <table class="class-roster-table" style="margin-top:12px;width:100%">
        <thead><tr><th>Alumno</th><th>Semanal</th><th>Última sync</th><th></th></tr></thead>
        <tbody>${roster.length ? roster.map((s, i) => `
          <tr>
            <td>${esc(s.name)}</td>
            <td>${s.weeklyDone ? "✓" : "—"}</td>
            <td class="muted">${s.synced ? new Date(s.synced).toLocaleDateString() : "—"}</td>
            <td><button type="button" class="chip sm" data-roster-rm="${i}">×</button></td>
          </tr>`).join("") : `<tr><td colspan="4" class="muted">Sin alumnos — añade o importa código transfer.</td></tr>`}
        </tbody>
      </table>`;
  }

  function importStudentFromCode(code) {
    if (!code) return false;
    try {
      const payload = typeof transferDecode === "function" ? transferDecode(code) : null;
      if (!payload) return false;
      const name = payload["enlab-student-name"] || `Alumno ${Date.now() % 1000}`;
      const weekly = payload["enlab-weekly-exam"] === (typeof todayKey === "function" ? todayKey() : "");
      const roster = loadRoster();
      const hit = roster.find((s) => s.name === name);
      if (hit) {
        hit.weeklyDone = weekly || hit.weeklyDone;
        hit.synced = Date.now();
        hit.stats = payload["enlab-stats"];
      } else {
        roster.push({ name, weeklyDone: weekly, synced: Date.now(), stats: payload["enlab-stats"] });
      }
      saveRoster(roster);
      return true;
    } catch { return false; }
  }

  function exportRosterCsv() {
    const roster = loadRoster();
    const rows = [["name", "weekly_done", "last_sync", "task_today"]];
    roster.forEach((s) => rows.push([s.name, s.weeklyDone ? "yes" : "no", s.synced ? new Date(s.synced).toISOString() : "", localStorage.getItem("enlab-class-task") || ""]));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "englishlab-roster.csv";
    a.click();
  }

  function renderClassTaskBanner() {
    const host = document.querySelector("#class-task-banner");
    if (!host) return;
    const task = localStorage.getItem("enlab-class-task");
    const student = localStorage.getItem("enlab-student-name");
    if (!task) { host.hidden = true; return; }
    const labels = { path: "Camino de Hoy", weekly: "Examen semanal", podcast: "Podcast", pron: "Pronunciación", story: "Historia" };
    host.hidden = false;
    host.innerHTML = `<p class="muted">📋 Tarea del profe: <strong>${esc(labels[task] || task)}</strong>${student ? ` · ${esc(student)}` : ""}</p>`;
  }

  /* ── Onboarding v3 (60s) ── */
  function renderOnboarding() {
    const el = document.querySelector("#welcome");
    if (!el || localStorage.getItem("enlab-onboard-v3") === "1") return;
    el.hidden = false;
    el.innerHTML = `
      <div class="card welcome-card onboard-steps">
        <div class="onboard-step" data-step="1">
          <p class="kicker">${esc(typeof t === "function" ? t("onboard") : "Bienvenida · 60 s")}</p>
          <h2>¿Tu nivel?</h2>
          <div class="row">${["A1", "A2", "B1", "B2"].map((l) => `<button type="button" class="chip onboard-level" data-level="${l}">${l}</button>`).join("")}</div>
        </div>
        <div class="onboard-step" data-step="2" hidden>
          <h2>¿Tu meta?</h2>
          <div class="row">
            <button type="button" class="chip onboard-goal" data-goal="travel">Viaje</button>
            <button type="button" class="chip onboard-goal" data-goal="work">Trabajo</button>
            <button type="button" class="chip onboard-goal" data-goal="exam">Examen</button>
          </div>
        </div>
        <div class="onboard-step" data-step="3" hidden>
          <h2>Primera sesión</h2>
          <p class="muted">15 min: oír → hablar → 3 preguntas. Todo local.</p>
          <button type="button" class="btn" id="onboard-start-path">Empezar el camino</button>
          <button type="button" class="btn ghost" id="onboard-skip">Saltar</button>
        </div>
      </div>`;
  }

  function finishOnboarding() {
    localStorage.setItem("enlab-onboard-v3", "1");
    localStorage.setItem("enlab-welcome-v2", "1");
    const el = document.querySelector("#welcome");
    if (el) el.hidden = true;
  }

  /* ── Offline indicator ── */
  function renderOfflineBadge() {
    let badge = document.querySelector("#offline-badge");
    if (!badge) {
      badge = document.createElement("p");
      badge.id = "offline-badge";
      badge.className = "offline-badge muted";
      document.querySelector(".hero")?.appendChild(badge);
    }
    const online = navigator.onLine;
    caches?.keys?.().then((keys) => {
      const ready = keys.some((k) => k.startsWith("enlab-v"));
      badge.textContent = online
        ? (ready ? (typeof t === "function" ? t("offlineReady") : "✓ Listo sin red") : "…")
        : (typeof t === "function" ? t("offlineMode") : "Modo sin conexión");
      badge.classList.toggle("offline-on", !online);
      badge.classList.toggle("offline-ready", online && ready);
    }).catch(() => {});
  }

  async function precacheTab(tab) {
    if (!("caches" in window)) return;
    const tabAssets = {
      vocales: ["./pack-s.js", "./pack-n.js", "./pack-bulk.js"],
      hablar: ["./pack-o.js", "./pack-v.js", "./pack-u.js"],
      quiz: ["./pack.js", "./pack-m.js"],
      hoy: ["./pack-q.js", "./pack-bulk.js"],
    };
    const files = tabAssets[tab] || [];
    const cache = await caches.open(typeof CACHE !== "undefined" ? CACHE : "enlab-v20");
    await Promise.all(files.map((f) => fetch(f).then((r) => r.ok && cache.put(f, r)).catch(() => {})));
    renderOfflineBadge();
  }

  /* ── Accessibility ── */
  function applyA11y() {
    const contrast = localStorage.getItem("enlab-a11y-contrast") === "1";
    const motionOn = localStorage.getItem("enlab-a11y-motion") !== "0";
    document.body.classList.toggle("a11y-contrast", contrast);
    document.body.classList.toggle("reduced-motion", !motionOn || window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function renderA11yBar() {
    const host = document.querySelector("#a11y-bar");
    if (!host) return;
    host.innerHTML = `
      <button type="button" class="chip sm" id="a11y-contrast-btn" aria-pressed="${localStorage.getItem("enlab-a11y-contrast") === "1"}">${esc(typeof t === "function" ? t("contrast") : "Contraste alto")}</button>
      <button type="button" class="chip sm" id="a11y-motion-btn" aria-pressed="${localStorage.getItem("enlab-a11y-motion") !== "0"}">${esc(typeof t === "function" ? t("motion") : "Animaciones")}</button>
      <span class="muted keys-hint"><kbd>Tab</kbd> navega · <kbd>Alt+1-6</kbd> pestañas</span>`;
    document.querySelector("#a11y-contrast-btn")?.addEventListener("click", () => {
      localStorage.setItem("enlab-a11y-contrast", localStorage.getItem("enlab-a11y-contrast") === "1" ? "0" : "1");
      applyA11y();
      renderA11yBar();
    });
    document.querySelector("#a11y-motion-btn")?.addEventListener("click", () => {
      localStorage.setItem("enlab-a11y-motion", localStorage.getItem("enlab-a11y-motion") === "0" ? "1" : "0");
      applyA11y();
      renderA11yBar();
    });
  }

  function patchPaintTab() {
    if (window._paintTabSvPatched || typeof paintTab !== "function") return;
    window._paintTabSvPatched = true;
    const orig = paintTab;
    window.paintTab = function (tab) {
      orig(tab);
      if (tab === "vocales" && ENLAB.minimalPairs) { renderPronPanel(); renderStoriesPanel(); }
      if (tab === "hablar" && ENLAB.writingPrompts) { renderWritingPanel(); }
      if (tab === "hoy") { renderClassTaskBanner(); }
      if (tab === "ia") { renderClassPro(); renderA11yBar(); }
      if (window._enlabBootstrapped) precacheTab(tab);
    };
  }

  function patchSpeakVerdict() {
    if (window._speakVerdictSvPatched || typeof applySpeakVerdict !== "function") return;
    window._speakVerdictSvPatched = true;
    const orig = applySpeakVerdict;
    window.applySpeakVerdict = function (said) {
      orig(said);
      if (window._pronPending != null) {
        const i = window._pronPending;
        const p = window._pronPairs?.[i];
        const el = document.querySelector(`#pron-score-${i}`);
        if (p && el) {
          const r = scorePronunciation(said, p.ipaA, p.sayA || p.a);
          el.hidden = false;
          el.textContent = `${r.pct}% — ${r.note}`;
          el.classList.toggle("ok", r.pct >= 70);
          const log = JSON.parse(localStorage.getItem("enlab-pron-log") || "[]");
          log.push({ pair: p.a, pct: r.pct, at: Date.now() });
          localStorage.setItem("enlab-pron-log", JSON.stringify(log.slice(-50)));
        }
        window._pronPending = null;
      }
    };
  }

  function bindEvents() {
    document.addEventListener("click", (e) => {
      if (e.target.closest("#accent-pref")) return;
      if (e.target.closest("[data-pron-rec]")) {
        const i = Number(e.target.closest("[data-pron-rec]").dataset.pronRec);
        const p = window._pronPairs?.[i];
        if (p) {
          window._pronPending = i;
          window._speakTarget = { target: p.sayA || p.a, help: `Pronuncia: ${p.a} ${p.ipaA}` };
          if (typeof setSpeakTarget === "function") setSpeakTarget(window._speakTarget);
          showTab("hablar");
          document.querySelector("#speak-rec")?.click();
        }
      }
      if (e.target.closest("[data-story]")) {
        paintStory(e.target.closest("[data-story]").dataset.story, null);
        document.querySelector("#story-now")?.scrollIntoView({ behavior: "smooth" });
      }
      if (e.target.closest(".story-choice")) {
        const btn = e.target.closest(".story-choice");
        paintStory(btn.dataset.storyId, btn.dataset.storyNext);
      }
      if (e.target.closest("#story-back")) {
        renderStoriesPanel();
      }
      if (e.target.closest("[data-writing-pick]")) {
        window._writingPick = (ENLAB.writingPrompts || []).find((p) => p.id === e.target.closest("[data-writing-pick]").dataset.writingPick);
        renderWritingPanel();
      }
      if (e.target.closest("#writing-score")) scoreWriting();
      if (e.target.closest("#class-add-student")) {
        const name = document.querySelector("#class-student-name")?.value?.trim();
        if (name) {
          const roster = loadRoster();
          roster.push({ name, weeklyDone: false, synced: null });
          saveRoster(roster);
          localStorage.setItem("enlab-student-name", name);
          renderClassPro();
        }
      }
      if (e.target.closest("#class-import-code")) {
        const code = window.prompt("Pega código transfer del alumno:");
        if (code && importStudentFromCode(code.trim())) renderClassPro();
      }
      if (e.target.closest("#class-export-csv")) exportRosterCsv();
      if (e.target.closest("[data-roster-rm]")) {
        const roster = loadRoster();
        roster.splice(Number(e.target.closest("[data-roster-rm]").dataset.rosterRm), 1);
        saveRoster(roster);
        renderClassPro();
      }
      if (e.target.closest(".onboard-level")) {
        const l = e.target.closest(".onboard-level").dataset.level;
        if (typeof setCefr === "function") setCefr(l);
        document.querySelector('[data-step="1"]')?.setAttribute("hidden", "");
        document.querySelector('[data-step="2"]')?.removeAttribute("hidden");
      }
      if (e.target.closest(".onboard-goal")) {
        localStorage.setItem("enlab-onboard-goal", e.target.closest(".onboard-goal").dataset.goal);
        document.querySelector('[data-step="2"]')?.setAttribute("hidden", "");
        document.querySelector('[data-step="3"]')?.removeAttribute("hidden");
      }
      if (e.target.closest("#onboard-start-path")) {
        finishOnboarding();
        document.querySelector(".hoy-next")?.click();
      }
      if (e.target.closest("#onboard-skip")) finishOnboarding();
    });

    document.addEventListener("change", (e) => {
      if (e.target.matches("#accent-pref")) {
        localStorage.setItem("enlab-accent-pref", e.target.value);
      }
      if (e.target.matches("#class-task-pick")) {
        localStorage.setItem("enlab-class-task", e.target.value);
        renderClassTaskBanner();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.altKey && e.key >= "1" && e.key <= "6") {
        const tabs = ["hoy", "vocales", "verbos", "quiz", "hablar", "ia"];
        const tab = tabs[Number(e.key) - 1];
        if (tab && typeof showTab === "function") { e.preventDefault(); showTab(tab); }
      }
    });

    window.addEventListener("online", renderOfflineBadge);
    window.addEventListener("offline", renderOfflineBadge);
  }

  function patchI18n() {
    if (typeof applyUiLang !== "function") return;
    const orig = applyUiLang;
    window.applyUiLang = function () {
      orig();
      document.querySelectorAll("[data-i18n-sv]").forEach((el) => {
        const k = el.dataset.i18nSv;
        if (k && typeof t === "function") el.textContent = t(k);
      });
    };
  }

  function refreshPanels() {
    if (!ENLAB.minimalPairs?.length) return;
    renderPronPanel();
    renderStoriesPanel();
    renderWritingPanel();
    renderClassPro();
    renderClassTaskBanner();
    renderA11yBar();
    renderOfflineBadge();
  }

  function bootstrap() {
    if (window._svBootstrapped) return;
    window._svBootstrapped = true;
    patchPaintTab();
    patchSpeakVerdict();
    patchI18n();
    applyA11y();
    renderOnboarding();
    bindEvents();
    refreshPanels();
  }

  window.SV = {
    bootstrap,
    refreshPanels,
    scorePronunciation,
    phonemeDistance,
    renderPronPanel,
    renderStoriesPanel,
    renderWritingPanel,
    renderClassPro,
  };

  if (!window.ENLAB_LOADER) bootstrap();
})();
