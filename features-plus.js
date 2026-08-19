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

  function startPlacement() {
    if (typeof stopRecording === "function" && recState?.rec?.state === "recording") stopRecording(false);
    quiz = { i: 0, score: 0, items: makePlacementItems(), fails: [], mode: "place", host: "#quiz-box" };
    if (typeof showTab === "function") showTab("quiz");
    if (typeof openQuizRoom === "function") openQuizRoom("place");
    if (typeof renderQuiz === "function") renderQuiz();
  }

  function renderErrorJournal() {
    const host = document.querySelector("#error-journal");
    if (!host) return;
    const rows = loadErrors().slice(0, 12);
    host.innerHTML = `
      <p class="kicker">${esc(tt("journalTitle"))}</p>
      <p class="muted">${esc(tt("journalHint"))}</p>
      <div class="row">
        <button type="button" class="btn ghost sm" id="journal-anki">${esc(tt("exportAnki"))}</button>
        <button type="button" class="btn ghost sm" id="journal-csv">${esc(tt("exportWeakCsv"))}</button>
        <button type="button" class="btn ghost sm" id="week-sheet-print">${esc(tt("weekSheetPrint"))}</button>
      </div>
      ${rows.length
        ? rows.map((r) => `
          <div class="card journal-card">
            <p><strong>${esc(r.expected || r.prompt)}</strong></p>
            ${r.said ? `<p class="muted">${esc(tt("journalSaid"))}: ${esc(r.said)}</p>` : ""}
            <p class="muted">${esc(r.why || whyFor(r.expected))}</p>
            ${r.f1 ? `<p class="muted">${esc(tt("journalFormants", { f1: r.f1, f2: r.f2 || "?" }))}</p>` : ""}
            ${r.expected ? `<button type="button" class="chip say" data-say="${esc(r.expected)}">▶</button>` : ""}
          </div>`).join("")
        : `<p class="muted">${esc(tt("journalEmpty"))}</p>`}`;
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
    const errs = loadErrors();
    const weak = typeof weakSet === "function" ? [...weakSet()] : [];
    const srs = typeof srsDueList === "function" ? srsDueList(40) : [];
    const lines = ["#separator:tab", "#html:true"];
    errs.forEach((r) => {
      const front = r.prompt || r.said || "Fix this";
      const back = `${r.expected}<br><small>${r.why || ""}</small>`;
      lines.push(`${front.replace(/\t/g, " ")}\t${back.replace(/\t/g, " ")}`);
    });
    weak.forEach((v) => lines.push(`${v}\t${v} — irregular / weak in English Lab`));
    srs.forEach((x) => lines.push(`${(x.label || x.key || "").replace(/\t/g, " ")}\tSRS due`));
    downloadText("englishlab-anki.txt", lines.join("\n"), "text/plain");
  }

  function exportWeakCsv() {
    const rows = [["kind", "item", "note"]];
    (typeof weakSet === "function" ? [...weakSet()] : []).forEach((v) => rows.push(["verb", v, "weak"]));
    (typeof speakWeakSet === "function" ? [...speakWeakSet()] : []).forEach((v) => rows.push(["speak", v, "not understood"]));
    (typeof earWeakSet === "function" ? [...earWeakSet()] : []).forEach((v) => rows.push(["ear", v, "minimal pair"]));
    loadErrors().forEach((r) => rows.push(["error", r.expected || r.prompt, r.why || ""]));
    (typeof srsDueList === "function" ? srsDueList(50) : []).forEach((x) => rows.push(["srs", x.label || "", x.due || ""]));
    const csv = rows.map((r) => r.map((c) => `"${ankiEscape(c)}"`).join(",")).join("\n");
    downloadText("englishlab-weak.csv", csv, "text/csv");
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
    area.innerHTML = `
      <h1>English Lab — ${esc(tt("studentReport"))}</h1>
      <p><strong>${esc(name)}</strong> · ${esc(lvl)} · ${typeof todayKey === "function" ? todayKey() : ""}</p>
      <ul>
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
    const today = typeof todayKey === "function" ? todayKey() : "";
    if (localStorage.getItem("enlab-class-task-auto") === today) return;
    if (localStorage.getItem("enlab-onboard-v3") !== "1" && localStorage.getItem("enlab-welcome-v2") !== "1") return;
    const banner = document.querySelector("#class-task-banner");
    if (!banner || banner.hidden) return;
    localStorage.setItem("enlab-class-task-auto", today);
    banner.classList.add("class-task-must");
    banner.scrollIntoView({ block: "nearest" });
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
    host.innerHTML = lines.join("");
  }

  function bindPlus() {
    document.addEventListener("click", (e) => {
      if (e.target.closest("#place-start") || e.target.closest('[data-quiz-mode="place"]')) {
        /* place se despacha en startQuiz de app.js */
      }
      if (e.target.closest("#place-apply")) {
        const lv = e.target.closest("#place-apply").dataset.cefr;
        if (lv && typeof setCefr === "function") setCefr(lv);
      }
      if (e.target.closest("#journal-anki")) exportAnki();
      if (e.target.closest("#journal-csv")) exportWeakCsv();
      if (e.target.closest("#week-sheet-print")) printWeekSheet();
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
    renderErrorJournal();
    renderPerfHint();
    window.addEventListener("enlab-packs-ready", () => renderPerfHint());
    if (typeof onTabPaint === "function") {
      onTabPaint((id) => {
        if (id === "ia") { renderErrorJournal(); renderPerfHint(); }
        if (id === "hoy") renderChart90();
        liveRegions();
      });
    }
    if (typeof onHomePaint === "function") onHomePaint(() => renderChart90());
    setTimeout(autoClassTask, 800);
  }

  window.PLUS = {
    bootstrap,
    logError,
    startPlacement,
    makePlacementItems,
    exportAnki,
    exportWeakCsv,
    printWeekSheet,
    printStudentPdf,
    renderErrorJournal,
    renderChart90,
    runPhraseShadow,
    scoreToCefr,
  };

  if (!window.ENLAB_LOADER) bootstrap();
})();
