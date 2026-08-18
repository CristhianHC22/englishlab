/* Bundle split: first paint without pack-m/n/o/q/s/u/v/bulk; load after paint */
(function () {
  "use strict";

  const FEATURES = ["./features-nr.js", "./features-sv.js", "./features-plus.js"];
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
    "./pack-roleplays-bulk.js",
    "./pack-emails-extra.js",
    "./pack-podcast-series.js",
    "./pack-plus.js",
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
      window._enlabFirstPaint = typeof performance !== "undefined" ? performance.now() : Date.now();
      setTimeout(fn, 0);
      return;
    }
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window._enlabFirstPaint = performance.now();
      fn();
    }));
  }

  function refreshAfterPacks() {
    if (typeof dirty === "object") dirty.hoy = true;
    if (typeof renderHome === "function") renderHome(true);
    if (window.SV?.refreshPanels) window.SV.refreshPanels();
    if (window.NR?.renderLabAudit) window.NR.renderLabAudit();
    dirty.hablar = true;
    if (typeof currentTab === "string" && typeof paintTab === "function") paintTab(currentTab);
  }

  async function loadDeferred() {
    window._enlabLoadFails = window._enlabLoadFails || [];
    for (const src of FEATURES) {
      try { await loadScript(src); } catch (e) { window._enlabLoadFails.push(src); }
    }
    await Promise.all(DEFERRED.map((src) => loadScript(src).catch((e) => {
      window._enlabLoadFails.push(src);
    })));
    if (!window._enlabBootstrapped) {
      window._enlabBootstrapped = true;
      if (window.NR?.bootstrap) window.NR.bootstrap();
      if (window.SV?.bootstrap) window.SV.bootstrap();
      if (window.PLUS?.bootstrap) window.PLUS.bootstrap();
    }
    refreshAfterPacks();
    const start = window._enlabFirstPaint;
    window._enlabPacksMs = typeof start === "number"
      ? Math.max(0, Math.round(performance.now() - start))
      : null;
    window.dispatchEvent(new CustomEvent("enlab-packs-ready"));
  }

  function start() {
    afterFirstPaint(loadDeferred);
  }

  window.ENLAB_LOADER = { FEATURES, DEFERRED, loadDeferred, refreshAfterPacks };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
