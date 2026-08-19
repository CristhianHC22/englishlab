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

  function textPronScore(said, targetIpa, targetText) {
    if (!said) return { pct: 0, note: typeof t === "function" ? t("pronNoHear") : "No se oyó nada", dist: 1 };
    if (typeof speakHeardOk === "function" && speakHeardOk(said, targetText)) {
      return { pct: 100, note: typeof t === "function" ? t("pronMatch") : "Transcripción coincide.", dist: 0 };
    }
    const norm = typeof speakVariants === "function"
      ? speakVariants(said).join(" ")
      : said.toLowerCase();
    const dist = phonemeDistance(norm.replace(/\s/g, ""), targetIpa);
    const pct = Math.max(0, Math.round((1 - dist) * 100));
    const note = pct >= 80 ? (typeof t === "function" ? t("pronClose") : "Texto cerca — repite más despacio.")
      : pct >= 50 ? (typeof t === "function" ? t("pronOk") : "Se entiende por texto, afina vocal.")
      : (typeof t === "function" ? t("pronFar") : "Lejos del objetivo — oye otra vez.");
    return { pct, note, dist };
  }

  function scorePronunciation(said, targetIpa, targetText, opts) {
    opts = opts || {};
    const text = textPronScore(said, targetIpa, targetText);
    const pair = opts.pair;
    const formants = opts.formants;
    const formantResult = (formants && pair && window.PRON?.scoreFormantPair)
      ? window.PRON.scoreFormantPair(formants, pair.ipaA, pair.ipaB)
      : null;

    if (formantResult) {
      const hasText = said && text.pct > 0;
      const pct = hasText
        ? Math.round(text.pct * 0.32 + formantResult.pct * 0.68)
        : formantResult.pct;
      const fNote = `F1 ${formants.f1} · F2 ${formants.f2} Hz`;
      const note = `${formantResult.note} · ${fNote}`;
      const out = {
        score: pct,
        pct,
        note,
        dist: text.dist,
        textPct: text.pct,
        formantPct: formantResult.pct,
        formants,
        formantResult,
        method: "lpc+text",
      };
      window._lastPron = out;
      return out;
    }

    const out = {
      score: text.pct,
      pct: text.pct,
      note: text.note,
      dist: text.dist,
      textPct: text.pct,
      method: "ipa",
    };
    window._lastPron = out;
    return out;
  }

  async function scorePronunciationAsync(said, targetIpa, targetText, blob, pair) {
    let formants = null;
    if (blob?.size && window.PRON?.analyzeFormants) {
      formants = await window.PRON.analyzeFormants(blob);
    }
    return scorePronunciation(said, targetIpa, targetText, { formants, pair });
  }

  function formatPronScore(r) {
    if (!r) return "";
    const tag = r.method === "lpc+text" ? "🎙" : "IPA";
    return `${r.pct}% ${tag} — ${r.note}`;
  }

  function loadStoryProgress() {
    try { return JSON.parse(localStorage.getItem("enlab-story-progress") || "{}"); } catch { return {}; }
  }

  function saveStoryProgress(id, patch) {
    const p = loadStoryProgress();
    p[id] = { ...(p[id] || {}), ...patch, at: Date.now() };
    localStorage.setItem("enlab-story-progress", JSON.stringify(p));
    if (window.ENLAB_IDB?.mirror) window.ENLAB_IDB.mirror("enlab-story-progress", JSON.stringify(p));
  }

  function storyMaxSteps(story) {
    if (!story?.nodes || !story.start) return 1;
    const memo = {};
    const walk = (nodeId) => {
      if (memo[nodeId] !== undefined) return memo[nodeId];
      const node = story.nodes[nodeId];
      if (!node) return 0;
      if (node.ending) {
        memo[nodeId] = 1;
        return 1;
      }
      let max = 0;
      (node.choices || []).forEach((c) => {
        max = Math.max(max, 1 + walk(c.next));
      });
      memo[nodeId] = max;
      return max;
    };
    return Math.max(1, walk(story.start));
  }

  function unlockChoiceVocab(storyId, choice) {
    const phrases = choice?.vocab || [];
    const p = loadStoryProgress();
    const seen = new Set(p[storyId]?.vocab || []);
    let added = 0;
    phrases.forEach((phrase) => {
      if (!phrase || seen.has(phrase)) return;
      if (typeof storyVocabUnlock === "function" && storyVocabUnlock(storyId, phrase)) {
        seen.add(phrase);
        added += 1;
      }
    });
    if (added) saveStoryProgress(storyId, { vocab: [...seen] });
    return added;
  }

  function storyVocabHtml(storyId, { compact } = {}) {
    const vocab = loadStoryProgress()[storyId]?.vocab || [];
    if (!vocab.length) return "";
    const label = typeof t === "function" ? t("storyVocab") : "Vocabulario desbloqueado";
    const chips = vocab.map((v) =>
      `<button type="button" class="chip say sm story-vocab-chip" data-say="${esc(v)}" title="SRS">${esc(v)}</button>`,
    ).join("");
    if (compact) return `<span class="story-vocab-count muted">${vocab.length} frases SRS</span>`;
    return `<div class="story-vocab-bank"><p class="kicker">${esc(label)}</p><div class="story-vocab-chips">${chips}</div></div>`;
  }

  function beginStoryRun(storyId) {
    const story = (ENLAB.branchStories || []).find((s) => s.id === storyId);
    if (!story) return;
    const prev = loadStoryProgress()[storyId] || {};
    saveStoryProgress(storyId, {
      node: story.start,
      path: [story.start],
      vocab: prev.vocab || [],
      score: prev.score || 0,
    });
    paintStory(storyId, story.start);
  }

  function advanceStory(storyId, nextNodeId, choice) {
    unlockChoiceVocab(storyId, choice);
    const p = loadStoryProgress()[storyId] || {};
    const path = [...(p.path || []), nextNodeId];
    saveStoryProgress(storyId, { path, node: nextNodeId });
    paintStory(storyId, nextNodeId);
  }

  function loadRoster() {
    try { return JSON.parse(localStorage.getItem("enlab-class-roster") || "[]"); } catch { return []; }
  }

  function saveRoster(list) {
    localStorage.setItem("enlab-class-roster", JSON.stringify(list));
  }

  let _classPlanHeatFilter = "";

  function classPlanHeatFilterHtml(taskCoach) {
    if (!taskCoach) return "";
    const f = _classPlanHeatFilter;
    const opts = [
      { id: "", label: t("classPlanHeatFilterAll") },
      { id: "pending", label: t("classPlanHeatFilterPending") },
      { id: "mid", label: t("classPlanHeatFilterMid") },
      { id: "done", label: t("classPlanHeatFilterDone") },
    ];
    return `<div class="row class-plan-heat-filters" style="gap:6px;flex-wrap:wrap;margin-top:8px">
      ${opts.map((o) => `<button type="button" class="chip sm${f === o.id ? " active" : ""}" data-plan-heat-filter="${esc(o.id)}">${esc(o.label)}</button>`).join("")}
    </div>`;
  }

  function rosterRowsHtml(roster, taskCoach) {
    const filtered = _classPlanHeatFilter
      ? roster.filter((s) => rosterCoachPlanStatus(s) === _classPlanHeatFilter)
      : roster;
    if (!filtered.length) {
      return `<tr><td colspan="9" class="muted">${esc(t("classRosterFilterEmpty"))}</td></tr>`;
    }
    return filtered.map((s, i) => {
      const realI = roster.indexOf(s);
      const status = rosterCoachPlanStatus(s);
      const rowCls = taskCoach && status === "pending" ? "class-roster-plan-pending"
        : taskCoach && status === "mid" ? "class-roster-plan-mid" : "";
      return `
          <tr${rowCls ? ` class="${rowCls}"` : ""}>
            <td>${esc(s.name)}</td>
            <td>${s.weeklyDone ? "✓" : "—"}</td>
            <td>${s.certDone ? "✓" : "—"}</td>
            <td>${s.srsDue != null ? esc(String(s.srsDue)) : "—"}</td>
            <td class="muted">${esc(rosterPlacementCell(s))}</td>
            <td class="muted">${esc(rosterCoachPlanCell(s))}</td>
            <td class="muted">${esc(rosterFrictionCell(s))}</td>
            <td class="muted">${s.synced ? new Date(s.synced).toLocaleDateString() : "—"}</td>
            <td><button type="button" class="chip sm" data-roster-rm="${realI}">×</button></td>
          </tr>`;
    }).join("");
  }

  /* ── Render: Pronunciation (Lote S) ── */
  function renderPronPanel() {
    const host = document.querySelector("#pron-panel");
    if (!host || !ENLAB.minimalPairs) return;
    const pairs = ENLAB.minimalPairs.filter((p) => (p.min || 1) <= (typeof lvlNum === "function" ? lvlNum() : 2));
    const accent = localStorage.getItem("enlab-accent-pref") || "us";
    host.innerHTML = `
      <p class="kicker">${esc(typeof t === "function" ? t("pron") : "Pronunciación")}</p>
      <p class="muted">${esc(typeof t === "function" ? t("pronHint") : "Mínimos pares + IPA. Graba y compara con formantes F1/F2.")}</p>
      <label class="muted">${esc(typeof t === "function" ? t("accent") : "Acento")}:
        <select id="accent-pref">
          <option value="us" ${accent === "us" ? "selected" : ""}>US</option>
          <option value="uk" ${accent === "uk" ? "selected" : ""}>UK</option>
        </select>
      </label>
      <div id="vowel-chart-live" class="vowel-chart-wrap">${window.PRON?.renderVowelChartSvg ? window.PRON.renderVowelChartSvg() : ""}</div>
      <p class="muted vowel-chart-note">${esc(typeof t === "function" ? t("vowelChartHint") : "Graba A: el punto verde es tu F1/F2 vs la vocal objetivo.")}</p>
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
          ${(ENLAB.accentMap || []).slice(0, 10).map((a, ai) => `
            <div class="card" data-accent-i="${ai}">
              <strong>${esc(a.word)}</strong>
              <p class="muted">US ${esc(a.us)} · UK ${esc(a.uk)}</p>
              <p class="muted">${esc(a.note)}</p>
              <div class="row">
                <button type="button" class="chip say" data-say="${esc(a.usSay)}">US</button>
                <button type="button" class="chip say" data-say="${esc(a.ukSay)}">UK</button>
                <button type="button" class="btn sm" data-accent-rec="${ai}">${esc(typeof t === "function" ? t("accentRec") : "Grabar palabra")}</button>
              </div>
              <p class="pron-score muted accent-compare" id="accent-score-${ai}" hidden></p>
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
      </details>
      <details style="margin-top:14px">
        <summary>${esc(typeof t === "function" ? t("pronHistory") : "Historial formantes (7 días)")}</summary>
        <div id="pron-history-chart" class="pron-history-chart"></div>
      </details>`;
    renderPronHistoryChart();
    window._pronPairs = pairs;
    window._accentMap = (ENLAB.accentMap || []).slice(0, 10);
  }

  function renderPronHistoryChart() {
    const host = document.querySelector("#pron-history-chart");
    if (!host) return;
    let log = [];
    try { log = JSON.parse(localStorage.getItem("enlab-pron-log") || "[]"); } catch { log = []; }
    const week = Date.now() - 7 * 86400000;
    const rows = log.filter((r) => r.at >= week);
    if (!rows.length) {
      host.innerHTML = `<p class="muted">${esc(typeof t === "function" ? t("pronHistoryEmpty") : "Graba pares en Pronunciación para ver progreso.")}</p>`;
      return;
    }
    const max = Math.max(...rows.map((r) => r.pct || 0), 1);
    host.innerHTML = rows.slice(-14).map((r) => {
      const h = Math.round(((r.pct || 0) / max) * 100);
      return `<div class="pron-bar" title="${esc(r.pair)} · ${r.pct}% · F1 ${r.f1 || "?"}"><span style="height:${h}%"></span><em>${esc(String(r.pair).slice(0, 6))}</em></div>`;
    }).join("");
  }

  function findContinuableStory() {
    const prog = loadStoryProgress();
    const stories = ENLAB.branchStories || [];
    const rows = Object.keys(prog).map((id) => {
      const story = stories.find((s) => s.id === id);
      const nodeId = prog[id]?.node;
      const node = story?.nodes?.[nodeId];
      if (!story || !node || node.ending) return null;
      return { id, story, nodeId, at: prog[id].at || 0 };
    }).filter(Boolean);
    rows.sort((a, b) => b.at - a.at);
    return rows[0] || null;
  }

  function resumeStory(storyId) {
    const story = (ENLAB.branchStories || []).find((s) => s.id === storyId);
    if (!story) return;
    const nodeId = loadStoryProgress()[storyId]?.node || story.start;
    if (typeof showTab === "function") showTab("vocales");
    paintStory(storyId, nodeId);
    document.querySelector("#story-now")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function storyProgressPct(storyId) {
    const prog = loadStoryProgress();
    const story = (ENLAB.branchStories || []).find((s) => s.id === storyId);
    if (!story?.nodes) return 0;
    const visited = prog[storyId]?.visited;
    const visitedN = Array.isArray(visited) ? visited.length : (typeof visited === "object" && visited ? Object.keys(visited).length : 0);
    const totalNodes = Object.keys(story.nodes).length;
    if (!totalNodes || !visitedN) return 0;
    return Math.round(Math.min(100, (visitedN / totalNodes) * 100));
  }

  function renderHoyStoryChip() {
    const hit = findContinuableStory();
    let extraHint = "";
    if (hit) {
      const prog = loadStoryProgress();
      const vocabN = (prog[hit.id]?.vocab || []).length;
      const pct = storyProgressPct(hit.id);
      extraHint = [pct > 0 ? `${pct}%` : "", vocabN > 0 ? `${vocabN} SRS` : ""].filter(Boolean).join(" · ");
      if (extraHint) extraHint = ` · ${extraHint}`;
    }
    const html = hit ? `
      <p class="muted">${esc((typeof t === "function" ? t("hoyStoryChipHint") : "Retoma el nodo donde lo dejaste.") + extraHint)}</p>
      <button type="button" class="btn sm" data-story-resume="${esc(hit.id)}">${esc(typeof t === "function" ? t("hoyStoryContinue", { title: hit.story.title }) : hit.story.title)}</button>` : "";
    const pathDone = document.querySelector("#hoy")?.classList.contains("path-done");
    const hosts = [
      document.querySelector("#hoy-story-chip"),
      pathDone ? document.querySelector("#hoy-done-story") : null,
    ].filter(Boolean);
    if (!hit) {
      hosts.forEach((host) => { host.hidden = true; host.innerHTML = ""; });
      return;
    }
    hosts.forEach((host) => {
      host.hidden = false;
      host.innerHTML = html;
    });
    const above = document.querySelector("#hoy-story-chip");
    if (above && pathDone) {
      above.hidden = true;
      above.innerHTML = "";
    }
  }
  function renderStoriesPanel() {
    const host = document.querySelector("#stories-panel");
    if (!host || !ENLAB.branchStories) return;
    const prog = loadStoryProgress();
    const stories = ENLAB.branchStories.filter((s) => (s.min || 1) <= (typeof lvlNum === "function" ? lvlNum() : 2));
    host.innerHTML = `
      <p class="kicker">${esc(typeof t === "function" ? t("stories") : "Historias ramificadas")}</p>
      <p class="muted">${esc(typeof t === "function" ? t("storyHint", { n: stories.length }) : `${stories.length} micro-novelas · ramas largas · vocabulario → SRS`)}</p>
      <div class="grid grid-2">
        ${stories.map((s) => {
          const row = prog[s.id] || {};
          const done = row.score >= 2;
          const vocabN = (row.vocab || []).length;
          const depth = storyMaxSteps(s);
          return `<button type="button" class="mode-pick ${done ? "ok" : ""}" data-story="${esc(s.id)}">
            <strong>${esc(s.title)}</strong>
            <span>${esc(s.level)} · ${depth} pasos · ${vocabN ? `${vocabN} SRS` : (done ? "✓" : "—")}</span>
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
    const prog = loadStoryProgress()[storyId] || {};
    const step = (prog.path || []).length || 1;
    const maxSteps = storyMaxSteps(story);
    const stepLabel = typeof t === "function" ? t("storyStep", { step, max: maxSteps }) : `Paso ${step} / ${maxSteps}`;

    if (node.ending) {
      if (node.vocab?.length) unlockChoiceVocab(storyId, { vocab: node.vocab });
      const score = node.score || 2;
      saveStoryProgress(storyId, {
        node: nodeId,
        score: Math.max(prog.score || 0, score),
      });
      const scoreLabel = typeof t === "function" ? t("storyScore", { score, max: 3 }) : `Puntuación: ${score}/3`;
      const srsNote = typeof t === "function" ? t("storySrsNote") : "Frases añadidas a Repaso vence hoy (Hoy).";
      box.innerHTML = `
        <p class="kicker">${esc(story.title)} · ${esc(typeof t === "function" ? t("storyEnding") : "final")}</p>
        <p class="story-step muted">${esc(stepLabel)}</p>
        <p>${esc(node.text)}</p>
        <p class="muted es-line">${esc(node.es || "")}</p>
        <p class="session-done">${esc(scoreLabel)}</p>
        ${storyVocabHtml(storyId)}
        <p class="muted">${esc(srsNote)}</p>
        <div class="row" style="margin-top:10px;flex-wrap:wrap;gap:8px">
          <button type="button" class="btn sm" data-start-story-quiz>${esc(typeof t === "function" ? t("storyQuizGo") : "Quiz de frases SRS")}</button>
          <button type="button" class="btn sm" data-story="${esc(storyId)}">${esc(typeof t === "function" ? t("storyReplay") : "Repetir")}</button>
          <button type="button" class="btn ghost sm" id="story-back">${esc(typeof t === "function" ? t("storyBack") : "Volver a lista")}</button>
        </div>`;
      if (typeof renderDueToday === "function") renderDueToday();
      return;
    }
    window._storyChoiceCtx = { storyId, nodeId, choices: node.choices || [] };
    box.innerHTML = `
      <p class="kicker">${esc(story.title)} · ${esc(story.level)}</p>
      <p class="story-step muted">${esc(stepLabel)}</p>
      <p>${esc(node.text)}</p>
      <p class="muted es-line">${esc(node.es || "")}</p>
      ${storyVocabHtml(storyId, { compact: step > 1 })}
      <div class="story-choices">
        ${(node.choices || []).map((c, i) => `
          <button type="button" class="btn ghost sm story-choice" data-story-id="${esc(storyId)}" data-story-next="${esc(c.next)}" data-story-choice-i="${i}">
            ${esc(c.label)}
            ${c.vocab?.[0] ? `<span class="muted story-vocab-preview"> · 🔓 ${esc(c.vocab[0])}</span>` : ""}
          </button>`).join("")}
      </div>`;
  }

  /* ── Render: Writing rubric (Lote V) ── */
  function renderWritingPanel() {
    const host = document.querySelector("#writing-panel");
    if (!host) return;
    const all = (ENLAB.writingPrompts || []).filter((p) => p && p.prompt);
    if (!all.length) {
      host.innerHTML = "";
      return;
    }
    const lvl = typeof lvlNum === "function" ? lvlNum() : 3;
    let prompts = all.filter((p) => (p.min || 1) <= lvl);
    if (!prompts.length) {
      const lo = Math.min(...all.map((p) => p.min || 1));
      prompts = all.filter((p) => (p.min || 1) === lo);
    }
    const pick = prompts.find((p) => p.id && p.id === window._writingPick?.id) || prompts[0];
    if (!pick) {
      host.innerHTML = "";
      return;
    }
    window._writingPick = pick;
    const checklist = Array.isArray(pick.checklist) ? pick.checklist : [];
    const hints = Array.isArray(pick.hints) ? pick.hints : [];
    let done = new Set();
    try { done = new Set(JSON.parse(localStorage.getItem("enlab-writing-done") || "[]")); } catch { /* ignore */ }
    host.innerHTML = `
      <p class="kicker">${esc(typeof t === "function" ? t("writing") : "Writing con rúbrica")}</p>
      <div class="row" style="flex-wrap:wrap;margin-bottom:10px">
        ${prompts.map((p) => `<button type="button" class="chip ${done.has(p.id) ? "ok" : ""}" data-writing-pick="${esc(p.id)}">${esc(p.type)} · ${esc(p.title)}</button>`).join("")}
      </div>
      <div class="writing-grid">
        <div class="card">
          <h4>${esc(typeof t === "function" ? t("writePrompt") : "Prompt")}</h4>
          <p>${esc(pick.prompt)}</p>
          <p class="muted">${esc(typeof t === "function" ? t("writeHint") : "Nada se envía.")}</p>
          <label class="muted">${esc(typeof t === "function" ? t("writeDraft") : "Tu borrador")}<textarea id="writing-draft" rows="8" placeholder="Write here…"></textarea></label>
          <button type="button" class="btn sm" id="writing-score">${esc(typeof t === "function" ? t("writeScore") : "Comparar con modelo")}</button>
        </div>
        <div class="card">
          <h4>${esc(typeof t === "function" ? t("writeModel") : "Modelo")}</h4>
          <pre class="email-body">${esc(pick.model || "")}</pre>
          <h4>${esc(typeof t === "function" ? t("writeRubric") : "Rúbrica")}</h4>
          <ul class="writing-rubric">${checklist.map((c) => `<li data-rubric="${esc(c.id)}">${esc(c.label)} <span class="rubric-ok">○</span></li>`).join("")}</ul>
          <p class="muted">${esc(typeof t === "function" ? t("writeHints") : "Hints")}: ${hints.map((h) => esc(h)).join(", ")}</p>
        </div>
      </div>
      <p id="writing-result" class="muted"></p>`;
  }

  function scoreWriting() {
    const pick = window._writingPick;
    const draft = (document.querySelector("#writing-draft")?.value || "").trim();
    const result = document.querySelector("#writing-result");
    if (!pick || !draft) {
      if (result) result.textContent = typeof t === "function" ? t("writeEmpty") : "Escribe algo primero.";
      return;
    }
    const lower = draft.toLowerCase();
    const words = draft.split(/\s+/).filter(Boolean).length;
    let total = 0;
    let max = 0;
    const list = Array.isArray(pick.checklist) ? pick.checklist : [];
    list.forEach((c) => {
      max += c.weight;
      let ok = false;
      if (c.id === "length") ok = words >= 15 && words <= 120;
      else if (c.id === "tone") ok = /thank|please|sorry|dear|hi|hey|best|regards|sincerely/i.test(draft);
      else if (c.id === "connectors") ok = (pick.hints || []).some((h) => lower.includes(h.toLowerCase()));
      else if (c.id === "action" || c.id === "ask" || c.id === "cta") ok = /\?|please|could|would|can/i.test(draft);
      else if (c.id === "context" || c.id === "specific" || c.id === "fit") ok = words >= 20;
      else if (c.id === "cover") ok = /@|\bcover\b|backup|urgent/i.test(draft);
      else ok = (pick.hints || []).some((h) => lower.includes(h.toLowerCase()));
      total += ok ? c.weight : 0;
      const li = document.querySelector(`[data-rubric="${c.id}"] .rubric-ok`);
      if (li) li.textContent = ok ? "✓" : "○";
    });
    const pct = max ? Math.round((total / max) * 100) : 0;
    if (result) result.textContent = `Rúbrica: ${pct}% · ${words} palabras`;
    if (pct >= 60) {
      const done = new Set(JSON.parse(localStorage.getItem("enlab-writing-done") || "[]"));
      done.add(pick.id);
      localStorage.setItem("enlab-writing-done", JSON.stringify([...done]));
    }
  }

  /* ── Classroom Pro (Lote T) ── */
  function rosterFrictionCell(s) {
    let mode = s.frictionMode;
    let drop = s.frictionDrop;
    if (localStorage.getItem("enlab-student-name") === s.name && typeof topQuizFriction === "function") {
      const top = topQuizFriction(1)[0];
      if (top) {
        mode = top.mode;
        drop = top.drop;
      }
    }
    if (!mode || drop == null) return "—";
    const label = t(`quizModes.${mode}.t`) || mode;
    return t("classFrictionCell", { mode: label, drop });
  }

  function recordClassFrictionSnapshot(name, mode, drop) {
    if (!name || !mode || drop == null) return;
    const week = typeof weekStartKey === "function" ? weekStartKey() : (typeof todayKey === "function" ? todayKey().slice(0, 7) : "");
    if (!week) return;
    let raw = {};
    try { raw = JSON.parse(localStorage.getItem("enlab-class-friction-week") || "{}"); } catch { raw = {}; }
    if (!raw[week]) raw[week] = {};
    if (!raw[week][name]) raw[week][name] = {};
    raw[week][name][mode] = drop;
    const keys = Object.keys(raw).sort().slice(-8);
    const trimmed = {};
    keys.forEach((k) => { trimmed[k] = raw[k]; });
    localStorage.setItem("enlab-class-friction-week", JSON.stringify(trimmed));
  }

  function classFrictionAlertRows(rows, modes, minDelta = 15) {
    const alerts = [];
    rows.forEach((r) => {
      modes.forEach((m) => {
        const cur = r.modes[m];
        const prev = r.prev[m];
        if (cur == null || prev == null) return;
        const delta = cur - prev;
        if (delta >= minDelta) alerts.push({ name: r.name, mode: m, delta, drop: cur });
      });
    });
    alerts.sort((a, b) => b.delta - a.delta);
    return alerts;
  }

  function classFrictionAlertsHtml(rows, modes) {
    const alerts = classFrictionAlertRows(rows, modes);
    if (!alerts.length) return "";
    return `<div class="class-friction-alerts pill warn">
      <p class="kicker">${esc(t("classFrictionAlertTitle"))}</p>
      <ul>${alerts.slice(0, 5).map((a) =>
        `<li>${esc(t("classFrictionAlertLine", { name: a.name, mode: t(`quizModes.${a.mode}.t`) || a.mode, delta: a.delta, drop: a.drop }))}</li>`
      ).join("")}</ul>
      <p class="row"><button type="button" class="btn ghost xs" id="class-friction-alerts-csv">${esc(t("classFrictionAlertsCsv"))}</button></p>
    </div>`;
  }

  function classFrictionHeatmapHtml() {
    let raw = {};
    try { raw = JSON.parse(localStorage.getItem("enlab-class-friction-week") || "{}"); } catch { raw = {}; }
    const week = typeof weekStartKey === "function" ? weekStartKey() : "";
    const prevWeek = typeof prevWeekStartKey === "function" ? prevWeekStartKey() : "";
    const prevSnap = prevWeek ? (raw[prevWeek] || {}) : {};
    const roster = loadRoster();
    const snap = raw[week] || {};
    const modes = ["ear", "uso", "choice", "quickmix"];
    const rows = roster.map((s) => {
      const student = { ...(snap[s.name] || {}) };
      const prevStudent = prevSnap[s.name] || {};
      let liveMode = s.frictionMode;
      let liveDrop = s.frictionDrop;
      if (localStorage.getItem("enlab-student-name") === s.name && typeof topQuizFriction === "function") {
        const top = topQuizFriction(1)[0];
        if (top) { liveMode = top.mode; liveDrop = top.drop; }
      }
      if (liveMode && liveDrop != null) student[liveMode] = liveDrop;
      return { name: s.name, modes: student, prev: prevStudent };
    }).filter((r) => Object.keys(r.modes).length);
    if (!rows.length) return "";
    const cell = (drop, prev) => {
      if (drop == null) return `<td class="class-heat-cell empty">—</td>`;
      const lvl = drop >= 50 ? "hi" : drop >= 35 ? "mid" : "lo";
      let delta = "";
      if (prev != null && prev !== drop) {
        const d = drop - prev;
        const cls = d > 0 ? "up" : "down";
        delta = `<span class="class-heat-delta ${cls}">${d > 0 ? "+" : ""}${d}</span>`;
      }
      return `<td class="class-heat-cell ${lvl}" title="${esc(String(drop))}%${prev != null ? ` · ${t("classFrictionPrev", { drop: prev })}` : ""}">${esc(String(drop))}%${delta}</td>`;
    };
    const weekCmp = prevWeek && rows.some((r) => modes.some((m) => r.prev[m] != null))
      ? `<p class="muted">${esc(t("classFrictionWeekDelta"))}</p>`
      : "";
    const alerts = classFrictionAlertsHtml(rows, modes);
    return `
      <details class="fold class-friction-heat" open>
        <summary class="muted">${esc(t("classFrictionHeatTitle"))}</summary>
        <p class="muted">${esc(t("classFrictionHeatHint"))}</p>
        ${alerts}
        ${weekCmp}
        <table class="mini-table class-heat-table">
          <thead><tr><th>${esc(t("classColName"))}</th>${modes.map((m) => `<th>${esc(t(`quizModes.${m}.t`) || m)}</th>`).join("")}</tr></thead>
          <tbody>${rows.map((r) => `<tr>
            <td>${esc(r.name)}</td>
            ${modes.map((m) => cell(r.modes[m], r.prev[m])).join("")}
          </tr>`).join("")}</tbody>
        </table>
        <p class="row"><button type="button" class="btn ghost sm" id="class-friction-csv">${esc(t("classFrictionCsv"))}</button></p>
      </details>`;
  }

  function exportClassFrictionAlertsCsv() {
    if (typeof classroomAllowsChange === "function" && !classroomAllowsChange("classPinExport")) return;
    let raw = {};
    try { raw = JSON.parse(localStorage.getItem("enlab-class-friction-week") || "{}"); } catch { raw = {}; }
    const week = typeof weekStartKey === "function" ? weekStartKey() : "";
    const prevWeek = typeof prevWeekStartKey === "function" ? prevWeekStartKey() : "";
    const prevSnap = prevWeek ? (raw[prevWeek] || {}) : {};
    const snap = raw[week] || {};
    const modes = ["ear", "uso", "choice", "quickmix"];
    const rows = loadRoster().map((s) => {
      const student = { ...(snap[s.name] || {}) };
      if (localStorage.getItem("enlab-student-name") === s.name && s.frictionMode && s.frictionDrop != null) {
        student[s.frictionMode] = s.frictionDrop;
      }
      return { name: s.name, modes: student, prev: prevSnap[s.name] || {} };
    }).filter((r) => Object.keys(r.modes).length);
    const alerts = classFrictionAlertRows(rows, modes);
    const csvRows = [["student", "week", "mode", "drop_pct", "prev_drop_pct", "delta_pct"]];
    alerts.forEach((a) => {
      const prev = rows.find((r) => r.name === a.name)?.prev[a.mode];
      csvRows.push([a.name, week, a.mode, String(a.drop), prev != null ? String(prev) : "", String(a.delta)]);
    });
    const csv = csvRows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "englishlab-friction-alerts.csv";
    a.click();
  }

  function exportClassFrictionCsv() {
    if (typeof classroomAllowsChange === "function" && !classroomAllowsChange("classPinExport")) return;
    let raw = {};
    try { raw = JSON.parse(localStorage.getItem("enlab-class-friction-week") || "{}"); } catch { raw = {}; }
    const week = typeof weekStartKey === "function" ? weekStartKey() : "";
    const prevWeek = typeof prevWeekStartKey === "function" ? prevWeekStartKey() : "";
    const modes = ["ear", "uso", "choice", "quickmix"];
    const rows = [["student", "week", "mode", "drop_pct", "prev_drop_pct", "delta_pct"]];
    loadRoster().forEach((s) => {
      const cur = (raw[week] || {})[s.name] || {};
      const prev = prevWeek ? ((raw[prevWeek] || {})[s.name] || {}) : {};
      if (localStorage.getItem("enlab-student-name") === s.name && s.frictionMode) {
        cur[s.frictionMode] = s.frictionDrop;
      }
      modes.forEach((m) => {
        if (cur[m] == null && prev[m] == null) return;
        const delta = cur[m] != null && prev[m] != null ? cur[m] - prev[m] : "";
        rows.push([s.name, week, m, cur[m] != null ? String(cur[m]) : "", prev[m] != null ? String(prev[m]) : "", delta !== "" ? String(delta) : ""]);
      });
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "englishlab-friction-heatmap.csv";
    a.click();
  }

  function exportClassPlacementCsv() {
    if (typeof classroomAllowsChange === "function" && !classroomAllowsChange("classPinExport")) return;
    const rows = [["student", "place_pct", "cefr", "day"]];
    const me = localStorage.getItem("enlab-student-name") || "";
    let pr = null;
    try {
      pr = typeof loadPlaceResult === "function" ? loadPlaceResult() : JSON.parse(localStorage.getItem("enlab-place-result") || "null");
    } catch { pr = null; }
    loadRoster().forEach((s) => {
      if (s.name === me && pr?.n) {
        rows.push([s.name, String(Math.round((pr.score / pr.n) * 100)), pr.cefr || "", pr.day || ""]);
      } else if (s.placePct != null) {
        rows.push([s.name, String(s.placePct), s.placeCefr || "", s.placeDay || ""]);
      } else {
        rows.push([s.name, "", "", ""]);
      }
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "englishlab-placement.csv";
    a.click();
  }

  function renderClassPro() {
    const host = document.querySelector("#class-pro-panel");
    if (!host) return;
    const roster = loadRoster();
    const task = localStorage.getItem("enlab-class-task") || "path";
    const taskCoach = task === "coach";
    const weekKey = typeof todayKey === "function" ? todayKey().slice(0, 7) : "";
    const tasks = [
      { id: "path", label: t("classTaskPath") },
      { id: "coach", label: t("classTaskCoach") },
      { id: "weekly", label: t("classTaskWeekly") },
      { id: "podcast", label: t("classTaskPodcast") },
      { id: "pron", label: t("classTaskPron") },
      { id: "story", label: t("classTaskStory") },
    ];
    host.innerHTML = `
      <p class="kicker">${esc(t("classPro"))}</p>
      <p class="muted">${esc(t("classProHint"))}</p>
      <label class="muted">${esc(t("classTaskLabel"))}
        <select id="class-task-pick">${tasks.map((x) => `<option value="${esc(x.id)}" ${task === x.id ? "selected" : ""}>${esc(x.label)}</option>`).join("")}</select>
      </label>
      <div class="row" style="margin-top:10px;flex-wrap:wrap;gap:8px">
        <input id="class-student-name" placeholder="${esc(t("classStudentPh"))}" value="${esc(localStorage.getItem("enlab-student-name") || "")}" />
        <button type="button" class="btn sm" id="class-add-student">${esc(t("classAdd"))}</button>
        <button type="button" class="btn ghost sm" id="class-import-code">${esc(t("classImport"))}</button>
        <button type="button" class="btn ghost sm" id="class-export-csv">${esc(t("classExportCsv"))}</button>
        <button type="button" class="btn ghost sm" id="class-placement-csv">${esc(t("classPlacementCsv"))}</button>
        <button type="button" class="btn ghost sm" id="class-coach-plan-csv">${esc(t("classCoachPlanCsv"))}</button>
        <button type="button" class="btn ghost sm" id="class-coach-plan-print">${esc(t("classCoachPlanPrint"))}</button>
        <button type="button" class="btn ghost sm" id="class-friction-print">${esc(t("classFrictionPrint"))}</button>
        <button type="button" class="btn ghost sm" id="class-student-qr">${esc(t("classStudentQr"))}</button>
        <button type="button" class="btn ghost sm" id="student-pdf">${esc(t("studentPdf"))}</button>
      </div>
      <div id="class-student-qr-box" class="student-qr-box" hidden></div>
      <table class="class-roster-table" style="margin-top:12px;width:100%">
        <thead><tr><th>${esc(t("classColName"))}</th><th>${esc(t("classColWeekly"))}</th><th>${esc(t("classColCert"))}</th><th>${esc(t("classColDue"))}</th><th>${esc(t("classColPlacement"))}</th><th>${esc(t("classColCoachPlan"))}</th><th>${esc(t("classColFriction"))}</th><th>${esc(t("classColSync"))}</th><th></th></tr></thead>
        <tbody>${roster.length ? rosterRowsHtml(roster, taskCoach) : `<tr><td colspan="9" class="muted">${esc(t("classRosterEmpty"))}</td></tr>`}
        </tbody>
      </table>
      ${classCoachPlanSummaryHtml()}
      ${classCoachPlanHeatHtml()}
      ${classFrictionHeatmapHtml()}`;
  }

  function updateClassRosterBody() {
    const tbody = document.querySelector("#class-pro-panel .class-roster-table tbody");
    if (!tbody) { renderClassPro(); return; }
    const roster = loadRoster();
    const taskCoach = localStorage.getItem("enlab-class-task") === "coach";
    tbody.innerHTML = roster.length
      ? rosterRowsHtml(roster, taskCoach)
      : `<tr><td colspan="9" class="muted">${esc(t("classRosterEmpty"))}</td></tr>`;
    document.querySelectorAll(".class-plan-heat-filters .chip").forEach((btn) => {
      btn.classList.toggle("active", (btn.dataset.planHeatFilter || "") === _classPlanHeatFilter);
    });
  }

  function printClassCoachPlanSheet() {
    if (typeof classroomAllowsChange === "function" && !classroomAllowsChange("classPinExport")) return;
    const area = document.querySelector("#weak-print-area");
    if (!area) return;
    const roster = loadRoster();
    const rows = roster.map((s) => {
      const status = rosterCoachPlanStatus(s);
      const cell = rosterCoachPlanCell(s);
      return `<tr><td>${esc(s.name)}</td><td>${esc(status || "—")}</td><td>${esc(cell)}</td></tr>`;
    }).join("") || `<tr><td colspan="3" class="muted">${esc(t("classRosterEmpty"))}</td></tr>`;
    area.hidden = false;
    area.innerHTML = `
      <h1>${esc(t("classCoachPlanPrintTitle"))}</h1>
      <p class="muted">${esc(t("classCoachPlanPrintHint"))} · ${typeof todayKey === "function" ? todayKey() : ""}</p>
      <table><thead><tr><th>${esc(t("classColName"))}</th><th>${esc(t("classColStatus"))}</th><th>${esc(t("classColCoachPlan"))}</th></tr></thead>
      <tbody>${rows}</tbody></table>`;
    window.print();
    area.hidden = true;
  }

  function renderStudentQrBox() {
    const box = document.querySelector("#class-student-qr-box");
    if (!box) return;
    const name = localStorage.getItem("enlab-student-name");
    if (!name || typeof buildTransferPayload !== "function" || typeof transferEncode !== "function") {
      box.hidden = true;
      return;
    }
    const code = transferEncode(buildTransferPayload());
    const planLink = `${location.href.split("#")[0]}#coach-plan`;
    box.hidden = false;
    box.innerHTML = `
      <p class="muted">${esc(t("classStudentQrHint", { name }))}${typeof transferPlanHintSuffix === "function" ? esc(transferPlanHintSuffix()) : ""}</p>
      <p class="muted"><a href="${esc(planLink)}">${esc(t("classStudentQrPlanLink"))}</a></p>
      <textarea class="transfer-code" rows="2" readonly>${esc(code)}</textarea>
      <canvas id="student-qr-canvas" width="160" height="160" aria-hidden="true"></canvas>`;
    if (typeof drawTransferQr === "function") drawTransferQr(document.querySelector("#student-qr-canvas"), code);
  }

  function countHotDays(statsRaw, windowDays) {
    let days = {};
    try {
      const st = typeof statsRaw === "string" ? JSON.parse(statsRaw || "{}") : (statsRaw || {});
      days = st.days || {};
    } catch { return 0; }
    let hot = 0;
    const now = new Date();
    for (let i = 0; i < windowDays; i += 1) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = typeof dateKey === "function" ? dateKey(d) : d.toISOString().slice(0, 10);
      const day = days[key] || {};
      if ((day.heard || 0) + (day.quiz || 0) + (day.spoke || 0) > 0) hot += 1;
    }
    return hot;
  }

  function parseWeakList(raw) {
    try {
      const w = typeof raw === "string" ? JSON.parse(raw || "[]") : raw;
      return Array.isArray(w) ? w.slice(0, 8).join("|") : "";
    } catch { return ""; }
  }

  function parseErrorCount(raw) {
    try {
      const log = typeof raw === "string" ? JSON.parse(raw || "[]") : raw;
      return Array.isArray(log) ? log.length : 0;
    } catch { return 0; }
  }

  function rosterPlacementCell(s) {
    if (s.placePct != null) {
      return t("classPlacementCell", { pct: s.placePct, level: String(s.placeCefr || "").toUpperCase() || "—" });
    }
    if (localStorage.getItem("enlab-student-name") === s.name && typeof loadPlaceResult === "function") {
      const pr = loadPlaceResult();
      if (pr?.n) {
        return t("classPlacementCell", {
          pct: Math.round((pr.score / pr.n) * 100),
          level: String(pr.cefr || "").toUpperCase() || "—",
        });
      }
    }
    return "—";
  }

  function rosterCoachPlanStatus(s) {
    if (s.coachDone != null) {
      const total = s.coachTotal || 3;
      if (s.coachDone >= total) return "done";
      if (s.coachDone === 0) return "pending";
      return "mid";
    }
    if (localStorage.getItem("enlab-student-name") === s.name) {
      try {
        const raw = JSON.parse(localStorage.getItem("enlab-coach-plan-mirror") || "null");
        const today = typeof todayKey === "function" ? todayKey() : "";
        if (raw?.day === today) {
          const total = (raw.steps || []).length || 3;
          const done = Number(raw.done) || 0;
          if (done >= total) return "done";
          if (done === 0) return "pending";
          return "mid";
        }
      } catch { /* ignore */ }
      if (typeof coachPlanProgress === "function" && typeof coachPlanLeft === "function") {
        const done = coachPlanProgress();
        const total = typeof quizCoachPlan8 === "function" ? quizCoachPlan8().length : 3;
        if (done > 0 && done < total) return "mid";
        if (typeof coachPlanStarted === "function" && !coachPlanStarted() && coachPlanLeft() >= 3) {
          return "pending";
        }
      }
    }
    return null;
  }

  function rosterCoachPlanCell(s) {
    const status = rosterCoachPlanStatus(s);
    if (!status) return "—";
    if (status === "done") return t("classCoachPlanDone");
    if (status === "pending") return t("classCoachPlanPending");
    if (s.coachDone != null) {
      return t("classCoachPlanCell", { done: s.coachDone, total: s.coachTotal || 3 });
    }
    const done = typeof coachPlanProgress === "function" ? coachPlanProgress() : 0;
    const total = typeof quizCoachPlan8 === "function" ? quizCoachPlan8().length : 3;
    return t("classCoachPlanCell", { done, total });
  }

  function classCoachPlanHeatHtml() {
    const kids = typeof kidsOn === "function" && kidsOn();
    const items = loadRoster().map((s) => ({
      name: s.name,
      status: rosterCoachPlanStatus(s),
      label: kids
        ? (rosterCoachPlanStatus(s) === "done" ? "✓" : rosterCoachPlanStatus(s) === "mid" ? "◐" : rosterCoachPlanStatus(s) ? "○" : "")
        : rosterCoachPlanCell(s),
    })).filter((x) => x.status);
    if (!items.length) return "";
    return `
      <details class="fold class-coach-plan-heat" open>
        <summary class="muted">${esc(t("classCoachPlanHeatTitle"))}</summary>
        <p class="muted">${esc(t("classCoachPlanHeatHint"))} ${esc(t("classCoachPlanHeatClick"))}</p>
        ${classPlanHeatFilterHtml(localStorage.getItem("enlab-class-task") === "coach")}
        <table class="mini-table class-heat-table class-plan-heat-table">
          <thead><tr><th>${esc(t("classColName"))}</th><th>${esc(t("classColCoachPlan"))}</th></tr></thead>
          <tbody>${items.map((r) => {
            const lvl = r.status === "done" ? "lo" : r.status === "mid" ? "mid" : "hi";
            return `<tr class="class-plan-heat-row" tabindex="0" role="button" data-plan-heat-filter="${esc(r.status)}" title="${esc(t("classCoachPlanHeatClick"))}"><td>${esc(r.name)}</td><td class="class-heat-cell ${lvl}">${esc(r.label)}</td></tr>`;
          }).join("")}</tbody>
        </table>
      </details>`;
  }

  function classCoachPlanSummaryHtml() {
    const rows = loadRoster().map((s) => rosterCoachPlanStatus(s)).filter(Boolean);
    if (!rows.length) return "";
    const pending = rows.filter((x) => x === "pending").length;
    const mid = rows.filter((x) => x === "mid").length;
    const done = rows.filter((x) => x === "done").length;
    return `<p class="muted class-coach-plan-summary">${esc(t("classCoachPlanSummary", { pending, mid, done }))}</p>`;
  }

  function exportClassCoachPlanCsv() {
    if (typeof classroomAllowsChange === "function" && !classroomAllowsChange("classPinExport")) return;
    const rows = [["student", "plan_done", "plan_total", "status"]];
    loadRoster().forEach((s) => {
      const status = rosterCoachPlanStatus(s);
      if (!status) {
        rows.push([s.name, "", "", ""]);
        return;
      }
      if (status === "done") {
        rows.push([s.name, "3", "3", "done"]);
        return;
      }
      if (status === "pending") {
        rows.push([s.name, "0", "3", "pending"]);
        return;
      }
      const done = s.coachDone != null ? s.coachDone : (typeof coachPlanProgress === "function" ? coachPlanProgress() : 1);
      const total = s.coachTotal || (typeof quizCoachPlan8 === "function" ? quizCoachPlan8().length : 3);
      rows.push([s.name, String(done), String(total), "in_progress"]);
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "englishlab-coach-plan.csv";
    a.click();
  }

  function parseCoachPlanFromPayload(payload) {
    try {
      const raw = JSON.parse(payload["enlab-coach-plan-mirror"] || "null");
      if (!raw?.day) return null;
      const today = typeof todayKey === "function" ? todayKey() : "";
      if (raw.day !== today) return null;
      const steps = Array.isArray(raw.steps) ? raw.steps : ["ear", "uso", "choice"];
      return { coachDone: Number(raw.done) || 0, coachTotal: steps.length };
    } catch { return null; }
  }

  function parsePlaceFromPayload(payload) {
    try {
      const pr = JSON.parse(payload["enlab-place-result"] || "null");
      if (!pr?.n) return null;
      return {
        placePct: Math.round((pr.score / pr.n) * 100),
        placeCefr: pr.cefr || "",
        placeDay: pr.day || "",
      };
    } catch { return null; }
  }

  function importStudentFromCode(code) {
    if (!code) return false;
    try {
      const payload = typeof transferDecode === "function" ? transferDecode(code) : null;
      if (!payload) return false;
      const name = payload["enlab-student-name"] || `Alumno ${Date.now() % 1000}`;
      const weekly = payload["enlab-weekly-exam"] === (typeof todayKey === "function" ? todayKey() : "");
      const certDone = !!payload["enlab-cert-done"];
      let srsDue = 0;
      try {
        const srs = JSON.parse(payload["enlab-srs"] || "{}");
        const today = typeof todayKey === "function" ? todayKey() : "";
        srsDue = Object.values(srs).filter((r) => r?.due && r.due <= today).length;
      } catch { /* ignore */ }
      const extras = {
        hot90: countHotDays(payload["enlab-stats"], 90),
        weak: parseWeakList(payload["enlab-weak"]),
        errors: parseErrorCount(payload["enlab-error-log"]),
      };
      const fr = typeof frictionFromUxRaw === "function"
        ? frictionFromUxRaw(payload["enlab-quiz-ux"])
        : null;
      if (fr) {
        extras.frictionMode = fr.mode;
        extras.frictionDrop = fr.drop;
        recordClassFrictionSnapshot(name, fr.mode, fr.drop);
      }
      const place = parsePlaceFromPayload(payload);
      if (place) Object.assign(extras, place);
      const coach = parseCoachPlanFromPayload(payload);
      if (coach) Object.assign(extras, coach);
      const roster = loadRoster();
      const hit = roster.find((s) => s.name === name);
      if (hit) {
        hit.weeklyDone = weekly || hit.weeklyDone;
        hit.certDone = certDone || hit.certDone;
        hit.srsDue = srsDue;
        hit.synced = Date.now();
        hit.stats = payload["enlab-stats"];
        hit.level = payload["enlab-cefr"];
        Object.assign(hit, extras);
      } else {
        roster.push({
          name,
          weeklyDone: weekly,
          certDone,
          srsDue,
          synced: Date.now(),
          stats: payload["enlab-stats"],
          level: payload["enlab-cefr"],
          ...extras,
        });
      }
      saveRoster(roster);
      return true;
    } catch { return false; }
  }

  function rosterRowExtras(s) {
    const mine = localStorage.getItem("enlab-student-name") === s.name;
    if (mine) {
      return {
        hot90: String(countHotDays(localStorage.getItem("enlab-stats"), 90)),
        weak: parseWeakList(localStorage.getItem("enlab-weak")),
        errors: String(parseErrorCount(localStorage.getItem("enlab-error-log"))),
      };
    }
    return {
      hot90: s.hot90 != null ? String(s.hot90) : String(countHotDays(s.stats, 90)),
      weak: s.weak || "",
      errors: s.errors != null ? String(s.errors) : "",
    };
  }

  function printClassFrictionSheet() {
    if (typeof classroomAllowsChange === "function" && !classroomAllowsChange("classPinExport")) return;
    const area = document.querySelector("#weak-print-area");
    if (!area) return;
    const roster = loadRoster();
    const rows = roster
      .map((s) => {
        let mode = s.frictionMode;
        let drop = s.frictionDrop;
        if (localStorage.getItem("enlab-student-name") === s.name && typeof topQuizFriction === "function") {
          const top = topQuizFriction(1)[0];
          if (top) { mode = top.mode; drop = top.drop; }
        }
        return { name: s.name, mode, drop, srsDue: s.srsDue, weeklyDone: s.weeklyDone };
      })
      .filter((r) => r.mode && r.drop != null)
      .sort((a, b) => (b.drop - a.drop) || String(a.name).localeCompare(String(b.name)));
    const weekCmp = typeof perfFrictionWeekHtml === "function" ? perfFrictionWeekHtml() : "";
    area.hidden = false;
    area.innerHTML = `
      <h1>${esc(t("classFrictionPrintTitle"))}</h1>
      <p>${typeof todayKey === "function" ? todayKey() : ""} · ${esc(t("classFrictionPrintHint"))}</p>
      ${weekCmp ? `<div class="print-friction-week">${weekCmp}</div>` : ""}
      ${rows.length ? `<table class="mini-table"><thead><tr><th>${esc(t("classColName"))}</th><th>${esc(t("classColFriction"))}</th><th>SRS</th><th>${esc(t("classColWeekly"))}</th></tr></thead>
        <tbody>${rows.map((r) => `<tr>
          <td>${esc(r.name)}</td>
          <td>${esc(t("classFrictionCell", { mode: t(`quizModes.${r.mode}.t`) || r.mode, drop: r.drop }))}</td>
          <td>${r.srsDue != null ? esc(String(r.srsDue)) : "—"}</td>
          <td>${r.weeklyDone ? "✓" : "—"}</td>
        </tr>`).join("")}</tbody></table>` : `<p>${esc(t("perfFrictionNone"))}</p>`}`;
    window.print();
    area.hidden = true;
  }

  function exportRosterCsv() {
    if (typeof classroomAllowsChange === "function" && !classroomAllowsChange("classPinExport")) return;
    const roster = loadRoster();
    const rows = [["name", "weekly_done", "cert_done", "srs_due", "level", "last_sync", "task_today", "hot90", "weak", "errors", "friction_mode", "friction_drop_pct"]];
    roster.forEach((s) => {
      const extra = rosterRowExtras(s);
      rows.push([
        s.name,
        s.weeklyDone ? "yes" : "no",
        s.certDone ? "yes" : "no",
        s.srsDue != null ? String(s.srsDue) : "",
        s.level || "",
        s.synced ? new Date(s.synced).toISOString() : "",
        localStorage.getItem("enlab-class-task") || "",
        extra.hot90,
        extra.weak,
        extra.errors,
        s.frictionMode || "",
        s.frictionDrop != null ? String(s.frictionDrop) : "",
      ]);
    });
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
    const labels = {
      path: t("classTaskPath"),
      coach: t("classTaskCoach"),
      weekly: t("classTaskWeekly"),
      podcast: t("classTaskPodcast"),
      pron: t("classTaskPron"),
      story: t("classTaskStory"),
    };
    host.hidden = false;
    let coachHint = "";
    if (task === "coach") {
      const pending = loadRoster().filter((s) => rosterCoachPlanStatus(s) === "pending").length;
      if (pending) coachHint = ` · ${t("classTaskCoachPending", { n: pending })}`;
    }
    host.innerHTML = `<p class="muted">📋 ${esc(t("classTaskBanner", { task: labels[task] || task }))}${coachHint}${student ? ` · ${esc(student)}` : ""}
      <button type="button" class="btn sm" id="class-task-go">${esc(t("classTaskGo"))}</button></p>`;
  }

  function startClassTask() {
    const task = localStorage.getItem("enlab-class-task");
    if (!task) return;
    if (task === "path") {
      document.querySelector(".hoy-next")?.click();
      return;
    }
    if (task === "coach") {
      if (typeof startCoachPlanQuiz === "function") startCoachPlanQuiz();
      return;
    }
    if (task === "weekly" && typeof startWeeklyExam === "function") {
      startWeeklyExam();
      return;
    }
    if (task === "podcast") {
      showTab("vocales");
      if (typeof openOidoTopic === "function") openOidoTopic("oido-podcasts");
      else document.querySelector("#podcast-block")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (task === "pron") {
      showTab("vocales");
      if (typeof openOidoTopic === "function") openOidoTopic("pron-panel");
      else document.querySelector("#pron-panel")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (task === "story") {
      showTab("vocales");
      if (typeof openOidoTopic === "function") openOidoTopic("stories-panel");
      else document.querySelector("#stories-panel")?.scrollIntoView({ behavior: "smooth" });
    }
  }

  /* ── Onboarding v3 (60s) ── */
  function renderOnboarding() {
    const el = document.querySelector("#welcome");
    if (!el || localStorage.getItem("enlab-onboard-v3") === "1" || localStorage.getItem("enlab-welcome-v2") === "1") return;
    el.hidden = false;
    el.innerHTML = `
      <div class="card welcome-card onboard-steps">
        <div class="onboard-step" data-step="1">
          <p class="kicker">${esc(t("onboard"))}</p>
          <h2 data-i18n="onboardLevel">¿Tu nivel?</h2>
          <div class="row">${["A1", "A2", "B1", "B2"].map((l) => `<button type="button" class="chip onboard-level" data-level="${l}">${l}</button>`).join("")}</div>
        </div>
        <div class="onboard-step" data-step="2" hidden>
          <h2 data-i18n="onboardGoal">¿Tu meta?</h2>
          <div class="row">
            <button type="button" class="chip onboard-goal" data-goal="travel" data-i18n="onboardGoalTravel">Viaje</button>
            <button type="button" class="chip onboard-goal" data-goal="work" data-i18n="onboardGoalWork">Trabajo</button>
            <button type="button" class="chip onboard-goal" data-goal="exam" data-i18n="onboardGoalExam">Examen</button>
          </div>
        </div>
        <div class="onboard-step" data-step="3" hidden>
          <h2 data-i18n="onboardSession">Primera sesión</h2>
          <p class="muted" data-i18n="onboardSessionHint">15 min: oír → hablar → 3 preguntas. Todo local.</p>
          <button type="button" class="btn" id="onboard-start-path" data-i18n="onboardStart">Empezar el camino</button>
          <button type="button" class="btn ghost" id="onboard-skip" data-i18n="onboardSkip">Saltar</button>
        </div>
      </div>`;
    if (typeof applyUiLang === "function") applyUiLang();
  }

  function applyOnboardGoal() {
    const goal = localStorage.getItem("enlab-onboard-goal");
    if (goal === "travel" && window.NR?.travelOn && !window.NR.travelOn()) {
      document.querySelector("#travel-toggle")?.click();
    }
  }

  function finishOnboarding() {
    localStorage.setItem("enlab-onboard-v3", "1");
    localStorage.setItem("enlab-welcome-v2", "1");
    const el = document.querySelector("#welcome");
    if (el) el.hidden = true;
    applyOnboardGoal();
    if (typeof dirty === "object") dirty.hoy = true;
    if (typeof renderHome === "function") renderHome(true);
  }

  /* ── Offline indicator ── */
  function renderOfflineBadge() {
    let badge = document.querySelector("#offline-badge");
    if (!badge) {
      badge = document.createElement("p");
      badge.id = "offline-badge";
      badge.className = "offline-badge muted";
      document.querySelector(".hero-tools")?.appendChild(badge);
    }
    const online = navigator.onLine;
    caches?.keys?.().then((keys) => {
      const ready = keys.some((k) => k.startsWith("enlab-v"));
      badge.textContent = online
        ? (ready
          ? (window._enlabLoadFails?.length
            ? (typeof t === "function" ? t("offlinePartial") : "⚠ Carga parcial")
            : (typeof t === "function" ? t("offlineReady") : "✓ Listo sin red"))
          : "…")
        : (typeof t === "function" ? t("offlineModeHint") : "Sin red.");
      badge.hidden = !online;
      badge.classList.toggle("offline-on", !online);
      badge.classList.toggle("offline-ready", online && ready);
      if (typeof syncNetWarn === "function") syncNetWarn();
    }).catch(() => {});
  }

  const SW_CACHE = "enlab-v88";

  async function precacheTab(tab) {
    if (!("caches" in window)) return;
    const tabAssets = {
      vocales: ["./pack-s.js", "./pack-n.js", "./pack-bulk.js", "./pack-podcast-series.js"],
      hablar: ["./pack-o.js", "./pack-v.js", "./pack-u.js", "./pack-roleplays-bulk.js", "./pack-emails-extra.js"],
      quiz: ["./pack.js", "./pack-m.js", "./pack-emails-extra.js"],
      hoy: ["./pack-q.js", "./pack-bulk.js"],
    };
    const files = tabAssets[tab] || [];
    const cache = await caches.open(SW_CACHE);
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
      <button type="button" class="chip sm${localStorage.getItem("enlab-a11y-contrast") === "1" ? " on" : ""}" id="a11y-contrast-btn" aria-pressed="${localStorage.getItem("enlab-a11y-contrast") === "1"}">${esc(typeof t === "function" ? t("contrast") : "Contraste alto")}</button>
      <button type="button" class="chip sm${localStorage.getItem("enlab-a11y-motion") !== "0" ? " on" : ""}" id="a11y-motion-btn" aria-pressed="${localStorage.getItem("enlab-a11y-motion") !== "0"}">${esc(typeof t === "function" ? t("motion") : "Animaciones")}</button>
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
    if (window._paintTabSvPatched) return;
    window._paintTabSvPatched = true;
    if (typeof onTabPaint === "function") {
      onTabPaint((tab) => {
        if (tab === "vocales" && ENLAB.minimalPairs) { renderPronPanel(); renderStoriesPanel(); }
        if (tab === "hablar" && ENLAB.writingPrompts) { renderWritingPanel(); }
        if (tab === "hoy") { renderClassTaskBanner(); renderHoyStoryChip(); if (window.PLUS?.autoClassTask) window.PLUS.autoClassTask(); }
        if (tab === "ia") { renderClassPro(); renderA11yBar(); }
        if (window._enlabBootstrapped) precacheTab(tab);
      });
    }
  }

  function bindSpeakVerdict() {
    if (window._speakVerdictSvBound || typeof onSpeakVerdict !== "function") return;
    window._speakVerdictSvBound = true;
    onSpeakVerdict((said) => {
      if (window._hoyPronPending && recState?.surface === "hoy") {
        const pending = window._hoyPronPending;
        window._hoyPronPending = null;
        const el = document.querySelector("#hoy-speak-status");
        if (el && window.PRON && pending.blob && typeof scorePronunciationAsync === "function") {
          scorePronunciationAsync(pending.said, null, pending.target, pending.blob, null).then((r) => {
            if (r?.formants && window.PRON.plotFormantOnChart) {
              window.PRON.plotFormantOnChart(r.formants.f1, r.formants.f2, null);
            }
            const drill = window.PRON.formantDrill?.(r.formants, null);
            if (drill) el.title = drill;
            if (r?.pct != null) el.textContent += ` · ${r.pct}% pron`;
          }).catch(() => {});
        }
      }
      if (window._pronPending == null && window._accentPending == null) return;
      const accentI = window._accentPending;
      if (accentI != null) {
        window._accentPending = null;
        const a = window._accentMap?.[accentI];
        const el = document.querySelector(`#accent-score-${accentI}`);
        const blob = typeof recState !== "undefined" ? recState.lastBlob : null;
        if (!a || !el || !blob || !window.PRON?.compareAccent) return;
        el.hidden = false;
        el.textContent = typeof t === "function" ? t("analyzing") : "Analizando…";
        window.PRON.analyzeFormants(blob).then((m) => {
          const cmp = window.PRON.compareAccent(m, a.us, a.uk);
          if (!cmp) { el.textContent = ""; el.hidden = true; return; }
          const vowel = cmp.closer === "US" ? cmp.us : cmp.uk;
          el.textContent = typeof t === "function"
            ? t("accentCompare", { accent: cmp.closer, vowel })
            : `Closer to ${cmp.closer} (/${vowel}/)`;
          el.classList.toggle("ok", true);
        }).catch(() => { el.hidden = true; });
        return;
      }
      const i = window._pronPending;
      const p = window._pronPairs?.[i];
      const el = document.querySelector(`#pron-score-${i}`);
      window._pronPending = null;
      if (!p || !el) return;
      el.hidden = false;
      el.classList.remove("ok");
      el.textContent = typeof t === "function" ? t("analyzingFormants") : "Analizando formantes…";
      const blob = typeof recState !== "undefined" ? recState.lastBlob : null;
      const finish = (r) => {
        el.textContent = formatPronScore(r);
        el.classList.toggle("ok", r.pct >= 70);
        el.title = r.formants ? `F1 ${r.formants.f1} Hz · F2 ${r.formants.f2} Hz` : (r.note || "");
        if (r.formants && window.PRON?.plotFormantOnChart) {
          window.PRON.plotFormantOnChart(r.formants.f1, r.formants.f2, p);
        }
        const drill = window.PRON?.formantDrill?.(r.formants, p);
        if (drill) el.title = drill;
        renderPronHistoryChart();
        try {
          const log = JSON.parse(localStorage.getItem("enlab-pron-log") || "[]");
          log.push({
            pair: p.a,
            pct: r.pct,
            method: r.method,
            f1: r.formants?.f1,
            f2: r.formants?.f2,
            at: Date.now(),
          });
          localStorage.setItem("enlab-pron-log", JSON.stringify(log.slice(-50)));
        } catch { /* ignore */ }
      };
      if (typeof scorePronunciationAsync === "function" && window.PRON) {
        scorePronunciationAsync(said, p.ipaA, p.sayA || p.a, blob, p).then(finish).catch(() => {
          finish(scorePronunciation(said, p.ipaA, p.sayA || p.a, { pair: p }));
        });
      } else {
        finish(scorePronunciation(said, p.ipaA, p.sayA || p.a, { pair: p }));
      }
    });
  }

  function bindEvents() {
    document.addEventListener("click", (e) => {
      if (e.target.closest("#accent-pref")) return;
      if (e.target.closest("[data-accent-rec]")) {
        const ai = Number(e.target.closest("[data-accent-rec]").dataset.accentRec);
        const a = window._accentMap?.[ai];
        if (a) {
          window._accentPending = ai;
          window._speakTarget = { target: a.usSay || a.word, help: a.word };
          if (typeof setSpeakTarget === "function") setSpeakTarget(window._speakTarget);
          showTab("hablar");
          document.querySelector("#speak-rec")?.click();
        }
      }
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
      if (e.target.closest("[data-story-resume]")) {
        resumeStory(e.target.closest("[data-story-resume]").dataset.storyResume);
      }
      if (e.target.closest("[data-story]")) {
        beginStoryRun(e.target.closest("[data-story]").dataset.story);
        document.querySelector("#story-now")?.scrollIntoView({ behavior: "smooth" });
      }
      if (e.target.closest(".story-choice")) {
        const btn = e.target.closest(".story-choice");
        let choice = null;
        const ci = btn.dataset.storyChoiceI;
        if (ci != null && window._storyChoiceCtx?.storyId === btn.dataset.storyId) {
          choice = window._storyChoiceCtx.choices[Number(ci)];
        }
        advanceStory(btn.dataset.storyId, btn.dataset.storyNext, choice);
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
          localStorage.setItem("enlab-student-name", name);
          const roster = loadRoster();
          if (!roster.find((s) => s.name === name)) {
            roster.push({ name, weeklyDone: false, certDone: false, srsDue: 0, synced: null });
          }
          saveRoster(roster);
          renderClassPro();
        }
      }
      if (e.target.closest("#class-task-go")) startClassTask();
      if (e.target.closest("#class-student-qr")) {
        renderStudentQrBox();
        document.querySelector("#class-student-qr-box")?.scrollIntoView({ behavior: "smooth" });
      }
      if (e.target.closest("#class-import-code")) {
        if (typeof classroomAllowsChange === "function" && !classroomAllowsChange("classPinExport")) return;
        const code = window.prompt(typeof t === "function" ? t("classImportPrompt") : "Pega código transfer del alumno:");
        if (code && importStudentFromCode(code.trim())) renderClassPro();
      }
      if (e.target.closest("#class-export-csv")) exportRosterCsv();
      if (e.target.closest("#class-friction-print")) printClassFrictionSheet();
      if (e.target.closest("#class-friction-csv")) exportClassFrictionCsv();
      if (e.target.closest("#class-friction-alerts-csv")) exportClassFrictionAlertsCsv();
      if (e.target.closest("#class-placement-csv")) exportClassPlacementCsv();
      if (e.target.closest("[data-plan-heat-filter]")) {
        _classPlanHeatFilter = e.target.closest("[data-plan-heat-filter]").dataset.planHeatFilter || "";
        updateClassRosterBody();
        document.querySelector(".class-roster-table")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        return;
      }
      if (e.target.closest("#class-coach-plan-print")) printClassCoachPlanSheet();
      if (e.target.closest("#class-coach-plan-csv")) exportClassCoachPlanCsv();
      if (e.target.closest("[data-roster-rm]")) {
        const roster = loadRoster();
        roster.splice(Number(e.target.closest("[data-roster-rm]").dataset.rosterRm), 1);
        saveRoster(roster);
        renderClassPro();
      }
      if (e.target.closest(".onboard-level")) {
        const btn = e.target.closest(".onboard-level");
        document.querySelectorAll(".onboard-level").forEach((b) => b.classList.toggle("on", b === btn));
        const l = btn.dataset.level;
        if (typeof setCefr === "function") setCefr(l);
        document.querySelector('[data-step="1"]')?.setAttribute("hidden", "");
        document.querySelector('[data-step="2"]')?.removeAttribute("hidden");
      }
      if (e.target.closest(".onboard-goal")) {
        const btn = e.target.closest(".onboard-goal");
        document.querySelectorAll(".onboard-goal").forEach((b) => b.classList.toggle("on", b === btn));
        localStorage.setItem("enlab-onboard-goal", btn.dataset.goal);
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
    [
      renderPronPanel,
      renderStoriesPanel,
      renderWritingPanel,
      renderClassPro,
      renderClassTaskBanner,
      renderHoyStoryChip,
      renderA11yBar,
      renderOfflineBadge,
    ].forEach((fn) => { try { fn(); } catch (err) { console.warn(err); } });
    try { window.PLUS?.renderErrorJournal?.(); } catch (err) { console.warn(err); }
  }

  function bootstrap() {
    if (window._svBootstrapped) return;
    window._svBootstrapped = true;
    patchPaintTab();
    bindSpeakVerdict();
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
    scorePronunciationAsync,
    phonemeDistance,
    formatPronScore,
    renderPronPanel,
    renderStoriesPanel,
    storyMaxSteps,
    unlockChoiceVocab,
    beginStoryRun,
    resumeStory,
    renderHoyStoryChip,
    findContinuableStory,
    storyProgressPct,
    advanceStory,
    renderWritingPanel,
    renderClassPro,
    renderClassTaskBanner,
    importStudentFromCode,
  };

  if (!window.ENLAB_LOADER) bootstrap();
})();
