/* IndexedDB mirror for SRS + story progress (offline resilience) */
(function () {
  "use strict";

  const DB_NAME = "englishlab-backup";
  const STORE = "kv";
  const KEYS = ["enlab-srs", "enlab-story-progress"];

  function openDb() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) { reject(new Error("no idb")); return; }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function mirror(key, value) {
    if (!KEYS.includes(key) || value == null) return;
    try {
      const db = await openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(String(value), key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch { /* ignore */ }
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
          localStorage.setItem(key, String(val));
          changed = true;
        }
      }
      db.close();
    } catch { /* ignore */ }
    return changed;
  }

  window.ENLAB_IDB = { KEYS, mirror, restoreMissing };
})();
