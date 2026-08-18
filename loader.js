/* Bundle split: carga packs S–V + bulk, bootstrap único, refresh UI */
(function () {
  "use strict";

  const DEFERRED = ["./pack-s.js", "./pack-u.js", "./pack-v.js", "./pack-bulk.js"];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(src));
      document.body.appendChild(s);
    });
  }

  function refreshAfterPacks() {
    if (typeof renderSituations === "function") renderSituations();
    if (typeof renderPodcastToday === "function") renderPodcastToday();
    if (window.SV?.refreshPanels) window.SV.refreshPanels();
    if (typeof renderLabAudit === "function") renderLabAudit();
    if (typeof renderHome === "function") renderHome();
  }

  async function loadDeferred() {
    for (const src of DEFERRED) {
      try { await loadScript(src); } catch { /* optional */ }
    }
    if (!window._enlabBootstrapped) {
      window._enlabBootstrapped = true;
      if (window.NR?.bootstrap) window.NR.bootstrap();
      if (window.SV?.bootstrap) window.SV.bootstrap();
    }
    refreshAfterPacks();
    window.dispatchEvent(new CustomEvent("enlab-packs-ready"));
  }

  window.ENLAB_LOADER = { DEFERRED, loadDeferred, refreshAfterPacks };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadDeferred);
  } else {
    loadDeferred();
  }
})();
