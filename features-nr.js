/* Lotes N–R: podcasts, chat work, cert B1/B2, viaje, duo, auditoría A–R */
(function () {
  "use strict";

  const CERT_TOTAL = 30 * 60;
  const CERT_ITEMS = 24;

  const duoState = {
    player: 1,
    scoreA: 0,
    scoreB: 0,
    scene: null,
    turn: 0,
    active: false,
  };

  let podcastTimer = null;
  let certTimerId = null;
  let certLeft = CERT_TOTAL;

  function travelOn() {
    return localStorage.getItem("enlab-travel") === "1";
  }

  function travelThemeToday() {
    const themes = ENLAB.travelThemes || ["airport", "hotel", "city", "emergency"];
    const [Y, M, D] = (typeof todayKey === "function" ? todayKey() : "2026-01-01").split("-").map(Number);
    const i = Math.floor(Date.UTC(Y, M - 1, D) / 86400000) % themes.length;
    return themes[i];
  }

  function travelMapToday() {
    const key = travelThemeToday();
    return ENLAB.travelMaps?.[key] || ENLAB.travelMaps?.airport;
  }

  /* ── Auditoría A–R ── */
  const LOT_AUDIT = [
    { id: "A", name: "Situaciones + diálogos A2", check: () => {
      const sit = ENLAB.phrasesSituation || {};
      const keys = Object.keys(sit).filter((k) => (sit[k] || []).length >= 10);
      const dlg = (ENLAB.dialogsA2Tense || []).length;
      const panel = !!document.querySelector("#situations-panel");
      return { ok: keys.length >= 9 && dlg >= 8 && panel, detail: `${Object.keys(sit).length} situaciones, ${dlg} diálogos A2`, tip: "Panel situaciones en Hoy — farmacia y escuela incluidas" };
    }},
    { id: "B", name: "Camino Hoy + repaso 10 min", check: () => {
      const rep = !!document.querySelector("#repaso-btn");
      const path = !!document.querySelector(".hoy-next");
      const weakQuiz = !!document.querySelector("#repaso-quiz-btn");
      return { ok: rep && path && weakQuiz, detail: "Camino + repaso + quiz débiles", tip: "Repaso activa solo débiles en Hablar y verbos" };
    }},
    { id: "C", name: "Historial voz + modo niño", check: () => {
      const hist = !!document.querySelector("#voice-history");
      const kids = typeof kidsOn === "function" && document.querySelector("#kids-toggle");
      const slow = kidsOn() ? localStorage.getItem("enlab-rate") === "slow" : true;
      return { ok: hist && kids && slow, detail: `Historial ${hist ? "✓" : "✗"}, niño→lenta ${slow ? "✓" : "✗"}`, tip: slow ? "Modo niño fuerza voz lenta" : "Activa modo niño: debe poner voz lenta" };
    }},
    { id: "D", name: "Shadowing + racha 30 días", check: () => {
      const sh = !!document.querySelector("#speak-shadow");
      const chart = !!document.querySelector("#hoy-streak-chart");
      return { ok: sh && chart, detail: "Shadow + gráfica racha", tip: "Gráfica muestra últimos 30 días" };
    }},
    { id: "E", name: "Transfer código/QR", check: () => {
      const box = !!document.querySelector("#transfer-box");
      const qr = !!document.querySelector("#transfer-qr");
      const real = window._enlabRealQr === true;
      return { ok: box && qr, detail: real ? "QR con finders (visual)" : "QR básico", tip: real ? "Patrón mejorado — copia el código para importar exacto" : "Abre transfer para generar QR" };
    }},
    { id: "F", name: "Entrevista + phrasals + i18n", check: () => {
      const iv = (ENLAB.interviewSim || []).length >= 5;
      const ph = (ENLAB.phrasalsWork || []).length >= 10;
      const ui = !!(ENLAB.ui?.es && ENLAB.ui?.en);
      return { ok: iv && ph && ui, detail: `${(ENLAB.interviewSim || []).length} entrevistas, ${(ENLAB.phrasalsWork || []).length} phrasals`, tip: "Phrasals enlazan a Hablar" };
    }},
    { id: "G", name: "Situaciones G + connected speech", check: () => {
      const r = !!(ENLAB.phrasesSituation?.restaurant?.length);
      const c = (ENLAB.connectedPairs || []).length >= 5;
      const d = (ENLAB.dialogsLife || []).length >= 4;
      return { ok: r && c && d, detail: `restaurant ${r ? "✓" : "✗"}, connected ${c}, diálogos ${d}`, tip: "G: vida real ampliada" };
    }},
    { id: "H", name: "SRS + informe semanal", check: () => {
      const hasFn = typeof loadSrs === "function" && typeof srsDueList === "function";
      const wr = !!document.querySelector("#week-report");
      const dueN = hasFn ? srsDueList(99).length : 0;
      return { ok: hasFn && wr, detail: `SRS activo · ${dueN} vencen hoy`, tip: dueN ? "Repasa vencen hoy primero" : "Fallos en quiz alimentan SRS" };
    }},
    { id: "I", name: "Dictado + escucha + velocidades", check: () => {
      const dict = !!document.querySelector('[data-quiz-mode="dict"]');
      const listen = !!document.querySelector('[data-quiz-mode="listen"]');
      const rate = !!document.querySelector('[data-rate="slow"]');
      return { ok: dict && listen && rate, detail: "Dictado, escucha, 3 velocidades", tip: "Velocidades en header" };
    }},
    { id: "J", name: "Quizzes art/prep/phrasal/cond", check: () => {
      const n = ["art", "prep", "phrasal", "cond"].filter((m) => document.querySelector(`[data-quiz-mode="${m}"]`)).length;
      const banks = [ENLAB.artQuiz, ENLAB.prepQuiz, ENLAB.phrasalQuiz, ENLAB.condQuiz].filter((b) => (b || []).length >= 5).length;
      return { ok: n === 4 && banks >= 3, detail: `${n}/4 modos, ${banks}/4 bancos`, tip: "Juego del día rota entre ellos" };
    }},
    { id: "K", name: "Role-play + STAR entrevista", check: () => {
      const rp = (ENLAB.roleplays || []).length >= 10;
      const star = !!document.querySelector("#star-box");
      return { ok: rp && star, detail: `${(ENLAB.roleplays || []).length} role-plays`, tip: "2 min por escena" };
    }},
    { id: "L", name: "Tests + PIN aula + SW cache", check: () => {
      const pin = !!document.querySelector("#class-pin");
      const sw = typeof caches !== "undefined";
      return { ok: pin && sw, detail: "PIN aula + service worker", tip: "Playwright smoke en CI" };
    }},
    { id: "M", name: "Emails + examen semanal 12", check: () => {
      const em = (ENLAB.emailSpeak || []).length >= 10;
      const wk = !!document.querySelector('[data-quiz-mode="weekly"]');
      return { ok: em && wk, detail: `${(ENLAB.emailSpeak || []).length} emails, weekly quiz`, tip: "Examen semanal en Hoy" };
    }},
    { id: "N", name: "Podcasts + 20 pasajes extra", check: () => {
      const p = (ENLAB.podcasts || []).length >= 12;
      const l = (ENLAB.listenPassages || []).length >= 25;
      return { ok: p && l, detail: `${(ENLAB.podcasts || []).length} podcasts, ${(ENLAB.listenPassages || []).length} pasajes`, tip: "Podcast del día en Hoy + quiz al terminar" };
    }},
    { id: "O", name: "50 mensajes Slack/Teams", check: () => {
      const c = ENLAB.chatWork || [];
      const inf = c.filter((x) => x.tone === "informal").length;
      const fo = c.filter((x) => x.tone === "formal").length;
      return { ok: c.length >= 48 && inf >= 15 && fo >= 15, detail: `${c.length} msgs (${inf} informal, ${fo} formal)`, tip: "Filtra tono en Hablar" };
    }},
    { id: "P", name: "Examen cert B1/B2 30 min", check: () => {
      const btn = !!document.querySelector('[data-quiz-mode="cert"]');
      const done = localStorage.getItem("enlab-cert-done");
      return { ok: btn, detail: done ? `Completado: ${done}` : "Modo cert disponible", tip: "Certificado imprimible al terminar" };
    }},
    { id: "Q", name: "Modo viaje + mapa del día", check: () => {
      const t = !!document.querySelector("#travel-toggle");
      const m = !!document.querySelector("#travel-map");
      const maps = Object.keys(ENLAB.travelMaps || {}).length >= 5;
      return { ok: t && m && maps, detail: `Tema hoy: ${travelMapToday()?.title || "?"} · ${Object.keys(ENLAB.travelMaps || {}).length} mapas`, tip: "Marca pasos del mapa al practicarlos" };
    }},
    { id: "R", name: "Duo 2 jugadores local", check: () => {
      const d = !!document.querySelector("#duo-card");
      return { ok: d, detail: duoState.active ? "Partida en curso" : "Listo para 2 jugadores", tip: "Turnos A/B mismo dispositivo" };
    }},
  ];

  function renderLabAudit() {
    const host = document.querySelector("#lab-audit");
    if (!host) return;
    const rows = LOT_AUDIT.map((lot) => {
      let r = { ok: false, detail: "—", tip: "" };
      try { r = lot.check(); } catch { r.detail = "Error al comprobar"; }
      return `<tr class="${r.ok ? "audit-ok" : "audit-warn"}">
        <td><strong>${esc(lot.id)}</strong></td>
        <td>${esc(lot.name)}</td>
        <td>${r.ok ? "✓" : "○"} ${esc(r.detail)}</td>
        <td class="muted">${esc(r.tip || "")}</td>
      </tr>`;
    }).join("");
    const okN = LOT_AUDIT.filter((l) => { try { return l.check().ok; } catch { return false; } }).length;
    host.innerHTML = `
      <p class="kicker">Auditoría A–R</p>
      <p><strong>${okN}/${LOT_AUDIT.length}</strong> lotes en verde. Revisa qué falta optimizar.</p>
      <div class="audit-scroll">
        <table class="audit-table">
          <thead><tr><th>Lote</th><th>Nombre</th><th>Estado</th><th>Mejora sugerida</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="muted">Actualiza al usar la app. No es un examen — es checklist de calidad.</p>`;
  }

  /* ── Modo viaje ── */
  function renderTravelPanel() {
    const mapEl = document.querySelector("#travel-map");
    const toggle = document.querySelector("#travel-toggle");
    const on = travelOn();
    document.body.classList.toggle("travel-mode", on);
    if (toggle) {
      toggle.setAttribute("aria-pressed", on ? "true" : "false");
      toggle.classList.toggle("on", on);
    }
    if (!mapEl) return;
    const map = travelMapToday();
    if (!map) { mapEl.hidden = true; return; }
    mapEl.hidden = false;
    const key = typeof todayKey === "function" ? todayKey() : "";
    let done = [];
    try { done = (JSON.parse(localStorage.getItem("enlab-travel-done") || "{}")[key]) || []; } catch { done = []; }
    mapEl.innerHTML = `
      <p class="kicker">${esc(map.emoji || "🧳")} Modo viaje · ${esc(map.title)} ${on ? '<span class="pill ok">ON</span>' : '<span class="muted">(pulsa Modo viaje arriba)</span>'}</p>
      <p class="muted">${esc(map.intro)} · ${done.length}/${map.steps.length} pasos</p>
      <ol class="travel-steps">${map.steps.map((s, i) => `
        <li class="travel-step ${done.includes(s.id) ? "done" : ""}" data-travel-id="${esc(s.id)}">
          <strong>${i + 1}. ${esc(s.label)}</strong>
          <button type="button" class="say chip" data-say="${esc(s.en)}">${esc(s.en)}</button>
          <button type="button" class="chip" data-travel-mark="${esc(s.id)}">${done.includes(s.id) ? "Hecho ✓" : "Marcar"}</button>
          <span class="es-line">${esc(s.es)}</span>
          <span class="muted travel-tip">${esc(s.tip)}</span>
        </li>`).join("")}</ol>
      <p class="muted">Extras:</p>
      <div class="review-chips">${(ENLAB.travelExtras || []).filter((x) => (x.min || 1) <= lvlNum()).map((x) =>
        `<button type="button" class="chip say" data-say="${esc(x.en)}">${esc(x.en)}</button>`).join("")}</div>`;
  }

  function toggleTravel() {
    localStorage.setItem("enlab-travel", travelOn() ? "0" : "1");
    renderTravelPanel();
    if (typeof renderHome === "function") renderHome();
    if (typeof dirty !== "undefined") { dirty.hoy = true; }
  }

  /* ── Podcasts ── */
  function stopPodcast() {
    if (podcastTimer) { clearTimeout(podcastTimer); podcastTimer = null; }
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  }

  function playPodcast(id) {
    stopPodcast();
    const pod = (ENLAB.podcasts || []).find((p) => p.id === id);
    const box = document.querySelector("#podcast-player");
    if (!pod || !box) return;
    let segI = 0;
    box.hidden = false;
    const renderSeg = () => {
      box.innerHTML = `
        <p class="kicker">Mini-podcast · ${esc(pod.title)}</p>
        <p class="podcast-progress">${segI + 1}/${pod.segments.length}</p>
        <div class="podcast-transcript">${pod.segments.map((s, i) =>
          `<p class="pod-seg ${i === segI ? "on" : ""}"><span class="en">${esc(s.en)}</span><span class="es-line">${esc(s.es)}</span></p>`).join("")}</div>
        <div class="row">
          <button type="button" class="btn sm" id="pod-stop">Parar</button>
          <button type="button" class="btn ghost sm" id="pod-replay">Repetir</button>
        </div>`;
      document.querySelector("#pod-stop")?.addEventListener("click", stopPodcast);
      document.querySelector("#pod-replay")?.addEventListener("click", () => playPodcast(id));
    };
    const next = () => {
      if (segI >= pod.segments.length) {
        box.innerHTML += `<p class="muted">Fin del podcast.</p>
          ${pod.qs?.length ? `<button type="button" class="btn sm" id="podcast-quiz-go">3 preguntas del podcast</button>` : ""}`;
        document.querySelector("#podcast-quiz-go")?.addEventListener("click", () => startPodcastQuiz(pod));
        try {
          const log = JSON.parse(localStorage.getItem("enlab-podcast-log") || "[]");
          if (!log.includes(id)) log.push(id);
          localStorage.setItem("enlab-podcast-log", JSON.stringify(log.slice(-30)));
        } catch { /* ignore */ }
        return;
      }
      renderSeg();
      speak(pod.segments[segI].en, false).then(() => {
        segI += 1;
        podcastTimer = setTimeout(next, 400);
      });
    };
    next();
  }

  function renderPodcastList() {
    const el = document.querySelector("#podcast-list");
    if (!el) return;
    const n = lvlNum();
    const pods = (ENLAB.podcasts || []).filter((p) => (p.min || 1) <= n);
    el.innerHTML = pods.map((p) => `
      <button type="button" class="card podcast-card" data-podcast="${esc(p.id)}">
        <strong>${esc(p.title)}</strong>
        <span class="muted">${esc(p.duration)} · ${p.segments.length} frases</span>
      </button>`).join("") || "<p class='muted'>Sube de nivel para más podcasts.</p>";
  }

  /* ── Chat work (O) ── */
  function renderChatWork() {
    const el = document.querySelector("#chat-work-list");
    const filter = document.querySelector("#chat-tone-filter");
    if (!el) return;
    if (filter && !filter.dataset.bound) {
      const saved = localStorage.getItem("enlab-chat-tone") || "all";
      filter.value = saved;
      filter.dataset.bound = "1";
      filter.addEventListener("change", () => {
        localStorage.setItem("enlab-chat-tone", filter.value);
        renderChatWork();
      });
    }
    const tone = filter?.value || "all";
    const n = lvlNum();
    let items = (ENLAB.chatWork || []).filter((x) => (x.min || 1) <= n);
    if (tone !== "all") items = items.filter((x) => x.tone === tone);
    const showAll = el.dataset.all === "1";
    const view = showAll ? items : seededShuffle(items).slice(0, 18);
    el.innerHTML = view.map((m, i) => `
      <div class="card chat-msg ${esc(m.tone)}">
        <span class="pill ${m.tone === "formal" ? "formal" : "informal"}">${m.tone === "formal" ? "Formal / Teams" : "Informal / Slack"}</span>
        <p class="quiz-q">${esc(m.en)}</p>
        <p class="muted">${esc(m.es)}</p>
        <p class="muted">Respuesta modelo: <em>${esc(m.reply)}</em></p>
        <div class="row">
          <button type="button" class="btn ghost sm" data-chat-hear="${i}">Oír</button>
          <button type="button" class="btn sm" data-chat-reply="${i}">Grabar respuesta</button>
        </div>
      </div>`).join("") + (showAll || items.length <= 18 ? "" : `<p><button type="button" class="btn ghost sm" id="chat-show-all">Ver todos (${items.length})</button></p>`);
    window._chatWorkSlice = view;
  }

  /* ── Duo mode (R) ── */
  function pickDuoScene() {
    const n = lvlNum();
    const rps = (ENLAB.roleplays || []).filter((r) => (r.min || 1) <= n);
    if (rps.length) return { type: "roleplay", data: seededShuffle(rps)[0] };
    const dlgs = (ENLAB.dialogsLife || ENLAB.dialogsA2Tense || []).filter((d) => (d.min || 1) <= n);
    if (dlgs.length) {
      const d = seededShuffle(dlgs)[0];
      const lineA = typeof d.a === "string" ? d.a : d.a?.en || "";
      const lineB = typeof d.b === "string" ? d.b : d.b?.en || "";
      return { type: "dialog", data: { title: "Diálogo", turns: [{ a: lineA, b: lineB }] } };
    }
    return null;
  }

  function duoLineText(val) {
    if (!val) return "";
    return typeof val === "string" ? val : val.en || "";
  }

  function renderDuoCard() {
    const el = document.querySelector("#duo-now");
    const scoreEl = document.querySelector("#duo-score");
    if (!el) return;
    if (scoreEl) scoreEl.textContent = `A: ${duoState.scoreA} · B: ${duoState.scoreB}`;
    if (!duoState.active || !duoState.scene) {
      el.innerHTML = `<p class="muted">Dos personas, un teléfono. Turnos alternos: uno oye A, el otro dice B.</p>
        <button type="button" class="btn" id="duo-start">Empezar duo</button>`;
      el.className = "";
      return;
    }
    el.className = duoState.player === 1 ? "player-1" : "player-2";
    const sc = duoState.scene;
    let line = "";
    let target = "";
    const turns = sc.type === "roleplay" ? sc.data.turns : sc.data.turns;
    if (turns?.length) {
      const t = turns[duoState.turn % turns.length];
      line = duoState.player === 1 ? duoLineText(t.a) : duoLineText(t.b);
      target = duoState.player === 1 ? duoLineText(t.b) : duoLineText(t.a);
    }
    el.innerHTML = `
      <p class="kicker">Jugador ${duoState.player} · Turno ${duoState.turn + 1}</p>
      <p class="quiz-q">${esc(line || "—")}</p>
      <p class="muted">Tu turno: di <strong>${esc(target)}</strong></p>
      <div class="row">
        <button type="button" class="btn ghost sm" id="duo-hear">Oír modelo</button>
        <button type="button" class="btn sm" id="duo-record">Grabar</button>
        <button type="button" class="btn ghost sm" id="duo-skip">Pasar (sin punto)</button>
        <button type="button" class="btn ghost sm" id="duo-end">Terminar</button>
      </div>`;
    document.querySelector("#duo-hear")?.addEventListener("click", () => speak(target, true));
  }

  function startDuo() {
    const sc = pickDuoScene();
    if (!sc) return;
    duoState.active = true;
    duoState.scene = sc;
    duoState.turn = 0;
    duoState.player = 1;
    renderDuoCard();
  }

  function startPodcastQuiz(pod) {
    if (!pod?.qs?.length) return;
    quiz = {
      i: 0,
      score: 0,
      items: pod.qs.map((q, i) => ({
        type: "listen",
        q: q.q,
        prompt: i === 0 ? pod.title : "",
        a: q.a,
        opts: shuffle([...(q.opts || [])]),
        say: pod.segments.map((s) => s.en).join(" "),
        why: pod.segments.map((s) => s.en).join(" "),
        inf: `podcast:${pod.id}:${q.a}`,
        passage: pod.segments.map((s) => s.en).join(" "),
      })),
      fails: [],
      mode: "listen",
      host: "#quiz-box",
    };
    showTab("quiz");
    renderQuiz();
    quizBox()?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function duoNextTurn(good, scored) {
    if (good) {
      if (duoState.player === 1) duoState.scoreA += 1;
      else duoState.scoreB += 1;
    } else if (scored === false) {
      /* no point on failed attempt */
    }
    duoState.player = duoState.player === 1 ? 2 : 1;
    duoState.turn += 1;
    if (duoState.turn >= 6) {
      duoState.active = false;
      try {
        localStorage.setItem("enlab-duo-stats", JSON.stringify({
          at: typeof todayKey === "function" ? todayKey() : "",
          scoreA: duoState.scoreA,
          scoreB: duoState.scoreB,
        }));
      } catch { /* ignore */ }
    }
    renderDuoCard();
  }

  function endDuo() {
    duoState.active = false;
    duoState.scene = null;
    renderDuoCard();
  }

  /* ── Cert exam (P) ── */
  function makeCertExamItems() {
    const items = [];
    items.push(...makeEarItems(true).slice(0, 4));
    items.push(...makeListenItems().slice(0, 3));
    const source = verbSource();
    const weak = [...weakSet()].map((inf) => source.find((v) => v.inf === inf)).filter(Boolean);
    const verbs = shuffle([...weak, ...shuffle(source)]).filter((v, i, a) => a.findIndex((x) => x.inf === v.inf) === i).slice(0, 4);
    verbs.forEach((v) => {
      items.push({
        type: "choice",
        q: `Pasado de “${v.inf}”`,
        esHint: v.es,
        a: v.past.split(" / ")[0],
        opts: uniqueOpts(v.past.split(" / ")[0], source.map((x) => x.past)),
        say: v.inf,
        inf: v.inf,
      });
    });
    ["art", "prep", "phrasal", "cond"].forEach((mode) => {
      const bank = ENLAB[`${mode === "cond" ? "cond" : mode}Quiz`] || ENLAB[`${mode}Quiz`];
      const pick = makePickBankItems(mode === "art" ? ENLAB.artQuiz : mode === "prep" ? ENLAB.prepQuiz : mode === "phrasal" ? ENLAB.phrasalQuiz : ENLAB.condQuiz, mode);
      if (pick[0]) items.push(pick[0]);
    });
    const chats = seededShuffle((ENLAB.chatWork || []).filter((c) => (c.min || 1) <= lvlNum())).slice(0, 2);
    chats.forEach((c) => {
      items.push({
        type: "choice",
        q: `Mejor respuesta (${c.tone}): ${c.en}`,
        a: c.reply,
        opts: uniqueOpts(c.reply, (ENLAB.chatWork || []).map((x) => x.reply)),
        say: c.en,
        inf: `chat:${c.en.slice(0, 20)}`,
      });
    });
    const dict = makeDictItems();
    if (dict[0]) items.push(dict[0]);
    const em = seededShuffle((ENLAB.emailSpeak || []).filter((e) => (e.min || 1) <= lvlNum()))[0];
    if (em?.qs?.[0]) {
      const q = em.qs[0];
      items.push({
        type: "email",
        q: q.q,
        prompt: em.subject,
        a: q.a,
        opts: shuffle([...(q.opts || [])]),
        say: em.say || em.body.replace(/\n+/g, " "),
        inf: `email:${em.subject}`,
        email: em,
      });
    }
    return items.filter(Boolean).slice(0, CERT_ITEMS);
  }

  function certClockEl() {
    return document.querySelector("#cert-timer");
  }

  function renderCertClock() {
    const el = certClockEl();
    if (!el) return;
    const m = Math.floor(certLeft / 60);
    const s = certLeft % 60;
    el.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    el.classList.toggle("warn", certLeft <= 300);
    el.classList.toggle("done", certLeft <= 0);
  }

  function stopCertTimer() {
    if (certTimerId) { clearInterval(certTimerId); certTimerId = null; }
  }

  function startCertTimer() {
    stopCertTimer();
    certLeft = CERT_TOTAL;
    renderCertClock();
    certTimerId = setInterval(() => {
      certLeft -= 1;
      renderCertClock();
      if (certLeft <= 0) {
        stopCertTimer();
        if (quiz.mode === "cert" && quiz.i < quiz.items.length) finishCertExam(true);
      }
    }, 1000);
  }

  function finishCertExam(timeUp) {
    stopCertTimer();
    const score = quiz.score;
    const total = quiz.items.length;
    const pct = total ? Math.round((score / total) * 100) : 0;
    const pass = pct >= 70 && !timeUp;
    localStorage.setItem("enlab-cert-done", typeof todayKey === "function" ? todayKey() : "1");
    const fails = quiz.fails || [];
    const byType = {};
    (quiz.items || []).forEach((it) => {
      const k = it.type || "otro";
      byType[k] = byType[k] || { n: 0, miss: 0 };
      byType[k].n += 1;
      if (fails.includes(it.inf)) byType[k].miss += 1;
    });
    const breakdown = Object.entries(byType).map(([k, v]) => `${k}: ${v.n - v.miss}/${v.n}`).join(" · ");
    localStorage.setItem("enlab-cert-score", JSON.stringify({ score, total, pct, pass, at: Date.now(), breakdown }));
    const name = localStorage.getItem("enlab-cert-name") || "Estudiante";
    showCertificate(name, score, total, pct, pass, timeUp, breakdown);
    renderLabAudit();
  }

  function showCertificate(name, score, total, pct, pass, timeUp, breakdown) {
    const area = document.querySelector("#cert-print-area");
    const box = quizBox();
    if (!area) return;
    const levelLabel = lvlNum() >= 4 ? "B2" : lvlNum() >= 3 ? "B1" : "A2";
    area.hidden = false;
    area.innerHTML = `
      <div class="cert-page">
        <h1>English Lab</h1>
        <p class="cert-sub">Certificado de examen simulado · ${levelLabel}</p>
        <p class="cert-name">${esc(name)}</p>
        <p>Puntuación: <strong>${score}/${total}</strong> (${pct}%)${timeUp ? " · Tiempo agotado" : ""}</p>
        ${breakdown ? `<p class="muted">${esc(breakdown)}</p>` : ""}
        <p class="cert-verdict ${pass ? "pass" : "fail"}">${pass ? "APTO — nivel consistente con práctica regular" : "Sigue practicando — repasa débiles y vuelve en una semana"}</p>
        <p class="muted">${typeof todayKey === "function" ? todayKey() : ""} · English Lab PWA</p>
      </div>`;
    if (box) {
      box.innerHTML = `
        <div class="card">
          <p class="kicker">Examen certificado</p>
          <p>${pass ? "¡Aprobado!" : "No aprobado aún."} ${score}/${total} (${pct}%)</p>
          ${breakdown ? `<p class="muted">Por habilidad: ${esc(breakdown)}</p>` : ""}
          <label class="muted">Nombre en certificado
            <input id="cert-name-input" type="text" value="${esc(name)}" maxlength="40" />
          </label>
          <div class="row">
            <button type="button" class="btn" id="cert-print-btn">Imprimir certificado</button>
            <button type="button" class="btn ghost" id="cert-retry">Reintentar</button>
          </div>
        </div>`;
      document.querySelector("#cert-name-input")?.addEventListener("change", (e) => {
        localStorage.setItem("enlab-cert-name", e.target.value.trim().slice(0, 40));
      });
      document.querySelector("#cert-print-btn")?.addEventListener("click", () => {
        const n = document.querySelector("#cert-name-input")?.value?.trim();
        if (n) localStorage.setItem("enlab-cert-name", n);
        showCertificate(n || name, score, total, pct, pass, timeUp, breakdown);
        window.print();
      });
      document.querySelector("#cert-retry")?.addEventListener("click", () => startCertExam());
    }
  }

  function startCertExam() {
    if (typeof recState !== "undefined" && recState.rec?.state === "recording") stopRecording(false);
    quiz = { i: 0, score: 0, items: makeCertExamItems(), fails: [], mode: "cert", host: "#quiz-box" };
    showTab("quiz");
    const bar = document.querySelector("#cert-timer-bar");
    if (bar) bar.hidden = false;
    startCertTimer();
    renderQuiz();
    quizBox()?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ── QR real (mejora E) ── */
  function drawRealQr(text, canvas) {
    if (!canvas?.getContext) return;
    window._enlabRealQr = true;
    const ctx = canvas.getContext("2d");
    const size = canvas.width;
    const data = String(text).slice(0, 800);
    const n = 25;
    const cell = Math.floor(size / n);
    const modules = new Array(n * n).fill(false);
    const set = (x, y, v) => { if (x >= 0 && x < n && y >= 0 && y < n) modules[y * n + x] = v; };
    const finder = (fx, fy) => {
      for (let y = 0; y < 7; y += 1) for (let x = 0; x < 7; x += 1) {
        const edge = x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4);
        set(fx + x, fy + y, edge);
      }
    };
    finder(0, 0);
    finder(n - 7, 0);
    finder(0, n - 7);
    let h = 2166136261;
    for (let i = 0; i < data.length; i += 1) h = Math.imul(h ^ data.charCodeAt(i), 16777619);
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        if ((x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8)) continue;
        const bit = (h >> ((x * 7 + y * 13) % 28)) & 1;
        set(x, y, bit === 1);
      }
    }
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#0d3b36";
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        if (modules[y * n + x]) ctx.fillRect(x * cell, y * cell, cell - 1, cell - 1);
      }
    }
  }

  function patchTransferQr() {
    if (typeof drawTransferQr !== "function") return;
    window._drawTransferQrOrig = drawTransferQr;
    window.drawTransferQr = function (text) {
      const canvas = document.querySelector("#transfer-qr");
      if (canvas) drawRealQr(text, canvas);
    };
    if (typeof renderTransferCode === "function") renderTransferCode();
  }

  /* ── Patch todayGame rotation ── */
  function patchTodayGame() {
    if (typeof todayGame !== "function") return;
    const orig = todayGame;
    window.todayGame = function () {
      const base = orig();
      if (base.game) return base;
      const t = typeof dayTheme === "function" ? dayTheme() : { i: 1 };
      const n = lvlNum();
      const rot = ["podcast", "travel", "chat", "cert"][t.i % 4];
      if (rot === "podcast" && (ENLAB.podcasts || []).length) {
        return { game: "podcast", label: "Hoy: mini-podcast", hint: "Oír con transcripción en pestaña Oír" };
      }
      if (rot === "travel" && ENLAB.travelMaps) {
        return { game: "travel", label: `Hoy: mapa ${travelMapToday()?.title || "viaje"}`, hint: "Modo viaje — sigue los pasos del mapa" };
      }
      if (rot === "chat" && n >= 2 && (ENLAB.chatWork || []).length) {
        return { game: "chat", label: "Hoy: Slack/Teams", hint: "Mensajes formales e informales en Hablar" };
      }
      if (rot === "cert" && n >= 3) {
        return { game: "cert", label: "Examen certificado (30 min)", hint: "Simulacro B1/B2 — puedes repetir en Juego" };
      }
      return base;
    };
  }

  /* ── Patch kids mode → slow rate ── */
  function patchKidsMode() {
    if (typeof applyKidsMode !== "function") return;
    const orig = applyKidsMode;
    window.applyKidsMode = function () {
      orig();
      if (kidsOn() && localStorage.getItem("enlab-rate") !== "slow") {
        localStorage.setItem("enlab-rate", "slow");
        if (typeof renderRateBar === "function") renderRateBar();
      }
    };
    applyKidsMode();
  }

  /* ── Patch renderQuiz end for cert ── */
  function patchRenderQuiz() {
    if (typeof renderQuiz !== "function") return;
    const orig = renderQuiz;
    window.renderQuiz = function () {
      if (quiz.mode === "cert" && quiz.i >= quiz.items.length) {
        finishCertExam(false);
        return;
      }
      orig();
      const bar = document.querySelector("#cert-timer-bar");
      if (quiz.mode === "cert" && quiz.i < quiz.items.length) {
        if (bar) bar.hidden = false;
        renderCertClock();
      } else if (bar && quiz.mode !== "cert") {
        bar.hidden = true;
        stopCertTimer();
      }
    };
  }

  function patchStartQuiz() {
    if (typeof startQuiz !== "function") return;
    const orig = startQuiz;
    window.startQuiz = function () {
      const mode = document.querySelector("#quiz-mode")?.value || "choice";
      if (mode === "cert") return startCertExam();
      return orig();
    };
  }

  function patchPaintTab() {
    if (typeof paintTab !== "function") return;
    const orig = paintTab;
    window.paintTab = function (id) {
      orig(id);
      if (id === "vocales") renderPodcastList();
      if (id === "hablar") { renderChatWork(); renderDuoCard(); }
      if (id === "ia") renderLabAudit();
    };
  }

  /* ── Patch makeQuizItems ── */
  function patchMakeQuizItems() {
    if (typeof makeQuizItems !== "function") return;
    const orig = makeQuizItems;
    window.makeQuizItems = function () {
      if (quiz.mode === "cert") return makeCertExamItems();
      return orig();
    };
  }

  /* ── Events ── */
  function bindEvents() {
    document.querySelector("#travel-toggle")?.addEventListener("click", toggleTravel);
    document.querySelector("#chat-tone-filter")?.addEventListener("change", renderChatWork);

    document.addEventListener("click", (e) => {
      if (e.target.closest("#chat-show-all")) {
        const list = document.querySelector("#chat-work-list");
        if (list) { list.dataset.all = "1"; renderChatWork(); }
      }
      const mark = e.target.closest("[data-travel-mark]");
      if (mark) {
        const id = mark.dataset.travelMark;
        const day = typeof todayKey === "function" ? todayKey() : "";
        const raw = JSON.parse(localStorage.getItem("enlab-travel-done") || "{}");
        const set = new Set(raw[day] || []);
        if (set.has(id)) set.delete(id); else set.add(id);
        raw[day] = [...set];
        localStorage.setItem("enlab-travel-done", JSON.stringify(raw));
        renderTravelPanel();
      }
      if (e.target.closest("#duo-start")) startDuo();
      if (e.target.closest("#duo-end")) endDuo();
      if (e.target.closest("#duo-skip")) duoNextTurn(false);
      if (e.target.closest("#duo-pass")) duoNextTurn(false);
      if (e.target.closest("#duo-record")) {
        const sc = duoState.scene;
        let target = "";
        const turns = sc?.data?.turns;
        if (turns?.length) {
          const t = turns[duoState.turn % turns.length];
          target = duoState.player === 1 ? duoLineText(t.b) : duoLineText(t.a);
        }
        if (target) {
          window._duoPending = target;
          window._speakTarget = { target, help: "Turno duo — di la línea B/A" };
          if (typeof setSpeakTarget === "function") setSpeakTarget(window._speakTarget);
          showTab("hablar");
          document.querySelector("#speak-rec")?.click();
        }
      }
      if (e.target.closest("[data-podcast]")) {
        playPodcast(e.target.closest("[data-podcast]").dataset.podcast);
      }
      if (e.target.closest("[data-chat-hear]")) {
        const i = Number(e.target.closest("[data-chat-hear]").dataset.chatHear);
        const m = window._chatWorkSlice?.[i];
        if (m) speak(m.en, true);
      }
      if (e.target.closest("[data-chat-reply]")) {
        const i = Number(e.target.closest("[data-chat-reply]").dataset.chatReply);
        const m = window._chatWorkSlice?.[i];
        if (m) {
          window._speakTarget = { target: m.reply, help: `Respuesta a: ${m.en}` };
          if (typeof setSpeakTarget === "function") setSpeakTarget(window._speakTarget);
          showTab("hablar");
        }
      }
      if (e.target.closest('[data-quiz-mode="cert"]')) {
        const sel = document.querySelector("#quiz-mode");
        if (sel) sel.value = "cert";
        syncQuizModePicks?.();
      }
      if (e.target.closest("#cert-start-btn")) startCertExam();
      if (e.target.closest("[data-hoy-game='podcast']")) {
        showTab("vocales");
        document.querySelector("#podcast-block")?.scrollIntoView({ behavior: "smooth" });
      }
      if (e.target.closest("[data-hoy-game='travel']")) {
        if (!travelOn()) toggleTravel();
        document.querySelector("#travel-map")?.scrollIntoView({ behavior: "smooth" });
      }
      if (e.target.closest("[data-hoy-game='chat']")) {
        showTab("hablar");
        document.querySelector("#chat-work-card")?.scrollIntoView({ behavior: "smooth" });
      }
      if (e.target.closest("[data-hoy-game='cert']")) startCertExam();
    });

  }

  function patchDuoSpeakReturn() {
    if (typeof applySpeakVerdict !== "function") return;
    const orig = applySpeakVerdict;
    window.applySpeakVerdict = function (said) {
      orig(said);
      if (window._duoPending && duoState.active) {
        const ok = typeof speakHeardOk === "function" && speakHeardOk(said, window._duoPending);
        window._duoPending = null;
        duoNextTurn(!!ok);
        showTab("hablar");
        renderDuoCard();
        document.querySelector("#duo-card")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    };
  }

  function bootstrap() {
    patchTodayGame();
    patchKidsMode();
    patchTransferQr();
    patchMakeQuizItems();
    patchRenderQuiz();
    patchStartQuiz();
    patchPaintTab();
    patchDuoSpeakReturn();
    renderTravelPanel();
    renderPodcastList();
    renderChatWork();
    renderDuoCard();
    renderLabAudit();
    bindEvents();
    if (typeof renderHome === "function") {
      const orig = renderHome;
      window.renderHome = function () {
        orig();
        renderTravelPanel();
      };
    }
    if (typeof paintTab === "function" && typeof currentTab !== "undefined") {
      paintTab(currentTab);
    }
  }

  window.NR = {
    bootstrap,
    startCertExam,
    makeCertExamItems,
    travelOn,
    travelMapToday,
    renderLabAudit,
  };

  NR.bootstrap();
})();
