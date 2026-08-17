const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const PROG_KEYS = ["enlab-stats", "enlab-weak", "enlab-known", "enlab-ear-weak", "enlab-ear-stats", "enlab-cefr", "enlab-ear-warmup", "enlab-session", "enlab-rate", "enlab-log", "enlab-theme", "enlab-hide-es", "enlab-remind-on", "enlab-remind-time"];
const FILTERS = { q: "", fam: "all", only: "level" };
let quiz = { i: 0, score: 0, items: [], fails: [], mode: "choice" };
let recState = { rec: null, chunks: [], stream: null, url: "" };
let currentTab = "hoy";
let verbLimit = 24;
let hoyPairI = 0;
const dirty = { vowels: true, verbs: true, speak: true, ai: true };

function starterSet() {
  return new Set(ENLAB.starter40 || []);
}

function isStarter(v) {
  return starterSet().has(v.inf);
}

function level() {
  return localStorage.getItem("enlab-cefr") || "b1";
}

function lvlNum() {
  return (ENLAB.cefr && ENLAB.cefr[level()] && ENLAB.cefr[level()].num) || 3;
}

function verbsForLevel() {
  const n = lvlNum();
  if (n <= 1) return ENLAB.verbs.filter((v) => (ENLAB.verbsA1 || []).includes(v.inf));
  if (n <= 3) return ENLAB.verbs.filter(isStarter);
  return ENLAB.verbs;
}

function isLevelVerb(v) {
  return verbsForLevel().some((x) => x.inf === v.inf);
}

function speakRate() {
  return localStorage.getItem("enlab-rate") === "slow" ? "slow" : "normal";
}

function renderRateBar() {
  const cur = speakRate();
  $$("[data-rate]").forEach((b) => b.classList.toggle("on", b.dataset.rate === cur));
}

function themePref() {
  const saved = localStorage.getItem("enlab-theme");
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme() {
  const t = themePref();
  document.documentElement.dataset.theme = t;
  const meta = $("#theme-color");
  if (meta) meta.content = t === "dark" ? "#12201e" : "#0b7a72";
  $$("[data-theme-set]").forEach((b) => b.classList.toggle("on", b.dataset.themeSet === t));
}

function hideEsOn() {
  return localStorage.getItem("enlab-hide-es") === "1";
}

function applyHideEs() {
  const on = hideEsOn();
  document.documentElement.classList.toggle("hide-es", on);
  $$("[data-hide-es]").forEach((b) => {
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
}

function buzz(ok) {
  try { navigator.vibrate?.(ok ? [30, 50, 30] : [90]); } catch { /* ignore */ }
}

let wakeLock = null;
async function requestWake() {
  try {
    if (document.visibilityState !== "visible") return;
    wakeLock = await navigator.wakeLock?.request("screen");
  } catch { /* no permitido */ }
}
function releaseWake() {
  try { wakeLock?.release(); } catch { /* ignore */ }
  wakeLock = null;
}

function speak(text, slow = false, opts = {}) {
  if (opts.cancel !== false) window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  const slowVoice = speakRate() === "slow";
  u.rate = slowVoice ? 0.62 : (slow ? 0.72 : 0.92);
  const voices = speechSynthesis.getVoices();
  const en = voices.find((v) => /en-US/i.test(v.lang) && /Google|Natural|Samantha|Jenny|Aria/i.test(v.name))
    || voices.find((v) => /en-US/i.test(v.lang));
  if (en) u.voice = en;
  return new Promise((resolve) => {
    u.onend = () => resolve();
    u.onerror = () => resolve();
    speechSynthesis.speak(u);
  });
}
speechSynthesis.onvoiceschanged = () => {};

async function speakQueue(words, slow = true) {
  window.speechSynthesis.cancel();
  for (let i = 0; i < words.length; i += 1) {
    await speak(words[i], slow, { cancel: false });
    await new Promise((r) => setTimeout(r, 320));
  }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function seedFromDay() {
  const t = todayKey().replace(/-/g, "");
  let x = Number(t) || 1;
  return () => {
    x += 0x6D2B79F5;
    let r = Math.imul(x ^ (x >>> 15), 1 | x);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(arr) {
  const rnd = seedFromDay();
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pad2(n) { return String(n).padStart(2, "0"); }

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function localDateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function loadSet(key) {
  try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); } catch { return new Set(); }
}
function saveSet(key, set) {
  localStorage.setItem(key, JSON.stringify([...set]));
}
function weakSet() { return loadSet("enlab-weak"); }
function knownSet() { return loadSet("enlab-known"); }

function sessionData() {
  const today = todayKey();
  try {
    const raw = JSON.parse(localStorage.getItem("enlab-session") || "{}");
    if (raw.date !== today) return { date: today, pairs: [], verbs: [], phrases: [], quizDone: false };
    return {
      date: today,
      pairs: Array.isArray(raw.pairs) ? raw.pairs : [],
      verbs: Array.isArray(raw.verbs) ? raw.verbs : [],
      phrases: Array.isArray(raw.phrases) ? raw.phrases : [],
      quizDone: !!raw.quizDone,
    };
  } catch {
    return { date: today, pairs: [], verbs: [], phrases: [], quizDone: false };
  }
}

function saveSession(s) {
  localStorage.setItem("enlab-session", JSON.stringify(s));
}

function markSession(kind, id) {
  const s = sessionData();
  if (kind === "quizDone") {
    if (s.quizDone) return;
    s.quizDone = true;
    saveSession(s);
    renderHoyCheck();
    upsertLog();
    return;
  }
  const arr = s[kind];
  if (!Array.isArray(arr) || !id || arr.includes(id)) return;
  arr.push(id);
  saveSession(s);
  renderHoyCheck();
  upsertLog();
}

function renderHoyCheck() {
  const el = $("#hoy-check");
  if (!el) return;
  const s = sessionData();
  const items = [
    { ok: s.pairs.length >= 4, label: `Oír los 4 pares (${Math.min(s.pairs.length, 4)}/4)` },
    { ok: s.verbs.length >= 5, label: `Escuchar 5 verbos del día (${Math.min(s.verbs.length, 10)}/5)` },
    { ok: s.phrases.length >= 2, label: `Decir o oír 2 frases (${Math.min(s.phrases.length, 2)}/2)` },
    { ok: s.quizDone, label: "Terminar un quiz (verbos u oído)" },
  ];
  const done = items.filter((x) => x.ok).length;
  const pct = (done / items.length) * 100;
  el.innerHTML = `
    <ul class="check-list">
      ${items.map((x) => `<li class="${x.ok ? "done" : ""}">${esc(x.label)}</li>`).join("")}
    </ul>
    <div class="session-bar" aria-hidden="true"><span style="width:${pct}%"></span></div>
    ${done === 4 ? `<p class="session-done">¡Listo! Sesión del día guardada.</p>` : ""}
  `;
  if (done === 4 && sessionStorage.getItem("enlab-celeb") !== todayKey()) {
    sessionStorage.setItem("enlab-celeb", todayKey());
    buzz(true);
  }
}

function loadLogs() {
  try {
    const raw = JSON.parse(localStorage.getItem("enlab-log") || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function sessionTaskCount(s) {
  return [
    s.pairs.length >= 4,
    s.verbs.length >= 5,
    s.phrases.length >= 2,
    s.quizDone,
  ].filter(Boolean).length;
}

function formatLogDate(iso) {
  const [Y, M, D] = String(iso).split("-").map(Number);
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  if (!Y || !M || !D) return iso;
  return `${D} ${months[M - 1]} ${Y}`;
}

function upsertLog() {
  const today = todayKey();
  const sess = sessionData();
  const st = stats();
  const d = st.days[today] || { quiz: 0, heard: 0, spoke: 0 };
  const tasks = sessionTaskCount(sess);
  const byDate = {};
  for (const row of loadLogs()) {
    if (row && row.date) byDate[row.date] = row;
  }
  for (const [date, day] of Object.entries(st.days || {})) {
    if (byDate[date]) continue;
    byDate[date] = {
      date,
      cefr: (date === today ? level() : ""),
      heard: day.heard || 0,
      quiz: day.quiz || 0,
      spoke: day.spoke || 0,
      tasks: date === today ? tasks : 0,
      complete: false,
    };
  }
  const hasActivity = tasks > 0 || (d.heard || 0) > 0 || (d.quiz || 0) > 0 || (d.spoke || 0) > 0;
  if (hasActivity || byDate[today]) {
    byDate[today] = {
      date: today,
      cefr: level(),
      heard: d.heard || 0,
      quiz: d.quiz || 0,
      spoke: d.spoke || 0,
      tasks,
      complete: tasks === 4,
    };
  }
  const logs = Object.values(byDate).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 60);
  localStorage.setItem("enlab-log", JSON.stringify(logs));
  renderSessionLog();
}

function renderSessionLog() {
  const el = $("#session-log");
  if (!el) return;
  const logs = loadLogs();
  if (!logs.length) {
    el.innerHTML = `<p class="muted">Aún no hay sesiones. En cuanto oigas, hagas quiz o hables, aparece el día de hoy aquí. Se guarda solo en este Chrome/Edge, en este PC. No hace falta servidor.</p>`;
    return;
  }
  el.innerHTML = `
    <ul class="log-list">
      ${logs.slice(0, 21).map((row) => {
        const n = row.tasks || 0;
        const bit = row.complete ? "completa" : (n ? `${n}/4 bloques` : "empezada");
        const lvl = row.cefr ? String(row.cefr).toUpperCase() : "—";
        return `<li>
          <strong>${esc(formatLogDate(row.date))}</strong>
          <span class="pill ${row.complete ? "ok" : ""}">${esc(bit)}</span>
          <span class="muted">${esc(lvl)} · ${row.heard || 0} oídas · ${row.quiz || 0} quiz · ${row.spoke || 0} voz</span>
        </li>`;
      }).join("")}
    </ul>
  `;
}

function stats() {
  const raw = JSON.parse(localStorage.getItem("enlab-stats") || '{"days":{},"streak":0,"last":""}');
  const today = todayKey();
  if (raw.last && raw.last !== today) {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    if (raw.last !== localDateKey(y)) raw.streak = 0;
  }
  return raw;
}

function bump(kind) {
  const s = stats();
  const today = todayKey();
  s.days[today] = s.days[today] || { quiz: 0, heard: 0, spoke: 0 };
  s.days[today][kind] = (s.days[today][kind] || 0) + 1;
  if (s.last !== today) {
    s.streak = (s.last ? s.streak : 0) + 1;
    s.last = today;
  }
  localStorage.setItem("enlab-stats", JSON.stringify(s));
  renderHomeStats();
  upsertLog();
}

function renderHomeStats() {
  const s = stats();
  const d = s.days[todayKey()] || { quiz: 0, heard: 0, spoke: 0 };
  const el = $("#home-stats");
  if (el) {
    el.textContent = `Racha ${s.streak} día(s) · Hoy: ${d.heard} oídas · ${d.quiz} quiz · ${d.spoke} voz · ${weakSet().size} débiles · ${knownSet().size} fuertes`;
  }
}

function showTab(id) {
  currentTab = id;
  clearEarTimers();
  $$(".panel").forEach((p) => p.classList.toggle("active", p.id === id));
  $$("nav.tabs button").forEach((b) => {
    b.setAttribute("aria-current", b.dataset.tab === id ? "page" : "false");
  });
  location.hash = id;
  localStorage.setItem("enlab-tab", id);
  paintTab(id);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function paintTab(id) {
  if (id === "vocales" && dirty.vowels) {
    renderOidoToc();
    renderVowels();
    dirty.vowels = false;
  }
  if (id === "verbos" && dirty.verbs) {
    verbLimit = 24;
    renderVerbs();
    dirty.verbs = false;
  }
  if (id === "hablar" && dirty.speak) {
    renderSpeak();
    dirty.speak = false;
  }
  if (id === "ia" && dirty.ai) {
    renderAI();
    dirty.ai = false;
  }
}

function speakForms(v) {
  return `${v.inf}. ${v.past.replaceAll(" / ", " or ")}. ${v.pp.replaceAll(" / ", " or ")}`;
}

function firstForm(s) {
  return s.split(" / ")[0].trim();
}

function perfectOf(v) {
  return `I have ${firstForm(v.pp)}.`;
}

function simplePastOf(v) {
  if (v.inf === "be") return "I was responsible for the backend.";
  return `I ${firstForm(v.past)}.`;
}

function esc(s) {
  return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
}

function ygHref(word) {
  const w = String(word).trim();
  if (w.includes(" ")) {
    return `https://youglish.com/pronounce/${encodeURIComponent(w)}/english`;
  }
  const one = firstForm(w).replace(/[^A-Za-z'-]/g, "") || w;
  return `https://youglish.com/pronounce/${encodeURIComponent(one)}/english`;
}

function ygLink(word, label = "nativos") {
  return `<a class="yg" href="${ygHref(word)}" target="_blank" rel="noreferrer" title="YouGlish: oír esta palabra dicha por nativos">${esc(label)}</a>`;
}

function pairRow(p) {
  return `
    <div class="card" data-track="pair" data-pair="${esc(p.short)}|${esc(p.long)}">
      <div class="muted">${esc(p.why)}</div>
      <div class="row" style="margin-top:8px">
        <button class="say" data-say="${esc(p.short)}">${esc(p.short)} [${esc(p.shortPron)}]</button>
        ${ygLink(p.short)}
        <span>vs</span>
        <button class="say" data-say="${esc(p.long)}">${esc(p.long)} [${esc(p.longPron)}]</button>
        ${ygLink(p.long)}
      </div>
    </div>`;
}

function verbCard(v, compact = false) {
  const weak = weakSet().has(v.inf);
  const known = knownSet().has(v.inf);
  const fam = ENLAB.familyNames[v.fam] || v.fam;
  return `
    <div class="verb" data-track="verb" data-verb="${esc(v.inf)}">
      <div>
        <strong>${esc(v.inf)}</strong>
        ${isStarter(v) ? '<span class="pill">40</span>' : ""}
        ${v.work && !isStarter(v) ? '<span class="pill">trabajo</span>' : ""}
        ${weak ? '<span class="pill warn">débil</span>' : ""}
        ${known ? '<span class="pill ok">fuerte</span>' : ""}
        <div class="muted"><span class="es-line">${esc(v.es)}</span> · ${esc(fam)}</div>
      </div>
      <div>${esc(v.past)}<div class="muted">[${esc(v.pPast)}]</div></div>
      <div>${esc(v.pp)}<div class="muted">[${esc(v.pPp)}]</div></div>
      ${compact ? "" : `<div class="muted">[${esc(v.pInf)}]</div>`}
      <div class="row">
        <button class="say" data-say="${esc(v.inf)}">Presente</button>
        <button class="say" data-say="${esc(speakForms(v))}">3 formas</button>
        <button class="say" data-say="${esc(simplePastOf(v))}">I + pasado</button>
        <button class="say" data-say="${esc(perfectOf(v))}">I have…</button>
        ${ygLink(v.inf)}
        <button class="btn ghost sm" data-weak="${esc(v.inf)}">${weak ? "Ya no débil" : "Débil"}</button>
        <button class="btn ghost sm" data-known="${esc(v.inf)}">${known ? "Quitar fuerte" : "Fuerte"}</button>
      </div>
    </div>`;
}

function todaysDeck() {
  const weak = [...weakSet()].map((inf) => ENLAB.verbs.find((v) => v.inf === inf)).filter(Boolean);
  const work = verbsForLevel();
  const mixed = [
    ...seededShuffle(weak).slice(0, 4),
    ...seededShuffle(work).slice(0, 4),
    ...seededShuffle(ENLAB.verbs).slice(0, 12),
  ];
  const seen = new Set();
  const out = [];
  for (const v of mixed) {
    if (!seen.has(v.inf)) { seen.add(v.inf); out.push(v); }
    if (out.length === 10) break;
  }
  return out;
}

function dayTheme() {
  const [Y, M, D] = todayKey().split("-").map(Number);
  const i = Math.floor(Date.UTC(Y, M - 1, D) / 86400000) % ENLAB.plan.length;
  return { i: i + 1, text: ENLAB.plan[i] };
}

function renderLevelBar() {
  const cur = level();
  const box = $("#level-bar");
  if (!box || !ENLAB.cefr) return;
  box.innerHTML = Object.entries(ENLAB.cefr).map(([id, info]) => `
    <button type="button" class="level-chip ${cur === id ? "on" : ""}" data-cefr="${id}">
      ${esc(info.name)}
      <span>${esc(info.short || info.title)}</span>
    </button>
  `).join("");
  const meta = ENLAB.cefr[cur];
  const blurb = $("#level-blurb");
  if (blurb && meta) blurb.textContent = `${meta.goal} ${meta.next}`;
}

function phraseBank() {
  const n = lvlNum();
  if (n <= 1) return ENLAB.phrasesA1 || ENLAB.interview;
  if (n === 2) return [...(ENLAB.phrasesA1 || []), ...(ENLAB.phrasesB1 || []).slice(0, 5)];
  if (n === 3) return ENLAB.phrasesB1 || ENLAB.interview;
  return [...(ENLAB.phrasesB1 || []), ...(ENLAB.phrasesB2 || [])];
}

function renderHome() {
  const theme = dayTheme();
  const hint = $("#hoy-hint");
  const meta = ENLAB.cefr && ENLAB.cefr[level()];
  if (hint && meta) hint.textContent = `Nivel ${meta.name} (${meta.short || meta.title}). Cambia a medianoche.`;
  const n = lvlNum();
  let pairs = ENLAB.pairs || [];
  if (n <= 1) pairs = pairs.filter((p) => /E muda|i corta vs ii|i vs ii/i.test(p.why));
  else if (n === 2) pairs = pairs.filter((p) => !/now|know|said|walk/i.test(p.short + p.long));
  $("#day-theme").textContent = `Día del plan (ciclo 21): ${theme.i}/21 — ${theme.text}`;
  const daily = todaysDeck();
  const dailyPairs = seededShuffle(pairs).slice(0, 4);
  window._dailyPairs = dailyPairs;
  $("#daily-verbs").innerHTML = daily.map((v) => verbCard(v, true)).join("");
  $("#daily-pairs").innerHTML = dailyPairs.map(pairRow).join("");
  const dailyRole = $("#daily-role");
  if (dailyRole) {
    const roles = rolesForLevel();
    dailyRole.innerHTML = roles.length ? roleCard(seededShuffle(roles)[0]) : "";
  }
  renderHomeStats();
  renderHoyCheck();
  renderWeekStrip();
  renderDailyTip();
  renderEarMisses();
  upsertLog();
  renderClock();
  hoyPairI = 0;
}

function renderWeekStrip() {
  const el = $("#week-strip");
  if (!el) return;
  const by = Object.fromEntries(loadLogs().map((r) => [r.date, r]));
  const names = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push({ key: localDateKey(d), label: names[d.getDay()] });
  }
  el.innerHTML = `<div class="week-dots" aria-label="Actividad de la semana">${days.map((day) => {
    const row = by[day.key];
    const cls = row?.complete ? "full" : (row ? "some" : "");
    const title = row?.complete ? `${day.label}: sesión completa` : (row ? `${day.label}: algo hecho` : `${day.label}: sin práctica`);
    return `<div class="week-dot ${cls}" title="${esc(title)}"><span>${esc(day.label)}</span></div>`;
  }).join("")}</div>`;
}

function renderDailyTip() {
  const el = $("#daily-tip");
  if (!el) return;
  const tips = (ENLAB.bTips || []).filter((t) => (t.min || 3) <= lvlNum());
  if (tips.length) {
    const t = seededShuffle(tips)[0];
    el.hidden = false;
    el.innerHTML = `<p class="kicker">Tip del día</p><h3>${esc(t.title)}</h3><p>${esc(t.body)}</p><div class="row">${sayWords(t.listen || [])}${t.yg ? ygLink(t.yg) : ""}</div>`;
    return;
  }
  el.hidden = false;
  el.innerHTML = `<p class="kicker">Tip del día</p><h3>Pulsa el triángulo</h3><p>Cada botón con ▶ suena en inglés. Empieza oyendo cap y cape: esa diferencia es el primer gran paso.</p>`;
}

function posClass(pos) {
  if (/verb|presente/i.test(pos)) return "pos-v";
  if (/adjet/i.test(pos)) return "pos-a";
  return "pos-n";
}

function rolesForLevel() {
  return (ENLAB.wordRoles || []).filter((w) => (w.min || 2) <= lvlNum());
}

function roleCard(item) {
  return `
    <div class="card role-word">
      <h4>${esc(item.word)} ${item.roles.map((r) => `<span class="pill ${posClass(r.pos)}">${esc(r.pos)}</span>`).join("")}</h4>
      <p class="muted">${esc(item.change)}</p>
      <div class="role-grid">
        ${item.roles.map((r) => `
          <div class="role-card">
            <div><span class="pill ${posClass(r.pos)}">${esc(r.pos)}</span> <span class="muted">[${esc(r.pron)}]</span></div>
            <p>${esc(r.en)}</p>
            <p class="muted es-line">${esc(r.es)}</p>
            <div class="row">
              <button class="say" data-say="${esc(r.en)}" data-slow="1">Oír frase</button>
              ${ygLink(r.en, "nativos")}
            </div>
          </div>`).join("")}
      </div>
    </div>`;
}

function sayWords(words) {
  return (words || []).map((w) => `<button class="say" data-say="${esc(w)}">${esc(w)}</button>`).join("");
}

function renderGroupCards(box, groups, n) {
  if (!box) return;
  const list = (groups || []).filter((g) => (g.min || 2) <= n);
  box.innerHTML = list.map((g) => `
    <div class="card lesson" style="margin-bottom:12px">
      <h3>${esc(g.title)}</h3>
      <p>${esc(g.body)}</p>
      <div class="grid grid-2" style="margin-top:10px">
        ${(g.items || []).map((it) => `
          <div>
            <button class="say" data-say="${esc(it.word)}">${esc(it.word)} · ${esc(it.note || "")}</button>
            ${it.skip ? `<div class="muted">No suena: ${esc(it.skip)}</div>` : ""}
          </div>`).join("")}
      </div>
    </div>`).join("");
}

function renderVowels() {
  const n = lvlNum();
  const intros = n <= 1 ? ENLAB.vowelIntro.slice(0, 1) : ENLAB.vowelIntro;
  $("#vowel-intro").innerHTML = `<div class="card">${intros.map((p) => `<p>${esc(p)}</p>`).join("")}</div>`;
  $("#vowel-decide").innerHTML = ENLAB.decideSteps.filter((s) => (s.min || 1) <= n).map((s) => `
    <div class="card lesson">
      <h3>${esc(s.q)}</h3>
      <p>${esc(s.a)}</p>
    </div>`).join("");
  $("#vowel-rules").innerHTML = ENLAB.vowelRules.filter((r) => (r.min || 1) <= n).map((r) => `
    <div class="card lesson" style="margin-bottom:12px">
      <h3>${esc(r.title)}</h3>
      <p>${esc(r.body)}</p>
      ${r.teams ? `<div class="mini-table">${r.teams.map((row) => `
        <div><strong>${esc(row[0])}</strong> → ${esc(row[1])}<div class="muted">${esc(row[2])}${row[3] ? " · " + esc(row[3]) : ""}</div></div>
      `).join("")}</div>` : ""}
      ${r.pairs ? `<div class="row" style="margin:10px 0">${r.pairs.map((p) => `
        <button class="say" data-say="${esc(p[0])}">${esc(p[0])}</button>
        <span>→</span>
        <button class="say" data-say="${esc(p[1])}">${esc(p[1])}</button>
      `).join("")}</div>` : ""}
      ${r.listen ? `<div class="row">${sayWords(r.listen)}</div>` : ""}
      ${r.note ? `<p class="note">${esc(r.note)}</p>` : ""}
    </div>`).join("");
  $("#vowel-key").innerHTML = `<div class="mini-table">${ENLAB.vowelKey.map((row) => `
    <div><strong>${esc(row[0])}</strong> · ${esc(row[1])}<div class="muted">Ej.: ${esc(row[2])}</div></div>
  `).join("")}</div>`;

  const letters = n <= 1 ? [...ENLAB.vowels] : [...ENLAB.vowels, ENLAB.letterExtra.Y];
  $("#vowel-maps").innerHTML = letters.map((v) => `
    <div class="card">
      <h3>Letra ${esc(v.letter)}</h3>
      <p class="muted">${esc(ENLAB.letterNotes[v.letter] || "")}</p>
      ${v.sounds.map((s) => `
        <p><strong>${esc(s.ipa)}</strong> · ${esc(s.when)}</p>
        <div class="row">${s.examples.map((w) => `<button class="say" data-say="${esc(w)}">${esc(w)}</button>`).join("")}</div>
      `).join("")}
    </div>`).join("");

  $("#vowel-pairs").innerHTML = ENLAB.pairs.map(pairRow).join("");

  $("#vowel-traps").innerHTML = ENLAB.traps.map((t) => `
    <div class="card">
      <div class="muted">Evita: ${esc(t.bad)}</div>
      <p><strong>${esc(t.good)}</strong></p>
      <p class="muted">${esc(t.tip)}</p>
    </div>`).join("");

  $("#stress-list").innerHTML = "";

  const rolesBox = $("#roles-list");
  if (rolesBox) rolesBox.innerHTML = rolesForLevel().map((w) => roleCard(w)).join("");

  $("#ough-list").innerHTML = ENLAB.ough.map((o) => `
    <span class="row">${`<button class="say" data-say="${esc(o.word)}">${esc(o.word)} [${esc(o.pron)}] — ${esc(o.es)}</button>`}${ygLink(o.word)}</span>
  `).join("");

  renderGroupCards($("#silent-list"), ENLAB.dropLetters, n);
  renderGroupCards($("#endings-list"), ENLAB.tailTalk, n);

  $("#contraction-list").innerHTML = ENLAB.contractions.map((c) => `
    <div class="card">
      <strong>${esc(c.en)}</strong> = ${esc(c.full)}
      <div class="muted es-line">${esc(c.es)}</div>
      <button class="say" data-say="${esc(c.say)}">Escuchar</button>
      ${ygLink(c.en.split(" ")[0])}
    </div>`).join("");

  const rhythmBox = $("#rhythm-list");
  if (rhythmBox) {
    rhythmBox.innerHTML = (ENLAB.rhythm || []).filter((r) => (r.min || 3) <= n).map((r) => `
      <div class="card lesson" style="margin-bottom:12px">
        <h3>${esc(r.title)}</h3>
        <p>${esc(r.body)}</p>
        <div class="row">${sayWords(r.listen)}</div>
      </div>`).join("");
  }

  const tipsBox = $("#tips-list");
  if (tipsBox) {
    tipsBox.innerHTML = (ENLAB.bTips || []).filter((t) => (t.min || 3) <= n).map((t) => `
      <div class="card lesson" style="margin-bottom:12px">
        <div class="kicker">${esc(t.tag || "")}</div>
        <h3>${esc(t.title)}</h3>
        <p>${esc(t.body)}</p>
        <div class="row">${sayWords(t.listen || [])}${t.yg ? ygLink(t.yg) : ""}</div>
      </div>`).join("");
  }
}

function filteredVerbs() {
  const q = FILTERS.q.trim().toLowerCase();
  const weak = weakSet();
  const known = knownSet();
  return ENLAB.verbs.filter((v) => {
    if (FILTERS.fam !== "all" && v.fam !== FILTERS.fam) return false;
    if (FILTERS.only === "level" && !isLevelVerb(v)) return false;
    if (FILTERS.only === "starter" && !isStarter(v)) return false;
    if (FILTERS.only === "work" && !v.work) return false;
    if (FILTERS.only === "weak" && !weak.has(v.inf)) return false;
    if (FILTERS.only === "unknown" && known.has(v.inf)) return false;
    if (!q) return true;
    return `${v.inf} ${v.past} ${v.pp} ${v.es}`.toLowerCase().includes(q);
  });
}

function renderVerbFilters() {
  const fams = Object.entries(ENLAB.familyNames).map(([k, label]) =>
    `<button class="chip ${FILTERS.fam === k ? "on" : ""}" data-fam="${k}">${esc(label)}</button>`).join("");
  $("#verb-filters").innerHTML = `
    <button class="chip ${FILTERS.fam === "all" ? "on" : ""}" data-fam="all">Todas (${ENLAB.verbs.length})</button>
    ${fams}
    <button class="chip ${FILTERS.only === "level" ? "on" : ""}" data-only="level">Mazo del nivel (${verbsForLevel().length})</button>
    <button class="chip ${FILTERS.only === "starter" ? "on" : ""}" data-only="starter">40 frecuentes</button>
    <button class="chip ${FILTERS.only === "all" ? "on" : ""}" data-only="all">Todos (${ENLAB.verbs.length})</button>
    <button class="chip ${FILTERS.only === "work" ? "on" : ""}" data-only="work">Trabajo</button>
    <button class="chip ${FILTERS.only === "weak" ? "on" : ""}" data-only="weak">Débiles</button>
    <button class="chip ${FILTERS.only === "unknown" ? "on" : ""}" data-only="unknown">Sin fuerte</button>
  `;
}

function renderVerbs() {
  const box = $("#verb-list");
  if (!box) return;
  renderVerbFilters();
  const list = filteredVerbs();
  const slice = list.slice(0, verbLimit);
  box.innerHTML = slice.map((v) => verbCard(v)).join("")
    || "<p>No hay coincidencias.</p>";
  if (slice.length && slice.length < list.length) {
    box.insertAdjacentHTML("beforeend",
      `<p style="margin:14px 0 0"><button type="button" class="btn" data-verb-more>Ver más (${list.length - slice.length})</button></p>`);
  }
  $("#verb-count").textContent = `${Math.min(slice.length, list.length)} de ${list.length} visibles · ${ENLAB.verbs.length} en total`;
}

function uniqueOpts(correct, pool) {
  const opts = [correct];
  for (const x of shuffle(pool)) {
    if (x !== correct && !opts.includes(x)) opts.push(x);
    if (opts.length === 4) break;
  }
  return shuffle(opts);
}

function earKey(p) {
  return `${p.a}|${p.b}`;
}

function earWeakSet() { return loadSet("enlab-ear-weak"); }

function earStats() {
  try {
    const raw = JSON.parse(localStorage.getItem("enlab-ear-stats") || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

function bumpEar(key, ok) {
  if (!key) return;
  const s = earStats();
  const row = s[key] || { right: 0, wrong: 0 };
  if (ok) row.right += 1;
  else row.wrong += 1;
  s[key] = row;
  localStorage.setItem("enlab-ear-stats", JSON.stringify(s));
  if (!ok) {
    const w = earWeakSet();
    w.add(key);
    saveSet("enlab-ear-weak", w);
  }
}

function worstEarPairs(limit = 8) {
  const stats = earStats();
  return Object.entries(stats)
    .map(([k, v]) => ({
      k,
      right: v.right || 0,
      wrong: v.wrong || 0,
    }))
    .filter((x) => x.wrong > 0 && x.k.includes("|"))
    .sort((a, b) => {
      const ar = a.wrong / Math.max(1, a.right + a.wrong);
      const br = b.wrong / Math.max(1, b.right + b.wrong);
      return b.wrong - a.wrong || br - ar;
    })
    .slice(0, limit);
}

function renderEarMisses() {
  const rows = worstEarPairs();
  const html = rows.length ? `
    <p class="kicker">Pares que más fallas</p>
    <ul class="miss-list">
      ${rows.map((r) => {
        const [a, b] = r.k.split("|");
        const n = r.right + r.wrong;
        return `<li>
          <button type="button" class="say" data-say="${esc(a)}">${esc(a)}</button>
          <span>vs</span>
          <button type="button" class="say" data-say="${esc(b)}">${esc(b)}</button>
          <span class="muted">${r.wrong} fallo${r.wrong === 1 ? "" : "s"} · ${n} veces</span>
        </li>`;
      }).join("")}
    </ul>` : "";
  ["ear-misses", "hoy-misses"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.hidden = !rows.length;
    el.innerHTML = html;
  });
}

function earBank() {
  const fromData = (ENLAB.pairs || [])
    .filter((p) => p.short.toLowerCase() !== p.long.toLowerCase())
    .map((p) => ({ a: p.short, b: p.long, pa: p.shortPron, pb: p.longPron, why: p.why }));
  const extra = ENLAB.earPairs || [];
  const seen = new Set();
  const out = [];
  for (const p of [...extra, ...fromData]) {
    if (p.a.toLowerCase() === p.b.toLowerCase()) continue;
    if ((p.min || 1) > lvlNum()) continue;
    const k = [p.a, p.b].map((x) => x.toLowerCase()).sort().join("|");
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  if (lvlNum() <= 1) {
    return out.filter((p) => /E muda|i corta vs ii|i vs ii|ä vs ei/i.test(p.why));
  }
  if (lvlNum() === 2) {
    return out.filter((p) => !/ough|walk|work|said|now/i.test(`${p.a} ${p.b} ${p.why}`));
  }
  return out;
}

function makeEarItems(exam = false) {
  const bank = earBank();
  const weak = earWeakSet();
  const stats = earStats();
  const scored = bank.map((p) => {
    const k = earKey(p);
    const row = stats[k] || {};
    const wrong = row.wrong || 0;
    const n = (row.right || 0) + wrong;
    return { p, k, wrong, rate: wrong / Math.max(1, n), flagged: weak.has(k) };
  });
  const hard = scored.filter((x) => x.wrong > 0 || x.flagged).sort((a, b) => b.wrong - a.wrong || b.rate - a.rate).map((x) => x.p);
  const rest = scored.filter((x) => x.wrong === 0 && !x.flagged).map((x) => x.p);
  const takeHard = Math.min(hard.length, exam ? 7 : 4);
  const ordered = [...shuffle(hard).slice(0, takeHard)];
  for (const p of shuffle(rest)) {
    if (ordered.length >= 10) break;
    ordered.push(p);
  }
  for (const p of shuffle(bank)) {
    if (ordered.length >= 10) break;
    if (!ordered.includes(p)) ordered.push(p);
  }
  const pool = exam ? ordered.slice(0, 10) : shuffle(ordered.slice(0, 10));
  return pool.map((p) => {
    const left = Math.random() < 0.5;
    const spoken = left ? p.a : p.b;
    return {
      type: "ear",
      exam,
      q: "¿Qué palabra oíste?",
      a: spoken,
      opts: shuffle([p.a, p.b]),
      labels: {
        [p.a]: `${p.a}  [${p.pa}]`,
        [p.b]: `${p.b}  [${p.pb}]`,
      },
      say: spoken,
      why: p.why,
      inf: earKey(p),
      pair: p,
    };
  });
}

function verbSource() {
  const limit = $("#quiz-starter")?.checked !== false;
  const base = limit ? verbsForLevel() : ENLAB.verbs;
  return base.length ? base : ENLAB.verbs;
}

function makeQuizItems() {
  if (quiz.mode === "ear" || quiz.mode === "exam") return makeEarItems(quiz.mode === "exam");
  const hideEs = hideEsOn();
  const source = verbSource();
  const weak = [...weakSet()].map((inf) => source.find((v) => v.inf === inf)).filter(Boolean);
  const pool = shuffle([...weak, ...shuffle(source)]).filter((v, i, a) => a.findIndex((x) => x.inf === v.inf) === i).slice(0, 12);
  const items = [];
  for (const v of pool) {
    const mode = Math.random();
    if (quiz.mode === "type") {
      const kind = mode < 0.5 ? "past" : "pp";
      items.push({
        type: "type",
        q: kind === "past" ? `Escribe el pasado de “${v.inf}”` : `Escribe el participio de “${v.inf}” (I have ____)`,
        esHint: kind === "past" ? v.es : "",
        a: kind === "past" ? v.past : v.pp,
        say: v.inf,
        inf: v.inf,
      });
    } else if (mode < 0.35 || (hideEs && mode >= 0.65)) {
      items.push({
        type: "choice",
        q: `Pasado de “${v.inf}”`,
        esHint: v.es,
        a: v.past,
        opts: uniqueOpts(v.past, verbSource().map((x) => x.past)),
        say: v.inf,
        inf: v.inf,
      });
    } else if (mode < 0.65) {
      items.push({
        type: "choice",
        q: `Participio de “${v.inf}” (I have ____)`,
        a: v.pp,
        opts: uniqueOpts(v.pp, verbSource().map((x) => x.pp)),
        say: v.inf,
        inf: v.inf,
      });
    } else {
      items.push({
        type: "choice",
        q: `¿Qué significa “${v.inf} / ${v.past} / ${v.pp}”?`,
        a: v.es,
        opts: uniqueOpts(v.es, verbSource().map((x) => x.es)),
        say: speakForms(v),
        inf: v.inf,
      });
    }
  }
  return items;
}

function norm(s) {
  return s.toLowerCase().replaceAll(" / ", "/").split("/")[0].trim().replace(/\s+/g, " ");
}

function quizQ(it) {
  const hint = it.esHint ? ` <span class="es-line">(${esc(it.esHint)})</span>` : "";
  return `${esc(it.q)}${hint}`;
}

function answersMatch(user, correct) {
  const u = norm(user);
  const parts = correct.toLowerCase().split("/").map((p) => p.trim());
  return parts.some((p) => norm(p) === u);
}

function renderQuiz() {
  clearEarTimers();
  const box = $("#quiz-box");
  if (quiz.i >= quiz.items.length) {
    const ear = quiz.mode === "ear" || quiz.mode === "exam";
    if (!ear && quiz.fails.length) {
      const w = weakSet();
      quiz.fails.forEach((inf) => w.add(inf));
      saveSet("enlab-weak", w);
    }
    if (ear && quiz.fails.length) {
      const w = earWeakSet();
      quiz.fails.forEach((k) => w.add(k));
      saveSet("enlab-ear-weak", w);
    }
    if (!quiz.fails.length) buzz(true);
    box.innerHTML = `<div class="card">
      <h3>Terminado</h3>
      <p class="score">${quiz.score} / ${quiz.items.length}</p>
      <p class="muted">${quiz.fails.length
        ? (ear ? `Repite estos pares: ${quiz.fails.map((k) => k.replace("|", " / ")).join(", ")}` : `Se marcaron como débiles: ${quiz.fails.join(", ")}`)
        : "Sin fallos. Bien."}</p>
      ${ear ? `<p class="muted">Tip: oye gente real en <a href="https://youglish.com/pronounce/sheep/english" target="_blank" rel="noreferrer">YouGlish</a> (ship vs sheep).</p>` : ""}
      <button class="btn" id="quiz-again">Otro round</button>
    </div>`;
    markSession("quizDone");
    $("#quiz-again")?.addEventListener("click", startQuiz);
    renderVerbs();
    renderHome();
    renderEarMisses();
    return;
  }
  const it = quiz.items[quiz.i];
  if (it.type === "type") {
    box.innerHTML = `<div class="card">
      <div class="muted">Pregunta ${quiz.i + 1} / ${quiz.items.length} · Aciertos ${quiz.score}</div>
      <div class="quiz-q">${quizQ(it)}</div>
      <div class="row"><button class="btn ghost" data-say="${esc(it.say)}">Escuchar</button></div>
      <input id="quiz-input" type="text" autocomplete="off" placeholder="Escribe aquí (se acepta la 1ª forma: gotten o got)" />
      <button class="btn" id="quiz-submit" style="margin-top:8px">Comprobar</button>
      <p class="status" id="quiz-typed"></p>
    </div>`;
    $("#quiz-input").focus();
    const submit = () => {
      const val = $("#quiz-input").value;
      const ok = answersMatch(val, it.a);
      $("#quiz-typed").textContent = ok ? "Correcto" : `Era: ${it.a}`;
      $("#quiz-typed").className = `status ${ok ? "ok" : "bad"}`;
      if (ok) quiz.score += 1;
      else quiz.fails.push(it.inf);
      bump("quiz");
      setTimeout(() => { quiz.i += 1; renderQuiz(); }, 900);
    };
    $("#quiz-submit").addEventListener("click", submit);
    $("#quiz-input").addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    return;
  }
  if (it.type === "ear") {
    const exam = quiz.mode === "exam" || it.exam;
    const warm = !exam && earWarmupOn();
    const label = (o, i) => exam ? `${i + 1}. ${esc(o)}` : `${i + 1}. ${esc(it.labels[o] || o)}`;
    box.innerHTML = `<div class="card">
      <div class="muted">${exam ? "Examen" : "Oído"} ${quiz.i + 1} / ${quiz.items.length} · Aciertos ${quiz.score}${exam ? "" : ` · ${esc(it.why)}`}</div>
      <div class="quiz-q">${exam
        ? "Oye primero. Las dos palabras aparecen al terminar."
        : (warm ? "Primero oyes las dos. Después UNA. Elige esa." : "Oye UNA. Luego elige. (1 / 2 en el teclado)")}</div>
      ${exam ? "" : `<label class="muted"><input type="checkbox" id="ear-warmup" ${warm ? "checked" : ""}> Calentamiento: oír las dos y después la pregunta</label>`}
      <div class="row" style="margin-top:10px">
        ${exam ? "" : `<button type="button" class="btn ghost" id="ear-both">Oír las dos</button>`}
        <button type="button" class="btn" id="ear-one">${exam ? "Oír otra vez" : "Oír la pregunta"}</button>
        ${exam ? "" : `${ygLink(it.opts[0])} ${ygLink(it.opts[1])}`}
      </div>
      <div class="ear-choices-wrap">
        ${exam ? `<div class="ear-veil" id="ear-veil">Escuchando…</div>` : ""}
        <div class="choices ear" style="margin-top:14px">
          ${it.opts.map((o, i) => `<button data-opt="${encodeURIComponent(o)}" ${exam ? "disabled" : ""}>${label(o, i)}</button>`).join("")}
        </div>
      </div>
      ${exam ? `<p class="muted">Sin calentamiento y sin ver las palabras hasta oír. Espacio = repetir.</p>` : `<p class="muted">YouGlish es nativo, pero revela la palabra: úsalo si ya respondiste o para estudiar el par.</p>`}
    </div>`;
    $("#ear-warmup")?.addEventListener("change", (ev) => setEarWarmup(ev.target.checked));
    if (exam) {
      const token = `${quiz.i}-exam`;
      window._earExamToken = token;
      const reveal = () => {
        if (window._earExamToken !== token) return;
        $("#ear-veil")?.remove();
        $$(".choices.ear button").forEach((b) => { b.disabled = false; });
      };
      playEarSequence(it, false).then(reveal);
      window._earTimers.push(setTimeout(reveal, 4000));
    } else {
      const lockMs = warm ? 2800 : 0;
      if (lockMs) {
        $$(".choices.ear button").forEach((b) => { b.disabled = true; });
        window._earTimers.push(setTimeout(() => {
          $$(".choices.ear button").forEach((b) => { b.disabled = false; });
        }, lockMs));
      }
      playEarSequence(it, warm);
    }
    return;
  }
  box.innerHTML = `<div class="card">
    <div class="muted">Pregunta ${quiz.i + 1} / ${quiz.items.length} · Aciertos ${quiz.score}</div>
    <div class="quiz-q">${quizQ(it)}</div>
    <div class="row"><button class="btn ghost" data-say="${esc(it.say)}">Escuchar</button></div>
    <div class="choices" style="margin-top:12px">
      ${it.opts.map((o) => `<button data-opt="${encodeURIComponent(o)}">${esc(o)}</button>`).join("")}
    </div>
  </div>`;
}

function startQuiz() {
  const mode = $("#quiz-mode")?.value || "choice";
  quiz = { i: 0, score: 0, items: [], fails: [], mode };
  quiz.items = makeQuizItems();
  renderQuiz();
  $("#quiz-box")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function speakPool() {
  const starterOnly = $("#speak-starter")?.checked !== false;
  const verbs = starterOnly ? verbsForLevel() : ENLAB.verbs;
  const extra = phraseBank();
  return [
    ...verbs.map((v) => ({ target: v.inf, helpHtml: `<span class="es-line">${esc(v.es)}</span> · [${esc(v.pInf)}]` })),
    ...verbs.map((v) => ({ target: simplePastOf(v), help: `Pasado de ${v.inf} (ayer)` })),
    ...(lvlNum() >= 2 ? verbs.map((v) => ({ target: perfectOf(v), help: `Present perfect de ${v.inf}` })) : []),
    ...extra.map((s) => ({ target: s.en, helpHtml: `<span class="es-line">${esc(s.es)}</span>` })),
    ...(lvlNum() >= 2 ? ENLAB.contractions.map((c) => ({ target: c.say, helpHtml: `${esc(c.full)} · <span class="es-line">${esc(c.es)}</span>` })) : []),
  ];
}

function renderSpeak() {
  window._speakPool = speakPool();
  pickSpeak();
}

function pickSpeak() {
  const pool = window._speakPool || speakPool();
  const item = shuffle(pool)[0];
  window._speakTarget = item;
  $("#speak-target").textContent = item.target;
  const helpEl = $("#speak-help");
  if (helpEl) {
    if (item.helpHtml) helpEl.innerHTML = item.helpHtml;
    else helpEl.textContent = item.help || "";
  }
  $("#speak-status").textContent = "";
  $("#speak-status").className = "status";
}

function stopRecordingTracks() {
  recState.stream?.getTracks().forEach((t) => t.stop());
  recState.stream = null;
}

function stopRecording(save) {
  if (recState.rec && recState.rec.state !== "inactive") {
    recState.rec.stop();
  }
  if (!save) stopRecordingTracks();
  $("#speak-rec")?.classList.remove("rec-on");
  const btn = $("#speak-rec");
  if (btn) btn.textContent = "Grabarme";
}

async function toggleRecording() {
  if (recState.rec && recState.rec.state === "recording") {
    recState.rec.stop();
    return;
  }
  try {
    recState.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    $("#speak-status").textContent = "No hay micrófono o no diste permiso. En Chrome: candado de la barra de dirección → Micrófono.";
    $("#speak-status").className = "status bad";
    return;
  }
  recState.chunks = [];
  const mime = ["audio/webm", "audio/mp4", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported(t));
  recState.rec = mime ? new MediaRecorder(recState.stream, { mimeType: mime }) : new MediaRecorder(recState.stream);
  recState.rec.ondataavailable = (e) => { if (e.data && e.data.size) recState.chunks.push(e.data); };
  recState.rec.onstop = () => {
    stopRecordingTracks();
    const btn = $("#speak-rec");
    if (btn) {
      btn.textContent = "Grabarme";
      btn.classList.remove("rec-on");
    }
    if (!recState.chunks.length) return;
    const blob = new Blob(recState.chunks, { type: recState.rec.mimeType || "audio/webm" });
    if (recState.url) URL.revokeObjectURL(recState.url);
    recState.url = URL.createObjectURL(blob);
    const player = $("#speak-playback");
    if (player) {
      player.src = recState.url;
      player.hidden = false;
    }
    $("#speak-status").textContent = "Escucha el modelo, luego tu grabación, luego el modelo otra vez.";
    $("#speak-status").className = "status ok";
    bump("spoke");
    if (window._speakTarget) markSession("phrases", window._speakTarget.target);
  };
  recState.rec.start();
  $("#speak-rec").textContent = "Detener";
  $("#speak-rec").classList.add("rec-on");
  $("#speak-status").textContent = "Grabando… di la frase. Pulsa Detener.";
  $("#speak-status").className = "status";
}

function startRecognition() {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Rec) {
    $("#speak-status").textContent = "Este navegador no reconoce voz. Usa Chrome o Edge.";
    $("#speak-status").className = "status bad";
    return;
  }
  const rec = new Rec();
  rec.lang = "en-US";
  rec.interimResults = false;
  $("#speak-status").textContent = "Habla ahora…";
  rec.onresult = (ev) => {
    const said = ev.results[0][0].transcript.trim();
    const target = window._speakTarget.target.toLowerCase().replace(/[.,']/g, "");
    const got = said.toLowerCase().replace(/[.,']/g, "");
    const ok = got === target || target.includes(got) || got.includes(target.split(" ")[0]);
    $("#speak-status").textContent = ok
      ? `Bien: te entendió “${said}”`
      : `Dijo reconocer “${said}”. Objetivo: “${window._speakTarget.target}”. No es un juez de acento: escucha y repite.`;
    $("#speak-status").className = `status ${ok ? "ok" : "bad"}`;
    bump("spoke");
    if (window._speakTarget) markSession("phrases", window._speakTarget.target);
  };
  rec.onerror = () => {
    $("#speak-status").textContent = "No se oyó. Revisa el micrófono y vuelve a intentar.";
    $("#speak-status").className = "status bad";
  };
  rec.start();
}

function renderAI() {
  $("#ai-prompts").innerHTML = ENLAB.prompts.map((p, i) => `
    <div class="card">
      <h3>${esc(p.title)}</h3>
      <pre class="prompt" id="pr-${i}">${esc(p.text)}</pre>
      <button class="btn ghost" data-copy="pr-${i}">Copiar prompt</button>
    </div>`).join("");
  $("#plan-list").innerHTML = ENLAB.plan.map((d, i) => `<li>Día ${i + 1}: ${esc(d)}</li>`).join("");
}

function renderInterview() {
  const lines = seededShuffle(phraseBank()).slice(0, 2);
  $("#interview-list").innerHTML = lines.map((s) => `
    <div class="card" data-track="phrase" data-phrase="${esc(s.en)}">
      <p>${esc(s.en)}</p>
      <p class="muted es-line">${esc(s.es)}</p>
      <div class="row">
        <button class="say" data-say="${esc(s.en)}">Escuchar</button>
        ${ygLink(s.en, "nativos")}
      </div>
    </div>`).join("");
}

function earWarmupOn() {
  const v = localStorage.getItem("enlab-ear-warmup");
  return v === null ? true : v === "1";
}

function setEarWarmup(on) {
  localStorage.setItem("enlab-ear-warmup", on ? "1" : "0");
}

function clearEarTimers() {
  (window._earTimers || []).forEach(clearTimeout);
  window._earTimers = [];
  window.speechSynthesis.cancel();
}

function playEarSequence(it, warmup) {
  clearEarTimers();
  const t = window._earTimers = [];
  const later = (fn, ms) => t.push(setTimeout(fn, ms));
  if (warmup) {
    later(() => speak(it.opts[0], true), 220);
    later(() => speak(it.opts[1], true), 1300);
    return new Promise((resolve) => {
      later(() => { speak(it.say, true).then(resolve); }, 2500);
    });
  }
  return new Promise((resolve) => {
    later(() => { speak(it.say, true).then(resolve); }, 280);
  });
}

document.addEventListener("click", (e) => {
  const tab = e.target.closest("[data-tab]");
  if (tab) showTab(tab.dataset.tab);

  const jump = e.target.closest("[data-jump]");
  if (jump) {
    e.preventDefault();
    showTab("vocales");
    const el = document.getElementById(jump.dataset.jump);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  const fam = e.target.closest("[data-fam]");
  if (fam) { FILTERS.fam = fam.dataset.fam; verbLimit = 24; renderVerbs(); }

  const cefr = e.target.closest("[data-cefr]");
  if (cefr) {
    localStorage.setItem("enlab-cefr", cefr.dataset.cefr);
    FILTERS.only = "level";
    applyLevel();
  }

  const only = e.target.closest("[data-only]");
  if (only) { FILTERS.only = only.dataset.only; verbLimit = 24; renderVerbs(); }

  if (e.target.closest("[data-verb-more]")) {
    verbLimit += 24;
    dirty.verbs = false;
    renderVerbs();
  }

  const weakBtn = e.target.closest("[data-weak]");
  if (weakBtn) {
    const w = weakSet();
    const k = weakBtn.dataset.weak;
    if (w.has(k)) w.delete(k); else w.add(k);
    saveSet("enlab-weak", w);
    renderVerbs();
    renderHome();
  }

  const knownBtn = e.target.closest("[data-known]");
  if (knownBtn) {
    const s = knownSet();
    const k = knownBtn.dataset.known;
    if (s.has(k)) s.delete(k); else s.add(k);
    saveSet("enlab-known", s);
    renderVerbs();
    renderHome();
  }

  const say = e.target.closest("[data-say]");
  if (say) {
    $$(".say.playing").forEach((b) => b.classList.remove("playing"));
    say.classList.add("playing");
    Promise.resolve(speak(say.dataset.say, say.dataset.slow === "1"))
      .finally(() => say.classList.remove("playing"));
    bump("heard");
    const box = say.closest("[data-track]");
    if (box?.dataset.track === "pair") markSession("pairs", box.dataset.pair);
    if (box?.dataset.track === "verb") markSession("verbs", box.dataset.verb);
    if (box?.dataset.track === "phrase") markSession("phrases", box.dataset.phrase);
  }

  const themeBtn = e.target.closest("[data-theme-set]");
  if (themeBtn) {
    localStorage.setItem("enlab-theme", themeBtn.dataset.themeSet);
    applyTheme();
  }

  const hideEsBtn = e.target.closest("[data-hide-es]");
  if (hideEsBtn) {
    localStorage.setItem("enlab-hide-es", hideEsOn() ? "0" : "1");
    applyHideEs();
  }

  const rateBtn = e.target.closest("[data-rate]");
  if (rateBtn) {
    localStorage.setItem("enlab-rate", rateBtn.dataset.rate);
    renderRateBar();
  }

  const copy = e.target.closest("[data-copy]");
  if (copy) {
    const text = document.getElementById(copy.dataset.copy).textContent;
    navigator.clipboard.writeText(text);
    copy.textContent = "Copiado";
    setTimeout(() => { copy.textContent = "Copiar prompt"; }, 1200);
  }

  const opt = e.target.closest("[data-opt]");
  if (opt && quiz.items[quiz.i] && (quiz.items[quiz.i].type === "choice" || quiz.items[quiz.i].type === "ear")) {
    const val = decodeURIComponent(opt.dataset.opt);
    const it = quiz.items[quiz.i];
    $$(".choices button").forEach((b) => { b.disabled = true; });
    if (val === it.a) {
      opt.classList.add("ok");
      quiz.score += 1;
    } else {
      opt.classList.add("bad");
      quiz.fails.push(it.inf);
      $$(".choices button").forEach((b) => {
        if (decodeURIComponent(b.dataset.opt) === it.a) b.classList.add("ok");
      });
      if (it.type === "ear") speak(it.a, true);
    }
    if (it.type === "ear") {
      bumpEar(it.inf, val === it.a);
      renderEarMisses();
    }
    bump("quiz");
    setTimeout(() => { quiz.i += 1; renderQuiz(); }, it.type === "ear" ? 1300 : 700);
  }

  if (e.target.closest("#start-ear-from-oido")) {
    const sel = $("#quiz-mode");
    if (sel) sel.value = "ear";
    showTab("quiz");
    startQuiz();
  }

  if (e.target.closest("#ear-both") && quiz.items[quiz.i]?.type === "ear") {
    const it = quiz.items[quiz.i];
    clearEarTimers();
    speak(it.opts[0], true);
    window._earTimers.push(setTimeout(() => speak(it.opts[1], true), 1100));
  }
  if (e.target.closest("#ear-one") && quiz.items[quiz.i]?.type === "ear") {
    playEarSequence(quiz.items[quiz.i], false);
  }

  if (e.target.closest("#hoy-timer-btn")) toggleTimer();
  if (e.target.closest("#play-daily-pairs")) playDailyPairs();

  const qMode = e.target.closest("[data-quiz-mode]");
  if (qMode && $("#quiz-mode")) {
    $("#quiz-mode").value = qMode.dataset.quizMode;
    syncQuizModePicks();
  }
});

function syncQuizModePicks() {
  const v = $("#quiz-mode")?.value || "choice";
  $$("[data-quiz-mode]").forEach((b) => {
    b.classList.toggle("on", b.dataset.quizMode === v);
    b.setAttribute("aria-pressed", b.dataset.quizMode === v ? "true" : "false");
  });
}

$("#verb-search")?.addEventListener("input", (e) => {
  FILTERS.q = e.target.value;
  verbLimit = 24;
  renderVerbs();
});
$("#quiz-start")?.addEventListener("click", startQuiz);
$("#speak-rec")?.addEventListener("click", () => toggleRecording());
$("#speak-starter")?.addEventListener("change", () => renderSpeak());
$("#speak-go")?.addEventListener("click", startRecognition);
$("#speak-next")?.addEventListener("click", pickSpeak);
$("#speak-listen")?.addEventListener("click", () => {
  if (window._speakTarget) {
    speak(window._speakTarget.target, true);
    bump("heard");
    markSession("phrases", window._speakTarget.target);
  }
});
$("#prog-export")?.addEventListener("click", exportProgress);
$("#prog-import")?.addEventListener("click", () => $("#prog-file")?.click());
$("#prog-file")?.addEventListener("change", (e) => {
  const f = e.target.files && e.target.files[0];
  if (f) importProgress(f);
  e.target.value = "";
});

document.addEventListener("keydown", (e) => {
  if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
  const onEar = currentTab === "quiz" && quiz.items[quiz.i]?.type === "ear";
  if (onEar) {
    if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      playEarSequence(quiz.items[quiz.i], false);
      return;
    }
    const idx = e.key === "1" ? 0 : e.key === "2" ? 1 : -1;
    if (idx < 0) return;
    const btn = $$(".choices.ear button")[idx];
    if (btn && !btn.disabled) btn.click();
    return;
  }
  if (currentTab !== "hoy") return;
  if (e.key === " " || e.code === "Space") {
    e.preventDefault();
    playNextHoyPair();
    return;
  }
  if (e.key >= "1" && e.key <= "4") {
    e.preventDefault();
    jumpHoyStep(Number(e.key));
  }
});

function renderOidoToc() {
  const n = lvlNum();
  const items = [
    { id: "oido-decidir", label: "Decidir", min: 1 },
    { id: "oido-reglas", label: "Reglas", min: 1 },
    { id: "oido-clave", label: "Clave", min: 1 },
    { id: "oido-mapa", label: "Mapa A–U", min: 1 },
    { id: "oido-contrastes", label: "Contrastes", min: 1 },
    { id: "oido-trampas", label: "Trampas", min: 1 },
    { id: "oido-mudas", label: "Mudas / se comen", min: 2 },
    { id: "oido-contra", label: "Contracciones", min: 2 },
    { id: "oido-endings", label: "-tion / golpe", min: 2 },
    { id: "oido-roles", label: "Verbo / nombre", min: 2 },
    { id: "oido-ough", label: "ough", min: 3 },
    { id: "oido-ritmo", label: "Ritmo", min: 3 },
    { id: "oido-tips", label: "Tips B1/B2", min: 3 },
  ].filter((i) => n >= i.min);
  const nav = $("#oido-toc");
  if (!nav) return;
  nav.innerHTML = items.map((i) => `<a href="#${i.id}" data-jump="${i.id}">${esc(i.label)}</a>`).join("");
}

function playDailyPairs() {
  const pairs = window._dailyPairs || [];
  if (!pairs.length) return;
  pairs.forEach((p) => markSession("pairs", `${p.short}|${p.long}`));
  bump("heard");
  speakQueue(pairs.flatMap((p) => [p.short, p.long]), true);
}

function playNextHoyPair() {
  const pairs = window._dailyPairs || [];
  if (!pairs.length) {
    jumpHoyStep(1);
    return;
  }
  const i = hoyPairI % pairs.length;
  hoyPairI = i + 1;
  const p = pairs[i];
  const key = `${p.short}|${p.long}`;
  markSession("pairs", key);
  bump("heard");
  $$("#daily-pairs .card").forEach((c) => c.classList.toggle("flash", c.dataset.pair === key));
  const el = document.querySelector("#daily-pairs [data-pair=\"" + CSS.escape(key) + "\"]");
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
  speakQueue([p.short, p.long], true);
}

function jumpHoyStep(n) {
  const map = {
    1: "#hoy-step-1",
    2: lvlNum() >= 2 ? "#block-daily-role" : "#hoy-step-3",
    3: "#hoy-step-3",
    4: "#hoy-step-4",
  };
  const el = $(map[n] || "");
  if (!el || el.style.display === "none") return;
  $$(".step-card").forEach((c) => c.classList.remove("flash"));
  el.classList.add("flash");
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => el.classList.remove("flash"), 1200);
}

const TIMER_TOTAL = 15 * 60;
let timerTick = null;

function loadTimer() {
  try { return JSON.parse(sessionStorage.getItem("enlab-timer") || "null"); } catch { return null; }
}

function persistTimer(t) {
  sessionStorage.setItem("enlab-timer", JSON.stringify(t));
}

function timerState() {
  return loadTimer() || { running: false, remaining: TIMER_TOTAL, until: 0 };
}

function remainingNow() {
  const t = timerState();
  if (t.running && t.until) return Math.max(0, (t.until - Date.now()) / 1000);
  return t.remaining ?? TIMER_TOTAL;
}

function renderClock() {
  const el = $("#hoy-clock");
  const left = remainingNow();
  if (el) {
    el.textContent = `${pad2(Math.floor(left / 60))}:${pad2(Math.floor(left % 60))}`;
    el.classList.toggle("done", left <= 0 && !timerState().running);
  }
  const btn = $("#hoy-timer-btn");
  if (btn) {
    if (left <= 0 && !timerState().running) btn.textContent = "Otra vez";
    else btn.textContent = timerState().running ? "Pausar" : "Empezar 15 min";
  }
}

function startTimerLoop() {
  clearInterval(timerTick);
  timerTick = setInterval(() => {
    if (remainingNow() <= 0 && timerState().running) {
      persistTimer({ running: false, remaining: 0, until: 0 });
      clearInterval(timerTick);
      releaseWake();
      buzz(true);
    }
    renderClock();
  }, 250);
}

function toggleTimer() {
  const left = remainingNow();
  if (left <= 0) {
    persistTimer({ running: true, remaining: TIMER_TOTAL, until: Date.now() + TIMER_TOTAL * 1000 });
    startTimerLoop();
    requestWake();
    renderClock();
    return;
  }
  if (timerState().running) {
    persistTimer({ running: false, remaining: left, until: 0 });
    clearInterval(timerTick);
    releaseWake();
  } else {
    persistTimer({ running: true, remaining: left, until: Date.now() + left * 1000 });
    startTimerLoop();
    requestWake();
  }
  renderClock();
}

function remindOn() {
  return localStorage.getItem("enlab-remind-on") === "1";
}

function remindTime() {
  return localStorage.getItem("enlab-remind-time") || "18:00";
}

function renderRemind() {
  const input = $("#remind-time");
  if (input && document.activeElement !== input) input.value = remindTime();
  const on = remindOn();
  const btn = $("#remind-toggle");
  if (btn) {
    btn.classList.toggle("on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.textContent = on ? "Aviso on" : "Activar aviso";
  }
  const st = $("#remind-status");
  if (!st) return;
  if (!("Notification" in window) || location.protocol === "file:") {
    st.textContent = "Los avisos no funcionan abriendo el archivo. Usa Chrome con la página en http o la app instalada.";
    return;
  }
  if (on && Notification.permission === "granted") {
    st.textContent = `Te aviso a las ${remindTime()} en este Chrome. No hay servidor: si cierras la pestaña, no llega. Si ya completaste Hoy, no suena.`;
    return;
  }
  if (on && Notification.permission === "denied") {
    st.textContent = "Bloqueaste avisos. Candado de la barra → Notificaciones → Permitir.";
    return;
  }
  st.textContent = "Elige una hora. El aviso llega si Chrome o la app siguen abiertos.";
}

async function toggleRemind() {
  if (remindOn()) {
    localStorage.setItem("enlab-remind-on", "0");
    renderRemind();
    return;
  }
  if (!("Notification" in window) || location.protocol === "file:") {
    renderRemind();
    return;
  }
  const perm = Notification.permission === "granted"
    ? "granted"
    : await Notification.requestPermission();
  if (perm !== "granted") {
    localStorage.setItem("enlab-remind-on", "0");
    renderRemind();
    return;
  }
  localStorage.setItem("enlab-remind-on", "1");
  localStorage.setItem("enlab-remind-time", $("#remind-time")?.value || remindTime());
  renderRemind();
}

function sessionCompleteToday() {
  return sessionTaskCount(sessionData()) >= 4;
}

function fireRemind() {
  localStorage.setItem("enlab-remind-last", todayKey());
  buzz(true);
  try {
    new Notification("English Lab", {
      body: "Son 15 minutos. Abre Hoy y pulsa Empezar.",
      icon: "./icon.svg",
      tag: "enlab-daily",
    });
  } catch { /* ignore */ }
}

function tickRemind() {
  if (!remindOn()) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (sessionCompleteToday()) return;
  if (localStorage.getItem("enlab-remind-last") === todayKey()) return;
  const now = `${pad2(new Date().getHours())}:${pad2(new Date().getMinutes())}`;
  if (now !== remindTime()) return;
  fireRemind();
}

function setupRemind() {
  renderRemind();
  $("#remind-time")?.addEventListener("change", () => {
    localStorage.setItem("enlab-remind-time", $("#remind-time").value || "18:00");
    renderRemind();
  });
  $("#remind-toggle")?.addEventListener("click", () => { toggleRemind(); });
  setInterval(tickRemind, 20000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") tickRemind();
  });
  tickRemind();
}

function exportProgress() {
  const payload = { v: 1, savedAt: new Date().toISOString() };
  PROG_KEYS.forEach((k) => { payload[k] = localStorage.getItem(k); });
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `lab-oido-${todayKey()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || typeof data !== "object") throw new Error("archivo inválido");
      PROG_KEYS.forEach((k) => {
        if (data[k] == null) localStorage.removeItem(k);
        else localStorage.setItem(k, data[k]);
      });
      applyLevel();
      renderRemind();
      alert("Progreso importado.");
    } catch {
      alert("No pude leer ese archivo. ¿Es un JSON exportado de este Lab?");
    }
  };
  reader.readAsText(file);
}

function applyLevel() {
  renderLevelBar();
  renderRateBar();
  applyTheme();
  applyHideEs();
  const n = lvlNum();
  const vis = (id, on) => { const el = document.getElementById(id); if (el) el.style.display = on ? "" : "none"; };
  vis("block-daily-role", n >= 2);
  vis("block-roles", n >= 2);
  vis("block-b1-stress", false);
  vis("block-b1-ough", n >= 3);
  vis("block-a2-extra", n >= 2);
  vis("block-endings", n >= 2);
  vis("block-rhythm", n >= 3);
  vis("block-b-tips", n >= 3);
  dirty.vowels = true;
  dirty.verbs = true;
  dirty.speak = true;
  dirty.ai = true;
  renderHome();
  renderInterview();
  paintTab(currentTab);
}

function init() {
  applyTheme();
  applyHideEs();
  applyLevel();
  const allowed = ["hoy", "vocales", "verbos", "quiz", "hablar", "ia"];
  const fromHash = (location.hash || "").replace("#", "");
  const fromMem = localStorage.getItem("enlab-tab") || "";
  const id = allowed.includes(fromHash) ? fromHash : (allowed.includes(fromMem) ? fromMem : "hoy");
  showTab(id);
  if (timerState().running) {
    startTimerLoop();
    requestWake();
  }
  renderClock();
  syncQuizModePicks();
  setupRemind();
  const welcome = $("#welcome");
  if (welcome && localStorage.getItem("enlab-welcome") !== "1") welcome.hidden = false;
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
  setupPwaInstall();
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && timerState().running) requestWake();
});

function setupPwaInstall() {
  const btn = $("#pwa-install");
  if (!btn) return;
  const standalone = window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
  if (standalone) {
    btn.hidden = true;
    return;
  }
  let deferred = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    btn.hidden = false;
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    btn.hidden = true;
  });
  btn.addEventListener("click", async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(() => {});
    deferred = null;
    btn.hidden = true;
  });
}

$("#welcome-go")?.addEventListener("click", () => {
  localStorage.setItem("enlab-welcome", "1");
  const el = $("#welcome");
  if (el) el.hidden = true;
});

init();
