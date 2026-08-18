const CACHE = "enlab-v33";
const ASSETS = [
  "./",
  "./index.html",
  "./offline.html",
  "./styles.css",
  "./app.js",
  "./data.js",
  "./guide.js",
  "./levels.js",
  "./extras.js",
  "./i18n.js",
  "./idb-backup.js",
  "./vapid-public.js",
  "./pack.js",
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
  "./features-nr.js",
  "./features-sv.js",
  "./features-plus.js",
  "./loader.js",
  "./pron-audio.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
];
const REMIND_URL = "./enlab-remind.json";
const TAB_ASSETS = {
  vocales: ["./pack-s.js", "./pack-n.js", "./pack-bulk.js", "./pack-podcast-series.js"],
  hablar: ["./pack-o.js", "./pack-v.js", "./pack-u.js", "./pack-roleplays-bulk.js", "./pack-emails-extra.js"],
  quiz: ["./pack.js", "./pack-m.js", "./pack-emails-extra.js"],
  hoy: ["./pack-q.js", "./pack-bulk.js"],
};

function todayKeySW() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function remindCopy(data) {
  const lang = data?.lang === "en" ? "en" : "es";
  const due = typeof data.dueCount === "number" ? data.dueCount : 0;
  if (lang === "en") {
    if (due >= 3) return { title: "English Lab", body: `You have ${due} reviews due. Got 15 minutes?` };
    return { title: "English Lab", body: "Did you do your 15 minutes today?" };
  }
  if (due >= 3) return { title: "English Lab", body: `Tienes ${due} ítems de repaso pendientes. ¿15 minutos hoy?` };
  return { title: "English Lab", body: "¿Ya hiciste tus 15 minutos?" };
}

async function saveRemind(payload) {
  const cache = await caches.open(CACHE);
  await cache.put(REMIND_URL, new Response(JSON.stringify(payload || {}), {
    headers: { "Content-Type": "application/json" },
  }));
}

async function loadRemind() {
  const cache = await caches.open(CACHE);
  const res = await cache.match(REMIND_URL);
  if (!res) return null;
  try { return await res.json(); } catch { return null; }
}

async function maybeRemind() {
  const data = await loadRemind();
  if (!data || !data.on) return;
  const today = todayKeySW();
  if (data.complete === today) return;
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  if (data.time && data.time !== hhmm) return;
  const copy = remindCopy(data);
  await self.registration.showNotification(copy.title, {
    body: copy.body,
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    tag: data.dueCount >= 3 ? "enlab-srs" : "enlab-daily",
    data: { url: "./index.html#hoy" },
  });
}

async function precacheTabAssets(tab) {
  const files = TAB_ASSETS[tab] || [];
  if (!files.length) return;
  const cache = await caches.open(CACHE);
  await Promise.all(files.map((f) => cache.add(f).catch(() => {})));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(ASSETS.map((url) => cache.add(url).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const res = await fetch(event.request);
        if (res && res.ok) {
          const cache = await caches.open(CACHE);
          const url = new URL(event.request.url);
          if (url.origin === location.origin) cache.put(event.request, res.clone());
          return res;
        }
      } catch { /* offline */ }
      return (await caches.match("./index.html"))
        || (await caches.match("./"))
        || (await caches.match("./offline.html"))
        || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    })());
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((res) => {
          if (res && res.ok && new URL(event.request.url).origin === location.origin) {
            caches.open(CACHE).then((cache) => cache.put(event.request, res.clone()));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

self.addEventListener("message", (event) => {
  const msg = event.data;
  if (msg && msg.type === "enlab-remind") {
    event.waitUntil(saveRemind(msg.payload));
  }
  if (msg && msg.type === "enlab-precache-tab") {
    event.waitUntil(precacheTabAssets(msg.tab));
  }
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "enlab-remind") event.waitUntil(maybeRemind());
});

self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    let payload = {};
    try {
      if (event.data) payload = event.data.json();
    } catch {
      try { payload = { body: event.data.text() }; } catch { payload = {}; }
    }
    const data = await loadRemind();
    const copy = remindCopy(data || {});
    return self.registration.showNotification(payload.title || copy.title, {
      body: payload.body || copy.body,
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      tag: payload.tag || "enlab-push",
      data: { url: payload.url || "./index.html#hoy" },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "./index.html#hoy";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const target = new URL(url, self.location.href).href;
      const hit = list.find((c) => c.url && c.url.includes(self.registration.scope.replace(/\/$/, "")));
      if (hit) {
        const go = typeof hit.navigate === "function" ? hit.navigate(target) : Promise.resolve();
        return go.then(() => hit.focus());
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
      return undefined;
    })
  );
});
