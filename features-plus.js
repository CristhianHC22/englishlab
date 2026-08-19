/* Lote plus: colocación, diario, 90d, print, onda, shadowing, tarea auto, a11y extra */
(function () {
  "use strict";

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function tt(key, vars) {
    return typeof t === "function" ? t(key, vars) : key;
  }

  const ERR_KEY = "enlab-error-log";

  function loadErrors() {
    try {
      const raw = JSON.parse(localStorage.getItem(ERR_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch { return []; }
  }

  function logPlanStepEvent(kind, mode) {
    const steps = typeof quizCoachPlan8 === "function" ? quizCoachPlan8() : ["ear", "uso", "choice"];
    const done = typeof coachPlanProgress === "function" ? coachPlanProgress() : 0;
    const stepMode = mode || steps[Math.min(done, steps.length - 1)] || "?";
    const label = tt(`quizModes.${stepMode}.t`) || stepMode;
    logError({
      mode: `plan:${stepMode}`,
      expected: kind === "abandon" ? tt("journalPlanAbandon") : tt("journalPlanFail"),
      prompt: tt("journalPlanStepPrompt", { step: Math.min(done + 1, steps.length), total: steps.length, mode: label }),
      said: kind === "abandon" ? tt("journalPlanAbandonSaid") : tt("journalPlanFailSaid"),
      why: kind === "abandon" ? tt("journalPlanAbandonWhy") : tt("journalPlanFailWhy"),
      planStep: kind,
    });
  }

  function logError(entry) {
    if (!entry?.expected && !entry?.prompt) return;
    const row = {
      at: Date.now(),
      mode: entry.mode || "quiz",
      prompt: String(entry.prompt || "").slice(0, 120),
      expected: String(entry.expected || "").slice(0, 160),
      said: String(entry.said || "").slice(0, 160),
      why: String(entry.why || "").slice(0, 220),
    };
    if (entry.planStep) row.planStep = entry.planStep;
    if (entry.f1) {
      row.f1 = entry.f1;
      row.f2 = entry.f2;
    } else {
      const form = window._lastPron?.formants;
      if (form?.f1 && entry.mode === "speak") {
        row.f1 = form.f1;
        row.f2 = form.f2;
      }
    }
    const all = [row, ...loadErrors()].slice(0, 80);
    localStorage.setItem(ERR_KEY, JSON.stringify(all));
    if (window.ENLAB_IDB?.mirror) window.ENLAB_IDB.mirror(ERR_KEY, JSON.stringify(all));
    renderErrorJournal();
  }

  function whyFor(expected) {
    const s = String(expected || "").toLowerCase();
    if (/th|thin|this|think/.test(s)) return tt("errWhyTh");
    if (/\bv|\bvery|\bvan/.test(s)) return tt("errWhyV");
    if (/i'm|i am|don't|do not/.test(s)) return tt("errWhyContr");
    if (/make|do /.test(s)) return tt("errWhyMakeDo");
    if (/on monday|in 19|at 3/.test(s)) return tt("errWhyPrep");
    return tt("errWhyDefault");
  }

  function makePlacementItems() {
    const bank = [...(ENLAB.placementItems || [])];
    const picked = (typeof shuffle === "function" ? shuffle(bank) : bank).slice(0, 20);
    return picked.map((it, i) => ({
      type: "uso",
      q: it.q,
      prompt: it.prompt,
      a: it.a,
      opts: typeof shuffle === "function" ? shuffle([...(it.opts || [])]) : it.opts,
      say: it.say,
      why: it.why,
      inf: `place:${i}:${it.a}`,
    }));
  }

  function scoreToCefr(score, total) {
    const p = total ? score / total : 0;
    if (p < 0.35) return "a1";
    if (p < 0.58) return "a2";
    if (p < 0.82) return "b1";
    return "b2";
  }

  function startPlacement(opts) {
    if (typeof stopRecording === "function" && recState?.rec?.state === "recording") stopRecording(false);
    const resume = opts?.resume ? loadPlaceNow() : null;
    if (resume) {
      quiz = { i: resume.i, score: resume.score || 0, items: resume.items, fails: resume.fails || [], mode: "place", host: "#quiz-box" };
    } else {
      clearPlaceNow();
      renderPlaceToday();
      quiz = { i: 0, score: 0, items: makePlacementItems(), fails: [], mode: "place", host: "#quiz-box" };
    }
    if (typeof showTab === "function") showTab("quiz");
    if (typeof openQuizRoom === "function") openQuizRoom("place");
    if (typeof renderQuiz === "function") renderQuiz();
  }

  function loadPlaceNow() {
    try {
      const raw = JSON.parse(localStorage.getItem("enlab-place-now") || "null");
      const today = typeof todayKey === "function" ? todayKey() : "";
      if (raw?.day !== today) return null;
      if (Array.isArray(raw.items) && raw.i > 0 && raw.i < raw.items.length) return raw;
    } catch { /* ignore */ }
    return null;
  }

  function persistPlaceNow() {
    if (typeof quiz === "undefined" || quiz?.mode !== "place" || !quiz.items?.length || quiz.i <= 0 || quiz.i >= quiz.items.length) return;
    try {
      localStorage.setItem("enlab-place-now", JSON.stringify({
        day: typeof todayKey === "function" ? todayKey() : "",
        i: quiz.i,
        score: quiz.score || 0,
        fails: quiz.fails || [],
        items: quiz.items,
      }));
  } catch { /* ignore */ }
  renderPlaceToday();
  renderPlaceQuizResume();
}

  function clearPlaceNow() {
    localStorage.removeItem("enlab-place-now");
  }

  function renderPlaceQuizResume() {
    const el = document.querySelector("#place-quiz-resume");
    if (!el) return;
    const now = loadPlaceNow();
    if (!now || (typeof kidsOn === "function" && kidsOn())) {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    el.hidden = false;
    el.innerHTML = `
      <p class="muted">${esc(tt("placeResumeHint"))}</p>
      <button type="button" class="btn sm" data-place-resume>${esc(tt("placeResume", { i: now.i + 1, total: now.items.length }))}</button>`;
    if (typeof renderHoyDoneMid === "function") renderHoyDoneMid();
  }

  function renderPlaceToday() {
    const el = document.querySelector("#place-today");
    if (!el) return;
    if (typeof kidsOn === "function" && kidsOn()) {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    const now = loadPlaceNow();
    if (!now) {
      el.hidden = true;
      el.innerHTML = "";
      renderPlaceQuizResume();
      return;
    }
    el.hidden = false;
    el.innerHTML = `
      <p class="kicker">${esc(tt("placeResumeKicker"))}</p>
      <p class="muted">${esc(tt("placeResumeHint"))}</p>
      <button type="button" class="btn sm" data-place-resume>${esc(tt("placeResume", { i: now.i + 1, total: now.items.length }))}</button>`;
    if (typeof renderHoyDoneMid === "function") renderHoyDoneMid();
  }

  function journalPlayMode(mode) {
    const m = String(mode || "").toLowerCase();
    if (m === "exam") return "ear";
    if (["ear", "dict", "listen"].includes(m)) return m;
    if (["choice", "type", "ed"].includes(m)) return m;
    if (["uso", "art", "prep", "phrasal", "cond", "emailtone", "story"].includes(m)) return m;
    if (["speak", "voice", "rec", "role", "dialog"].includes(m)) return "hablar";
    return "uso";
  }

  function journalCoachPlanMode() {
    const errors = loadErrors().slice(0, 30);
    const stepScores = { ear: 0, uso: 0, choice: 0 };
    errors.forEach((r) => {
      const m = journalPlayMode(r.mode);
      if (["ear", "dict", "listen"].includes(m)) stepScores.ear += 1;
      else if (["choice", "type", "ed"].includes(m)) stepScores.choice += 1;
      else if (m !== "hablar") stepScores.uso += 1;
    });
    try {
      const wf = typeof loadWeeklyFailsForCoach === "function"
        ? loadWeeklyFailsForCoach()
        : JSON.parse(localStorage.getItem("enlab-weekly-fails") || "null");
      const day = typeof todayKey === "function" ? todayKey() : "";
      if (wf?.day === day && Array.isArray(wf.modes)) {
        wf.modes.forEach((m) => {
          if (["ear", "dict", "listen", "exam"].includes(m)) stepScores.ear += 2;
          else if (["choice", "type", "ed"].includes(m)) stepScores.choice += 2;
          else stepScores.uso += 2;
        });
      }
    } catch { /* ignore */ }
    const pending = typeof coachPlanPendingModes === "function"
      ? coachPlanPendingModes()
      : (typeof quizCoachPlan8 === "function" ? quizCoachPlan8() : ["ear", "uso", "choice"]);
    let best = pending[0] || "ear";
    let max = -1;
    pending.forEach((step) => {
      const n = stepScores[step] || 0;
      if (n > max) { max = n; best = step; }
    });
    return best;
  }

  function journalPlayBtn(r, now) {
    if (!now) return "";
    const mode = journalPlayMode(r.mode);
    if (mode === "hablar") {
      return `<button type="button" class="btn ghost sm" data-go-tab="hablar">${esc(tt("journalPlay"))}</button>`;
    }
    return `<button type="button" class="btn ghost sm" data-quiz-miss="${esc(mode)}">${esc(tt("journalPlay"))}</button>`;
  }

  function journalCardHtml(r, now) {
    return `
      <div class="card journal-card${now ? " journal-card-now" : ""}${r.planStep ? " journal-card-plan" : ""}">
        <p><strong>${esc(r.expected || r.prompt)}</strong>${r.planStep ? ` <span class="chip sm journal-plan-tag">${esc(tt("journalPlanTag"))}</span>` : ""}</p>
        ${r.said ? `<p class="muted">${esc(tt("journalSaid"))}: ${esc(r.said)}</p>` : ""}
        <p class="muted">${esc(r.why || whyFor(r.expected))}</p>
        ${r.f1 ? `<p class="muted">${esc(tt("journalFormants", { f1: r.f1, f2: r.f2 || "?" }))}</p>` : ""}
        ${r.expected ? `<button type="button" class="say chip" data-say="${esc(r.expected)}">▶</button>` : ""}
        ${now ? journalPlayBtn(r, true) : ""}
      </div>`;
  }

  function journalGroupHtml(rows, now) {
    const groups = new Map();
    rows.forEach((r) => {
      const mode = journalPlayMode(r.mode);
      if (!groups.has(mode)) groups.set(mode, []);
      groups.get(mode).push(r);
    });
    return [...groups.entries()].map(([mode, list]) => {
      const sample = list[0];
      const label = list.length > 1
        ? tt("journalGroupN", { n: list.length, mode: tt(`quizModes.${mode}.t`) || mode })
        : (sample.expected || sample.prompt || mode);
      const btn = mode === "hablar"
        ? `<button type="button" class="btn ghost sm" data-go-tab="hablar">${esc(tt("journalPlay"))}</button>`
        : `<button type="button" class="btn ghost sm" data-quiz-miss="${esc(mode)}">${esc(tt("journalPlay"))}</button>`;
      return `<div class="card journal-card journal-card-group${now ? " journal-card-now" : ""}${list.some((r) => r.planStep) ? " journal-card-plan" : ""}">
        <p><strong>${esc(label)}</strong>${list.some((r) => r.planStep) ? ` <span class="chip sm journal-plan-tag">${esc(tt("journalPlanTag"))}</span>` : ""}</p>
        ${sample.said ? `<p class="muted">${esc(tt("journalSaid"))}: ${esc(sample.said)}</p>` : ""}
        <p class="muted">${esc(sample.why || whyFor(sample.expected))}</p>
        ${btn}
      </div>`;
    }).join("");
  }

  function renderErrorJournal() {
    const host = document.querySelector("#error-journal");
    if (!host) return;
    let sortBy = "date";
    try { sortBy = sessionStorage.getItem("enlab-journal-sort") || "date"; } catch { /* ignore */ }
    let sortedRows = loadErrors();
    if (sortBy === "mode") {
      sortedRows = [...sortedRows].sort((a, b) => journalPlayMode(a.mode).localeCompare(journalPlayMode(b.mode)));
    } else if (sortBy === "word") {
      sortedRows = [...sortedRows].sort((a, b) => String(a.expected || "").localeCompare(String(b.expected || "")));
    }
    /* date = default order (most recent first, already stored that way) */
    const rows = sortedRows.slice(0, 12);
    let focus = "";
    try { focus = sessionStorage.getItem("enlab-journal-focus") || ""; } catch { focus = ""; }
    const focusNorm = focus.toLowerCase().trim();
    const hitI = focusNorm
      ? rows.findIndex((r) => [r.expected, r.prompt, r.said].some((x) =>
        x && String(x).toLowerCase().includes(focusNorm.slice(0, 40))))
      : -1;
    let nowI = hitI >= 0 ? hitI : (focusNorm && rows.length ? 0 : -1);
    let nowRow = nowI >= 0 ? rows[nowI] : null;
    if (hitI < 0 && focusNorm) {
      const modeHit = rows.filter((r) => {
        const m = journalPlayMode(r.mode);
        const label = (tt(`quizModes.${m}.t`) || m).toLowerCase();
        return focusNorm.includes(m) || (label.length > 3 && focusNorm.includes(label.slice(0, 6)));
      });
      if (modeHit.length) {
        nowRow = modeHit[0];
        nowI = rows.indexOf(nowRow);
      }
    }
    const nowMode = nowRow ? journalPlayMode(nowRow.mode) : null;
    const nowPeers = nowMode ? rows.filter((r) => journalPlayMode(r.mode) === nowMode) : [];
    const rest = nowI >= 0 ? rows.filter((r) => !nowPeers.includes(r)) : rows;
    const nowHtml = nowPeers.length > 1
      ? journalGroupHtml(nowPeers, true)
      : (nowRow ? journalCardHtml(nowRow, true) : "");
    const restHtml = rest.length
      ? (nowI >= 0
        ? `<details class="fold journal-rest"><summary>${esc(tt("journalRest", { n: rest.length }))}</summary>${journalGroupHtml(rest)}</details>`
        : journalGroupHtml(rest))
      : "";
    const list = nowI >= 0 && rest.length
      ? `${nowHtml}${restHtml}`
      : (nowHtml + restHtml);
    window._journalNowRows = nowI >= 0 ? (nowPeers.length ? nowPeers : (nowRow ? [nowRow] : [])) : [];
    const ankiLabel = nowI >= 0 ? tt("exportAnkiNow") : tt("exportAnki");
    /* collect distinct modes for filter chips */
    const allRows = loadErrors().slice(0, 80);
    const modeCounts = {};
    allRows.forEach((r) => {
      const m = journalPlayMode(r.mode);
      modeCounts[m] = (modeCounts[m] || 0) + 1;
    });
    const modeKeys = Object.keys(modeCounts).sort((a, b) => modeCounts[b] - modeCounts[a]);
    const activeModeFilter = focusNorm && !focusNorm.includes(" ")
      ? modeKeys.find((m) => focusNorm.includes(m.slice(0, 4))) : "";
    const modeChipsHtml = modeKeys.length > 1 ? `
      <div class="journal-mode-chips row" role="group" aria-label="${esc(tt("journalFilterAria"))}">
        <button type="button" class="chip${!activeModeFilter ? " on" : ""}" data-journal-mode="">${esc(tt("journalFilterAll"))}</button>
        ${modeKeys.map((m) => {
          const on = activeModeFilter === m;
          const label = (typeof t === "function" && t(`quizModes.${m}.t`)) || m;
          return `<button type="button" class="chip${on ? " on" : ""}" data-journal-mode="${esc(m)}">${esc(label)} <span class="muted">${modeCounts[m]}</span></button>`;
        }).join("")}
      </div>` : "";
    const searchVal = esc(focus);
    const coachMode = journalCoachPlanMode();
    const coachLabel = (typeof t === "function" && t(`quizModes.${coachMode}.t`)) || coachMode;
    const coachPlanBtn = (typeof coachPlanLeft === "function" && coachPlanLeft() > 0)
      ? `<button type="button" class="btn ghost sm" id="journal-coach-plan" data-coach-plan-mode="${esc(coachMode)}" title="${esc(tt("journalCoachPlanHint", { mode: coachLabel }))}">${esc(tt("journalCoachPlan"))}</button>`
      : "";
    host.innerHTML = `
      <p class="kicker">${esc(tt("journalTitle"))}</p>
      ${nowI >= 0 ? `<p class="kicker journal-now-kicker">${esc(tt("journalNow"))}</p>` : ""}
      <p class="muted">${esc(tt("journalHint"))}</p>
      ${modeChipsHtml}
      <div class="row journal-controls-row">
        <input type="search" id="journal-search" class="journal-search" placeholder="${esc(tt("journalSearch"))}" value="${searchVal}" aria-label="${esc(tt("journalSearch"))}">
        <select id="journal-sort" class="journal-sort" aria-label="${esc(tt("journalSortAria"))}">
          <option value="date"${sortBy === "date" ? " selected" : ""}>${esc(tt("journalSortDate"))}</option>
          <option value="mode"${sortBy === "mode" ? " selected" : ""}>${esc(tt("journalSortMode"))}</option>
          <option value="word"${sortBy === "word" ? " selected" : ""}>${esc(tt("journalSortWord"))}</option>
        </select>
      </div>
      <div class="row">
        <button type="button" class="btn ghost sm" id="journal-anki">${esc(ankiLabel)}</button>
        <button type="button" class="btn ghost sm" id="journal-csv">${esc(nowI >= 0 ? tt("exportWeakCsvNow") : tt("exportWeakCsv"))}</button>
        <button type="button" class="btn ghost sm" id="week-sheet-print">${esc(tt("weekSheetPrint"))}</button>
        ${coachPlanBtn}
        ${nowI >= 0 ? `<button type="button" class="btn ghost sm" id="journal-print-now">${esc(tt("journalPrintNow"))}</button>` : ""}
      </div>
      ${list || `<p class="muted">${esc(tt("journalEmpty"))}</p>`}`;
    const now = host.querySelector(".journal-card-now");
    if (now) now.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function ankiEscape(s) {
    return String(s || "").replace(/"/g, '""');
  }

  function downloadText(name, body, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([body], { type }));
    a.download = name;
    a.click();
  }

  function exportAnki() {
    const focus = window._journalNowRows;
    const errs = focus?.length ? focus : loadErrors();
    const weak = typeof weakSet === "function" ? [...weakSet()] : [];
    const srs = typeof srsDueList === "function" ? srsDueList(40) : [];
    const friction = typeof topQuizFriction === "function" ? topQuizFriction(3) : [];
    const pending = typeof coachPlanPendingModes === "function" ? coachPlanPendingModes() : [];
    const lines = ["#separator:tab", "#html:true"];
    if (friction.length) {
      lines.push(`# friction-top: ${friction.map((r) => `${r.mode} ${r.drop}%`).join(", ")}`);
    }
    if (pending.length) {
      lines.push(`# coach-pending: ${pending.join(", ")}`);
    }
    if (typeof coachPlanLeft === "function" && coachPlanLeft() >= 3
      && typeof coachPlanStarted === "function" && !coachPlanStarted()) {
      lines.push("# plan-pending: 0/3");
    }
    const pr = typeof loadPlaceResult === "function" ? loadPlaceResult() : null;
    const placePct = pr?.n ? pr.score / pr.n : null;
    if (placePct != null && placePct < 0.65) {
      lines.push(`# placement-low: ${Math.round(placePct * 100)}%`);
    }
    errs.forEach((r) => {
      const front = r.prompt || r.said || "Fix this";
      const mode = journalPlayMode(r.mode);
      const drop = typeof quizModeDropPct === "function" ? quizModeDropPct(mode) : 0;
      const coachTag = typeof coachPlanStepForMode === "function" && pending.includes(coachPlanStepForMode(mode)) ? " #coach-pending" : "";
      const placeTag = placePct != null && placePct < 0.65 && typeof placementCoachStep === "function"
        && placementCoachStep(placePct) === coachPlanStepForMode(mode) ? " #placement-low" : "";
      const frTag = drop ? `<br><small>friction ${mode}: ${drop}%</small>` : "";
      const back = `${r.expected}<br><small>${r.why || ""}</small>${frTag}`;
      lines.push(`${front.replace(/\t/g, " ")}${coachTag}${placeTag}\t${back.replace(/\t/g, " ")}`);
    });
    if (!focus?.length) {
      weak.forEach((v) => lines.push(`${v}\t${v} — irregular / weak in English Lab`));
      srs.forEach((x) => lines.push(`${(x.label || x.key || "").replace(/\t/g, " ")}\tSRS due`));
    }
    downloadText(focus?.length ? "englishlab-anki-now.txt" : "englishlab-anki.txt", lines.join("\n"), "text/plain");
  }

  function exportFrictionCsv() {
    let ux = {};
    let daily = {};
    try { ux = JSON.parse(localStorage.getItem("enlab-quiz-ux") || "{}") || {}; } catch { ux = {}; }
    try { daily = JSON.parse(localStorage.getItem("enlab-quiz-ux-daily") || "{}") || {}; } catch { daily = {}; }
    const rows = [["mode", "sessions", "completed", "abandoned", "drop_pct", "avg_sec", "answers", "correct"]];
    Object.entries(ux).forEach(([mode, row]) => {
      const sessions = Number(row?.sessions || 0);
      rows.push([
        mode,
        sessions,
        row?.completed || 0,
        row?.abandoned || 0,
        sessions ? Math.round(((row?.abandoned || 0) * 100) / sessions) : 0,
        sessions ? Math.round((Number(row?.ms || 0)) / sessions / 1000) : 0,
        row?.answers || 0,
        row?.correct || 0,
      ]);
    });
    rows.push([]);
    rows.push(["day", "mode", "sessions", "abandoned", "completed"]);
    Object.keys(daily).sort().forEach((day) => {
      Object.entries(daily[day] || {}).forEach(([mode, row]) => {
        rows.push([day, mode, row?.sessions || 0, row?.abandoned || 0, row?.completed || 0]);
      });
    });
    const csv = rows.map((r) => (r.length
      ? r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
      : "")).join("\n");
    downloadText("englishlab-friction.csv", csv, "text/csv");
  }

  function exportWeakCsv() {
    const focus = window._journalNowRows;
    const rows = [["kind", "mode", "item", "note", "at"]];
    const addErr = (r) => rows.push([
      "error",
      journalPlayMode(r.mode),
      r.expected || r.prompt,
      r.why || "",
      r.at ? new Date(r.at).toISOString() : "",
    ]);
    if (focus?.length) {
      focus.forEach(addErr);
    } else {
      (typeof weakSet === "function" ? [...weakSet()] : []).forEach((v) => rows.push(["verb", "verb", v, "weak", ""]));
      (typeof speakWeakSet === "function" ? [...speakWeakSet()] : []).forEach((v) => rows.push(["speak", "hablar", v, "not understood", ""]));
      (typeof earWeakSet === "function" ? [...earWeakSet()] : []).forEach((v) => rows.push(["ear", "ear", v, "minimal pair", ""]));
      loadErrors().forEach(addErr);
      (typeof srsDueList === "function" ? srsDueList(50) : []).forEach((x) => rows.push(["srs", "srs", x.label || "", x.due || "", ""]));
    }
    const csv = rows.map((r) => r.map((c) => `"${ankiEscape(c)}"`).join(",")).join("\n");
    downloadText(focus?.length ? "englishlab-weak-now.csv" : "englishlab-weak.csv", csv, "text/csv");
  }

  function printJournalNow() {
    const rows = window._journalNowRows;
    if (!rows?.length) return;
    const area = document.querySelector("#weak-print-area") || document.body.appendChild(Object.assign(document.createElement("div"), { id: "weak-print-area" }));
    area.hidden = false;
    area.innerHTML = `
      <h1>English Lab — ${esc(tt("journalPrintNowTitle"))}</h1>
      <p>${typeof todayKey === "function" ? todayKey() : ""} · ${rows.length} ${esc(tt("journalPrintNowItems"))}</p>
      <table>
        <thead><tr><th>${esc(tt("journalPrintNowExpected"))}</th><th>${esc(tt("journalPrintNowNote"))}</th></tr></thead>
        <tbody>${rows.map((r) => `<tr><td>${esc(r.expected || r.prompt || "")}</td><td>${esc(r.why || "")}</td></tr>`).join("")}</tbody>
      </table>`;
    window.print();
    requestAnimationFrame(() => { area.hidden = true; area.innerHTML = ""; });
  }

  function printWeekSheet() {
    const weak = typeof weakSet === "function" ? [...weakSet()].slice(0, 8) : [];
    const due = typeof srsDueList === "function" ? srsDueList(8) : [];
    const days = [tt("weekMon"), tt("weekTue"), tt("weekWed"), tt("weekThu"), tt("weekFri")];
    const area = document.querySelector("#weak-print-area") || document.body.appendChild(Object.assign(document.createElement("div"), { id: "weak-print-area" }));
    area.hidden = false;
    area.innerHTML = `
      <h1>English Lab — ${esc(tt("weekSheetTitle"))}</h1>
      <p>${typeof todayKey === "function" ? todayKey() : ""} · ${(typeof level === "function" ? level() : "").toUpperCase()}</p>
      ${days.map((d, i) => `
        <h2>${esc(d)} · 15 min</h2>
        <ol>
          <li>${esc(tt("weekSheetHear"))}${weak[i] ? ` · ${esc(weak[i])}` : ""}</li>
          <li>${esc(tt("weekSheetSpeak"))}${due[i] ? ` · ${esc(due[i].label)}` : ""}</li>
          <li>${esc(tt("weekSheetQuiz"))}</li>
        </ol>`).join("")}
      <p class="muted">${esc(tt("weekSheetFoot"))}</p>`;
    window.print();
    area.hidden = true;
  }

  function printStudentPdf() {
    if (typeof classroomAllowsChange === "function" && !classroomAllowsChange("classPinExport")) return;
    const name = localStorage.getItem("enlab-student-name") || tt("classStudentPh");
    const weekly = localStorage.getItem("enlab-weekly-exam");
    const cert = localStorage.getItem("enlab-cert-done") || "—";
    const dueN = typeof srsDueList === "function" ? srsDueList(99).length : 0;
    const lvl = typeof level === "function" ? level().toUpperCase() : "";
    const weak = typeof weakSet === "function" ? [...weakSet()].slice(0, 12) : [];
    const errs = loadErrors().length;
    let hot = 0;
    if (typeof stats === "function" && typeof dateKey === "function") {
      const st = stats();
      for (let i = 0; i < 90; i += 1) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const day = (st.days || {})[dateKey(d)] || {};
        if ((day.heard || 0) + (day.quiz || 0) + (day.spoke || 0) > 0) hot += 1;
      }
    }
    const area = document.querySelector("#weak-print-area");
    if (!area) return;
    area.hidden = false;
    const planDone = typeof coachPlanProgress === "function" ? coachPlanProgress() : 0;
    const planTotal = typeof quizCoachPlan8 === "function" ? quizCoachPlan8().length : 3;
    const planLine = planDone < planTotal
      ? tt("studentReportPlan", { done: planDone, total: planTotal })
      : tt("studentReportPlanDone");
    area.innerHTML = `
      <h1>English Lab — ${esc(tt("studentReport"))}</h1>
      <p><strong>${esc(name)}</strong> · ${esc(lvl)} · ${typeof todayKey === "function" ? todayKey() : ""}</p>
      <ul>
        <li>${esc(tt("classColCoachPlan"))}: ${esc(planLine)}</li>
        <li>${esc(tt("classColWeekly"))}: ${esc(weekly || "—")}</li>
        <li>${esc(tt("classColCert"))}: ${esc(cert)}</li>
        <li>${esc(tt("classColDue"))}: ${dueN}</li>
        <li>${esc(tt("studentReportHot", { n: hot }))}</li>
        <li>${esc(tt("studentReportWeak", { list: weak.join(", ") || "—" }))}</li>
        <li>${esc(tt("studentReportErrors", { n: errs }))}</li>
      </ul>
      <p>${esc(tt("studentReportPin"))}</p>`;
    window.print();
    area.hidden = true;
  }

  function renderChart90() {
    if (typeof renderStreakChart === "function") renderStreakChart();
  }

  let waveRaf = 0;
  let waveCtx = null;

  function stopWave() {
    cancelAnimationFrame(waveRaf);
    waveRaf = 0;
    waveCtx?.close?.().catch(() => {});
    waveCtx = null;
  }

  function startWave() {
    const canvas = recState?.surface === "hoy"
      ? document.querySelector("#hoy-rec-wave") || document.querySelector("#rec-wave")
      : document.querySelector("#rec-wave");
    if (!canvas || !recState?.stream || typeof AnalyserNode === "undefined") return;
    canvas.hidden = false;
    stopWave();
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    waveCtx = ac;
    const src = ac.createMediaStreamSource(recState.stream);
    const anal = ac.createAnalyser();
    anal.fftSize = 256;
    src.connect(anal);
    const data = new Uint8Array(anal.frequencyBinCount);
    const ctx2 = canvas.getContext("2d");
    const draw = () => {
      if (!recState?.rec || recState.rec.state !== "recording") {
        stopWave();
        canvas.hidden = true;
        return;
      }
      anal.getByteTimeDomainData(data);
      ctx2.fillStyle = getComputedStyle(document.body).getPropertyValue("--card") || "#fff";
      ctx2.fillRect(0, 0, canvas.width, canvas.height);
      ctx2.strokeStyle = getComputedStyle(document.body).getPropertyValue("--accent") || "#0b7a72";
      ctx2.beginPath();
      const slice = canvas.width / data.length;
      data.forEach((v, i) => {
        const y = (v / 255) * canvas.height;
        if (i === 0) ctx2.moveTo(0, y);
        else ctx2.lineTo(i * slice, y);
      });
      ctx2.stroke();
      anal.getByteFrequencyData(data);
      ctx2.globalAlpha = 0.35;
      data.slice(0, 48).forEach((v, i) => {
        ctx2.fillStyle = ctx2.strokeStyle;
        ctx2.fillRect(i * (canvas.width / 48), canvas.height - (v / 255) * canvas.height * 0.4, 3, (v / 255) * canvas.height * 0.4);
      });
      ctx2.globalAlpha = 1;
      waveRaf = requestAnimationFrame(draw);
    };
    draw();
  }

  function splitPhrases(text) {
    return String(text || "").split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  }

  function runPhraseShadow(target) {
    const parts = splitPhrases(target);
    if (!parts.length) return;
    const timerEl = document.querySelector("#shadow-timer");
    const status = document.querySelector("#shadow-phrase-status");
    let i = 0;
    const tick = async () => {
      if (i >= parts.length) {
        if (status) status.textContent = tt("sitShadowDone");
        return;
      }
      if (status) status.textContent = tt("shadowPhraseN", { n: i + 1, total: parts.length, phrase: parts[i] });
      let left = Math.min(8, Math.max(3, Math.round(parts[i].split(/\s+/).length * 0.7)));
      if (timerEl) timerEl.textContent = String(left);
      if (typeof speak === "function") await speak(parts[i], true);
      const iv = setInterval(() => {
        left -= 1;
        if (timerEl) timerEl.textContent = String(Math.max(0, left));
        if (left <= 0) {
          clearInterval(iv);
          i += 1;
          tick();
        }
      }, 1000);
    };
    tick();
  }

  function patchSpeak() {
    /* TTS acento ya está en speak() de app.js (enlab-accent-pref). */
  }

  function patchQuiz() {
    /* startQuiz / makeQuizItems / place-apply viven en app.js. */
  }

  function patchRecording() {
    if (window._plusRecPatched || typeof onRecording !== "function") return;
    window._plusRecPatched = true;
    onRecording((phase) => {
      if (phase === "start") startWave();
      else stopWave();
    });
  }

  function patchVerdict() {
    if (window._plusVerdictPatched || typeof onSpeakVerdict !== "function") return;
    window._plusVerdictPatched = true;
    onSpeakVerdict((said, meta) => {
      const target = meta?.target || window._speakTarget?.target || "";
      if (!said || !target || meta?.ok) return;
      const blob = recState?.lastBlob;
      const finish = (extra) => logError({
        mode: "speak",
        expected: target,
        said,
        prompt: target,
        why: whyFor(target),
        ...extra,
      });
      if (blob && window.SV?.scorePronunciationAsync) {
        window.SV.scorePronunciationAsync(said, null, target, blob, null).then((r) => {
          window._lastPron = r;
          finish(r?.formants?.f1 ? { f1: r.formants.f1, f2: r.formants.f2 } : {});
        }).catch(() => finish({}));
        return;
      }
      finish({});
    });
  }

  function patchRoleplay() {
    if (window._plusRolePatched || typeof paintRoleplayTurn !== "function") return;
    window._plusRolePatched = true;
    const orig = paintRoleplayTurn;
    window.paintRoleplayTurn = function () {
      orig();
      const st = window._roleplay;
      const turn = st?.scene?.turns?.[st.i];
      const box = document.querySelector("#roleplay-now");
      if (!turn?.bOpts || !box || box.querySelector(".role-b-opts")) return;
      const row = document.createElement("div");
      row.className = "row role-b-opts";
      row.style.marginTop = "8px";
      row.innerHTML = turn.bOpts.map((b) => `<button type="button" class="chip sm" data-role-pick-b="${esc(b)}">${esc(b)}</button>`).join("");
      box.querySelector(".row")?.after(row);
    };
  }

  function patchShadow() {
    if (window._plusShadowPatched || typeof runShadowing !== "function") return;
    window._plusShadowPatched = true;
    const orig = runShadowing;
    window.runShadowing = function () {
      const target = window._speakTarget?.target;
      if (target && splitPhrases(target).length > 1) {
        const box = document.querySelector("#shadow-box");
        if (box) box.hidden = false;
        runPhraseShadow(target);
        return;
      }
      orig();
    };
  }

  function patchStreak() {
    /* Gráfica 90 días vive en renderStreakChart (app.js). */
  }

  function patchFilters() {
    /* Filtros de verbos i18n viven en renderVerbFilters (app.js). */
  }

  function patchWeekA11y() {
    /* aria-label de week-dots vive en renderWeekStrip (app.js). */
  }

  function autoClassTask() {
    const task = localStorage.getItem("enlab-class-task");
    if (!task) return;
    if (window.SV?.renderClassTaskBanner) window.SV.renderClassTaskBanner();
    const today = typeof todayKey === "function" ? todayKey() : "";
    if (localStorage.getItem("enlab-class-task-auto") === today) return;
    if (localStorage.getItem("enlab-onboard-v3") !== "1" && localStorage.getItem("enlab-welcome-v2") !== "1") return;
    const banner = document.querySelector("#class-task-banner");
    if (!banner || banner.hidden) return;
    if (task === "coach" && typeof coachPlanLeft === "function" && coachPlanLeft() === 0) return;
    localStorage.setItem("enlab-class-task-auto", today);
    banner.classList.add("class-task-must");
    banner.scrollIntoView({ block: "nearest" });
    if (task === "coach" && typeof maybeScrollCoachPlanChip === "function") {
      setTimeout(() => maybeScrollCoachPlanChip(true), 300);
    }
  }

  function liveRegions() {
    ["#speak-status", "#hoy-speak-status", "#quiz-box", "#role-status"].forEach((sel) => {
      const el = document.querySelector(sel);
      if (el && !el.hasAttribute("aria-live")) el.setAttribute("aria-live", "polite");
    });
  }

  function scriptStats() {
    const entries = (performance.getEntriesByType && performance.getEntriesByType("resource")) || [];
    let transfer = 0;
    let decoded = 0;
    let js = 0;
    let cached = 0;
    entries.forEach((e) => {
      if (!/\.js(\?|$)/i.test(e.name)) return;
      js += 1;
      const dec = e.decodedBodySize || e.encodedBodySize || 0;
      decoded += dec;
      if (typeof e.transferSize === "number") {
        transfer += e.transferSize;
        if (e.transferSize === 0 && dec > 0) cached += 1;
      }
    });
    return { js, transfer, decoded, cached };
  }

  function renderPerfHint() {
    const host = document.querySelector("#perf-panel");
    if (!host) return;
    const planDone = typeof coachPlanProgress === "function" ? coachPlanProgress() : 0;
    const planTotal = typeof quizCoachPlan8 === "function" ? quizCoachPlan8().length : 3;
    const planLeft = typeof coachPlanLeft === "function" ? coachPlanLeft() : 0;
    let ux = {};
    try { ux = typeof loadQuizUx === "function" ? loadQuizUx() : JSON.parse(localStorage.getItem("enlab-quiz-ux") || "{}") || {}; } catch { ux = {}; }
    const uxKey = Object.keys(ux).sort().map((k) => `${k}:${Number(ux[k]?.sessions || 0)}:${Number(ux[k]?.abandoned || 0)}`).join("|");
    const hintKey = `${window.ENLAB_LOADER?.DEFERRED?.length || 0}|${planDone}|${planLeft}|${uiLang?.() || "es"}|${uxKey}`;
    if (hintKey === window._perfHintKey && host.innerHTML) return;
    window._perfHintKey = hintKey;
    const n = window.ENLAB_LOADER?.DEFERRED?.length || 0;
    const stats = scriptStats();
    const kb = Math.max(1, Math.round((stats.decoded || stats.transfer) / 1024)) || 0;
    const ms = window._enlabPacksMs;
    const lines = [
      `<p class="kicker">${esc(tt("perfTitle"))}</p>`,
      `<p class="muted">${esc(tt("perfHint", { n }))}</p>`,
    ];
    if (stats.js) {
      lines.push(`<p class="muted">${esc(tt("perfWeight", { kb, cached: stats.cached, n: stats.js }))}</p>`);
    }
    if (typeof ms === "number") {
      lines.push(`<p class="muted">${esc(tt("perfReady", { ms }))}</p>`);
    }
    if (planDone < planTotal) {
      const started = typeof coachPlanStarted === "function" ? coachPlanStarted() : false;
      const planLabel = !started && planLeft >= 3
        ? tt("perfPlanPending")
        : tt("perfPlanProgress", { done: planDone, total: planTotal, left: planLeft });
      lines.push(`<p class="muted perf-plan-row">${esc(planLabel)}</p>`);
    }
    const topDrop = typeof topQuizFriction === "function"
      ? topQuizFriction(3)
      : Object.entries(ux)
        .map(([mode, row]) => ({
          mode,
          sessions: Number(row?.sessions || 0),
          drop: Math.round(((Number(row?.abandoned || 0)) * 100) / Math.max(1, Number(row?.sessions || 0))),
          avgSec: Math.round((Number(row?.ms || 0)) / Math.max(1, Number(row?.sessions || 0)) / 1000),
        }))
        .filter((r) => r.sessions >= 1)
        .sort((a, b) => (b.drop - a.drop) || (b.sessions - a.sessions))
        .slice(0, 3);
    lines.push(`<p class="kicker">${esc(tt("perfFrictionTitle"))}</p>`);
    if (topDrop.length) {
      lines.push(`<div class="perf-friction-list">${topDrop.map((r) => {
        const trend = typeof quizUxTrend7 === "function" ? quizUxTrend7(r.mode) : null;
        const trendTxt = trend === "down" ? tt("perfTrendDown") : trend === "up" ? tt("perfTrendUp") : trend === "flat" ? tt("perfTrendFlat") : "";
        return `<p class="muted">${esc(tt("perfFrictionRow", { mode: tt(`quizModes.${r.mode}.t`) || r.mode, drop: r.drop, sec: r.avgSec }))}${trendTxt ? ` · ${esc(trendTxt)}` : ""}</p>`;
      }).join("")}</div>`);
    } else {
      lines.push(`<p class="muted">${esc(tt("perfFrictionNone"))}</p>`);
    }
    if (typeof perfFrictionHeatmapHtml === "function") {
      const heat = perfFrictionHeatmapHtml(2);
      if (heat) {
        lines.push(`<p class="kicker">${esc(tt("perfHeatTitle"))}</p>${heat}`);
      }
    }
    if (typeof perfFrictionWeekHtml === "function") {
      const week = perfFrictionWeekHtml();
      if (week) lines.push(week);
    }
    lines.push(`<p><button type="button" class="btn ghost sm" id="perf-friction-csv">${esc(tt("perfFrictionCsv"))}</button></p>`);
    host.innerHTML = lines.join("");
  }

  function bindPlus() {
    document.addEventListener("click", (e) => {
      if (e.target.closest("[data-place-resume]")) startPlacement({ resume: true });
      if (e.target.closest("#place-start") || e.target.closest('[data-quiz-mode="place"]')) {
        /* place se despacha en startQuiz de app.js */
      }
      if (e.target.closest("#place-apply")) {
        const lv = e.target.closest("#place-apply").dataset.cefr;
        if (lv && typeof setCefr === "function") setCefr(lv);
      }
      if (e.target.closest("#journal-anki")) exportAnki();
      if (e.target.closest("#journal-coach-plan")) {
        const mode = e.target.closest("#journal-coach-plan")?.dataset.coachPlanMode
          || (typeof journalCoachPlanMode === "function" ? journalCoachPlanMode() : null);
        if (typeof startCoachPlanQuiz === "function") startCoachPlanQuiz(mode);
      }
      if (e.target.closest("#journal-csv")) exportWeakCsv();
      if (e.target.closest("#perf-friction-csv")) exportFrictionCsv();
      if (e.target.closest("#week-sheet-print")) printWeekSheet();
      if (e.target.closest("#journal-print-now")) printJournalNow();
      if (e.target.closest(".journal-search-row [data-journal-clear]")) {
        try { sessionStorage.removeItem("enlab-journal-focus"); } catch { /* ignore */ }
        renderErrorJournal();
      }
      const modeChip = e.target.closest("[data-journal-mode]");
      if (modeChip) {
        const m = modeChip.dataset.journalMode;
        try { sessionStorage.setItem("enlab-journal-focus", m || ""); } catch { /* ignore */ }
        renderErrorJournal();
      }
      if (e.target.closest("#student-pdf")) printStudentPdf();
      const pick = e.target.closest("[data-role-pick-b]");
      if (pick && window._roleplay) {
        const line = pick.dataset.rolePickB;
        const turn = window._roleplay.scene.turns[window._roleplay.i];
        if (turn) turn.b = line;
        window._speakTarget = { target: line, help: typeof t === "function" ? t("roleRecHelp") : "" };
        pick.parentElement.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c === pick));
      }
    });
  }

  function bootstrap() {
    if (window._plusBootstrapped) return;
    window._plusBootstrapped = true;
    patchSpeak();
    patchQuiz();
    patchRecording();
    patchVerdict();
    patchRoleplay();
    patchShadow();
    patchStreak();
    patchFilters();
    patchWeekA11y();
    liveRegions();
    bindPlus();
    /* journal search + sort — live filter */
    document.addEventListener("input", (e) => {
      if (e.target.id === "journal-search") {
        try { sessionStorage.setItem("enlab-journal-focus", e.target.value || ""); } catch { /* ignore */ }
        clearTimeout(window._journalSearchTimer);
        window._journalSearchTimer = setTimeout(() => renderErrorJournal(), 200);
      }
    });
    document.addEventListener("change", (e) => {
      if (e.target.id === "journal-sort") {
        try { sessionStorage.setItem("enlab-journal-sort", e.target.value || "date"); } catch { /* ignore */ }
        renderErrorJournal();
      }
    });
    renderErrorJournal();
    renderPlaceToday();
    renderPerfHint();
    window.addEventListener("enlab-packs-ready", () => renderPerfHint());
    if (typeof onTabPaint === "function") {
      onTabPaint((id) => {
        if (id === "ia") { renderErrorJournal(); renderPerfHint(); }
        if (id === "quiz") {
          renderPlaceQuizResume();
          if (typeof renderWeeklyQuizResume === "function") renderWeeklyQuizResume();
        }
        if (id === "hoy") { renderChart90(); renderPlaceToday(); autoClassTask(); }
        liveRegions();
      });
    }
    if (typeof onHomePaint === "function") onHomePaint(() => {
      renderChart90();
      renderPlaceToday();
    });
    setTimeout(autoClassTask, 800);
  }

  window.PLUS = {
    bootstrap,
    logError,
    logPlanStepEvent,
    startPlacement,
    makePlacementItems,
    loadPlaceNow,
    persistPlaceNow,
    clearPlaceNow,
    renderPlaceToday,
    renderPlaceQuizResume,
    exportAnki,
    exportWeakCsv,
    exportFrictionCsv,
    printWeekSheet,
    printStudentPdf,
    renderErrorJournal,
    renderChart90,
    autoClassTask,
    renderPerfHint,
    runPhraseShadow,
    scoreToCefr,
  };

  if (!window.ENLAB_LOADER) bootstrap();
})();
