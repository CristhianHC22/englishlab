/* IndexedDB mirror for progress keys (offline resilience) */
(function () {
  "use strict";

  const DB_NAME = "englishlab-backup";
  const STORE = "kv";

  /* Fuente única: transfer (app.js) y espejo IDB usan la misma lista. */
  const PROG_KEYS = [
    "enlab-stats", "enlab-weak", "enlab-known", "enlab-ear-weak", "enlab-ear-stats",
    "enlab-uso-weak", "enlab-ed-weak", "enlab-speak-weak", "enlab-speak-only-weak",
    "enlab-cefr", "enlab-cefr-since", "enlab-nudge-hide", "enlab-ear-warmup",
    "enlab-session", "enlab-rate", "enlab-log", "enlab-theme", "enlab-hide-es",
    "enlab-remind-on", "enlab-remind-time", "enlab-kids", "enlab-ui-lang",
    "enlab-voice-log", "enlab-auto-path", "enlab-repaso", "enlab-srs",
    "enlab-class-pin", "enlab-weekly-exam", "enlab-weekly-score", "enlab-travel",
    "enlab-duo-stats", "enlab-cert-done", "enlab-cert-name", "enlab-cert-score",
    "enlab-podcast-log", "enlab-email-done", "enlab-travel-done", "enlab-chat-tone",
    "enlab-pron-log", "enlab-story-progress", "enlab-writing-done", "enlab-onboard-v3",
    "enlab-class-roster", "enlab-class-task", "enlab-accent-pref", "enlab-a11y-contrast",
    "enlab-a11y-motion", "enlab-student-name", "enlab-onboard-goal", "enlab-error-log",
    "enlab-place-result",
  ];
  const KEYS = PROG_KEYS.concat(["enlab-push-sub"]);

  let dbp = null;
  let writeQ = Promise.resolve();

  function openDb() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) { reject(new Error("no idb")); return; }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbp = null;
        reject(req.error);
      };
    });
    return dbp;
  }

  function mirror(key, value) {
    if (!KEYS.includes(key) || value == null) return;
    writeQ = writeQ.then(async () => {
      try {
        const db = await openDb();
        await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, "readwrite");
          tx.objectStore(STORE).put(String(value), key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch {
        dbp = null;
      }
    });
  }

  async function restoreMissing() {
    let changed = false;
    try {
      const db = await openDb();
      for (const key of KEYS) {
        if (localStorage.getItem(key)) continue;
        const val = await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, "readonly");
          const req = tx.objectStore(STORE).get(key);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        if (val) {
          origSet(key, String(val));
          changed = true;
        }
      }
    } catch { /* ignore */ }
    return changed;
  }

  const origSet = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (key, value) {
    origSet(key, value);
    if (KEYS.includes(String(key))) mirror(String(key), value);
  };

  window.ENLAB_PROG_KEYS = PROG_KEYS;
  window.ENLAB_IDB = { KEYS, PROG_KEYS, mirror, restoreMissing };
})();
