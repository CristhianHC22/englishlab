const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const PROG_KEYS = window.ENLAB_PROG_KEYS || ["enlab-stats", "enlab-weak", "enlab-known", "enlab-cefr"];
const PICK_MODES = ["uso", "ed", "art", "prep", "phrasal", "cond", "listen"];
const FILTERS = { q: "", fam: "all", only: "level" };
let quiz = { i: 0, score: 0, items: [], fails: [], mode: "choice" };
let recState = { rec: null, chunks: [], stream: null, recStream: null, url: "", speech: null, said: "", speechOk: true, discard: false, surface: "hablar", lastBlob: null };
let currentTab = "hoy";
let verbLimit = 24;
let hoyPairI = 0;
let hoyPathI = -1;
let hoyPathDay = "";
let jumpNote = "";
const dirty = { vowels: true, verbs: true, speak: true, ai: true, hablar: true, hoy: true };
const oidoPainted = new Set();
let oidoObserver = null;

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

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
  if (n >= 4) return ENLAB.verbs;
  const infs = new Set(
    n <= 1 ? (ENLAB.verbsA1 || [])
      : n === 2 ? (ENLAB.verbsA2 || [])
        : [...(ENLAB.starter40 || []), ...(ENLAB.verbsA2 || [])]
  );
  return ENLAB.verbs.filter((v) => infs.has(v.inf) || (v.fam === "reg" && (v.min || 1) <= n));
}

function isLevelVerb(v) {
  return verbsForLevel().some((x) => x.inf === v.inf);
}

function speakRate() {
  const r = localStorage.getItem("enlab-rate");
  if (r === "slow" || r === "fast") return r;
  return "normal";
}

function setPressed(el, on) {
  if (!el) return;
  el.classList.toggle("on", !!on);
  el.setAttribute("aria-pressed", on ? "true" : "false");
}

function renderRateBar() {
  const cur = speakRate();
  $$("[data-rate]").forEach((b) => setPressed(b, b.dataset.rate === cur));
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
  $$("[data-theme-set]").forEach((b) => setPressed(b, b.dataset.themeSet === t));
}

function hideEsOn() {
  return localStorage.getItem("enlab-hide-es") === "1";
}

function applyHideEs() {
  const on = hideEsOn();
  document.documentElement.classList.toggle("hide-es", on);
  $$("[data-hide-es]").forEach((b) => setPressed(b, on));
  syncPrefsBadge();
}

function prefersReducedMotion() {
  try { return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
}

function buzz(ok) {
  try {
    if (prefersReducedMotion()) return;
    navigator.vibrate?.(ok ? [30, 50, 30] : [90]);
  } catch { /* ignore */ }
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
  if (typeof speechSynthesis === "undefined") {
    showVoiceWarn("tts");
    return Promise.resolve();
  }
  if (opts.cancel !== false) window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const pref = opts.lang || localStorage.getItem("enlab-accent-pref") || "us";
  u.lang = pref === "uk" || pref === "en-GB" ? "en-GB" : (opts.lang && /^en-/i.test(opts.lang) ? opts.lang : "en-US");
  const slowVoice = speakRate();
  u.rate = slowVoice === "slow" ? 0.62 : slowVoice === "fast" ? 1.12 : (slow ? 0.72 : 0.92);
  const voices = speechSynthesis.getVoices();
  const want = u.lang;
  const en = voices.find((v) => new RegExp(want, "i").test(v.lang) && /Google|Natural|Samantha|Jenny|Aria|Daniel/i.test(v.name))
    || voices.find((v) => new RegExp(want, "i").test(v.lang))
    || voices.find((v) => /en-US/i.test(v.lang));
  if (en) u.voice = en;
  return new Promise((resolve) => {
    u.onend = () => resolve();
    u.onerror = (e) => {
      const err = e && e.error;
      if (err && err !== "interrupted" && err !== "canceled") showVoiceWarn("tts");
      resolve();
    };
    speechSynthesis.speak(u);
  });
}

function showVoiceWarn(kind) {
  const el = $("#voice-warn");
  const text = $("#voice-warn-text");
  if (!el) return;
  const msg = kind === "mic" ? t("speakMicDenied") : t("speakTtsBlocked");
  if (text) text.textContent = msg;
  else el.textContent = msg;
  el.hidden = false;
  clearTimeout(showVoiceWarn._t);
  showVoiceWarn._t = setTimeout(() => { el.hidden = true; }, 16000);
}

function hideVoiceWarn() {
  const el = $("#voice-warn");
  if (el) el.hidden = true;
  clearTimeout(showVoiceWarn._t);
}

function syncNetWarn() {
  const el = $("#net-warn");
  const off = navigator.onLine === false;
  document.body.classList.toggle("is-offline", off);
  if (!el) return;
  el.hidden = !off;
  if (off) el.textContent = t("netWarn");
}

function setSpeakPhase(phase) {
  $$(".speak-steps [data-speak-phase]").forEach((el) => {
    el.classList.toggle("on", el.dataset.speakPhase === phase);
  });
  $("#speak-listen")?.classList.toggle("next-act", phase === "hear");
  $("#speak-rec")?.classList.toggle("next-act", phase === "rec");
}

window.addEventListener("offline", syncNetWarn);
window.addEventListener("online", () => { syncNetWarn(); });
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

function daysAgo(day) {
  if (!day || typeof day !== "string") return 0;
  const a = Date.parse(`${day}T12:00:00`);
  const b = Date.parse(`${todayKey()}T12:00:00`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86400000);
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
  maybeAutoAdvancePath();
}

function renderHoyCheck() {
  const el = $("#hoy-check");
  if (!el) return;
  const s = sessionData();
  const items = [
    { ok: s.pairs.length >= 4, label: t("checkPairs", { n: Math.min(s.pairs.length, 4) }) },
    { ok: s.verbs.length >= 5, label: t("checkVerbs", { n: Math.min(s.verbs.length, 10) }) },
    { ok: s.phrases.length >= 1, label: t("checkDialog", { n: Math.min(s.phrases.length, 2) }) },
    { ok: s.quizDone, label: t("checkQuiz") },
  ];
  const done = items.filter((x) => x.ok).length;
  const pct = (done / items.length) * 100;
  el.innerHTML = `
    <ul class="check-list">
      ${items.map((x) => `<li class="${x.ok ? "done" : ""}">${esc(x.label)}</li>`).join("")}
    </ul>
    <div class="session-bar" aria-hidden="true"><span style="width:${pct}%"></span></div>
    ${done === 4 ? `<p class="session-done">${esc(t("sessionDone"))}</p>` : ""}
  `;
  if (done === 4) clearRepasoMode();
  if (done === 4 && sessionStorage.getItem("enlab-celeb") !== todayKey()) {
    sessionStorage.setItem("enlab-celeb", todayKey());
    buzz(true);
  }
  renderLevelNudge();
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
    s.phrases.length >= 1,
    s.quizDone,
  ].filter(Boolean).length;
}

function formatLogDate(iso) {
  const [Y, M, D] = String(iso).split("-").map(Number);
  const months = uiLang() === "en"
    ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    : ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
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
  renderSessionLogDebounced();
}

const renderSessionLogDebounced = debounce(renderSessionLog, 350);

function renderSessionLog() {
  const el = $("#session-log");
  if (!el) return;
  const logs = loadLogs();
  if (!logs.length) {
    el.innerHTML = `<p class="muted">${esc(t("sessionEmpty"))}</p>`;
    return;
  }
  el.innerHTML = `
    <ul class="log-list">
      ${logs.slice(0, 21).map((row) => {
        const n = row.tasks || 0;
        const bit = row.complete ? t("sessionComplete") : (n ? t("sessionBlocks", { n }) : t("sessionStarted"));
        const lvl = row.cefr ? String(row.cefr).toUpperCase() : "—";
        return `<li>
          <strong>${esc(formatLogDate(row.date))}</strong>
          <span class="pill ${row.complete ? "ok" : ""}">${esc(bit)}</span>
          <span class="muted">${esc(lvl)} · ${row.heard || 0} ${t("logHeard")} · ${row.quiz || 0} ${t("logQuiz")} · ${row.spoke || 0} ${t("logVoice")}</span>
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
  if (!el) return;
  el.textContent = t("homeStats", {
    streak: s.streak,
    heard: d.heard,
    quiz: d.quiz,
    spoke: d.spoke,
    weak: weakSet().size,
    strong: knownSet().size,
  });
}

function showTab(id) {
  if (currentTab === "hoy" && id !== "hoy") persistCierreNow();
  if (currentTab === "quiz" && id !== "quiz") {
    persistWeeklyNow();
    window.PLUS?.persistPlaceNow?.();
  }
  currentTab = id;
  clearEarTimers();
  $$(".panel").forEach((p) => p.classList.toggle("active", p.id === id));
  $$("nav.tabs button").forEach((b) => {
    b.setAttribute("aria-current", b.dataset.tab === id ? "page" : "false");
  });
  location.hash = id;
  localStorage.setItem("enlab-tab", id);
  paintTab(id);
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.ready.then((reg) => {
      reg.active?.postMessage({ type: "enlab-precache-tab", tab: id });
    }).catch(() => {});
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
  syncGuide();
  maybeOfferGuide();
  syncSessionFocus();
}

const tabPaintHooks = [];
const homePaintHooks = [];
const speakVerdictHooks = [];
const recordingHooks = [];

function onTabPaint(fn) {
  if (typeof fn === "function" && !tabPaintHooks.includes(fn)) tabPaintHooks.push(fn);
}

function onHomePaint(fn) {
  if (typeof fn === "function" && !homePaintHooks.includes(fn)) homePaintHooks.push(fn);
}

function onSpeakVerdict(fn) {
  if (typeof fn === "function" && !speakVerdictHooks.includes(fn)) speakVerdictHooks.push(fn);
}

function onRecording(fn) {
  if (typeof fn === "function" && !recordingHooks.includes(fn)) recordingHooks.push(fn);
}

function fireSpeakVerdict(said, meta) {
  speakVerdictHooks.forEach((fn) => { try { fn(said, meta); } catch { /* hook */ } });
}

function fireRecording(phase) {
  recordingHooks.forEach((fn) => { try { fn(phase, recState); } catch { /* hook */ } });
}

function paintTab(id) {
  if (id === "vocales") {
    if (dirty.vowels) {
      renderOidoToc();
      renderVowels();
      dirty.vowels = false;
    }
    renderOidoResume();
  }
  if (id === "verbos" && dirty.verbs) {
    verbLimit = 24;
    renderVerbs();
    dirty.verbs = false;
  }
  if (id === "quiz") renderQuizHub();
  if (id === "hablar" && dirty.hablar) {
    if (dirty.speak) {
      renderSpeak();
      dirty.speak = false;
    }
    renderInterviewSim();
    renderPhrasalsWork();
    renderVoiceHistory();
    renderRoleplays();
    renderStarBox();
    renderEmails();
    dirty.hablar = false;
  }
  if (id === "hablar") renderHablarHub();
  if (id === "ia" && dirty.ai) {
    renderAI();
    dirty.ai = false;
  }
  if (id === "ia") renderAyudaHub();
  tabPaintHooks.forEach((fn) => { try { fn(id); } catch { /* hook */ } });
}

function speakForms(v) {
  return `${v.inf}. ${v.past.replaceAll(" / ", " or ")}. ${v.pp.replaceAll(" / ", " or ")}`;
}

function firstForm(s) {
  return s.split(" / ")[0].trim();
}

function perfectOf(v) {
  if (v.iHave) return v.iHave;
  return `I have ${firstForm(v.pp)}.`;
}

function simplePastOf(v) {
  if (v.iPast) return v.iPast;
  if (v.inf === "be") return lvlNum() <= 2 ? "I was at home." : "I was responsible for the backend.";
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

function ygLink(word, label) {
  const lab = label || (typeof t === "function" ? t("real") : "gente real");
  return `<a class="yg" href="${ygHref(word)}" target="_blank" rel="noreferrer" title="${esc(typeof t === "function" ? t("ygTitle") : "YouGlish")}">${esc(lab)}</a>`;
}

function pairRow(p) {
  const robot = typeof t === "function" ? t("robot") : "Robot";
  const real = typeof t === "function" ? t("real") : "Gente real";
  return `
    <div class="card" data-track="pair" data-pair="${esc(p.short)}|${esc(p.long)}">
      <div class="muted">${esc(p.why)}</div>
      <div class="row pair-contrast" style="margin-top:8px">
        <span class="voice-tag robot">${esc(robot)}</span>
        <button class="say" data-say="${esc(p.short)}">${esc(p.short)} [${esc(p.shortPron)}]</button>
        ${ygLink(p.short, real)}
        <span>vs</span>
        <span class="voice-tag robot">${esc(robot)}</span>
        <button class="say" data-say="${esc(p.long)}">${esc(p.long)} [${esc(p.longPron)}]</button>
        ${ygLink(p.long, real)}
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
        ${v.fam === "reg" ? '<span class="pill">-ed</span>' : (isStarter(v) ? '<span class="pill">40</span>' : "")}
        ${v.work && !isStarter(v) && v.fam !== "reg" ? `<span class="pill">${esc(t("verbWorkPill"))}</span>` : ""}
        ${weak ? `<span class="pill warn">${esc(t("verbWeak"))}</span>` : ""}
        ${known ? `<span class="pill ok">${esc(t("verbStrong"))}</span>` : ""}
        <div class="muted"><span class="es-line">${esc(v.es)}</span> · ${esc(fam)}</div>
      </div>
      <div>${esc(v.past)}<div class="muted">[${esc(v.pPast)}]</div></div>
      <div>${esc(v.pp)}<div class="muted">[${esc(v.pPp)}]</div></div>
      ${compact ? "" : `<div class="muted">[${esc(v.pInf)}]</div>`}
      <div class="row">
        <button class="say" data-say="${esc(v.inf)}">${esc(t("verbPresent"))}</button>
        <button class="say" data-say="${esc(speakForms(v))}">${esc(t("verbForms"))}</button>
        <button class="say" data-say="${esc(simplePastOf(v))}">${esc(t("verbPast"))}</button>
        <button class="say" data-say="${esc(perfectOf(v))}">${esc(t("verbPerfect"))}</button>
        ${ygLink(v.inf)}
        <button class="btn ghost sm" data-weak="${esc(v.inf)}">${weak ? esc(t("verbWeakOff")) : esc(t("verbWeak"))}</button>
        <button class="btn ghost sm" data-known="${esc(v.inf)}">${known ? esc(t("verbStrongOff")) : esc(t("verbStrong"))}</button>
      </div>
    </div>`;
}

function todaysDeck() {
  const theme = dayTheme();
  const level = verbsForLevel();
  const inLevel = new Set(level.map((v) => v.inf));
  const find = (inf) => ENLAB.verbs.find((v) => v.inf === inf);
  const weak = [...weakSet()].map(find).filter((v) => v && inLevel.has(v.inf));
  const themed = (theme.infs || []).map(find).filter((v) => v && inLevel.has(v.inf));
  const mixed = [
    ...seededShuffle(weak).slice(0, 3),
    ...themed,
    ...seededShuffle(level),
  ];
  const seen = new Set();
  const out = [];
  for (const v of planEdVerbs()) {
    if (!v || seen.has(v.inf)) continue;
    seen.add(v.inf);
    out.push(v);
  }
  for (const v of mixed) {
    if (!v || seen.has(v.inf)) continue;
    seen.add(v.inf);
    out.push(v);
    if (out.length === 10) break;
  }
  return out;
}

function planItem(p) {
  return typeof p === "string" ? { text: p } : p;
}

function dayTheme() {
  const list = (ENLAB.plan || []).map(planItem);
  if (!list.length) return { i: 1, text: "", infs: [], pair: "" };
  const [Y, M, D] = todayKey().split("-").map(Number);
  const i = Math.floor(Date.UTC(Y, M - 1, D) / 86400000) % list.length;
  const row = list[i];
  return { i: i + 1, text: row.text, infs: row.infs || [], pair: row.pair || "", game: row.game || "" };
}

function todayGame() {
  const theme = dayTheme();
  const n = lvlNum();
  let game = theme.game || "";
  if (!game) {
    if (/-ed|liked\s*\/\s*played/i.test(theme.text)) game = "ed";
    else if (/make\/do/i.test(theme.text)) game = "uso";
  }
  if (game === "ed") {
    return { game, label: t("hoyGameEd"), hint: t("hoyGameEdHint") };
  }
  if (game === "uso") {
    return { game, label: t("hoyGameUso"), hint: t("hoyGameUsoHint") };
  }
  const rot = ["art", "prep", "phrasal", "cond", "dict", "listen", "weekly"][theme.i % 7];
  const goal = localStorage.getItem("enlab-onboard-goal") || "";
  if (!game && goal === "travel" && n >= 2 && theme.i % 4 === 0) {
    return { game: "travel", label: t("hoyGameTravel"), hint: t("hoyGameTravelHint") };
  }
  if (!game && goal === "work" && n >= 2 && theme.i % 4 === 1) {
    return { game: "chat", label: t("hoyGameWork"), hint: t("hoyGameWorkHint") };
  }
  if (!game && goal === "exam" && n >= 2 && theme.i % 4 === 2) {
    return { game: "weekly", label: t("hoyGameExam"), hint: t("hoyGameExamHint") };
  }
  if (n >= 2 && rot === "art") return { game: "art", label: t("hoyGameArt"), hint: t("hoyGameArtHint") };
  if (n >= 2 && rot === "prep") return { game: "prep", label: t("hoyGamePrep"), hint: t("hoyGamePrepHint") };
  if (n >= 3 && rot === "phrasal") return { game: "phrasal", label: t("hoyGamePhrasal"), hint: t("hoyGamePhrasalHint") };
  if (n >= 3 && rot === "cond") return { game: "cond", label: t("hoyGameCond"), hint: t("hoyGameCondHint") };
  if (rot === "dict") return { game: "dict", label: t("hoyGameDict"), hint: t("hoyGameDictHint") };
  if (n >= 2 && rot === "listen") return { game: "listen", label: t("hoyGameListen"), hint: t("hoyGameListenHint") };
  if (n >= 2 && rot === "weekly") return { game: "weekly", label: t("hoyGameExam"), hint: t("hoyGameExamHint") };
  return { game: "", label: "", hint: "" };
}

function pairsForToday() {
  const n = lvlNum();
  const hispano = (ENLAB.earHispano || []).filter((p) => (p.min || 1) <= n).map((p) => ({
    short: p.a, long: p.b, shortPron: p.pa, longPron: p.pb, why: p.why,
  }));
  const connected = n >= 3
    ? (ENLAB.connectedPairs || []).filter((p) => (p.min || 1) <= n).map((p) => ({
      short: p.a, long: p.b, shortPron: p.pa, longPron: p.pb, why: p.why,
    }))
    : [];
  let pairs = [...hispano, ...connected, ...(ENLAB.pairs || [])];
  if (n <= 1) pairs = pairs.filter((p) => /E muda|i corta vs ii|i vs ii|hispano/i.test(p.why));
  else if (n === 2) pairs = pairs.filter((p) => !/now|know|said|walk|gonna|flap/i.test(`${p.short}${p.long}${p.why}`));
  const focus = dayTheme().pair;
  if (focus) {
    try {
      const re = new RegExp(focus, "i");
      const hit = pairs.filter((p) => re.test(`${p.short} ${p.long} ${p.why}`));
      if (hit.length) {
        const rest = pairs.filter((p) => !hit.includes(p));
        return [...seededShuffle(hit), ...seededShuffle(rest)];
      }
    } catch { /* ignore */ }
  }
  return seededShuffle(pairs);
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
  if (blurb && meta) {
    blurb.textContent = `${meta.goal} ${meta.next}`;
    blurb.title = `${meta.goal} ${meta.next}`;
  }
  renderLevelNudge();
}

function cefrOrder() {
  return ["a1", "a2", "b1", "b2"];
}

function nextCefr() {
  const i = cefrOrder().indexOf(level());
  return i >= 0 && i < cefrOrder().length - 1 ? cefrOrder()[i + 1] : "";
}

function daysBetweenKeys(a, b) {
  const p = (k) => {
    const [Y, M, D] = String(k).split("-").map(Number);
    if (!Y || !M || !D) return 0;
    return Date.UTC(Y, M - 1, D);
  };
  return Math.max(0, Math.round((p(b) - p(a)) / 86400000));
}

function ensureCefrSince() {
  try {
    const raw = JSON.parse(localStorage.getItem("enlab-cefr-since") || "null");
    if (raw && raw.cefr === level() && raw.since) return raw.since;
  } catch { /* ignore */ }
  const logs = loadLogs()
    .filter((r) => String(r.cefr || "").toLowerCase() === level())
    .map((r) => r.date)
    .sort();
  const since = logs[0] || todayKey();
  localStorage.setItem("enlab-cefr-since", JSON.stringify({ cefr: level(), since }));
  return since;
}

function completeDaysAtCefr() {
  return loadLogs().filter((r) => r.complete && String(r.cefr || "").toLowerCase() === level()).length;
}

function nudgeHidden() {
  try {
    const raw = JSON.parse(localStorage.getItem("enlab-nudge-hide") || "null");
    if (!raw || raw.cefr !== level() || !raw.until) return false;
    return raw.until > todayKey();
  } catch {
    return false;
  }
}

function hideNudge(days) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  localStorage.setItem("enlab-nudge-hide", JSON.stringify({ cefr: level(), until: localDateKey(d) }));
}

function renderLevelNudge() {
  const el = $("#level-nudge");
  if (!el) return;
  if (nudgeHidden()) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  const days = daysBetweenKeys(ensureCefrSince(), todayKey());
  const completes = completeDaysAtCefr();
  const weakN = weakSet().size;
  const streak = stats().streak || 0;
  const cur = level();
  const meta = ENLAB.cefr && ENLAB.cefr[cur];
  const nxt = nextCefr();
  const nxtMeta = nxt && ENLAB.cefr[nxt];
  let mode = "";
  let copy = "";
  if (lvlNum() >= 3 && days < 4 && weakN >= 12) {
    mode = "down";
    copy = lvlNum() >= 4
      ? t("levelNudgeB2")
      : t("levelNudgeB1");
  } else if (nxt && nxtMeta && days >= (cur === "b1" ? 10 : 7) && weakN <= 6 && (completes >= 4 || streak >= 4)) {
    mode = "up";
    copy = cur === "b1"
      ? t("levelNudgeUpB1", { days })
      : t("levelNudgeUp", { days, name: meta?.name || cur.toUpperCase(), next: nxtMeta.name });
  }
  if (!mode) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  const action = mode === "up"
    ? `<button type="button" class="btn sm" data-nudge-to="${esc(nxt)}">${esc(t("levelNudgeTry", { name: nxtMeta.name }))}</button>`
    : (cur === "b2"
      ? `<button type="button" class="btn sm" data-nudge-to="b1">${esc(t("levelNudgeDownB1"))}</button>`
      : `<button type="button" class="btn sm" data-nudge-to="a2">${esc(t("levelNudgeTryA2"))}</button>`);
  el.hidden = false;
  el.innerHTML = `
    <p>${esc(copy)}</p>
    <div class="row">
      ${action}
      <button type="button" class="btn ghost sm" data-nudge-later>Seguir aquí</button>
    </div>`;
}

function setCefr(id) {
  if (!id || !ENLAB.cefr?.[id]) return;
  if (id !== level() && !classroomAllowsChange()) return;
  const prev = level();
  localStorage.setItem("enlab-cefr", id);
  if (id !== prev) {
    localStorage.setItem("enlab-cefr-since", JSON.stringify({ cefr: id, since: todayKey() }));
  }
  FILTERS.only = "level";
  applyLevel();
}

function situationPhrases() {
  const sit = ENLAB.phrasesSituation || {};
  const keys = Object.keys(sit);
  if (!keys.length) return [];
  const [Y, M, D] = todayKey().split("-").map(Number);
  const pick = keys[Math.floor(Date.UTC(Y, M - 1, D) / 86400000) % keys.length];
  return (sit[pick] || []).filter((p) => (p.min || 1) <= lvlNum());
}

function situationLabels() {
  const keys = Object.keys(ENLAB.ui?.es?.sitLabels || {});
  return Object.fromEntries(keys.map((k) => [k, t(`sitLabels.${k}`)]));
}

function renderSituationPhraseList(key) {
  const sit = ENLAB.phrasesSituation || {};
  const list = (sit[key] || []).filter((p) => (p.min || 1) <= lvlNum());
  return list.map((p) => `<button type="button" class="chip say" data-say="${esc(p.en)}" title="${esc(p.es)}">${esc(p.en)}</button>`).join("");
}

let sitShadowTimer = null;
let hoyShadowTimer = null;

function stopHoyPairShadow() {
  clearTimeout(hoyShadowTimer);
  hoyShadowTimer = null;
}

function paintShadowAgain(el, attrs) {
  if (!el) return;
  el.innerHTML = `${esc(t("sitShadowDone"))} <button type="button" class="chip sm"${attrs ? ` ${attrs}` : ""}>${esc(t("sitShadowAgain"))}</button>`;
}

let hoyShadowI = 0;
let hoyShadowStopped = false;

function paintHoyShadowNow(n, total) {
  const el = $("#hoy-shadow-status");
  if (!el) return;
  const kids = typeof kidsOn === "function" && kidsOn();
  const nextBtn = kids ? "" : `<button type="button" class="chip sm" data-hoy-shadow-next>${esc(t("sitShadowNext"))}</button>`;
  el.innerHTML = `${esc(t("sitShadowNow", { n, total }))}
    ${nextBtn}
    <button type="button" class="chip sm" data-hoy-shadow-stop>${esc(t("sitShadowStop"))}</button>`;
}

function stopHoyPairShadowAndCue() {
  stopHoyPairShadow();
  hoyShadowStopped = true;
  const list = (window._dailyPairs || []).slice(0, 4);
  const p = list[hoyShadowI];
  if (p) markSession("pairs", `${p.short}|${p.long}`);
  const el = $("#hoy-shadow-status");
  if (el) el.textContent = t("sitShadowStopped");
  cueHoyNext();
}

function loopHoyPairShadow() {
  const list = (window._dailyPairs || []).slice(0, 4);
  if (!list.length) return;
  if (hoyShadowI >= list.length) {
    if (typeof kidsOn === "function" && kidsOn() && hoyShadowStopped) {
      const el = $("#hoy-shadow-status");
      if (el) el.textContent = t("sitShadowStopped");
      return;
    }
    paintShadowAgain($("#hoy-shadow-status"), "data-hoy-shadow-again");
    cueHoyNext();
    return;
  }
  $$("#daily-pairs .say").forEach((b) => b.classList.remove("next-act"));
  $$("#daily-pairs .card")[hoyShadowI]?.querySelector(".say")?.classList.add("next-act");
  const p = list[hoyShadowI];
  paintHoyShadowNow(hoyShadowI + 1, list.length);
  speak(p.long || p.short, true);
  hoyShadowTimer = setTimeout(loopHoyPairShadow, 4500);
}

function runHoyPairShadow() {
  const pairs = window._dailyPairs || [];
  if (!pairs.length) return;
  stopHoyPairShadow();
  hoyShadowStopped = false;
  hoyShadowI = 0;
  loopHoyPairShadow();
}

function advanceHoyPairShadow() {
  stopHoyPairShadow();
  hoyShadowI += 1;
  loopHoyPairShadow();
}

function runSituationShadow(key) {
  const sit = ENLAB.phrasesSituation || {};
  const list = (sit[key] || []).filter((p) => (p.min || 1) <= lvlNum()).slice(0, 10);
  if (!list.length) return;
  clearTimeout(sitShadowTimer);
  let i = 0;
  const step = () => {
    if (i >= list.length) {
      paintShadowAgain($("#sit-shadow-status"), `data-sit-shadow="${esc(key)}"`);
      return;
    }
    const p = list[i];
    i += 1;
    const el = $("#sit-shadow-status");
    if (el) el.textContent = typeof t === "function" ? t("sitShadowNow", { n: i, total: list.length }) : `${i}/${list.length}: repite en voz alta`;
    speak(p.en, true);
    sitShadowTimer = setTimeout(step, 4200);
  };
  step();
}

function renderSituations() {
  const el = $("#situations-panel");
  if (!el) return;
  const sit = ENLAB.phrasesSituation || {};
  const keys = Object.keys(sit).filter((k) => (sit[k] || []).some((p) => (p.min || 1) <= lvlNum()));
  if (!keys.length) {
    el.hidden = true;
    return;
  }
  const [Y, M, D] = todayKey().split("-").map(Number);
  const focus = keys[Math.floor(Date.UTC(Y, M - 1, D) / 86400000) % keys.length];
  const labels = situationLabels();
  el.hidden = false;
  el.innerHTML = `
    <p class="kicker">${esc(t("situations"))}</p>
    <p class="muted">${esc(t("situationsToday"))} <strong>${esc(labels[focus] || focus)}</strong></p>
    <div class="row situation-tabs">${keys.map((k) =>
    `<button type="button" class="chip ${k === focus ? "on" : ""}" data-sit-key="${esc(k)}">${esc(labels[k] || k)} <span class="muted">(${(sit[k] || []).length})</span></button>`).join("")}</div>
    <div class="row" style="margin:8px 0">
      <button type="button" class="btn ghost sm" data-sit-shadow="${esc(focus)}">${esc(typeof t === "function" ? t("sitShadowGo") : "Shadowing (10 frases)")}</button>
      <span class="muted" id="sit-shadow-status"></span>
    </div>
    <div id="situation-phrases" class="situation-phrases">${renderSituationPhraseList(focus)}</div>`;
}

function repasoOn() {
  return localStorage.getItem("enlab-repaso") === "1";
}

function renderPodcastToday() {
  const el = $("#podcast-today");
  if (!el) return;
  const list = (ENLAB.podcasts || []).filter((p) => (p.min || 1) <= lvlNum());
  if (!list.length) {
    el.hidden = true;
    return;
  }
  const [Y, M, D] = todayKey().split("-").map(Number);
  const p = list[Math.floor(Date.UTC(Y, M - 1, D) / 86400000) % list.length];
  let now = null;
  try { now = JSON.parse(localStorage.getItem("enlab-podcast-now") || "null"); } catch { now = null; }
  const mid = now?.id === p.id && now.day === todayKey() && now.seg > 0 && now.seg < (p.segments || []).length;
  const goLabel = mid
    ? t("podcastResume", { n: now.seg + 1, total: (p.segments || []).length })
    : t("podcastListen");
  const segAttr = mid ? ` data-pod-seg="${esc(String(now.seg))}"` : "";
  let otherBanner = "";
  if (now?.id && now.id !== p.id && now.day === todayKey()) {
    const other = list.find((x) => x.id === now.id);
    if (other) {
      const segs = other.segments || [];
      const midOther = now.seg > 0 && now.seg < segs.length;
      const otherLabel = midOther
        ? t("podcastResume", { n: now.seg + 1, total: segs.length })
        : t("podcastListen");
      const otherSeg = midOther ? ` data-pod-seg="${esc(String(now.seg))}"` : "";
      otherBanner = `
        <div class="podcast-other-resume">
          <p class="kicker">${esc(t("podcastResumeKicker"))}</p>
          <p class="muted">${esc(other.title)}</p>
          <button type="button" class="btn sm" data-podcast="${esc(other.id)}"${otherSeg}>${esc(otherLabel)}</button>
        </div>`;
    }
  }
  el.hidden = false;
  el.innerHTML = `${otherBanner}
    <p class="kicker">${esc(t("podcast"))} · ${esc(t("podcastOfDay"))}</p>
    <p><strong>${esc(p.title)}</strong> · ${esc(p.duration || "~60 s")}</p>
    <p class="muted">${esc(t("podcastSegCount", { n: (p.segments || []).length }))}</p>
    <button type="button" class="btn sm" data-podcast="${esc(p.id)}"${segAttr}>${esc(goLabel)}</button>`;
}

function phraseBank() {
  const n = lvlNum();
  const a1 = ENLAB.phrasesA1 || [];
  const a2 = ENLAB.phrasesA2 || [];
  const b1 = ENLAB.phrasesB1 || [];
  const b2 = ENLAB.phrasesB2 || [];
  const work = ENLAB.interview || [];
  const sit = situationPhrases();
  let base;
  if (n <= 1) base = a1;
  else if (n === 2) base = a2.length ? a2 : [...a1, ...b1.slice(0, 5)];
  else if (n === 3) base = [...b1, ...work];
  else base = [...b1, ...b2, ...work];
  return [...base, ...sit];
}

function dialogsForLevel() {
  const n = lvlNum();
  const a1 = ENLAB.dialogsA1 || [];
  const a2 = ENLAB.dialogsA2 || [];
  const b1 = ENLAB.dialogsB1 || [];
  const b2 = ENLAB.dialogsB2 || [];
  const tense = ENLAB.dialogsA2Tense || [];
  const life = (ENLAB.dialogsLife || []).filter((d) => (d.min || 1) <= n);
  if (n <= 1) return [...life.filter((d) => (d.min || 1) <= 1), ...a1];
  if (n === 2) return [...tense, ...life, ...a2, ...a1.slice(0, 3)];
  if (n === 3) return [...life, ...b1, ...a2.slice(0, 2)];
  return [...life, ...b2, ...b1];
}

function renderHome(force) {
  if (!force && !dirty.hoy) return;
  dirty.hoy = false;
  const theme = dayTheme();
  const hint = $("#hoy-hint");
  const meta = ENLAB.cefr && ENLAB.cefr[level()];
  if (hint && meta) hint.textContent = t("levelHint", { name: meta.name, short: meta.short || meta.title });
  $("#day-theme").textContent = t("planDay", { i: theme.i, text: theme.text });
  renderHoyGame();
  renderHoyPath();
  const daily = todaysDeck();
  const dailyPairs = pairsForToday().slice(0, 4);
  window._dailyPairs = dailyPairs;
  renderDailyVerbs(daily);
  $("#daily-pairs").innerHTML = dailyPairs.map(pairRow).join("");
  cueFirstPairHear();
  const dailyRole = $("#daily-role");
  if (dailyRole) {
    const roles = rolesForLevel();
    dailyRole.innerHTML = roles.length ? roleCard(seededShuffle(roles)[0]) : "";
  }
  renderDailyStress();
  renderHomeStats();
  renderHoyCheck();
  renderWeekStrip();
  renderDailyTip();
  renderEarMisses();
  renderHoyReview();
  renderPlanEdFocus();
  renderStreakChart();
  renderWeekReport();
  renderDueToday();
  renderSituations();
  renderPodcastToday();
  renderCierreToday();
  renderWeeklyToday();
  window.PLUS?.renderPlaceToday?.();
  window.NR?.renderDuoToday?.();
  renderTransferCode();
  upsertLog();
  renderClock();
  hoyPairI = 0;
  homePaintHooks.forEach((fn) => { try { fn(); } catch { /* hook */ } });
}

function renderHoyGame() {
  const el = $("#hoy-game");
  if (!el) return;
  const g = todayGame();
  if (!g.game) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  const n = g.game === "ed" ? edWeakSet().size : usoWeakSet().size;
  const extra = n ? ` <span class="muted">${t("toReview", { n })}</span>` : "";
  el.hidden = false;
  el.innerHTML = `
    <p class="kicker">${esc(t("hoyGameKicker"))}</p>
    <p><button type="button" class="btn" data-hoy-game="${esc(g.game)}">${esc(g.label)}</button>${extra}</p>
    <p class="muted">${esc(g.hint)} ${esc(t("hoyGameAlso"))}</p>`;
}

function renderDailyVerbs(daily) {
  const box = $("#daily-verbs");
  if (!box) return;
  const deck = daily || (typeof todaysDeck === "function" ? todaysDeck() : []);
  const v = typeof verbOfDay === "function" ? verbOfDay() : deck[0];
  if (!v) {
    box.innerHTML = "";
    return;
  }
  const rest = deck.filter((x) => x.inf !== v.inf).slice(0, 9);
  const weak = weakSet().has(v.inf);
  const known = knownSet().has(v.inf);
  const why = weak ? t("verbTodayWeak") : t("verbTodayPath");
  const heard = sessionData().verbs.includes(v.inf);
  const extra = (typeof kidsOn === "function" && kidsOn()) || !rest.length
    ? ""
    : `<details class="fold daily-verbs-more"><summary>${esc(t("hoyVerbsMore", { n: rest.length }))}</summary>${rest.map((x) => verbCard(x, true)).join("")}</details>`;
  box.innerHTML = `<div data-track="verb" data-verb="${esc(v.inf)}">
    <p class="kicker">${esc(t("verbTodayKicker"))}</p>
    <p class="quiz-q">${esc(v.inf)}</p>
    <p class="muted"><span class="es-line">${esc(v.es)}</span> · ${esc(v.past)} / ${esc(v.pp)}</p>
    <p class="muted">${esc(why)}</p>
    <div class="row">
      <button type="button" class="say${heard ? "" : " next-act"}" data-say="${esc(v.inf)}">${esc(t("verbPresent"))}</button>
      <button type="button" class="say" data-say="${esc(speakForms(v))}">${esc(t("verbForms"))}</button>
      <button type="button" class="btn ghost sm" data-weak="${esc(v.inf)}">${weak ? esc(t("verbWeakOff")) : esc(t("verbWeak"))}</button>
      <button type="button" class="btn ghost sm" data-known="${esc(v.inf)}">${known ? esc(t("verbStrongOff")) : esc(t("verbStrong"))}</button>
      <button type="button" class="btn ghost sm" data-go-tab="verbos">${esc(t("hoyVerbsList"))}</button>
    </div>
  </div>${extra}`;
}

function ensureHoyPathDay() {
  const t = todayKey();
  if (hoyPathDay === t) return;
  try {
    const raw = JSON.parse(sessionStorage.getItem("enlab-hoy-path") || "null");
    if (raw && raw.day === t && typeof raw.i === "number") {
      hoyPathDay = t;
      hoyPathI = raw.i;
      return;
    }
  } catch { /* ignore */ }
  hoyPathDay = t;
  hoyPathI = -1;
}

function persistHoyPath() {
  sessionStorage.setItem("enlab-hoy-path", JSON.stringify({ day: todayKey(), i: hoyPathI }));
}

function hoyPath() {
  const steps = [{ id: "pairs", sel: "#hoy-step-1", label: t("pathStepPairs") }];
  if (lvlNum() >= 2) steps.push({ id: "role", sel: "#block-daily-role", label: t("pathStepRole") });
  steps.push({ id: "verbs", sel: "#hoy-step-3", label: t("pathStepVerbs") });
  steps.push({ id: "dialog", sel: "#hoy-step-4", label: t("pathStepDialog") });
  const planI = dayTheme().i - 1;
  if (planI >= 17 && planI <= 20 && lvlNum() >= 2) {
    steps.push({ id: "flap", sel: "#hoy-step-flap", label: t("pathStepFlap") });
  }
  steps.push({ id: "cierre", sel: "#hoy-step-cierre", label: t("pathStepCierre") });
  return steps;
}

function pathHint(step) {
  const s = sessionData();
  if (step.id === "pairs" && s.pairs.length < 4) return t("pathHintPairs");
  if (step.id === "verbs" && s.verbs.length < 5) return t("pathHintVerbs");
  if (step.id === "dialog" && s.phrases.length < 1) return t("pathHintDialog");
  if (step.id === "cierre" && !s.quizDone) return t("pathHintCierre");
  return "";
}

function syncFlapStepVisibility() {
  const flap = $("#hoy-step-flap");
  if (!flap) return;
  const show = hoyPath().some((s) => s.id === "flap");
  flap.hidden = !show;
}

function reconcileHoyPathI() {
  const path = hoyPath();
  if (hoyPathI < 0 || hoyPathI >= path.length) return;
  const id = sessionStorage.getItem("enlab-hoy-step-id");
  if (!id) {
    sessionStorage.setItem("enlab-hoy-step-id", path[hoyPathI].id);
    return;
  }
  const at = path.findIndex((s) => s.id === id);
  if (at >= 0) {
    if (at !== hoyPathI) {
      hoyPathI = at;
      persistHoyPath();
    }
    return;
  }
  hoyPathI = Math.min(hoyPathI, path.length);
  persistHoyPath();
  if (hoyPathI >= 0 && hoyPathI < path.length) {
    sessionStorage.setItem("enlab-hoy-step-id", path[hoyPathI].id);
  }
}

function renderHoyPath() {
  ensureHoyPathDay();
  syncFlapStepVisibility();
  reconcileHoyPathI();
  const path = hoyPath();
  const hoy = $("#hoy");
  if (hoy) {
    hoy.classList.toggle("path-on", hoyPathI >= 0);
    hoy.classList.toggle("path-done", hoyPathI >= path.length);
  }
  const copy = $("#hoy-path-copy");
  const i = hoyPathI;
  const last = path.length - 1;
  const g = todayGame();
  let text = t("pathDefault");
  let label = t("startPath");
  if (i >= 0 && i <= last) {
    const extra = pathHint(path[i]);
    text = t("pathStep", { i: i + 1, total: path.length, label: path[i].label }) + (extra ? ` · ${extra}` : "");
    if (i < last) label = t("pathNext", { label: path[i + 1].label });
    else if (g.game) label = g.label;
    else label = t("pathReady");
  } else if (i > last) {
    text = g.game ? t("pathDoneGame") : t("pathDoneExplore");
    label = t("pathRepeat");
  }
  if (i >= 0 && i <= last && path[i].id === "cierre"
    && quiz?.mode === "cierre" && quiz.items?.length && quiz.i < quiz.items.length) {
    label = t("cierreStay");
  }
  if (copy) copy.textContent = text;
  $$(".hoy-next").forEach((b) => { b.textContent = label; });
  $$(".hoy-path-foot .hoy-next").forEach((b) => b.classList.remove("next-act"));
  if (i >= 0 && i <= last) {
    const s = sessionData();
    if (path[i].id === "verbs") {
      const v = typeof verbOfDay === "function" ? verbOfDay() : null;
      if (v && s.verbs.includes(v.inf)) cueHoyNext();
    }
    if (path[i].id === "pairs" && s.pairs.length) cueHoyNext();
    if (path[i].id === "dialog" && s.phrases.length) cueHoyNext();
    if (path[i].id === "flap" && sessionStorage.getItem(`enlab-flap-${todayKey()}`)) cueHoyNext();
  }
  const doneBox = $("#hoy-done");
  const doneCopy = $("#hoy-done-copy");
  if (doneBox) {
    const done = hoy?.classList.contains("path-done");
    doneBox.hidden = !done;
    if (done && doneCopy) doneCopy.textContent = t("hoyDoneCopy");
    const r = loadCierreResult();
    const cierreLine = $("#hoy-done-cierre");
    if (cierreLine) {
      cierreLine.hidden = !(done && r);
      if (done && r) cierreLine.textContent = t("hoyDoneCierre", { score: r.score, n: r.n });
    }
    const verbsBtn = $("#hoy-done-verbs");
    if (verbsBtn) verbsBtn.hidden = !(done && r?.verbFail);
    const earBtn = $("#hoy-done-ear");
    if (earBtn) earBtn.hidden = !(done && r?.earFail);
    const usoBtn = $("#hoy-done-uso");
    if (usoBtn) usoBtn.hidden = !(done && r?.useFail);
    syncHoyDoneTimer();
    renderHoyDoneMid();
    if (window.SV?.renderHoyStoryChip) window.SV.renderHoyStoryChip();
    const streakEl = $("#hoy-done-streak");
    if (streakEl) {
      const n = (typeof stats === "function" ? stats() : {}).streak || 0;
      streakEl.hidden = !done;
      if (done) streakEl.textContent = t("hoyDoneStreak", { n });
    }
  }
  syncSessionFocus();
  fillYouAre();
}

function syncSessionFocus() {
  const hoy = $("#hoy");
  const on = currentTab === "hoy"
    && hoy?.classList.contains("path-on")
    && !hoy.classList.contains("path-done");
  document.body.classList.toggle("session-focus", !!on);
}

function cueHoyNext() {
  const foot = document.querySelector(".hoy-path-foot .hoy-next");
  if (!foot || foot.hidden) return;
  foot.classList.add("next-act");
}

function cueFirstPairHear() {
  if (sessionData().pairs.length) return;
  $("#daily-pairs .say")?.classList.add("next-act");
}

function finishHoyPath() {
  hoyPathI = hoyPath().length;
  persistHoyPath();
  $$(".step-card").forEach((c) => c.classList.remove("path-now"));
  pauseTimer();
  renderHoyPath();
  if (typeof renderQuizNow === "function") renderQuizNow();
}

function cierreFailOf(types) {
  const fails = quiz.fails || [];
  return (quiz.items || []).find((it) => fails.includes(it.inf) && types.includes(it.type))?.inf || "";
}

function saveCierreResult() {
  try {
    const verbFail = cierreFailOf(["choice", "type"]);
    const earFail = cierreFailOf(["ear"]);
    const useFail = (quiz.items || []).find((it) =>
      (quiz.fails || []).includes(it.inf)
      && it.type !== "ear" && it.type !== "choice" && it.type !== "type"
    )?.inf || "";
    sessionStorage.setItem("enlab-cierre-result", JSON.stringify({
      day: todayKey(),
      score: quiz.score,
      n: (quiz.items || []).length,
      fails: (quiz.fails || []).length,
      verbFail,
      earFail,
      useFail,
    }));
  } catch { /* ignore */ }
}

function loadCierreResult() {
  try {
    const raw = JSON.parse(sessionStorage.getItem("enlab-cierre-result") || "null");
    if (raw?.day === todayKey() && typeof raw.score === "number") return raw;
  } catch { /* ignore */ }
  return null;
}

function loadCierreNow() {
  try {
    const raw = JSON.parse(sessionStorage.getItem("enlab-cierre-now") || "null");
    if (raw?.day !== todayKey()) return null;
    if (sessionData().quizDone) return null;
    if (Array.isArray(raw.items) && raw.i > 0 && raw.i < raw.items.length) return raw;
  } catch { /* ignore */ }
  return null;
}

function persistCierreNow() {
  if (quiz?.mode !== "cierre" || !quiz.items?.length || quiz.i <= 0 || quiz.i >= quiz.items.length) return;
  try {
    sessionStorage.setItem("enlab-cierre-now", JSON.stringify({
      day: todayKey(),
      i: quiz.i,
      score: quiz.score || 0,
      fails: quiz.fails || [],
      items: quiz.items,
    }));
  } catch { /* ignore */ }
  renderCierreToday();
}

function clearCierreNow() {
  sessionStorage.removeItem("enlab-cierre-now");
}

function renderCierreToday() {
  const el = $("#cierre-today");
  if (!el) return;
  if (typeof kidsOn === "function" && kidsOn()) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  const now = loadCierreNow();
  if (!now) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  el.hidden = false;
  el.innerHTML = `
    <p class="kicker">${esc(t("cierreResumeKicker"))}</p>
    <p class="muted">${esc(t("cierreResumeHint"))}</p>
    <button type="button" class="btn sm" data-cierre-resume>${esc(t("cierreResume", { i: now.i + 1, total: now.items.length }))}</button>`;
  renderHoyDoneMid();
}

function oidoLastTitle() {
  try {
    const last = JSON.parse(localStorage.getItem("enlab-oido-last") || "null");
    if (!last?.id) return "";
    const inHub = typeof oidoHubItems === "function" && oidoHubItems().some((i) => i.jump === last.id);
    if (!inHub) return "";
    const topic = document.querySelector(`[data-lab="${CSS.escape(last.id)}"]`);
    const fromDom = topic?.querySelector("h3")?.textContent?.trim() || topic?.querySelector("strong")?.textContent?.trim();
    if (fromDom) return fromDom;
    const item = oidoHubItems().find((i) => i.jump === last.id);
    return item ? t(item.key) : "";
  } catch { return ""; }
}

function goHoyStep(i, opts) {
  const path = hoyPath();
  if (i < 0 || i >= path.length) return;
  if (path[i]?.id !== "pairs") stopHoyPairShadow();
  if (path[i]?.id !== "pairs") hoyShadowStopped = false;
  if (recState.rec && recState.rec.state === "recording") stopRecording(false);
  $$(".hoy-path-foot .hoy-next").forEach((b) => b.classList.remove("next-act"));
  hoyPathI = i;
  persistHoyPath();
  try { sessionStorage.setItem("enlab-hoy-step-id", path[i].id); } catch { /* ignore */ }
  $$(".step-card").forEach((c) => c.classList.remove("path-now", "flash"));
  const jump = (path[i].sel || "").replace("#", "");
  const el = $(path[i].sel);
  if (el?.closest("#hoy")) {
    if (path[i].id === "flap") paintOidoRhythm();
  } else {
    paintOidoByJump(jump);
    openOidoTopic(jump);
  }
  if (el && el.style.display !== "none") el.classList.add("path-now", "flash");
  const hoy = $("#hoy");
  if (hoy) {
    hoy.classList.add("path-on");
    hoy.classList.remove("path-done");
  }
  if (el && el.style.display !== "none") {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => el.classList.remove("flash"), 1200);
  }
  if (path[i].id === "cierre") {
    if (opts?.cierreResume) startCierreQuiz({ resume: true });
    else startCierreQuiz();
  }
  renderHoyPath();
}

function markQuizFromHoy(on) {
  try {
    if (on) sessionStorage.setItem("enlab-quiz-from-hoy", "1");
    else sessionStorage.removeItem("enlab-quiz-from-hoy");
  } catch { /* ignore */ }
}

function startHoyGame() {
  const g = todayGame();
  if (!g.game) return false;
  if (recState.rec && recState.rec.state === "recording") stopRecording(false);
  hoyPathI = hoyPath().length;
  persistHoyPath();
  renderHoyPath();
  if (g.game === "weekly") {
    markQuizFromHoy(true);
    startWeeklyExam();
    return true;
  }
  if (g.game === "cert" && window.NR?.startCertExam) {
    markQuizFromHoy(true);
    NR.startCertExam();
    return true;
  }
  if (g.game === "podcast" && window.NR) {
    showTab("vocales");
    openOidoTopic("oido-podcasts");
    return true;
  }
  if (g.game === "travel" && window.NR) {
    showTab("hoy");
    if (!NR.travelOn?.()) document.querySelector("#travel-toggle")?.click();
    document.querySelector("#travel-map")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }
  if (g.game === "chat" && window.NR) {
    showTab("hablar");
    if (typeof openLabRoom === "function") openLabRoom("chat-work-card");
    document.querySelector("#chat-work-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }
  markQuizFromHoy(true);
  const sel = $("#quiz-mode");
  if (sel && g.game) sel.value = g.game;
  syncQuizModePicks();
  showTab("quiz");
  startQuiz();
  return true;
}

function advanceHoyPath() {
  ensureHoyPathDay();
  const path = hoyPath();
  if (!path.length) return;
  if (hoyPathI < 0) {
    goHoyStep(0);
    return;
  }
  if (hoyPathI < path.length - 1) {
    goHoyStep(hoyPathI + 1);
    return;
  }
  if (hoyPathI === path.length - 1) {
    if (quiz.mode === "cierre" && quiz.items.length && quiz.i < quiz.items.length) {
      quizBox()?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (sessionData().quizDone) {
      finishHoyPath();
      return;
    }
    if (startHoyGame()) return;
    finishHoyPath();
    return;
  }
  goHoyStep(0);
}

function renderWeekStrip() {
  const el = $("#week-strip");
  if (!el) return;
  const by = Object.fromEntries(loadLogs().map((r) => [r.date, r]));
  const names = [t("weekSun"), t("weekMon"), t("weekTue"), t("weekWed"), t("weekThu"), t("weekFri"), t("weekSat")];
  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push({ key: localDateKey(d), label: names[d.getDay()] });
  }
  el.innerHTML = `<div class="week-dots" role="list" aria-label="${esc(t("weekStripAria"))}">${days.map((day) => {
    const row = by[day.key];
    const cls = row?.complete ? "full" : (row ? "some" : "");
    const title = row?.complete ? t("weekDotFull", { day: day.label }) : (row ? t("weekDotSome", { day: day.label }) : t("weekDotNone", { day: day.label }));
    return `<div class="week-dot ${cls}" role="listitem" aria-label="${esc(title)}" title="${esc(title)}"><span>${esc(day.label)}</span></div>`;
  }).join("")}</div>`;
}

function renderDailyTip() {
  const el = $("#daily-tip");
  if (!el) return;
  const tips = [
    ...(ENLAB.chunkTips || []).filter((t) => (t.min || 1) <= lvlNum()),
    ...(ENLAB.bTips || []).filter((t) => (t.min || 3) <= lvlNum()),
  ];
  if (tips.length) {
    const tip = seededShuffle(tips)[0];
    el.hidden = false;
    el.innerHTML = `<p class="kicker">${esc(t("dailyTipKicker"))}</p><h3>${esc(tip.title)}</h3><p>${esc(tip.body)}</p><div class="row">${sayWords(tip.listen || [])}${tip.yg ? ygLink(tip.yg) : ""}</div>`;
    return;
  }
  el.hidden = false;
  el.innerHTML = `<p class="kicker">${esc(t("dailyTipKicker"))}</p><h3>${esc(t("dailyTipFallbackTitle"))}</h3><p>${esc(t("dailyTipFallbackBody"))}</p>`;
}

function posClass(pos) {
  if (/verb|presente/i.test(pos)) return "pos-v";
  if (/adjet/i.test(pos)) return "pos-a";
  return "pos-n";
}

function rolesForLevel() {
  return (ENLAB.wordRoles || []).filter((w) => (w.min || 2) <= lvlNum());
}

function renderDailyStress() {
  const el = $("#daily-stress");
  if (!el) return;
  if (lvlNum() < 3) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  const bank = ENLAB.stress || [];
  if (!bank.length) {
    el.hidden = true;
    return;
  }
  const s = seededShuffle(bank)[0];
  el.hidden = false;
  el.innerHTML = `<p class="kicker">${esc(t("dailyStressKicker"))}</p>${stressCard(s)}`;
}

function stressCard(s) {
  const a = s.exA || s.a;
  const b = s.exB || s.b;
  return `
    <div class="card">
      <p class="muted">${esc(s.note || t("stressNote"))}</p>
      <div class="row" style="margin-top:8px">
        <button type="button" class="say" data-say="${esc(a)}" data-slow="1">${esc(s.a)}</button>
        ${ygLink(s.sayA || s.a)}
        <span>vs</span>
        <button type="button" class="say" data-say="${esc(b)}" data-slow="1">${esc(s.b)}</button>
        ${ygLink(s.sayB || s.b)}
      </div>
    </div>`;
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
              <button class="say" data-say="${esc(r.en)}" data-slow="1">${esc(t("hearPhrase"))}</button>
              ${ygLink(r.en, t("real"))}
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

function oidoSections() {
  return [
    { id: "intro", host: "#vowel-intro", eager: true, render: paintOidoIntro },
    { id: "decidir", host: "#vowel-decide", eager: true, render: paintOidoDecide },
    { id: "reglas", host: "#vowel-rules", jump: ["oido-reglas"], render: paintOidoRules },
    { id: "clave", host: "#vowel-key", jump: ["oido-clave"], render: paintOidoKey },
    { id: "mapa", host: "#vowel-maps", jump: ["oido-mapa"], render: paintOidoMaps },
    { id: "contrastes", host: "#vowel-pairs", jump: ["oido-contrastes"], render: paintOidoPairs },
    { id: "trampas", host: "#vowel-traps", jump: ["oido-trampas"], render: paintOidoTraps },
    { id: "roles", host: "#roles-list", jump: ["oido-roles", "block-roles"], render: paintOidoRoles },
    { id: "stress", host: "#stress-list", jump: ["oido-acento", "block-b1-stress"], render: paintOidoStress },
    { id: "ough", host: "#ough-list", jump: ["oido-ough", "block-b1-ough"], render: paintOidoOugh },
    { id: "silent", host: "#silent-list", jump: ["oido-mudas", "block-a2-extra"], render: paintOidoSilent },
    { id: "contra", host: "#contraction-list", jump: ["oido-contra"], render: paintOidoContra },
    { id: "endings", host: "#endings-list", jump: ["oido-endings", "block-endings"], render: paintOidoEndings },
    { id: "rhythm", host: "#rhythm-list", jump: ["oido-ritmo", "block-rhythm", "hoy-step-flap"], render: paintOidoRhythm },
    { id: "chunks", host: "#chunks-list", jump: ["oido-chunks", "block-chunks"], render: paintOidoChunks },
    { id: "tips", host: "#tips-list", jump: ["oido-tips", "block-b-tips"], render: paintOidoTips },
  ];
}

function paintOidoIntro() {
  const n = lvlNum();
  const intros = n <= 1 ? ENLAB.vowelIntro.slice(0, 1) : ENLAB.vowelIntro;
  const el = $("#vowel-intro");
  if (el) el.innerHTML = `<div class="card">${intros.map((p) => `<p>${esc(p)}</p>`).join("")}</div>`;
}

function paintOidoDecide() {
  const n = lvlNum();
  const el = $("#vowel-decide");
  if (el) el.innerHTML = ENLAB.decideSteps.filter((s) => (s.min || 1) <= n).map((s) => `
    <div class="card lesson">
      <h3>${esc(s.q)}</h3>
      <p>${esc(s.a)}</p>
    </div>`).join("");
}

function paintOidoRules() {
  const n = lvlNum();
  const el = $("#vowel-rules");
  if (el) el.innerHTML = ENLAB.vowelRules.filter((r) => (r.min || 1) <= n).map((r) => `
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
}

function paintOidoKey() {
  const el = $("#vowel-key");
  if (el) el.innerHTML = `<div class="mini-table">${ENLAB.vowelKey.map((row) => `
    <div><strong>${esc(row[0])}</strong> · ${esc(row[1])}<div class="muted">Ej.: ${esc(row[2])}</div></div>
  `).join("")}</div>`;
}

function paintOidoMaps() {
  const n = lvlNum();
  const letters = n <= 1 ? [...ENLAB.vowels] : [...ENLAB.vowels, ENLAB.letterExtra.Y];
  const el = $("#vowel-maps");
  if (el) el.innerHTML = letters.map((v) => `
    <div class="card">
      <h3>Letra ${esc(v.letter)}</h3>
      <p class="muted">${esc(ENLAB.letterNotes[v.letter] || "")}</p>
      ${v.sounds.map((s) => `
        <p><strong>${esc(s.ipa)}</strong> · ${esc(s.when)}</p>
        <div class="row">${s.examples.map((w) => `<button class="say" data-say="${esc(w)}">${esc(w)}</button>`).join("")}</div>
      `).join("")}
    </div>`).join("");
}

function paintOidoPairs() {
  const el = $("#vowel-pairs");
  if (el) el.innerHTML = ENLAB.pairs.map(pairRow).join("");
}

function paintOidoTraps() {
  const el = $("#vowel-traps");
  if (el) el.innerHTML = ENLAB.traps.map((t) => `
    <div class="card">
      <div class="muted">Evita: ${esc(t.bad)}</div>
      <p><strong>${esc(t.good)}</strong></p>
      <p class="muted">${esc(t.tip)}</p>
    </div>`).join("");
}

function paintOidoRoles() {
  const el = $("#roles-list");
  if (el) el.innerHTML = rolesForLevel().slice(0, 16).map((w) => roleCard(w)).join("");
}

function paintOidoStress() {
  const el = $("#stress-list");
  if (el) el.innerHTML = (ENLAB.stress || []).map(stressCard).join("");
}

function paintOidoOugh() {
  const el = $("#ough-list");
  if (el) el.innerHTML = ENLAB.ough.map((o) => `
    <span class="row">${`<button class="say" data-say="${esc(o.word)}">${esc(o.word)} [${esc(o.pron)}] — ${esc(o.es)}</button>`}${ygLink(o.word)}</span>
  `).join("");
}

function paintOidoSilent() {
  renderGroupCards($("#silent-list"), ENLAB.dropLetters, lvlNum());
}

function paintOidoContra() {
  const el = $("#contraction-list");
  if (el) el.innerHTML = ENLAB.contractions.map((c) => `
    <div class="card">
      <strong>${esc(c.en)}</strong> = ${esc(c.full)}
      <div class="muted es-line">${esc(c.es)}</div>
      <button class="say" data-say="${esc(c.say)}">Escuchar</button>
      ${ygLink(c.en.split(" ")[0])}
    </div>`).join("");
}

function paintOidoEndings() {
  renderGroupCards($("#endings-list"), ENLAB.tailTalk, lvlNum());
}

function cueFirstRhythmHear() {
  const path = typeof hoyPath === "function" ? hoyPath() : [];
  const i = typeof hoyPathI === "number" ? hoyPathI : -1;
  if (path[i]?.id !== "flap") return;
  try {
    if (sessionStorage.getItem(`enlab-flap-${todayKey()}`)) return;
  } catch { /* ignore */ }
  ($("#hoy-rhythm-list .say") || $("#rhythm-list .say"))?.classList.add("next-act");
}

function paintOidoRhythm() {
  const html = (ENLAB.rhythm || []).filter((r) => (r.min || 3) <= lvlNum()).map((r) => `
    <div class="card lesson" style="margin-bottom:12px">
      <h3>${esc(r.title)}</h3>
      <p>${esc(r.body)}</p>
      <div class="row">${sayWords(r.listen)}</div>
    </div>`).join("");
  const el = $("#rhythm-list");
  if (el) el.innerHTML = html;
  const hoy = $("#hoy-rhythm-list");
  if (hoy) hoy.innerHTML = html;
  cueFirstRhythmHear();
}

function paintOidoChunks() {
  const el = $("#chunks-list");
  if (!el) return;
  el.innerHTML = (ENLAB.chunkTips || []).filter((t) => (t.min || 1) <= lvlNum()).map((t) => `
    <div class="card lesson" style="margin-bottom:12px">
      <div class="kicker">${esc(t.tag || "")}</div>
      <h3>${esc(t.title)}</h3>
      <p>${esc(t.body)}</p>
      <div class="row">${sayWords(t.listen || [])}</div>
    </div>`).join("");
}

function paintOidoTips() {
  const el = $("#tips-list");
  if (!el) return;
  el.innerHTML = (ENLAB.bTips || []).filter((t) => (t.min || 3) <= lvlNum()).map((t) => `
    <div class="card lesson" style="margin-bottom:12px">
      <div class="kicker">${esc(t.tag || "")}</div>
      <h3>${esc(t.title)}</h3>
      <p>${esc(t.body)}</p>
      <div class="row">${sayWords(t.listen || [])}${t.yg ? ygLink(t.yg) : ""}</div>
    </div>`).join("");
}

let oidoUserScroll = false;
let oidoArmScroll = null;

function paintOidoSection(id) {
  if (oidoPainted.has(id)) return;
  const spec = oidoSections().find((s) => s.id === id);
  if (!spec) return;
  spec.render();
  oidoPainted.add(id);
  const host = $(spec.host);
  if (host) host.classList.add("is-ready");
  if (oidoObserver && host) oidoObserver.unobserve(host);
}

function paintOidoByJump(jumpId) {
  if (!jumpId) return;
  const spec = oidoSections().find((s) => s.id === jumpId || (s.jump || []).includes(jumpId));
  if (spec) paintOidoSection(spec.id);
}

function paintAllOido() {
  oidoSections().forEach((s) => paintOidoSection(s.id));
}

function resetOidoLazy() {
  oidoPainted.clear();
  oidoUserScroll = false;
  if (oidoArmScroll) {
    document.removeEventListener("scroll", oidoArmScroll, true);
    oidoArmScroll = null;
  }
  if (oidoObserver) {
    oidoObserver.disconnect();
    oidoObserver = null;
  }
  oidoSections().forEach((s) => {
    const el = $(s.host);
    if (!el) return;
    el.innerHTML = "";
    el.classList.remove("is-ready");
  });
}

function observeOidoLazy() {
  const lazy = oidoSections().filter((s) => !s.eager && !oidoPainted.has(s.id));
  if (!lazy.length) return;
  if (typeof IntersectionObserver !== "function") {
    lazy.forEach((s) => paintOidoSection(s.id));
    return;
  }
  if (oidoObserver) oidoObserver.disconnect();
  oidoObserver = new IntersectionObserver((entries) => {
    if (!oidoUserScroll) return;
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = entry.target.getAttribute("data-oido-sec");
      if (id) paintOidoSection(id);
    });
  }, { root: null, rootMargin: "100px 0px 60px 0px", threshold: 0.01 });
  lazy.forEach((s) => {
    const el = $(s.host);
    if (!el) return;
    el.setAttribute("data-oido-sec", s.id);
    oidoObserver.observe(el);
  });
}

function armOidoScroll() {
  const started = Date.now();
  oidoArmScroll = () => {
    if (Date.now() - started < 160) return;
    oidoUserScroll = true;
    document.removeEventListener("scroll", oidoArmScroll, true);
    oidoArmScroll = null;
    oidoSections().filter((s) => !s.eager && !oidoPainted.has(s.id)).forEach((s) => {
      const el = $(s.host);
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight + 100 && r.bottom > -60) paintOidoSection(s.id);
    });
  };
  document.addEventListener("scroll", oidoArmScroll, { capture: true, passive: true });
}

function renderVowels() {
  resetOidoLazy();
  paintOidoSection("intro");
  paintOidoSection("decidir");
  observeOidoLazy();
  armOidoScroll();
}

if (!window._oidoPrintBound) {
  window._oidoPrintBound = true;
  window.addEventListener("beforeprint", paintAllOido);
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
    <button class="chip ${FILTERS.fam === "all" ? "on" : ""}" data-fam="all">${esc(t("verbAll", { n: ENLAB.verbs.length }))}</button>
    ${fams}
    <button class="chip ${FILTERS.only === "level" ? "on" : ""}" data-only="level">${esc(t("verbFilterLevel", { n: verbsForLevel().length }))}</button>
    <button class="chip ${FILTERS.only === "starter" ? "on" : ""}" data-only="starter">${esc(t("verbFilterStarter"))}</button>
    <button class="chip ${FILTERS.only === "all" ? "on" : ""}" data-only="all">${esc(t("verbFilterAll", { n: ENLAB.verbs.length }))}</button>
    <button class="chip ${FILTERS.only === "work" ? "on" : ""}" data-only="work">${esc(t("verbFilterWork"))}</button>
    <button class="chip ${FILTERS.only === "weak" ? "on" : ""}" data-only="weak">${esc(t("verbFilterWeak"))}</button>
    <button class="chip ${FILTERS.only === "unknown" ? "on" : ""}" data-only="unknown">${esc(t("verbFilterUnknown"))}</button>
  `;
}

function renderVerbs() {
  const box = $("#verb-list");
  if (!box) return;
  renderVerbFilters();
  const list = filteredVerbs();
  const slice = list.slice(0, verbLimit);
  box.innerHTML = slice.map((v) => verbCard(v)).join("")
    || `<p class="muted">${esc(FILTERS.only === "weak" ? t("verbWeakEmpty") : t("verbNone"))}</p>`;
  if (slice.length && slice.length < list.length) {
    box.insertAdjacentHTML("beforeend",
      `<p style="margin:14px 0 0"><button type="button" class="btn" data-verb-more>Ver más (${list.length - slice.length})</button></p>`);
  }
  $("#verb-count").textContent = t("verbCount", {
    shown: Math.min(slice.length, list.length),
    total: list.length,
    all: ENLAB.verbs.length,
  });
  renderVerbToday();
}

function verbOfDay() {
  const theme = typeof dayTheme === "function" ? dayTheme() : {};
  const find = (inf) => (ENLAB.verbs || []).find((v) => v.inf === inf);
  const missed = typeof loadCierreResult === "function" ? loadCierreResult()?.verbFail : "";
  if (missed) {
    const hit = find(missed);
    if (hit) return hit;
  }
  const themed = (theme.infs || []).map(find).filter(Boolean);
  const weak = [...weakSet()].map(find).filter(Boolean);
  const themedWeak = themed.find((v) => weakSet().has(v.inf));
  const level = typeof verbsForLevel === "function" ? verbsForLevel() : [];
  return themedWeak || themed[0] || weak[0] || level[0] || (ENLAB.verbs || [])[0] || null;
}

function renderVerbToday() {
  const el = $("#verb-today");
  if (!el) return;
  const v = verbOfDay();
  if (!v) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  const weak = weakSet().has(v.inf);
  const known = knownSet().has(v.inf);
  const fromCierre = typeof loadCierreResult === "function" && loadCierreResult()?.verbFail === v.inf;
  const why = fromCierre ? t("verbTodayMiss") : (weak ? t("verbTodayWeak") : t("verbTodayPath"));
  el.innerHTML = `<p class="kicker">${esc(fromCierre ? t("hoyDoneVerbs") : t("verbTodayKicker"))}</p>
    <p class="quiz-q">${esc(v.inf)}</p>
    <p class="muted"><span class="es-line">${esc(v.es)}</span> · ${esc(v.past)} / ${esc(v.pp)}</p>
    <p class="muted">${esc(why)}</p>
    <div class="row">
      <button type="button" class="say" data-say="${esc(v.inf)}">${esc(t("verbPresent"))}</button>
      <button type="button" class="say" data-say="${esc(speakForms(v))}">${esc(t("verbForms"))}</button>
      <button type="button" class="btn ghost sm" data-weak="${esc(v.inf)}">${weak ? esc(t("verbWeakOff")) : esc(t("verbWeak"))}</button>
      <button type="button" class="btn ghost sm" data-known="${esc(v.inf)}">${known ? esc(t("verbStrongOff")) : esc(t("verbStrong"))}</button>
    </div>`;
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
function usoWeakSet() { return loadSet("enlab-uso-weak"); }
function edWeakSet() { return loadSet("enlab-ed-weak"); }
function speakWeakSet() { return loadSet("enlab-speak-weak"); }

function bumpSpeakWeak(phrase, ok) {
  if (!phrase) return;
  const w = speakWeakSet();
  if (ok) w.delete(phrase);
  else w.add(phrase);
  saveSet("enlab-speak-weak", w);
  srsBump("speak", phrase, ok);
  renderSpeakWeakHint();
  renderHoyReview();
}

function renderSpeakWeakHint() {
  const el = $("#speak-weak-hint");
  if (!el) return;
  const n = speakWeakSet().size;
  el.hidden = n === 0;
  el.textContent = n
    ? `${n} frase(s) que no te entendió.${speakOnlyWeakOn() ? " Filtro: solo esas." : " Salen primero al pulsar Otra frase."}`
    : "";
}

function bumpPickWeak(mode, key, ok) {
  if (!key) return;
  srsBump(mode || "uso", key, ok);
  if (mode !== "uso" && mode !== "ed") {
    renderHoyReview();
    return;
  }
  const store = mode === "ed" ? "enlab-ed-weak" : "enlab-uso-weak";
  const w = loadSet(store);
  if (ok) w.delete(key);
  else w.add(key);
  saveSet(store, w);
  renderHoyReview();
}

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
  srsBump("ear", key, ok);
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
  ["ear-misses"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.hidden = !rows.length;
    el.innerHTML = html;
  });
}

function spacedPreview(limit = 6) {
  const bits = [];
  for (const inf of [...weakSet()].slice(0, 2)) bits.push(inf);
  for (const k of [...earWeakSet()].slice(0, 2)) bits.push(k.replace("|", " / "));
  for (const k of [...usoWeakSet()].slice(0, 1)) bits.push(k);
  for (const k of [...edWeakSet()].slice(0, 1)) bits.push(k);
  for (const k of [...speakWeakSet()].slice(0, 1)) bits.push(`“${k}”`);
  return bits.slice(0, limit);
}

function renderHoyReview() {
  const el = $("#hoy-review");
  if (!el) return;
  const ears = worstEarPairs(4);
  const verbs = [...weakSet()].slice(0, 4);
  const uso = [...usoWeakSet()].slice(0, 3);
  const ed = [...edWeakSet()].slice(0, 3);
  const speak = [...speakWeakSet()].slice(0, 3);
  const preview = spacedPreview();
  const total = ears.length + verbs.length + uso.length + ed.length + speak.length;
  if (!total && !preview.length) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  const chip = (text, say) => say
    ? `<button type="button" class="chip say" data-say="${esc(say)}">${esc(text)}</button>`
    : `<span class="chip">${esc(text)}</span>`;
  el.hidden = false;
  const repasoBanner = repasoOn()
    ? `<p class="pill ok">${esc(t("repasoActive"))}</p>`
    : "";
  el.innerHTML = `
    ${repasoBanner}
    <p class="kicker">Repasar</p>
    ${preview.length ? `<p>Mañana salen primero: ${esc(preview.join(" · "))}</p>` : ""}
    ${ears.length ? `<p class="muted">Oído</p><div class="review-chips">${ears.map((r) => {
      const [a, b] = r.k.split("|");
      return `${chip(a, a)}<span class="muted">vs</span>${chip(b, b)}`;
    }).join(" ")}</div>` : ""}
    ${verbs.length ? `<p class="muted">Verbos débiles</p><div class="review-chips">${verbs.map((v) => chip(v, v)).join("")}</div>` : ""}
    ${uso.length ? `<p class="muted">Uso</p><div class="review-chips">${uso.map((x) => chip(x, x)).join("")}</div>` : ""}
    ${ed.length ? `<p class="muted">-ed</p><div class="review-chips">${ed.map((x) => chip(x, x)).join("")}</div>` : ""}
    ${speak.length ? `<p class="muted">Frases que no te entendió</p><div class="review-chips">${speak.map((x) => chip(x, x)).join("")}</div>` : ""}
    ${repasoOn() ? `<p class="muted" style="margin-top:12px">Usa <strong>Quiz débiles</strong> arriba, o ve a Hablar.</p>` : ""}
    <p class="muted" style="margin-top:10px">Pulsa para oír. En Juego y Hablar salen primero.</p>`;
}

function earBank() {
  const fromData = (ENLAB.pairs || [])
    .filter((p) => p.short.toLowerCase() !== p.long.toLowerCase())
    .map((p) => ({ a: p.short, b: p.long, pa: p.shortPron, pb: p.longPron, why: p.why }));
  const extra = [...(ENLAB.earPairs || []), ...(ENLAB.earHispano || []), ...(ENLAB.connectedPairs || [])];
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
  const tag = ENLAB.earLevelTags?.[lvlNum()];
  if (tag) {
    const tagged = out.filter((p) => tag.test(`${p.a} ${p.b} ${p.why}`));
    if (tagged.length >= 4) return tagged;
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
      q: t("quizHeardQ"),
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

function makeUsoItems() {
  const bank = [...(ENLAB.usoQuiz || []), ...(ENLAB.falseFriends || [])].filter((x) => (x.min || 1) <= lvlNum());
  const weak = usoWeakSet();
  const hard = shuffle(bank.filter((x) => weak.has(x.a)));
  const quotas = { calco: 3, pregunta: 3, "make-do": 2, "say-tell": 1, "since-for": 1, "lend-borrow": 1 };
  const picked = [...hard.slice(0, 4)];
  const used = new Set(picked);
  Object.entries(quotas).forEach(([tag, n]) => {
    for (const x of shuffle(bank.filter((it) => it.tag === tag))) {
      if (picked.length >= 10) break;
      if (used.has(x) || n <= 0) continue;
      used.add(x);
      picked.push(x);
      n -= 1;
    }
  });
  for (const x of shuffle(bank)) {
    if (picked.length >= 10) break;
    if (!used.has(x)) { used.add(x); picked.push(x); }
  }
  return shuffle(picked).slice(0, Math.min(10, picked.length)).map((x) => ({
    type: "uso",
    q: x.q,
    prompt: x.prompt || "",
    a: x.a,
    opts: shuffle([...x.opts]),
    say: x.say || x.a,
    why: x.why || "",
    inf: x.a,
  }));
}

function makeEdItems() {
  const n = lvlNum();
  const more = (ENLAB.edMore || []).filter((x) => (x.min || 1) <= n);
  const regs = (ENLAB.regulars || []).filter((v) => v.ed && (v.min || 1) <= n);
  const bank = [...regs, ...more];
  const opts = [
    "[t] se pega (liked)",
    "[d] se pega con voz (played)",
    "[id] sílaba extra (wanted)",
  ];
  const label = { t: opts[0], d: opts[1], id: opts[2] };
  const whyOf = (v) => v.why || (
    v.ed === "id" ? `${v.past}: la raíz acaba en T o D → sílaba extra. No es “${v.inf}-ed” con E española.`
      : v.ed === "t" ? `${v.past}: último sonido sordo → [t] pegado. liked ≈ [laikt].`
        : `${v.past}: último sonido sonoro o vocal → [d] pegado. played ≈ [pleid].`
  );
  const buckets = { t: [], d: [], id: [] };
  shuffle(bank).forEach((v) => { if (buckets[v.ed]) buckets[v.ed].push(v); });
  const weak = edWeakSet();
  const hard = shuffle(bank.filter((v) => weak.has(v.past)));
  const picked = [...hard.slice(0, 4)];
  const add = (v) => {
    if (picked.length >= 10 || picked.includes(v)) return;
    picked.push(v);
  };
  buckets.t.slice(0, 4).forEach(add);
  buckets.d.slice(0, 3).forEach(add);
  buckets.id.slice(0, 3).forEach(add);
  for (const v of shuffle(bank)) {
    if (picked.length >= 10) break;
    add(v);
  }
  return shuffle(picked).slice(0, 10).map((v) => ({
    type: "ed",
    q: t("quizEdQ"),
    prompt: `${v.inf} → ${v.past}`,
    a: label[v.ed],
    opts: [...opts],
    say: v.past,
    why: whyOf(v),
    inf: v.past,
  }));
}

function makePickBankItems(bank, type) {
  const list = (bank || []).filter((x) => (x.min || 1) <= lvlNum());
  const due = srsDueKeys(type);
  const hard = shuffle(list.filter((x) => due.has(`${type}:${x.prompt || x.a}`)));
  const picked = [...hard.slice(0, 4)];
  const used = new Set(picked);
  for (const x of shuffle(list)) {
    if (picked.length >= 10) break;
    if (used.has(x)) continue;
    used.add(x);
    picked.push(x);
  }
  return shuffle(picked).slice(0, Math.min(10, picked.length)).map((x) => ({
    type,
    q: x.q,
    prompt: x.prompt || "",
    a: x.a,
    opts: shuffle([...(x.opts || [])]),
    say: x.say || x.a,
    why: x.why || "",
    inf: `${type}:${x.prompt || x.a}`,
  }));
}

function makeDictItems() {
  const bank = (ENLAB.dictation || []).filter((x) => (x.min || 1) <= lvlNum());
  const due = srsDueKeys("dict");
  const hard = shuffle(bank.filter((x) => due.has(`dict:${x.en}`)));
  const rest = shuffle(bank.filter((x) => !hard.includes(x)));
  return [...hard, ...rest].slice(0, 8).map((x) => ({
    type: "dict",
    q: t("quizDictQ"),
    esHint: hideEsOn() ? "" : x.es,
    a: x.en,
    say: x.en,
    inf: `dict:${x.en}`,
  }));
}

function makeListenItems() {
  const bank = (ENLAB.listenPassages || []).filter((x) => (x.min || 1) <= lvlNum());
  if (!bank.length) return [];
  const skip = Number(sessionStorage.getItem("enlab-listen-i") || "0") || 0;
  const p = bank[skip % bank.length] || bank[0];
  window._listenPassage = p;
  return (p.qs || []).map((q, i) => ({
    type: "listen",
    q: q.q,
    prompt: i === 0 ? `${p.title} · ${skip % bank.length + 1}/${bank.length}` : "",
    a: q.a,
    opts: shuffle([...(q.opts || [])]),
    say: p.text,
    why: p.text,
    inf: `listen:${p.title}:${q.a}`,
    passage: p.text,
  }));
}

function weekStartKey() {
  const d = new Date();
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return dateKey(d);
}

function weeklyExamDone() {
  return localStorage.getItem("enlab-weekly-exam") === weekStartKey();
}

function markWeeklyExamDone(score, total) {
  localStorage.setItem("enlab-weekly-exam", weekStartKey());
  localStorage.setItem("enlab-weekly-score", JSON.stringify({ week: weekStartKey(), score, total, at: todayKey() }));
}

function weeklyMidChipHtml() {
  pruneWeeklyNow();
  const now = loadWeeklyNow();
  if (now) {
    return `<button type="button" class="btn sm" data-weekly-resume>${esc(t("weeklyResume", { i: now.i + 1, total: now.items.length }))}</button>`;
  }
  const stale = loadWeeklyStale();
  if (stale) return `<span class="muted">${esc(t("weeklyStaleHint", { i: stale.i + 1, total: stale.total }))}</span>`;
  return "";
}

function hoyMidSessionChipsHtml() {
  const parts = [];
  const c = loadCierreNow();
  if (c) parts.push(`<button type="button" class="btn sm" data-cierre-resume>${esc(t("cierreResume", { i: c.i + 1, total: c.items.length }))}</button>`);
  const w = loadWeeklyNow();
  if (w) parts.push(`<button type="button" class="btn sm" data-weekly-resume>${esc(t("weeklyResume", { i: w.i + 1, total: w.items.length }))}</button>`);
  const p = window.PLUS?.loadPlaceNow?.();
  if (p) parts.push(`<button type="button" class="btn sm" data-place-resume>${esc(t("placeResume", { i: p.i + 1, total: p.items.length }))}</button>`);
  return parts.join(" ");
}

function renderHoyDoneMid() {
  const el = $("#hoy-done-mid");
  if (!el) return;
  const done = $("#hoy")?.classList.contains("path-done");
  const chips = done ? hoyMidSessionChipsHtml() : "";
  el.hidden = !chips;
  el.innerHTML = chips;
}

function renderWeeklyQuizResume() {
  const el = $("#weekly-quiz-resume");
  if (!el) return;
  if (typeof kidsOn === "function" && kidsOn()) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  pruneWeeklyNow();
  const now = loadWeeklyNow();
  const stale = !now ? loadWeeklyStale() : null;
  if (!now) {
    el.hidden = true;
    el.innerHTML = stale ? `<p class="muted">${esc(t("weeklyStaleHint", { i: stale.i + 1, total: stale.total }))}</p>` : "";
    el.hidden = !stale;
    return;
  }
  el.hidden = false;
  el.innerHTML = `
    <p class="muted">${esc(t("weeklyResumeHint"))}</p>
    ${weeklyMidChipHtml()}`;
}

function hoyMidSessionLine() {
  const c = loadCierreNow();
  if (c) return t("cierreResume", { i: c.i + 1, total: c.items.length });
  const w = loadWeeklyNow();
  if (w) return t("weeklyResume", { i: w.i + 1, total: w.items.length });
  const p = window.PLUS?.loadPlaceNow?.();
  if (p) return t("placeResume", { i: p.i + 1, total: p.items.length });
  return "";
}

function loadWeeklyNow() {
  try {
    const raw = JSON.parse(sessionStorage.getItem("enlab-weekly-now") || "null");
    if (raw?.week !== weekStartKey()) return null;
    if (weeklyExamDone()) return null;
    if (Array.isArray(raw.items) && raw.i > 0 && raw.i < raw.items.length) return raw;
  } catch { /* ignore */ }
  return null;
}

function pruneWeeklyNow() {
  try {
    const raw = JSON.parse(sessionStorage.getItem("enlab-weekly-now") || "null");
    if (!raw?.week || raw.week === weekStartKey()) return;
    sessionStorage.setItem("enlab-weekly-stale", JSON.stringify({
      week: raw.week,
      i: raw.i || 0,
      total: raw.items?.length || 12,
    }));
    sessionStorage.removeItem("enlab-weekly-now");
  } catch { /* ignore */ }
}

function loadWeeklyStale() {
  try {
    const raw = JSON.parse(sessionStorage.getItem("enlab-weekly-stale") || "null");
    if (!raw?.week || raw.week === weekStartKey()) {
      if (raw?.week === weekStartKey()) sessionStorage.removeItem("enlab-weekly-stale");
      return null;
    }
    return raw;
  } catch { return null; }
}

function clearWeeklyStale() {
  sessionStorage.removeItem("enlab-weekly-stale");
}

function persistWeeklyNow() {
  if (quiz?.mode !== "weekly" || !quiz.items?.length || quiz.i <= 0 || quiz.i >= quiz.items.length) return;
  try {
    sessionStorage.setItem("enlab-weekly-now", JSON.stringify({
      week: weekStartKey(),
      i: quiz.i,
      score: quiz.score || 0,
      fails: quiz.fails || [],
      items: quiz.items,
    }));
  } catch { /* ignore */ }
  renderWeeklyToday();
  if (typeof renderWeekReport === "function") renderWeekReport();
  renderWeeklyQuizResume();
}

function clearWeeklyNow() {
  sessionStorage.removeItem("enlab-weekly-now");
}

function renderWeeklyToday() {
  const el = $("#weekly-today");
  if (!el) return;
  if (typeof kidsOn === "function" && kidsOn()) {
    el.hidden = true;
    el.innerHTML = "";
    renderWeeklyQuizResume();
    return;
  }
  pruneWeeklyNow();
  const now = loadWeeklyNow();
  const stale = !now ? loadWeeklyStale() : null;
  if (stale) {
    el.hidden = false;
    el.innerHTML = `<p class="muted">${esc(t("weeklyStaleHint", { i: stale.i + 1, total: stale.total }))}</p>`;
    if (typeof renderWeekReport === "function") renderWeekReport();
    renderWeeklyQuizResume();
    return;
  }
  if (!now) {
    el.hidden = true;
    el.innerHTML = "";
    if (typeof renderWeekReport === "function") renderWeekReport();
    renderWeeklyQuizResume();
    return;
  }
  el.hidden = false;
  el.innerHTML = `
    <p class="kicker">${esc(t("weeklyResumeKicker"))}</p>
    <p class="muted">${esc(t("weeklyResumeHint"))}</p>
    ${weeklyMidChipHtml()}`;
  if (typeof renderWeekReport === "function") renderWeekReport();
  renderWeeklyQuizResume();
  renderHoyDoneMid();
}

function weeklyScoreText() {
  try {
    const raw = JSON.parse(localStorage.getItem("enlab-weekly-score") || "null");
    if (raw && raw.week === weekStartKey()) return `${raw.score}/${raw.total}`;
  } catch { /* ignore */ }
  return "";
}

function makeWeeklyExamItems() {
  const items = [];
  items.push(...makeEarItems(false).slice(0, 2));
  const source = verbSource();
  const weak = [...weakSet()].map((inf) => source.find((v) => v.inf === inf)).filter(Boolean);
  const verbs = shuffle([...weak, ...shuffle(source)]).filter((v, i, a) => a.findIndex((x) => x.inf === v.inf) === i).slice(0, 2);
  verbs.forEach((v) => {
    items.push({
      type: "choice",
      q: t("quizPastOf", { inf: v.inf }),
      esHint: v.es,
      a: v.past.split(" / ")[0],
      opts: uniqueOpts(v.past.split(" / ")[0], source.map((x) => x.past)),
      say: v.inf,
      inf: v.inf,
    });
  });
  const ed = makeEdItems();
  if (ed[0]) items.push(ed[0]);
  const uso = makeUsoItems();
  if (uso[0]) items.push(uso[0]);
  const art = makePickBankItems(ENLAB.artQuiz, "art");
  if (art[0]) items.push(art[0]);
  const prep = makePickBankItems(ENLAB.prepQuiz, "prep");
  if (prep[0]) items.push(prep[0]);
  const ph = makePickBankItems(ENLAB.phrasalQuiz, "phrasal");
  if (ph[0]) items.push(ph[0]);
  const dict = makeDictItems();
  if (dict[0]) items.push(dict[0]);
  const listen = makeListenItems();
  if (listen[0]) items.push(listen[0]);
  const emails = (ENLAB.emailSpeak || []).filter((e) => (e.min || 1) <= lvlNum());
  const em = seededShuffle(emails)[0];
  if (em?.qs?.[0]) {
    const q = em.qs[0];
    items.push({
      type: "email",
      q: q.q,
      prompt: `${em.subject} — ${em.from}`,
      a: q.a,
      opts: shuffle([...(q.opts || [])]),
      say: em.say || em.body.replace(/\n+/g, " "),
      why: em.es || em.body,
      inf: `email:${em.subject}:${q.a}`,
      email: em,
    });
  }
  return items.filter(Boolean).slice(0, 12);
}

function startWeeklyExam(opts) {
  if (recState.rec && recState.rec.state === "recording") stopRecording(false);
  const resume = opts?.resume ? loadWeeklyNow() : null;
  if (resume) {
    quiz = { i: resume.i, score: resume.score || 0, items: resume.items, fails: resume.fails || [], mode: "weekly", host: "#quiz-box" };
  } else {
    clearWeeklyNow();
    clearWeeklyStale();
    renderWeeklyToday();
    quiz = { i: 0, score: 0, items: makeWeeklyExamItems(), fails: [], mode: "weekly", host: "#quiz-box" };
  }
  showTab("quiz");
  if (typeof openQuizRoom === "function") openQuizRoom("weekly");
  renderQuiz();
  quizBox()?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function makeQuizItems() {
  if (quiz.mode === "ear" || quiz.mode === "exam") return makeEarItems(quiz.mode === "exam");
  if (quiz.mode === "uso") return makeUsoItems();
  if (quiz.mode === "ed") return makeEdItems();
  if (quiz.mode === "art") return makePickBankItems(ENLAB.artQuiz, "art");
  if (quiz.mode === "prep") return makePickBankItems(ENLAB.prepQuiz, "prep");
  if (quiz.mode === "phrasal") return makePickBankItems(ENLAB.phrasalQuiz, "phrasal");
  if (quiz.mode === "cond") return makePickBankItems(ENLAB.condQuiz, "cond");
  if (quiz.mode === "dict") return makeDictItems();
  if (quiz.mode === "listen") return makeListenItems();
  if (quiz.mode === "weekly") return makeWeeklyExamItems();
  if (quiz.mode === "story") return makeStoryItems();
  if (quiz.mode === "emailtone") return makeEmailToneItems();
  if (quiz.mode === "place") return window.PLUS?.makePlacementItems?.() || [];
  if (quiz.mode === "cert") return window.NR?.makeCertExamItems?.() || [];
  const hideEs = hideEsOn();
  const source = verbSource();
  const weak = [...weakSet()].map((inf) => source.find((v) => v.inf === inf)).filter(Boolean);
  let pool;
  if (repasoOn() && weak.length && (quiz.mode === "choice" || quiz.mode === "type")) {
    pool = shuffle(weak).filter((v, i, a) => a.findIndex((x) => x.inf === v.inf) === i).slice(0, 12);
  } else {
    pool = shuffle([...weak, ...shuffle(source)]).filter((v, i, a) => a.findIndex((x) => x.inf === v.inf) === i).slice(0, 12);
  }
  const items = [];
  for (const v of pool) {
    const mode = Math.random();
    if (quiz.mode === "type") {
      const kind = mode < 0.5 ? "past" : "pp";
      items.push({
        type: "type",
        q: kind === "past" ? t("quizTypePast", { inf: v.inf }) : t("quizTypePp", { inf: v.inf }),
        esHint: kind === "past" ? v.es : "",
        a: kind === "past" ? v.past : v.pp,
        say: v.inf,
        inf: v.inf,
      });
    } else if (mode < 0.35 || (hideEs && mode >= 0.65)) {
      items.push({
        type: "choice",
        q: t("quizPastOf", { inf: v.inf }),
        esHint: v.es,
        a: v.past,
        opts: uniqueOpts(v.past, verbSource().map((x) => x.past)),
        say: v.inf,
        inf: v.inf,
      });
    } else if (mode < 0.65) {
      items.push({
        type: "choice",
        q: t("quizPpOf", { inf: v.inf }),
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

function quizBox() {
  return $(quiz.host || "#quiz-box");
}

function quizMissBit() {
  const n = (quiz.fails || []).length;
  if (!n) return "";
  const text = n === 1 ? t("quizMiss1") : t("quizMissN", { n });
  return ` · ${quizMissBtnHtml(text)}`;
}

function quizMissJump() {
  const mode = quiz?.mode || "";
  if (mode === "ear" || mode === "exam") return { tab: "vocales" };
  if (mode === "cierre") {
    const last = quiz.fails[quiz.fails.length - 1];
    const it = (quiz.items || []).find((x) => x.inf === last);
    if (it?.type === "choice" || it?.type === "type") return { tab: "verbos" };
    return { tab: "ia", lab: "error-journal" };
  }
  if (mode === "choice" || mode === "type") return { tab: "verbos" };
  return { tab: "ia", lab: "error-journal" };
}

function quizMissBtnHtml(text) {
  const j = quizMissJump();
  const lab = j.lab ? ` data-lab="${esc(j.lab)}"` : "";
  const title = j.lab ? t("quizMissGoJournal") : (j.tab === "verbos" ? t("quizMissGoVerbs") : text);
  let focus = "";
  if (j.lab === "error-journal") {
    const last = quiz.fails[quiz.fails.length - 1];
    const it = (quiz.items || []).find((x) => x.inf === last);
    focus = it?.a || it?.q || last || "";
  }
  const focusAttr = focus ? ` data-journal-focus="${esc(focus)}"` : "";
  return `<button type="button" class="quiz-miss-live chip sm" data-go-tab="${esc(j.tab)}"${lab}${focusAttr} title="${esc(title)}">${esc(text)}</button>`;
}

function cierreKindOf(it) {
  if (it?.type === "ear") return t("cierreKindEar");
  if (it?.type === "choice" || it?.type === "type") return t("cierreKindVerb");
  return t("cierreKindUse");
}

function paintCierreNextHint() {
  if (quiz.mode !== "cierre") return;
  const card = quizBox()?.querySelector(".card");
  if (!card) return;
  const next = quiz.items[quiz.i + 1];
  const text = next ? t("cierreNextKind", { kind: cierreKindOf(next) }) : t("cierreLast");
  let el = card.querySelector(".cierre-next-hint");
  if (!el) {
    card.insertAdjacentHTML("beforeend", `<p class="cierre-next-hint muted"></p>`);
    el = card.querySelector(".cierre-next-hint");
  }
  if (el) el.textContent = text;
}

function quizHeadHtml(it, extra) {
  const n = quiz.items.length;
  const i = quiz.i + 1;
  const miss = quizMissBit();
  if (quiz.mode === "cierre") {
    return `<p class="kicker cierre-kicker">${esc(t("cierreKicker"))}</p><div class="muted">${esc(t("cierreQ", { i, n, kind: cierreKindOf(it) }))}${miss}</div>`;
  }
  const line = extra || esc(t("quizProgress", { i, n, score: quiz.score }));
  return `<div class="muted">${line}${miss}</div>`;
}

function paintQuizMissLive() {
  const card = quizBox()?.querySelector(".card");
  if (!card) return;
  const n = (quiz.fails || []).length;
  let el = card.querySelector("button.quiz-miss-live, .quiz-miss-live");
  if (!n) {
    el?.remove();
    return;
  }
  const text = n === 1 ? t("quizMiss1") : t("quizMissN", { n });
  if (!el || el.tagName !== "BUTTON") {
    el?.remove();
    card.insertAdjacentHTML("beforeend", quizMissBtnHtml(text));
    return;
  }
  el.textContent = text;
  const j = quizMissJump();
  el.dataset.goTab = j.tab;
  if (j.lab) el.dataset.lab = j.lab;
  else el.removeAttribute("data-lab");
  if (j.lab === "error-journal") {
    const last = quiz.fails[quiz.fails.length - 1];
    const it = (quiz.items || []).find((x) => x.inf === last);
    const focus = it?.a || it?.q || last || "";
    if (focus) el.dataset.journalFocus = focus;
  } else el.removeAttribute("data-journal-focus");
}

function renderQuiz() {
  clearEarTimers();
  const box = quizBox();
  if (!box) return;
  box.classList.toggle("cierre-live", quiz.mode === "cierre" && quiz.i < quiz.items.length);
  if (quiz.mode === "cierre" && typeof renderHoyPath === "function") renderHoyPath();
  if (quiz.mode === "cierre" && quiz.i > 0 && quiz.i < quiz.items.length) persistCierreNow();
  if (quiz.mode === "weekly" && quiz.i > 0 && quiz.i < quiz.items.length) persistWeeklyNow();
  if (quiz.mode === "place" && quiz.i > 0 && quiz.i < quiz.items.length) window.PLUS?.persistPlaceNow?.();
  if (quiz.i >= quiz.items.length) {
    const cierre = quiz.mode === "cierre";
    const ear = quiz.mode === "ear" || quiz.mode === "exam";
    const pick = PICK_MODES.includes(quiz.mode) || quiz.mode === "dict" || quiz.mode === "weekly" || quiz.mode === "cert" || quiz.mode === "story" || quiz.mode === "emailtone" || quiz.mode === "place";
    const weekly = quiz.mode === "weekly";
    const cert = quiz.mode === "cert";
    if (cierre) {
      const w = weakSet();
      quiz.items.forEach((it) => {
        if (!quiz.fails.includes(it.inf)) return;
        if (it.type === "choice" || it.type === "type") w.add(it.inf);
      });
      saveSet("enlab-weak", w);
    } else if (!ear && !pick && quiz.fails.length) {
      const w = weakSet();
      quiz.fails.forEach((inf) => w.add(inf));
      saveSet("enlab-weak", w);
    }
    if (ear && quiz.fails.length) {
      const w = earWeakSet();
      quiz.fails.forEach((k) => w.add(k));
      saveSet("enlab-ear-weak", w);
    }
    if (pick && quiz.fails.length) {
      quiz.fails.forEach((k) => {
        if (weekly) {
          const hit = quiz.items.find((x) => x.inf === k);
          const mode = hit?.type === "email" ? "listen" : (hit?.type || "uso");
          bumpPickWeak(mode, k, false);
        } else bumpPickWeak(quiz.mode, k, false);
      });
    }
    if (weekly) {
      markWeeklyExamDone(quiz.score, quiz.items.length);
      clearWeeklyNow();
      renderWeeklyToday();
    }
    if (quiz.mode === "place") {
      window.PLUS?.clearPlaceNow?.();
      window.PLUS?.renderPlaceToday?.();
    }
    if (!quiz.fails.length) buzz(true);
    const g = todayGame();
    const extraGame = cierre && g.game
      ? `<p><button type="button" class="btn" data-hoy-game="${esc(g.game)}">${esc(g.label)}</button></p>`
      : "";
    let fromHoy = false;
    try { fromHoy = !cierre && sessionStorage.getItem("enlab-quiz-from-hoy") === "1"; } catch { fromHoy = false; }
    const backHoy = fromHoy
      ? `<button type="button" class="btn ghost sm" data-go-tab="hoy">${esc(t("quizBackHoy"))}</button>`
      : "";
    box.innerHTML = `<div class="card">
      ${cierre ? `<p class="kicker cierre-kicker">${esc(t("cierreKicker"))}</p>` : ""}
      <h3>${cierre ? t("quizClosed") : weekly ? t("quizWeeklyDone") : cert ? t("quizCertDone") : t("quizDone")}</h3>
      <p class="score">${quiz.score} / ${quiz.items.length}</p>
      ${weekly ? `<p class="muted">${quiz.score >= 9 ? t("weeklyScoreGreat") : quiz.score >= 7 ? t("weeklyScoreGood") : t("weeklyScoreReview")}</p>` : ""}
      <p class="muted">${quiz.fails.length
        ? (ear
          ? t("quizFailsEar", { list: quiz.fails.map((k) => k.replace("|", " / ")).join(", ") })
          : pick || cierre
            ? t("quizFailsReview", { list: quiz.fails.join(" · ") })
            : t("quizFailsWeak", { list: quiz.fails.join(", ") }))
        : t("quizNoFails")}</p>
      ${ear ? `<p class="muted">${t("quizTipEar")}</p>` : ""}
      ${quiz.mode === "uso" ? `<p class="muted">${t("quizTipUso")}</p>` : ""}
      ${quiz.mode === "art" ? `<p class="muted">${t("quizTipArt")}</p>` : ""}
      ${quiz.mode === "prep" ? `<p class="muted">${t("quizTipPrep")}</p>` : ""}
      ${quiz.mode === "phrasal" ? `<p class="muted">${t("quizTipPhrasal")}</p>` : ""}
      ${quiz.mode === "cond" ? `<p class="muted">${t("quizTipCond")}</p>` : ""}
      ${quiz.mode === "dict" ? `<p class="muted">${t("quizTipDict")}</p>` : ""}
      ${quiz.mode === "listen" ? `<p class="muted">${t("quizTipListen")}</p>` : ""}
      ${weekly ? `<p class="muted">${t("quizTipWeekly")}</p>` : ""}
      ${quiz.mode === "story" ? `<p class="muted">${esc(t("storyQuizTip"))}</p>` : ""}
      ${cierre ? `<p class="muted">${t("quizTipCierre")}</p>` : ""}
      ${extraGame}
      <button class="btn${cierre ? " ghost" : ""}" id="quiz-again">${cierre ? t("quizAgainCierre") : weekly ? t("quizAgainWeekly") : t("quizAgain")}</button>
      ${backHoy}
      ${quizPeerHtml()}
    </div>`;
    if (cierre) {
      markSession("quizDone");
      saveCierreResult();
      clearCierreNow();
      renderCierreToday();
    }
    syncRemindToSw();
    $("#quiz-again")?.addEventListener("click", cierre ? startCierreQuiz : weekly ? startWeeklyExam : startQuiz);
    renderVerbs();
    if (cierre) {
      renderHoyCheck();
      renderHoyReview();
      finishHoyPath();
    } else {
      renderHome();
      renderEarMisses();
    }
    if (quiz.mode === "place" && window.PLUS?.scoreToCefr && !box.querySelector("#place-apply")) {
      const sug = window.PLUS.scoreToCefr(quiz.score, quiz.items.length);
      localStorage.setItem("enlab-place-result", JSON.stringify({
        score: quiz.score, n: quiz.items.length, cefr: sug, at: Date.now(),
      }));
      box.querySelector(".card")?.insertAdjacentHTML("beforeend", `<p class="row" style="margin-top:10px">
        <button type="button" class="btn" id="place-apply" data-cefr="${esc(sug)}">${esc(t("placeApply", { level: sug.toUpperCase() }))}</button>
      </p>`);
    }
    return;
  }
  const it = quiz.items[quiz.i];
  if (it.type === "type") {
    box.innerHTML = `<div class="card">
      ${quizHeadHtml(it)}
      <div class="quiz-q">${quizQ(it)}</div>
      <div class="row"><button type="button" class="btn ghost" data-say="${esc(it.say)}">${esc(t("quizListen"))}</button></div>
      <input id="quiz-input" type="text" autocomplete="off" placeholder="${esc(t("quizTypePh"))}" />
      <button type="button" class="btn" id="quiz-submit" style="margin-top:8px">${esc(t("quizCheck"))}</button>
      <p class="status" id="quiz-typed"></p>
    </div>`;
    $("#quiz-input").focus();
    const submit = () => {
      const val = $("#quiz-input").value;
      const ok = it.type === "dict" ? speakHeardOk(val, it.a) || answersMatch(val, it.a) : answersMatch(val, it.a);
      $("#quiz-typed").textContent = ok ? t("correct") : t("incorrect", { a: it.a });
      $("#quiz-typed").className = `status ${ok ? "ok" : "bad"}`;
      if (ok) quiz.score += 1;
      else quizMarkFail(it.inf);
      if (!ok && window.PLUS?.logError) window.PLUS.logError({ mode: it.type || "type", expected: it.a, said: val, prompt: it.q, why: "" });
      if (it.type === "dict") srsBump("dict", it.inf, ok);
      bump("quiz");
      setTimeout(() => { quiz.i += 1; renderQuiz(); }, 900);
    };
    $("#quiz-submit").addEventListener("click", submit);
    $("#quiz-input").addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    return;
  }
  if (it.type === "email") {
    const em = it.email;
    box.innerHTML = `<div class="card email-quiz">
      ${quizHeadHtml(it, esc(t("quizEmailN", { i: quiz.i + 1, n: quiz.items.length, score: quiz.score })))}
      <div class="quiz-q">${quizQ(it)}</div>
      ${em ? `<pre class="email-body">${esc(em.body)}</pre>` : ""}
      <div class="row">
        <button type="button" class="btn ghost" data-say="${esc(it.say)}">${esc(t("quizHearEmail"))}</button>
      </div>
      <div class="choices" style="margin-top:12px">
        ${it.opts.map((o, i) => `<button data-opt="${encodeURIComponent(o)}">${i + 1}. ${esc(o)}</button>`).join("")}
      </div>
      ${it.why ? `<p class="muted es-line" id="uso-why" hidden>${esc(it.why)}</p>` : ""}
    </div>`;
    speak(it.say, true);
    return;
  }
  if (it.type === "dict") {
    box.innerHTML = `<div class="card">
      ${quizHeadHtml(it, esc(t("quizDictN", { i: quiz.i + 1, n: quiz.items.length, score: quiz.score })))}
      <div class="quiz-q">${quizQ(it)}</div>
      <div class="row">
        <button type="button" class="btn" data-say="${esc(it.say)}" data-slow="1">${esc(t("quizHearOnce"))}</button>
        <button type="button" class="btn ghost" data-say="${esc(it.say)}">${esc(t("quizHearAgain"))}</button>
      </div>
      <input id="quiz-input" type="text" autocomplete="off" placeholder="${esc(t("quizDictPh"))}" />
      <button type="button" class="btn" id="quiz-submit" style="margin-top:8px">${esc(t("quizCheck"))}</button>
      <p class="status" id="quiz-typed"></p>
    </div>`;
    speak(it.say, true);
    $("#quiz-input").focus();
    const submit = () => {
      const val = $("#quiz-input").value;
      const ok = speakHeardOk(val, it.a) || answersMatch(val, it.a);
      $("#quiz-typed").textContent = ok ? t("correct") : t("incorrect", { a: it.a });
      $("#quiz-typed").className = `status ${ok ? "ok" : "bad"}`;
      if (ok) quiz.score += 1;
      else quizMarkFail(it.inf);
      if (!ok && window.PLUS?.logError) window.PLUS.logError({ mode: "dict", expected: it.a, said: val, prompt: it.q, why: "" });
      srsBump("dict", it.inf, ok);
      bump("quiz");
      setTimeout(() => { quiz.i += 1; renderQuiz(); }, 1100);
    };
    $("#quiz-submit").addEventListener("click", submit);
    $("#quiz-input").addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    return;
  }
  if (it.type === "uso" || it.type === "ed" || it.type === "art" || it.type === "prep" || it.type === "phrasal" || it.type === "cond" || it.type === "listen" || it.type === "email" || it.type === "story" || it.type === "emailtone") {
    const kind = it.type === "ed" ? "-ed" : it.type === "listen" ? t("listen") : it.type === "story" ? t("storyQuizMode") : it.type === "emailtone" ? t("quizModes.emailtone.t") : t("uso");
    box.innerHTML = `<div class="card">
      ${quizHeadHtml(it, `${esc(kind)} ${quiz.i + 1} / ${quiz.items.length} · ${esc(t("quizHits", { score: quiz.score }))}`)}
      <div class="quiz-q">${quizQ(it)}</div>
      ${it.prompt ? `<p class="quiz-prompt${/[áéíóúñ¿¡]/i.test(it.prompt) ? " es-line" : ""}">${esc(it.prompt)}</p>` : ""}
      <div class="row">
        <button type="button" class="btn ghost" data-say="${esc(it.say)}">${esc(it.type === "ed" ? t("quizHearWord", { w: it.say }) : t("quizHearModel"))}</button>
      </div>
      <p class="muted">${t("quizKeys")}${it.type === "ed" || it.type === "listen" ? t("quizKeysSpace") : ""}</p>
      <div class="choices" style="margin-top:12px">
        ${it.opts.map((o, i) => `<button data-opt="${encodeURIComponent(o)}">${i + 1}. ${esc(o)}</button>`).join("")}
      </div>
      ${it.why ? `<p class="muted" id="uso-why" hidden>${esc(it.why)}</p>` : ""}
      ${it.type === "listen" && quiz.i === 0 ? `<p class="row" style="margin-top:10px"><button type="button" class="btn ghost sm" id="listen-next-pass">${esc(t("quizNextPass"))}</button></p>` : ""}
    </div>`;
    if (it.type === "ed" || it.type === "listen") speak(it.say, it.type === "listen");
    return;
  }
  if (it.type === "ear") {
    const exam = quiz.mode === "exam" || it.exam;
    const warm = !exam && quiz.mode !== "cierre" && earWarmupOn();
    const label = (o, i) => exam ? `${i + 1}. ${esc(o)}` : `${i + 1}. ${esc(it.labels[o] || o)}`;
    box.innerHTML = `<div class="card">
      ${quizHeadHtml(it, `${exam ? esc(t("quizExam")) : esc(t("quizEar"))} ${quiz.i + 1} / ${quiz.items.length} · ${esc(t("quizHits", { score: quiz.score }))}${exam ? "" : ` · ${esc(it.why)}`}`)}
      <div class="quiz-q">${exam
        ? t("quizEarExamQ")
        : (warm ? t("quizEarWarmQ") : t("quizEarQ"))}</div>
      ${exam || quiz.mode === "cierre" ? "" : `<label class="muted"><input type="checkbox" id="ear-warmup" ${warm ? "checked" : ""}> ${esc(t("quizEarWarmLabel"))}</label>`}
      <div class="row" style="margin-top:10px">
        ${exam ? "" : `<button type="button" class="btn ghost" id="ear-both">${esc(t("quizEarBoth"))}</button>`}
        <button type="button" class="btn" id="ear-one">${esc(exam ? t("quizHearAgain") : t("quizEarOne"))}</button>
        ${exam ? "" : `${ygLink(it.opts[0])} ${ygLink(it.opts[1])}`}
      </div>
      <div class="ear-choices-wrap">
        ${exam ? `<div class="ear-veil" id="ear-veil">${esc(t("quizListening"))}</div>` : ""}
        <div class="choices ear" style="margin-top:14px">
          ${it.opts.map((o, i) => `<button data-opt="${encodeURIComponent(o)}" ${exam ? "disabled" : ""}>${label(o, i)}</button>`).join("")}
        </div>
      </div>
      ${exam ? `<p class="muted">${t("quizEarExamHint")}</p>` : `<p class="muted">${t("quizEarYgHint")}</p>`}
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
    ${quizHeadHtml(it)}
    <div class="quiz-q">${quizQ(it)}</div>
    <div class="row"><button type="button" class="btn ghost" data-say="${esc(it.say)}">${esc(t("quizListen"))}</button></div>
    <div class="choices" style="margin-top:12px">
      ${it.opts.map((o) => `<button data-opt="${encodeURIComponent(o)}">${esc(o)}</button>`).join("")}
    </div>
  </div>`;
}

function quizMarkFail(inf) {
  quiz.fails.push(inf);
  noteQuizFirstFail();
  paintQuizMissLive();
  paintCierreNextHint();
}

function noteQuizFirstFail() {
  if (quiz._taughtFail) return;
  quiz._taughtFail = true;
  const host = quizBox();
  if (!host) return;
  const card = host.querySelector(".card") || host;
  if (card.querySelector(".quiz-fail-note")) return;
  const ear = quiz.mode === "ear" || quiz.mode === "exam";
  const msg = quiz.mode === "cierre"
    ? t("quizFailNoteCierre")
    : ear
      ? t("quizFailNoteEar")
      : t("quizFailNote");
  card.insertAdjacentHTML("beforeend", `<p class="quiz-fail-note">${esc(msg)}</p>`);
}

function startQuiz() {
  const mode = $("#quiz-mode")?.value || "choice";
  if (typeof openQuizRoom === "function") openQuizRoom(mode);
  if (mode === "cert" && window.NR?.startCertExam) return window.NR.startCertExam();
  if (mode === "place" && window.PLUS?.startPlacement) return window.PLUS.startPlacement();
  quiz = { i: 0, score: 0, items: [], fails: [], mode, host: "#quiz-box" };
  quiz.items = makeQuizItems();
  renderQuiz();
  quizBox()?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function makeCierreItems() {
  const items = [];
  const ear = makeEarItems(false);
  if (ear[0]) items.push(ear[0]);
  const source = verbSource();
  const weak = [...weakSet()].map((inf) => source.find((v) => v.inf === inf)).filter(Boolean);
  const deck = typeof todaysDeck === "function" ? todaysDeck() : [];
  const v = weak[0] || shuffle(deck)[0] || shuffle(source)[0];
  if (v) {
    items.push({
      type: "choice",
      q: t("quizPastOf", { inf: v.inf }),
      esHint: v.es,
      a: v.past.split(" / ")[0],
      opts: uniqueOpts(v.past.split(" / ")[0], source.map((x) => x.past.split(" / ")[0])),
      say: v.inf,
      inf: v.inf,
    });
  }
  const g = todayGame();
  if (g.game === "ed") {
    const ed = makeEdItems();
    if (ed[0]) items.push(ed[0]);
  } else {
    const uso = makeUsoItems();
    if (uso[0]) items.push(uso[0]);
  }
  return items.slice(0, 3);
}

function startCierreQuiz(opts) {
  const resume = opts?.resume ? loadCierreNow() : null;
  if (!resume && quiz.mode === "cierre" && quiz.i < (quiz.items || []).length && quiz.items.length) {
    quizBox()?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (resume) {
    quiz = { i: resume.i, score: resume.score || 0, items: resume.items, fails: resume.fails || [], mode: "cierre", host: "#hoy-cierre-box" };
  } else {
    clearCierreNow();
    renderCierreToday();
    quiz = { i: 0, score: 0, items: makeCierreItems(), fails: [], mode: "cierre", host: "#hoy-cierre-box" };
  }
  renderQuiz();
  quizBox()?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function speakPool() {
  const starterOnly = $("#speak-starter")?.checked !== false;
  const verbs = starterOnly ? verbsForLevel() : ENLAB.verbs;
  const extra = phraseBank();
  const dialogs = dialogsForLevel();
  const n = lvlNum();
  const phrasals = (ENLAB.phrasalsWork || []).filter((p) => (p.min || 3) <= n);
  const contractions = (ENLAB.contractions || []).filter((c) => {
    if (n <= 1) return ["I'm", "don't", "can't"].includes(c.en);
    return true;
  });
  return [
    ...extra.map((s) => ({ target: s.en, helpHtml: `<span class="es-line">${esc(s.es)}</span>` })),
    ...phrasals.map((p) => ({ target: p.say, helpHtml: `<span class="es-line">${esc(p.es)}</span> · phrasal` })),
    ...(ENLAB.emailSpeak || []).filter((e) => (e.min || 2) <= n).map((e) => ({
      target: e.reply,
      helpHtml: `Email · ${esc(e.subject)} · <span class="es-line">${esc(e.es)}</span>`,
    })),
    ...dialogs.flatMap((d) => [
      { target: d.a.en, helpHtml: `A · <span class="es-line">${esc(d.a.es)}</span>` },
      { target: d.b.en, helpHtml: `Tú · <span class="es-line">${esc(d.b.es)}</span>` },
    ]),
    ...contractions.map((c) => ({ target: c.say, helpHtml: `${esc(c.full)} · <span class="es-line">${esc(c.es)}</span>` })),
    ...verbs.map((v) => ({ target: simplePastOf(v), help: t("speakPastHelp", { inf: v.inf }) })),
    ...(n >= 2 ? verbs.map((v) => ({ target: perfectOf(v), help: t("speakPerfHelp", { inf: v.inf }) })) : []),
  ];
}

function setSpeakTarget(item) {
  window._speakTarget = item;
  $("#speak-target").textContent = item.target;
  const helpEl = $("#speak-help");
  if (helpEl) {
    if (item.helpHtml) helpEl.innerHTML = item.helpHtml;
    else helpEl.textContent = item.help || "";
  }
  $("#speak-status").textContent = "";
  $("#speak-status").className = "status";
  const hoyBtn = $("#speak-hoy");
  if (hoyBtn) hoyBtn.hidden = !window._dailyDialog;
  setSpeakPhase("hear");
}

function dialogSpeakItem(role) {
  const d = window._dailyDialog;
  if (!d) return null;
  const turn = role === "a" ? d.a : d.b;
  const label = role === "a" ? "A" : "Tú";
  return { target: turn.en, helpHtml: `${label} · <span class="es-line">${esc(turn.es)}</span>` };
}

function openSpeakWith(item) {
  if (!item) return;
  window._speakForce = item;
  dirty.speak = true;
  showTab("hablar");
}

function renderSpeak() {
  const box = $("#speak-only-weak");
  if (box) box.checked = speakOnlyWeakOn();
  window._speakPool = speakPool();
  pickSpeak();
}

function speakOnlyWeakOn() {
  return localStorage.getItem("enlab-speak-only-weak") === "1";
}

function pickSpeak() {
  if (recState.rec && recState.rec.state === "recording") stopRecording(false);
  const forced = window._speakForce;
  if (forced) window._speakForce = null;
  const pool = window._speakPool || speakPool();
  const weak = speakWeakSet();
  const hard = shuffle(pool.filter((x) => weak.has(x.target)));
  const leftover = [...weak].filter((t) => !pool.some((x) => x.target === t)).map((t) => ({
    target: t,
    help: t("speakStuck"),
  }));
  const only = speakOnlyWeakOn();
  let item = forced;
  if (!item && only) {
    item = hard[0] || leftover[0];
    if (!item) {
      setSpeakTarget({ target: "I'm fine, thanks.", help: t("speakNoWeak") });
      renderSpeakWeakHint();
      return;
    }
  }
  if (!item) item = hard[0] || leftover[0] || shuffle(pool)[0];
  setSpeakTarget(item);
  renderSpeakWeakHint();
}

function stopSpeakListen() {
  return new Promise((resolve) => {
    const s = recState.speech;
    recState.speech = null;
    if (!s) {
      resolve();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    s.onend = finish;
    s.onerror = finish;
    try { s.stop(); } catch { finish(); }
    setTimeout(finish, 450);
  });
}

function startSpeakListen() {
  recState.said = "";
  recState.speechOk = true;
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Rec) {
    recState.speechOk = false;
    return;
  }
  const rec = new Rec();
  rec.lang = "en-US";
  rec.continuous = true;
  rec.interimResults = true;
  rec.onresult = (ev) => {
    let t = "";
    for (let i = 0; i < ev.results.length; i += 1) t += `${ev.results[i][0].transcript} `;
    recState.said = t.trim();
  };
  rec.onerror = (ev) => {
    if (ev.error === "not-allowed" || ev.error === "service-not-allowed") recState.speechOk = false;
    else if (ev.error === "network" || (!navigator.onLine && ev.error !== "aborted")) recState.speechOk = false;
  };
  recState.speech = rec;
  try { rec.start(); } catch { recState.speechOk = false; recState.speech = null; }
}

function recEls() {
  if (recState.surface === "hoy") {
    return {
      btn: $("#hoy-speak-rec"),
      idle: t("hoySpeakRec"),
      status: $("#hoy-speak-status"),
      player: $("#hoy-speak-playback"),
    };
  }
  if (recState.surface === "role") {
    return {
      btn: null,
      idle: t("roleRec"),
      status: $("#role-status"),
      player: null,
    };
  }
  if (String(recState.surface || "").startsWith("interview-")) {
    const i = recState.surface.split("-")[1];
    return {
      btn: null,
      idle: t("speakReply"),
      status: $(`#interview-status-${i}`),
      player: null,
    };
  }
  return {
    btn: $("#speak-rec"),
    idle: t("speakRec"),
    status: $("#speak-status"),
    player: $("#speak-playback"),
  };
}

function resetRecButtons() {
  const pairs = [
    ["#speak-rec", typeof t === "function" ? t("speakRec") : "Grabarme"],
    ["#hoy-speak-rec", typeof t === "function" ? t("hoySpeakRec") : "Grabar B"],
  ];
  pairs.forEach(([sel, idle]) => {
    const b = $(sel);
    if (!b) return;
    b.textContent = idle;
    b.classList.remove("rec-on");
  });
}

function setRecStatus(text, cls = "") {
  const el = recEls().status;
  if (!el) return;
  el.textContent = text;
  el.className = `status ${cls}`.trim();
  if (!el.hasAttribute("aria-live")) el.setAttribute("aria-live", "polite");
}

function applySpeakVerdict(said) {
  const target = window._speakTarget?.target || "";
  const surface = recState.surface;
  if (!said) {
    const extra = recState.speechOk === false
      ? ` ${t("speakNoTranscribe")}`
      : ` ${t("speakNoHear")}`;
    setRecStatus(`${t("speakRecReady")}${extra}`);
    fireSpeakVerdict(said, { ok: false, target, surface });
    return;
  }
  const ok = speakHeardOk(said, target);
  bumpSpeakWeak(target, ok);
  if (!ok && recState.surface === "hoy" && window._dailyDialog?.b?.en === target) {
    srsBump("speak", `hoy-dialog:${target.slice(0, 48)}`, false);
  }
  setRecStatus(
    ok
      ? t("speakOk", { said })
      : t("speakBad", { said, target }),
    ok ? "ok" : "bad"
  );
  if (ok && recState.surface === "role" && window._roleplay) {
    window._roleplay.i += 1;
    setTimeout(() => paintRoleplayTurn(), 800);
  }
  if (recState.surface === "hoy" && window.PRON && recState.lastBlob) {
    window._hoyPronPending = { said, target, blob: recState.lastBlob };
  }
  fireSpeakVerdict(said, { ok, target, surface });
  if (surface === "hablar") setSpeakPhase("play");
}

function stopRecordingTracks() {
  recState.stream?.getTracks().forEach((t) => t.stop());
  recState.recStream?.getTracks().forEach((t) => t.stop());
  recState.stream = null;
  recState.recStream = null;
}

function stopRecording(save) {
  recState.discard = !save;
  if (recState.rec && recState.rec.state !== "inactive") {
    recState.rec.stop();
  }
  stopSpeakListen();
  if (!save) stopRecordingTracks();
  resetRecButtons();
  fireRecording("stop");
}

async function toggleRecording(surface) {
  if (recState.rec && recState.rec.state === "recording") {
    setRecStatus(t("speakChecking"));
    await stopSpeakListen();
    recState.rec.stop();
    fireRecording("stop");
    return;
  }
  if (surface) recState.surface = surface;
  if (!recState.surface) recState.surface = "hablar";
  stopSpeakListen();
  try {
    recState.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    setRecStatus(t("speakMicDenied"), "bad");
    showVoiceWarn("mic");
    fireRecording("deny");
    return;
  }
  if (recState.surface === "hablar") setSpeakPhase("rec");
  recState.chunks = [];
  recState.said = "";
  recState.lastBlob = null;
  recState.discard = false;
  recState.recStream = new MediaStream(recState.stream.getAudioTracks().map((t) => t.clone()));
  const mime = ["audio/webm", "audio/mp4", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported(t));
  recState.rec = mime ? new MediaRecorder(recState.recStream, { mimeType: mime }) : new MediaRecorder(recState.recStream);
  recState.rec.ondataavailable = (e) => { if (e.data && e.data.size) recState.chunks.push(e.data); };
  recState.rec.onstop = () => {
    const discard = recState.discard;
    recState.discard = false;
    stopRecordingTracks();
    resetRecButtons();
    if (discard) {
      recState.chunks = [];
      return;
    }
    if (!recState.chunks.length) {
      recState.lastBlob = null;
      applySpeakVerdict(recState.said);
      saveVoiceClip(recState.said, null);
      bump("spoke");
      if (window._speakTarget) markSession("phrases", window._speakTarget.target);
      return;
    }
    const blob = new Blob(recState.chunks, { type: recState.rec.mimeType || "audio/webm" });
    recState.lastBlob = blob;
    if (recState.url) URL.revokeObjectURL(recState.url);
    recState.url = URL.createObjectURL(blob);
    const player = recEls().player;
    if (player) {
      player.src = recState.url;
      player.hidden = false;
    }
    applySpeakVerdict(recState.said);
    bump("spoke");
    if (window._speakTarget) markSession("phrases", window._speakTarget.target);
    saveVoiceClip(recState.said, blob);
  };
  startSpeakListen();
  recState.rec.start();
  const ui = recEls();
  if (ui.btn) {
    ui.btn.textContent = t("speakRecordStop");
    ui.btn.classList.add("rec-on");
  }
  setRecStatus(t("speakRecording"));
  fireRecording("start");
}

function speakKey(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/['’]/g, "'")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function speakVariants(s) {
  const pairs = [
    ["i'm", "i am"],
    ["i've", "i have"],
    ["i'd", "i would"],
    ["i'd", "i had"],
    ["you're", "you are"],
    ["we're", "we are"],
    ["they're", "they are"],
    ["he's", "he is"],
    ["she's", "she is"],
    ["it's", "it is"],
    ["that's", "that is"],
    ["what's", "what is"],
    ["there's", "there is"],
    ["who's", "who is"],
    ["let's", "let us"],
    ["don't", "do not"],
    ["doesn't", "does not"],
    ["didn't", "did not"],
    ["can't", "cannot"],
    ["can't", "can not"],
    ["cannot", "can not"],
    ["won't", "will not"],
    ["isn't", "is not"],
    ["aren't", "are not"],
    ["wasn't", "was not"],
    ["weren't", "were not"],
    ["haven't", "have not"],
    ["hasn't", "has not"],
    ["hadn't", "had not"],
    ["wouldn't", "would not"],
    ["shouldn't", "should not"],
    ["couldn't", "could not"],
    ["gonna", "going to"],
    ["wanna", "want to"],
    ["gotta", "got to"],
  ];
  const loose = [
    [/\bim\b/g, "i am"],
    [/\bive\b/g, "i have"],
    [/\byoure\b/g, "you are"],
    [/\btheyre\b/g, "they are"],
    [/\bhes\b/g, "he is"],
    [/\bshes\b/g, "she is"],
    [/\bits\b/g, "it is"],
    [/\bthats\b/g, "that is"],
    [/\bwhats\b/g, "what is"],
    [/\bdont\b/g, "do not"],
    [/\bdoesnt\b/g, "does not"],
    [/\bdidnt\b/g, "did not"],
    [/\bcant\b/g, "can not"],
    [/\bwont\b/g, "will not"],
    [/\bisnt\b/g, "is not"],
    [/\barent\b/g, "are not"],
    [/\blets\b/g, "let us"],
  ];
  let layer = new Set([speakKey(s)]);
  for (let i = 0; i < 4; i += 1) {
    const next = new Set();
    for (const t of layer) {
      next.add(t);
      next.add(t.replace(/'/g, ""));
      for (const [a, b] of pairs) {
        if (t.includes(a)) next.add(t.split(a).join(b));
        if (t.includes(b)) next.add(t.split(b).join(a));
      }
      const bare = t.replace(/'/g, "");
      for (const [re, exp] of loose) {
        re.lastIndex = 0;
        const swapped = bare.replace(re, exp);
        if (swapped !== bare) next.add(swapped);
      }
    }
    layer = next;
  }
  return [...layer].map((t) => t.replace(/'/g, "").replace(/\s+/g, " ").trim()).filter(Boolean);
}

function speakHeardOk(said, target) {
  if (!target) return false;
  const a = speakVariants(said);
  const b = speakVariants(target);
  const covered = (short, long) => {
    if (!short || !long) return false;
    if (short === long) return true;
    const nw = short.split(" ").filter(Boolean).length;
    if (nw < 2) return false;
    if (!long.includes(short)) return false;
    return short.length >= long.length * 0.55 || nw >= 3;
  };
  for (const x of a) {
    for (const y of b) {
      if (covered(x, y) || covered(y, x)) return true;
    }
  }
  return false;
}

function renderAI() {
  $("#ai-prompts").innerHTML = ENLAB.prompts.map((p, i) => `
    <div class="card">
      <h3>${esc(p.title)}</h3>
      <pre class="prompt" id="pr-${i}">${esc(p.text)}</pre>
      <button class="btn ghost" data-copy="pr-${i}">Copiar prompt</button>
    </div>`).join("");
  $("#plan-list").innerHTML = ENLAB.plan.map((d, i) => `<li>${esc(t("planDayLabel", { n: i + 1 }))} ${esc(planItem(d).text)}</li>`).join("");
}

function dialogCard(d) {
  return `
    <div class="card dialog-card" data-track="phrase" data-phrase="${esc(d.b.en)}">
      <div class="dialog-turn">
        <span class="pill">A</span>
        <div>
          <p>${esc(d.a.en)}</p>
          <p class="muted es-line">${esc(d.a.es)}</p>
          <button type="button" class="say next-act" data-say="${esc(d.a.en)}" data-hoy-hear="a">${esc(t("dialogHearA"))}</button>
        </div>
      </div>
      <div class="dialog-turn you">
        <span class="pill pos-v">Tú</span>
        <div>
          <p>${esc(d.b.en)}</p>
          <p class="muted es-line">${esc(d.b.es)}</p>
          <div class="row">
            <button type="button" class="say" data-say="${esc(d.b.en)}" data-hoy-hear="b">${esc(t("dialogHearB"))}</button>
            ${ygLink(d.b.en, t("real"))}
            <button type="button" class="btn sm" id="hoy-speak-rec">${esc(t("hoySpeakRec"))}</button>
          </div>
          <canvas id="hoy-rec-wave" class="rec-wave" width="320" height="64" hidden aria-hidden="true"></canvas>
          <audio id="hoy-speak-playback" controls hidden style="width:100%;margin-top:10px"></audio>
          <p class="status" id="hoy-speak-status"></p>
        </div>
      </div>
      <p><button type="button" class="btn ghost sm" data-dialog-play>${esc(t("dialogPlayBoth"))}</button></p>
    </div>`;
}

function renderInterview() {
  const dBox = $("#daily-dialog");
  const dialogs = dialogsForLevel();
  const d = dialogs.length ? seededShuffle(dialogs)[0] : null;
  window._dailyDialog = d;
  if (dBox) dBox.innerHTML = d ? dialogCard(d) : "";
  const extra = phraseBank().filter((p) => !d || (p.en !== d.a.en && p.en !== d.b.en));
  const lines = seededShuffle(extra).slice(0, 1);
  const box = $("#interview-list");
  if (!box) return;
  box.innerHTML = lines.map((s) => `
    <div class="card" data-track="phrase" data-phrase="${esc(s.en)}">
      <p class="muted">Otra para repetir</p>
      <p>${esc(s.en)}</p>
      <p class="muted es-line">${esc(s.es)}</p>
      <div class="row">
        <button class="say" data-say="${esc(s.en)}">Escuchar</button>
        ${ygLink(s.en, "gente real")}
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
  const tab = e.target.closest("nav.tabs [data-tab]");
  if (tab) {
    const id = tab.dataset.tab;
    if (currentTab === id) closeLabRoom(document.getElementById(id));
    showTab(id);
  }

  const goTab = e.target.closest("[data-go-tab]");
  if (goTab) {
    if (goTab.dataset.journalFocus) {
      try { sessionStorage.setItem("enlab-journal-focus", goTab.dataset.journalFocus); } catch { /* ignore */ }
    }
    showTab(goTab.dataset.goTab);
    if (goTab.dataset.lab && typeof openLabRoom === "function") openLabRoom(goTab.dataset.lab);
    if (goTab.dataset.lab === "error-journal") window.PLUS?.renderErrorJournal?.();
  }

  if (e.target.closest("[data-hoy-repeat]")) {
    goHoyStep(0);
  }

  if (e.target.closest("#hoy-done-timer")) {
    toggleHoyDoneTimer();
    return;
  }

  if (e.target.closest("[data-oido-pick]")) {
    if (typeof closeLabRoom === "function") closeLabRoom($("#vocales"));
    highlightOidoHubPick();
  }

  if (e.target.closest("[data-prefs-transfer-go]")) {
    importFromPrefs();
    return;
  }

  const quizMiss = e.target.closest("[data-quiz-miss]");
  if (quizMiss) {
    markQuizFromHoy(!!quizMiss.closest("#hoy-done, #quiz-now"));
    if (currentTab !== "quiz") showTab("quiz");
    startTodayQuiz(quizMiss.dataset.quizMiss);
    return;
  }
  if (e.target.closest("#quiz-now-btn, [data-quiz-now]")) {
    markQuizFromHoy(false);
    if (currentTab !== "quiz") showTab("quiz");
    startTodayQuiz();
  }

  if (e.target.closest("#voice-warn-hide")) hideVoiceWarn();

  const ygOff = e.target.closest("a.yg");
  if (ygOff && navigator.onLine === false) {
    e.preventDefault();
    syncNetWarn();
  }

  const gTab = e.target.closest("[data-guide-tab]");
  if (gTab) {
    showTab(gTab.dataset.guideTab);
    setGuideOpen(true);
  }

  const gJump = e.target.closest("[data-guide-jump]");
  if (gJump) {
    e.preventDefault();
    if (typeof openLabRoom === "function") openLabRoom(gJump.dataset.guideJump);
    setGuideOpen(true);
  }

  if (e.target.closest("#you-are")) {
    setGuideOpen(true);
  }

  const jump = e.target.closest("[data-lab-jump], [data-jump]");
  if (jump) {
    e.preventDefault();
    const id = jump.dataset.labJump || jump.dataset.jump;
    if (typeof openLabRoom === "function" && openLabRoom(id)) {
      jump.closest(".panel")?.querySelector(".lab-room-bar")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (jump.dataset.jump) {
      showTab("vocales");
      paintOidoByJump(jump.dataset.jump);
      const el = document.getElementById(jump.dataset.jump);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }

  if (e.target.closest(".lab-back")) {
    closeLabRoom(e.target.closest(".panel"));
  }

  if (e.target.closest("[data-dialog-play]")) {
    const d = window._dailyDialog;
    if (d) {
      markSession("phrases", d.b.en);
      bump("heard");
      speakQueue([d.a.en, d.b.en], true);
    }
  }

  const speakDlg = e.target.closest("[data-speak-dialog]");
  if (speakDlg) {
    openSpeakWith(dialogSpeakItem(speakDlg.dataset.speakDialog || "b"));
  }

  if (e.target.closest(".hoy-next")) {
    advanceHoyPath();
  }

  if (e.target.closest("#hoy-speak-rec")) {
    if (!(recState.rec && recState.rec.state === "recording")) {
      const item = dialogSpeakItem("b");
      if (item) window._speakTarget = item;
    }
    toggleRecording("hoy");
  }

  const ivRec = e.target.closest("[data-interview-rec]");
  if (ivRec) {
    const i = Number(ivRec.dataset.interviewRec);
    const it = (ENLAB.interviewSim || [])[i];
    if (it) {
      window._speakTarget = { target: it.q, help: it.hint };
      recState.surface = `interview-${i}`;
      toggleRecording(`interview-${i}`);
    }
  }

  const rp = e.target.closest("[data-roleplay]");
  if (rp) startRoleplay(rp.dataset.roleplay);

  if (e.target.closest("[data-role-play-a]")) {
    const turn = window._roleplay?.scene?.turns?.[window._roleplay.i];
    if (turn) speak(turn.a, true);
  }

  if (e.target.closest("[data-role-rec]")) {
    const turn = window._roleplay?.scene?.turns?.[window._roleplay.i];
    if (turn) {
      window._speakTarget = { target: turn.b, help: t("roleRecHelp") };
      recState.surface = "role";
      toggleRecording("role");
    }
  }

  if (e.target.closest("[data-role-next]")) {
    if (window._roleplay) {
      window._roleplay.i += 1;
      paintRoleplayTurn();
    }
  }

  if (e.target.closest("[data-email-say]")) {
    const em = window._dailyEmail;
    if (em) speakQueue((em.say || em.body).split(/(?<=[.!?])\s+/), true);
  }

  if (e.target.closest("[data-email-reply]")) {
    const em = window._dailyEmail;
    if (em) {
      window._speakTarget = { target: em.reply, helpHtml: `Respuesta a: ${esc(em.subject)}` };
      showTab("hablar");
      setSpeakTarget(window._speakTarget);
      toggleRecording("hablar");
      try {
        const done = JSON.parse(localStorage.getItem("enlab-email-done") || "[]");
        if (!done.includes(em.subject)) {
          done.push(em.subject);
          localStorage.setItem("enlab-email-done", JSON.stringify(done.slice(-20)));
        }
      } catch { /* ignore */ }
    }
  }

  if (e.target.closest("#email-next")) {
    window._dailyEmail = null;
    renderEmails();
  }

  if (e.target.closest("#listen-next-pass")) {
    const n = Number(sessionStorage.getItem("enlab-listen-i") || "0") + 1;
    sessionStorage.setItem("enlab-listen-i", String(n));
    startQuiz();
  }

  const dueKind = e.target.closest("[data-due-kind]");
  if (dueKind) {
    const kind = dueKind.dataset.dueKind;
    if (kind === "speak") {
      localStorage.setItem("enlab-speak-only-weak", "1");
      showTab("hablar");
      pickSpeak();
      return;
    }
    if (kind === "verb") {
      showTab("verbos");
      return;
    }
    if (kind === "story") {
      startStoryQuiz();
      return;
    }
    const map = { dict: "dict", art: "art", prep: "prep", phrasal: "phrasal", cond: "cond", listen: "listen", ear: "ear", uso: "uso", ed: "ed", story: "story" };
    const mode = map[kind] || "choice";
    showTab("quiz");
    const sel = $("#quiz-mode");
    if (sel) sel.value = mode;
    syncQuizModePicks();
    startQuiz();
  }

  if (e.target.closest("#repaso-exit")) {
    clearRepasoMode();
    renderHome();
  }

  const emailPick = e.target.closest("[data-email-pick]");
  if (emailPick) {
    const subject = emailPick.dataset.emailPick;
    const em = (ENLAB.emailSpeak || []).find((x) => x.subject === subject);
    if (em) {
      window._dailyEmail = em;
      renderEmails();
    }
  }

  const phRec = e.target.closest("[data-phrasal-rec]");
  if (phRec) {
    const p = window._phrasalsSlice?.[Number(phRec.dataset.phrasalRec)];
    if (p) {
      window._speakTarget = { target: p.say, helpHtml: `<span class="es-line">${esc(p.es)}</span>` };
      setSpeakTarget(window._speakTarget);
      showTab("hablar");
      toggleRecording("hablar");
    }
  }

  const sitKey = e.target.closest("[data-sit-key]");
  if (sitKey) {
    $$(".situation-tabs .chip").forEach((b) => b.classList.toggle("on", b === sitKey));
    const box = $("#situation-phrases");
    if (box) box.innerHTML = renderSituationPhraseList(sitKey.dataset.sitKey);
    const shBtn = $("#situations-panel")?.querySelector("[data-sit-shadow]");
    if (shBtn) shBtn.dataset.sitShadow = sitKey.dataset.sitKey;
    return;
  }

  const sitShadow = e.target.closest("[data-sit-shadow]");
  if (sitShadow) {
    runSituationShadow(sitShadow.dataset.sitShadow);
    return;
  }

  if (e.target.closest("[data-cierre-resume]")) {
    const i = hoyPath().findIndex((s) => s.id === "cierre");
    if (i >= 0) goHoyStep(i, { cierreResume: true });
    else startCierreQuiz({ resume: true });
    return;
  }

  if (e.target.closest("[data-hoy-transfer-go]")) {
    if (!classroomAllowsChange("classPinImport")) return;
    importTransferCode($("#transfer-paste")?.value || "", true);
    return;
  }

  if (e.target.closest("[data-hoy-shadow-stop]")) {
    stopHoyPairShadowAndCue();
    return;
  }

  if (e.target.closest("[data-hoy-shadow-next]")) {
    advanceHoyPairShadow();
    return;
  }

  if (e.target.closest("#hoy-pair-shadow, [data-hoy-shadow-again]")) {
    runHoyPairShadow();
    return;
  }

  if (e.target.closest("#start-story-quiz") || e.target.closest("[data-start-story-quiz]")) {
    startStoryQuiz();
    return;
  }

  if (e.target.closest("#repaso-quiz-btn")) {
    showTab("quiz");
    const sel = $("#quiz-mode");
    if (sel) sel.value = "choice";
    syncQuizModePicks();
    startQuiz();
  }

  const tabJump = e.target.closest("[data-tab-jump]");
  if (tabJump) showTab(tabJump.dataset.tabJump);

  if (e.target.closest("[data-weekly-resume]")) {
    startWeeklyExam({ resume: true });
    return;
  }

  if (e.target.closest("#weekly-exam-btn")) {
    startWeeklyExam();
  }

  const nudgeTo = e.target.closest("[data-nudge-to]");
  if (nudgeTo) setCefr(nudgeTo.dataset.nudgeTo);

  if (e.target.closest("[data-nudge-later]")) {
    hideNudge(7);
    renderLevelNudge();
  }

  const fam = e.target.closest("[data-fam]");
  if (fam) { FILTERS.fam = fam.dataset.fam; verbLimit = 24; renderVerbs(); }

  const cefr = e.target.closest("[data-cefr]");
  if (cefr) {
    setCefr(cefr.dataset.cefr);
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
    srsBump("verb", k, !w.has(k));
    renderVerbs();
    renderHome();
  }

  const knownBtn = e.target.closest("[data-known]");
  if (knownBtn) {
    const s = knownSet();
    const k = knownBtn.dataset.known;
    if (s.has(k)) s.delete(k); else s.add(k);
    saveSet("enlab-known", s);
    if (s.has(k)) srsBump("verb", k, true);
    renderVerbs();
    renderHome();
  }

  const say = e.target.closest("[data-say]");
  if (say) {
    $$(".say.playing").forEach((b) => b.classList.remove("playing"));
    say.classList.add("playing");
    const pathHear = say.closest("#daily-verbs, #daily-pairs, #hoy-step-1, #hoy-step-flap, #hoy-rhythm-list, #block-rhythm, #daily-role");
    if (pathHear) {
      say.classList.remove("next-act");
      cueHoyNext();
    }
    Promise.resolve(speak(say.dataset.say, say.dataset.slow === "1"))
      .finally(() => {
        say.classList.remove("playing");
        if (say.dataset.hoyHear === "a") {
          say.classList.remove("next-act");
          $("#hoy-speak-rec")?.classList.add("next-act");
        }
        if (pathHear) cueHoyNext();
      });
    bump("heard");
    const box = say.closest("[data-track]");
    if (box?.dataset.track === "pair") markSession("pairs", box.dataset.pair);
    if (box?.dataset.track === "verb") markSession("verbs", box.dataset.verb);
    if (box?.dataset.track === "phrase" && !box.classList.contains("dialog-card")) {
      markSession("phrases", box.dataset.phrase);
    }
    if (say.closest("#block-rhythm, #hoy-step-flap, #hoy-rhythm-list")) {
      sessionStorage.setItem(`enlab-flap-${todayKey()}`, "1");
    }
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
    copy.textContent = t("copied");
    setTimeout(() => { copy.textContent = t("copyPrompt"); }, 1200);
  }

  const opt = e.target.closest("[data-opt]");
  const pickTypes = ["choice", "ear", "uso", "ed", "art", "prep", "phrasal", "cond", "listen", "email", "story", "emailtone"];
  if (opt && quiz.items[quiz.i] && pickTypes.includes(quiz.items[quiz.i].type)) {
    const val = decodeURIComponent(opt.dataset.opt);
    const it = quiz.items[quiz.i];
    $$(".choices button").forEach((b) => { b.disabled = true; });
    if (val === it.a) {
      opt.classList.add("ok");
      quiz.score += 1;
    } else {
      opt.classList.add("bad");
      quizMarkFail(it.inf);
      if (window.PLUS?.logError) {
        window.PLUS.logError({ mode: it.type, expected: it.a, said: val, prompt: it.q || it.prompt, why: it.why || "" });
      }
      $$(".choices button").forEach((b) => {
        if (decodeURIComponent(b.dataset.opt) === it.a) b.classList.add("ok");
      });
      if (it.type === "ear") speak(it.a, true);
      if (it.type !== "choice" && it.type !== "ear") speak(it.say || it.a, true);
    }
    if (it.type !== "choice" && it.type !== "ear" && val === it.a) speak(it.say || it.a, it.type === "listen");
    if (it.type !== "choice" && it.type !== "ear") {
      const why = $("#uso-why");
      if (why) why.hidden = false;
      if (it.type === "story") srsBump("story", it.inf, val === it.a);
      else if (it.type === "emailtone") srsBump("email", it.inf, val === it.a);
      else bumpPickWeak(it.type === "listen" ? "listen" : it.type, it.inf, val === it.a);
    }
    if (it.type === "ear") {
      bumpEar(it.inf, val === it.a);
      renderEarMisses();
      renderHoyReview();
    }
    bump("quiz");
    const wait = it.type === "ear" ? 1300 : (it.type === "choice" ? 700 : 2000);
    setTimeout(() => { quiz.i += 1; renderQuiz(); }, wait);
  }

  if (e.target.closest("#start-ear-from-oido")) {
    jumpNote = t("jumpFromOido");
    const sel = $("#quiz-mode");
    if (sel) sel.value = "ear";
    syncQuizModePicks();
    showTab("quiz");
    startQuiz();
  }

  if (e.target.closest("[data-hoy-game]")) {
    startHoyGame();
  }

  if (e.target.closest("#start-uso-from-oido")) {
    jumpNote = t("jumpFromOido");
    const sel = $("#quiz-mode");
    if (sel) sel.value = "uso";
    syncQuizModePicks();
    showTab("quiz");
    startQuiz();
  }

  if (e.target.closest("#start-ed-from-oido") || e.target.closest("[data-start-quiz=\"ed\"]")) {
    jumpNote = t("jumpFromOido");
    const sel = $("#quiz-mode");
    if (sel) sel.value = "ed";
    syncQuizModePicks();
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

  const qStart = e.target.closest("[data-quiz-start]");
  if (qStart && $("#quiz-mode")) {
    $("#quiz-mode").value = qStart.dataset.quizStart;
    syncQuizModePicks();
    startQuiz();
  }
});

function syncQuizModePicks() {
  const v = $("#quiz-mode")?.value || "choice";
  $$("[data-quiz-mode]").forEach((b) => {
    b.classList.toggle("on", b.dataset.quizMode === v);
    b.setAttribute("aria-pressed", b.dataset.quizMode === v ? "true" : "false");
  });
  const starterLab = $("#quiz-starter-label");
  if (starterLab) starterLab.hidden = v !== "choice" && v !== "type";
}

$("#verb-search")?.addEventListener("input", debounce((e) => {
  FILTERS.q = e.target.value;
  verbLimit = 24;
  renderVerbs();
}, 200));
$("#quiz-start")?.addEventListener("click", startQuiz);
$("#speak-rec")?.addEventListener("click", () => toggleRecording("hablar"));
$("#speak-starter")?.addEventListener("change", () => renderSpeak());
$("#speak-only-weak")?.addEventListener("change", (e) => {
  localStorage.setItem("enlab-speak-only-weak", e.target.checked ? "1" : "0");
  pickSpeak();
});
$("#speak-next")?.addEventListener("click", pickSpeak);
$("#speak-hoy")?.addEventListener("click", () => {
  const item = dialogSpeakItem("b");
  if (item) setSpeakTarget(item);
});
$("#speak-listen")?.addEventListener("click", () => {
  if (window._speakTarget) {
    speak(window._speakTarget.target, true).then(() => setSpeakPhase("rec"));
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
  const live = quiz.items[quiz.i] && (currentTab === "quiz" || (quiz.mode === "cierre" && currentTab === "hoy"));
  const it = live ? quiz.items[quiz.i] : null;
  const host = quiz.host || "#quiz-box";
  if (it?.type === "ear") {
    if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      playEarSequence(it, false);
      return;
    }
    const idx = e.key === "1" ? 0 : e.key === "2" ? 1 : -1;
    if (idx < 0) return;
    const btn = $$(`${host} .choices.ear button`)[idx] || $$(`${host} .choices button`)[idx];
    if (btn && !btn.disabled) btn.click();
    return;
  }
  if (it && (it.type === "uso" || it.type === "ed" || it.type === "choice" || it.type === "art" || it.type === "prep" || it.type === "phrasal" || it.type === "cond" || it.type === "listen")) {
    if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      if (it.say) speak(it.say, true);
      return;
    }
    const idx = Number(e.key) - 1;
    if (idx < 0 || idx > 8 || Number.isNaN(idx)) return;
    e.preventDefault();
    const btn = $$(`${host} .choices button`)[idx];
    if (btn && !btn.disabled) btn.click();
    return;
  }
  if (currentTab !== "hoy") return;
  if (e.key === " " || e.code === "Space") {
    e.preventDefault();
    playNextHoyPair();
    return;
  }
  if (e.key >= "1" && e.key <= "9") {
    const idx = Number(e.key) - 1;
    if (idx < hoyPath().length) {
      e.preventDefault();
      goHoyStep(idx);
    }
  }
});

function oidoHubItems() {
  const n = lvlNum();
  const kids = typeof kidsOn === "function" && kidsOn();
  return [
    { jump: "oido-decidir", key: "oidoTocDecidir", blurb: "oidoBlurbDecidir", group: "oidoGroupVowels", min: 1 },
    { jump: "oido-reglas", key: "oidoTocReglas", blurb: "oidoBlurbReglas", group: "oidoGroupVowels", min: 1 },
    { jump: "oido-mapa", key: "oidoTocMapa", blurb: "oidoBlurbMapa", group: "oidoGroupVowels", min: 1 },
    { jump: "oido-contrastes", key: "oidoTocContrastes", blurb: "oidoBlurbContrastes", group: "oidoGroupContrast", min: 1 },
    { jump: "oido-roles", key: "oidoTocRoles", blurb: "oidoBlurbRoles", group: "oidoGroupContrast", min: 2 },
    { jump: "oido-mudas", key: "oidoTocMudas", blurb: "oidoBlurbMudas", group: "oidoGroupSpeech", min: 2 },
    { jump: "oido-ritmo", key: "oidoTocRitmo", blurb: "oidoBlurbRhythm", group: "oidoGroupSpeech", min: 3 },
    { jump: "oido-chunks", key: "oidoTocChunks", blurb: "oidoBlurbChunks", group: "oidoGroupSpeech", min: 1, kidsHide: true },
    { jump: "oido-tips", key: "oidoTocTips", blurb: "oidoBlurbTips", group: "oidoGroupSpeech", min: 3, kidsHide: true },
    { jump: "oido-podcasts", key: "podcast", blurb: "oidoBlurbPodcasts", group: "oidoGroupPractice", min: 1 },
    { jump: "pron-panel", key: "pron", blurb: "oidoBlurbPron", group: "oidoGroupPractice", min: 1 },
    { jump: "stories-panel", key: "stories", blurb: "oidoBlurbStories", group: "oidoGroupPractice", min: 1 },
  ].filter((i) => n >= i.min && !(kids && i.kidsHide));
}

/* Marco único: catálogo → una sala. Ver docs/ESTANDAR.md.
   Hub: .lab-hub + renderLabHub. Sala: .lab-topic[data-lab] + openLabRoom.
   Guía: ENLAB.ui.*.guide[place] = { t, w, s[], d? }. */
function renderOidoToc() {
  renderLabHub("oido-toc", oidoHubItems());
  renderOidoResume();
}

function rememberOidoRoom(id) {
  if (!id) return;
  localStorage.setItem("enlab-oido-last", JSON.stringify({ id, at: Date.now(), day: todayKey() }));
}

function highlightOidoHubPick() {
  $$("#oido-toc .oido-pick-hint").forEach((el) => el.remove());
  $$("#oido-toc .lab-hub-group").forEach((g) => g.classList.remove("lab-hub-now"));
  const first = $("#oido-toc .lab-hub-group");
  if (!first) {
    $("#oido-toc")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  first.classList.add("lab-hub-now");
  const kick = first.querySelector(".kicker");
  if (kick) kick.insertAdjacentHTML("afterend", `<p class="oido-pick-hint muted">${esc(t("oidoPickHint"))}</p>`);
  first.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderOidoResume() {
  const el = $("#oido-resume");
  if (!el) return;
  let last = null;
  try { last = JSON.parse(localStorage.getItem("enlab-oido-last") || "null"); } catch { last = null; }
  const panel = $("#vocales");
  const here = panel?.classList.contains("lab-in") && panel.querySelector(".lab-topic.on")?.dataset.lab;
  if (!last?.id || here === last.id) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  const topic = document.querySelector(`[data-lab="${CSS.escape(last.id)}"]`);
  const inHub = typeof oidoHubItems === "function" && oidoHubItems().some((i) => i.jump === last.id);
  if (!topic || !inHub) {
    el.hidden = false;
    el.innerHTML = `<span class="muted">${esc(t("oidoResumeGone"))}</span> <button type="button" class="chip" data-oido-pick>${esc(t("oidoPickRoom"))}</button>`;
    return;
  }
  const title = topic.querySelector("h3")?.textContent?.trim() || last.id;
  const n = daysAgo(last.day);
  const when = n <= 0 ? t("oidoResumeToday") : n === 1 ? t("oidoResumeYday") : t("oidoResumeAgo", { n });
  const kids = typeof kidsOn === "function" && kidsOn();
  const label = kids ? t("oidoResumeKids") : `${when} ${title}`;
  el.hidden = false;
  el.innerHTML = `<button type="button" class="chip" data-lab-jump="${esc(last.id)}" title="${esc(title)}">${esc(label)}</button>`;
}

function renderLabHub(navId, items) {
  const nav = document.getElementById(navId);
  if (!nav) return;
  const groups = [];
  items.forEach((i) => {
    const gkey = i.group || "";
    const last = groups[groups.length - 1];
    if (!last || last.key !== gkey) groups.push({ key: gkey, items: [i] });
    else last.items.push(i);
  });
  nav.innerHTML = groups.map((g) => `
    <div class="lab-hub-group">
      ${g.key ? `<p class="kicker">${esc(t(g.key))}</p>` : ""}
      <div class="lab-hub-grid">
        ${g.items.map((i) => `
          <button type="button" class="lab-card" data-lab-jump="${esc(i.jump)}" data-jump="${esc(i.jump)}">
            <strong>${esc(t(i.key))}</strong>
            <span class="muted">${esc(t(i.blurb))}</span>
          </button>`).join("")}
      </div>
    </div>`).join("");
}

function quizHubItems() {
  return [
    { jump: "quiz-verbs", key: "quizGroupVerbs", blurb: "quizBlurbVerbs" },
    { jump: "quiz-ear", key: "quizGroupEar", blurb: "quizBlurbEar" },
    { jump: "quiz-uso", key: "quizGroupUso", blurb: "quizBlurbUso" },
    { jump: "quiz-exams", key: "quizGroupExams", blurb: "quizBlurbExams" },
  ];
}

function hablarHubItems() {
  const kids = kidsOn();
  const phrasals = $("#phrasals-work-card") && !$("#phrasals-work-card").hidden;
  return [
    { jump: "roleplay-card", key: "role", blurb: "labBlurbRole" },
    { jump: "interview-sim-card", key: "interview", blurb: "labBlurbInterview" },
    { jump: "email-card", key: "email", blurb: "labBlurbEmail" },
    { jump: "chat-work-card", key: "chat", blurb: "labBlurbChat" },
    { jump: "writing-panel", key: "writing", blurb: "labBlurbWriting" },
    ...(phrasals ? [{ jump: "phrasals-work-card", key: "phrasals", blurb: "labBlurbPhrasals" }] : []),
    ...(!kids ? [{ jump: "duo-card", key: "duo", blurb: "labBlurbDuo" }] : []),
  ];
}

function ayudaHubItems() {
  const kids = kidsOn();
  return [
    { jump: "ai-prompts", key: "labPrompts", blurb: "labBlurbPrompts", group: "labGroupHelp" },
    { jump: "plan-list", key: "plan21", blurb: "labBlurbPlan", group: "labGroupHelp" },
    { jump: "a11y-bar", key: "a11y", blurb: "labBlurbA11y", group: "labGroupYou" },
    { jump: "error-journal", key: "journalTitle", blurb: "labBlurbJournal", group: "labGroupYou" },
    { jump: "class-pro-panel", key: "classPro", blurb: "labBlurbClass", group: "labGroupClass" },
    ...(!kids ? [{ jump: "lab-audit", key: "audit", blurb: "labBlurbAudit", group: "labGroupClass" }] : []),
    { jump: "perf-panel", key: "perfTitle", blurb: "labBlurbPerf", group: "labGroupClass" },
  ];
}

function renderQuizHub() {
  renderLabHub("quiz-hub", quizHubItems());
  renderQuizNow();
  window.PLUS?.renderPlaceQuizResume?.();
}
function renderHablarHub() { renderLabHub("hablar-hub", hablarHubItems()); }

function playableTodayGame() {
  const g = typeof todayGame === "function" ? todayGame() : { game: "" };
  const kids = typeof kidsOn === "function" && kidsOn();
  const ok = new Set(["choice", "type", "ed", "ear", "exam", "dict", "listen", "uso", "art", "prep", "phrasal", "cond", "emailtone", "story", "place", "weekly", "cert"]);
  let game = g.game || "";
  if (game === "travel" || game === "chat") game = "";
  if (kids && (game === "cert" || game === "place")) game = "";
  if (game && ok.has(game)) {
    return { game, label: g.label || t("quizNowDefault"), hint: g.hint || t("quizNowDefaultHint") };
  }
  return { game: "choice", label: t("quizNowDefault"), hint: t("quizNowDefaultHint") };
}

function cierreMissGame() {
  const r = typeof loadCierreResult === "function" ? loadCierreResult() : null;
  if (!r) return null;
  if (r.earFail) return { game: "ear", label: t("hoyDoneEar") };
  if (r.useFail) return { game: "uso", label: t("hoyDoneUso") };
  return null;
}

function renderQuizNow() {
  const el = $("#quiz-now");
  if (!el) return;
  const g = playableTodayGame();
  const miss = cierreMissGame();
  const missBtn = miss
    ? `<button type="button" class="btn ghost sm" data-quiz-miss="${esc(miss.game)}">${esc(miss.label)}</button>`
    : "";
  el.innerHTML = `<p class="kicker">${esc(t("quizNowKicker"))}</p>
    <p><strong>${esc(g.label)}</strong></p>
    <p class="muted">${esc(g.hint)}</p>
    <button type="button" class="btn" id="quiz-now-btn">${esc(t("quizNowPlay"))}</button>
    ${missBtn}`;
}

function startTodayQuiz(mode) {
  const game = mode || playableTodayGame().game;
  if ($("#quiz-mode")) $("#quiz-mode").value = game;
  if (typeof syncQuizModePicks === "function") syncQuizModePicks();
  startQuiz();
}
function renderAyudaHub() { renderLabHub("ia-hub", ayudaHubItems()); }

function quizRoomFor(mode) {
  const map = {
    choice: "quiz-verbs", type: "quiz-verbs", ed: "quiz-verbs",
    ear: "quiz-ear", exam: "quiz-ear", dict: "quiz-ear", listen: "quiz-ear",
    uso: "quiz-uso", art: "quiz-uso", prep: "quiz-uso", phrasal: "quiz-uso",
    cond: "quiz-uso", emailtone: "quiz-uso", story: "quiz-uso",
    place: "quiz-exams", weekly: "quiz-exams", cert: "quiz-exams",
  };
  return map[mode] || "quiz-verbs";
}

function openQuizRoom(mode) {
  return openLabRoom(quizRoomFor(mode));
}

function quizPeerModes(mode) {
  const room = quizRoomFor(mode);
  const groups = {
    "quiz-verbs": ["choice", "type", "ed"],
    "quiz-ear": ["ear", "exam", "dict", "listen"],
    "quiz-uso": ["uso", "art", "prep", "phrasal", "cond", "emailtone", "story"],
    "quiz-exams": ["place", "weekly", ...(typeof kidsOn === "function" && kidsOn() ? [] : ["cert"])],
  };
  return (groups[room] || []).filter((m) => m !== mode);
}

function quizPeerHtml() {
  if (!quiz || quiz.mode === "cierre") return "";
  const peers = quizPeerModes(quiz.mode);
  if (!peers.length) return "";
  return `<p class="muted quiz-peers-label">${esc(t("quizSameGroup"))}</p>
    <div class="row quiz-peers">${peers.map((m) =>
      `<button type="button" class="btn ghost sm" data-quiz-start="${esc(m)}">${esc(t(`quizModes.${m}.t`))}</button>`
    ).join("")}</div>`;
}

function closeLabRoom(panel) {
  if (typeof panel === "string") panel = document.getElementById(panel);
  if (!panel) return;
  panel.classList.remove("lab-in");
  panel.querySelectorAll(".lab-topic").forEach((el) => el.classList.remove("on"));
  syncGuide();
  if (panel.id === "vocales") renderOidoResume();
}

function closeOidoTopic() {
  closeLabRoom($("#vocales"));
}

function openLabRoom(jumpId) {
  if (!jumpId) return false;
  const raw = String(jumpId).replace(/^#/, "");
  const target = document.getElementById(raw)
    || document.querySelector(`[data-lab="${CSS.escape(raw)}"]`);
  const topic = target?.classList?.contains("lab-topic")
    ? target
    : target?.closest(".lab-topic");
  if (!topic) return false;
  const panel = topic.closest(".panel");
  if (!panel) return false;
  if (typeof showTab === "function" && currentTab !== panel.id) showTab(panel.id);
  panel.classList.add("lab-in");
  panel.querySelectorAll(".lab-topic").forEach((el) => el.classList.toggle("on", el === topic));
  const titleEl = panel.querySelector(".lab-room-title");
  if (titleEl) titleEl.textContent = topic.querySelector("h3")?.textContent || "";
  if (panel.id === "vocales") {
    $$("#oido-toc .lab-hub-group").forEach((g) => g.classList.remove("lab-hub-now"));
    $$("#oido-toc .oido-pick-hint").forEach((el) => el.remove());
    String(topic.dataset.paint || "").split(",").forEach((id) => { if (id) paintOidoSection(id); });
    paintOidoByJump(raw);
    rememberOidoRoom(topic.dataset.lab || raw);
  }
  syncGuide();
  if (panel.id === "vocales") renderOidoResume();
  if (topic.dataset.lab === "quiz-exams") {
    window.PLUS?.renderPlaceQuizResume?.();
    renderWeeklyQuizResume();
  }
  if (topic.dataset.lab === "duo-card") window.NR?.renderDuoResumeHablar?.();
  return true;
}

function openOidoTopic(jumpId) {
  return openLabRoom(jumpId);
}

function playDailyPairs() {
  const pairs = window._dailyPairs || [];
  if (!pairs.length) return;
  pairs.forEach((p) => markSession("pairs", `${p.short}|${p.long}`));
  bump("heard");
  cueHoyNext();
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
  cueHoyNext();
  speakQueue([p.short, p.long], true);
}

function jumpHoyStep(n) {
  const path = hoyPath();
  const map = {
    1: "#hoy-step-1",
    2: lvlNum() >= 2 ? "#block-daily-role" : "#hoy-step-3",
    3: "#hoy-step-3",
    4: "#hoy-step-4",
    5: "#hoy-step-cierre",
  };
  const sel = map[n];
  const idx = path.findIndex((s) => s.sel === sel);
  if (idx >= 0) {
    goHoyStep(idx);
    return;
  }
  const el = $(sel || "");
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

function pauseTimer() {
  if (!timerState().running) return;
  persistTimer({ running: false, remaining: remainingNow(), until: 0 });
  clearInterval(timerTick);
  releaseWake();
  renderClock();
  fillYouAre();
}

function resumeHoyTimer() {
  const left = remainingNow();
  if (left <= 0 || timerState().running) return;
  persistTimer({ running: true, remaining: left, until: Date.now() + left * 1000 });
  startTimerLoop();
  requestWake();
  renderClock();
  fillYouAre();
}

function restartHoyDoneTimer() {
  try { sessionStorage.setItem("enlab-hoy-extra-timer", "1"); } catch { /* ignore */ }
  persistTimer({ running: true, remaining: TIMER_TOTAL, until: Date.now() + TIMER_TOTAL * 1000 });
  startTimerLoop();
  requestWake();
  renderClock();
  fillYouAre();
}

function toggleHoyDoneTimer() {
  const left = remainingNow();
  if (left <= 0 && !timerState().running) {
    restartHoyDoneTimer();
    return;
  }
  if (timerState().running) pauseTimer();
  else resumeHoyTimer();
}

function syncHoyDoneTimer() {
  const timerBtn = $("#hoy-done-timer");
  if (!timerBtn) return;
  const done = $("#hoy")?.classList.contains("path-done");
  const left = remainingNow();
  const running = timerState().running;
  const mid = !!done && left > 0 && left < TIMER_TOTAL - 0.5;
  const again = !!done && !running && left <= 0;
  timerBtn.hidden = !(mid || again);
  if (!(mid || again)) {
    setPressed(timerBtn, false);
    return;
  }
  if (again) {
    timerBtn.textContent = t("hoyDoneTimerAgain");
    setPressed(timerBtn, false);
    return;
  }
  const m = Math.max(1, Math.ceil(left / 60));
  timerBtn.textContent = running ? t("timerPause") : t("hoyDoneTimer", { m });
  setPressed(timerBtn, running);
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
    if (left <= 0 && !timerState().running) btn.textContent = t("timerAgain");
    else btn.textContent = timerState().running ? t("timerPause") : t("hoyTimerStart");
    setPressed(btn, !!timerState().running);
  }
  syncHoyDoneTimer();
}

function startTimerLoop() {
  clearInterval(timerTick);
  timerTick = setInterval(() => {
    if (remainingNow() <= 0 && timerState().running) {
      persistTimer({ running: false, remaining: 0, until: 0 });
      clearInterval(timerTick);
      releaseWake();
      try { sessionStorage.removeItem("enlab-hoy-extra-timer"); } catch { /* ignore */ }
      buzz(true);
    }
    renderClock();
  }, 250);
}

function toggleTimer() {
  const left = remainingNow();
  const kickPath = () => {
    ensureHoyPathDay();
    if (hoyPathI < 0) advanceHoyPath();
  };
  if (left <= 0) {
    persistTimer({ running: true, remaining: TIMER_TOTAL, until: Date.now() + TIMER_TOTAL * 1000 });
    startTimerLoop();
    requestWake();
    renderClock();
    hoyPathI = -1;
    kickPath();
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
    kickPath();
  }
  renderClock();
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

async function ensurePushSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || location.protocol === "file:") return null;
  const key = window.ENLAB_VAPID_PUBLIC;
  if (!key) return null;
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
  }
  try {
    localStorage.setItem("enlab-push-sub", JSON.stringify(sub));
    if (window.ENLAB_IDB?.mirror) window.ENLAB_IDB.mirror("enlab-push-sub", JSON.stringify(sub));
  } catch { /* ignore */ }
  return sub;
}

async function testPushNotification() {
  if (!("serviceWorker" in navigator)) {
    fireRemind();
    return;
  }
  const due = typeof srsDueList === "function" ? srsDueList(99).length : 0;
  const body = due >= 3 ? t("pushDueBody", { due }) : t("pushDailyBody");
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification(t("pushTitle"), {
    body,
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    tag: "enlab-test",
    data: { url: "./index.html#hoy" },
  });
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
    setPressed(btn, on);
    btn.textContent = on ? t("remindOnBtn") : t("remindOn");
  }
  const st = $("#remind-status");
  if (!st) return;
  if (!("Notification" in window) || location.protocol === "file:") {
    st.textContent = t("remindFileProto");
    return;
  }
  if (on && Notification.permission === "granted") {
    const extra = isStandalone() ? t("remindExtraStandalone") : t("remindExtraBrowser");
    const push = localStorage.getItem("enlab-push-sub") ? ` ${t("pushOn")}` : "";
    st.textContent = t("remindScheduled", { time: remindTime(), extra }) + push;
    const testBtn = $("#remind-push-test");
    if (testBtn) testBtn.hidden = false;
    syncRemindToSw();
    return;
  }
  if (on && Notification.permission === "denied") {
    st.textContent = t("remindBlocked");
    return;
  }
  const testBtn = $("#remind-push-test");
  if (testBtn) testBtn.hidden = true;
  st.textContent = t("remindDefault");
  syncRemindToSw();
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
  ensurePushSubscription().catch(() => {});
  renderRemind();
  paintPwaButtons();
  syncRemindToSw();
}

function sessionCompleteToday() {
  return sessionTaskCount(sessionData()) >= 4;
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
}

function syncRemindToSw() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  const dueCount = typeof srsDueList === "function" ? srsDueList(99).length : 0;
  const payload = {
    on: remindOn(),
    time: remindTime(),
    complete: sessionCompleteToday() ? todayKey() : "",
    today: todayKey(),
    dueCount,
    lang: typeof uiLang === "function" ? uiLang() : "es",
  };
  navigator.serviceWorker.ready.then((reg) => {
    reg.active?.postMessage({ type: "enlab-remind", payload });
    if (remindOn() && "periodicSync" in reg) {
      reg.periodicSync.register("enlab-remind", { minInterval: 12 * 60 * 60 * 1000 }).catch(() => {});
    }
    if (remindOn()) ensurePushSubscription().catch(() => {});
  }).catch(() => {});
}

function paintPwaButtons() {
  const standalone = isStandalone();
  $$("[data-pwa-install]").forEach((btn) => {
    if (standalone) btn.hidden = true;
    else if (window._pwaDeferred) btn.hidden = false;
  });
}

function fireRemind() {
  localStorage.setItem("enlab-remind-last", todayKey());
  buzz(true);
  const due = typeof srsDueList === "function" ? srsDueList(99).length : 0;
  const body = due >= 3 ? t("pushDueBody", { due }) : t("pushDailyBody");
  try {
    new Notification(t("pushTitle"), {
      body,
      icon: "./icon-192.png",
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
  $("#remind-push-test")?.addEventListener("click", () => { testPushNotification(); });
  setInterval(tickRemind, 20000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") tickRemind();
  });
  tickRemind();
}

/* ——— Lotes A–F: i18n, niño, repaso, voz, shadowing, racha, transfer, entrevista ——— */

function uiLang() {
  return localStorage.getItem("enlab-ui-lang") === "en" ? "en" : "es";
}

function t(key, vars) {
  const lang = uiLang();
  const parts = String(key).split(".");
  let val = ENLAB.ui?.[lang];
  for (const p of parts) val = val?.[p];
  if (val == null) {
    val = ENLAB.ui?.es;
    for (const p of parts) val = val?.[p];
  }
  if (typeof val !== "string") return String(key);
  if (!vars) return val;
  return val.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
}

function applyQuizModeI18n() {
  $$("[data-quiz-mode]").forEach((btn) => {
    const m = btn.dataset.quizMode;
    const mode = t(`quizModes.${m}.t`);
    const sub = t(`quizModes.${m}.s`);
    const strong = btn.querySelector("strong");
    const span = btn.querySelector("span");
    if (strong && mode) strong.textContent = mode;
    if (span && sub) span.textContent = sub;
  });
  const aria = t("quizModesAria");
  $$(".mode-picks").forEach((picks) => {
    if (aria) picks.setAttribute("aria-label", aria);
  });
}

function kidsOn() {
  return localStorage.getItem("enlab-kids") === "1";
}

function autoPathOn() {
  return localStorage.getItem("enlab-auto-path") !== "0";
}

function applyKidsMode() {
  const on = kidsOn();
  document.body.classList.toggle("kids-mode", on);
  setPressed($("#kids-toggle"), on);
  const banner = $("#kids-banner");
  if (banner) banner.hidden = !on;
  if (on && localStorage.getItem("enlab-rate") !== "slow") {
    localStorage.setItem("enlab-rate", "slow");
  }
  if (typeof renderRateBar === "function") renderRateBar();
  if (typeof renderOidoToc === "function") renderOidoToc();
  if (typeof renderQuizHub === "function") renderQuizHub();
  if (typeof renderHablarHub === "function") renderHablarHub();
  if (typeof renderAyudaHub === "function") renderAyudaHub();
  if (typeof renderOidoResume === "function") renderOidoResume();
  if (typeof renderDailyVerbs === "function") renderDailyVerbs();
  syncPrefsBadge();
  if ($("#guide-panel") && !$("#guide-panel").hidden) fillGuide();
  fillYouAre();
}

function setPrefsOpen(on) {
  const panel = $("#prefs-panel");
  const btn = $("#prefs-toggle");
  if (on) {
    const gp = $("#guide-panel");
    if (gp) gp.hidden = true;
    $("#guide-toggle")?.setAttribute("aria-expanded", "false");
    setPressed($("#guide-toggle"), false);
  }
  if (panel) panel.hidden = !on;
  if (btn) {
    btn.setAttribute("aria-expanded", on ? "true" : "false");
    setPressed(btn, on);
  }
  fillYouAre();
}

function guidePlace() {
  const hoy = $("#hoy");
  if (currentTab === "hoy" && hoy?.classList.contains("path-done")) return "hoyDone";
  const panel = document.getElementById(currentTab);
  const topic = panel?.querySelector(".lab-topic.on");
  if (topic) return topic.dataset.lab || topic.dataset.oido || currentTab;
  return currentTab;
}

function guideEntry(place) {
  const lang = uiLang();
  const pack = ENLAB.ui?.[lang]?.guide || {};
  const es = ENLAB.ui?.es?.guide || {};
  if (pack[place]) return pack[place];
  if (es[place]) return es[place];
  const oido = place.startsWith("oido-") || place === "pron-panel" || place === "stories-panel";
  if (oido) return pack.oidoRoom || es.oidoRoom;
  return pack[currentTab] || es[currentTab] || pack.hoy || es.hoy;
}

function guideExtraTimerLine() {
  try {
    if (sessionStorage.getItem("enlab-hoy-extra-timer") === "1" && timerState().running) {
      return t("guideHoyDoneExtraTimer");
    }
  } catch { /* ignore */ }
  return "";
}

function certTimedOutToday() {
  try {
    const raw = JSON.parse(localStorage.getItem("enlab-cert-score") || "null");
    return !!(raw?.timeUp && raw?.day === todayKey());
  } catch { return false; }
}

function guideFillEntry() {
  const place = guidePlace();
  const full = guideEntry(place);
  if (!full) return full;
  let entry = full;
  if (typeof kidsOn === "function" && kidsOn()) {
    const lang = uiLang();
    const pack = ENLAB.ui?.[lang]?.guideKids || {};
    const es = ENLAB.ui?.es?.guideKids || {};
    if (pack[place] || es[place]) entry = pack[place] || es[place];
    else if (pack[currentTab] || es[currentTab]) entry = pack[currentTab] || es[currentTab];
    else {
      const oido = place.startsWith("oido-") || place === "pron-panel" || place === "stories-panel";
      if (oido) entry = pack.oidoRoom || es.oidoRoom || full;
      else {
        entry = {
          t: full.t,
          w: String(full.w || "").split(". ")[0] + (full.w ? "." : ""),
          s: (full.s || []).slice(0, 2),
          d: full.d,
        };
      }
    }
  }
  if (place === "hoyDone") {
    const extra = guideExtraTimerLine();
    if (extra) {
      entry = {
        ...entry,
        w: entry.w ? `${entry.w} ${extra}` : extra,
        s: [...(entry.s || []), extra],
      };
    }
  }
  if (repasoOn()) {
    const rep = t("youAreRepaso");
    entry = {
      ...entry,
      w: entry.w ? `${rep} ${entry.w}` : rep,
      s: [rep, ...(entry.s || [])].slice(0, 4),
    };
  }
  const placeNow = window.PLUS?.loadPlaceNow?.();
  if (placeNow && (place === "quiz-exams" || place === "place" || currentTab === "quiz")) {
    const hint = typeof kidsOn === "function" && kidsOn()
      ? t("guidePlaceResumeKids", { i: placeNow.i + 1, total: placeNow.items.length })
      : t("guidePlaceResume", { i: placeNow.i + 1, total: placeNow.items.length });
    entry = {
      ...entry,
      w: entry.w ? `${hint} ${entry.w}` : hint,
      s: [hint, ...(entry.s || [])].slice(0, 4),
    };
  }
  return entry;
}

function guideSeen() {
  try {
    const raw = JSON.parse(localStorage.getItem("enlab-guide-seen") || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function markGuideSeen(place) {
  const s = guideSeen();
  if (!s.includes(place)) {
    s.push(place);
    localStorage.setItem("enlab-guide-seen", JSON.stringify(s));
  }
}

function fillGuide() {
  const entry = guideFillEntry();
  if (!entry) return;
  const title = $("#guide-title");
  const why = $("#guide-why");
  const steps = $("#guide-steps");
  const done = $("#guide-done");
  if (title) title.textContent = entry.t || "";
  if (why) why.textContent = entry.w || "";
  if (steps) {
    const list = Array.isArray(entry.s) ? entry.s : [];
    steps.innerHTML = list.map((line) => `<li>${esc(line)}</li>`).join("");
  }
  if (done) {
    done.hidden = !entry.d;
    done.textContent = entry.d ? `${t("guideWhen")} ${entry.d}` : "";
  }
  fillGuideMap();
  fillGuideLab();
  fillYouAre();
}

function fillYouAreWhen(entry) {
  const when = $("#you-are-when");
  if (!when) return;
  const hoy = $("#hoy");
  const pathDone = currentTab === "hoy" && hoy?.classList.contains("path-done");
  if (pathDone) {
    when.hidden = true;
    when.textContent = "";
    return;
  }
  const d = entry?.d;
  when.hidden = !d;
  when.textContent = d ? `${t("guideWhen")} ${d}` : "";
}

function fillYouAreChips() {
  const box = $("#you-are-chips");
  if (!box) return;
  const guideOpen = $("#guide-panel") && !$("#guide-panel").hidden;
  const parts = [];
  const hoy = $("#hoy");
  const pathDone = currentTab === "hoy" && hoy?.classList.contains("path-done");
  if (pathDone && certTimedOutToday()) {
    parts.push(`<button type="button" class="btn sm" data-cert-retry>${esc(t("certRetryBtn"))}</button>`);
  }
  if (currentTab === "hablar" && window.NR?.duoYouAreChipHtml) {
    const duo = window.NR.duoYouAreChipHtml();
    if (duo) parts.push(duo);
  }
  box.hidden = guideOpen || !parts.length;
  box.innerHTML = parts.join("");
}

function fillYouAre() {
  const btn = $("#you-are");
  const text = $("#you-are-text");
  if (!btn || !text) return;
  const guideOpen = $("#guide-panel") && !$("#guide-panel").hidden;
  btn.hidden = !!guideOpen;
  if (jumpNote && currentTab !== "quiz") jumpNote = "";
  const entry = guideFillEntry() || guideEntry(guidePlace());
  const hoy = $("#hoy");
  const pathOn = currentTab === "hoy"
    && hoy?.classList.contains("path-on")
    && !hoy.classList.contains("path-done");
  const pathDone = currentTab === "hoy" && hoy?.classList.contains("path-done");
  if (pathDone) {
    let line = "";
    try {
      if (sessionStorage.getItem("enlab-hoy-extra-timer") === "1" && timerState().running) {
        line = t("youAreExtraTimer");
      }
    } catch { /* ignore */ }
    if (!line) {
      const oidoTitle = oidoLastTitle();
      if (oidoTitle) line = t("youAreOidoLast", { title: oidoTitle });
    }
    if (!line && certTimedOutToday()) line = t("youAreCertTimeUp");
    if (!line) {
      const n = stats().streak || 0;
      line = n > 0 ? t("youAreHoyDoneStreak", { n }) : (entry?.t || t("hoyDoneKicker"));
    }
    text.textContent = line;
    fillYouAreWhen(entry);
    fillYouAreChips();
    return;
  }
  if (currentTab === "hoy" && !pathOn && !pathDone) {
    const mid = hoyMidSessionLine();
    if (mid) {
      text.textContent = mid;
      fillYouAreWhen(entry);
      fillYouAreChips();
      return;
    }
  }
  const pathCopy = $("#hoy-path-copy")?.textContent?.trim();
  if (pathOn && pathCopy) {
    if (quiz?.mode === "cierre" && quiz.items?.length && quiz.i < quiz.items.length) {
      text.textContent = t("cierreQ", { i: quiz.i + 1, n: quiz.items.length, kind: cierreKindOf(quiz.items[quiz.i]) });
    } else {
      text.textContent = pathCopy;
    }
    fillYouAreWhen(entry);
    fillYouAreChips();
    return;
  }
  if (jumpNote && currentTab === "quiz") {
    text.textContent = jumpNote;
    fillYouAreWhen(entry);
    fillYouAreChips();
    return;
  }
  if (repasoOn()) {
    text.textContent = t("youAreRepaso");
    fillYouAreWhen(entry);
    fillYouAreChips();
    return;
  }
  text.textContent = entry?.t || "";
  fillYouAreWhen(entry);
  fillYouAreChips();
}

function fillGuideMap() {
  const box = $("#guide-map");
  if (!box) return;
  if (currentTab === "hoy" && $("#hoy")?.classList.contains("path-done")) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }
  const panel = document.getElementById(currentTab);
  const cards = [...(panel?.querySelectorAll(".lab-card") || [])];
  const inRoom = panel?.classList.contains("lab-in");
  if (inRoom) {
    const here = guidePlace();
    const hereCard = panel.querySelector(`[data-lab-jump="${CSS.escape(here)}"]`);
    const group = hereCard?.closest(".lab-hub-group") || panel.querySelector(".lab-hub");
    const sibs = [...(group?.querySelectorAll(".lab-card") || [])]
      .filter((c) => (c.dataset.labJump || c.dataset.jump) !== here);
    if (!sibs.length) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    box.hidden = false;
    box.innerHTML = `<p class="kicker">${esc(t("guideAlso"))}</p><div class="guide-lab-row">`
      + sibs.map((c) => guideCardChip(c)).join("")
      + `</div>`;
    return;
  }
  const groups = [...(panel?.querySelectorAll(".lab-hub-group") || [])];
  if (cards.length < 2) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }
  box.hidden = false;
  const named = groups.filter((g) => g.querySelector(".kicker")?.textContent?.trim());
  if (named.length >= 2) {
    box.innerHTML = `<p class="kicker">${esc(t("guideCards"))}</p>`
      + named.map((g) => {
        const k = g.querySelector(".kicker")?.textContent || "";
        const chips = [...g.querySelectorAll(".lab-card")].map((c) => guideCardChip(c)).join("");
        return `<div class="guide-map-group"><p><strong>${esc(k)}</strong></p><div class="guide-lab-row">${chips}</div></div>`;
      }).join("");
    return;
  }
  box.innerHTML = `<p class="kicker">${esc(t("guideCards"))}</p>`
    + cards.map((c) => {
      const jump = c.dataset.labJump || c.dataset.jump || "";
      const name = c.querySelector("strong")?.textContent || "";
      const blurb = c.querySelector(".muted")?.textContent || "";
      return `<button type="button" class="guide-jump" data-guide-jump="${esc(jump)}"><strong>${esc(name)}</strong><span class="muted">${esc(blurb)}</span></button>`;
    }).join("");
}

function guideCardChip(c) {
  const jump = c.dataset.labJump || c.dataset.jump || "";
  const name = c.querySelector("strong")?.textContent || "";
  return `<button type="button" class="chip sm" data-guide-jump="${esc(jump)}">${esc(name)}</button>`;
}

function fillGuideLab() {
  const box = $("#guide-lab");
  if (!box) return;
  const lang = uiLang();
  const tabs = ENLAB.ui?.[lang]?.tabs || ENLAB.ui?.es?.tabs || {};
  const order = ["hoy", "vocales", "verbos", "quiz", "hablar", "ia"];
  box.hidden = false;
  box.innerHTML = `<p class="kicker">${esc(t("guideLab"))}</p><p class="muted guide-lab-hint">${esc(t("guideLabHint"))}</p><div class="guide-lab-row">`
    + order.map((id) => {
      const on = id === currentTab ? " on" : "";
      const cur = id === currentTab ? "page" : "false";
      return `<button type="button" class="chip sm${on}" data-guide-tab="${id}" aria-current="${cur}">${esc(tabs[id] || id)}</button>`;
    }).join("")
    + `</div>`;
}

function setGuideOpen(on) {
  const panel = $("#guide-panel");
  const btn = $("#guide-toggle");
  if (on) {
    const pp = $("#prefs-panel");
    if (pp) pp.hidden = true;
    $("#prefs-toggle")?.setAttribute("aria-expanded", "false");
    setPressed($("#prefs-toggle"), false);
  }
  if (panel) panel.hidden = !on;
  if (btn) {
    btn.setAttribute("aria-expanded", on ? "true" : "false");
    setPressed(btn, on);
  }
  if (on) {
    fillGuide();
    markGuideSeen(currentTab);
  }
  fillYouAre();
}

function syncGuide() {
  fillYouAre();
  const panel = $("#guide-panel");
  if (panel && !panel.hidden) fillGuide();
}

function maybeOfferGuide() {
  if (localStorage.getItem("enlab-guide-quiet") === "1") return;
  const welcome = $("#welcome");
  if (welcome && !welcome.hidden) return;
  if (guideSeen().includes(currentTab)) return;
  setGuideOpen(true);
}

function syncPrefsBadge() {
  const btn = $("#prefs-toggle");
  if (!btn) return;
  const active = kidsOn() || hideEsOn() || uiLang() === "en" || localStorage.getItem("enlab-travel") === "1" || !!classroomPin();
  btn.classList.toggle("has-on", active);
}

function applyUiLang() {
  if (window._enlabApplyingUi) return;
  window._enlabApplyingUi = true;
  try {
    applyUiLangBody();
  } finally {
    window._enlabApplyingUi = false;
  }
}

function applyUiLangBody() {
  const lang = uiLang();
  document.documentElement.lang = lang === "en" ? "en" : "es";
  document.title = "English Lab";
  $$("[data-i18n]").forEach((el) => {
    const val = t(el.dataset.i18n);
    if (val && val !== el.dataset.i18n) el.textContent = val;
  });
  $$("[data-i18n-placeholder]").forEach((el) => {
    const val = t(el.dataset.i18nPlaceholder);
    if (val) el.placeholder = val;
  });
  $$("[data-i18n-title]").forEach((el) => {
    const val = t(el.dataset.i18nTitle);
    if (val) el.title = val;
  });
  $$("[data-i18n-aria]").forEach((el) => {
    const val = t(el.dataset.i18nAria);
    if (val) el.setAttribute("aria-label", val);
  });
  $$("option[data-i18n]").forEach((opt) => {
    const val = t(opt.dataset.i18n);
    if (val) opt.textContent = val;
  });
  const levelBar = $("#level-bar");
  if (levelBar) levelBar.setAttribute("aria-label", t("levelAria"));
  const voiceGroup = document.querySelector(".ctrl-group[data-i18n-aria=\"voiceLabel\"]");
  if (voiceGroup) voiceGroup.setAttribute("aria-label", t("voiceLabel"));
  const themeGroup = document.querySelector(".ctrl-group[data-i18n-aria=\"themeLabel\"]");
  if (themeGroup) themeGroup.setAttribute("aria-label", t("themeLabel"));
  const nav = document.querySelector("nav.tabs");
  if (nav) nav.setAttribute("aria-label", t("navAria"));
  $$("[data-tab]").forEach((tab) => {
    const label = ENLAB.ui?.[lang]?.tabs?.[tab.dataset.tab];
    if (label) tab.textContent = label;
  });
  applyQuizModeI18n();
  const map = {
    "#ui-lang-toggle": "uiLang", "#kids-toggle": "kids", "#travel-toggle": "travel",
    "#prefs-toggle": "prefs",
    "#guide-toggle": "guideBtn",
    "#guide-gotit": "guideGotIt",
    "#repaso-btn": "repaso", "#repaso-quiz-btn": "quizWeak", "#repaso-exit": "repasoExit",
    "#remind-push-test": "pushTest", "#quiz-start": "quizStart", "#speak-listen": "speakListen", "#speak-rec": "speakRec",
    "#speak-next": "speakNext", "#shadow-go": "shadowGo", "#transfer-copy": "transferCopy",
    "#transfer-import": "transferImport", "#class-pin-save": "classPinSave",
    "#class-pin-clear": "classPinClear", "#class-print": "classPrint",
    "#prog-export": "export", "#prog-import": "import", "#play-daily-pairs": "step1Play",
    "#cert-start-btn": "certStart", "#speak-shadow": "shadow", "#speak-hoy": "speakHoy",
    "#oido-back": "oidoBack",
    "#start-ear-from-oido": "oidoPlayEar", "#start-ed-from-oido": "oidoPlayEd2",
    "#start-uso-from-oido": "oidoPlayUso", "#welcome-go": "startPath",
  };
  Object.entries(map).forEach(([sel, key]) => {
    const el = $(sel);
    if (el) el.textContent = t(key);
  });
  if ($("#speak-rec")?.classList.contains("rec-on")) $("#speak-rec").textContent = t("speakRecordStop");
  if ($("#hoy-speak-rec")?.classList.contains("rec-on")) $("#hoy-speak-rec").textContent = t("speakRecordStop");
  const prefsOpen = $("#prefs-panel") && !$("#prefs-panel").hidden;
  setPressed($("#prefs-toggle"), prefsOpen);
  $("#prefs-toggle")?.setAttribute("aria-expanded", prefsOpen ? "true" : "false");
  setPressed($("#kids-toggle"), kidsOn());
  const kidsBanner = $("#kids-banner");
  if (kidsBanner) kidsBanner.hidden = !kidsOn();
  applyHideEs();
  setPressed($("#ui-lang-toggle"), uiLang() === "en");
  setPressed($("#travel-toggle"), localStorage.getItem("enlab-travel") === "1");
  applyTheme();
  const footNext = document.querySelector(".hoy-path-foot .hoy-next");
  if (footNext && hoyPathI >= 0 && hoyPathI < hoyPath().length - 1) footNext.textContent = t("hoyNext");
  $$(".hoy-path-actions .hoy-next, #hoy-path .hoy-next").forEach((b) => {
    if (hoyPathI < 0) b.textContent = t("startPath");
  });
  $$("[data-pwa-install]").forEach((b) => { b.textContent = t("installApp"); });
  const heroKicker = document.querySelector(".hero .kicker");
  if (heroKicker && !heroKicker.dataset.i18n) heroKicker.textContent = t("heroKicker");
  const lede = $("#level-lede");
  if (lede) lede.textContent = t("heroLede");
  if (typeof renderHomeStats === "function") renderHomeStats();
  if (typeof renderHoyPath === "function") renderHoyPath();
  if (typeof renderHoyCheck === "function") renderHoyCheck();
  if (typeof renderSituations === "function") renderSituations();
  if (typeof renderPodcastToday === "function") renderPodcastToday();
  if (typeof renderCierreToday === "function") renderCierreToday();
  if (typeof renderVerbs === "function" && currentTab === "verbos") renderVerbs();
  if (typeof renderOidoToc === "function" && currentTab === "vocales") renderOidoToc();
  if (typeof renderQuizHub === "function") renderQuizHub();
  if (typeof renderHablarHub === "function") renderHablarHub();
  if (typeof syncNetWarn === "function") syncNetWarn();
  if (typeof renderAyudaHub === "function") renderAyudaHub();
  if (typeof renderRemind === "function") renderRemind();
  if (typeof renderClock === "function") renderClock();
  if (typeof renderWeekReport === "function") renderWeekReport();
  if (typeof renderClassPin === "function") renderClassPin();
  if (typeof quiz !== "undefined" && quiz?.items?.length && typeof renderQuiz === "function") renderQuiz();
  if (window.SV?.renderHoyStoryChip) window.SV.renderHoyStoryChip();
  dirty.hablar = true;
  if (currentTab === "hablar") paintTab("hablar");
  if (window.NR?.renderLabAudit && currentTab === "ia") window.NR.renderLabAudit();
  if (window.SV?.refreshPanels && currentTab === "ia") window.SV.refreshPanels();
  syncPrefsBadge();
  const guideOpen = $("#guide-panel") && !$("#guide-panel").hidden;
  setPressed($("#guide-toggle"), guideOpen);
  $("#guide-toggle")?.setAttribute("aria-expanded", guideOpen ? "true" : "false");
  if (guideOpen) fillGuide();
  prepareWelcome();
  fillYouAre();
}

function dateKey(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function planEdVerbs() {
  const plan = ENLAB.planEdFocus || [];
  const i = (dayTheme().i - 1) % Math.max(1, plan.length);
  const infs = plan[i] || [];
  return infs.map((inf) => ENLAB.verbs.find((v) => v.inf === inf)).filter(Boolean);
}

function renderPlanEdFocus() {
  let el = $("#plan-ed-focus");
  if (!el) {
    const anchor = $("#day-theme");
    if (!anchor?.parentNode) return;
    el = document.createElement("p");
    el.id = "plan-ed-focus";
    el.className = "muted plan-ed-focus";
    anchor.insertAdjacentElement("afterend", el);
  }
  const verbs = planEdVerbs();
  if (!verbs.length) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.innerHTML = `${esc(t("planEdToday"))} ${verbs.map((v) => `<button type="button" class="say chip" data-say="${esc(simplePastOf(v))}">${esc(v.inf)}</button>`).join(" ")}`;
}

function maybeAutoAdvancePath() {
  if (!autoPathOn() || currentTab !== "hoy") return;
  if (localStorage.getItem("enlab-repaso") === "1") return;
  ensureHoyPathDay();
  const path = hoyPath();
  if (hoyPathI < 0 || hoyPathI >= path.length) return;
  const step = path[hoyPathI];
  const s = sessionData();
  let done = false;
  if (step.id === "pairs" && s.pairs.length >= 4) done = true;
  if (step.id === "verbs" && s.verbs.length >= 5) done = true;
  if (step.id === "dialog" && s.phrases.length >= 1) done = true;
  if (step.id === "cierre" && s.quizDone) done = true;
  if (step.id === "flap" && sessionStorage.getItem(`enlab-flap-${todayKey()}`) === "1") done = true;
  if (step.id === "role" && s.pairs.length >= 1) done = true;
  if (done) {
    renderHoyPath();
    cueHoyNext();
    const fast = prefersReducedMotion();
    if (!fast) buzz(false);
    if (fast) advanceHoyPath();
    else setTimeout(() => advanceHoyPath(), 900);
  }
}

function startRepasoMode() {
  localStorage.setItem("enlab-repaso", "1");
  sessionStorage.setItem("enlab-repaso-speak-only", speakOnlyWeakOn() ? "1" : "0");
  localStorage.setItem("enlab-speak-only-weak", "1");
  try {
    const hoy = $("#hoy");
    const pathOn = hoy?.classList.contains("path-on") && !hoy.classList.contains("path-done");
    if (pathOn && timerState().running) {
      sessionStorage.setItem("enlab-repaso-pause-path-timer", String(Math.floor(remainingNow())));
      pauseTimer();
    }
  } catch { /* ignore */ }
  document.body.classList.add("repaso-active");
  setPressed($("#repaso-btn"), true);
  showTab("hoy");
  $$(".hoy-next").forEach((b) => { b.hidden = true; });
  renderHoyReview();
  const box = $("#hoy-review");
  if (box) box.hidden = false;
  persistTimer({ running: true, remaining: 10 * 60, until: Date.now() + 10 * 60 * 1000 });
  startTimerLoop();
  requestWake();
  renderClock();
  const exitBtn = $("#repaso-exit");
  if (exitBtn) exitBtn.hidden = false;
  buzz(true);
}

function clearRepasoMode() {
  if (localStorage.getItem("enlab-repaso") !== "1") return;
  localStorage.removeItem("enlab-repaso");
  document.body.classList.remove("repaso-active");
  setPressed($("#repaso-btn"), false);
  const prev = sessionStorage.getItem("enlab-repaso-speak-only");
  if (prev === "0") localStorage.setItem("enlab-speak-only-weak", "0");
  sessionStorage.removeItem("enlab-repaso-speak-only");
  try {
    const saved = sessionStorage.getItem("enlab-repaso-pause-path-timer");
    if (saved != null) {
      sessionStorage.removeItem("enlab-repaso-pause-path-timer");
      pauseTimer();
      const left = Number(saved);
      const hoy = $("#hoy");
      const pathOn = hoy?.classList.contains("path-on") && !hoy.classList.contains("path-done");
      if (pathOn && left > 0) {
        persistTimer({ running: true, remaining: left, until: Date.now() + left * 1000 });
        startTimerLoop();
        requestWake();
        renderClock();
        fillYouAre();
      }
    }
  } catch { /* ignore */ }
  $$(".hoy-next").forEach((b) => { b.hidden = false; });
  const exitBtn = $("#repaso-exit");
  if (exitBtn) exitBtn.hidden = true;
}

function loadVoiceLog() {
  try {
    const raw = JSON.parse(localStorage.getItem("enlab-voice-log") || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveVoiceClip(said, blob) {
  const target = window._speakTarget?.target || "";
  if (!target && !said) return;
  const ok = said ? speakHeardOk(said, target) : false;
  const entry = {
    date: todayKey(),
    t: Date.now(),
    target,
    said,
    ok,
    audio: blob && blob.size < 120000 ? null : "",
  };
  if (blob && blob.size < 120000) {
    const reader = new FileReader();
    reader.onload = () => {
      entry.audio = String(reader.result || "");
      pushVoiceLogEntry(entry);
    };
    reader.readAsDataURL(blob);
    return;
  }
  pushVoiceLogEntry(entry);
}

function pushVoiceLogEntry(entry) {
  const log = loadVoiceLog().filter((x) => x.date === todayKey());
  log.unshift(entry);
  const all = [...log.slice(0, 5), ...loadVoiceLog().filter((x) => x.date !== todayKey())];
  localStorage.setItem("enlab-voice-log", JSON.stringify(all.slice(0, 20)));
  renderVoiceHistory();
}

function renderVoiceHistory() {
  const box = $("#voice-history");
  if (!box) return;
  const log = loadVoiceLog().filter((x) => x.date === todayKey()).slice(0, 5);
  if (!log.length) {
    box.hidden = false;
    box.innerHTML = `<p class="kicker">${esc(t("voiceHist"))}</p><p class="muted">${esc(t("voiceHistEmpty"))}</p>`;
    return;
  }
  box.hidden = false;
  box.innerHTML = `
    <p class="kicker">${esc(t("voiceHist"))}</p>
    ${log.map((row, i) => `
      <div class="voice-row">
        <span class="pill ${row.ok ? "ok" : "warn"}">${row.ok ? "✓" : "·"}</span>
        <span>${esc(row.target)}</span>
        ${row.said ? `<span class="muted">→ ${esc(row.said)}</span>` : ""}
        ${row.audio ? `<audio controls src="${esc(row.audio)}" style="max-width:100%;margin-top:4px"></audio>` : ""}
      </div>`).join("")}`;
}

let shadowTick = null;

function openShadowBox() {
  const box = $("#shadow-box");
  if (box) {
    box.hidden = false;
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function runShadowing() {
  const target = window._speakTarget?.target;
  if (!target) {
    setRecStatus(t("shadowPickFirst"), "bad");
    return;
  }
  clearInterval(shadowTick);
  let left = 30;
  const timerEl = $("#shadow-timer");
  if (timerEl) timerEl.textContent = String(left);
  speak(target, true);
  shadowTick = setInterval(() => {
    left -= 1;
    if (timerEl) timerEl.textContent = String(Math.max(0, left));
    if (left <= 0) clearInterval(shadowTick);
  }, 1000);
}

function renderStreakChart() {
  const el = $("#hoy-streak-chart");
  if (!el) return;
  const st = stats();
  const days = [];
  for (let i = 89; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    const day = (st.days || {})[key] || {};
    const heard = day.heard || 0;
    const quizN = day.quiz || 0;
    const spoke = day.spoke || 0;
    const score = heard + quizN + spoke;
    days.push({ key, score, heard, quiz: quizN, spoke, hot: score > 0 });
  }
  const hotN = days.filter((d) => d.hot).length;
  const max = Math.max(1, ...days.map((d) => d.score));
  el.hidden = false;
  el.innerHTML = `
    <p class="kicker">${esc(t("streak90"))} · ${hotN}/90</p>
    <div class="streak-bars streak-90" role="img" aria-label="${hotN} ${esc(t("streak90Aria"))}">
      ${days.map((d) => {
        const h = Math.max(d.score ? 20 : 8, Math.round((d.score / max) * 100));
        return `<span class="streak-day ${d.hot ? "hot" : ""}" style="height:${h}%" title="${esc(d.key)}: ${d.heard} ${t("logHeard")} · ${d.quiz} ${t("logQuiz")} · ${d.spoke} ${t("logVoice")}"></span>`;
      }).join("")}
    </div>
    <p class="muted chart90-legend">${esc(t("chart90Legend"))}</p>`;
}

function buildTransferPayload() {
  const payload = { v: 2, savedAt: new Date().toISOString() };
  PROG_KEYS.forEach((k) => { payload[k] = localStorage.getItem(k); });
  return payload;
}

function transferEncode(payload) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}

let prefsTransferEcho = "";
let prefsTransferTail = "";

function transferTail(code) {
  const s = String(code || "").replace(/\s/g, "");
  return s.slice(-4);
}

function transferDecode(str) {
  return JSON.parse(decodeURIComponent(escape(atob(String(str || "").trim()))));
}

function transferDecodeLooksCut(err) {
  const name = err?.name || "";
  const msg = String(err?.message || err);
  if (name === "URIError" || name === "InvalidCharacterError") return true;
  return /URI malformed|Invalid character|Unexpected end|Unterminated string/i.test(msg);
}

function applyTransferPayload(data) {
  if (!data || typeof data !== "object") throw new Error("bad");
  PROG_KEYS.forEach((k) => {
    if (data[k] == null) localStorage.removeItem(k);
    else localStorage.setItem(k, data[k]);
  });
}

function drawTransferQr(text) {
  document.querySelectorAll("#transfer-qr, #prefs-transfer-qr, #audit-transfer-qr").forEach((canvas) => {
    if (!canvas?.getContext) return;
    const ctx = canvas.getContext("2d");
    const n = 21;
    const cell = Math.floor(canvas.width / n);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0d3b36";
    let h = 0;
    for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) >>> 0;
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        const bit = (h >> ((x + y * 3) % 30)) & 1;
        if ((x < 3 && y < 3) || (x > n - 4 && y < 3) || (x < 3 && y > n - 4) || bit) {
          ctx.fillRect(x * cell, y * cell, cell - 1, cell - 1);
        }
      }
    }
  });
}

function renderTransferCode() {
  const ta = $("#transfer-code");
  if (!ta) return;
  try {
    const code = transferEncode(buildTransferPayload());
    ta.value = code;
    drawTransferQr(code.slice(0, 400));
    let hint = $("#transfer-chunks");
    if (!hint) {
      hint = document.createElement("p");
      hint.id = "transfer-chunks";
      hint.className = "muted";
      ta.insertAdjacentElement("afterend", hint);
    }
    const n = Math.ceil(code.length / 3);
    hint.textContent = t("transferQrHint", { len: code.length, cs: code.length % 997 });
  } catch {
    ta.value = "";
  }
}

function importTransferCode(raw, quiet) {
  const st = $("#prefs-transfer-status");
  const say = (msg) => {
    if (quiet && st) {
      st.hidden = false;
      st.textContent = msg;
      return;
    }
    alert(msg);
  };
  const trimmed = String(raw || "").replace(/\s/g, "");
  if (!trimmed) {
    say(t("prefsTransferEmpty"));
    return;
  }
  if (trimmed.length < 16) {
    say(t("transferTooShort"));
    return;
  }
  let payload;
  try {
    payload = transferDecode(trimmed);
  } catch (err) {
    say(t(transferDecodeLooksCut(err) ? "transferCut" : "progressInvalid"));
    return;
  }
  if (transferTailMismatch(trimmed)) {
    say(t("prefsTransferTailBlocked"));
    return;
  }
  try {
    applyTransferPayload(payload);
    applyLevel();
    renderRemind();
    renderTransferCode();
    say(t("progressImported"));
    prefsTransferEcho = trimmed;
  } catch (err) {
    say(t(transferDecodeLooksCut(err) ? "transferCut" : "progressInvalid"));
  }
}

function printWeakList() {
  const area = $("#weak-print-area");
  if (!area) return;
  const weak = [...weakSet()];
  const ear = [...earWeakSet()];
  const speak = [...speakWeakSet()];
  area.hidden = false;
  area.innerHTML = `
    <h1>English Lab — débiles</h1>
    <p>${todayKey()} · ${level().toUpperCase()}</p>
    ${weak.length ? `<h2>Verbos</h2><ul>${weak.map((v) => `<li>${esc(v)}</li>`).join("")}</ul>` : ""}
    ${ear.length ? `<h2>Oído</h2><ul>${ear.map((v) => `<li>${esc(v)}</li>`).join("")}</ul>` : ""}
    ${speak.length ? `<h2>Hablar</h2><ul>${speak.map((v) => `<li>${esc(v)}</li>`).join("")}</ul>` : ""}`;
  window.print();
  area.hidden = true;
}

function addDaysKey(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

function loadSrs() {
  try {
    const raw = JSON.parse(localStorage.getItem("enlab-srs") || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

function storyPhraseEs(storyId, phrase) {
  const story = (ENLAB.branchStories || []).find((s) => s.id === storyId);
  if (!story?.nodes || !phrase) return "";
  for (const node of Object.values(story.nodes)) {
    for (const c of node.choices || []) {
      if ((c.vocab || []).includes(phrase)) return node.es || "";
    }
    if ((node.vocab || []).includes(phrase)) return node.es || "";
  }
  return "";
}

function storySrsPool(limit = 10) {
  const today = todayKey();
  const map = loadSrs();
  const all = Object.entries(map).filter(([id]) => id.startsWith("story:"));
  const due = all.filter(([, row]) => row?.due && row.due <= today);
  const src = due.length ? due : all;
  return shuffle(src.map(([id, row]) => ({
    id,
    phrase: row.phrase || id.split("|").slice(1).join("|"),
    storyId: row.story || id.replace(/^story:/, "").split("|")[0],
  }))).slice(0, limit);
}

function makeStoryItems() {
  const pool = storySrsPool(12);
  if (!pool.length) return [];
  const phrases = pool.map((p) => p.phrase);
  return pool.slice(0, 8).map((item) => {
    const wrong = shuffle(phrases.filter((p) => p !== item.phrase)).slice(0, 2);
    const opts = shuffle([item.phrase, ...wrong]);
    const es = storyPhraseEs(item.storyId, item.phrase);
    const story = (ENLAB.branchStories || []).find((s) => s.id === item.storyId);
    return {
      type: "story",
      q: typeof t === "function" ? t("storyQuizQ") : "Elige la frase en inglés correcta:",
      esHint: es || (story?.title || item.storyId),
      a: item.phrase,
      opts,
      say: item.phrase,
      inf: item.id.replace(/^story:/, ""),
    };
  });
}

function makeEmailToneItems() {
  const pool = (ENLAB.emailSpeak || []).filter((e) => (e.min || 1) <= lvlNum() && e.tone && (e.qs || []).length);
  if (!pool.length) return [];
  return shuffle(pool).slice(0, 8).map((em) => {
    const q = em.qs.find((x) => /tono|tone|formal|informal/i.test(x.q)) || em.qs[0];
    const wrongTones = em.tone === "formal" ? ["informal", "casual", "slang"] : ["formal", "legal", "stiff"];
    const opts = shuffle([em.tone, ...wrongTones.filter((x) => x !== em.tone)].slice(0, 2));
    return {
      type: "emailtone",
      q: q.q,
      esHint: em.subject,
      a: q.a,
      opts: q.opts || opts,
      say: em.say || em.reply,
      inf: em.subject,
      email: em,
    };
  });
}

function startStoryQuiz() {
  quiz = { i: 0, score: 0, items: makeStoryItems(), fails: [], mode: "story", host: "#quiz-box" };
  if (!quiz.items.length) {
    const box = quizBox();
    if (box) {
      box.innerHTML = `<div class="card"><p class="muted">${esc(typeof t === "function" ? t("storyQuizEmpty") : "Juega historias y desbloquea frases primero.")}</p></div>`;
    }
    return;
  }
  showTab("quiz");
  const sel = $("#quiz-mode");
  if (sel) sel.value = "story";
  syncQuizModePicks();
  if (typeof openQuizRoom === "function") openQuizRoom("story");
  renderQuiz();
  quizBox()?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function saveSrs(map) {
  localStorage.setItem("enlab-srs", JSON.stringify(map));
  if (window.ENLAB_IDB?.mirror) window.ENLAB_IDB.mirror("enlab-srs", JSON.stringify(map));
}

function storyVocabUnlock(storyId, phrase) {
  if (!storyId || !phrase) return false;
  const clean = String(phrase).trim();
  if (!clean) return false;
  const slug = clean.slice(0, 56);
  const id = `story:${storyId}|${slug}`;
  const map = loadSrs();
  if (map[id]) return false;
  map[id] = { box: 0, iv: 1, due: todayKey(), phrase: clean, story: storyId };
  saveSrs(map);
  if (typeof renderDueToday === "function") renderDueToday();
  if (typeof syncRemindToSw === "function") syncRemindToSw();
  return true;
}

function srsBump(kind, key, ok) {
  if (!key) return;
  const id = String(key).startsWith(`${kind}:`) ? String(key) : `${kind}:${key}`;
  const map = loadSrs();
  const row = map[id] || { box: 0, iv: 1, due: todayKey() };
  if (ok) {
    row.box = Math.min(5, (row.box || 0) + 1);
    row.iv = [1, 1, 2, 4, 7, 14][row.box] || 14;
    row.due = addDaysKey(row.iv);
  } else {
    row.box = 0;
    row.iv = 1;
    row.due = addDaysKey(1);
  }
  map[id] = row;
  saveSrs(map);
  if (typeof renderDueToday === "function") renderDueToday();
  if (typeof syncRemindToSw === "function") syncRemindToSw();
}

function srsDueKeys(kind) {
  const today = todayKey();
  const out = new Set();
  Object.entries(loadSrs()).forEach(([id, row]) => {
    if (!row || !row.due) return;
    if (kind && !id.startsWith(`${kind}:`)) return;
    if (row.due <= today) out.add(id);
  });
  return out;
}

function srsDueList(limit = 8) {
  const today = todayKey();
  return Object.entries(loadSrs())
    .filter(([, row]) => row && row.due && row.due <= today)
    .sort((a, b) => String(a[1].due).localeCompare(String(b[1].due)))
    .slice(0, limit)
    .map(([id, row]) => {
      let label = row?.phrase;
      if (!label) {
        label = id.replace(/^(ear|verb|uso|ed|speak|dict|art|prep|phrasal|cond|listen|story):/, "");
        if (label.includes("|")) label = label.split("|").slice(1).join("|");
      }
      label = String(label).replace("|", " / ");
      return { id, label };
    });
}

function renderDueToday() {
  const el = $("#due-today");
  if (!el) return;
  const due = srsDueList(10);
  if (!due.length) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  el.hidden = false;
  el.innerHTML = `
    <p class="kicker">${esc(t("due"))}</p>
    <div class="review-chips">${due.map((x) => {
      const kind = (x.id.split(":")[0] || "item");
      return `<button type="button" class="chip say due-${esc(kind)}" data-due-kind="${esc(kind)}" data-say="${esc(x.label.split(" / ")[0])}"><span class="due-tag">${esc(kind)}</span> ${esc(x.label)}</button>`;
    }).join("")}</div>
    <p class="muted">${esc(typeof t === "function" ? t("dueHint") : "Pulsa una etiqueta para jugar ese modo. Sale primero en Juego.")}</p>`;
}

function renderWeekReport() {
  const el = $("#week-report");
  if (!el) return;
  const st = stats();
  let heard = 0;
  let quizN = 0;
  let spoke = 0;
  let days = 0;
  for (let i = 0; i < 7; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const row = st.days[dateKey(d)] || {};
    const h = row.heard || 0;
    const q = row.quiz || 0;
    const s = row.spoke || 0;
    if (h + q + s) days += 1;
    heard += h;
    quizN += q;
    spoke += s;
  }
  if (!heard && !quizN && !spoke && !days) {
    el.hidden = false;
    const done = weeklyExamDone();
    const wscore = weeklyScoreText();
    const weeklyBtn = done
      ? `<span class="pill ok">Examen ${esc(wscore || "hecho")}</span>`
      : `<button type="button" class="btn sm" id="weekly-exam-btn">Examen semanal (12)</button>`;
    el.innerHTML = `<p class="muted">${esc(t("weeklyReportStart", { week: t("week") }))}</p><p class="row">${weeklyBtn}${weeklyMidChipHtml() ? ` ${weeklyMidChipHtml()}` : ""}</p>`;
    return;
  }
  el.hidden = false;
  const done = weeklyExamDone();
  const wscore = weeklyScoreText();
  const weeklyBtn = done
    ? `<span class="pill ok">${esc(t("weeklyExamDone", { score: wscore || t("sessionComplete") }))}</span>`
    : `<button type="button" class="btn sm" id="weekly-exam-btn">${esc(t("weeklyExamBtn"))}</button>`;
  const mid = weeklyMidChipHtml();
  el.innerHTML = `<p class="muted">${esc(t("weeklyReport", {
    week: t("week"),
    days,
    heard,
    quiz: quizN,
    spoke,
    due: srsDueList(99).length,
  }))}</p><p class="row">${weeklyBtn}${mid ? ` ${mid}` : ""}</p>`;
}

function importFromPrefs() {
  const raw = $("#prefs-transfer-paste")?.value || "";
  const st = $("#prefs-transfer-status");
  const say = (msg) => {
    if (!st) return;
    st.hidden = false;
    st.textContent = msg;
  };
  if (!raw.trim()) {
    say(t("prefsTransferEmpty"));
    return;
  }
  if (classroomLocked()) {
    say(t("classPinImport"));
    return;
  }
  importTransferCode(raw, true);
}

function transferTailMismatch(code) {
  const tail = transferTail(String(code || "").replace(/\s/g, ""));
  return !!(prefsTransferTail && tail && tail !== prefsTransferTail);
}

function syncTransferPaste(raw, st, goSel) {
  if (!st) return;
  const trimmed = String(raw || "").replace(/\s/g, "");
  if (trimmed.length < 16) return;
  if (trimmed === prefsTransferEcho) return;
  const tail = transferTail(trimmed);
  const mismatch = prefsTransferTail && tail !== prefsTransferTail;
  let msg = mismatch
    ? t("prefsTransferTailMismatch", { tail, expect: prefsTransferTail })
    : t("prefsTransferReady", { n: trimmed.length, tail });
  st.hidden = false;
  if (mismatch) {
    st.textContent = msg;
    return;
  }
  st.innerHTML = `${esc(msg)} <button type="button" class="chip sm" ${goSel}>${esc(t("prefsTransferImport"))}</button>`;
}

function syncPrefsTransferPaste() {
  syncTransferPaste($("#prefs-transfer-paste")?.value, $("#prefs-transfer-status"), 'data-prefs-transfer-go');
}

function syncHoyTransferPaste() {
  syncTransferPaste($("#transfer-paste")?.value, $("#transfer-hoy-status"), 'data-hoy-transfer-go');
}

function sayTransferCopied(st, code) {
  if (!st) return;
  st.hidden = false;
  st.textContent = t("prefsTransferCopied", { tail: transferTail(code) });
  prefsTransferTail = transferTail(code);
  prefsTransferEcho = "";
}

function copyTransferFromPrefs() {
  if (!classroomAllowsChange("classPinExport")) return;
  if (typeof renderTransferCode === "function") renderTransferCode();
  const code = $("#transfer-code")?.value || "";
  const st = $("#prefs-transfer-status");
  const done = (msg) => {
    if (!st) return;
    st.hidden = false;
    st.textContent = msg;
  };
  if (!code) {
    done(t("prefsTransferEmpty"));
    return;
  }
  const ok = () => sayTransferCopied(st, code);
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(code).then(ok).catch(ok);
  else ok();
}

function classroomPin() {
  return localStorage.getItem("enlab-class-pin") || "";
}

function classroomLocked() {
  return !!(classroomPin() && sessionStorage.getItem("enlab-class-ok") !== "1");
}

function classroomAllowsChange(failKey) {
  const pin = classroomPin();
  if (!pin) return true;
  if (sessionStorage.getItem("enlab-class-ok") === "1") return true;
  const typed = window.prompt(t("classPinPrompt"));
  if (typed === pin) {
    sessionStorage.setItem("enlab-class-ok", "1");
    return true;
  }
  const st = $("#class-pin-status");
  if (st) st.textContent = t(failKey || "classPinWrong");
  return false;
}

function renderClassPin() {
  const st = $("#class-pin-status");
  if (st) st.textContent = classroomPin() ? t("classPinOn") : t("classPinOff");
  const prefs = $("#prefs-class");
  if (prefs) {
    const on = !!classroomPin();
    prefs.hidden = !on;
    if (on) prefs.textContent = t("prefsClassOn");
  }
  syncPrefsBadge();
}

function saveClassPin() {
  const raw = ($("#class-pin")?.value || "").replace(/\D/g, "");
  if (raw.length < 4) {
    const st = $("#class-pin-status");
    if (st) st.textContent = t("classPinDigits");
    return;
  }
  localStorage.setItem("enlab-class-pin", raw);
  sessionStorage.removeItem("enlab-class-ok");
  if ($("#class-pin")) $("#class-pin").value = "";
  renderClassPin();
}

function clearClassPin() {
  localStorage.removeItem("enlab-class-pin");
  sessionStorage.removeItem("enlab-class-ok");
  renderClassPin();
}

function printClassSheet() {
  if (!classroomAllowsChange("classPinExport")) return;
  const area = $("#weak-print-area");
  if (!area) return;
  const due = srsDueList(12);
  const verbs = [...weakSet()].slice(0, 10);
  area.hidden = false;
  area.innerHTML = `
    <h1>${esc(t("classSheetTitle"))}</h1>
    <p>${todayKey()} · ${level().toUpperCase()}</p>
    ${due.length ? `<h2>${esc(t("classSheetDue"))}</h2><ul>${due.map((x) => `<li>${esc(x.label)}</li>`).join("")}</ul>` : ""}
    ${verbs.length ? `<h2>${esc(t("classSheetWeak"))}</h2><ul>${verbs.map((v) => `<li>${esc(v)}</li>`).join("")}</ul>` : ""}
    <h2>${esc(t("classSheetHoy"))}</h2>
    <p>${esc(t("classSheetHoyBody"))}</p>`;
  window.print();
  area.hidden = true;
}

function renderStarBox() {
  const el = $("#star-box");
  if (!el) return;
  const bits = ENLAB.starScaffold || [];
  el.innerHTML = `
    <p class="muted"><strong>STAR</strong> ${esc(t("starIntro"))}</p>
    <ol class="star-list">${bits.map((s) => `<li><strong>${esc(s.part)} · ${esc(s.en)}</strong> — <span class="es-line">${esc(s.es)}</span></li>`).join("")}</ol>
    <details class="star-draft">
      <summary>${esc(t("starDraft"))}</summary>
      <label class="muted">${esc(t("starS"))}<textarea id="star-s" rows="2" placeholder="${esc(t("starPhS"))}"></textarea></label>
      <label class="muted">${esc(t("starT"))}<textarea id="star-t" rows="2" placeholder="${esc(t("starPhT"))}"></textarea></label>
      <label class="muted">${esc(t("starA"))}<textarea id="star-a" rows="2" placeholder="${esc(t("starPhA"))}"></textarea></label>
      <label class="muted">${esc(t("starR"))}<textarea id="star-r" rows="2" placeholder="${esc(t("starPhR"))}"></textarea></label>
      <button type="button" class="btn sm" id="star-speak">${esc(t("starSpeak"))}</button>
    </details>`;
  $("#star-speak")?.addEventListener("click", () => {
    const text = ["star-s", "star-t", "star-a", "star-r"].map((id) => $(`#${id}`)?.value?.trim()).filter(Boolean).join(". ");
    if (text) speak(text, true);
  });
}

function renderRoleplays() {
  const box = $("#roleplay-list");
  if (!box) return;
  const items = (ENLAB.roleplays || []).filter((x) => (x.min || 1) <= lvlNum());
  box.innerHTML = items.map((r) => `
    <button type="button" class="chip" data-roleplay="${esc(r.id)}">${esc(r.title)}</button>
  `).join(" ");
}

function startRoleplay(id) {
  const scene = (ENLAB.roleplays || []).find((x) => x.id === id);
  const box = $("#roleplay-now");
  if (!scene || !box) return;
  window._roleplay = { scene, i: 0, until: Date.now() + 120000 };
  box.hidden = false;
  paintRoleplayTurn();
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function paintRoleplayTurn() {
  const st = window._roleplay;
  const box = $("#roleplay-now");
  if (!st || !box) return;
  const turn = st.scene.turns[st.i];
  const left = st.until ? Math.max(0, Math.ceil((st.until - Date.now()) / 1000)) : 0;
  if (!turn || left <= 0) {
    box.innerHTML = `<p class="session-done">${left <= 0 && turn ? t("roleTimeUp") : t("roleDone")}</p>`;
    if (window._roleTick) { clearInterval(window._roleTick); window._roleTick = null; }
    return;
  }
  box.innerHTML = `
    <p class="kicker">${esc(st.scene.title)} · ${st.i + 1}/${st.scene.turns.length} · <span id="role-timer">${left}s</span></p>
    <p class="muted es-line">${esc(st.scene.es)}</p>
    <p><strong>${esc(t("roleSpeakerA"))}:</strong> ${esc(turn.a)}</p>
    <p><strong>${esc(t("roleYou"))}:</strong> ${esc(turn.b)}</p>
    <div class="row">
      <button type="button" class="btn ghost" data-role-play-a>${esc(t("roleHearA"))}</button>
      <button type="button" class="btn" data-role-rec>${esc(t("roleRec"))}</button>
      <button type="button" class="btn ghost" data-role-next>${esc(t("roleNextTurn"))}</button>
    </div>
    <p class="status" id="role-status"></p>`;
  if (window._roleTick) clearInterval(window._roleTick);
  window._roleTick = setInterval(() => {
    const el = $("#role-timer");
    const remain = Math.max(0, Math.ceil((st.until - Date.now()) / 1000));
    if (el) el.textContent = `${remain}s`;
    if (remain <= 0) paintRoleplayTurn();
  }, 500);
}

function renderEmails() {
  const box = $("#email-list");
  if (!box) return;
  const items = (ENLAB.emailSpeak || []).filter((e) => (e.min || 1) <= lvlNum());
  if (!items.length) {
    box.innerHTML = `<p class="muted">${esc(t("a2Only"))}</p>`;
    return;
  }
  const done = new Set(JSON.parse(localStorage.getItem("enlab-email-done") || "[]"));
  let em = window._dailyEmail;
  if (!em || !items.some((x) => x.subject === em.subject)) {
    em = seededShuffle(items.filter((e) => !done.has(e.subject)))[0] || seededShuffle(items)[0];
  }
  window._dailyEmail = em;
  box.innerHTML = `
    <p class="kicker">${esc(t("email"))} · ${esc(t("emailAvail", { n: items.length }))}</p>
    <details class="email-pick" open>
      <summary><strong>${esc(em.subject)}</strong> <span class="muted">· ${esc(em.from)}</span></summary>
      <pre class="email-body">${esc(em.body)}</pre>
      <p class="muted es-line">${esc(em.es)}</p>
      <div class="row">
        <button type="button" class="btn ghost" data-email-say>${esc(t("emailHearAloud"))}</button>
        <button type="button" class="btn sm" data-email-reply>${esc(t("emailRecordReply"))}</button>
        <button type="button" class="btn ghost sm" id="email-next">${esc(t("emailNext"))}</button>
      </div>
      <p class="muted">${esc(t("emailModelReply"))} <em>${esc(em.reply)}</em></p>
    </details>
    <details class="email-all" style="margin-top:10px">
      <summary class="muted">${esc(t("emailSeeAll", { n: items.length }))}</summary>
      <div class="email-grid">${items.map((e) => `
        <button type="button" class="chip ${done.has(e.subject) ? "ok" : ""}" data-email-pick="${esc(e.subject)}">${esc(e.subject)}</button>`).join("")}</div>
    </details>`;
}

function renderInterviewSim() {
  const box = $("#interview-sim-list");
  if (!box) return;
  const items = (ENLAB.interviewSim || []).filter((x) => (x.min || 1) <= lvlNum());
  if (!items.length) {
    box.innerHTML = `<p class="muted">${esc(t("b1Only"))}</p>`;
    return;
  }
  box.innerHTML = items.map((it, i) => `
    <div class="card interview-row">
      <p><strong>${esc(it.q)}</strong></p>
      <p class="muted es-line">${esc(it.es)}</p>
      <p class="muted">${esc(it.hint)}</p>
      <div class="row">
        <button type="button" class="say" data-say="${esc(it.q)}">${esc(t("hearQuestion"))}</button>
        <button type="button" class="btn sm" data-interview-rec="${i}">${esc(t("interviewRec"))}</button>
      </div>
      <p class="status" id="interview-status-${i}"></p>
    </div>`).join("");
}

function renderPhrasalsWork() {
  const card = $("#phrasals-work-card");
  const list = $("#phrasals-work-list");
  if (!card || !list) return;
  const items = (ENLAB.phrasalsWork || []).filter((p) => (p.min || 3) <= lvlNum());
  if (!items.length) {
    card.hidden = true;
    return;
  }
  card.hidden = false;
  list.innerHTML = items.map((p, i) => `
    <div class="card" data-track="phrase" data-phrase="${esc(p.en)}">
      <p>${esc(p.en)}</p>
      <p class="muted es-line">${esc(p.es)}</p>
      <div class="row">
        <button class="say" data-say="${esc(p.say)}">Oír</button>
        <button type="button" class="btn sm" data-phrasal-rec="${i}">Grabar</button>
        ${ygLink(p.en.split(" ")[0], t("real"))}
      </div>
    </div>`).join("");
  window._phrasalsSlice = items;
}

function exportProgress() {
  if (!classroomAllowsChange("classPinExport")) return;
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
      alert(t("progressImported"));
    } catch {
      alert(t("progressFileInvalid"));
    }
  };
  reader.readAsText(file);
}

function applyLevel(opts = {}) {
  renderLevelBar();
  renderRateBar();
  applyTheme();
  applyHideEs();
  applyKidsMode();
  applyUiLang();
  const n = lvlNum();
  const vis = (id, on) => { const el = document.getElementById(id); if (el) el.style.display = on ? "" : "none"; };
  vis("block-daily-role", n >= 2);
  vis("block-roles", n >= 2);
  vis("block-b1-stress", n >= 3);
  vis("block-b1-ough", n >= 3);
  vis("block-a2-extra", n >= 2);
  vis("block-endings", n >= 2);
  vis("block-rhythm", n >= 3);
  vis("block-chunks", true);
  vis("block-b-tips", n >= 3);
  dirty.vowels = true;
  dirty.verbs = true;
  dirty.speak = true;
  dirty.ai = true;
  dirty.hablar = true;
  dirty.hoy = true;
  if (!opts.skipHome) renderHome(true);
  renderInterview();
  if (!opts.skipPaint) paintTab(currentTab);
}

function prepareWelcome() {
  const welcome = $("#welcome");
  if (!welcome || localStorage.getItem("enlab-welcome-v2") === "1" || localStorage.getItem("enlab-onboard-v3") === "1") return;
  const n = stats().streak || 0;
  if (n <= 0) return;
  const ol = welcome.querySelector("ol");
  if (ol) ol.hidden = true;
  let streakEl = $("#welcome-streak");
  if (!streakEl && ol) {
    streakEl = document.createElement("p");
    streakEl.id = "welcome-streak";
    streakEl.className = "welcome-streak";
    ol.insertAdjacentElement("afterend", streakEl);
  }
  if (streakEl) {
    streakEl.hidden = false;
    streakEl.textContent = t("welcomeStreak", { n });
  }
  const note = welcome.querySelector("[data-i18n=welcomeNote]");
  if (note) note.hidden = true;
}

function init() {
  applyTheme();
  applyHideEs();
  applyKidsMode();
  applyUiLang();
  applyLevel({ skipHome: true, skipPaint: true });
  const allowed = ["hoy", "vocales", "verbos", "quiz", "hablar", "ia"];
  const fromHash = (location.hash || "").replace("#", "");
  const fromMem = localStorage.getItem("enlab-tab") || "";
  const id = allowed.includes(fromHash) ? fromHash : (allowed.includes(fromMem) ? fromMem : "hoy");
  showTab(id);
  renderHome(true);
  if (timerState().running) {
    startTimerLoop();
    requestWake();
  }
  renderClock();
  syncQuizModePicks();
  setupRemind();
  syncNetWarn();
  const welcome = $("#welcome");
  prepareWelcome();
  if (welcome && localStorage.getItem("enlab-onboard-v3") !== "1" && localStorage.getItem("enlab-welcome-v2") !== "1") welcome.hidden = false;
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./sw.js").then(() => syncRemindToSw()).catch(() => {});
  }
  if (window.ENLAB_IDB?.restoreMissing) {
    window.ENLAB_IDB.restoreMissing().then((ok) => {
      if (ok) {
        renderDueToday();
        if (typeof renderHome === "function") renderHome();
      }
    });
  }
  setupPwaInstall();
  renderClassPin();
  if (!window._hoyRecCue && typeof onRecording === "function") {
    window._hoyRecCue = true;
    onRecording((phase) => {
      if (phase === "deny" && recState.surface === "hoy") return;
      if (phase !== "stop") return;
      if (recState.surface !== "hoy") return;
      $("#hoy-speak-rec")?.classList.remove("next-act");
      cueHoyNext();
    });
  }
  window.addEventListener("enlab-packs-ready", () => {
    dirty.hablar = true;
    if (currentTab === "hablar" || currentTab === "vocales" || currentTab === "ia") paintTab(currentTab);
  });
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && timerState().running) requestWake();
});

function setupPwaInstall() {
  const standalone = isStandalone();
  if (standalone) {
    $$("[data-pwa-install]").forEach((b) => { b.hidden = true; });
    return;
  }
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    window._pwaDeferred = e;
    paintPwaButtons();
  });
  window.addEventListener("appinstalled", () => {
    window._pwaDeferred = null;
    $$("[data-pwa-install]").forEach((b) => { b.hidden = true; });
  });
  $$("[data-pwa-install]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!window._pwaDeferred) return;
      window._pwaDeferred.prompt();
      await window._pwaDeferred.userChoice.catch(() => {});
      window._pwaDeferred = null;
      $$("[data-pwa-install]").forEach((b) => { b.hidden = true; });
    });
  });
}

$("#welcome-go")?.addEventListener("click", () => {
  localStorage.setItem("enlab-welcome-v2", "1");
  localStorage.setItem("enlab-onboard-v3", "1");
  const el = $("#welcome");
  if (el) {
    el.querySelector("ol")?.setAttribute("hidden", "");
    el.querySelector("[data-i18n=welcomeNote]")?.setAttribute("hidden", "");
    el.hidden = true;
  }
  maybeOfferGuide();
});

$("#prefs-toggle")?.addEventListener("click", () => {
  setPrefsOpen($("#prefs-panel")?.hidden);
});

$("#guide-toggle")?.addEventListener("click", () => {
  setGuideOpen($("#guide-panel")?.hidden);
});

$("#guide-gotit")?.addEventListener("click", () => {
  markGuideSeen(currentTab);
  setGuideOpen(false);
});

$("#kids-toggle")?.addEventListener("click", () => {
  localStorage.setItem("enlab-kids", kidsOn() ? "0" : "1");
  applyKidsMode();
});

$("#ui-lang-toggle")?.addEventListener("click", () => {
  localStorage.setItem("enlab-ui-lang", uiLang() === "en" ? "es" : "en");
  applyUiLang();
  dirty.hoy = true;
  renderHome(true);
});

$("#repaso-btn")?.addEventListener("click", () => startRepasoMode());

$("#speak-shadow")?.addEventListener("click", () => {
  openShadowBox();
  runShadowing();
});

$("#shadow-go")?.addEventListener("click", () => runShadowing());

$("#transfer-copy")?.addEventListener("click", () => {
  if (!classroomAllowsChange("classPinExport")) return;
  if (typeof renderTransferCode === "function") renderTransferCode();
  const code = $("#transfer-code")?.value || "";
  if (code) {
    navigator.clipboard.writeText(code).catch(() => {});
    sayTransferCopied($("#transfer-hoy-status"), code);
  }
});

function copyTransferFromQr(statusEl, pasteEl, syncFn) {
  if (!classroomAllowsChange("classPinExport")) return;
  if (typeof renderTransferCode === "function") renderTransferCode();
  const code = $("#transfer-code")?.value || "";
  if (!code) return;
  navigator.clipboard.writeText(code).catch(() => {});
  if (statusEl) sayTransferCopied(statusEl, code);
  if (pasteEl) {
    pasteEl.value = code;
    if (typeof syncFn === "function") syncFn();
  }
}

$("#transfer-qr")?.addEventListener("click", () => {
  copyTransferFromQr($("#transfer-hoy-status"), $("#transfer-paste"), syncHoyTransferPaste);
});

$("#prefs-transfer-qr")?.addEventListener("click", () => {
  copyTransferFromQr($("#prefs-transfer-status"), $("#prefs-transfer-paste"), syncPrefsTransferPaste);
});

$("#transfer-paste")?.addEventListener("input", () => syncHoyTransferPaste());
$("#transfer-paste")?.addEventListener("paste", () => setTimeout(syncHoyTransferPaste, 0));

$("#prefs-transfer-copy")?.addEventListener("click", () => copyTransferFromPrefs());

$("#prefs-transfer-import")?.addEventListener("click", () => importFromPrefs());

$("#prefs-transfer-paste")?.addEventListener("input", () => syncPrefsTransferPaste());
$("#prefs-transfer-paste")?.addEventListener("paste", () => setTimeout(syncPrefsTransferPaste, 0));

$("#transfer-import")?.addEventListener("click", () => {
  if (!classroomAllowsChange("classPinImport")) return;
  importTransferCode($("#transfer-paste")?.value || $("#transfer-code")?.value || "");
});

$("#weak-print")?.addEventListener("click", () => printWeakList());

$("#class-pin-save")?.addEventListener("click", () => saveClassPin());
$("#class-pin-clear")?.addEventListener("click", () => clearClassPin());
$("#class-print")?.addEventListener("click", () => printClassSheet());

init();
