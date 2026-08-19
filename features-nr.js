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
      return { ok: sh && chart, detail: "Shadow + gráfica racha 90 días", tip: "Gráfica muestra últimos 90 días" };
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
      const rp = (ENLAB.roleplays || []).length >= 50;
      const star = !!document.querySelector("#star-box");
      return { ok: rp && star, detail: `${(ENLAB.roleplays || []).length} role-plays`, tip: "2 min por escena · 50 escenas" };
    }},
    { id: "L", name: "Tests + PIN aula + SW cache", check: () => {
      const pin = !!document.querySelector("#class-pin");
      const sw = typeof caches !== "undefined";
      return { ok: pin && sw, detail: "PIN aula + service worker", tip: "Playwright smoke en CI" };
    }},
    { id: "M", name: "Emails + examen semanal 12", check: () => {
      const em = (ENLAB.emailSpeak || []).length >= 20;
      const tone = (ENLAB.emailSpeak || []).filter((e) => e.tone).length >= 4;
      const wk = !!document.querySelector('[data-quiz-mode="weekly"]');
      const et = !!document.querySelector('[data-quiz-mode="emailtone"]');
      return { ok: em && tone && wk && et, detail: `${(ENLAB.emailSpeak || []).length} emails (${(ENLAB.emailSpeak || []).filter((e) => e.tone).length} tono)`, tip: "Quiz email tono formal/informal" };
    }},
    { id: "N", name: "Podcasts + series 3×3", check: () => {
      const p = (ENLAB.podcasts || []).length >= 40;
      const l = (ENLAB.listenPassages || []).length >= 25;
      const series = (ENLAB.podcastSeries || []).length >= 3;
      return { ok: p && l && series, detail: `${(ENLAB.podcasts || []).length} podcasts · ${(ENLAB.podcastSeries || []).length} series`, tip: "Quiz acumulativo por serie en Oír" };
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
    { id: "S", name: "Pronunciación + IPA + mínimos pares", check: () => {
      const p = (ENLAB.minimalPairs || []).length >= 25;
      const panel = !!document.querySelector("#pron-panel");
      const chart = !!(window.PRON?.renderVowelChartSvg);
      return { ok: p && panel && chart, detail: `${(ENLAB.minimalPairs || []).length} pares · formantes`, tip: "LPC formantes F1/F2 + gráfico vocal" };
    }},
    { id: "T", name: "Aula pro + CSV + QR alumno", check: () => {
      const pro = !!document.querySelector("#class-pro-panel");
      const qr = !!document.querySelector("#class-student-qr");
      return { ok: pro && qr, detail: "Dashboard aula pro + QR alumno", tip: "Importa códigos transfer · CSV cert/SRS" };
    }},
    { id: "U", name: "20 historias ramificadas", check: () => {
      const stories = ENLAB.branchStories || [];
      const n = stories.length;
      const minDepth = stories.length ? Math.min(...stories.map((s) => {
        if (!s.nodes || !s.start) return 1;
        const walk = (id, d = 0) => {
          const node = s.nodes[id];
          if (!node) return d;
          if (node.ending) return d + 1;
          const next = (node.choices || []).map((c) => walk(c.next, d + 1));
          return next.length ? Math.max(...next) : d + 1;
        };
        return walk(s.start);
      })) : 0;
      const quiz = typeof makeStoryItems === "function";
      return { ok: n >= 20 && minDepth >= 5 && !!document.querySelector("#stories-panel") && quiz, detail: `${n} historias · min ${minDepth} pasos · quiz SRS`, tip: "Vocabulario desbloqueable → SRS + Juego" };
    }},
    { id: "V", name: "Writing + rúbrica", check: () => {
      const n = (ENLAB.writingPrompts || []).length;
      return { ok: n >= 6 && !!document.querySelector("#writing-panel"), detail: `${n} prompts`, tip: "Compara con modelo" };
    }},
    { id: "W", name: "500 frases · 25 situaciones", check: () => {
      const sit = ENLAB.phrasesSituation || {};
      const total = Object.keys(sit).reduce((n, k) => n + (sit[k]?.length || 0), 0);
      const shadow = typeof runSituationShadow === "function";
      return { ok: Object.keys(sit).length >= 25 && total >= 480 && shadow, detail: `${Object.keys(sit).length} escenarios, ${total} frases`, tip: "Shadowing en situaciones" };
    }},
    { id: "X", name: "100 dictados + 40 podcasts", check: () => {
      return { ok: (ENLAB.dictation || []).length >= 100 && (window.ENLAB.podcasts || []).length >= 40, detail: `${(ENLAB.dictation || []).length} dict, ${(ENLAB.podcasts || []).length} pod`, tip: "40 guiones únicos en pack-n + pack-podcasts" };
    }},
    { id: "Y", name: "Onboarding + offline + a11y", check: () => {
      const off = !!document.querySelector("#offline-badge");
      const a11y = !!document.querySelector("#a11y-bar");
      return { ok: off && a11y, detail: `offline ${off ? "✓" : "✗"}, a11y ${a11y ? "✓" : "✗"}`, tip: "Contraste alto" };
    }},
    { id: "Z", name: "i18n EN + bundle split", check: () => {
      const ui = !!(ENLAB.ui?.en?.pron && ENLAB.ui?.en?.onboard);
      const loader = !!window.ENLAB_LOADER;
      const idb = !!window.ENLAB_IDB;
      return { ok: ui && loader && idb, detail: `EN UI ${ui ? "✓" : "—"}, loader ${loader ? "✓" : "—"}, IDB ${idb ? "✓" : "—"}`, tip: "English UI toggle + backup IDB" };
    }},
  ];

  function renderLabAudit() {
    const host = document.querySelector("#lab-audit");
    if (!host) return;
    const results = LOT_AUDIT.map((lot) => {
      let r = { ok: false, detail: "—", tip: "" };
      try { r = lot.check(); } catch { r.detail = "Error al comprobar"; }
      return { lot, r };
    });
    const okN = results.filter((x) => x.r.ok).length;
    const rows = results.map(({ lot, r }) => `<tr class="${r.ok ? "audit-ok" : "audit-warn"}">
        <td><strong>${esc(lot.id)}</strong></td>
        <td>${esc(lot.name)}</td>
        <td>${r.ok ? "✓" : "○"} ${esc(r.detail)}</td>
        <td class="muted">${esc(r.tip || "")}</td>
      </tr>`).join("");
    const auditTitle = typeof t === "function" ? t("audit") : "Auditoría A–Z";
    host.innerHTML = `
      <p class="kicker">${esc(auditTitle)}</p>
      <p>${esc(typeof t === "function" ? t("auditSummary", { ok: okN, total: LOT_AUDIT.length }) : `${okN}/${LOT_AUDIT.length} lotes en verde.`)}</p>
      <div class="audit-scroll">
        <table class="audit-table">
          <thead><tr><th>${esc(t("auditColLot"))}</th><th>${esc(t("auditColName"))}</th><th>${esc(t("auditColStatus"))}</th><th>${esc(t("auditColTip"))}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <details class="fold audit-transfer-qr">
        <summary>${esc(t("auditTransferQr"))}</summary>
        <p class="muted">${esc(t("auditTransferQrHint"))}</p>
        <canvas id="audit-transfer-qr" width="120" height="120" aria-label="QR del progreso"></canvas>
        <p class="muted" id="audit-transfer-chunks"></p>
        <button type="button" class="btn ghost sm" id="audit-transfer-copy" data-i18n="auditTransferCopy">Copiar código</button>
      </details>
      <p class="muted">${esc(t("auditFootnote"))}</p>`;
    if (typeof renderTransferCode === "function") renderTransferCode();
    const code = document.querySelector("#transfer-code")?.value || "";
    const hint = document.querySelector("#audit-transfer-chunks");
    if (hint && code) {
      hint.textContent = typeof t === "function"
        ? t("transferQrHint", { len: code.length, cs: code.length % 997 })
        : `${code.length} chars · checksum ${code.length % 997}`;
    }
  }

  /* ── Modo viaje ── */
  function renderTravelPanel() {
    const mapEl = document.querySelector("#travel-map");
    const toggle = document.querySelector("#travel-toggle");
    const on = travelOn();
    document.body.classList.toggle("travel-mode", on);
    if (toggle) setPressed(toggle, on);
    if (typeof syncPrefsBadge === "function") syncPrefsBadge();
    if (!mapEl) return;
    const map = travelMapToday();
    if (!map) { mapEl.hidden = true; return; }
    mapEl.hidden = !on;
    if (!on) return;
    const key = typeof todayKey === "function" ? todayKey() : "";
    let done = [];
    try { done = (JSON.parse(localStorage.getItem("enlab-travel-done") || "{}")[key]) || []; } catch { done = []; }
    mapEl.innerHTML = `
      <p class="kicker">${esc(map.emoji || "")} ${esc(t("travelModeOn"))} · ${esc(map.title)} ${on ? '<span class="pill ok">ON</span>' : `<span class="muted">${esc(t("travelTapHint"))}</span>`}</p>
      <p class="muted">${esc(map.intro)} · ${esc(t("travelSteps", { done: done.length, total: map.steps.length }))}</p>
      <ol class="travel-steps">${map.steps.map((s, i) => `
        <li class="travel-step ${done.includes(s.id) ? "done" : ""}" data-travel-id="${esc(s.id)}">
          <strong>${i + 1}. ${esc(s.label)}</strong>
          <button type="button" class="say chip" data-say="${esc(s.en)}">${esc(s.en)}</button>
          <button type="button" class="chip" data-travel-mark="${esc(s.id)}">${done.includes(s.id) ? esc(t("travelDone")) : esc(t("travelMark"))}</button>
          <span class="es-line">${esc(s.es)}</span>
          <span class="muted travel-tip">${esc(s.tip)}</span>
        </li>`).join("")}</ol>
      <p class="muted">${esc(t("travelExtras"))}</p>
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
  let podcastCur = { id: "", seg: 0, playing: false };

  function savePodcastNow(id, seg, done) {
    try {
      if (done || !id) {
        localStorage.removeItem("enlab-podcast-now");
      } else {
        localStorage.setItem("enlab-podcast-now", JSON.stringify({
          id, seg, day: typeof todayKey === "function" ? todayKey() : "", at: Date.now(),
        }));
      }
    } catch { /* ignore */ }
    if (typeof renderPodcastToday === "function") renderPodcastToday();
  }

  function stopPodcast(quiet) {
    if (podcastTimer) { clearTimeout(podcastTimer); podcastTimer = null; }
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    if (!quiet && podcastCur.playing && podcastCur.id) savePodcastNow(podcastCur.id, podcastCur.seg, false);
    podcastCur.playing = false;
    renderPodcastList();
  }

  function playPodcast(id, fromSeg) {
    stopPodcast(true);
    const pod = (ENLAB.podcasts || []).find((p) => p.id === id);
    const box = document.querySelector("#podcast-player");
    if (!pod || !box) return;
    let segI = Math.max(0, Math.min(Number(fromSeg) || 0, Math.max(0, (pod.segments || []).length - 1)));
    podcastCur = { id, seg: segI, playing: true };
    savePodcastNow(id, segI, false);
    box.hidden = false;
    box.scrollIntoView({ behavior: "smooth", block: "start" });
    const renderSeg = () => {
      box.innerHTML = `
        <p class="kicker">${esc(t("podKicker", { title: pod.title }))}</p>
        <p class="podcast-progress">${segI + 1}/${pod.segments.length}</p>
        <div class="podcast-transcript">${pod.segments.map((s, i) =>
          `<p class="pod-seg ${i === segI ? "on" : ""}"><span class="en">${esc(s.en)}</span><span class="es-line">${esc(s.es)}</span></p>`).join("")}</div>
        <div class="row">
          <button type="button" class="btn sm" id="pod-stop">${esc(t("podStop"))}</button>
          <button type="button" class="btn ghost sm" id="pod-replay">${esc(t("podReplay"))}</button>
          <button type="button" class="btn ghost sm" id="pod-shadow">${esc(t("podShadow"))}</button>
        </div>`;
      document.querySelector("#pod-stop")?.addEventListener("click", stopPodcast);
      document.querySelector("#pod-replay")?.addEventListener("click", () => playPodcast(id));
      document.querySelector("#pod-shadow")?.addEventListener("click", () => {
        const line = pod.segments[segI]?.en;
        if (line && window.PLUS?.runPhraseShadow) window.PLUS.runPhraseShadow(line);
        else if (line && typeof speak === "function") speak(line, true);
      });
      renderPodcastList();
    };
    const next = () => {
      if (segI >= pod.segments.length) {
        box.innerHTML += `<p class="muted">${esc(t("podEnd"))}</p>
          ${pod.qs?.length ? `<button type="button" class="btn sm" id="podcast-quiz-go">${esc(t("podQuiz"))}</button>` : ""}`;
        document.querySelector("#podcast-quiz-go")?.addEventListener("click", () => startPodcastQuiz(pod));
        try {
          const log = JSON.parse(localStorage.getItem("enlab-podcast-log") || "[]");
          if (!log.includes(id)) log.push(id);
          localStorage.setItem("enlab-podcast-log", JSON.stringify(log.slice(-30)));
        } catch { /* ignore */ }
        podcastCur.playing = false;
        savePodcastNow(id, 0, true);
        return;
      }
      podcastCur.seg = segI;
      savePodcastNow(id, segI, false);
      renderSeg();
      speak(pod.segments[segI].en, false).then(() => {
        segI += 1;
        podcastTimer = setTimeout(next, 400);
      });
    };
    next();
  }

  function renderPodcastResumeBanner() {
    let now = null;
    try { now = JSON.parse(localStorage.getItem("enlab-podcast-now") || "null"); } catch { now = null; }
    const pod = now?.id ? (ENLAB.podcasts || []).find((p) => p.id === now.id) : null;
    if (!pod) return "";
    const player = document.querySelector("#podcast-player");
    if (podcastCur?.id === now.id && player && !player.hidden) return "";
    const segs = pod.segments || [];
    const mid = now.seg > 0 && now.seg < segs.length;
    const label = mid
      ? t("podcastResume", { n: now.seg + 1, total: segs.length })
      : t("podcastListen");
    const segAttr = mid ? ` data-pod-seg="${esc(String(now.seg))}"` : "";
    return `<div class="card podcast-resume-banner">
      <p class="kicker">${esc(t("podcastResumeKicker"))}</p>
      <button type="button" class="btn sm" data-podcast="${esc(pod.id)}"${segAttr}>${esc(label)} · ${esc(pod.title)}</button>
    </div>`;
  }

  function renderPodcastList() {
    const el = document.querySelector("#podcast-list");
    if (!el) return;
    const n = lvlNum();
    const pods = (ENLAB.podcasts || []).filter((p) => (p.min || 1) <= n);
    const series = (ENLAB.podcastSeries || []).filter((s) => (s.min || 1) <= n);
    const resumeBanner = renderPodcastResumeBanner();
    const seriesHtml = series.map((s) => `
      <div class="card podcast-series">
        <p class="kicker">${esc(s.title)} · 3 eps</p>
        <p class="muted">${esc(s.titleEs || "")}</p>
        <div class="row">${s.episodes.map((id) => {
          const p = pods.find((x) => x.id === id);
          return p ? `<button type="button" class="chip" data-podcast="${esc(id)}">${esc(p.title)}</button>` : "";
        }).join("")}</div>
        <button type="button" class="btn sm" data-series-quiz="${esc(s.id)}">${esc(typeof t === "function" ? t("seriesQuizGo") : "Quiz de la serie (9 preg.)")}</button>
      </div>`).join("");
    el.innerHTML = resumeBanner + seriesHtml + pods.map((p) => `
      <button type="button" class="card podcast-card" data-podcast="${esc(p.id)}">
        <strong>${esc(p.title)}</strong>
        <span class="muted">${esc(p.duration)} · ${p.segments.length} frases${p.seriesEp ? ` · ep ${p.seriesEp}/3` : ""}</span>
      </button>`).join("") || `<p class="muted">${esc(typeof t === "function" ? t("podcastLevelUp") : "Sube de nivel para más podcasts.")}</p>`;
  }

  function startSeriesQuiz(seriesId) {
    const s = (ENLAB.podcastSeries || []).find((x) => x.id === seriesId);
    if (!s || typeof startQuiz !== "function") return;
    const items = (s.seriesQs || []).map((q) => ({
      type: "listen",
      q: q.q,
      a: q.a,
      opts: q.opts,
      say: q.a,
      inf: `${seriesId}:${q.a}`,
    }));
    window.quiz = { i: 0, score: 0, items, fails: [], mode: "listen", host: "#quiz-box" };
    if (typeof showTab === "function") showTab("quiz");
    if (typeof openQuizRoom === "function") openQuizRoom("listen");
    if (typeof renderQuiz === "function") renderQuiz();
    document.querySelector("#quiz-box")?.scrollIntoView({ behavior: "smooth" });
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
        <span class="pill ${m.tone === "formal" ? "formal" : "informal"}">${m.tone === "formal" ? esc(t("chatFormal")) : esc(t("chatInformal"))}</span>
        <p class="quiz-q">${esc(m.en)}</p>
        <p class="muted">${esc(m.es)}</p>
        <p class="muted">${esc(t("chatReplyModel"))} <em>${esc(m.reply)}</em></p>
        <div class="row">
          <button type="button" class="btn ghost sm" data-chat-hear="${i}">${esc(t("chatHear"))}</button>
          <button type="button" class="btn sm" data-chat-reply="${i}">${esc(t("chatReplyRec"))}</button>
        </div>
      </div>`).join("") + (showAll || items.length <= 18 ? "" : `<p><button type="button" class="btn ghost sm" id="chat-show-all">${esc(t("chatShowAll", { n: items.length }))}</button></p>`);
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
    if (scoreEl) scoreEl.textContent = t("duoScore", { a: duoState.scoreA, b: duoState.scoreB });
    if (!duoState.active || !duoState.scene) {
      el.innerHTML = `<p class="muted">${esc(t("duoIdle"))}</p>
        <button type="button" class="btn" id="duo-start">${esc(t("duoStart"))}</button>`;
      el.className = "";
      renderDuoResumeHablar();
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
      <p class="kicker">${esc(t("duoPlayerTurn", { n: duoState.player, turn: duoState.turn + 1 }))}</p>
      <p class="quiz-q">${esc(line || "—")}</p>
      <p class="muted">${esc(t("duoYourTurn"))} <strong>${esc(target)}</strong></p>
      <div class="row">
        <button type="button" class="btn ghost sm" id="duo-hear">${esc(t("duoHear"))}</button>
        <button type="button" class="btn sm" id="duo-record">${esc(t("duoRecord"))}</button>
        <button type="button" class="btn ghost sm" id="duo-skip">${esc(t("duoSkip"))}</button>
        <button type="button" class="btn ghost sm" id="duo-end">${esc(t("duoEnd"))}</button>
      </div>`;
    document.querySelector("#duo-hear")?.addEventListener("click", () => speak(target, true));
    renderDuoResumeHablar();
  }

  function persistDuoNow() {
    if (!duoState.active || !duoState.scene || duoState.turn >= 6) return;
    try {
      sessionStorage.setItem("enlab-duo-now", JSON.stringify({
        day: typeof todayKey === "function" ? todayKey() : "",
        player: duoState.player,
        scoreA: duoState.scoreA,
        scoreB: duoState.scoreB,
        turn: duoState.turn,
        scene: duoState.scene,
      }));
    } catch { /* ignore */ }
    renderDuoToday();
  }

  function loadDuoNow() {
    try {
      const raw = JSON.parse(sessionStorage.getItem("enlab-duo-now") || "null");
      const today = typeof todayKey === "function" ? todayKey() : "";
      if (raw?.day !== today || !raw?.scene || raw.turn >= 6) return null;
      if (duoState.active) return null;
      return raw;
    } catch { return null; }
  }

  function clearDuoNow() {
    sessionStorage.removeItem("enlab-duo-now");
    renderDuoToday();
  }

  function duoYouAreChipHtml() {
    if (typeof currentTab !== "undefined" && currentTab !== "hablar") return "";
    const now = loadDuoNow();
    if (!now || duoState.active || (typeof kidsOn === "function" && kidsOn())) return "";
    return `<button type="button" class="btn sm" data-duo-resume>${esc(t("duoResume", { turn: now.turn + 1 }))}</button>`;
  }

  function renderDuoResumeHablar() {
    const el = document.querySelector("#duo-resume-hablar");
    if (!el) return;
    if (typeof currentTab !== "undefined" && currentTab !== "hablar") {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    const now = loadDuoNow();
    if (!now || duoState.active || (typeof kidsOn === "function" && kidsOn())) {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    el.hidden = false;
    el.innerHTML = `
      <p class="muted">${esc(t("duoResumeHint"))}</p>
      <p class="muted">${esc(t("duoScore", { a: now.scoreA || 0, b: now.scoreB || 0 }))}</p>
      <button type="button" class="btn sm" data-duo-resume>${esc(t("duoResume", { turn: now.turn + 1 }))}</button>`;
    if (typeof fillYouAreChips === "function") fillYouAreChips();
  }

  function renderDuoToday() {
    const el = document.querySelector("#duo-today");
    if (!el) return;
    if (typeof kidsOn === "function" && kidsOn()) {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    const now = loadDuoNow();
    if (!now) {
      el.hidden = true;
      el.innerHTML = "";
      renderDuoResumeHablar();
      return;
    }
    el.hidden = false;
    el.innerHTML = `
      <p class="kicker">${esc(t("duoResumeKicker"))}</p>
      <p class="muted">${esc(t("duoResumeHint"))}</p>
      <p class="muted">${esc(t("duoScore", { a: now.scoreA || 0, b: now.scoreB || 0 }))}</p>
      <button type="button" class="btn sm" data-duo-resume>${esc(t("duoResume", { turn: now.turn + 1 }))}</button>`;
    renderDuoResumeHablar();
  }

  function resumeDuo() {
    const raw = loadDuoNow();
    if (!raw) return;
    duoState.active = true;
    duoState.scene = raw.scene;
    duoState.player = raw.player || 1;
    duoState.scoreA = raw.scoreA || 0;
    duoState.scoreB = raw.scoreB || 0;
    duoState.turn = raw.turn || 0;
    sessionStorage.removeItem("enlab-duo-now");
    if (typeof showTab === "function") showTab("hablar");
    if (typeof openLabRoom === "function") openLabRoom("duo-card");
    renderDuoCard();
    renderDuoToday();
  }

  function startDuo() {
    const sc = pickDuoScene();
    if (!sc) return;
    clearDuoNow();
    duoState.active = true;
    duoState.scene = sc;
    duoState.turn = 0;
    duoState.player = 1;
    duoState.scoreA = 0;
    duoState.scoreB = 0;
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
    if (typeof openQuizRoom === "function") openQuizRoom("listen");
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
      clearDuoNow();
      try {
        localStorage.setItem("enlab-duo-stats", JSON.stringify({
          at: typeof todayKey === "function" ? todayKey() : "",
          scoreA: duoState.scoreA,
          scoreB: duoState.scoreB,
        }));
      } catch { /* ignore */ }
    } else {
      persistDuoNow();
    }
    renderDuoCard();
  }

  function endDuo() {
    duoState.active = false;
    duoState.scene = null;
    clearDuoNow();
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

  function startCertTimer(from) {
    stopCertTimer();
    const n = Number(from);
    certLeft = Number.isFinite(n) && n > 0 ? Math.min(CERT_TOTAL, Math.floor(n)) : CERT_TOTAL;
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

  function loadCertNow() {
    try {
      const raw = JSON.parse(localStorage.getItem("enlab-cert-now") || "null");
      const today = typeof todayKey === "function" ? todayKey() : "";
      if (raw?.day !== today) return null;
      if (raw?.timeUp) return { timeUp: true, i: raw.i || 0, total: raw.total || raw.items?.length || 0 };
      if (Array.isArray(raw.items) && raw.i < raw.items.length && (raw.left == null || raw.left > 0)) return raw;
    } catch { /* ignore */ }
    return null;
  }

  function persistCertNow() {
    if (typeof quiz === "undefined" || quiz?.mode !== "cert" || !quiz.items?.length || quiz.i >= quiz.items.length) return;
    if (certLeft <= 0) return;
      try {
      localStorage.setItem("enlab-cert-now", JSON.stringify({
        day: typeof todayKey === "function" ? todayKey() : "",
        i: quiz.i,
        score: quiz.score || 0,
        fails: quiz.fails || [],
        items: quiz.items,
        left: certLeft,
      }));
    } catch { /* ignore */ }
    renderCertToday();
  }

  function clearCertNow() {
    localStorage.removeItem("enlab-cert-now");
  }

  function renderCertToday() {
    const el = document.querySelector("#cert-today");
    if (!el) return;
    if (typeof kidsOn === "function" && kidsOn()) {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    const now = loadCertNow();
    if (!now) {
      if (typeof certTimedOutToday === "function" && certTimedOutToday()) {
        el.hidden = false;
        el.innerHTML = `
          <p class="kicker">${esc(t("certTimeUpKicker"))}</p>
          <p class="muted">${esc(t("certTimeUpHint"))}</p>
          <button type="button" class="btn sm" data-cert-retry>${esc(t("certRetryBtn"))}</button>`;
        return;
      }
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    el.hidden = false;
    if (now.timeUp) {
      el.innerHTML = `
        <p class="kicker">${esc(t("certTimeUpKicker"))}</p>
        <p class="muted">${esc(t("certTimeUpHint"))}</p>
        <button type="button" class="btn sm" data-cert-retry>${esc(t("certRetryBtn"))}</button>`;
      return;
    }
    el.innerHTML = `
      <p class="kicker">${esc(t("certResumeKicker"))}</p>
      <p class="muted">${esc(t("certResumeHint"))}</p>
      <button type="button" class="btn sm" data-cert-resume>${esc(t("certResume", { n: now.i + 1, total: now.items.length }))}</button>`;
  }

  function finishCertExam(timeUp) {
    stopCertTimer();
    if (timeUp && quiz.i < quiz.items.length) {
      try {
        localStorage.setItem("enlab-cert-now", JSON.stringify({
          day: typeof todayKey === "function" ? todayKey() : "",
          timeUp: true,
          i: quiz.i,
          total: quiz.items.length,
        }));
      } catch { /* ignore */ }
    } else {
      clearCertNow();
    }
    renderCertToday();
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
    localStorage.setItem("enlab-cert-score", JSON.stringify({
      score, total, pct, pass, at: Date.now(), breakdown,
      timeUp: !!timeUp,
      day: typeof todayKey === "function" ? todayKey() : "",
    }));
    const name = localStorage.getItem("enlab-cert-name") || t("certStudent");
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
        <p class="cert-sub">${esc(t("certSub", { level: levelLabel }))}</p>
        <p class="cert-name">${esc(name)}</p>
        <p>${esc(t("certScoreLine", { score, total, pct }))}${timeUp ? esc(t("certTimeUp")) : ""}</p>
        ${breakdown ? `<p class="muted">${esc(breakdown)}</p>` : ""}
        <p class="cert-verdict ${pass ? "pass" : "fail"}">${esc(pass ? t("certPass") : t("certFail"))}</p>
        <p class="muted">${typeof todayKey === "function" ? todayKey() : ""} · English Lab PWA</p>
      </div>`;
    if (box) {
      let fromHoy = false;
      try { fromHoy = sessionStorage.getItem("enlab-quiz-from-hoy") === "1"; } catch { fromHoy = false; }
      const backHoy = fromHoy
        ? `<button type="button" class="btn ghost sm" data-go-tab="hoy">${esc(t("quizBackHoy"))}</button>`
        : "";
      box.innerHTML = `
        <div class="card">
          <p class="kicker">${esc(t("certKicker"))}</p>
          <p>${esc(pass ? t("certOk") : t("certNotYet"))} ${score}/${total} (${pct}%)</p>
          ${breakdown ? `<p class="muted">${esc(t("certBySkill", { list: breakdown }))}</p>` : ""}
          <label class="muted">${esc(t("certNameLabel"))}
            <input id="cert-name-input" type="text" value="${esc(name)}" maxlength="40" />
          </label>
          <div class="row">
            <button type="button" class="btn" id="cert-print-btn">${esc(t("certPrint"))}</button>
            <button type="button" class="btn ghost" id="cert-retry">${esc(t("certRetry"))}</button>
            ${backHoy}
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

  function startCertExam(opts) {
    if (typeof recState !== "undefined" && recState.rec?.state === "recording") stopRecording(false);
    const resume = opts?.resume ? loadCertNow() : null;
    if (resume) {
      quiz = { i: resume.i, score: resume.score || 0, items: resume.items, fails: resume.fails || [], mode: "cert", host: "#quiz-box" };
    } else {
      clearCertNow();
      quiz = { i: 0, score: 0, items: makeCertExamItems(), fails: [], mode: "cert", host: "#quiz-box" };
    }
    showTab("quiz");
    if (typeof openQuizRoom === "function") openQuizRoom("cert");
    const bar = document.querySelector("#cert-timer-bar");
    if (bar) bar.hidden = false;
    startCertTimer(resume ? resume.left : undefined);
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
      document.querySelectorAll("#transfer-qr, #prefs-transfer-qr, #audit-transfer-qr").forEach((canvas) => {
        if (canvas) drawRealQr(text, canvas);
      });
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
        return { game: "podcast", label: typeof t === "function" ? t("hoyGamePodcast") : "Hoy: mini-podcast", hint: typeof t === "function" ? t("hoyGamePodcastHint") : "Oír con transcripción en pestaña Oír" };
      }
      if (rot === "travel" && ENLAB.travelMaps) {
        return { game: "travel", label: typeof t === "function" ? t("hoyGameTravel") : "Hoy: mapa de viaje", hint: typeof t === "function" ? t("hoyGameTravelHint") : "Aeropuerto, hotel, ciudad" };
      }
      if (rot === "chat" && n >= 2 && (ENLAB.chatWork || []).length) {
        return { game: "chat", label: typeof t === "function" ? t("hoyGameWork") : "Hoy: chat de trabajo", hint: typeof t === "function" ? t("hoyGameWorkHint") : "Mensajes formales e informales en Hablar" };
      }
      if (rot === "cert" && n >= 3) {
        return { game: "cert", label: typeof t === "function" ? t("hoyGameCert") : "Examen certificado (30 min)", hint: typeof t === "function" ? t("hoyGameCertHint") : "Simulacro B1/B2 — puedes repetir en Juego" };
      }
      return base;
    };
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
        persistCertNow();
      } else if (bar && quiz.mode !== "cert") {
        bar.hidden = true;
        stopCertTimer();
      }
    };
  }

  function patchStartQuiz() {
    /* cert se despacha en startQuiz de app.js. */
  }

  function patchMakeQuizItems() {
    /* cert items se piden a NR.makeCertExamItems desde app.js. */
  }

  function patchPaintTab() {
    if (window._paintTabNrPatched) return;
    window._paintTabNrPatched = true;
    if (typeof onTabPaint === "function") {
      onTabPaint((id) => {
        if (id === "vocales") renderPodcastList();
        if (id === "hablar") { renderChatWork(); renderDuoCard(); renderDuoResumeHablar(); if (typeof fillYouAreChips === "function") fillYouAreChips(); }
        if (id === "ia") renderLabAudit();
        if (id !== "quiz") persistCertNow();
        if (id === "hoy") { renderCertToday(); renderDuoToday(); }
      });
    }
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
      if (e.target.closest("[data-duo-resume]")) resumeDuo();
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
          window._speakTarget = { target, help: typeof t === "function" ? t("duoTurnHelp") : "Turno duo — di la línea B/A" };
          if (typeof setSpeakTarget === "function") setSpeakTarget(window._speakTarget);
          showTab("hablar");
          document.querySelector("#speak-rec")?.click();
        }
      }
      if (e.target.closest("[data-podcast]")) {
        const btn = e.target.closest("[data-podcast]");
        const from = Number(btn.dataset.podSeg || 0);
        const mid = btn.closest("#podcast-today") && btn.hasAttribute("data-pod-seg");
        if (btn.closest("#podcast-today") || from > 0 || mid) {
          if (typeof showTab === "function") showTab("vocales");
          if (typeof openLabRoom === "function") openLabRoom("oido-podcasts");
        }
        playPodcast(btn.dataset.podcast, mid ? from : (from > 0 ? from : undefined));
      }
      if (e.target.closest("[data-series-quiz]")) {
        startSeriesQuiz(e.target.closest("[data-series-quiz]").dataset.seriesQuiz);
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
      if (e.target.closest("[data-cert-resume]")) {
        startCertExam({ resume: true });
      }
      if (e.target.closest("[data-cert-retry]")) {
        const now = loadCertNow();
        if (now?.timeUp && typeof window.confirm === "function" && !window.confirm(t("certRetryWarn"))) return;
        startCertExam();
      }
      if (e.target.closest("#audit-transfer-copy")) {
        if (typeof classroomAllowsChange === "function" && !classroomAllowsChange("classPinExport")) return;
        if (typeof renderTransferCode === "function") renderTransferCode();
        const code = document.querySelector("#transfer-code")?.value || "";
        const hint = document.querySelector("#audit-transfer-chunks");
        if (!code) {
          if (hint) hint.textContent = typeof t === "function" ? t("prefsTransferEmpty") : "";
          return;
        }
        const ok = () => {
          if (hint && typeof t === "function") {
            hint.textContent = t("transferQrHint", { len: code.length, cs: code.length % 997 });
          }
        };
        if (navigator.clipboard?.writeText) navigator.clipboard.writeText(code).then(ok).catch(ok);
        else ok();
      }
      if (e.target.closest('[data-quiz-mode="cert"]')) {
        const sel = document.querySelector("#quiz-mode");
        if (sel) sel.value = "cert";
        syncQuizModePicks?.();
      }
      if (e.target.closest("#cert-start-btn")) startCertExam();
      if (e.target.closest("[data-hoy-game='podcast']")) {
        showTab("vocales");
        if (typeof openOidoTopic === "function") openOidoTopic("oido-podcasts");
        else document.querySelector("#podcast-block")?.scrollIntoView({ behavior: "smooth" });
      }
      if (e.target.closest("[data-hoy-game='travel']")) {
        if (!travelOn()) toggleTravel();
        document.querySelector("#travel-map")?.scrollIntoView({ behavior: "smooth" });
      }
      if (e.target.closest("[data-hoy-game='chat']")) {
        showTab("hablar");
        if (typeof openLabRoom === "function") openLabRoom("chat-work-card");
        document.querySelector("#chat-work-card")?.scrollIntoView({ behavior: "smooth" });
      }
      if (e.target.closest("[data-hoy-game='cert']")) startCertExam();
    });

  }

  function patchDuoSpeakReturn() {
    if (window._duoSpeakPatched || typeof onSpeakVerdict !== "function") return;
    window._duoSpeakPatched = true;
    onSpeakVerdict((said) => {
      if (!window._duoPending || !duoState.active) return;
      const ok = typeof speakHeardOk === "function" && speakHeardOk(said, window._duoPending);
      window._duoPending = null;
      duoNextTurn(!!ok);
      showTab("hablar");
      renderDuoCard();
      document.querySelector("#duo-card")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function bootstrap() {
    if (window._nrBootstrapped) return;
    window._nrBootstrapped = true;
    patchTodayGame();
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
    bindEvents();
    renderCertToday();
    renderDuoToday();
    if (typeof onHomePaint === "function" && !window._renderHomePatched) {
      window._renderHomePatched = true;
      onHomePaint(() => {
        renderTravelPanel();
        renderCertToday();
        renderDuoToday();
      });
    }
  }

  window.NR = {
    bootstrap,
    startCertExam,
    persistCertNow,
    renderCertToday,
    renderDuoToday,
    renderDuoResumeHablar,
    duoYouAreChipHtml,
    makeCertExamItems,
    travelOn,
    travelMapToday,
    renderLabAudit,
    playPodcast,
  };

  if (!window.ENLAB_LOADER) NR.bootstrap();
})();
