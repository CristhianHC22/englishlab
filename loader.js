/* Bundle split: first paint without pack-m/n/o/q/s/u/v/bulk; load after paint */
(function () {
  "use strict";

  const DEFERRED = [
    "./pack-m.js",
    "./pack-n.js",
    "./pack-o.js",
    "./pack-q.js",
    "./pack-s.js",
    "./pack-u.js",
    "./pack-v.js",
    "./pack-bulk.js",
    "./pack-podcasts.js",
  ];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(src));
      document.body.appendChild(s);
    });
  }

  function afterFirstPaint(fn) {
    if (typeof requestAnimationFrame !== "function") {
      setTimeout(fn, 0);
      return;
    }
    requestAnimationFrame(() => requestAnimationFrame(fn));
  }

  function refreshAfterPacks() {
    if (typeof renderHome === "function") renderHome();
    if (window.SV?.refreshPanels) window.SV.refreshPanels();
    if (window.NR?.renderLabAudit) window.NR.renderLabAudit();
    if (typeof dirty === "object") dirty.hablar = true;
    if (typeof currentTab === "string" && typeof paintTab === "function") paintTab(currentTab);
  }

  async function loadDeferred() {
    await Promise.all(DEFERRED.map((src) => loadScript(src).catch(() => {})));
    if (!window._enlabBootstrapped) {
      window._enlabBootstrapped = true;
      if (window.NR?.bootstrap) window.NR.bootstrap();
      if (window.SV?.bootstrap) window.SV.bootstrap();
    }
    refreshAfterPacks();
    window.dispatchEvent(new CustomEvent("enlab-packs-ready"));
  }

  function start() {
    afterFirstPaint(loadDeferred);
  }

  window.ENLAB_LOADER = { DEFERRED, loadDeferred, refreshAfterPacks };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
